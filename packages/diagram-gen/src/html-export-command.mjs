import { machineRequested, parseOptions, envelope, reportError } from './command-contract.mjs';
import { exportHtml } from './html-export.mjs';

export async function runHtmlExportCommand(args) {
  if (args[0] !== 'export-html') return false;
  const machine = machineRequested(args);
  try {
    const parsed = parseOptions(args.slice(1), {
      out: { type: 'string' },
      force: { type: 'boolean' },
      json: { type: 'boolean' },
    });
    if (!parsed.options.out || parsed.positionals.length > 1) {
      const error = new Error('Usage: export-html [directory] --out <file> [--force] [--json]');
      error.code = 'INVALID_ARGUMENT';
      throw error;
    }
    const result = await exportHtml(parsed.positionals[0] || '.', {
      output: parsed.options.out,
      force: parsed.options.force ?? false,
    });
    if (machine) envelope('export-html', result, { errors: result.diagnostics });
    else {
      console.log(`Exported ${result.candidates} candidates to ${result.output}`);
      if (!result.ok) process.exitCode = 1;
    }
  } catch (error) {
    reportError('export-html', error, machine, !machine);
  }
  return true;
}
