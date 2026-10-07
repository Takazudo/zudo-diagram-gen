import { parseArgs } from 'node:util';
import { exportHtml } from './html-export.mjs';

export async function runHtmlExportCommand(args) {
  if (args[0] !== 'export-html') return false;
  const machine = args.includes('--json');
  try {
    const seen = new Set();
    for (const arg of args.slice(1).filter((s) => s.startsWith('--'))) {
      const flag = arg.split('=')[0];
      if (seen.has(flag)) {
        const error = new Error(`Duplicate option ${flag}.`);
        error.code = 'INVALID_ARGUMENT';
        throw error;
      }
      seen.add(flag);
    }
    const parsed = parseArgs({
      args: args.slice(1),
      allowPositionals: true,
      options: { out: { type: 'string' }, force: { type: 'boolean' }, json: { type: 'boolean' } },
    });
    if (!parsed.values.out || parsed.positionals.length > 1) {
      const error = new Error('Usage: export-html [directory] --out <file> [--force] [--json]');
      error.code = 'INVALID_ARGUMENT';
      throw error;
    }
    const result = await exportHtml(parsed.positionals[0] || '.', {
      output: parsed.values.out,
      force: parsed.values.force ?? false,
    });
    if (machine)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          command: 'export-html',
          ok: result.ok,
          data: result,
          errors: result.diagnostics,
          warnings: [],
        }),
      );
    else console.log(`Exported ${result.candidates} candidates to ${result.output}`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    const code = error.code?.startsWith('ERR_PARSE_ARGS')
      ? 'INVALID_ARGUMENT'
      : [
            'INVALID_ARGUMENT',
            'VALIDATION_FAILED',
            'INCOMPLETE_PROJECT',
            'STALE_INPUT',
            'RESOURCE_UNSAFE',
            'OUTPUT_CONFLICT',
            'IO_ERROR',
            'UNSUPPORTED_VERSION',
          ].includes(error.code)
        ? error.code
        : error.diagnostics || error.name === 'SessionValidationError'
          ? 'VALIDATION_FAILED'
          : 'IO_ERROR';
    if (machine)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          command: 'export-html',
          ok: false,
          data: null,
          errors: [{ code, message: error.message }],
          warnings: [],
        }),
      );
    else console.error(`diagram-gen: ${error.message}`);
    process.exitCode = machine
      ? ({ INVALID_ARGUMENT: 2, VALIDATION_FAILED: 1, INCOMPLETE_PROJECT: 1, STALE_INPUT: 1 }[
          code
        ] ?? 4)
      : 1;
  }
  return true;
}
