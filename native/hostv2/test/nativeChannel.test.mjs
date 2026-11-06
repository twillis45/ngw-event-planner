import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeBuildProfile } from '../scripts/nativeChannel.mjs';

const targets = {
  REACT_APP_NATIVE_API_BASE_URL: 'https://api.example.test',
  REACT_APP_NATIVE_SUPABASE_URL: 'https://proj.supabase.co',
  REACT_APP_NATIVE_SUPABASE_ANON_KEY: 'anon',
  REACT_APP_PUBLIC_APP_URL: 'https://events.example.test',
};

test('no channel is a local debug build', () => {
  assert.deepEqual(nativeBuildProfile({}), { channel: 'debug', releaseProfile: 'native-debug', nativeDebug: '1' });
});

test('a TestFlight / internal-track build is allowed with real targets', () => {
  assert.deepEqual(nativeBuildProfile({ NGW_NATIVE_CHANNEL: 'beta', ...targets }),
    { channel: 'beta', releaseProfile: 'native-beta', nativeDebug: '0' });
});

test('a beta build without cloud targets is refused, naming what is missing', () => {
  assert.throws(() => nativeBuildProfile({ NGW_NATIVE_CHANNEL: 'beta' }), /REACT_APP_NATIVE_SUPABASE_URL/);
  assert.throws(() => nativeBuildProfile({ NGW_NATIVE_CHANNEL: 'beta', ...targets, REACT_APP_NATIVE_SUPABASE_URL: 'http://proj.supabase.co' }), /HTTPS/);
});

test('a store release is still refused, by either spelling', () => {
  assert.throws(() => nativeBuildProfile({ NGW_NATIVE_RELEASE: '1' }), /store release is blocked/);
  assert.throws(() => nativeBuildProfile({ NGW_NATIVE_CHANNEL: 'store', ...targets }), /store release is blocked/);
  assert.throws(() => nativeBuildProfile({ NGW_NATIVE_CHANNEL: 'beta', NGW_NATIVE_RELEASE: '1', ...targets }), /store release is blocked/);
});

test('an unknown channel is refused, not treated as debug', () => {
  assert.throws(() => nativeBuildProfile({ NGW_NATIVE_CHANNEL: 'prod' }), /Unknown NGW_NATIVE_CHANNEL/);
});
