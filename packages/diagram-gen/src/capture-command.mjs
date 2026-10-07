import { parseArgs } from 'node:util';
import { captureCandidate } from './capture.mjs';
const exits = {
  VALIDATION_FAILED: 1,
  INVALID_ARGUMENT: 2,
  UNSUPPORTED_VERSION: 2,
  CAPTURE_UNAVAILABLE: 3,
  RESOURCE_UNSAFE: 4,
  OUTPUT_CONFLICT: 4,
  IO_ERROR: 4,
  CANCELLED: 130,
};
export async function runCaptureCommand(args) {
  if (args[0] !== 'capture') return false;
  const json = args.includes('--json');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const parsed = parseArgs({
      args: args.slice(1),
      allowPositionals: true,
      tokens: true,
      options: {
        session: { type: 'string' },
        placement: { type: 'string' },
        out: { type: 'string' },
        theme: { type: 'string' },
        dpr: { type: 'string' },
        crop: { type: 'string' },
        'timeout-ms': { type: 'string' },
        'resource-root': { type: 'string' },
        'browser-executable': { type: 'string' },
        force: { type: 'boolean' },
        json: { type: 'boolean' },
      },
    });
    const names = parsed.tokens.filter((t) => t.kind === 'option').map((t) => t.name);
    if (
      new Set(names).size !== names.length ||
      parsed.positionals.length !== 1 ||
      !parsed.values.session ||
      !parsed.values.out
    )
      throw Object.assign(
        new Error(
          'Usage: capture <candidate-id> --session <dir> --out <png> [--placement <file>] [--json]; duplicate options are rejected.',
        ),
        { code: 'INVALID_ARGUMENT' },
      );
    const v = parsed.values;
    const data = await captureCandidate(v.session, parsed.positionals[0], {
      resourceRoot: v['resource-root'],
      placement: v.placement,
      output: v.out,
      theme: v.theme,
      dpr: v.dpr === undefined ? undefined : Number(v.dpr),
      crop: v.crop,
      timeoutMs: v['timeout-ms'] === undefined ? undefined : Number(v['timeout-ms']),
      browserExecutablePath: v['browser-executable'],
      force: v.force,
      signal: controller.signal,
    });
    if (json)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          command: 'capture',
          ok: true,
          data,
          errors: [],
          warnings: [
            { code: 'VISUAL_INSPECTION_REQUIRED', message: data.provenance.limitations[0] },
          ],
        }),
      );
    else
      console.log(
        `Captured ${parsed.positionals[0]} to ${data.output}; visual inspection remains required.`,
      );
    process.exitCode = 0;
  } catch (error) {
    const code = exits[error.code]
      ? error.code
      : error.code?.startsWith('ERR_PARSE_ARGS')
        ? 'INVALID_ARGUMENT'
        : 'IO_ERROR';
    if (json)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          command: 'capture',
          ok: false,
          data: null,
          errors: [{ code, message: error.message }],
          warnings: [],
        }),
      );
    else console.error(`diagram-gen: ${error.message}`);
    process.exitCode = exits[code];
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
  return true;
}
