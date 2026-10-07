import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, onTestFinished } from 'vitest';
import { auditToneReferences, auditExternalReferences } from '../src/reference-audit.mjs';

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
async function fixture() {
  const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tone-audit-'));
  onTestFinished(() => fs.rm(packageRoot, { recursive: true, force: true }));
  const tonesRoot = path.join(packageRoot, 'tones');
  await fs.mkdir(path.join(tonesRoot, 'sample'), { recursive: true });
  for (const name of ['source.svg', 'light.svg', 'dark.svg'])
    await fs.writeFile(path.join(tonesRoot, 'sample', name), SVG);
  await fs.writeFile(
    path.join(tonesRoot, 'sample/recipe.md'),
    '# Meaning\nPattern and text combine into a PNG image.',
  );
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({ files: ['tones', 'src'] }),
  );
  const tone = {
    id: 'sample',
    referenceFiles: { light: 'sample/light.svg', dark: 'sample/dark.svg' },
    bundledReferences: [
      { id: 'meaning', title: 'Meaning', path: 'sample/recipe.md', required: true },
    ],
    sourceReferences: [
      { title: 'Optional inspiration', url: 'https://example.invalid/inspiration' },
    ],
  };
  const catalog = { schemaVersion: 1, tones: [tone] };
  async function save() {
    await fs.writeFile(path.join(tonesRoot, 'catalog.json'), JSON.stringify(catalog));
  }
  await save();
  return { packageRoot, tonesRoot, tone, catalog, save };
}
function rejects(result, pattern) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.ok(
    result.errors.some((error) => pattern.test(error)),
    JSON.stringify(result),
  );
}

test('complete bundled catalog audits with network disabled and has all 24 local explanations', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('Network disabled');
  };
  try {
    const result = await auditToneReferences();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.toneCount, 24);
    assert.equal(result.resources.filter((name) => name.endsWith('/recipe.md')).length, 24);
    assert.ok(result.resources.includes('shared/composition-meaning.md'));
  } finally {
    globalThis.fetch = original;
  }
});

test('optional missing resources diagnose without requiring live inspiration', async () => {
  const f = await fixture();
  f.tone.bundledReferences.push({
    id: 'extra',
    title: 'Extra',
    path: 'sample/extra.md',
    required: false,
  });
  await f.save();
  const result = await auditToneReferences(f);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
});

for (const field of ['bundledReferences', 'referenceFiles'])
  test(`missing ${field} rejects incomplete references`, async () => {
    const f = await fixture();
    delete f.tone[field];
    await f.save();
    rejects(await auditToneReferences(f), /required local|missing path/);
  });

test('missing required material fails even with a surviving required recipe', async () => {
  const f = await fixture();
  f.tone.bundledReferences.push({
    id: 'facts',
    title: 'Facts',
    path: 'sample/facts.md',
    required: true,
  });
  await f.save();
  rejects(await auditToneReferences(f), /ENOENT/);
});

for (const unsafe of [
  '/etc/passwd',
  '../secret.md',
  'sample/../recipe.md',
  'sample\\recipe.md',
  'sample//recipe.md',
  './sample/recipe.md',
  'C:/recipe.md',
  'sample/recipe.md\0',
]) {
  test(`rejects unsafe descriptor path ${JSON.stringify(unsafe)}`, async () => {
    const f = await fixture();
    f.tone.bundledReferences[0].path = unsafe;
    await f.save();
    rejects(await auditToneReferences(f), /Malformed/);
  });
}
for (const patch of [
  { required: 'yes' },
  { title: '' },
  { id: '../id' },
  { path: 'sample/readme.txt' },
  { extra: true },
]) {
  test(`rejects malformed descriptor ${JSON.stringify(patch)}`, async () => {
    const f = await fixture();
    Object.assign(f.tone.bundledReferences[0], patch);
    await f.save();
    rejects(await auditToneReferences(f), /Malformed|Unsupported|Markdown/);
  });
}

test('rejects duplicate descriptor IDs and absence of required explanation', async () => {
  const f = await fixture();
  f.tone.bundledReferences.push({ ...f.tone.bundledReferences[0] });
  await f.save();
  rejects(await auditToneReferences(f), /duplicate/);
  f.tone.bundledReferences = [{ ...f.tone.bundledReferences[0], required: false }];
  await f.save();
  rejects(await auditToneReferences(f), /required local/);
});

test('symlink escape fails for required and optional descriptors; contained symlink is allowed', async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.packageRoot, 'secret.md'), '# Outside');
  await fs.symlink(
    path.join(f.packageRoot, 'secret.md'),
    path.join(f.tonesRoot, 'sample/escape.md'),
  );
  for (const required of [true, false]) {
    f.tone.bundledReferences.push({
      id: 'escape',
      title: 'Escape',
      path: 'sample/escape.md',
      required,
    });
    await f.save();
    rejects(await auditToneReferences(f), /symlink escapes/);
    f.tone.bundledReferences.pop();
  }
  await fs.symlink('recipe.md', path.join(f.tonesRoot, 'sample/local.md'));
  f.tone.bundledReferences.push({
    id: 'local',
    title: 'Local',
    path: 'sample/local.md',
    required: true,
  });
  await f.save();
  assert.equal((await auditToneReferences(f)).ok, true);
});

for (const [name, content, pattern] of [
  ['broken.md', Buffer.from([0xc3, 0x28]), /encoded data/],
  ['nul.md', 'A\0B', /NUL/],
  ['empty.md', ' \n', /nonempty/],
  ['broken.json', '{bad', /JSON|property/],
  ['broken.svg', '<svg>', /SVG|unclosed/],
  [
    'external.svg',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/x.png"/></svg>',
    /external/,
  ],
  ['large.md', 'x'.repeat(1024 * 1024 + 1), /byte limit/],
])
  test(`rejects invalid content ${name}`, async () => {
    const f = await fixture();
    await fs.writeFile(path.join(f.tonesRoot, 'sample', name), content);
    f.tone.bundledReferences.push({
      id: 'broken',
      title: 'Broken',
      path: `sample/${name}`,
      required: true,
    });
    await f.save();
    rejects(await auditToneReferences(f), pattern);
  });

test('rejects non-files and package exclusions', async () => {
  const f = await fixture();
  await fs.mkdir(path.join(f.tonesRoot, 'sample/folder.md'));
  f.tone.bundledReferences.push({
    id: 'folder',
    title: 'Folder',
    path: 'sample/folder.md',
    required: true,
  });
  await f.save();
  rejects(await auditToneReferences(f), /regular file/);
  f.tone.bundledReferences.pop();
  await f.save();
  await fs.writeFile(
    path.join(f.packageRoot, 'package.json'),
    JSON.stringify({ files: ['src', 'tones/*.json', 'tones/*/*.svg'] }),
  );
  rejects(await auditToneReferences(f), /excluded/);
});

test('rejects forbidden links in current metadata, artwork and required teaching material', async () => {
  const f = await fixture();
  const privateUrl = 'https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual.md';
  f.tone.sourceReferences[0].url = privateUrl;
  await f.save();
  rejects(await auditToneReferences(f), /Forbidden private/);
  f.tone.sourceReferences[0].url = 'https://example.invalid';
  await f.save();
  await fs.writeFile(
    path.join(f.tonesRoot, 'sample/recipe.md'),
    `# Facts\n${privateUrl.replace('zudo-pattern-gen', 'zudo%2Dpattern%2Dgen')}`,
  );
  rejects(await auditToneReferences(f), /Forbidden private/);
  await fs.writeFile(path.join(f.tonesRoot, 'sample/recipe.md'), '# Facts');
  await fs.writeFile(
    path.join(f.tonesRoot, 'sample/source.svg'),
    SVG.replace('<rect', `<!-- ${privateUrl} --><rect`),
  );
  rejects(await auditToneReferences(f), /Forbidden private/);
});

test('optional inspiration URLs cannot be local paths or carry credentials', async () => {
  const f = await fixture();
  for (const url of [
    'shared/meaning.md',
    'file:///etc/passwd',
    'https://user:pass@example.invalid',
  ]) {
    f.tone.sourceReferences[0].url = url;
    await f.save();
    rejects(await auditToneReferences(f), /credential-free HTTP/);
  }
});

test('explicit external audit distinguishes redirects, missing, rate limits, visibility uncertainty and transient errors', async () => {
  const statuses = [200, 301, 404, 429, 403, 503];
  const catalog = {
    tones: [
      {
        sourceReferences: statuses.map((status) => ({ url: `https://example.invalid/${status}` })),
      },
    ],
  };
  const result = await auditExternalReferences(catalog, {
    fetchImpl: async (url, options) => {
      assert.equal(options.redirect, 'manual');
      assert.equal(options.method, 'HEAD');
      return new Response(null, {
        status: Number(new URL(url).pathname.slice(1)),
        headers: { location: '/redirected' },
      });
    },
  });
  assert.deepEqual(
    result.map((entry) => entry.state),
    [
      'reachable',
      'redirect',
      'access-denied-visibility-unknown',
      'missing-or-unavailable',
      'rate-limited',
      'transient-server-error',
    ],
  );
  assert.equal(result[1].location, '/redirected');
  const failures = await auditExternalReferences(
    { tones: [{ sourceReferences: [{ url: 'https://example.invalid' }] }] },
    {
      fetchImpl: async () => {
        throw new DOMException('Timed out', 'TimeoutError');
      },
    },
  );
  assert.equal(failures[0].state, 'timeout');
});

test('local quoted CSS references remain offline SVG resources', async () => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.tonesRoot, 'sample/light.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><style>rect { fill: url('#g'); }</style><rect style='fill:url("#g")'/></svg>`,
  );
  assert.equal((await auditToneReferences(f)).ok, true);
});

test('a dangling optional symlink outside the tones root is unsafe', async () => {
  const f = await fixture();
  await fs.symlink(
    path.join(f.packageRoot, 'absent.md'),
    path.join(f.tonesRoot, 'sample/escape.md'),
  );
  f.tone.bundledReferences.push({
    id: 'escape',
    title: 'Escape',
    path: 'sample/escape.md',
    required: false,
  });
  await f.save();
  rejects(await auditToneReferences(f), /symlink escapes/);
});

test('artwork reference paths cannot point to Markdown even when the content is valid text', async () => {
  const f = await fixture();
  f.tone.referenceFiles.light = 'sample/recipe.md';
  await f.save();
  rejects(await auditToneReferences(f), /Expected .svg resource/);
});

test('tone-only regeneration preserves SVG bytes and declared future resources', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { fileURLToPath } = await import('node:url');
  const exec = promisify(execFile);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tone-import-'));
  onTestFinished(() => fs.rm(directory, { recursive: true, force: true }));
  const sourceRoot = fileURLToPath(new URL('../tones/', import.meta.url));
  const target = path.join(directory, 'packages/diagram-gen/tones');
  await fs.mkdir(path.join(target, 'fine-outline'), { recursive: true });
  const catalog = JSON.parse(await fs.readFile(path.join(sourceRoot, 'catalog.json'), 'utf8'));
  Object.assign(catalog.tones[0], {
    scheme: 'fine-outline/scheme.json',
    kit: 'fine-outline/kit.svg',
    toneRevision: 'authored-v2',
  });
  await fs.writeFile(path.join(target, 'catalog.json'), JSON.stringify(catalog));
  await fs.writeFile(path.join(target, 'fine-outline/scheme.json'), '{"authored":true}');
  await fs.writeFile(path.join(target, 'fine-outline/kit.svg'), SVG);
  const importer = fileURLToPath(new URL('../../../scripts/import-tones.py', import.meta.url));
  await exec('python3', [importer, '--tones-only', '--out', directory], {
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  const generated = JSON.parse(await fs.readFile(path.join(target, 'catalog.json'), 'utf8'));
  assert.equal(generated.tones[0].scheme, 'fine-outline/scheme.json');
  assert.equal(generated.tones[0].kit, 'fine-outline/kit.svg');
  assert.equal(generated.tones[0].toneRevision, 'authored-v2');
  assert.equal(
    await fs.readFile(path.join(target, 'fine-outline/scheme.json'), 'utf8'),
    '{"authored":true}',
  );
  for (const tone of generated.tones) {
    assert.equal(tone.bundledReferences.filter((reference) => reference.required).length, 3);
    assert.ok(!JSON.stringify(tone).includes('zudolab/zudo-pattern-gen'));
    for (const name of ['source.svg', 'light.svg', 'dark.svg']) {
      assert.deepEqual(
        await fs.readFile(path.join(target, tone.id, name)),
        await fs.readFile(path.join(sourceRoot, tone.id, name)),
      );
    }
  }
  await assert.rejects(fs.stat(path.join(directory, 'examples')), { code: 'ENOENT' });
});

test('package inclusion respects recursive globs and directory exclusions', async () => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.packageRoot, 'package.json'),
    JSON.stringify({ files: ['tones/**/*.md', 'tones/**/*.svg', 'tones/*.json'] }),
  );
  assert.equal((await auditToneReferences(f)).ok, true);
  await fs.writeFile(
    path.join(f.packageRoot, 'package.json'),
    JSON.stringify({ files: ['tones', '!tones/sample'] }),
  );
  rejects(await auditToneReferences(f), /excluded/);
});
