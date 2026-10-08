import assert from 'node:assert/strict';
import { test } from 'vitest';
import { resolveToneContext, canonicalHash } from '../src/tone-context.mjs';
import { validateSvg } from '../src/model.mjs';
import { materializeKit, materializeSvg, resolvePalette } from '../src/materialize.mjs';
const context = resolveToneContext('fine-outline');
const canvas =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Long Japanese test</title><text x="5" y="180" data-palette-fill="ink" fill="#000000">予約を変更する場合は現在の予約を確認してください</text><path d="M1 2L3 4" fill="#FFFFFF"/></svg>';
const kit = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100"><defs><linearGradient id="base"><stop offset="0" stop-color="#112233"/></linearGradient><linearGradient id="gradient" xlink:href="#base"/><clipPath id="clip"><rect width="80" height="80"/></clipPath><mask id="mask"><rect width="100" height="100" fill="#FFFFFF"/></mask><symbol id="person" viewBox="0 0 100 100"><title id="label">Person</title><desc id="description">Description</desc><g aria-labelledby="label description" aria-describedby="description" style="fill:url('#gradient');clip-path:url(#clip)" mask="url(#mask)"><circle r="5" data-palette-stroke="warning" stroke="#000000"/></g></symbol><symbol id="arrow" viewBox="0 0 100 100"><use href="#person" width="100" height="100"/></symbol><symbol id="check" viewBox="0 0 100 100"><use xlink:href="#arrow" width="100" height="100"/></symbol></defs></svg>`;
const instances = ['person', 'arrow', 'check'].flatMap((primitive) =>
  [0, 1].map((i) => ({
    id: `${primitive}-${i}`,
    primitive,
    x: i * 100,
    y: 5,
    width: 90,
    height: 90,
  })),
);
const synthetic = async () => {
  const scheme = structuredClone((await context).scheme);
  scheme.primitiveAlternatives = {
    pin: 'Custom geometry',
    'slot-card': 'Custom geometry',
    'empty-seat': 'Custom geometry',
    clock: 'Custom geometry',
  };
  return scheme;
};
test('repeated instances rewrite gradients masks clips href/accessibility and nested symbols deterministically in both themes', async () => {
  const scheme = await synthetic(),
    palette = resolvePalette(scheme);
  for (const theme of ['light', 'dark']) {
    const result = materializeKit(kit, { scheme, palette, theme, instances, svg: canvas });
    const errors = [];
    validateSvg(result, 'result', errors, []);
    assert.deepEqual(errors, []);
    assert.equal(result, materializeKit(kit, { scheme, palette, theme, instances, svg: canvas }));
    assert.match(result, /aria-labelledby="kit-person-1-label kit-person-1-description"/);
    assert.match(result, /xlink:href="#kit-check-1-base"/);
    assert.match(result, /url\(#kit-arrow-1-gradient\)/);
    assert.match(result, new RegExp(`stroke="${palette[theme].warning}"`));
    assert.equal(result.includes('data-palette-'), false);
    assert.match(result, /fill="#FFFFFF"/);
    assert.match(result, /d="M1 2L3 4"/);
  }
});
test('all accepted native pilot kits materialize complete literal light/dark with repeated people arrows checks', async () => {
  for (const toneId of ['fine-outline', 'soft-fill', 'paper-layers', 'pencil-notebook']) {
    const value = await resolveToneContext(toneId);
    for (const theme of ['light', 'dark']) {
      const result = materializeKit(value.kit.text, {
        scheme: value.scheme,
        theme,
        instances,
        svg: canvas,
      });
      assert.equal(result.includes('data-palette-'), false);
      assert.match(result, /予約を変更する場合/);
      assert.match(result, /kit-person-1-person/);
    }
  }
});
test('semantic overrides leave unmarked colors/custom geometry unchanged and validate full roles/themes', async () => {
  const scheme = (await context).scheme,
    before = canonicalHash(scheme);
  const palette = resolvePalette(scheme);
  palette.light.ink = '#123456';
  assert.match(materializeSvg(canvas, { palette, theme: 'light' }), /fill="#123456"/);
  assert.equal(canonicalHash(scheme), before);
  for (const mutate of [
    (p) => delete p.dark,
    (p) => delete p.light.warning,
    (p) => (p.dark.ink = 'var(--ink)'),
    (p) => (p.light.unknown = '#123456'),
  ]) {
    const bad = structuredClone(palette);
    mutate(bad);
    assert.throws(() => resolvePalette(scheme, bad), /palette/);
  }
  assert.throws(() => materializeSvg(canvas, { palette }), /explicit theme/);
  assert.throws(
    () =>
      materializeSvg(canvas.replace('data-palette-fill="ink"', 'data-palette-fill="missing"'), {
        palette,
        theme: 'light',
      }),
    /Unresolved palette role/,
  );
});
test('duplicate/dangling IDs, external resources, dynamic CSS, script/animation and unsupported syntax fail', async () => {
  const scheme = await synthetic();
  for (const changed of [
    kit.replace('id="base"', 'id="gradient"'),
    kit.replace('href="#base"', 'href="#missing"'),
    kit.replace('href="#base"', 'href="kit.svg#base"'),
    kit.replace('url(#clip)', 'url(https://example.com/x)'),
    kit.replace('</svg>', '<script>alert(1)</script></svg>'),
    kit.replace('</svg>', '<animate attributeName="x"/></svg>'),
    kit.replace('</svg>', '<style>#person { fill: red }</style></svg>'),
    kit.replace('url(#clip)', 'url(\\23 clip)'),
    kit.replace('url(#clip)', 'var(--clip)'),
    kit.replace('aria-describedby="description"', 'aria-describedby="missing"'),
  ])
    assert.throws(() =>
      materializeKit(changed, { scheme, theme: 'light', instances, svg: canvas }),
    );
  assert.throws(
    () =>
      materializeKit(kit, {
        scheme,
        theme: 'light',
        instances: [...instances, instances[0]],
        svg: canvas,
      }),
    /unique/,
  );
  assert.throws(
    () =>
      materializeKit(kit, {
        scheme,
        theme: 'light',
        instances: [{ ...instances[0], primitive: 'missing' }],
        svg: canvas,
      }),
    /Unknown/,
  );
  assert.throws(
    () =>
      materializeSvg(canvas.replace('fill="#000000"', 'fill="#000000" style="fill:#123456"'), {
        palette: scheme.palette,
        theme: 'light',
      }),
    /conflicts/,
  );
});

test('namespace aliases cannot bypass static resource restrictions', async () => {
  const scheme = await synthetic();
  for (const element of [
    'animate',
    'animateMotion',
    'animateTransform',
    'set',
    'discard',
    'style',
  ]) {
    const changed = kit.replace(
      '</svg>',
      `<svg:${element} xmlns:svg="http://www.w3.org/2000/svg"/></svg>`,
    );
    assert.throws(
      () => materializeKit(changed, { scheme, theme: 'light', instances, svg: canvas }),
      /Unsupported materialization element/,
    );
  }
});
test('nonzero viewBox origins are applied once and valid prefixed symbols instantiate', async () => {
  const scheme = await synthetic();
  const changed = kit
    .replace('id="person" viewBox="0 0 100 100"', 'id="person" viewBox="10,20,100,100"')
    .replace('<symbol id="person"', '<s:symbol xmlns:s="http://www.w3.org/2000/svg" id="person"')
    .replace('</symbol>', '</s:symbol>');
  const result = materializeKit(changed, {
    scheme,
    theme: 'light',
    instances: [instances[0]],
    svg: canvas,
  });
  assert.match(result, /<svg x="0" y="5" width="90" height="90" viewBox="0 0 100 100">/);
  assert.match(result, /viewBox="10,20,100,100"/);
});
