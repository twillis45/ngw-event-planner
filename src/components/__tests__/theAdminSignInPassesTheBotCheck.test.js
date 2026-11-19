/**
 * @jest-environment jsdom
 */
// 11/19/2026: the admin console's sign-in (AuthGate, ?admin=1) sent no
// Turnstile token, so switching on Supabase CAPTCHA would have locked the
// owner out of it. It now carries the token, and when Cloudflare fails a
// browser it sends anyway and lets Supabase decide (lib/signInCheckGate).
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOtp = jest.fn(async () => ({ error: null }));
const mockVerify = jest.fn(async () => ({ error: null }));
jest.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithOtp: (...a) => mockOtp(...a), verifyOtp: (...a) => mockVerify(...a) } },
  isSupabaseConfigured: () => true,
  authRedirectUrl: () => 'https://example.test/',
}));
let mockMode = 'token';
jest.mock('../SignInCheck', () => {
  const R = require('react');
  return {
    __esModule: true,
    signInCheckOn: () => true,
    default: ({ onToken, onError }) => {
      R.useEffect(() => { if (mockMode === 'token') onToken('tok-1'); else if (mockMode === 'fail') onError(); }, []); // eslint-disable-line
      return R.createElement('div', { 'data-signin-check': '' });
    },
  };
});
const { LoginScreen } = require('../AuthGate');

let host, root;
const mount = async () => {
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(React.createElement(LoginScreen)); });
};
const setValue = (el, v) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
};
const send = async () => {
  await act(async () => { setValue(host.querySelector('input[type=email]'), 'admin@example.test'); });
  await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
};
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
beforeEach(() => {
  mockOtp.mockReset(); mockOtp.mockImplementation(async () => ({ error: null }));
  mockVerify.mockReset(); mockVerify.mockImplementation(async () => ({ error: null }));
});

test('the sign-in request carries the Turnstile token', async () => {
  mockMode = 'token';
  await mount();
  await send();
  expect(mockOtp).toHaveBeenCalledTimes(1);
  expect(mockOtp.mock.calls[0][0].options.captchaToken).toBe('tok-1');
});

test('still deciding: it asks for the tick and sends nothing', async () => {
  mockMode = 'none';
  await mount();
  await send();
  expect(host.textContent).toMatch(/Tick “Verify you are human”/);
  expect(mockOtp).not.toHaveBeenCalled();
});

test('Cloudflare failed this browser: it sends without a token and Supabase decides', async () => {
  mockMode = 'fail';
  await mount();
  await send();
  expect(mockOtp).toHaveBeenCalledTimes(1);
  expect(mockOtp.mock.calls[0][0].options).not.toHaveProperty('captchaToken');
});

// Owner, 11/19/2026: "?admin=1 doesn't take me to admin page". The link went
// back to the site's root without ?admin=1; the code keeps her on this page.
test('the link keeps ?admin=1, and the code from the email signs in here', async () => {
  mockMode = 'token';
  window.history.pushState({}, '', '/?admin=1');
  await mount();
  await send();
  expect(mockOtp.mock.calls[0][0].options.emailRedirectTo).toMatch(/\?admin=1$/);
  const input = host.querySelector('input[aria-label="Sign-in code from the email"]');
  expect(input).toBeTruthy();
  await act(async () => { setValue(input, '482 913'); });
  await act(async () => { input.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(mockVerify).toHaveBeenCalledWith({ email: 'admin@example.test', token: '482913', type: 'email' });
  window.history.pushState({}, '', '/');
});
