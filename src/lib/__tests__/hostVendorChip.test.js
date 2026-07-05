// Host persona audit (vendor cognitive-load slice): the overview vendor list's
// status chip speaks the SAME host vocabulary the Vendors tab uses
// (hostStatusWord: Booked / Got a price / Still deciding) — not figmaBadge's
// all-caps ops tokens. The map is deliberately call-site-local (NOT in the
// shared HOST_LABELS): HealthRow also routes statusLabel through labelFor,
// and health rows emit 'CONFIRMED'/'NOT STARTED' where 'Booked'/'Still
// deciding' would be wrong-context.

import { HOST_VENDOR_CHIP } from '../../CommandCenter';
import { HOST_LABEL_MAP, labelFor } from '../presentationLabels';

describe('HOST_VENDOR_CHIP — overview vendor chip host vocabulary', () => {
  test('covers every non-AT-RISK label figmaBadge/driftOverride can produce', () => {
    // figmaBadge: CONFIRMED | PARTIAL | PENDING | NOT STARTED | UNCONFIRMED;
    // driftOverride: HEADCOUNT MISMATCH. (AT RISK is handled by shared HOST_LABELS.)
    expect(Object.keys(HOST_VENDOR_CHIP).sort()).toEqual(
      ['CONFIRMED', 'HEADCOUNT MISMATCH', 'NOT STARTED', 'PARTIAL', 'PENDING', 'UNCONFIRMED'].sort()
    );
  });

  test('speaks the Vendors tab host vocabulary — Booked / Got a price / Still deciding', () => {
    expect(HOST_VENDOR_CHIP['CONFIRMED']).toBe('Booked');
    expect(HOST_VENDOR_CHIP['PENDING']).toBe('Got a price');
    expect(HOST_VENDOR_CHIP['NOT STARTED']).toBe('Still deciding');
  });

  test('no all-caps ops tokens survive translation', () => {
    Object.values(HOST_VENDOR_CHIP).forEach(v => {
      expect(v).not.toMatch(/^[A-Z\s]+$/); // plain sentence-case, not ALARM CAPS
    });
  });

  test('the dangerous globals were NOT added to shared HOST_LABELS (HealthRow safety)', () => {
    // 'CONFIRMED'/'NOT STARTED' in the shared map would leak 'Booked'/'Still
    // deciding' onto Reality Check / health rows via HealthRow's labelFor call.
    expect(HOST_LABEL_MAP['CONFIRMED']).toBeUndefined();
    expect(HOST_LABEL_MAP['NOT STARTED']).toBeUndefined();
    expect(HOST_LABEL_MAP['PARTIAL']).toBeUndefined();
  });

  test('AT RISK stays with the shared labelFor mapping (already host-translated)', () => {
    expect(HOST_VENDOR_CHIP['AT RISK']).toBeUndefined();
    expect(labelFor('AT RISK', { audience: undefined })).toBe('Needs attention'); // host default persona
  });
});
