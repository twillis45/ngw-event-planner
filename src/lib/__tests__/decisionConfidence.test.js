// Sprint 57J — Decision Confidence reader. Proves: reuses existing resolvers;
// guest count resolved/unresolved; seating blocked by guest count; vendor/timeline
// from getEventReadiness; staffing from crew; DEFERRED decisions never emitted;
// per-persona "ready" copy; flag gate.

import { decisionsOn, decisionsActive, decisionConfidence, DEFERRED_DECISIONS, COPY } from '../decisionConfidence';

const ON = { status: 'ON_TRACK', note: '3 confirmed' };
const ATT = { status: 'ATTENTION', note: '2 overdue' };
const readyAll = { vendor: ON, timeline: ON };
const get = (items, key) => items.find((i) => i.key === key);

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('57J flag gate', () => {
  test('default OFF', () => { expect(decisionsOn()).toBe(false); expect(decisionsActive()).toBe(false); });
  test('ON via localStorage', () => { localStorage.setItem('ngw-pi-decisions', '1'); expect(decisionsActive()).toBe(true); });
});

describe('57J Guest Count — reuses guestCountResolved()', () => {
  test('resolved ⇒ ready_to_lock with the persona "ready" line', () => {
    const ev = { audience: 'self_family', guests: [{ rsvp: 'Yes' }, { rsvp: 'Yes' }], guestCount: 2 };
    const g = get(decisionConfidence(ev, {}), 'guestCount');
    expect(g.state).toBe('ready_to_lock');
    expect(g.confidence).toBe('You have enough to decide.'); // host
    expect(g.primaryAction).toBe('Lock it');
  });
  test('unresolved (pending RSVPs) ⇒ gathering + count of pending', () => {
    const ev = { guests: [{ rsvp: 'Yes' }, { rsvp: 'Maybe' }, { rsvp: '' }] };
    const g = get(decisionConfidence(ev, {}), 'guestCount');
    expect(g.state).toBe('gathering');
    expect(g.reason).toMatch(/Waiting on 2 RSVPs/);
  });
});

describe('57J Seating — prereq is guest count', () => {
  test('blocked when guest count unresolved', () => {
    const ev = { guests: [{ rsvp: 'Yes' }, { rsvp: 'Maybe' }] };
    const s = get(decisionConfidence(ev, {}), 'seating');
    expect(s.state).toBe('blocked');
    expect(s.blockers).toContain('guestCount');
    expect(s.reason).toMatch(/depends on the final guest count/);
  });
  test('ready_to_lock when resolved + all confirmed seated', () => {
    const ev = { guestCount: 2, guests: [{ rsvp: 'Yes', table: 'T1' }, { rsvp: 'Yes', table: 'T2' }] };
    expect(get(decisionConfidence(ev, {}), 'seating').state).toBe('ready_to_lock');
  });
  test('gathering when some confirmed unseated', () => {
    const ev = { guestCount: 2, guests: [{ rsvp: 'Yes', table: 'T1' }, { rsvp: 'Yes' }] };
    expect(get(decisionConfidence(ev, {}), 'seating').state).toBe('gathering');
  });
});

describe('57J Vendor + Timeline — reuse getEventReadiness (no new math)', () => {
  test('vendor ON_TRACK ⇒ ready_to_lock; else gathering', () => {
    const ev = { guests: [] };
    expect(get(decisionConfidence(ev, { vendor: ON }), 'vendors').state).toBe('ready_to_lock');
    expect(get(decisionConfidence(ev, { vendor: ATT }), 'vendors').state).toBe('gathering');
  });
  test('timeline overdue surfaces from the note', () => {
    const ev = { guests: [] };
    expect(get(decisionConfidence(ev, { timeline: ATT }), 'timeline').state).toBe('overdue');
    expect(get(decisionConfidence(ev, { timeline: ON }), 'timeline').state).toBe('ready_to_lock');
  });
});

describe('57J Staffing — reuse summarizeCrew; skip when unstaffed', () => {
  test('no crew ⇒ no staffing item (host events)', () => {
    const ev = { guests: [] };
    expect(get(decisionConfidence(ev, {}), 'staffing')).toBeUndefined();
  });
  test('all confirmed ⇒ ready_to_lock; needs-confirmation ⇒ gathering', () => {
    const a = { guests: [], crew: [{ status: 'confirmed' }, { status: 'confirmed' }] };
    expect(get(decisionConfidence(a, {}), 'staffing').state).toBe('ready_to_lock');
    const b = { guests: [], crew: [{ status: 'confirmed' }, { status: 'needs_confirmation' }] };
    expect(get(decisionConfidence(b, {}), 'staffing').state).toBe('gathering');
  });
});

describe('57J DEFERRED — never emitted, never claimed ready', () => {
  test('no budget / venue / menu items appear (AP-005)', () => {
    const ev = { audience: 'client', guestCount: 2, guests: [{ rsvp: 'Yes', table: 'T1' }, { rsvp: 'Yes', table: 'T2' }], venue: 'VFW Hall', budgetApproved: false, budget: [{ budgeted: 500 }] };
    const keys = decisionConfidence(ev, readyAll).map((i) => i.key);
    ['budgetApproval', 'venue', 'menu'].forEach((k) => expect(keys).not.toContain(k));
    expect(DEFERRED_DECISIONS).toEqual(['budgetApproval', 'venue', 'menu']);
  });
});

describe('57J persona copy', () => {
  const ev = { guestCount: 1, guests: [{ rsvp: 'Yes' }] };
  test('host + planner "ready" lines differ (live); operator copy authored', () => {
    expect(get(decisionConfidence({ ...ev, audience: 'self_family' }, {}), 'guestCount').confidence).toBe('You have enough to decide.');
    expect(get(decisionConfidence({ ...ev, audience: 'client' }, {}), 'guestCount').confidence).toBe('Decision ready.');
    // operator persona activates with the organization→operator remap (PR #52);
    // its copy is authored and ready now.
    expect(COPY.operator.ready).toBe('Ready for sign-off.');
    expect(COPY.operator.lock).toBe('Confirm');
  });
  test('null event is safe', () => { expect(decisionConfidence(null, null)).toEqual([]); });
});
