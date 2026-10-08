import { SaxesParser } from 'saxes';
import { validateSvg } from './model.mjs';
import {
  validatePalette,
  validateToneScheme,
  KIT_PRIMITIVES,
  PALETTE_ROLES,
} from './tone-context.mjs';

const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const slug = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const urlPattern = /url\(\s*(?:"(#[^"\s]+)"|'(#[^'\s]+)'|(#[^\s)]+))\s*\)/gi;
function walk(node, fn) {
  if (typeof node === 'string') return;
  fn(node);
  node.children.forEach((child) => walk(child, fn));
}
function serialize(node) {
  if (typeof node === 'string') return escape(node);
  return `<${node.name}${Object.entries(node.attrs)
    .map(([key, value]) => ` ${key}="${escape(value)}"`)
    .join('')}>${node.children.map(serialize).join('')}</${node.name}>`;
}
function tree(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 16 * 1024 * 1024)
    throw new Error('SVG must be UTF-8 text no larger than 16 MiB.');
  const errors = [];
  validateSvg(text, 'materialization input', errors, []);
  if (errors.length) throw new Error(errors.join('\n'));
  const parser = new SaxesParser({ xmlns: true });
  let root;
  const stack = [];
  parser.on('opentag', (tag) => {
    const node = {
      name: tag.name,
      local: tag.local,
      attrs: Object.fromEntries(Object.values(tag.attributes).map((a) => [a.name, a.value])),
      children: [],
    };
    if (stack.length) stack.at(-1).children.push(node);
    else root = node;
    stack.push(node);
  });
  parser.on('text', (text) => stack.at(-1)?.children.push(text));
  parser.on('cdata', (text) => stack.at(-1)?.children.push(text));
  parser.on('closetag', () => stack.pop());
  parser.write(text).close();
  walk(root, (node) => {
    if (
      ['style', 'animate', 'animatemotion', 'animatetransform', 'set', 'discard'].includes(
        node.local.toLowerCase(),
      )
    )
      throw new Error(
        `Unsupported materialization element ${node.name}; use static presentation attributes or inline style declarations.`,
      );
    for (const [key, value] of Object.entries(node.attrs)) {
      if (
        /\\|@|(?:animation|transition)\s*:|var\s*\(|currentColor|context-(?:fill|stroke)/i.test(
          value,
        )
      )
        throw new Error(`Unsupported reference or dynamic style syntax in ${key}.`);
      const replaced = value.replace(urlPattern, '');
      if (/url\s*\(/i.test(replaced))
        throw new Error(`Unsupported local reference syntax in ${key}.`);
      if (/^(?:[^:]+:)?href$/.test(key) && !/^#[^\s]+$/.test(value))
        throw new Error(
          `External or unsupported ${key}; materialization requires local #id resources.`,
        );
      if (
        key.startsWith('data-palette-') &&
        !['data-palette-fill', 'data-palette-stroke'].includes(key)
      )
        throw new Error(`Unsupported palette marker ${key}.`);
    }
  });
  return root;
}
export function resolvePalette(scheme, override) {
  validateToneScheme(scheme);
  return structuredClone(validatePalette(override === undefined ? scheme.palette : override));
}
function applyPalette(root, palette, theme) {
  validatePalette(palette);
  if (!['light', 'dark'].includes(theme)) throw new Error('Choose explicit theme light or dark.');
  walk(root, (node) => {
    for (const kind of ['fill', 'stroke']) {
      const marker = `data-palette-${kind}`;
      if (!Object.hasOwn(node.attrs, marker)) continue;
      const role = node.attrs[marker];
      if (!PALETTE_ROLES.includes(role))
        throw new Error(`Unresolved palette role ${role} in ${marker}.`);
      if (!/^#[a-f0-9]{6}$/i.test(node.attrs[kind] ?? ''))
        throw new Error(`${marker} requires a literal #RRGGBB default.`);
      // An inline declaration would take precedence over the semantic presentation attribute.
      if (new RegExp(`(?:^|;)\\s*${kind}\\s*:`, 'i').test(node.attrs.style ?? ''))
        throw new Error(`${marker} conflicts with inline style ${kind}.`);
      node.attrs[kind] = palette[theme][role];
      delete node.attrs[marker];
    }
  });
}
function namespace(root, prefix) {
  const ids = new Map();
  walk(root, (node) => {
    if (node.attrs.id) ids.set(node.attrs.id, `${prefix}-${node.attrs.id}`);
  });
  walk(root, (node) => {
    for (const [key, value] of Object.entries(node.attrs)) {
      const lookup = (id) => {
        if (!ids.has(id)) throw new Error(`Dangling local reference #${id}.`);
        return ids.get(id);
      };
      if (key === 'id') node.attrs[key] = lookup(value);
      else if (/^(?:[^:]+:)?href$/.test(key)) node.attrs[key] = `#${lookup(value.slice(1))}`;
      else if (['aria-labelledby', 'aria-describedby'].includes(key))
        node.attrs[key] = value.trim().split(/\s+/).map(lookup).join(' ');
      else
        node.attrs[key] = value.replace(
          urlPattern,
          (_, a, b, c) => `url(#${lookup((a ?? b ?? c).slice(1))})`,
        );
    }
  });
}
/** Validate a kit independently of the currently installed catalog. */
export function validateMaterializationKit(kit, scheme) {
  validateToneScheme(scheme);
  const root = tree(kit),
    symbols = new Map();
  walk(root, (node) => {
    if (node.local !== 'symbol') return;
    const box = node.attrs.viewBox
      ?.trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      !node.attrs.id ||
      !box ||
      box.length !== 4 ||
      box.some((v) => !Number.isFinite(v)) ||
      box[2] <= 0 ||
      box[3] <= 0
    )
      throw new Error('Kit symbols require an ID and positive viewBox.');
    symbols.set(node.attrs.id, node);
  });
  for (const id of KIT_PRIMITIVES)
    if (!symbols.has(id) && !scheme.primitiveAlternatives?.[id])
      throw new Error(`Missing kit primitive ${id}.`);
  for (const theme of ['light', 'dark']) applyPalette(structuredClone(root), scheme.palette, theme);
  return { root, symbols };
}
/** Resolve semantic markers on custom geometry without changing coordinates. */
export function materializeSvg(svg, { palette, theme } = {}) {
  const root = tree(svg);
  applyPalette(root, palette, theme);
  const result = serialize(root),
    errors = [];
  validateSvg(result, 'materialized SVG', errors, []);
  if (errors.length) throw new Error(errors.join('\n'));
  return result;
}
/** Each instance owns an isolated copy of local definitions, including nested symbols. */
export function materializeKit(
  kit,
  { scheme, palette = resolvePalette(scheme), theme, instances, svg } = {},
) {
  const { root, symbols } = validateMaterializationKit(kit, scheme);
  const output = tree(svg);
  applyPalette(output, palette, theme);
  if (!Array.isArray(instances)) throw new Error('instances must be an ordered array.');
  const seen = new Set();
  for (const instance of instances) {
    if (
      !instance ||
      typeof instance.id !== 'string' ||
      !slug.test(instance.id) ||
      seen.has(instance.id)
    )
      throw new Error('Instance IDs must be unique URL-safe slugs.');
    seen.add(instance.id);
    if (!symbols.has(instance.primitive))
      throw new Error(
        `Unknown kit symbol ${instance.primitive}; a documented alternative requires custom geometry.`,
      );
    const attrs = {};
    for (const key of ['x', 'y', 'width', 'height']) {
      const value = instance[key] ?? (['x', 'y'].includes(key) ? 0 : undefined);
      if (!Number.isFinite(value) || (['width', 'height'].includes(key) && value <= 0))
        throw new Error(`Instance ${instance.id} needs finite ${key} and positive dimensions.`);
      attrs[key] = String(value);
    }
    const cloned = structuredClone(root);
    applyPalette(cloned, palette, theme);
    namespace(cloned, `kit-${instance.id}`);
    let selected;
    walk(cloned, (node) => {
      if (node.local === 'symbol' && node.attrs.id === `kit-${instance.id}-${instance.primitive}`)
        selected = node;
    });
    // Definitions stay local to this instance. Root inherited presentation values survive.
    const inherited = Object.fromEntries(
      Object.entries(cloned.attrs).filter(
        ([key]) =>
          ![
            'id',
            'viewBox',
            'width',
            'height',
            'aria-labelledby',
            'aria-describedby',
            'aria-label',
          ].includes(key),
      ),
    );
    const box = selected.attrs.viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    output.children.push({
      name: 'g',
      attrs: inherited,
      children: [
        {
          name: 'defs',
          attrs: cloned.attrs.id ? { id: cloned.attrs.id } : {},
          children: cloned.children,
        },
        {
          name: 'svg',
          attrs: { ...attrs, viewBox: `0 0 ${box[2]} ${box[3]}` },
          children: [
            {
              name: 'use',
              attrs: {
                href: `#${selected.attrs.id}`,
                width: String(box[2]),
                height: String(box[3]),
              },
              children: [],
            },
          ],
        },
      ],
    });
  }
  const result = serialize(output),
    errors = [];
  if (Buffer.byteLength(result) > 16 * 1024 * 1024)
    throw new Error('Materialized SVG exceeds 16 MiB.');
  validateSvg(result, 'materialized SVG', errors, []);
  if (errors.length) throw new Error(errors.join('\n'));
  return result;
}
