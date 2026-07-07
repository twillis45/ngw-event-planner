// DM-PAYOFF-1 — the visible payoff loop contract. If the app asked "why?",
// the reason must come back: exact user words, never invented, never public.

import { appendDecision, makeRecord, decisionPayoffSummary } from '../decisionMemory';
import { buildVendorBriefPayload } from '../vendorBrief';
import { draftGuestBrief, draftInvite } from '../doItForMe';

const RATIONALE = 'They did my brother’s retirement at the VFW and the quartermaster already trusts their load-in crew';

const vendor = { id: 'v-dm', name: 'Capital Rotisserie Catering', category: 'Catering', status: 'Confirmed', arrivalTime: '14:30' };
const baseEvent = () => ({
  id: 'e-dm', recordKind: 'host_event', name: 'DM Payoff Retirement', type: 'Retirement Party',
  date: '2026-08-01', venueKind: 'venue', venue: 'VFW Post 3150', guestMode: 'count', guestCount: 60,
  guests: [], budget: [], timeline: [], vendors: [vendor],
});
const withRationale = (text = RATIONALE) =>
  appendDecision(baseEvent(), makeRecord({
    decisionType: 'vendor_selection', subjectId: 'v-dm', subjectLabel: vendor.name,
    decision: 'Confirmed Capital Rotisserie Catering (Catering)', rationale: text, eventId: 'e-dm',
  }, '2026-07-07T12:00:00.000Z'));

test('1 · vendor with rationale gets a payoff summary', () => {
  const p = decisionPayoffSummary(withRationale(), 'v-dm');
  expect(p).toBeTruthy();
  expect(p.full).toBe(RATIONALE);
});

test('2 · no rationale -> null, never fake payoff copy', () => {
  expect(decisionPayoffSummary(baseEvent(), 'v-dm')).toBeNull();
  expect(decisionPayoffSummary(withRationale('   '), 'v-dm')).toBeNull();
});

test('3 · long rationale truncates at a word boundary, full text intact', () => {
  const p = decisionPayoffSummary(withRationale(), 'v-dm', 40);
  expect(p.truncated).toBe(true);
  expect(p.short.endsWith('…')).toBe(true);
  expect(p.short.length).toBeLessThanOrEqual(41);
  expect(p.full).toBe(RATIONALE);
});

test('10 · payoff NEVER rewrites the user’s words — short is a plain prefix', () => {
  const p = decisionPayoffSummary(withRationale(), 'v-dm', 40);
  expect(RATIONALE.startsWith(p.short.slice(0, -1))).toBe(true);
  const whole = decisionPayoffSummary(withRationale('Trusted crew'), 'v-dm');
  expect(whole.short).toBe('Trusted crew');
  expect(whole.truncated).toBe(false);
});

test('5+9 · rationale never enters the public vendor brief payload', () => {
  const ev = withRationale();
  const payload = JSON.stringify(buildVendorBriefPayload(vendor, ev, ev.ros || [], null));
  expect(payload).not.toContain('quartermaster already trusts');
  expect(payload).not.toContain('decisionMemory');
  expect(payload).not.toContain('rationale');
});

test('6+9 · rationale never enters guest-facing copy', () => {
  const ev = withRationale();
  const guest = JSON.stringify(draftGuestBrief(ev, null)) + JSON.stringify(draftInvite(ev, null));
  expect(guest).not.toContain('quartermaster already trusts');
});
