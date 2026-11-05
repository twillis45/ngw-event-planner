import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
// Provisional identifiers and local profile are never a signed-store build.
if (process.env.NGW_NATIVE_RELEASE === '1') throw new Error('Native release is blocked pending final identifiers, store billing, signing, and device gates.');
const result = spawnSync(process.execPath, ['../../hostv2/node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.mjs'], {
  cwd: path.resolve(here, '..'), stdio: 'inherit',
  env: { ...process.env, RELEASE_PROFILE: 'native-debug', REACT_APP_NATIVE_DEBUG: '1' },
});
process.exit(result.status ?? 1);
