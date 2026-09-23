// ─── ELEVEN BEATS, IDENTICAL FOR A KITCHEN AND A HOTEL ROOM ──────────────────
//
// The Day tab's agenda is byte-identical for a host cooking in a rented house
// and a host in a room block with a caterer dropping the food off. Measured
// through `effectiveRos` with `food_style` answered BOTH ways: eleven rows, same
// text, same order, every one stamped `Host`.
//
//   Decorate, blow up balloons, set food + drinks stations · Host · 3h before
//   Chill drinks; build the drinks station + ice · Host · 2h before
//   Food out while everyone's still arriving · Host · 30m in
//   Leftovers to containers, favors out, deflate/clear decor · Host · 3h in
//
// THE FIX IS A DISCLOSURE, NOT A REWRITE, AND THAT IS THE POINT OF THIS FILE.
// Audited across all 45 playbooks: a schedule entry authors exactly four fields
// — `when`, `what`, `whenChoice`, `copyByAnswer` — and `owner` is not among
// them. The 485 authored `owner` values all sit on `milestones`, which the
// run-of-show builder never reads. So the `Host` on every row is an engine
// literal, NOT a discarded authored value, and nothing in this corpus says which
// beats a caterer or a venue performs.
//
// Re-owning "set food + drinks stations" would therefore mean DECIDING that a
// caterer sets it — and `Order pizza/trays` resolves to the very same
// `usesCaterer: true` while plainly leaving the host to put the food out. That
// is authoring a run-of-show nobody researched. Same line foodSpan.js draws when
// it refuses to multiply a one-gathering food plan by the day count.
//
// The seam where the real fix lands is already open: beats support
// `copyByAnswer` and `whenChoice`, and three playbooks already author
// conditional beats. That is content work, per playbook.
import { rosBasisNote } from '../rosBasis';
import { effectiveRos, foodApproach } from '../playbooks';

const ev = (extra) => ({
  id: 'r', name: "Mom's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 10, ...extra,
});
const CATERED_HOTEL = ev({ foodChoices: { food_style: 'Drop-off catering', dest_lodging: 'A room block I guarantee fills' } });
const COOKING_RENTAL = ev({ foodChoices: { food_style: 'Cook/grill yourself', dest_lodging: 'A house we rent for everyone' } });
const TRAYS = ev({ foodChoices: { food_style: 'Order pizza/trays' } });
const UNTOLD = ev({});
const rows = (e) => { const r = effectiveRos(e); return Array.isArray(r) ? r : (r && r.items) || []; };

describe('the agenda says what it is written for', () => {
  test('(premise) the agenda really IS identical across the two answers', () => {
    // The finding this whole module exists for. If a future change makes the
    // beats themselves food-aware, this fails — and that is the good outcome,
    // because the disclosure would then be describing a problem that is gone.
    const a = rows(CATERED_HOTEL);
    const b = rows(COOKING_RENTAL);
    expect(a.length).toBe(11);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // And every row is owned by the engine's literal, not an authored value.
    expect([...new Set(a.map((r) => r.owner))]).toEqual(['Host']);
  });

  test('(premise) the two fixtures really do differ to the food engine', () => {
    expect(foodApproach(CATERED_HOTEL).usesCaterer).toBe(true);
    expect(foodApproach(COOKING_RENTAL).usesCaterer).toBe(false);
  });

  test('THE FIX: a catered hotel stay is told what the agenda assumes', () => {
    const n = rosBasisNote(CATERED_HOTEL);
    expect(n).toBeTruthy();
    expect(n.reasons.sort()).toEqual(['catered', 'no-kitchen']);
    expect(n.text).toMatch(/playbook.s standard run/i);
    expect(n.text).toMatch(/not be yours to run/i);
  });

  test('each reason stands on its own', () => {
    const catered = rosBasisNote(ev({ isDestination: false, foodChoices: { food_style: 'Drop-off catering' } }));
    expect(catered.reasons).toEqual(['catered']);
    expect(catered.text).toMatch(/brought in rather than cooked/i);

    const noKitchen = rosBasisNote(ev({ foodChoices: { dest_lodging: 'A room block I guarantee fills' } }));
    expect(noKitchen.reasons).toEqual(['no-kitchen']);
    expect(noKitchen.text).toMatch(/no kitchen where everyone is staying/i);
  });

  test('ordered trays count as brought-in food — the host still plates it', () => {
    // Why the note never says a caterer TAKES the food lines. `Order pizza/trays`
    // resolves to the same usesCaterer as drop-off catering, and that host is
    // certainly the one putting the food out.
    const n = rosBasisNote(TRAYS);
    expect(n.reasons).toEqual(['catered']);
    expect(n.text).not.toMatch(/caterer will|the caterer runs|theirs to run/i);
  });

  test('IT CLAIMS NOTHING IT CANNOT KNOW', () => {
    // The whole discipline of this fix. No named owner, no времени claim, no
    // assertion about WHICH of the eleven lines moves.
    const t = rosBasisNote(CATERED_HOTEL).text;
    expect(t).not.toMatch(/\b(caterer|venue|banquet|staff)\b/i);
    expect(t).not.toMatch(/\d+\s*(minutes?|hours?|h\b|m\b)/i);
    expect(t).not.toMatch(/skip|remove|delete|ignore/i);
    // It points at the one thing that IS real: the host can edit any line.
    expect(t).toMatch(/change any line/i);
  });

  test('NEGATIVE CONTROL: a host cooking in a rental is told nothing', () => {
    // The agenda's assumption holds for them, so there is nothing to disclose.
    expect(rosBasisNote(COOKING_RENTAL)).toBe(null);
  });

  test('NEGATIVE CONTROL: UNTOLD says nothing — not being asked is not an answer', () => {
    // Same asymmetry every other gate this session draws.
    expect(rosBasisNote(UNTOLD)).toBe(null);
    expect(rosBasisNote({})).toBe(null);
    expect(rosBasisNote(null)).toBe(null);
  });

  test('NEGATIVE CONTROL: a LOCAL event is untouched by the lodging half', () => {
    const local = ev({
      isDestination: false, venueCity: 'Silver Spring', state: 'MD',
      foodChoices: { dest_lodging: 'A room block I guarantee fills' },
    });
    expect(rosBasisNote(local)).toBe(null);
  });

  test('NEGATIVE CONTROL: the note changes NO beat', () => {
    // A disclosure that quietly edited the agenda would be the thing this
    // refused to do, arriving by the back door.
    const before = JSON.stringify(rows(CATERED_HOTEL));
    rosBasisNote(CATERED_HOTEL);
    expect(JSON.stringify(rows(CATERED_HOTEL))).toBe(before);
  });
});
