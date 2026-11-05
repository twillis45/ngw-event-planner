import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptAuthCallback } from '../runtime/authCallback.mjs';
const redirect = 'com.example.ngwhostrc://auth-callback';
test('unrelated URL never passes tokens to auth', async () => {
  for (const url of ['https://auth-callback/#access_token=a&refresh_token=b', 'com.example.ngwhostrc://evil/#access_token=a&refresh_token=b', redirect + '/extra#access_token=a&refresh_token=b']) {
    assert.equal(await acceptAuthCallback(url, redirect, { setSession: () => assert.fail('unexpected session') }), false);
  }
});
test('complete implicit callback awaits accepted canonical session', async () => {
  let credentials;
  assert.equal(await acceptAuthCallback(redirect + '#access_token=a&refresh_token=b', redirect, { setSession: async v => { credentials = v; return {}; } }), true);
  assert.deepEqual(credentials, { access_token: 'a', refresh_token: 'b' });
});
test('failed, incomplete, and unconfigured callback never reports success', async () => {
  for (const [url, auth] of [[redirect + '#access_token=a', {}], [redirect + '#error=denied', {}], [redirect + '#access_token=a&refresh_token=b', null], [redirect + '#access_token=a&refresh_token=b', { setSession: async () => ({ error: new Error('private token detail') }) }]]) {
    await assert.rejects(acceptAuthCallback(url, redirect, auth), /Sign-in|sign-in/);
  }
});
test('PKCE callback delegates to canonical verifier', async () => {
  let code;
  assert.equal(await acceptAuthCallback(redirect + '?code=abc', redirect, { exchangeCodeForSession: async v => { code = v; return {}; } }), true);
  assert.equal(code, 'abc');
});
