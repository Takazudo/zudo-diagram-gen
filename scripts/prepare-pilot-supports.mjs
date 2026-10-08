/** Local preparation SVGs only: no browser, trial authoring or production materialization. */
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashBytes } from '../packages/diagram-gen/src/tone-context.mjs';
const repo = fileURLToPath(new URL('../', import.meta.url));
const evaluation = path.join(repo, 'docs/agent-first/evaluation');
export const SUPPORT_LAYOUTS = Object.freeze({
  'paper-layers': {
    full: { id: 'paper-assembly', width: 200, height: 120, labelX: 131, labelY: 61 },
    wide: { id: 'paper-assembly-wide', width: 300, height: 100, labelX: 188, labelY: 52 },
  },
  'pencil-notebook': {
    full: { id: 'pencil-panel', width: 200, height: 120, labelX: 131, labelY: 61 },
    wide: { id: 'pencil-panel-wide', width: 300, height: 100, labelX: 188, labelY: 52 },
  },
});
const labels = { single: ['確認待ち'], wrapped: ['参加申込内容の', '確認・連絡担当'] };
function applyRoles(svg, colors) {
  return svg.replace(/<[^>]+>/g, (tag) => {
    for (const kind of ['fill', 'stroke']) {
      const role = tag.match(new RegExp(`data-palette-${kind}="([A-Za-z]+)"`))?.[1];
      if (!role) continue;
      if (!colors[role]) throw new Error(`Unknown preparation palette role ${role}.`);
      tag = tag.replace(new RegExp(`(?<![\\w-])${kind}="[^"]*"`), `${kind}="${colors[role]}"`);
    }
    return tag;
  });
}
export async function preparePilotSupports(out, { tone: selectedTone } = {}) {
  if (selectedTone && !Object.hasOwn(SUPPORT_LAYOUTS, selectedTone))
    throw new Error(`Unknown preparation tone ${selectedTone}.`);
  await fs.mkdir(out, { recursive: true });
  const inputs = JSON.parse(await fs.readFile(path.join(evaluation, 'inputs.json'), 'utf8'));
  const palette = JSON.parse(await fs.readFile(path.join(evaluation, inputs.palette), 'utf8'));
  const records = [];
  for (const [tone, layouts] of Object.entries(SUPPORT_LAYOUTS)) {
    if (selectedTone && tone !== selectedTone) continue;
    const kit = await fs.readFile(
      path.join(repo, 'packages/diagram-gen/tones', tone, 'kit.svg'),
      'utf8',
    );
    const scheme = JSON.parse(
      await fs.readFile(path.join(repo, 'packages/diagram-gen/tones', tone, 'scheme.json'), 'utf8'),
    );
    const defs = kit.match(/<defs>([\s\S]*?)<\/defs>/)?.[1];
    if (!defs) throw new Error(`${tone}: missing authored definitions.`);
    for (const theme of ['light', 'dark'])
      for (const brief of inputs.briefs) {
        const placement = JSON.parse(
          await fs.readFile(path.join(evaluation, brief.placement), 'utf8'),
        );
        const { width, height } = placement.slot;
        const layout = width / height >= 2 ? layouts.wide : layouts.full;
        const scale = Math.min((width - 48) / layout.width, (height - 72) / layout.height);
        const ox = (width - layout.width * scale) / 2;
        const oy = (height - layout.height * scale) / 2;
        for (const [labelCase, lines] of Object.entries(labels)) {
          const cx = ox + layout.labelX * scale;
          const cy = oy + layout.labelY * scale;
          const text = lines
            .map(
              (line, i) =>
                `<text x="${cx}" y="${cy + 6 + (i - (lines.length - 1) / 2) * 22}">${line}</text>`,
            )
            .join('');
          const svg = applyRoles(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><title>pilot-3 support preparation only</title><defs>${defs}</defs><rect width="${width}" height="${height}" fill="${palette[theme].surface}"/><use href="#${layout.id}" x="${ox}" y="${oy}" width="${layout.width * scale}" height="${layout.height * scale}"/><g font-family="Noto Sans CJK JP, sans-serif" font-size="18" font-weight="600" text-anchor="middle" fill="${palette[theme].ink}">${text}</g></svg>`,
            palette[theme],
          );
          const file = `${tone}-${theme}-${brief.id}-${labelCase}.svg`;
          await fs.writeFile(path.join(out, file), svg);
          records.push({
            tone,
            toneRevision: scheme.toneRevision,
            theme,
            brief: brief.id,
            labelCase,
            support: layout.id,
            width,
            height,
            kitSha256: hashBytes(kit),
            svg: file,
            svgSha256: hashBytes(svg),
            actuallyInspected: false,
          });
        }
      }
  }
  await fs.writeFile(
    path.join(out, 'manifest.json'),
    JSON.stringify(
      { purpose: 'support preparation only; no pilot or visual gate acceptance', records },
      null,
      2,
    ) + '\n',
  );
  return records;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--out', '--tone'].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--') ||
      options.has(args[i])
    )
      throw new Error(
        'Usage: node scripts/prepare-pilot-supports.mjs --out DIRECTORY [--tone TONE]',
      );
    options.set(args[i], args[i + 1]);
  }
  if (!options.has('--out'))
    throw new Error('Usage: node scripts/prepare-pilot-supports.mjs --out DIRECTORY [--tone TONE]');
  const records = await preparePilotSupports(path.resolve(options.get('--out')), {
    tone: options.get('--tone'),
  });
  console.log(
    `${records.length} preparation SVGs authored; coordinator capture and inspection required.`,
  );
}
