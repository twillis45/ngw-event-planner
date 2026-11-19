// Live check 11/19/2026: with the Turnstile key live, the form refused to send
// without a token, and a browser Cloudflare failed could never sign in.
import { signInSendDecision, signInErrorText } from '../signInCheckGate';

test('no check, or a token: send', () => {
  expect(signInSendDecision({ checkOn: false, token: '', failed: false }).send).toBe(true);
  expect(signInSendDecision({ checkOn: true, token: 't1', failed: false }).send).toBe(true);
});

test('still deciding: ask for the tick, not "try again in a second"', () => {
  const d = signInSendDecision({ checkOn: true, token: '', failed: false });
  expect(d.send).toBe(false);
  expect(d.message).toMatch(/Tick “Verify you are human”/);
});

test('Cloudflare failed this browser: send anyway and let Supabase decide', () => {
  expect(signInSendDecision({ checkOn: true, token: '', failed: true })).toEqual({ send: true, message: '' });
});

test('a CAPTCHA refusal from Supabase says what to do', () => {
  expect(signInErrorText(new Error('captcha protection: request disallowed (no captcha response)'))).toMatch(/another browser/);
  expect(signInErrorText(new Error('Email rate limit exceeded'))).toBe('Email rate limit exceeded');
  expect(signInErrorText(null)).toMatch(/try again in a minute/);
});
