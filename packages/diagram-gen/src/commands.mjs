import { exportCandidate, loadToneCatalog, validateSession } from './model.mjs';

const help = {
  check: 'Usage: zudo-diagram-gen check [directory] [--json]',
  export: 'Usage: zudo-diagram-gen export <candidate-id> --session <directory> --theme light|dark --out <file>',
  tones: 'Usage: zudo-diagram-gen tones list [--json]\n       zudo-diagram-gen tones show <id> [--json]',
};

function parse(args, allowed) {
  const positionals = [];
  const options = {};
  let positionalOnly = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--') { positionalOnly = true; continue; }
    if (positionalOnly || !argument.startsWith('-')) { positionals.push(argument); continue; }
    const match = argument.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match || !(match[1] in allowed)) throw new Error(`Unknown option ${JSON.stringify(argument)}.`);
    const [, name, inline] = match;
    if (Object.hasOwn(options, name)) throw new Error(`Option --${name} was supplied more than once.`);
    if (allowed[name] === 'boolean') {
      if (inline !== undefined) throw new Error(`Option --${name} does not accept a value.`);
      options[name] = true;
    } else {
      let value = inline;
      if (value === undefined) {
        value = args[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`Option --${name} needs a value.`);
        index += 1;
      }
      if (!value) throw new Error(`Option --${name} needs a nonempty value.`);
      options[name] = value;
    }
  }
  return { positionals, options };
}

/** Handle data commands. Rendering/server commands are dispatched by the CLI. */
export async function runDataCommand(args) {
  const [command, ...rest] = args;
  if (!Object.hasOwn(help, command)) return false;
  if (rest.some((argument) => ['--help', '-h'].includes(argument))) { console.log(help[command]); return true; }
  try {
    if (command === 'check') {
      const { positionals, options } = parse(rest, { json: 'boolean' });
      if (positionals.length > 1) throw new Error(help.check);
      const result = await validateSession(positionals[0] ?? process.cwd());
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`${result.ok ? 'Valid session' : 'Invalid session'}: ${result.summary.rounds} round(s), ${result.summary.candidates} candidate(s), ${result.summary.lightAssets} light SVG(s), ${result.summary.darkAssets} dark SVG(s).`);
        for (const error of result.errors) console.log(`Error: ${error}`);
        for (const warning of result.warnings) console.log(`Warning: ${warning}`);
      }
      if (!result.ok) process.exitCode = 1;
      return true;
    }
    if (command === 'export') {
      const { positionals, options } = parse(rest, { session: 'string', theme: 'string', out: 'string' });
      if (positionals.length !== 1 || !options.out) throw new Error(help.export);
      const result = await exportCandidate(options.session ?? process.cwd(), positionals[0], { theme: options.theme ?? 'light', output: options.out });
      console.log(`Exported ${result.candidateId} (${result.theme}), ${result.bytes} bytes, to ${result.output}`);
      return true;
    }
    const { positionals, options } = parse(rest, { json: 'boolean' });
    const [action, toneId] = positionals;
    if (!['list', 'show'].includes(action) || (action === 'list' && positionals.length !== 1) || (action === 'show' && positionals.length !== 2)) throw new Error(help.tones);
    const catalog = await loadToneCatalog();
    if (action === 'list') {
      if (options.json) console.log(JSON.stringify({ version: catalog.session.toneCollectionVersion, tones: catalog.tones }, null, 2));
      else for (const tone of catalog.tones) console.log(`${String(tone.number).padStart(2, '0')}  ${tone.id} — ${tone.name}\n    ${tone.summary}`);
    } else {
      const tone = catalog.tones.find((item) => item.id === toneId);
      if (!tone) throw new Error(`Unknown tone ${JSON.stringify(toneId)}. Run "zudo-diagram-gen tones list" to see available IDs.`);
      const candidate = catalog.candidates.find((item) => item.toneId === toneId);
      if (options.json) console.log(JSON.stringify({ ...tone, examples: candidate.assets }, null, 2));
      else {
        console.log(`${tone.name} (${tone.id})\nFamily: ${tone.family}\n\n${tone.summary}\n\nDrawing recipe:\n${tone.recipe.map((item) => `- ${item}`).join('\n')}\n\nGood for:\n${tone.goodFor.map((item) => `- ${item}`).join('\n')}\n\nAt small sizes:\n${tone.smallSizeNotes}\n\nExamples relative to the installed package's tones directory:\n- Light: ${tone.referenceFiles.light}\n- Dark: ${tone.referenceFiles.dark}\n\nUse --json to include both complete SVG examples.`);
        if (tone.sourceReferences?.length) console.log(`\nReferences:\n${tone.sourceReferences.map((item) => `- ${item.title}: ${item.url}`).join('\n')}`);
      }
    }
    return true;
  } catch (error) {
    console.error(`zudo-diagram-gen: ${error.message}`);
    process.exitCode = 1;
    return true;
  }
}
