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
