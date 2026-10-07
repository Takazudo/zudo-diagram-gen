#!/usr/bin/env node
import { runProjectCommand } from './project-command.mjs';
import { argumentError, machineRequested, parseOptions, reportError } from './command-contract.mjs';
import { runWorkflowCommand } from './workflow-command.mjs';
import { runCaptureCommand } from './capture-command.mjs';
import { runDataCommand } from './commands.mjs';
import { runHtmlExportCommand } from './html-export-command.mjs';
import { runZfb } from './runner.mjs';

const help = `zudo-diagram-gen 0.1.0

  new --out <new-directory> --brief <file> [--project] [--install] [--json]
  inspect|resume <session-or-project> [--review <file>] [--json]
  check [directory] [--json] [--json-version 1]
  dev|build|preview [directory] [--host <host>] [--port <port>]
  export <candidate-id> --session <directory> --theme light|dark --out <file>
  capture <candidate-id> --session <directory> --out <png> [--placement <file>] [--json]
  export-html [session-or-project] --out <file> [--force] [--json]
  project lock <dir> --tone <id> --palette <file> --selection <file> --revision <id> [--json]
  project adopt <dir> --revision <id> [--json]
  tones list [--json] [--json-version 1]
  tones show <id> [--json] [--json-version 1]

Paths are caller supplied. The engine does not choose a personal output location.
Feedback stays in the browser until copied or downloaded; no agent is auto-started.
`;

try {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args[0] === '-h') console.log(help);
  else if (await runWorkflowCommand(args)) {
    /* Create/resume never invoke a model. */
  } else if (await runProjectCommand(args)) {
    /* Explicit immutable style operations. */
  } else if (await runCaptureCommand(args)) {
    /* Capture owns its versioned diagnostics. */
  } else if (args[0] === '--version') console.log('0.1.0');
  else if (['dev', 'build', 'preview'].includes(args[0])) {
    const parsed = parseOptions(args.slice(1), {
      host: { type: 'string' },
      port: { type: 'string' },
    });
    if (parsed.positionals.length > 1) throw argumentError('Supply at most one session directory.');
    const forwarded = [];
    for (const name of ['host', 'port'])
      if (parsed.options[name] !== undefined) forwarded.push(`--${name}`, parsed.options[name]);
    if (
      parsed.options.port &&
      (!/^\d+$/.test(parsed.options.port) ||
        +parsed.options.port < 1 ||
        +parsed.options.port > 65535)
    )
      throw argumentError('--port must be between 1 and 65535.');
    process.exitCode = await runZfb(args[0], parsed.positionals[0] || '.', forwarded);
  } else if (await runHtmlExportCommand(args)) {
    /* HTML export owns bounded project data and safe output diagnostics. */
  } else if (!(await runDataCommand(args)))
    throw argumentError(`Unknown command: ${args[0]}. Run --help.`);
} catch (error) {
  const args = process.argv.slice(2);
  reportError(args[0] ?? '', error, machineRequested(args), !machineRequested(args));
}
