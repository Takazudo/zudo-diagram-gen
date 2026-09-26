#!/usr/bin/env node

import { createProject, parseArguments, helpText, VERSION } from '../src/index.mjs';

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(helpText);
  } else if (options.version) {
    process.stdout.write(`${VERSION}\n`);
  } else {
    const result = await createProject(options);
    process.stdout.write(`Created diagram workspace: ${result.directory}\n\n`);
    process.stdout.write('Next steps:\n');
    process.stdout.write(`  cd ${shellQuote(result.directory)}\n`);
    if (!result.installed) process.stdout.write('  pnpm install\n');
    process.stdout.write('  pnpm dev\n\n');
    process.stdout.write('Read AGENTS.md, then add candidates to rounds/r01/.\n');
  }
} catch (error) {
  process.stderr.write(`create-zudo-diagram-gen: ${error.message}\n`);
  process.exitCode = 1;
}

function shellQuote(value) {
  if (process.platform === 'win32') return `"${value.replaceAll('"', '""')}"`;
  return `'${value.replaceAll("'", "'\\''")}'`;
}
