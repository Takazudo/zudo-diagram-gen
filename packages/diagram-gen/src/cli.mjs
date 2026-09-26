#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { runDataCommand } from './commands.mjs';
import { loadSession } from './model.mjs';
import { renderGallery } from './render.mjs';
import { runZfb } from './runner.mjs';

const help = `zudo-diagram-gen 0.1.0

  check [directory] [--json]
  dev|build|preview [directory] [--host <host>] [--port <port>]
  export <candidate-id> --session <directory> --theme light|dark --out <file>
  export-html [directory] --out <file>
  tones list [--json]
  tones show <id> [--json]

Paths are caller supplied. The engine does not choose a personal output location.
Feedback stays in the browser until copied or downloaded; no agent is auto-started.
`;

try {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args[0] === '-h') console.log(help);
  else if (args[0] === '--version') console.log('0.1.0');
  else if (['dev','build','preview'].includes(args[0])) {
    const parsed = parseArgs({args: args.slice(1), allowPositionals: true, options: {host:{type:'string'},port:{type:'string'}}});
    if (parsed.positionals.length > 1) throw new Error('Supply at most one session directory.');
    const forwarded = [];
    for (const name of ['host','port']) if (parsed.values[name] !== undefined) forwarded.push(`--${name}`, parsed.values[name]);
    if (parsed.values.port && (!/^\d+$/.test(parsed.values.port) || +parsed.values.port < 1 || +parsed.values.port > 65535)) throw new Error('--port must be between 1 and 65535.');
    process.exitCode = await runZfb(args[0], parsed.positionals[0] || '.', forwarded);
  } else if (args[0] === 'export-html') {
    const parsed = parseArgs({args: args.slice(1), allowPositionals: true, options: {out:{type:'string'}}});
    if (!parsed.values.out || parsed.positionals.length > 1) throw new Error('Usage: export-html [directory] --out <file>');
    const data = await loadSession(parsed.positionals[0] || '.');
    const file = resolve(parsed.values.out);
    if (!/\.html?$/i.test(file)) throw new Error('--out must end in .html or .htm.');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, await renderGallery(data));
    console.log(`Exported ${data.candidates.length} candidates to ${file}`);
  } else if (!await runDataCommand(args)) throw new Error(`Unknown command: ${args[0]}. Run --help.`);
} catch (error) {
  console.error(`diagram-gen: ${error.message}`);
  process.exitCode = 1;
}
