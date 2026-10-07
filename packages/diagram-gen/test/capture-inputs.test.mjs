import { it, expect } from 'vitest';
import { inspectCaptureSvg, inspectRaster } from '../src/capture-inputs.mjs';
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" viewBox="0 0 480 140">${body}</svg>`;
it('rejects namespaced SMIL, longhand/escaped animation and unseeded texture', () => {
  for (const body of [
    '<s:animate attributeName="x"/>',
    '<style>rect {animation-name: pulse}</style>',
    '<style>rect {animat\\69on: pulse 1s}</style>',
    '<feTurbulence/>',
    '<feTurbulence seed="NaN"/>',
  ])
    expect(() => inspectCaptureSvg(svg(body))).toThrow();
  expect(inspectCaptureSvg(svg('<feTurbulence seed="42"/>')).embeddedBytes).toBe(0);
});
it('checks embedded raster decode budgets before browser decode', () => {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(20000, 16);
  png.writeUInt32BE(20000, 20);
  expect(() => inspectRaster(png)).toThrow('40 million');
  expect(() =>
    inspectCaptureSvg(svg(`<image href="data:image/png;base64,${png.toString('base64')}"/>`)),
  ).toThrow('40 million');
});
it('rejects animated rasters and preserves valid static MIME identification', () => {
  expect(() => inspectRaster(Buffer.from('GIF89a'))).toThrow('potentially animated');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=',
    'base64',
  );
  expect(inspectRaster(png)).toEqual({ mime: 'image/png', width: 1, height: 1 });
});
