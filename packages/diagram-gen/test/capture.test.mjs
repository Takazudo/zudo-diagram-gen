import { it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, rename, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const state = vi.hoisted(() => ({
  mode: 'timeout',
  browserClosed: 0,
  contextClosed: 0,
  reject: null,
  launches: 0,
  beforeScreenshot: null,
}));
vi.mock('../src/capture-runtime.mjs', () => ({
  captureSetup: 'Explicit setup required',
  loadCaptureCapability: async () => ({
    launch: async () => {
      state.launches++;
      return {
        version: () => 'test-browser',
        close: async () => {
          state.browserClosed++;
          state.reject?.(new Error('Browser closed'));
        },
        newContext: async () => ({
          route: async () => {},
          close: async () => {
            state.contextClosed++;
            state.reject?.(new Error('Context closed'));
          },
          newPage: async () => ({
            setDefaultTimeout: () => {},
            goto: async () => {},
            evaluate: async () => {
              if (state.mode === 'success') return { fonts: [] };
              if (state.mode === 'decode') throw new Error('Image decode failed');
              return new Promise((_, reject) => {
                state.reject = reject;
              });
            },
            screenshot: async () => {
              await state.beforeScreenshot?.();
              const png = Buffer.alloc(24);
              png.writeUInt32BE(480, 16);
              png.writeUInt32BE(140, 20);
              return png;
            },
          }),
        }),
      };
    },
  }),
}));
import { loadProject } from '../src/project.mjs';
import { captureCandidate } from '../src/capture.mjs';
let root;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  state.reject = null;
  state.launches = 0;
  state.beforeScreenshot = null;
  state.browserClosed = 0;
  state.contextClosed = 0;
});
async function fixture() {
  root = await mkdtemp(path.join(os.tmpdir(), 'capture-failure-'));
  const c = path.join(root, 'rounds', 'r01', 'c01');
  await mkdir(c, { recursive: true });
  for (const [file, data] of [
    [
      'session.json',
      { schemaVersion: 1, id: 'test', title: 'Test', target: { width: 480, height: 140 } },
    ],
    ['rounds/r01/round.json', { schemaVersion: 1, id: 'r01', title: 'Round', order: 1 }],
    [
      'rounds/r01/c01/candidate.json',
      {
        schemaVersion: 1,
        id: 'c01',
        title: 'Candidate',
        toneId: 'swiss-grid',
        order: 1,
        assets: { light: 'light.svg' },
      },
    ],
  ])
    await writeFile(path.join(root, file), JSON.stringify(data));
  await writeFile(
    path.join(c, 'light.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 140" aria-label="Test"><rect width="480" height="140" fill="#ffffff"/></svg>',
  );
  return path.join(root, 'exports', 'failure.png');
}
it('readiness timeout closes server/browser/context and leaves no output', async () => {
  state.mode = 'timeout';
  const output = await fixture();
  await expect(captureCandidate(root, 'c01', { output, timeoutMs: 1000 })).rejects.toMatchObject({
    code: 'VALIDATION_FAILED',
    message: 'Capture readiness timed out.',
  });
  expect(state.contextClosed).toBeGreaterThan(0);
  expect(state.browserClosed).toBeGreaterThan(0);
  expect(await readdir(root)).not.toContain('exports');
});
it('active cancellation interrupts readiness and cleans owned resources', async () => {
  state.mode = 'timeout';
  const output = await fixture();
  const controller = new AbortController();
  const capture = captureCandidate(root, 'c01', { output, signal: controller.signal });
  const timer = setInterval(() => {
    if (state.reject) {
      clearInterval(timer);
      controller.abort();
    }
  }, 5);
  try {
    await expect(capture).rejects.toMatchObject({ code: 'CANCELLED' });
  } finally {
    clearInterval(timer);
  }
  expect(state.contextClosed).toBeGreaterThan(0);
  expect(state.browserClosed).toBeGreaterThan(0);
  expect(await readdir(root)).not.toContain('exports');
});
it('decode failure cleans resources and retains structured diagnostic', async () => {
  state.mode = 'decode';
  const output = await fixture();
  await expect(captureCandidate(root, 'c01', { output })).rejects.toMatchObject({
    code: 'VALIDATION_FAILED',
    message: 'Image decode failed',
  });
  expect(state.contextClosed).toBeGreaterThan(0);
  expect(state.browserClosed).toBeGreaterThan(0);
  expect(await readdir(root)).not.toContain('exports');
});

async function projectFixture(image = false) {
  await fixture();
  const sessionRoot = path.join(root, 'sessions/test');
  await mkdir(sessionRoot, { recursive: true });
  for (const file of ['session.json', 'rounds'])
    await rename(path.join(root, file), path.join(sessionRoot, file));
  await cp(sessionRoot, path.join(root, 'sessions/other'), { recursive: true });
  const metadata = JSON.parse(await readFile(path.join(sessionRoot, 'session.json'), 'utf8'));
  await writeFile(
    path.join(root, 'sessions/other/session.json'),
    JSON.stringify({ ...metadata, id: 'other' }),
  );
  await mkdir(path.join(root, 'exports'));
  const descriptor = {
    schemaVersion: 1,
    frame: { width: 480, height: 140, background: 'transparent' },
    slot: { x: 0, y: 0, width: 480, height: 140 },
    fit: 'contain',
  };
  if (image) {
    descriptor.images = [{ path: 'victim.png', x: 0, y: 0, width: 10, height: 10 }];
    await writeFile(
      path.join(root, 'exports/victim.png'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT9sAAAAASUVORK5CYII=',
        'base64',
      ),
    );
  }
  const placementPath = image ? 'exports/other-placement.json' : 'exports/victim.png.json';
  await writeFile(path.join(root, placementPath), JSON.stringify(descriptor));
  const manifest = {
    schemaVersion: 1,
    id: 'project',
    title: 'Project',
    sessions: [
      { id: 'test', path: 'sessions/test', order: 0 },
      { id: 'other', path: 'sessions/other', order: 1, placement: placementPath },
    ],
    comparisonSets: [],
  };
  await writeFile(path.join(root, 'project.json'), JSON.stringify(manifest));
  expect((await loadProject(root)).ok).toBe(true);
  return { sessionRoot, descriptor, manifest, placementPath };
}

it.each([false, true])(
  'forced capture protects another registered session descriptor/image before capability launch (image=%s)',
  async (image) => {
    const { sessionRoot, placementPath } = await projectFixture(image);
    const protectedPath = path.join(root, image ? 'exports/victim.png' : placementPath);
    const before = await readFile(protectedPath);
    await expect(
      captureCandidate(sessionRoot, 'c01', {
        resourceRoot: root,
        output: path.join(root, 'exports/victim.png'),
        force: true,
      }),
    ).rejects.toMatchObject({ code: 'RESOURCE_UNSAFE' });
    expect(state.launches).toBe(0);
    expect(await readFile(protectedPath)).toEqual(before);
    expect((await loadProject(root)).ok).toBe(true);
  },
);

it('capture rechecks newly registered sibling source immediately before publishing both outputs', async () => {
  const { sessionRoot, descriptor, manifest } = await projectFixture();
  state.mode = 'success';
  const output = path.join(root, 'exports/generated.png');
  state.beforeScreenshot = async () => {
    manifest.sessions[1].placement = 'exports/generated.png.json';
    await writeFile(`${output}.json`, JSON.stringify(descriptor));
    await writeFile(path.join(root, 'project.json'), JSON.stringify(manifest));
  };
  await expect(
    captureCandidate(sessionRoot, 'c01', { resourceRoot: root, output, force: true }),
  ).rejects.toMatchObject({ code: 'RESOURCE_UNSAFE' });
  expect(state.launches).toBe(1);
  expect(JSON.parse(await readFile(`${output}.json`, 'utf8'))).toEqual(descriptor);
  expect(await readdir(path.join(root, 'exports'))).toEqual([
    'generated.png.json',
    'victim.png.json',
  ]);
  expect((await loadProject(root)).ok).toBe(true);
});
