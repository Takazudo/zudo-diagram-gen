export { createProject, VERSION, ENGINE_PACKAGE } from './scaffold.generated.mjs';
export const helpText = `Create a local SVG diagram review workspace.

Usage:
  create-zudo-diagram-gen [destination] [options]

Options:
  --name <title>          Session display title; defaults to destination name
  --engine-package <spec> Engine version, npm spec, or absolute local .tgz path
  --project              Create a multi-session project host\n  --install              Run pnpm install after generating files (default: off)
  --yes, -y              Accept predictable defaults; no prompts are shown
  --help, -h             Show this help
  --version, -v          Print initializer version

Destination defaults to ./diagram-session. An existing destination must be empty.
The initializer never creates a git repository or installs agent skills.

Before publication, use a packed engine:
  create-zudo-diagram-gen ./review --engine-package /absolute/path/engine.tgz
`;

/** Parse CLI arguments without prompting or interpreting shell syntax. */
export function parseArguments(args) {
  const options = { destination: 'diagram-session', install: false, yes: false };
  let hasDestination = false;
  let literal = false;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (!literal && argument === '--') {
      literal = true;
      continue;
    }
    if (!literal && ['--help', '-h'].includes(argument)) {
      options.help = true;
      continue;
    }
    if (!literal && ['--version', '-v'].includes(argument)) {
      options.version = true;
      continue;
    }
    if (!literal && ['--yes', '-y'].includes(argument)) {
      options.yes = true;
      continue;
    }
    if (!literal && argument === '--project') {
      options.project = true;
      continue;
    }
    if (!literal && argument === '--install') {
      options.install = true;
      continue;
    }
    if (!literal && /^(--name|--engine-package)(=|$)/.test(argument)) {
      const equal = argument.indexOf('=');
      const flag = equal === -1 ? argument : argument.slice(0, equal);
      const value = equal === -1 ? args[++i] : argument.slice(equal + 1);
      if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
      options[flag === '--name' ? 'name' : 'enginePackage'] = value;
      continue;
    }
    if (!literal && argument.startsWith('-'))
      throw new Error(`Unknown option ${argument}. Run with --help for supported options.`);
    if (hasDestination) throw new Error('Provide exactly one destination directory.');
    options.destination = argument;
    hasDestination = true;
  }
  return options;
}
