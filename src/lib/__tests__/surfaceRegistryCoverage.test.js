// WAVE-5 COVERAGE — the four hand-wired `attn` booleans, the helper confirms, the
// overdue decisions beyond the ladder's one, and the one-slot payment/COI tiers all
// enter the ledger. Every fixture below was probed against the real engine (not
// assumed): buildSeatingPlan, buildTravelPlan, deriveHelperResponsibilities,
// playbookDecisionBoard, and the vendor COI classifier all run for real in these
// tests — a fixture that doesn't exercise the predicate would fail, not vacuously pass.

import { raiseAll, raiseCounts } from '../surfaceRegistry';
import { eventPlan } from '../../CommandCenter';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const feast = (over = {}) => ({
  id: 's', type: 'Crab Feast', name: 'Feast', date: iso(20),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], vendors: [], timeline: [], ...over,
});

const bySurface = (ev, id) => raiseAll(ev).filter((r) => r.surface === id);

// The SAME normalization eventPlan dedups on (CommandCenter titleKey) — asserting
// title parity with the ladder means asserting THIS collapses the two copies.
const titleKey = (t) => String(t || '').toLowerCase().replace(/·[^·]*$/, '').replace(/[.\s]+$/, '').trim();
const assertNoDuplicateTitles = (ev) => {
  const keys = eventPlan(ev).nextActions.map((a) => titleKey(a.title));
  expect(keys.length).toBe(new Set(keys).size);
  return eventPlan(ev).nextActions;
};

// ─── seating ──────────────────────────────────────────────────────────────────
describe('seating — the shell qidx attn boolean, now in the ledger', () => {
  const seated = (over = {}) => feast({
    guests: [
      { id: 'g1', name: 'Ava Bell', rsvp: 'Yes' },              // confirmed, no table
      { id: 'g2', name: 'Ben Cole', rsvp: 'Yes', table: 1 },    // confirmed, seated
      { id: 'g3', name: 'Cy Dean', rsvp: 'Maybe' },             // not confirmed — never counted
    ],
    ...over,
  });

  test('an unassigned confirmed guest raises, routed to that guest’s own seating row', () => {
    const raised = bySurface(seated(), 'seating');
    expect(raised.length).toBe(1);
    expect(raised[0].severity).toBe('attention');
    expect(raised[0].title).toBe('1 confirmed guest still needs a seat');
    expect(raised[0].why).toBe('1 of 2 confirmed guests are seated');
    expect(raised[0].route).toEqual({ tab: 'Seating', guestId: 'g1' });
  });

  test('seating everyone clears it — the badge counts something clearing the work clears', () => {
    const ev = seated();
    expect(raiseCounts(ev).seating).toBe(1);
    const done = seated({ guests: ev.guests.map((g) => (g.id === 'g1' ? { ...g, table: 2 } : g)) });
    expect(bySurface(done, 'seating')).toEqual([]);
  });

  test('a headcount-only event never raises — guests are never invented to seat', () => {
    expect(bySurface(feast(), 'seating')).toEqual([]);  // guestCount 18, roster empty
  });

  test('a roster with no confirmed guests never raises', () => {
    const ev = feast({ guests: [{ id: 'g1', name: 'Ava Bell', rsvp: 'Maybe' }] });
    expect(bySurface(ev, 'seating')).toEqual([]);
  });
});

// ─── lodging ──────────────────────────────────────────────────────────────────
describe('lodging — a real gap AND a real dated obligation, or silence', () => {
  const dest = (over = {}) => feast({
    isDestination: true,
    lodging: { hotelName: 'Bay Inn', deadline: iso(10) },
    guests: [
      { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { lodging: { status: 'booked' } } },
      { id: 'g2', name: 'Ben Cole', rsvp: 'Pending' },           // traveler, nothing booked
    ],
    ...over,
  });

  test('not-booked guests + a booking deadline → one raise, routed to the deadline card', () => {
    const raised = bySurface(dest(), 'lodging');
    expect(raised.length).toBe(1);
    expect(raised[0].severity).toBe('attention');
    expect(raised[0].title).toBe('1 of 2 haven’t booked a room yet');
    expect(raised[0].route).toEqual({ tab: 'Travel', focusField: 'lodging-deadline' });
  });

  test('no deadline → no raise, even with the same gap — no dated obligation, no interruption', () => {
    const ev = dest({ lodging: { hotelName: 'Bay Inn' } });
    expect(bySurface(ev, 'lodging')).toEqual([]);
  });

  test('everyone booked → clear', () => {
    const ev = dest({
      guests: [
        { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { lodging: { status: 'booked' } } },
        { id: 'g2', name: 'Ben Cole', rsvp: 'Pending', travel: { lodging: { status: 'confirmed' } } },
      ],
    });
    expect(bySurface(ev, 'lodging')).toEqual([]);
  });

  test('a non-destination event never raises — the engine’s own relevance gate', () => {
    const ev = dest({ isDestination: false });
    expect(bySurface(ev, 'lodging')).toEqual([]);
  });
});

// ─── travel-air ───────────────────────────────────────────────────────────────
describe('travel-air — the lib’s own conflicts, one raise per conflicted guest', () => {
  const dest = (over = {}) => feast({
    date: iso(10), isDestination: true,
    guests: [
      { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { air: { arriveDate: iso(11) } } },  // lands after start
      { id: 'g2', name: 'Ben Cole', rsvp: 'Yes', travel: { air: { arriveDate: iso(9), departDate: iso(9) } } }, // leaves before end
      { id: 'g3', name: 'Cy Dean', rsvp: 'Yes' },                                              // no flight info — no claim
    ],
    ...over,
  });

  test('two conflicts → two raises, each on the guest’s own arrivals-board row', () => {
    const raised = bySurface(dest(), 'travel-air');
    expect(raised.length).toBe(2);
    expect(new Set(raised.map((r) => r.route.guestId))).toEqual(new Set(['g1', 'g2']));
    for (const r of raised) {
      expect(r.severity).toBe('attention');
      expect(r.route.tab).toBe('Travel');
      expect(r.route.focusField).toBe('air-board');
      expect(r.why).toBeTruthy(); // the lib's own conflict copy rides along
    }
    expect(raised.find((r) => r.route.guestId === 'g1').title).toBe('Ava Bell lands after the event starts');
    expect(raised.find((r) => r.route.guestId === 'g2').title).toBe('Ben Cole’s flight leaves before the event ends');
  });

  test('flights inside the window raise nothing — a conflict is never invented', () => {
    const ev = dest({
      guests: [{ id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { air: { arriveDate: iso(9), departDate: iso(10) } } }],
    });
    expect(bySurface(ev, 'travel-air')).toEqual([]);
  });
});

// ─── travel-ground ────────────────────────────────────────────────────────────
describe('travel-ground — the ride gap the host closes, one aggregate raise', () => {
  const dest = (over = {}) => feast({
    isDestination: true,
    guests: [
      { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { ground: { needsRide: true } } },
      { id: 'g2', name: 'Ben Cole', rsvp: 'Yes', travel: { ground: { needsRide: true } } },
    ],
    ...over,
  });

  test('riders with no seats and no group-transport decision → one raise to the riders block', () => {
    const raised = bySurface(dest(), 'travel-ground');
    expect(raised.length).toBe(1);
    expect(raised[0].severity).toBe('attention');
    expect(raised[0].title).toBe('2 guests still need a way around');
    expect(raised[0].why).toMatch(/2 need a ride · 0 seats offered/);
    expect(raised[0].route).toEqual({ tab: 'Travel', focusField: 'ground-riders' });
  });

  test('deciding on group transport clears it — the shuttle IS the answer', () => {
    const ev = dest({ foodChoices: { dest_transport: 'Yes — arrange group transport' } });
    expect(bySurface(ev, 'travel-ground')).toEqual([]);
  });

  test('enough offered seats clears it — the math is the lib’s, not ours', () => {
    const ev = dest({
      guests: [
        { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { ground: { needsRide: true } } },
        { id: 'g2', name: 'Ben Cole', rsvp: 'Yes', travel: { ground: { needsRide: true } } },
        { id: 'g3', name: 'Cy Dean', rsvp: 'Yes', travel: { ground: { canOfferRide: true, seats: 2 } } },
      ],
    });
    expect(bySurface(ev, 'travel-ground')).toEqual([]);
  });
});

// ─── helpers ──────────────────────────────────────────────────────────────────
describe('helpers — dayBefore’s confirm asks, raised only inside its own window', () => {
  const nearWithHelper = (over = {}) => feast({
    date: iso(1),
    timeline: [{ id: 't1', task: 'the ice run', owner: 'Marcus' }],
    ...over,
  });

  test('inside the window (T-1), an assigned helper raises, routed to the helper’s own row', () => {
    const raised = bySurface(nearWithHelper(), 'helpers');
    expect(raised.length).toBe(1);
    expect(raised[0].severity).toBe('attention');
    expect(raised[0].title).toBe('Confirm Marcus is still bringing the ice run');
    expect(raised[0].why).toBe('Assigned to Marcus, but not confirmed');
    expect(raised[0].route).toEqual({ tab: 'Planning Tasks', taskId: 't1' });
  });

  test('outside the window (T-5), the same assignment raises nothing — same gate dayBefore uses', () => {
    expect(bySurface(nearWithHelper({ date: iso(5) }), 'helpers')).toEqual([]);
  });

  test('a recorded confirm clears it — assigned is the only asking state', () => {
    const ev = nearWithHelper({ helperConfirmed: { t1: true } });
    expect(bySurface(ev, 'helpers')).toEqual([]);
  });

  test('the host is never their own helper', () => {
    const ev = nearWithHelper({ timeline: [{ id: 't1', task: 'the ice run', owner: 'Host' }] });
    expect(bySurface(ev, 'helpers')).toEqual([]);
  });
});

// ─── decisions ────────────────────────────────────────────────────────────────
describe('decisions — every overdue board decision raises, not just the ladder’s one', () => {
  // Crab Feast authors real decision windows (steam_vs_order T-7d, where_buy T-10d…).
  // 5 days out with no createdAt (legacy ⇒ assumed reachable) they are genuinely
  // overdue by the board's own rules.
  const late = (over = {}) => feast({ date: iso(5), ...over });

  test('multiple overdue decisions → multiple raises, each on its own decision row', () => {
    const raised = bySurface(late(), 'decisions');
    expect(raised.length).toBeGreaterThan(1);   // the re-score's exact finding: beyond one
    const titles = raised.map((r) => r.title);
    expect(titles).toContain('Resolve "Steam them yourself or order them steamed (pickup)".');
    expect(titles).toContain('Resolve "Where to buy".');
    for (const r of raised) {
      expect(r.severity).toBe('attention');     // a late chore, not an emergency
      expect(r.route.tab).toBe('Decisions');
      expect(r.route.decisionId).toBeTruthy();  // the row, never the board top
      expect(r.why).toMatch(/due .* ago/i);     // the board's own overdue line
    }
    // Distinct rows — one raise per decision, no shadowing.
    expect(new Set(raised.map((r) => r.route.decisionId)).size).toBe(raised.length);
  });

  test('the reachability guard is inherited: a brand-new tight-timeline event is calm', () => {
    // Created today, event in 5 days — a T-7d/T-10d window was never reachable.
    expect(bySurface(late({ createdAt: iso(0) }), 'decisions')).toEqual([]);
  });

  test('locking a decision clears exactly that raise', () => {
    const before = bySurface(late(), 'decisions').map((r) => r.route.decisionId);
    expect(before).toContain('steam_vs_order');
    const after = bySurface(late({ foodChoices: { steam_vs_order: 'Order steamed for pickup' } }), 'decisions');
    expect(after.map((r) => r.route.decisionId)).not.toContain('steam_vs_order');
  });

  test('on the day itself, silence — the Day stage is the list (the ladder’s own gate)', () => {
    expect(bySurface(late({ date: iso(0) }), 'decisions')).toEqual([]);
  });

  test('TITLE PARITY: the ladder and the registry never show the same decision twice', () => {
    const actions = assertNoDuplicateTitles(late());
    // UPDATED (wave-6, 2026-07-15): ≥3 decision raises now collapse into ONE bundle
    // action ({ kind:'bundle', items:[…] }) — the raises still reach the merged list,
    // as the bundle's own children, each keeping its 'Resolve "…".' row-level copy.
    const asRows = actions.flatMap((a) => (a.kind === 'bundle' ? a.items : [a]));
    expect(asRows.some((a) => /^Resolve "/.test(String(a.title || '')))).toBe(true);
  });
});

// ─── vendor-payments ──────────────────────────────────────────────────────────
describe('vendor-payments — one raise per overdue payment; the one-slot tier no longer shadows', () => {
  const owing = (over = {}) => feast({
    vendors: [
      { id: 'v1', name: 'Bay Catering', category: 'Catering', cost: 1200, payDueDate: iso(-3) },
      { id: 'v2', name: 'Sable & Sound', category: 'DJ', cost: 800, payDueDate: iso(-1) },
    ],
    ...over,
  });

  test('TWO overdue payments → BOTH raise, critical, distinct payment rows', () => {
    const raised = bySurface(owing(), 'vendor-payments');
    expect(raised.length).toBe(2);
    expect(new Set(raised.map((r) => r.route.vendorId))).toEqual(new Set(['v1', 'v2']));
    for (const r of raised) {
      expect(r.severity).toBe('critical');      // reactive, real money to a real vendor
      expect(r.route.tab).toBe('Vendors');
      expect(r.route.vendorSection).toBe('payment');
    }
    expect(raised.map((r) => r.title).sort()).toEqual([
      'Send payment to Bay Catering.',          // the ladder's exact phrasing — parity by construction
      'Send payment to Sable & Sound.',
    ]);
  });

  test('TITLE PARITY with the ladder: two overdue payments → exactly two cards, never three', () => {
    const actions = assertNoDuplicateTitles(owing());
    const pays = actions.filter((a) => /^Send payment to /.test(String(a.title || '')));
    expect(pays.length).toBe(2);                // ladder's copy + ours collapsed; the second vendor added
    expect(new Set(pays.map((a) => (a.route || {}).vendorId))).toEqual(new Set(['v1', 'v2']));
  });

  test('paying clears exactly that vendor; the other stays', () => {
    const ev = owing();
    const paid = { ...ev, vendors: ev.vendors.map((v) => (v.id === 'v1' ? { ...v, balancePaid: true } : v)) };
    const raised = bySurface(paid, 'vendor-payments');
    expect(raised.length).toBe(1);
    expect(raised[0].route.vendorId).toBe('v2');
  });

  test('a future due date, or no cost, never raises — a chip, not an interruption', () => {
    const ev = feast({
      vendors: [
        { id: 'v1', name: 'Bay Catering', cost: 1200, payDueDate: iso(3) },
        { id: 'v2', name: 'Sable & Sound', cost: 0, payDueDate: iso(-3) },
      ],
    });
    expect(bySurface(ev, 'vendor-payments')).toEqual([]);
  });
});

// ─── vendor-coi ───────────────────────────────────────────────────────────────
describe('vendor-coi — overdue asks only, severity is the classifier’s own', () => {
  test('a requested COI past its 30-day line → critical, the classifier’s call', () => {
    const ev = feast({ date: iso(10), vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', coiStatus: 'requested' }] });
    const raised = bySurface(ev, 'vendor-coi');
    expect(raised.length).toBe(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].title).toBe('Get proof Bay Catering is insured.');  // coiNextAction's copy, same as the ladder
    expect(raised[0].route).toEqual({ tab: 'Vendors', vendorId: 'v1', vendorSection: 'documents' });
  });

  test('received-but-unverified past the line → attention, NOT critical — the ladder never called it critical', () => {
    const ev = feast({ date: iso(10), vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', coiStatus: 'received' }] });
    const raised = bySurface(ev, 'vendor-coi');
    expect(raised.length).toBe(1);
    expect(raised[0].severity).toBe('attention');
    expect(raised[0].title).toBe("Check Bay Catering's insurance proof.");
  });

  test('a requested COI still ahead of its line raises nothing', () => {
    const ev = feast({ date: iso(60), vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', coiStatus: 'requested' }] });
    expect(bySurface(ev, 'vendor-coi')).toEqual([]);
  });

  test('not-required stays silent, and an informal helper is never asked for insurance', () => {
    const ev = feast({
      date: iso(10),
      vendors: [
        { id: 'v1', name: 'Bay Catering', coiStatus: 'not_required' },
        { id: 'v2', name: 'Aunt Carol', category: 'Desserts', isInformal: true },
      ],
    });
    expect(bySurface(ev, 'vendor-coi')).toEqual([]);
  });

  test('TITLE PARITY: the ladder’s critical COI card and the registry’s collapse to one', () => {
    const ev = feast({ date: iso(10), vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', coiStatus: 'requested' }] });
    const actions = assertNoDuplicateTitles(ev);
    const cois = actions.filter((a) => titleKey(a.title) === titleKey('Get proof Bay Catering is insured.'));
    expect(cois.length).toBe(1);
  });
});

// ─── cross-surface guards ─────────────────────────────────────────────────────
describe('guards every new surface shares', () => {
  test('a past event raises nothing from any wave-5 surface', () => {
    const ev = feast({
      date: iso(-2), isDestination: true,
      lodging: { hotelName: 'Bay Inn', deadline: iso(-10) },
      guests: [{ id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { ground: { needsRide: true }, air: { arriveDate: iso(-1) } } }],
      vendors: [{ id: 'v1', name: 'Bay Catering', cost: 1200, payDueDate: iso(-9), coiStatus: 'requested' }],
      timeline: [{ id: 't1', task: 'the ice run', owner: 'Marcus' }],
    });
    expect(raiseAll(ev)).toEqual([]);
  });

  test('every wave-5 raise is row-level — tab plus the row key its sheet focuses', () => {
    const WAVE5 = new Set(['seating', 'lodging', 'travel-air', 'travel-ground', 'helpers', 'decisions', 'vendor-payments', 'vendor-coi']);
    const ev = feast({
      date: iso(5), isDestination: true,
      lodging: { hotelName: 'Bay Inn', deadline: iso(2) },
      guests: [
        { id: 'g1', name: 'Ava Bell', rsvp: 'Yes', travel: { ground: { needsRide: true }, air: { arriveDate: iso(6) } } },
        { id: 'g2', name: 'Ben Cole', rsvp: 'Yes', table: 1 },
      ],
      vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', cost: 1200, payDueDate: iso(-3), coiStatus: 'requested' }],
    });
    const raised = raiseAll(ev).filter((r) => WAVE5.has(r.surface));
    expect(raised.length).toBeGreaterThan(0);
    for (const r of raised) {
      expect(r.route && r.route.tab).toBeTruthy();
      const rowKey = r.route.vendorId || r.route.guestId || r.route.decisionId || r.route.taskId || r.route.focusField;
      expect({ surface: r.surface, title: r.title, hasRowKey: !!rowKey })
        .toEqual({ surface: r.surface, title: r.title, hasRowKey: true });
    }
  });
});
