import { SaxesParser } from 'saxes';
import { CaptureError } from './placement.mjs';
const unsafe = (message) => {
  throw new CaptureError('RESOURCE_UNSAFE', message);
};
/** Reject animation and decode budgets before passing raster inputs to a browser. */
export function inspectRaster(bytes) {
  if (bytes.length > 16 * 1024 * 1024) unsafe('Individual image exceeds 16 MiB.');
  let mime, width, height;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    mime = 'image/png';
    if (bytes.length >= 24) {
      width = bytes.readUInt32BE(16);
      height = bytes.readUInt32BE(20);
    }
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = bytes.readUInt32BE(offset);
      const type = bytes.subarray(offset + 4, offset + 8).toString();
      if (type === 'acTL') unsafe('Animated PNG is unsupported; supply a static image.');
      if (length > bytes.length - offset - 12) break;
      offset += length + 12;
    }
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = 'image/jpeg';
    for (let offset = 2; offset + 4 <= bytes.length;) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 255) {
        offset++;
        continue;
      }
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        length >= 7
      ) {
        height = bytes.readUInt16BE(offset + 5);
        width = bytes.readUInt16BE(offset + 7);
        break;
      }
      offset += 2 + length;
    }
  } else if (/^GIF8[79]a/.test(bytes.subarray(0, 6).toString()))
    unsafe('GIF is potentially animated; supply a static PNG/JPEG/WebP.');
  else if (
    bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === 'WEBP'
  ) {
    mime = 'image/webp';
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = bytes.subarray(offset, offset + 4).toString();
      const length = bytes.readUInt32LE(offset + 4);
      if (type === 'ANIM' || type === 'ANMF')
        unsafe('Animated WebP is unsupported; supply a static image.');
      if (length > bytes.length - offset - 8) break;
      const payload = offset + 8;
      if (type === 'VP8X' && length >= 10) {
        if (bytes[payload] & 2) unsafe('Animated WebP is unsupported.');
        width = 1 + bytes.readUIntLE(payload + 4, 3);
        height = 1 + bytes.readUIntLE(payload + 7, 3);
      }
      if (type === 'VP8 ' && length >= 10) {
        width = bytes.readUInt16LE(payload + 6) & 0x3fff;
        height = bytes.readUInt16LE(payload + 8) & 0x3fff;
      }
      if (type === 'VP8L' && length >= 5) {
        const bits = bytes.readUInt32LE(payload + 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      offset += 8 + length + (length % 2);
    }
  } else unsafe('References must be static PNG/JPEG/WebP; unsupported image bytes.');
  if (width * height > 40000000) unsafe('Decoded image exceeds 40 million pixels.');
  return { mime, width, height };
}
export function inspectCaptureSvg(svg) {
  let embeddedBytes = 0;
  const css = (text) => {
    const decoded = text
      .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) =>
        String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)),
      )
      .replace(/\\([^\n\r])/g, '$1');
    if (/(?:animation|transition)(?:-[a-z-]+)?\s*:/i.test(decoded))
      throw new CaptureError(
        'VALIDATION_FAILED',
        'Animated SVG CSS is unsupported; save a static asset.',
      );
  };
  const parser = new SaxesParser({ xmlns: true });
  let inStyle = false;
  let styleText = '';
  parser.on('opentag', (tag) => {
    if (
      ['animate', 'animatemotion', 'animatetransform', 'set', 'discard'].includes(
        tag.local.toLowerCase(),
      )
    )
      throw new CaptureError(
        'VALIDATION_FAILED',
        'Animated SVG is unsupported; save a static asset.',
      );
    if (tag.local === 'style') {
      inStyle = true;
      styleText = '';
    }
    if (tag.local === 'feTurbulence') {
      const seed = Object.values(tag.attributes).find((a) => a.local === 'seed')?.value;
      if (seed === undefined || !/^\d+$/.test(seed) || !Number.isSafeInteger(Number(seed)))
        throw new CaptureError(
          'VALIDATION_FAILED',
          'Texture turbulence requires an explicit nonnegative safe-integer seed.',
        );
    }
    for (const attr of Object.values(tag.attributes)) {
      if (attr.local === 'style') css(attr.value);
      for (const match of attr.value.matchAll(
        /data:image\/(?:png|jpeg|gif|webp);base64,([a-zA-Z0-9+/=\s]+)/gi,
      )) {
        const bytes = Buffer.from(match[1], 'base64');
        inspectRaster(bytes);
        embeddedBytes += bytes.length;
        if (embeddedBytes > 64 * 1024 * 1024)
          unsafe('Embedded images exceed combined input budget.');
      }
    }
  });
  parser.on('text', (text) => {
    if (inStyle) styleText += text;
  });
  parser.on('cdata', (text) => {
    if (inStyle) styleText += text;
  });
  parser.on('closetag', (tag) => {
    if (tag.local === 'style') {
      css(styleText);
      inStyle = false;
    }
  });
  parser.write(svg).close();
  return { embeddedBytes };
}
