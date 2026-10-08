import { machineRequested, parseOptions, readInput } from './command-contract.mjs';
import { lockProjectStyle, adoptProjectStyle } from './style.mjs';
export async function runProjectCommand(args) {
  if (args[0] !== 'project') return false;
  const json = machineRequested(args),
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
    const parsed = parseOptions(args.slice(2), {
      revision: { type: 'string' },
      json: { type: 'boolean' },
      ...(args[1] === 'lock'
        ? { tone: { type: 'string' }, palette: { type: 'string' }, selection: { type: 'string' } }
        : {}),
    });
    const values = parsed.options;
    if (
      parsed.positionals.length !== 1 ||
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
            palette: await readInput(values.palette, { json: true }),
            selection: await readInput(values.selection, { json: true }),
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
