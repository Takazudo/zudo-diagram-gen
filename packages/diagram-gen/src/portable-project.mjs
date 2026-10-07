import { validateSvg } from './model.mjs';
import { validatePlacement } from '../client/placement.mjs';
import { inspectRaster } from './capture-inputs.mjs';

export const PROJECT_HTML_LIMIT = 64 * 1024 * 1024;
/** Validate embedded resources even for callers supplying normalized data directly. */
export function preparePortableProject(input, { maxBytes = PROJECT_HTML_LIMIT } = {}) {
  if (
    input?.kind !== 'project' ||
    input.schemaVersion !== 1 ||
    !input.project ||
    !Array.isArray(input.sessions) ||
    !Array.isArray(input.comparisonSets)
  )
    throw new Error('Unsupported project data.');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > PROJECT_HTML_LIMIT)
    throw new Error('Invalid portable payload limit.');
  // Bound before parsing/cloning; JSON serialization is also the exact output-data budget.
  const json = JSON.stringify(input);
  if (Buffer.byteLength(json) > maxBytes)
    throw new Error('Project HTML exceeds the 64 MiB output-data budget.');
  const data = JSON.parse(json);
  const portableDiagnostics = (items) => {
    for (const item of items ?? []) {
      // Native I/O messages can include private machine paths even though the
      // diagnostic identity is already project-relative. Keep that identity.
      item.message = item.message.replace(
        /(['"])(?:\/[^'"\n]*|[A-Za-z]:\\[^'"\n]*)\1/g,
        '$1[local source]$1',
      );
    }
  };
  portableDiagnostics(data.diagnostics);
  for (const set of data.comparisonSets) portableDiagnostics(set.diagnostics);
  for (const session of data.sessions) portableDiagnostics(session.diagnostics);
  for (const session of data.sessions) {
    if (!session.data) continue;
    if (session.data.session.id !== session.id)
      throw new Error('Project session identity mismatch.');
    const target = session.data.session.target;
    validatePlacement(session.data.placement, target);
    for (const candidate of session.data.candidates) {
      for (const [theme, svg] of Object.entries(candidate.assets)) {
        if (
          !['light', 'dark'].includes(theme) ||
          typeof svg !== 'string' ||
          Buffer.byteLength(svg) > 16 * 1024 * 1024
        )
          throw new Error('Invalid or oversized portable SVG.');
        const errors = [];
        validateSvg(svg, `${session.id}/${candidate.id}/${theme}`, errors, []);
        if (errors.length) throw new Error(errors.join('\n'));
      }
    }
    for (const image of session.data.placementImages ?? []) {
      if (!/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(image.url))
        throw new Error('Portable placement requires an embedded static raster image.');
      const bytes = Buffer.from(image.url.split(',')[1], 'base64');
      const info = inspectRaster(bytes);
      if (!image.url.startsWith(`data:${info.mime};`))
        throw new Error('Portable image MIME mismatch.');
    }
  }
  return data;
}
