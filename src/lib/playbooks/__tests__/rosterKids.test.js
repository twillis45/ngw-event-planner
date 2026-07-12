// A roster row's `kids` ("Children in Party") is ADDITIVE — a count of children an
// invited adult brings, not a subset of list.length and not a separate row. The
// headcount engine (attendanceBand → sizingGuests → eventSizing) used to ignore it
// entirely, so a roster of 10 adults each bringing 3 kids sized food for 10 people,
// not 40 — the kids were invisible. Separately, if a roster's kids DID reach the food
// engine (as event.kidsCount, which V2 auto-derives from the roster but legacy never
// sets in roster mode), the protein-discount math subtracted them from a `guests`
// total that never included them in the first place, undercounting toward the floor
// of 1 adult-equivalent instead of adding the kids at their discounted portion.
import { attendanceBand, playbookFoodPlan } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const guest = (rsvp, kids) => ({ name: 'g', rsvp, kids });
const ev = (guests, extra) => ({ id: 'e', type: 'Crab Feast', date: future, guests, ...extra });
const qtyById = (plan, id) => { const r = (plan.list || []).find((x) => x.id === id); return r ? r.qty : null; };

describe('attendanceBand — roster kids are additive, not invisible', () => {
  test('10 confirmed adults each bringing 3 kids resolves to 40, not 10', () => {
    const guests = Array.from({ length: 10 }, () => guest('yes', 3));
    const band = attendanceBand(ev(guests));
    expect(band.kids).toBe(30);
    expect(band.low).toBe(40);
    expect(band.high).toBe(40);
    expect(band.planning).toBe(40);
  });

  test('a declined row\'s kids never attend either — excluded from both low and high', () => {
    const guests = [guest('yes', 2), guest('yes', 2), guest('no', 5)];
    const band = attendanceBand(ev(guests));
    expect(band.kids).toBe(4);
    expect(band.low).toBe(2 + 4);
    expect(band.high).toBe(2 + 4);
  });

  test('a maybe/pending row\'s kids count toward the ceiling (high) but are not locked into the floor (low)', () => {
    const guests = [guest('yes', 2), guest('maybe', 3), guest('', 1)];
    const band = attendanceBand(ev(guests));
    expect(band.kids).toBe(6); // 2 + 3 + 1
    expect(band.low).toBe(1 + 2); // only the confirmed row's kids are locked in
    expect(band.high).toBe(3 + 6); // confirmed+maybe+pending rows (3) + all their kids (6)
  });

  test('no kids on any row is byte-identical to the pre-fix shape', () => {
    const guests = [guest('yes', 0), guest('yes'), guest('maybe', undefined)];
    const band = attendanceBand(ev(guests));
    expect(band.kids).toBe(0);
    expect(band.low).toBe(2);
    expect(band.high).toBe(3);
  });
});

describe('playbookFoodPlan — roster-mode kids now reach the protein discount', () => {
  test('a roster with brought kids sizes MORE total protein than the same adult count with none (the kids are real extra mouths)', () => {
    const noKids = playbookFoodPlan(ev(Array.from({ length: 10 }, () => guest('yes', 0))));
    const withKids = playbookFoodPlan(ev(Array.from({ length: 10 }, () => guest('yes', 3))));
    expect(qtyById(withKids, 'p_crabs')).toBeGreaterThan(qtyById(noKids, 'p_crabs'));
  });

  test('roster-mode kids scale LESS than if those same kids were counted as full adults (the 40% portion factor still applies)', () => {
    const kidsAsAdults = playbookFoodPlan(ev(Array.from({ length: 40 }, () => guest('yes', 0))));
    const tenAdultsPlusKids = playbookFoodPlan(ev(Array.from({ length: 10 }, () => guest('yes', 3))));
    expect(qtyById(tenAdultsPlusKids, 'p_crabs')).toBeLessThan(qtyById(kidsAsAdults, 'p_crabs'));
  });

  test('fixes legacy\'s roster-mode gap — event.kidsCount is never set there, but the roster\'s own kids field now still discounts protein', () => {
    // No event.kidsCount at all (legacy roster mode never writes it) — the roster's
    // per-guest kids field is the only signal, and it must still reach the discount.
    const guests = Array.from({ length: 10 }, () => guest('yes', 3));
    const plan = playbookFoodPlan(ev(guests));
    const allAdults = playbookFoodPlan(ev(Array.from({ length: 40 }, () => guest('yes', 0))));
    expect(qtyById(plan, 'p_crabs')).toBeLessThan(qtyById(allAdults, 'p_crabs'));
  });

  test('a stale/unrelated event.kidsCount does not affect a roster-mode plan — the roster is the single source once one exists', () => {
    const guests = Array.from({ length: 10 }, () => guest('yes', 0));
    const withoutStale = playbookFoodPlan(ev(guests));
    const withStale = playbookFoodPlan(ev(guests, { kidsCount: 999 }));
    expect(withStale.foodLow).toBe(withoutStale.foodLow);
    expect(withStale.foodHigh).toBe(withoutStale.foodHigh);
  });

  test('count-mode (no roster) is unaffected — still reads event.kidsCount exactly as before', () => {
    const a = playbookFoodPlan({ id: 'e', type: 'Crab Feast', date: future, guestMode: 'count', guestCount: 30 });
    const b = playbookFoodPlan({ id: 'e', type: 'Crab Feast', date: future, guestMode: 'count', guestCount: 30, kidsCount: 10 });
    expect(qtyById(b, 'p_crabs')).toBeLessThan(qtyById(a, 'p_crabs'));
  });

  test('never collapses toward the 1-adult-equivalent floor just because kids are present — the earlier bug undercounted here', () => {
    const guests = Array.from({ length: 10 }, () => guest('yes', 3));
    const plan = playbookFoodPlan(ev(guests));
    // 10 adults + 30 kids at 0.4 ⇒ ~22 adult-equivalents, nowhere near the floor of 1.
    expect(qtyById(plan, 'p_crabs')).toBeGreaterThan(qtyById(playbookFoodPlan(ev(Array.from({ length: 15 }, () => guest('yes', 0)))), 'p_crabs'));
  });
});
