import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(args) {
  const result = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync('android')) run(['cap', 'add', 'android']);
run(['cap', 'sync', 'android']);
