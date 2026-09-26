import { spawnSync } from 'node:child_process';

const version = process.argv[2];
if (!version || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(version)) {
  console.error('Usage: pnpm rollback:cloudflare <previous-version-uuid>');
  process.exit(2);
}

const result = spawnSync('pnpm', ['exec', 'wrangler', 'rollback', version], { stdio: 'inherit' });
process.exit(result.status ?? 1);
