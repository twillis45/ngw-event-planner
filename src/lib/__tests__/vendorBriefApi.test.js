// Vendor Brief v2 Phase 1 — client + token discrimination pins.
// The client must NEVER throw into the UI: any failure (unconfigured, network,
// non-2xx) returns null so callers fall back to the legacy base64 snapshot URL.

import { mintVendorBriefLink, fetchPublicVendorBrief, looksLikeBriefCode } from '../api/vendorBrief';
import { buildVendorBriefPayload } from '../vendorBrief';

// REACT_APP_API_BASE_URL is unset in the test env, so both functions are on
// their "not configured" path — pin the graceful degradation contract.
describe('vendor brief client — graceful degradation (API not configured)', () => {
  test('mintVendorBriefLink returns null, never throws', async () => {
    await expect(mintVendorBriefLink('e1', 'v1')).resolves.toBeNull();
  });
  test('fetchPublicVendorBrief returns null, never throws', async () => {
    await expect(fetchPublicVendorBrief('abcdefghij1234567890xy')).resolves.toBeNull();
  });
  test('missing args return null', async () => {
    await expect(mintVendorBriefLink(null, 'v1')).resolves.toBeNull();
    await expect(fetchPublicVendorBrief('')).resolves.toBeNull();
  });
});

describe('looksLikeBriefCode — short server code vs legacy base64 snapshot', () => {
  test('a minted-style 22-char code is a code', () => {
    expect(looksLikeBriefCode('abcdefghij1234567890xy')).toBe(true);
  });
  test('empty/absent token is not a code', () => {
    expect(looksLikeBriefCode('')).toBe(false);
    expect(looksLikeBriefCode(null)).toBe(false);
  });
  test('a REAL legacy base64 payload is always classified as legacy', () => {
    // Even the most minimal brief payload base64-encodes far past the 64-char
    // boundary, so no legacy link can ever be mistaken for a server code.
    const minimal = buildVendorBriefPayload({ id: 'v', name: 'X' }, { id: 'e' }, [], {});
    const token = btoa(JSON.stringify(minimal));
    expect(token.length).toBeGreaterThan(64);
    expect(looksLikeBriefCode(token)).toBe(false);
  });
});

// ── NO SILENT LEGACY FALLBACK (stage 9 work order #13, S9-5 option B) ─────────
// With the API configured, a failed mint must say WHICH failure it was, so the
// shell can refuse to make the legacy snapshot and show the right next step.
describe('mintVendorBriefLinkResult — a configured mint names its failure', () => {
  const API = 'https://brief-mock.invalid';
  let mod;
  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = API;
    jest.isolateModules(() => { mod = require('../api/vendorBrief'); });
  });
  afterEach(() => { delete process.env.REACT_APP_API_BASE_URL; delete global.fetch; });

  const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

  test('a 500 is a typed failure with its status — not null, not a code', async () => {
    global.fetch = jest.fn(async () => reply(500, { detail: 'could not mint brief link' }));
    const r = await mod.mintVendorBriefLinkResult('e1', 'v1');
    expect(r).toEqual({ ok: false, kind: 'failed', status: 500 });
    expect(mod.mintStatusClass(r)).toBe('5xx');
    expect(global.fetch).toHaveBeenCalledTimes(1);   // an HTTP answer is not retried
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e1/vendor-brief-links');
  });

  test('a 402 is pass-required', async () => {
    global.fetch = jest.fn(async () => reply(402, { detail: { reason: 'pass-required', detail: 'Sharing this brief takes the One-Event Pass.' } }));
    const r = await mod.mintVendorBriefLinkResult('e1', 'v1');
    expect(r).toEqual({ ok: false, kind: 'pass-required', status: 402 });
    expect(mod.mintStatusClass(r)).toBe('4xx');
  });

  test('a 401 is signed-out', async () => {
    global.fetch = jest.fn(async () => reply(401, { detail: 'Planner authentication required' }));
    await expect(mod.mintVendorBriefLinkResult('e1', 'v1')).resolves.toEqual({ ok: false, kind: 'signed-out', status: 401 });
  });

  test('a network error is retried once, and a second failure is typed network', async () => {
    global.fetch = jest.fn(async () => { throw new TypeError('Failed to fetch'); });
    const r = await mod.mintVendorBriefLinkResult('e1', 'v1');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ ok: false, kind: 'network', status: null });
    expect(mod.mintStatusClass(r)).toBe('network');
  });

  test('a network error followed by success returns the code from the retry', async () => {
    global.fetch = jest.fn()
      .mockImplementationOnce(async () => { throw new TypeError('Failed to fetch'); })
      .mockImplementationOnce(async () => reply(200, { ok: true, code: 'abcdefghij1234567890xy' }));
    await expect(mod.mintVendorBriefLinkResult('e1', 'v1')).resolves.toEqual({ ok: true, code: 'abcdefghij1234567890xy' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('the old contract still holds for the frozen CRA caller: code or null', async () => {
    global.fetch = jest.fn(async () => reply(500));
    await expect(mod.mintVendorBriefLink('e1', 'v1')).resolves.toBeNull();
    global.fetch = jest.fn(async () => reply(200, { ok: true, code: 'abcdefghij1234567890xy' }));
    await expect(mod.mintVendorBriefLink('e1', 'v1')).resolves.toBe('abcdefghij1234567890xy');
  });
});

describe('mintVendorBriefLinkResult — not configured is its own kind', () => {
  test('no API base: not-configured, and no request is made', async () => {
    global.fetch = jest.fn();
    const { mintVendorBriefLinkResult } = require('../api/vendorBrief');
    await expect(mintVendorBriefLinkResult('e1', 'v1')).resolves.toEqual({ ok: false, kind: 'not-configured', status: null });
    expect(global.fetch).not.toHaveBeenCalled();
    delete global.fetch;
  });
});
