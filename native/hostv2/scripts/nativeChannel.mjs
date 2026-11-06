// Which native build this is, decided once from the environment.
//
//   (unset) / debug  local debug: cloud targets optional, nothing implied.
//   beta             TestFlight internal / Play internal testing. Not public,
//                    so it is allowed — but it must point at real cloud
//                    targets, or testers install an app that cannot sign in.
//   store            public store submission: still refused until store
//                    billing, signing and device gates pass. NGW_NATIVE_RELEASE=1
//                    is the older spelling of the same refusal.
const BETA_TARGETS = ['REACT_APP_NATIVE_API_BASE_URL', 'REACT_APP_NATIVE_SUPABASE_URL', 'REACT_APP_NATIVE_SUPABASE_ANON_KEY', 'REACT_APP_PUBLIC_APP_URL'];
const isHttps = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };

export function nativeBuildProfile(env = {}) {
  const channel = String(env.NGW_NATIVE_CHANNEL || 'debug').trim().toLowerCase();
  if (env.NGW_NATIVE_RELEASE === '1' || channel === 'store') {
    throw new Error('Native store release is blocked pending store billing, signing, and device gates. Use NGW_NATIVE_CHANNEL=beta for TestFlight or Play internal testing.');
  }
  if (channel === 'debug') return { channel, releaseProfile: 'native-debug', nativeDebug: '1' };
  if (channel !== 'beta') throw new Error(`Unknown NGW_NATIVE_CHANNEL "${channel}". Use debug, beta, or store.`);
  const missing = BETA_TARGETS.filter((k) => !String(env[k] || '').trim());
  if (missing.length) throw new Error('A beta build needs ' + missing.join(', ') + '.');
  const notHttps = BETA_TARGETS.filter((k) => k.endsWith('_URL') && !isHttps(env[k]));
  if (notHttps.length) throw new Error('A beta build needs HTTPS for ' + notHttps.join(', ') + '.');
  return { channel, releaseProfile: 'native-beta', nativeDebug: '0' };
}
