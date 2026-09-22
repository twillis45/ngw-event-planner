// ─── TEN PEOPLE PLANNING A MENU FOR A KITCHEN NOBODY BOOKED ──────────────────
//
// Ruling, 2026-09-22: on a destination trip we do not start with food. We start
// with WHERE and HOW everyone stays, and until there is a specific place, the
// steps that depend on it wait — with an out that names what they are waiting
// for, rather than a blank or a guess.
//
// TWO DEFECTS SAT UNDER THAT, and the second is the one that made the first
// invisible.
//
// 1. A NAME WAS TREATED AS A BOOKING. The foundation ladder re-derived "is
//    lodging settled" as `lodging.hotelName is non-empty`, one import away from
//    `lodgingIsHeld`, which owns the question and answers it differently: a name
//    stamped STAY_FROM_PLAN ("the plan, not booked yet") or STAY_FROM_PICK is
//    NOT held, and a bare booking code or a refund deadline IS — with no name at
//    all. The repo authored STAY_FROM_PLAN precisely so a host could name the
//    place she was leaning toward without it counting as settled, and the
//    re-derivation threw that away. Same defect class as every other finding
//    this week: a fact owned by one accessor, re-derived by the consumer beside
//    it.
//
// 2. FOOD DID NOT WAIT FOR IT. Measured on the Santa Fe 80th (10 guests,
//    2027-06-17 → 06-21, no stay held), the board read:
//
//      1. Set your budget.   2. Sort where everyone stays.   3. Plan the food.
//
//    "Plan the food." was offered third while the answer that decides whether
//    there is a kitchen, whether a caterer can deliver, and which shops are
//    reachable was still open at second. `foodSpanNote` reports `kitchen: null`
//    on this event and offers a shopping list regardless.
//
// HELD, NOT HIDDEN. The rung keeps its place in `foundation` so the ledger, the
// progress count and the handled whispers are unchanged — the standing ranking-
// board rule is that whatever moves down stays VISIBLE. It is removed only from
// the list of things the host can do NOW, and `heldBy` names the rung that
// unlocks it so a surface can say which answer is missing.
//
// AND IT HAD TO BE APPLIED TWICE. Holding the foundation rung alone only moved
// the ask: the phaseProgress splice emits its own row for the same concern
// ("Decide what you're serving"), which took the vacated slot. The hold is now
// one rule over every producer, reading the held set OFF the foundation so
// exactly one place decides what waits on what.
import { eventPlan, _eventFoundationActions } from '../../CommandCenter';
import { STAY_FROM_PLAN, STAY_FROM_PICK, lodgingIsHeld } from '../lodgingIntel';

const EV = (over = {}) => ({
  id: 'ev-80', name: 'Mom’s 80th', type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 10,
  budget: [], vendors: [], guests: [], ...over,
});
const rung = (ev, id) => _eventFoundationActions(ev).find((r) => r && r.id === id) || null;
const titles = (ev) => (eventPlan(ev).nextActions || []).map((a) => String(a.title || a.id || ''));
const saysFood = (ev) => titles(ev).some((t) => /\bfood\b|serving/i.test(t));

describe('where and how, then food', () => {
  test('(premise) the destination event really carries both rungs', () => {
    // Every assertion below is vacuous if the lodging rung is absent — it is
    // spliced in only for a destination, so a typo in the fixture would make
    // this whole file pass over an event that has no hold to test.
    expect(rung(EV(), 'lodging')).toBeTruthy();
    expect(rung(EV(), 'food')).toBeTruthy();
  });

  test('THE DEFECT: food is not offered while the stay is unsettled', () => {
    const ev = EV();
    expect(rung(ev, 'lodging').done).toBe(false);
    expect(rung(ev, 'food').heldBy).toBe('lodging');
    expect(saysFood(ev)).toBe(false);
    // …and the thing it waits on IS offered, in its place.
    expect(titles(ev)).toContain('Sort where everyone stays.');
  });

  test('the hold names what it waits for — the out, not a blank', () => {
    const f = rung(EV(), 'food');
    expect(f.heldBy).toBe('lodging');
    expect(String(f.heldWhy)).toMatch(/kitchen/i);
    // Held is not done. A held rung that reported done would quietly credit the
    // host with a step they have not taken.
    expect(f.done).toBe(false);
  });

  test('A NAME IS NOT A BOOKING — the plan-not-booked stamp keeps the hold', () => {
    const planned = EV({ lodging: { hotelName: 'Inn at Loretto', from: STAY_FROM_PLAN } });
    expect(lodgingIsHeld(planned)).toBe(false);
    expect(rung(planned, 'lodging').done).toBe(false);
    expect(rung(planned, 'food').heldBy).toBe('lodging');
    expect(saysFood(planned)).toBe(false);
    // The picked-option stamp behaves the same way.
    const picked = EV({ lodging: { hotelName: 'Inn at Loretto', from: STAY_FROM_PICK } });
    expect(rung(picked, 'lodging').done).toBe(false);
  });

  test('a real booking releases the hold, and food returns to the board', () => {
    const booked = EV({ lodging: { hotelName: 'Inn at Loretto' } });
    expect(rung(booked, 'lodging').done).toBe(true);
    expect(rung(booked, 'food').heldBy).toBeUndefined();
    expect(saysFood(booked)).toBe(true);
  });

  test('a booking CODE with no name releases it too — the accessor’s other half', () => {
    // The old re-derivation required a name, so a host who had the confirmation
    // number and not the hotel's exact name stayed blocked forever.
    const byCode = EV({ lodging: { code: 'ABC123' } });
    expect(rung(byCode, 'lodging').done).toBe(true);
    expect(rung(byCode, 'food').heldBy).toBeUndefined();
  });

  test('NEGATIVE CONTROL: a LOCAL event is untouched — no rung, no hold', () => {
    // The hold must never reach an event that has no lodging step to clear, or
    // a backyard party would wait forever on a rung it cannot satisfy.
    const local = EV({ isDestination: false });
    expect(rung(local, 'lodging')).toBe(null);
    expect(rung(local, 'food').heldBy).toBeUndefined();
    expect(saysFood(local)).toBe(true);
  });

  test('NEGATIVE CONTROL: held is not deleted — the ledger still counts it', () => {
    // Demotion is not deletion (ranking board, 2026-08-17). The rung stays in
    // the foundation so progress and the handled whispers are unchanged; only
    // the "what can I do now" list drops it.
    const ev = EV();
    const ladder = _eventFoundationActions(ev);
    expect(ladder.some((r) => r.id === 'food')).toBe(true);
    expect(eventPlan(ev).progress.total).toBe(ladder.length);
  });

  test('NEGATIVE CONTROL: the hold silences the domain, not one title', () => {
    // Holding the foundation rung alone only moved the ask — the phaseProgress
    // splice re-offered the same concern under its own wording. Both must stay
    // silent, or the rule is cosmetic.
    const t = titles(EV());
    expect(t.some((x) => /Plan the food/i.test(x))).toBe(false);
    expect(t.some((x) => /what you.re serving/i.test(x))).toBe(false);
  });
});
