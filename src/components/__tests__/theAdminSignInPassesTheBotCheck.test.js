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
jest.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithOtp: (...a) => mockOtp(...a) } },
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
beforeEach(() => mockOtp.mockClear());

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
