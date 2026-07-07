// BRIEF-ASSIST-1 — vendor ask contract: ask-only, category-grounded, leak-free.

import { draftVendorBriefAsk } from '../doItForMe';
import { buildVendorBriefPayload } from '../vendorBrief';
import { appendDecision, makeRecord } from '../decisionMemory';

const ASSERTION_BAN = /you are fully paid|insurance is approved|confirmed your load-in|power available|main entrance\.|arrive at \d|you confirmed/i;
const PRIVATE_BAN = /budget|deposit|payment|rationale|planner note|private|guest list/i;

const ev = (over = {}) => ({
  id: 'e-ba', recordKind: 'host_event', name: 'BA Retirement', type: 'Retirement Party',
  date: '2026-08-01', venue: 'VFW Post 3150', guestMode: 'count', guestCount: 60,
  guests: [], budget: [{ id: 'b1', category: 'Food', budgeted: 900 }], timeline: [], vendors: [], ...over,
});
const vend = (over = {}) => ({ id: 'v-ba', name: 'Capital Rotisserie Catering', category: 'Catering', ...over });

test('1+6 · unknown category and missing name degrade to the generic safe ask', () => {
  const d = draftVendorBriefAsk(ev(), { id: 'x', name: '', category: 'Mystery' });
  expect(d.body).toMatch(/^Hi there — I’m getting the event brief ready/);
  expect(d.body).toContain('Your arrival/setup time');
  expect(d.body).toContain('Anything you need from the venue or host before event day');
});

test('2 · catering asks category-safe questions', () => {
  const d = draftVendorBriefAsk(ev(), vend());
  expect(d.body).toContain('final guest count or serving count');
  expect(d.body).toContain('setup, table, or service-timing');
});

test('3+4+5 · photo / DJ / venue categories get grounded asks', () => {
  expect(draftVendorBriefAsk(ev(), vend({ category: 'Photography' })).body).toMatch(/shot list, timeline, or location details/);
  expect(draftVendorBriefAsk(ev(), vend({ category: 'DJ' })).body).toMatch(/power and setup-space needs/);
  expect(draftVendorBriefAsk(ev(), vend({ category: 'Venue' })).body).toMatch(/Load-in access — what time and through which entrance/);
});

test('7 · asks only for MISSING basics — never invents or re-asks known ones', () => {
  const known = draftVendorBriefAsk(ev(), vend({ arrivalTime: '14:30', onSiteContactName: 'Dana', onSitePhone: '555' }));
  expect(known.body).not.toContain('Your arrival/setup time');
  expect(known.body).not.toContain('on-site contact and phone number');
  expect(known.body).not.toMatch(/arrive at 2:30|14:30/); // never asserts the known time either
});

test('8+9+10+11 · never asserts payment/insurance/confirmation; never leaks rationale or private data', () => {
  const e = appendDecision(ev(), makeRecord({
    decisionType: 'vendor_selection', subjectId: 'v-ba', subjectLabel: 'Capital Rotisserie Catering',
    decision: 'Confirmed', rationale: 'SECRET-RATIONALE the quartermaster trusts them', eventId: 'e-ba',
  }, '2026-07-07T12:00:00.000Z'));
  ['Catering', 'Photography', 'DJ', 'Venue', 'Rentals', 'Mystery'].forEach((category) => {
    const d = draftVendorBriefAsk(e, vend({ category }));
    const all = d.subject + ' ' + d.body;
    expect(all).not.toMatch(ASSERTION_BAN);
    expect(all).not.toMatch(PRIVATE_BAN);
    expect(all).not.toContain('SECRET-RATIONALE');
  });
});

test('14 · public brief payload never contains the ask draft', () => {
  const e = ev({ vendors: [vend()] });
  const draft = draftVendorBriefAsk(e, e.vendors[0]).body;
  const payload = JSON.stringify(buildVendorBriefPayload(e.vendors[0], e, [], null));
  expect(payload).not.toContain('getting the event brief ready');
  expect(payload).not.toContain(draft.slice(0, 40));
});
