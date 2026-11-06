import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { nativeBuildProfile } from './nativeChannel.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
// Debug and beta (TestFlight / Play internal) build; a store release is refused.
const profile = nativeBuildProfile(process.env);
const result = spawnSync(process.execPath, ['../../hostv2/node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.mjs'], {
  cwd: path.resolve(here, '..'), stdio: 'inherit',
  env: { ...process.env, RELEASE_PROFILE: profile.releaseProfile, REACT_APP_NATIVE_DEBUG: profile.nativeDebug },
});
process.exit(result.status ?? 1);
