// Vendor Brief v2 Phase 2A — confirm-back pure logic pins.
// Capture + display only: these helpers never touch vendor status, vendor.log,
// on-site vendor fields, or attention feeds (Slice 2B, not started).

import { buildConfirmationPayload, latestConfirmationFor, describeConfirmation, CONFIRM_STATES } from '../vendorBriefConfirm';
import { submitVendorBriefConfirmation, fetchVendorConfirmations, vendorBriefIdempotencyKey } from '../api/vendorBrief';

describe('buildConfirmationPayload', () => {
  test('shapes the public POST body with trimmed fields', () => {
    const p = buildConfirmationPayload('idk-1', 'confirmed', {
      onSiteName: '  Dana Whitfield ', onSitePhone: '(301) 555-0134', note: '',
    });
    expect(p).toEqual({
      idempotency_key: 'idk-1',
      state: 'confirmed',
      on_site_name: 'Dana Whitfield',
      on_site_phone: '(301) 555-0134',
      note: undefined, // empty → omitted, not ""
    });
  });

  test('unknown state coerces to confirmed (server also validates)', () => {
    expect(buildConfirmationPayload('k', 'maybe', {}).state).toBe('confirmed');
    expect(CONFIRM_STATES).toEqual(['confirmed', 'issue_reported']);
  });
});

describe('latestConfirmationFor', () => {
  const rows = [
    { vendor_id: 'v1', state: 'confirmed', submitted_at: '2026-07-06T12:00:00Z' },
    { vendor_id: 'v1', state: 'issue_reported', submitted_at: '2026-07-06T12:00:00Z', updated_at: '2026-07-06T14:00:00Z' },
    { vendor_id: 'v2', state: 'confirmed', submitted_at: '2026-07-06T18:00:00Z' },
  ];
  test('picks the freshest row for the vendor (updated_at wins)', () => {
    expect(latestConfirmationFor(rows, 'v1').state).toBe('issue_reported');
  });
  test("other vendors' rows never bleed in; empty input is null", () => {
    expect(latestConfirmationFor(rows, 'v3')).toBeNull();
    expect(latestConfirmationFor(null, 'v1')).toBeNull();
  });
});

describe('describeConfirmation — planner display strings', () => {
  test('confirmed row → name, phone, date', () => {
    const d = describeConfirmation({ state: 'confirmed', on_site_name: 'Dana', on_site_phone: '(301) 555-0134', submitted_at: '2026-07-06T12:00:00Z' });
    expect(d.kind).toBe('confirmed');
    expect(d.label).toBe('Vendor confirmed');
    expect(d.detail).toContain('Dana, (301) 555-0134');
  });
  test('issue row → note surfaces as plain data', () => {
    const d = describeConfirmation({ state: 'issue_reported', note: 'Gate code changed', submitted_at: '2026-07-06T12:00:00Z' });
    expect(d.kind).toBe('issue');
    expect(d.label).toBe('Vendor reported an issue');
    expect(d.detail).toContain('Gate code changed');
  });
  test('no row → null (planner sees nothing, no fake alarm)', () => {
    expect(describeConfirmation(null)).toBeNull();
  });
});

describe('confirm API client contracts (API unconfigured in test env)', () => {
  test('submitVendorBriefConfirmation THROWS so the UI can show honest retry', async () => {
    await expect(submitVendorBriefConfirmation('abcdefghij1234567890xy', {}))
      .rejects.toThrow('not configured');
  });
  test('fetchVendorConfirmations degrades to [] and never throws', async () => {
    await expect(fetchVendorConfirmations('e1')).resolves.toEqual([]);
    await expect(fetchVendorConfirmations(null)).resolves.toEqual([]);
  });
});

describe('vendorBriefIdempotencyKey', () => {
  test('stable per code, distinct across codes', () => {
    const a1 = vendorBriefIdempotencyKey('codeA-1234567890abcdef');
    const a2 = vendorBriefIdempotencyKey('codeA-1234567890abcdef');
    const b  = vendorBriefIdempotencyKey('codeB-1234567890abcdef');
    expect(a1).toBe(a2);
    expect(b).not.toBe(a1);
  });
});
