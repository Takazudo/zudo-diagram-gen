import { parseArgs } from 'node:util';
import { lstat, readFile } from 'node:fs/promises';

export const EXIT_CODES = {
  VALIDATION_FAILED: 1,
  INCOMPLETE_PROJECT: 1,
  STALE_INPUT: 1,
  INVALID_ARGUMENT: 2,
  UNSUPPORTED_VERSION: 2,
  CAPTURE_UNAVAILABLE: 3,
  RESOURCE_UNSAFE: 4,
  OUTPUT_CONFLICT: 4,
  IO_ERROR: 4,
  CANCELLED: 130,
};
export function argumentError(message) {
  return Object.assign(new Error(message), { code: 'INVALID_ARGUMENT' });
}
export function machineRequested(args) {
  return args.some((arg) => /^--json(?:=|$)/.test(arg) || arg.startsWith('--json-version'));
}
export function parseOptions(args, options) {
  const parsed = parseArgs({ args, options, allowPositionals: true, tokens: true });
  const seen = new Set();
  for (const token of parsed.tokens) {
    if (token.kind !== 'option') continue;
    if (seen.has(token.name))
      throw argumentError(`Option --${token.name} was supplied more than once.`);
    seen.add(token.name);
    if (typeof token.value === 'string' && !token.value.trim())
      throw argumentError(`Option --${token.name} needs a nonempty value.`);
  }
  if (parsed.values['json-version'] !== undefined && parsed.values['json-version'] !== '1')
    throw Object.assign(new Error('Only --json-version 1 is supported.'), {
      code: 'UNSUPPORTED_VERSION',
    });
  return { positionals: parsed.positionals, options: parsed.values };
}
/** Resource and usage failures must not be hidden behind an earlier partial-acceptance diagnostic. */
export function diagnosticExitCode(errors) {
  const codes = errors.map((error) => EXIT_CODES[error.code] ?? 1);
  return [130, 4, 2, 3, 1].find((code) => codes.includes(code)) ?? 0;
}
export function errorDiagnostics(error) {
  return Array.isArray(error.diagnostics) && error.diagnostics.length
    ? error.diagnostics.map(({ code, message, path }) => ({
        code,
        message,
        ...(path !== undefined ? { path } : {}),
      }))
    : [{ code: errorCode(error), message: error.message }];
}
export function errorCode(error) {
  if (Object.hasOwn(EXIT_CODES, error.code)) return error.code;
  if (error.code?.startsWith('ERR_PARSE_ARGS')) return 'INVALID_ARGUMENT';
  if (Array.isArray(error.diagnostics) && error.diagnostics.length) {
    const exit = diagnosticExitCode(error.diagnostics);
    return (
      error.diagnostics.find((item) => EXIT_CODES[item.code] === exit)?.code ?? 'VALIDATION_FAILED'
    );
  }
  if (
    error.errors ||
    error.diagnostics ||
    error instanceof SyntaxError ||
    error instanceof TypeError
  )
    return 'VALIDATION_FAILED';
  return 'IO_ERROR';
}
export function envelope(command, data, { errors = [], warnings = [] } = {}) {
  const result = { schemaVersion: 1, command, ok: errors.length === 0, data, errors, warnings };
  console.log(JSON.stringify(result));
  process.exitCode = diagnosticExitCode(errors);
  return result;
}
export function reportError(command, error, machine, legacy = false, data = null) {
  const errors = errorDiagnostics(error);
  if (machine) envelope(command, data, { errors });
  else console.error(`diagram-gen: ${error.message}`);
  process.exitCode = legacy ? 1 : diagnosticExitCode(errors);
}
/** Read explicit caller inputs before mutating anything; refuse aliases and oversized resources. */
export async function readInput(file, { json = false } = {}) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 1024 * 1024)
    throw Object.assign(new Error('Input must be a regular file no larger than 1 MiB.'), {
      code: 'RESOURCE_UNSAFE',
    });
  const bytes = await readFile(file);
  if (bytes.length > 1024 * 1024)
    throw Object.assign(new Error('Input grew beyond 1 MiB.'), { code: 'RESOURCE_UNSAFE' });
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    throw Object.assign(new Error('Input must contain valid UTF-8.'), { code: 'RESOURCE_UNSAFE' });
  }
  return json ? JSON.parse(text) : text;
}
