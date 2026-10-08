import {
  argumentError,
  envelope,
  machineRequested,
  parseOptions,
  reportError,
} from './command-contract.mjs';
import { isProject, validateProject } from './project.mjs';
import { resolveToneContext } from './tone-context.mjs';
import { exportCandidate, loadToneCatalog, validateSession } from './model.mjs';

const help = {
  check: 'Usage: zudo-diagram-gen check [directory] [--json]',
  export:
    'Usage: zudo-diagram-gen export <candidate-id> --session <directory> --theme light|dark --out <file>',
  tones:
    'Usage: zudo-diagram-gen tones list [--json]\n       zudo-diagram-gen tones show <id> [--json]',
};

/** Handle data commands. Rendering/server commands are dispatched by the CLI. */
export async function runDataCommand(args) {
  const [command, ...rest] = args;
  if (!Object.hasOwn(help, command)) return false;
  if (rest.some((argument) => ['--help', '-h'].includes(argument))) {
    console.log(help[command]);
    return true;
  }
  const versioned = rest.some((argument) => argument.startsWith('--json-version'));
  const machine = machineRequested(rest);
  try {
    if (command === 'check') {
      const { positionals, options } = parseOptions(rest, {
        json: { type: 'boolean' },
        'json-version': { type: 'string' },
      });
      if (positionals.length > 1) throw argumentError(help.check);
      const directory = positionals[0] ?? process.cwd();
      const project = await isProject(directory);
      const result = project ? await validateProject(directory) : await validateSession(directory);
      if (versioned)
        envelope(command, result, {
          errors: result.ok
            ? []
            : project
              ? result.diagnostics
              : [
                  {
                    code: 'VALIDATION_FAILED',
                    message: result.errors.join('\n'),
                  },
                ],
          warnings: result.warnings.map((message) => ({ code: 'VALIDATION_WARNING', message })),
        });
      else if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        if (project)
          console.log(
            `${result.ok ? 'Valid' : 'Invalid'} project: ${result.summary.validSessions}/${result.summary.sessions} valid session(s).`,
          );
        else
          console.log(
            `${result.ok ? 'Valid session' : 'Invalid session'}: ${result.summary.rounds} round(s), ${result.summary.candidates} candidate(s), ${result.summary.lightAssets} light SVG(s), ${result.summary.darkAssets} dark SVG(s).`,
          );
        for (const error of result.errors) console.log(`Error: ${error}`);
        for (const warning of result.warnings) console.log(`Warning: ${warning}`);
      }
      if (!result.ok && !versioned) process.exitCode = 1;
      return true;
    }
    if (command === 'export') {
      const { positionals, options } = parseOptions(rest, {
        session: { type: 'string' },
        theme: { type: 'string' },
        out: { type: 'string' },
        'resource-root': { type: 'string' },
        json: { type: 'boolean' },
        'json-version': { type: 'string' },
      });
      if (positionals.length !== 1 || !options.out) throw argumentError(help.export);
      if (options.theme !== undefined && !['light', 'dark'].includes(options.theme))
        throw argumentError('--theme must be light or dark.');
      const result = await exportCandidate(options.session ?? process.cwd(), positionals[0], {
        theme: options.theme ?? 'light',
        output: options.out,
        resourceRoot: options['resource-root'],
      });
      if (machine) envelope(command, result);
      else
        console.log(
          `Exported ${result.candidateId} (${result.theme}), ${result.bytes} bytes, to ${result.output}`,
        );
      return true;
    }
    const { positionals, options } = parseOptions(rest, {
      json: { type: 'boolean' },
      'json-version': { type: 'string' },
    });
    const [action, toneId] = positionals;
    if (
      !['list', 'show'].includes(action) ||
      (action === 'list' && positionals.length !== 1) ||
      (action === 'show' && positionals.length !== 2)
    )
      throw argumentError(help.tones);
    const catalog = await loadToneCatalog();
    if (action === 'list') {
      if (versioned)
        envelope('tones list', {
          version: catalog.session.toneCollectionVersion,
          tones: catalog.tones.map(({ context: _context, ...tone }) => tone),
        });
      else if (options.json)
        console.log(
          JSON.stringify(
            {
              version: catalog.session.toneCollectionVersion,
              tones: catalog.tones.map(({ context: _context, ...tone }) => tone),
            },
            null,
            2,
          ),
        );
      else
        for (const tone of catalog.tones)
          console.log(
            `${String(tone.number).padStart(2, '0')}  ${tone.id} — ${tone.name}\n    ${tone.summary}`,
          );
    } else {
      const tone = catalog.tones.find((item) => item.id === toneId);
      if (!tone)
        throw argumentError(
          `Unknown tone ${JSON.stringify(toneId)}. Run "zudo-diagram-gen tones list" to see available IDs.`,
        );
      if (versioned) envelope('tones show', await resolveToneContext(toneId));
      else if (options.json) console.log(JSON.stringify(await resolveToneContext(toneId), null, 2));
      else {
        console.log(
          `${tone.name} (${tone.id})\nFamily: ${tone.family}\n\n${tone.summary}\n\nDrawing recipe:\n${tone.recipe.map((item) => `- ${item}`).join('\n')}\n\nGood for:\n${tone.goodFor.map((item) => `- ${item}`).join('\n')}\n\nAt small sizes:\n${tone.smallSizeNotes}\n\nExamples relative to the installed package's tones directory:\n- Light: ${tone.referenceFiles.light}\n- Dark: ${tone.referenceFiles.dark}\n\nUse --json to include both complete SVG examples.`,
        );
        if (tone.sourceReferences?.length)
          console.log(
            `\nReferences:\n${tone.sourceReferences.map((item) => `- ${item.title}: ${item.url}`).join('\n')}`,
          );
      }
    }
    return true;
  } catch (error) {
    reportError(
      command === 'tones' ? `tones ${rest[0] ?? ''}` : command,
      error,
      versioned || (command === 'export' && machine),
      !versioned && !(command === 'export' && machine),
    );
    return true;
  }
}
