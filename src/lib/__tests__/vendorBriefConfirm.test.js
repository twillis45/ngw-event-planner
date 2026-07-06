// Vendor Brief v2 Phase 2A — confirm-back pure logic pins.
// Capture + display only: these helpers never touch vendor status, vendor.log,
// on-site vendor fields, or attention feeds (Slice 2B, not started).

import { buildConfirmationPayload, latestConfirmationFor, describeConfirmation, CONFIRM_STATES,
  confirmationActionsFor, contactLogEntry, MARK_CONFIRMED_LOG, issueLogEntry } from '../vendorBriefConfirm';
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

// ── Slice 2B-1 — host/planner actions (explicit, never automatic) ─────────────
describe('confirmationActionsFor', () => {
  const confirmedRow = { state: 'confirmed', on_site_name: 'Dana', on_site_phone: '(301) 555-0134' };

  test('no row (or no vendor) → no actions', () => {
    const none = { markConfirmed: false, saveContact: false, saveContactLabel: null, addIssueToLog: false };
    expect(confirmationActionsFor(null, { id: 'v1' })).toEqual(none);
    expect(confirmationActionsFor(confirmedRow, null)).toEqual(none);
  });

  test('confirmed row + unconfirmed vendor offers markConfirmed', () => {
    expect(confirmationActionsFor(confirmedRow, { status: 'Considering' }).markConfirmed).toBe(true);
  });

  test('confirmed row + already-Confirmed vendor does NOT offer markConfirmed', () => {
    expect(confirmationActionsFor(confirmedRow, { status: 'Confirmed' }).markConfirmed).toBe(false);
  });

  test('row with contact info offers saveContact with Save label when vendor has none', () => {
    const a = confirmationActionsFor(confirmedRow, { status: 'Considering' });
    expect(a.saveContact).toBe(true);
    expect(a.saveContactLabel).toBe('Save on-site contact');
  });

  test('row matching existing vendor contact does NOT offer saveContact', () => {
    const a = confirmationActionsFor(confirmedRow,
      { status: 'Confirmed', onSiteContactName: 'Dana', onSitePhone: '(301) 555-0134' });
    expect(a.saveContact).toBe(false);
  });

  test('row differing from existing vendor contact labels honestly as Replace', () => {
    const a = confirmationActionsFor(confirmedRow,
      { status: 'Confirmed', onSiteContactName: 'Marcus', onSitePhone: '(555) 000-0000' });
    expect(a.saveContact).toBe(true);
    expect(a.saveContactLabel).toBe('Replace on-site contact');
  });

  test('confirmed row with NO contact info offers no saveContact', () => {
    const a = confirmationActionsFor({ state: 'confirmed' }, { status: 'Considering' });
    expect(a.saveContact).toBe(false);
    expect(a.markConfirmed).toBe(true);
  });

  test('issue row with a note offers addIssueToLog; stage action never offered', () => {
    const a = confirmationActionsFor({ state: 'issue_reported', note: 'Gate code changed' }, { status: 'Considering' });
    expect(a.addIssueToLog).toBe(true);
    expect(a.markConfirmed).toBe(false);
  });

  test('issue row without a note offers no useless log action', () => {
    expect(confirmationActionsFor({ state: 'issue_reported', note: '  ' }, { status: 'Considering' }).addIssueToLog).toBe(false);
  });
});

describe('2B-1 log string builders — plain host-readable strings', () => {
  test('contact log names what was saved', () => {
    expect(contactLogEntry({ on_site_name: 'Dana', on_site_phone: '(301) 555-0134' }))
      .toBe('Saved on-site contact from brief confirmation — Dana, (301) 555-0134');
  });
  test('mark-confirmed log is fixed copy', () => {
    expect(MARK_CONFIRMED_LOG).toBe('Marked confirmed after brief confirmation');
  });
  test('issue log carries the vendor note verbatim as plain text', () => {
    expect(issueLogEntry({ note: 'Gate code changed' }))
      .toBe('Vendor reported via brief link: Gate code changed');
  });
});
