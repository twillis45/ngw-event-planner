// ─── THE VENUE LEADS THE STAY (owner rulings 11/20/2026) ────────────────────
//
// "Approve": on a destination or trip whose venue is not picked yet, the venue
// leads the board, then "How are guests staying?" — even past its window.
// "Venue leads both": the venue goes to the TOP, ahead of the travel-mix
// question and any other past-window decision. Set or parked: today's order.
//
// Driven through the real engine (eventPlan) so the premise is the board's own
// ranking, not a hand-built list: at 209 days out both T-210d decisions have
// just passed their window and outrank the venue before the rule runs.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { venueLeadsStay, venueLeadsStayApplies } from '../venueLeadsStay';
import { parkVenuePatch, VENUE_BLOCKER } from '../venuePark';

// The LOCAL calendar date n days on. toISOString() is the UTC date, a day off
// at UTC-11 (CI runs TZ=Pacific/Midway), which put 209 days on the stay window's edge.
const dateIn = (n) => { const d = new Date(); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const santaFe = (days, extra) => ({
  id: 'e2e-venue', name: 'Mom’s 80th', type: 'Birthday', date: dateIn(days), endDate: dateIn(days + 4),
  isDestination: true, venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 10, totalBudget: 4000,
  budget: [], vendors: [], guests: [], ...extra,
});
const ranked = (ev) => eventPlan(ev, buildExperienceContext(ev, null, 1)).nextActions;
const ids = (q) => q.map((a) => a.id);
const isVenue = (a) => a && a.blockerType === VENUE_BLOCKER;
const STAY = 'decision:dest_lodging';
const MIX = 'decision:dest_travelmix';

describe('venue unset on a destination: the venue leads', () => {
  test.each([209, 150])('%i days out (past the stay window)', (days) => {
    const ev = santaFe(days);
    const before = ranked(ev);
    // Premise: without the rule the past-window decisions lead.
    expect(isVenue(before[0])).toBe(false);
    expect(ids(before)).toEqual(expect.arrayContaining([STAY, MIX]));
    const after = venueLeadsStay(before, ev);
    expect(isVenue(after[0])).toBe(true);
    // The stay is next, and the travel mix still shows beneath it.
    expect(after[1].id).toBe(STAY);
    expect(ids(after)).toContain(MIX);
    // Each keeps its window: the same objects, still past due.
    for (const id of [STAY, MIX]) {
      const a = after.find((x) => x.id === id);
      expect(a).toBe(before.find((x) => x.id === id));
      expect(a.dueInDays).toBeLessThan(0);
    }
    // Nothing else moved: everything but the venue keeps its relative order.
    expect(ids(after.slice(1))).toEqual(ids(before.filter((a) => !isVenue(a))));
  });

  test('240 days out (before the stay window): the venue already leads, unchanged', () => {
    const ev = santaFe(240);
    const before = ranked(ev);
    expect(isVenue(before[0])).toBe(true);
    expect(ids(venueLeadsStay(before, ev))).toEqual(ids(before));
  });

  test('60 days out (decisions grouped): unchanged', () => {
    const ev = santaFe(60);
    const before = ranked(ev);
    expect(ids(before)).toContain('bundle:decisions');
    expect(ids(venueLeadsStay(before, ev))).toEqual(ids(before));
  });
});

describe('today\'s order stands', () => {
  test.each([209, 240])('venue set, %i days out', (days) => {
    const ev = santaFe(days, { venue: 'La Fonda on the Plaza' });
    expect(venueLeadsStayApplies(ev)).toBe(false);
    const before = ranked(ev);
    expect(venueLeadsStay(before, ev)).toBe(before);
    if (days === 209) expect(before[0].id).toBe(STAY);
  });

  test.each([209, 240])('venue parked ("I\'ll sort this"), %i days out', (days) => {
    const base = santaFe(days);
    const ev = { ...base, ...parkVenuePatch(base) };
    expect(venueLeadsStayApplies(ev)).toBe(false);
    const before = ranked(ev);
    expect(venueLeadsStay(before, ev)).toBe(before);
    if (days === 209) expect(before[0].id).toBe(STAY);
  });

  test('not a destination or trip: unchanged even with a venue item behind others', () => {
    const ev = santaFe(209, { isDestination: false, endDate: '' });
    expect(venueLeadsStayApplies(ev)).toBe(false);
    const q = [{ id: 'x', title: 'Something else' }, { id: 'top:blocker:venue', blockerType: VENUE_BLOCKER }];
    expect(venueLeadsStay(q, ev)).toBe(q);
  });

  test('a multi-day local trip counts as a trip', () => {
    const ev = santaFe(209, { isDestination: false });
    expect(venueLeadsStayApplies(ev)).toBe(true);
  });
});

// The ruling moves the venue ahead of DECISIONS ("ahead of the stay, the travel
// mix, and any other past-window decision"). Money that is due is not a
// decision: the venue never jumps an item that is not one.
describe('the venue passes decisions only', () => {
  test('an overdue payment above the decisions stays first', () => {
    const ev = santaFe(209);
    const pay = { id: 'pay:deposit-overdue', title: 'Pay the caterer deposit', dueInDays: -2 };
    const q = [pay, ...ranked(ev)];   // pay | stay | travel mix | venue | …
    const after = venueLeadsStay(q, ev);
    expect(after[0]).toBe(pay);
    expect(isVenue(after[1])).toBe(true);
    expect(after[2].id).toBe(STAY);
  });

  test('a payment between the decisions and the venue holds the venue below it', () => {
    const ev = santaFe(209);
    const pay = { id: 'pay:deposit-overdue', title: 'Pay the caterer deposit', dueInDays: -2 };
    const before = ranked(ev);
    const venue = before.find(isVenue);
    const decisions = before.filter((a) => !isVenue(a));
    const q = [...decisions, pay, venue];
    expect(ids(venueLeadsStay(q, ev))).toEqual(ids(q));
  });
});
