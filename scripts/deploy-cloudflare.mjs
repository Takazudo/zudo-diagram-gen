import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const accountId = '367c7f51801e1f537030f93d5a5e6008';
if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== accountId) {
  console.error('CLOUDFLARE_ACCOUNT_ID does not match the zudolab.dev account in wrangler.jsonc.');
  process.exit(2);
}

for (const file of ['dist/index.html', 'dist/404.html']) {
  if (!existsSync(file)) {
    console.error(`Missing ${file}; run pnpm build first.`);
    process.exit(1);
  }
}

console.log('Current Worker versions (record the live version ID before deployment):');
const previous = spawnSync('pnpm', ['exec', 'wrangler', 'versions', 'list'], { stdio: 'inherit' });
if (previous.status !== 0) {
  console.log(
    'No prior version available, or version listing failed. Continue only for an intentional first deployment.',
  );
}

const result = spawnSync('pnpm', ['exec', 'wrangler', 'deploy'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
