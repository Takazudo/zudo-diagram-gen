import { parseArgs } from 'node:util';
import { readFile, lstat } from 'node:fs/promises';
import { lockProjectStyle, adoptProjectStyle } from './style.mjs';
async function input(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 1024 * 1024)
    throw Object.assign(
      new Error('Selection/palette must be regular JSON files no larger than 1 MiB.'),
      { code: 'RESOURCE_UNSAFE' },
    );
  const bytes = await readFile(file);
  if (bytes.length > 1024 * 1024)
    throw Object.assign(new Error('JSON input grew beyond 1 MiB.'), { code: 'RESOURCE_UNSAFE' });
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''));
}
export async function runProjectCommand(args) {
  if (args[0] !== 'project') return false;
  const json = args.includes('--json'),
    command = `project ${args[1] ?? ''}`;
  const exits = {
    INVALID_ARGUMENT: 2,
    UNSUPPORTED_VERSION: 2,
    VALIDATION_FAILED: 1,
    STALE_INPUT: 1,
    OUTPUT_CONFLICT: 4,
    RESOURCE_UNSAFE: 4,
    IO_ERROR: 4,
  };
  try {
    if (!['lock', 'adopt'].includes(args[1]))
      throw Object.assign(new Error('Expected project lock or project adopt.'), {
        code: 'INVALID_ARGUMENT',
      });
    const parsed = parseArgs({
      args: args.slice(2),
      allowPositionals: true,
      tokens: true,
      options: {
        revision: { type: 'string' },
        json: { type: 'boolean' },
        ...(args[1] === 'lock'
          ? { tone: { type: 'string' }, palette: { type: 'string' }, selection: { type: 'string' } }
          : {}),
      },
    });
    const names = parsed.tokens
      .filter((token) => token.kind === 'option')
      .map((token) => token.name);
    const values = parsed.values;
    if (
      parsed.positionals.length !== 1 ||
      new Set(names).size !== names.length ||
      !values.revision ||
      (args[1] === 'lock' && (!values.tone || !values.palette || !values.selection))
    )
      throw Object.assign(
        new Error(
          'Supply one project directory, --revision and (for lock) --tone --palette --selection; duplicate options are rejected.',
        ),
        { code: 'INVALID_ARGUMENT' },
      );
    const root = parsed.positionals[0];
    const data =
      args[1] === 'lock'
        ? await lockProjectStyle(root, {
            revision: values.revision,
            toneId: values.tone,
            palette: await input(values.palette),
            selection: await input(values.selection),
          })
        : await adoptProjectStyle(root, { revision: values.revision });
    if (json)
      console.log(
        JSON.stringify({ schemaVersion: 1, command, ok: true, data, errors: [], warnings: [] }),
      );
    else
      console.log(
        `Style ${data.reference.revision} ${data.adopted ? 'adopted' : 'created; explicit adoption required'} (${data.selectionPurpose} selection).`,
      );
    process.exitCode = 0;
  } catch (error) {
    const code = exits[error.code]
      ? error.code
      : error.code?.startsWith('ERR_PARSE_ARGS')
        ? 'INVALID_ARGUMENT'
        : error.code === undefined || error instanceof SyntaxError || error.errors
          ? 'VALIDATION_FAILED'
          : 'IO_ERROR';
    if (json)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          command,
          ok: false,
          data: null,
          errors: [{ code, message: error.message }],
          warnings: [],
        }),
      );
    else console.error(`diagram-gen: ${error.message}`);
    process.exitCode = exits[code];
  }
  return true;
}
