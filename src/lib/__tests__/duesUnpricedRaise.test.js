// ─── A DECLARED POOL NOBODY HAD BEEN GIVEN A NUMBER FOR ─────────────────────
//
// Coverage gap, 2026-08-17: `grep -c costSharing src/lib/surfaceRegistry.js`
// returned 0. Cost sharing had a sheet, an engine and a section-directory row,
// and nothing that could raise.
//
// THE RAISE THAT WAS REFUSED. "Your guests still owe you $600" is unbuildable:
// costSharingSummary returns tiers and amounts with NO headcount and NO
// per-guest payment record (costSharing.js:36 — "with per-tier headcounts
// unknown, no pool total exists"). It would invent the debt, not just its
// timing. This file exists partly to keep that refusal recorded.
//
// THE THRESHOLD IS BORROWED. The pool carries no date, so the raise waits for a
// real authored bill — a vendor's host-entered payDueDate — the same field
// `vendor-payments` gates on. Every refusal below is red-proofed.
import { raiseAll } from '../surfaceRegistry';
import { resolveRoute } from '../routeResolver';

const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Destination event — cost sharing does not exist on a local one, so the
// fixture must clear buildTravelPlan().relevant before anything else is tested.
const EV = (over = {}) => ({
  id: 'ev-dues', type: 'Family Reunion', date: isoIn(60),
  venue: 'The Lodge', venueCity: 'Asheville, NC', venueState: 'NC',
  guestMode: 'count', guestCount: 40, totalBudget: 9000,
  destination: true, isDestination: true, travelRequired: true,
  guests: [
    { id: 'g1', name: 'Ada', fromCity: 'Chicago, IL', needsLodging: true },
    { id: 'g2', name: 'Bo', fromCity: 'Denver, CO', needsLodging: true },
  ],
  vendors: [
    { id: 'v1', name: 'Blue Ridge Catering', category: 'Caterer', status: 'Booked',
      cost: 3200, payDueDate: isoIn(9), balancePaid: false },
  ],
  costSharing: {
    mode: 'pooled-dues', reason: 'we do this every year', cadence: 'monthly',
    tiers: [{ label: 'Working adults', amount: 50 }, { label: 'Students' }],
  },
  ...over,
});

const dues = (event) => (raiseAll(event) || []).filter((r) => r && r.key === 'dues-unpriced');

describe('it asks the host for the number, once a real bill is coming', () => {
  test('PREMISE — the fixture is a destination event and the ledger is real', () => {
    // If travelPlan stops reading this fixture as a destination, every refusal
    // below passes trivially and this file silently stops gating anything.
    expect((raiseAll(EV()) || []).length).toBeGreaterThan(3);
    expect(dues(EV()).length).toBe(1);
  });

  test('an unpriced tier is raised, and names the bill that forces it', () => {
    const row = dues(EV())[0];
    expect(row.title).toBe('Set what each group contributes.');
    expect(row.why).toMatch(/Blue Ridge Catering/);
    expect(row.why).toMatch(/due in 9 days/);
    expect(row.dueInDays).toBe(9);
  });

  test('no tiers at all reads differently from a partly-priced one', () => {
    const row = dues(EV({ costSharing: { mode: 'pooled-dues', tiers: [] } }))[0];
    expect(row.why).toMatch(/haven't set the tiers yet/);
  });

  test('nearness rides dueInDays, because severity cannot carry it', () => {
    // Written asserting `urgent` at 3 days; it came back `attention`. raiseAll
    // collapses every non-critical severity to 'attention' (~:1028), so an
    // authored 'urgent' evaporates — a ninth casualty of the explicit-field-list
    // normalizer its own comment documents. (money-dates:540 authors 'urgent'
    // through the same pipe; that branch has never had an effect either.)
    // So the gate asserts what actually reaches the ranker.
    const near = EV({ vendors: [{ id: 'v1', name: 'Blue Ridge Catering', category: 'Caterer',
      status: 'Booked', cost: 3200, payDueDate: isoIn(3), balancePaid: false }] });
    expect(dues(near)[0].dueInDays).toBe(3);
    expect(dues(EV())[0].dueInDays).toBe(9);
    expect(dues(near)[0].severity).toBe('attention');
  });

  test('an overdue balance says so in the past tense', () => {
    const late = EV({ vendors: [{ id: 'v1', name: 'Blue Ridge Catering', category: 'Caterer',
      status: 'Booked', cost: 3200, payDueDate: isoIn(-4), balancePaid: false }] });
    expect(dues(late)[0].why).toMatch(/was due 4 days ago/);
  });

  test('THE ROUTE LANDS ON COST SHARING, NOT LODGING', () => {
    // `costshare` was not a routable kind: tab:'Travel' resolves to lodging, so
    // this raise would have opened "Where everyone stays". Red-proofed by
    // deleting the costshare branch in routeResolver — this returns 'lodging'.
    const r = resolveRoute(dues(EV())[0].route);
    expect(r).toEqual({ kind: 'costshare', focus: null });
  });
});

describe('and stays silent everywhere the claim would be unfounded', () => {
  test('A LOCAL EVENT HAS NO POOL TO SET UP', () => {
    // The sheet itself renders "This is a local event — everyone covers their
    // own costs." Raising here would speak where the surface refuses to exist.
    // The likeliest refusal to regress, since it lives outside costSharing.
    const local = EV({ destination: false, isDestination: false, travelRequired: false,
      guests: [{ id: 'g1', name: 'Ada' }, { id: 'g2', name: 'Bo' }] });
    expect(dues(local)).toEqual([]);
  });

  test('self-pay owes nobody a number', () => {
    expect(dues(EV({ costSharing: { mode: 'self-pay' } }))).toEqual([]);
    expect(dues(EV({ costSharing: undefined }))).toEqual([]);
  });

  test('a fully priced pool is finished setup', () => {
    expect(dues(EV({ costSharing: { mode: 'pooled-dues',
      tiers: [{ label: 'Working adults', amount: 50 }, { label: 'Students', amount: 20 }] } }))).toEqual([]);
  });

  test('NO BILL, NO NAGGING — the deadline is borrowed, never invented', () => {
    // The whole reason this raise is honest. With no authored payDueDate there
    // is no date the pool must meet, and inventing one to chase a host about
    // their friends' money is the worst available guess.
    expect(dues(EV({ vendors: [] }))).toEqual([]);
    expect(dues(EV({ vendors: [{ id: 'v1', name: 'X', cost: 3200 }] }))).toEqual([]);
  });

  test('a settled balance is not a coming bill', () => {
    expect(dues(EV({ vendors: [{ id: 'v1', name: 'X', category: 'Caterer', status: 'Booked',
      cost: 3200, payDueDate: isoIn(9), balancePaid: true }] }))).toEqual([]);
  });

  test('a past event raises nothing', () => {
    expect(dues(EV({ date: isoIn(-2) }))).toEqual([]);
  });

  test('junk input is answered, not thrown at', () => {
    expect(() => raiseAll(EV({ costSharing: { mode: 'pooled-dues', tiers: null } }))).not.toThrow();
    expect(() => raiseAll(EV({ costSharing: 'nonsense' }))).not.toThrow();
    expect(() => raiseAll(EV({ vendors: [null, {}] }))).not.toThrow();
  });
});
