// COI-LOGIC-1 — insurance requirement is service-mode + venue-requirement
// intelligence, never blunt category guessing. A pickup order must never read
// "COI missing"; unknown modes say "check", and only venue mandates or
// high-risk on-site work assert a requirement.

import { vendorCoiRequirement, getVendorCOIState, coiNextAction } from '../vendorIntelligence';

const ev = (over = {}) => ({ id: 'e-coi', date: '2026-09-01', ...over });
const v = (over = {}) => ({ id: 'v-coi', name: 'Vendor', category: '', ...over });

test('1 · restaurant pickup: not needed, never "missing"', () => {
  const r = vendorCoiRequirement(v({ category: 'Restaurant', notes: 'Pickup Friday 2pm' }), ev());
  expect(r.level).toBe('not_needed');
  expect(r.hostCopy).toMatch(/probably not needed/i);
  const coi = getVendorCOIState(v({ category: 'Restaurant', notes: 'Pickup Friday 2pm' }), ev());
  expect(coi.required).toBe(false);
  expect(coi.level).toBe('safe');
  expect(coiNextAction(v({ category: 'Restaurant', notes: 'Pickup Friday 2pm' }), ev(), 'Vendor')).toBeNull();
});

test('2 · delivery / drop-off only: not needed', () => {
  const r = vendorCoiRequirement(v({ category: 'Bakery', notes: 'Delivery only, leaves at the door' }), ev());
  expect(r.level).toBe('not_needed');
  expect(r.source).toBe('service_mode');
});

test('3 · catering (on-site serving default): recommended ask, not asserted requirement', () => {
  const coi = getVendorCOIState(v({ category: 'Catering' }), ev());
  expect(coi.required).toBe(true);
  expect(coi.need).toBe('recommended');
  expect(coi.label).toBe('Ask about insurance');
  expect(coi.level).toBe('attention'); // never a critical dock-blocker on its own
  const na = coiNextAction(v({ category: 'Catering' }), ev(), 'Soul Kitchen');
  expect(na.title).toMatch(/Ask Soul Kitchen about insurance/);
});

test('4 · on-site cooking / open flame: required', () => {
  expect(vendorCoiRequirement(v({ category: 'Food truck' }), ev()).level).toBe('required');
  expect(vendorCoiRequirement(v({ category: 'Caterer', notes: 'grill on-site' }), ev()).level).toBe('required');
});

test('5 · alcohol / bartending service: required', () => {
  const r = vendorCoiRequirement(v({ category: 'Bartending' }), ev());
  expect(r.level).toBe('required');
  expect(r.hostCopy).toMatch(/Ask for a COI/);
});

test('6 · DJ / equipment: check, phrased as venue-requirement question', () => {
  const r = vendorCoiRequirement(v({ category: 'DJ' }), ev());
  expect(r.level).toBe('ask_venue');
  expect(r.hostCopy).toMatch(/Check insurance/);
  const coi = getVendorCOIState(v({ category: 'DJ' }), ev());
  expect(coi.required).toBe(false);
  expect(coi.status).toBe('check');
  expect(coi.label).toBe('Check insurance need');
});

test('7 · solo photographer: ask_venue by default, never required', () => {
  const r = vendorCoiRequirement(v({ category: 'Photographer' }), ev());
  expect(r.level).toBe('ask_venue');
  expect(r.hostCopy).toMatch(/may not need a COI/);
});

test('8 · rentals / tents / staging: required', () => {
  expect(vendorCoiRequirement(v({ category: 'Tent & staging' }), ev()).level).toBe('required');
  expect(vendorCoiRequirement(v({ category: 'Bounce house' }), ev()).level).toBe('required');
});

test('9 · unknown service mode: "check insurance need", raises no alarm', () => {
  const coi = getVendorCOIState(v({ category: '' }), ev());
  expect(coi.status).toBe('check');
  expect(coi.level).toBe('safe');
  expect(coi.hostCopy).toMatch(/Check insurance need/);
  expect(JSON.stringify(coi)).not.toMatch(/missing/i);
});

test('10 · venue-required flag overrides everything derived', () => {
  const e = ev({ houseRules: 'All vendors must provide a certificate of insurance.' });
  const r = vendorCoiRequirement(v({ category: 'Restaurant', notes: 'pickup' }), e);
  expect(r.level).toBe('required');
  expect(r.source).toBe('venue');
  const coi = getVendorCOIState(v({ category: 'Restaurant', notes: 'pickup' }), e);
  expect(coi.required).toBe(true);
});

test('11 · explicit COI tracking wins: received/verified clears, not_required clears', () => {
  const done = getVendorCOIState(v({ category: 'Tent rental', coiStatus: 'received', coiVerified: true, coiExpiryDate: '2027-01-01' }), ev());
  expect(done.level).toBe('safe');
  expect(done.status).toBe('verified');
  const off = getVendorCOIState(v({ category: 'Tent rental', coiStatus: 'not_required' }), ev());
  expect(off.required).toBe(false);
});

test('12 · transportation / shuttle / security: required', () => {
  expect(vendorCoiRequirement(v({ category: 'Shuttle service' }), ev()).level).toBe('required');
  expect(vendorCoiRequirement(v({ category: 'Security' }), ev()).level).toBe('required');
});

test('13 · host copy never speaks legal certainty or bans', () => {
  const cats = ['Restaurant', 'Catering', 'DJ', 'Photographer', 'Tent rental', 'Bartending', ''];
  cats.forEach(category => {
    const r = vendorCoiRequirement(v({ category }), ev());
    expect(r.hostCopy).not.toMatch(/legal|liab|guarantee|you are covered|approved|compliant/i);
    expect(r.hostCopy).not.toMatch(/COI missing|missing COI/i);
  });
});

test('14 · recommended tier never escalates to critical without explicit tracking', () => {
  // 10 days out — the old logic would mark an untracked "required" COI critical.
  const soon = ev({ date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) });
  const coi = getVendorCOIState(v({ category: 'Catering' }), soon);
  expect(coi.level).toBe('attention');
});
