/** Pure, shared CSS-pixel placement contract used by workbench and capture. */
export function validatePlacement(value, target, theme = 'light') {
  const fail = (message) => {
    throw new Error(`Invalid placement: ${message}`);
  };
  const object = (v, keys) => {
    if (
      !v ||
      typeof v !== 'object' ||
      Array.isArray(v) ||
      Object.keys(v).some((k) => !keys.includes(k))
    )
      fail('unknown fields or invalid object');
  };
  const dimension = (n) => Number.isFinite(n) && n > 0 && n <= 20000;
  if (!dimension(target?.width) || !dimension(target?.height)) fail('invalid session target');
  if (value === undefined)
    value = {
      schemaVersion: 1,
      frame: {
        width: target.width,
        height: target.height,
        background: theme === 'dark' ? '#111827' : '#FFFFFF',
      },
      slot: { x: 0, y: 0, width: target.width, height: target.height },
      fit: 'contain',
    };
  object(value, ['schemaVersion', 'frame', 'slot', 'fit', 'fonts', 'context', 'images']);
  if (value.schemaVersion !== 1 || value.fit !== 'contain')
    fail('expected version 1 and contain fit');
  object(value.frame, ['width', 'height', 'background']);
  if (
    !dimension(value.frame.width) ||
    !dimension(value.frame.height) ||
    !/^(?:#[\da-f]{6}|transparent)$/i.test(value.frame.background)
  )
    fail('invalid frame dimensions/background');
  const rect = (r, keys) => {
    object(r, keys);
    if (
      !dimension(r.width) ||
      !dimension(r.height) ||
      !Number.isFinite(r.x) ||
      !Number.isFinite(r.y) ||
      r.x < 0 ||
      r.y < 0 ||
      r.x + r.width > value.frame.width ||
      r.y + r.height > value.frame.height
    )
      fail('rectangle outside frame');
  };
  rect(value.slot, ['x', 'y', 'width', 'height']);
  if (value.slot.width !== target.width || value.slot.height !== target.height)
    fail('slot conflicts with authoritative session.target');
  if (
    value.fonts !== undefined &&
    (!Array.isArray(value.fonts) ||
      value.fonts.length > 32 ||
      value.fonts.some(
        (f) => typeof f !== 'string' || !f.trim() || f.length > 128 || /["'\\;\n\r]/.test(f),
      ))
  )
    fail('invalid declared fonts');
  if (value.context !== undefined) {
    object(value.context, ['title', 'body']);
    if (
      typeof value.context.title !== 'string' ||
      typeof value.context.body !== 'string' ||
      value.context.title.length + value.context.body.length > 16384
    )
      fail('invalid context');
  }
  if (value.images !== undefined && (!Array.isArray(value.images) || value.images.length > 64))
    fail('invalid images');
  for (const image of value.images || []) {
    rect(image, ['path', 'x', 'y', 'width', 'height']);
    if (
      typeof image.path !== 'string' ||
      !image.path ||
      /[\\\0:]/.test(image.path) ||
      image.path.startsWith('/') ||
      image.path.split('/').some((p) => !p || p === '.' || p === '..')
    )
      fail('unsafe image path');
  }
  return JSON.parse(JSON.stringify(value));
}

export function renderPlacement(placement, { svgUrl, title = 'Diagram', images = [] } = {}) {
  placement = validatePlacement(placement, placement?.slot);
  if (svgUrl && !/^data:image\/svg\+xml(?:;charset=utf-8)?(?:;base64)?,/i.test(svgUrl))
    throw new Error('Placement diagram must be an embedded SVG image.');
  if (images.some((i) => !/^data:image\/(?:png|jpeg|webp);base64,/i.test(i.url)))
    throw new Error('Placement references must be embedded static raster images.');
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const image = (url, r, label, kind) =>
    `<img data-placement-${kind} src="${escape(url)}" alt="${escape(label)}" draggable="false" style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;object-fit:contain;display:block;max-width:none;max-height:none;border:0;padding:0;margin:0;box-sizing:content-box">`;
  const { frame, slot, context } = placement;
  const rgb =
    frame.background === 'transparent'
      ? [255, 255, 255]
      : [1, 3, 5].map((i) => parseInt(frame.background.slice(i, i + 2), 16));
  const contextInk = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 140 ? '#FFFFFF' : '#111827';
  return `<div data-placement-frame style="position:relative;isolation:isolate;box-sizing:content-box;width:${frame.width}px;height:${frame.height}px;background:${escape(frame.background)};overflow:hidden;color:${contextInk}">${images.map((i) => image(i.url, i, 'Placement reference', 'reference')).join('')}${svgUrl ? image(svgUrl, slot, title, 'diagram') : '<span data-placement-unavailable>Theme unavailable</span>'}${context ? `<div data-placement-context style="position:absolute;left:0;bottom:0;max-width:100%;box-sizing:border-box;font:14px/1.4 sans-serif"><strong>${escape(context.title)}</strong><p style="margin:0">${escape(context.body)}</p></div>` : ''}</div>`;
}
