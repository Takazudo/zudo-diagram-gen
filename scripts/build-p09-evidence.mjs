import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadToneCatalog, validateSvg } from '../packages/diagram-gen/src/model.mjs';
import { hashBytes, KIT_PRIMITIVES } from '../packages/diagram-gen/src/tone-context.mjs';
import { materializeKit, resolvePalette } from '../packages/diagram-gen/src/materialize.mjs';
import { compileAuthoringTemplate } from './build-rollout-kits.mjs';

const toneRootDefault = fileURLToPath(new URL('../packages/diagram-gen/tones/', import.meta.url));
const alternate = {
  light: {
    ink: '#23343F',
    surface: '#FAF8EE',
    border: '#758A90',
    accent: '#1D706F',
    deep: '#CCD9BD',
    warning: '#A74736',
  },
  dark: {
    ink: '#F4F1DF',
    surface: '#15282E',
    border: '#7E9698',
    accent: '#88D6CB',
    deep: '#486451',
    warning: '#F1A58C',
  },
};
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const pilots = new Set(['fine-outline', 'soft-fill', 'paper-layers', 'pencil-notebook']);

export function pilotEvidenceComposition() {
  const template =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400"><title>予約状況の確認</title><rect width="720" height="400" fill="{{palette:surface}}" data-palette-fill="surface"/><text x="24" y="45" font-family="{{font:label}}" font-size="{{scheme:typography.label.fontSize}}" fill="{{palette:ink}}" data-palette-fill="ink">予約状況の確認と次の手続き</text><text x="120" y="285" text-anchor="middle" data-for-instance="person-a person-b" font-family="{{font:label}}" font-size="{{scheme:typography.label.fontSize}}" fill="{{palette:ink}}" data-palette-fill="ink">利用者</text><text x="330" y="285" text-anchor="middle" data-for-instance="seat" font-family="{{font:label}}" font-size="{{scheme:typography.label.fontSize}}" fill="{{palette:ink}}" data-palette-fill="ink">空席</text><text x="600" y="285" text-anchor="middle" data-for-instance="pending" font-family="{{font:label}}" font-size="{{scheme:typography.label.fontSize}}" fill="{{palette:ink}}" data-palette-fill="ink">確認待ち</text></svg>';
  const manifest = {
    schemaVersion: 1,
    width: 720,
    height: 400,
    title: '予約状況の確認',
    description:
      'Frozen pilot production recheck; two users, unoccupied seat, pending confirmation.',
    instances: [
      { id: 'person-a', primitive: 'person', x: 30, y: 95, width: 90, height: 135 },
      { id: 'person-b', primitive: 'person', x: 120, y: 95, width: 90, height: 135 },
      { id: 'seat', primitive: 'empty-seat', x: 270, y: 95, width: 120, height: 135 },
      { id: 'pending', primitive: 'clock', x: 540, y: 95, width: 120, height: 135 },
      { id: 'route-a', primitive: 'arrow', x: 215, y: 125, width: 50, height: 60 },
      { id: 'route-b', primitive: 'arrow', x: 420, y: 125, width: 90, height: 60 },
    ],
  };
  return { template, manifest };
}

const independentTones = new Set([
  'contour-wash',
  'luminous-glass',
  'editorial-serif',
  'isometric-solid',
  'isometric-wire',
  'risograph-duo',
  'halftone-manual',
  'marker-workshop',
  'chalkboard',
  'cut-paper',
  'paper-layers',
  'pencil-notebook',
  'offset-blocks',
]);
const sha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const imageHash = (review) => review.pngHash ?? review.imageHash ?? review.sha256;
const reviewName = (review) => review.name ?? path.basename(review.path ?? '', '.png');
const zeroFacts = (review) => {
  const counts = review.facts
    ? ['inventedFacts', 'omissions', 'reversedRelationships', 'lockViolations'].map(
        (key) => review.facts[key],
      )
    : [review.factualErrors ?? review.factsErrors];
  return (
    counts.every((count) => count === 0) &&
    ['factualOmissions', 'inventedFacts'].every(
      (key) => review[key] === undefined || review[key] === 0,
    )
  );
};
const passingReview = (review, independent) => {
  const decision = review.decision ?? review.verdict;
  const passed = independent
    ? decision === 'pass'
    : (decision === undefined && review.gatePass === true) ||
      decision === 'pass' ||
      decision === 'pass for shown placement/palette only';
  const opened = independent
    ? review.actualOpened === true
    : review.actuallyOpened === true ||
      review.reviewer === 'root-primary' ||
      (typeof review.method === 'string' && review.method.length > 0);
  return (
    passed &&
    opened &&
    zeroFacts(review) &&
    review.readability >= 3 &&
    review.character >= 3 &&
    (independent || (review.consistency ?? review.withinToneConsistency) >= 3) &&
    typeof (review.viewedAt ?? review.inspectedAt ?? review.inspectionCompletedAt) === 'string'
  );
};

/** Link evaluator records to exact current SVG bytes and their captured PNG, never a tone-wide pass flag. */
export function evaluateVisualAcceptance(assets, evidence) {
  const requiresIndependent = independentTones.has(assets[0]?.toneId);
  const matches = assets.map((asset) => {
    const captures = (evidence.captures ?? []).filter((row) => row.name === asset.name);
    const primary = (evidence.primary ?? []).filter((row) => reviewName(row) === asset.name);
    const secondary = (evidence.independentSecondPass ?? []).filter(
      (row) => reviewName(row) === asset.name,
    );
    const capture = captures[0];
    const exactCapture =
      captures.length === 1 &&
      capture.assetHash === asset.assetHash &&
      capture.toneId === asset.toneId &&
      capture.theme === asset.theme &&
      capture.paletteMode === asset.paletteMode &&
      capture.kind === asset.kind &&
      capture.target?.width === asset.target.width &&
      capture.target?.height === asset.target.height &&
      ['pngHash', 'placementHash', 'captureHash'].every((key) => sha256(capture[key])) &&
      capture.captureFonts?.length > 0 &&
      capture.captureFonts.every((font) => font.ready === true);
    const exactReview = (rows, independent) =>
      exactCapture &&
      rows.length === 1 &&
      imageHash(rows[0]) === capture.pngHash &&
      (rows[0].assetHash === asset.assetHash ||
        (!rows[0].assetHash && (independent || rows[0].captureManifestHashMatched === true))) &&
      passingReview(rows[0], independent);
    const primaryPass = exactReview(primary, false);
    const independentPass = requiresIndependent ? exactReview(secondary, true) : null;
    return {
      name: asset.name,
      assetHash: asset.assetHash,
      pngHash: exactCapture ? capture.pngHash : null,
      capturePackProvenance: exactCapture
        ? Object.fromEntries(
            ['toneRevision', 'schemeHash', 'kitHash', 'contextHash'].map((key) => [
              key,
              capture[key],
            ]),
          )
        : null,
      currentPackProvenanceMatchesCapture:
        exactCapture &&
        ['toneRevision', 'schemeHash', 'kitHash', 'contextHash'].every(
          (key) => capture[key] === asset[key],
        ),
      primary: primaryPass ? 'accepted' : 'pending or stale',
      independent: requiresIndependent
        ? independentPass
          ? 'accepted'
          : 'pending or stale'
        : 'not required',
    };
  });
  const complete =
    assets.length === 8 &&
    new Set(assets.map(({ name }) => name)).size === 8 &&
    ['composition', 'kit'].every((kind) =>
      ['native', 'alternate'].every((paletteMode) =>
        ['light', 'dark'].every((theme) =>
          assets.some(
            (row) => row.kind === kind && row.paletteMode === paletteMode && row.theme === theme,
          ),
        ),
      ),
    );
  return {
    accepted:
      evidence.schemaVersion === 1 &&
      complete &&
      matches.every((row) => row.primary === 'accepted' && row.independent !== 'pending or stale'),
    independentRequired: requiresIndependent,
    records: matches,
  };
}

/** Preparation only. Actual P05 capture and separate inspection must follow. */
export async function buildP09Evidence({ output, toneRoot = toneRootDefault, tones } = {}) {
  if (!output) throw new Error('An explicit evidence output directory is required.');
  const catalog = await loadToneCatalog({ toneRoot, requireComplete: false });
  const selected = tones ?? catalog.tones.map(({ id }) => id);
  if (
    new Set(selected).size !== selected.length ||
    selected.some((id) => !catalog.tones.some((t) => t.id === id))
  )
    throw new Error('Select unique catalog tone IDs.');
  await fs.mkdir(output, { recursive: true });
  const records = [];
  for (const id of selected) {
    const tone = catalog.tones.find((tone) => tone.id === id);
    const { scheme, kit, hashes } = tone.context;
    if (!scheme || !kit) throw new Error(`${id}: evidence needs a complete authored pack.`);
    let template, manifest;
    if (pilots.has(id)) {
      // Frozen accepted packs are rechecked through the production helper; do not edit them.
      ({ template, manifest } = pilotEvidenceComposition());
    } else {
      template = await fs.readFile(path.join(toneRoot, id, 'composition.template.svg'), 'utf8');
      manifest = JSON.parse(
        await fs.readFile(path.join(toneRoot, id, 'composition.instances.json'), 'utf8'),
      );
    }
    if (
      manifest.schemaVersion !== 1 ||
      !Number.isFinite(manifest.width) ||
      !Number.isFinite(manifest.height) ||
      manifest.width <= 0 ||
      manifest.height <= 0 ||
      !Array.isArray(manifest.instances)
    )
      throw new Error(`${id}: malformed composition manifest.`);
    const canvas = compileAuthoringTemplate(template, scheme);
    const viewBox = canvas
      .match(/<svg\b[^>]*\bviewBox=["']([^"']+)["']/)?.[1]
      ?.trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      !viewBox ||
      viewBox.length !== 4 ||
      viewBox[2] !== manifest.width ||
      viewBox[3] !== manifest.height
    )
      throw new Error(`${id}: composition dimensions disagree with viewBox.`);
    const gridInstances = KIT_PRIMITIVES.filter((p) =>
      kit.primitives.some(({ id }) => id === p),
    ).flatMap((primitive, index) =>
      [0, 1].map((row) => ({
        id: `${primitive}-${row}`,
        primitive,
        x: 18 + index * 100,
        y: 75 + row * 145,
        width: 78,
        height: 86,
      })),
    );
    const grid = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400"><title>${escape(id)} primitive inventory, repeated twice</title><rect width="720" height="400" fill="{{palette:surface}}" data-palette-fill="surface"/><text x="18" y="40" font-family="{{font:label}}" font-size="{{scheme:typography.label.fontSize}}" fill="{{palette:ink}}" data-palette-fill="ink">基本形の繰り返しと配色確認</text>${KIT_PRIMITIVES.filter(
      (p) => kit.primitives.some(({ id }) => id === p),
    )
      .map(
        (p, i) =>
          `<text x="${18 + i * 100}" y="365" font-family="{{font:detail}}" font-size="24" fill="{{palette:ink}}" data-palette-fill="ink">${{ person: '人', pin: '位置', 'slot-card': '枠', 'empty-seat': '空席', arrow: '矢印', check: '完了', clock: '待機' }[p]}</text>`,
      )
      .join('')}</svg>`;
    for (const paletteMode of ['native', 'alternate'])
      for (const theme of ['light', 'dark'])
        for (const kind of ['composition', 'kit']) {
          const instances = kind === 'composition' ? manifest.instances : gridInstances;
          const palette = resolvePalette(
            scheme,
            paletteMode === 'alternate' ? alternate : undefined,
          );
          const svg = materializeKit(kit.text, {
            scheme,
            palette,
            theme,
            instances,
            svg: kind === 'composition' ? canvas : compileAuthoringTemplate(grid, scheme),
          });
          const errors = [];
          validateSvg(svg, `${id}/${kind}`, errors, []);
          if (errors.length) throw new Error(errors.join('\n'));
          const name = `${id}-${kind}-${paletteMode}-${theme}`;
          const directory = path.join(output, name);
          await fs.mkdir(path.join(directory, 'rounds/r01/c01'), { recursive: true });
          await fs.writeFile(
            path.join(directory, 'session.json'),
            JSON.stringify(
              {
                schemaVersion: 1,
                id: name,
                title: manifest.title,
                description: manifest.description,
                target: {
                  width: kind === 'composition' ? manifest.width : 720,
                  height: kind === 'composition' ? manifest.height : 400,
                  label: 'Declared native evidence placement',
                },
                toneCollectionVersion: catalog.session.toneCollectionVersion,
              },
              null,
              2,
            ),
          );
          await fs.writeFile(
            path.join(directory, 'brief.md'),
            `# Public P09 preparation\n\n${manifest.description}\n\nExact authored labels and facts must be inspected at declared native dimensions. Kit inventory repeats primitives twice. Native construction and palette remapping require actual inspection. No user approval.\n`,
          );
          await fs.writeFile(
            path.join(directory, 'rounds/r01/round.json'),
            JSON.stringify(
              { schemaVersion: 1, id: 'r01', title: 'Native production materialization', order: 1 },
              null,
              2,
            ),
          );
          await fs.writeFile(
            path.join(directory, 'rounds/r01/c01/candidate.json'),
            JSON.stringify(
              {
                schemaVersion: 1,
                id: 'c01',
                title: name,
                toneId: id,
                description: manifest.description,
                order: 1,
                assets: { light: 'light.svg', dark: 'dark.svg' },
                provenance: { schemeHash: hashes.schemeHash, kitHash: hashes.kitHash },
              },
              null,
              2,
            ),
          );
          for (const assetTheme of ['light', 'dark']) {
            const themed = materializeKit(kit.text, {
              scheme,
              palette,
              theme: assetTheme,
              instances,
              svg: kind === 'composition' ? canvas : compileAuthoringTemplate(grid, scheme),
            });
            await fs.writeFile(path.join(directory, `rounds/r01/c01/${assetTheme}.svg`), themed);
          }
          await fs.writeFile(
            path.join(directory, 'placement.json'),
            JSON.stringify(
              {
                schemaVersion: 1,
                frame: {
                  width: (kind === 'composition' ? manifest.width : 720) + 80,
                  height: (kind === 'composition' ? manifest.height : 400) + 80,
                  background: palette[theme].surface,
                },
                slot: {
                  x: 40,
                  y: 40,
                  width: kind === 'composition' ? manifest.width : 720,
                  height: kind === 'composition' ? manifest.height : 400,
                },
                fit: 'contain',
                fonts: [
                  ...new Set(
                    Object.values(scheme.typography).map((r) =>
                      r.fontFamily
                        .split(',')[0]
                        .trim()
                        .replace(/^['"]|['"]$/g, ''),
                    ),
                  ),
                ],
              },
              null,
              2,
            ),
          );
          records.push({
            name,
            toneId: id,
            toneRevision: scheme.toneRevision,
            collectionVersion: scheme.collectionVersion,
            ...hashes,
            sourceHash: tone.context.source.hash,
            compositionTemplateHash: hashBytes(template),
            compositionInstancesHash: hashBytes(JSON.stringify(manifest)),
            kind,
            paletteMode,
            theme,
            assetHash: hashBytes(svg),
            primitiveAlternatives: scheme.primitiveAlternatives ?? {},
            instances,
            target: {
              width: kind === 'composition' ? manifest.width : 720,
              height: kind === 'composition' ? manifest.height : 400,
            },
            fonts: Object.values(scheme.typography),
            capture: 'pending',
            inspected: false,
            limitations:
              'Structural preparation does not certify facts, character, contrast, glyph coverage or readability. Manager must capture with P05 and inspect each actual theme.',
          });
        }
  }
  const visualHistory = JSON.parse(
    await fs.readFile(
      new URL('../docs/agent-first/rollout/P09-VISUAL-REVISION-HISTORY.json', import.meta.url),
      'utf8',
    ),
  );
  const visualEvidenceBytes = await fs.readFile(
    new URL('../docs/agent-first/rollout/P09-VISUAL-EVIDENCE.json', import.meta.url),
  );
  const visualEvidence = JSON.parse(visualEvidenceBytes);
  const matrix = selected.map((toneId) => {
    const tone = catalog.tones.find(({ id }) => id === toneId);
    const assets = records.filter((r) => r.toneId === toneId);
    const acceptance = evaluateVisualAcceptance(assets, visualEvidence);
    return {
      toneId,
      toneRevision: tone.context.scheme.toneRevision,
      collectionVersion: tone.context.scheme.collectionVersion,
      ...tone.context.hashes,
      originalReferenceHashes: Object.fromEntries(
        Object.entries(catalog.candidates.find((c) => c.toneId === toneId).assets)
          .filter(([, svg]) => typeof svg === 'string')
          .map(([theme, svg]) => [theme, hashBytes(svg)]),
      ),
      compositionTemplateHash: assets[0].compositionTemplateHash,
      compositionInstancesHash: assets[0].compositionInstancesHash,
      sourceHash: tone.context.source.hash,
      recipeHash: tone.context.recipeDocument.hash,
      primitiveAlternatives: tone.context.scheme.primitiveAlternatives ?? {},
      primitives: tone.context.kit.primitives.map(({ id }) => id),
      fonts: tone.context.scheme.typography,
      placements: [
        ...new Map(assets.map(({ target }) => [JSON.stringify(target), target])).values(),
      ],
      evidenceRecords: assets.map(({ name, assetHash, theme, paletteMode, kind }) => ({
        name,
        assetHash,
        theme,
        paletteMode,
        kind,
      })),
      structuralValidation: 'passed',
      actualInspection: acceptance.accepted
        ? 'accepted for exact assets and declared placements'
        : 'pending or stale evidence',
      visualEvidence: {
        file: 'P09-VISUAL-EVIDENCE.json',
        hash: hashBytes(visualEvidenceBytes),
        artifactHead: visualEvidence.artifactHead,
        scope:
          'Exact rendered SVG/PNG assets and declared placements. Historical capture pack provenance is retained separately; current pack metadata is structurally validated, not visually recertified by hash reuse.',
        ...acceptance,
      },
      visualHistory: visualHistory.revisions.find((row) => row.toneId === toneId) ?? null,
      independentSecondPass: acceptance.independentRequired
        ? acceptance.accepted
          ? 'accepted for exact assets'
          : 'pending or stale evidence'
        : 'not required',
      limitations:
        'Acceptance is limited to exact SVG/PNG evidence and declared placements; smaller slots or changed artwork need new review. Original failures and palette atmosphere limitations remain documented.',
    };
  });
  await fs.writeFile(
    path.join(output, 'matrix.json'),
    JSON.stringify({ schemaVersion: 1, tones: matrix }, null, 2),
  );
  await fs.writeFile(
    path.join(output, 'manifest.json'),
    JSON.stringify({ schemaVersion: 1, records }, null, 2),
  );
  return records;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv[2];
  const tones = process.argv.slice(3);
  const records = await buildP09Evidence({ output, ...(tones.length ? { tones } : {}) });
  console.log(
    `${records.length} prepared assets; capture and actual inspection pending. ${path.join(output, 'manifest.json')}`,
  );
}
