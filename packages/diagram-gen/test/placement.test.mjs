import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  validatePlacement,
  renderPlacement,
  loadPlacement,
  canonicalHash,
} from '../src/placement.mjs';
import { captureCandidate } from '../src/capture.mjs';
import { loadCaptureCapability } from '../src/capture-runtime.mjs';
const target = { width: 640, height: 180 };
const descriptor = {
  schemaVersion: 1,
  frame: { width: 800, height: 400, background: 'transparent' },
  slot: { x: 40, y: 80, ...target },
  fit: 'contain',
  fonts: ['Noto Sans CJK JP'],
};
describe('shared placement', () => {
  it('preserves authoritative nondefault geometry and contains SVG image', () => {
    const p = validatePlacement(descriptor, target);
    const html = renderPlacement(p, {
      svgUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
      title: '長い日本語ラベル <script>',
    });
    expect(html).toContain('left:40px;top:80px;width:640px;height:180px;object-fit:contain');
    expect(html).toContain('width:800px;height:400px');
    expect(html).toContain('&lt;script&gt;');
    expect(validatePlacement(undefined, target, 'dark').frame).toEqual({
      ...target,
      background: '#111827',
    });
  });
  it('rejects dimensions, target conflicts, fonts, external and unsafe image paths', () => {
    for (const mutate of [
      (p) => (p.slot.width = 360),
      (p) => (p.slot.x = 200),
      (p) => (p.frame.width = Infinity),
      (p) => (p.fit = 'cover'),
      (p) => (p.frame.background = 'url(http://bad)'),
      (p) => (p.fonts = ['bad"font']),
      (p) => (p.images = [{ path: '../secret.png', x: 0, y: 0, width: 10, height: 10 }]),
      (p) => (p.images = [{ path: 'https://bad/a.png', x: 0, y: 0, width: 10, height: 10 }]),
    ]) {
      const p = structuredClone(descriptor);
      mutate(p);
      expect(() => validatePlacement(p, target)).toThrow('Invalid placement');
    }
  });
  it('hashes canonical inputs and embeds only contained raster bytes', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'placement-'));
    try {
      await mkdir(path.join(dir, 'placements'));
      const image = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=',
        'base64',
      );
      await writeFile(path.join(dir, 'placements', 'ref.png'), image);
      const p = { ...descriptor, images: [{ path: 'ref.png', x: 0, y: 0, width: 20, height: 20 }] };
      await writeFile(path.join(dir, 'placements', 'placement.json'), JSON.stringify(p));
      const loaded = await loadPlacement(dir, target, { placement: 'placements/placement.json' });
      expect(loaded.images[0].url).toMatch(/^data:image\/png;base64/);
      expect(loaded.placementHash).toHaveLength(64);
      expect(canonicalHash({ b: 1, a: 2 })).toBe(canonicalHash({ a: 2, b: 1 }));
      await writeFile(
        path.join(dir, 'placements', 'ref.png'),
        Buffer.concat([image, Buffer.from('changed')]),
      );
      expect(
        (await loadPlacement(dir, target, { placement: 'placements/placement.json' }))
          .placementHash,
      ).not.toBe(loaded.placementHash);
      await symlink('/etc/passwd', path.join(dir, 'placements', 'escape.png'));
      p.images[0].path = 'placements/escape.png';
      await expect(loadPlacement(dir, target, { placement: p })).rejects.toMatchObject({
        code: 'RESOURCE_UNSAFE',
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('validates capture arguments before optional browser loading', async () => {
    await expect(captureCandidate('/missing', 'x', { output: 'a.svg' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});

it('lazily resolves installed Playwright CJS/ESM Chromium without launching', async () => {
  const chromium = await loadCaptureCapability();
  expect(typeof chromium.launch).toBe('function');
});
