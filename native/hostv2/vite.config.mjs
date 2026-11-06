import hostConfig from '../../hostv2/vite.config.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export default env => {
  const config = hostConfig(env);
  config.root = path.resolve(here, '../../hostv2');
  config.base = './';
  const appEnv = JSON.parse(config.define['process.env']);
  // Native debug must not inherit a web deployment's cloud credentials/targets.
  for (const key of ['API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']) {
    appEnv['REACT_APP_' + key] = process.env['REACT_APP_NATIVE_' + key] || '';
  }
  appEnv.REACT_APP_PUBLIC_APP_URL = process.env.REACT_APP_PUBLIC_APP_URL || '';
  appEnv.REACT_APP_AUTH_REDIRECT = process.env.REACT_APP_AUTH_REDIRECT || 'com.noguessworksystems.events://auth-callback';
  appEnv.REACT_APP_NATIVE_DEBUG = process.env.REACT_APP_NATIVE_DEBUG === '0' ? '0' : '1';
  config.define['process.env'] = JSON.stringify(appEnv);
  config.build = { outDir: path.join(here, 'www'), emptyOutDir: true };
  config.plugins = config.plugins.filter(p => p.name !== 'ngw-offline-shell');
  config.plugins.push({ name: 'ngw-bundled-native-entry', transformIndexHtml: { order: 'pre', handler: html => html
    .replace('src="/src/main.jsx"', 'src="/../native/hostv2/runtime/bootstrap.js"')
    .replace(/<link[^>]+rel="manifest"[^>]*>/g, '') } });
  return config;
};
