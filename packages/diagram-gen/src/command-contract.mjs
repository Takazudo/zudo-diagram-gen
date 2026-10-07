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
export function errorCode(error) {
  if (Object.hasOwn(EXIT_CODES, error.code)) return error.code;
  if (error.code?.startsWith('ERR_PARSE_ARGS')) return 'INVALID_ARGUMENT';
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
  process.exitCode = errors.length ? (EXIT_CODES[errors[0].code] ?? 1) : 0;
  return result;
}
export function reportError(command, error, machine, legacy = false, data = null) {
  const code = errorCode(error);
  if (machine) envelope(command, data, { errors: [{ code, message: error.message }] });
  else console.error(`diagram-gen: ${error.message}`);
  process.exitCode = legacy ? 1 : EXIT_CODES[code];
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
