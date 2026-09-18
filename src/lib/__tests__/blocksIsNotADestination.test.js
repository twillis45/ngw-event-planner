// ─── "WHO DOES THE BRIDE WANT IN THE ROOM?" SENT THE HOST TO THE SPREAD ──────
//
// The board's route cascade tested a haystack built from the decision's id, its
// label AND its `blocks` list:
//
//     const _hay = `${d.id} ${d.label} ${_blocks}`.toLowerCase();
//     …
//     : /menu|food|dish|course|drink/.test(_hay) ? { …focusField: 'food-plan' }
//
// A guest question that blocks the food therefore carries the word "food" in
// its own haystack and routes to the food plan.
//
// MEASURED across all 45 playbooks / 359 board rows: SIX decisions landed on
// `food-plan`, and only ONE of them was about food.
//
//   Baby Shower/guestlist    "Finalize guest list with the parent"      -> food plan
//   Bridal Shower/guestlist  "Confirm guest list with the bride"        -> food plan
//   Gender Reveal/guestlist  "Finalize guest list with the parents"     -> food plan
//   Birthday/headcount       "Confirm guest count"                      -> food plan
//   Graduation/headcount     "Estimate peak + total headcount"          -> food plan
//   Dinner Party/menu        "Lock the menu"                            -> food plan  ✓
//
// What a decision UNBLOCKS downstream is not WHERE it is answered. The host
// taps "Who does the parent-to-be want in the room?" and lands on the shopping
// list — the consequence instead of the control.
//
// The app already knew the right door: the synthetic `f-headcount` row has
// always routed to the Guests surface, and `routeResolver` carries real
// landings for `guests-entry` (the count field) and `guests-invites`.
//
// SCOPED TO DECISIONS WITH NO AUTHORED OPTIONS, which is exactly those five.
// Every optioned decision's route is byte-identical: a full sweep of all 359
// rows before and after differs on these five lines and nothing else.
//
// A guest-LIST question lands on the Guests surface with NO focusField on
// purpose. `guests-entry` is the count field and `guests-invites` is the invite
// block; neither is "the roster you are building". Promising a row-level anchor
// that does not exist would be the same defect one door along.
import { ALL_PLAYBOOKS, playbookDecisionBoard } from '../playbooks';
import { resolveRoute } from '../routeResolver';

const boardRows = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    const ev = { id: 'e', type: pb.type, date: '2026-09-20', guestMode: 'count', guestCount: 20, foodChoices: {} };
    let b = null;
    try { b = playbookDecisionBoard(ev, '2026-09-18'); } catch (_e) { continue; }
    for (const r of [...(b.locked || []), ...(b.open || [])]) {
      if (r) out.push({ type: pb.type, r });
    }
  }
  return out;
};

const key = ({ type, r }) => `${type}/${r.id}`;

describe('blocks is not a destination', () => {
  test('(premise) the sweep really covers the corpus', () => {
    // Every count below is meaningless over an empty board.
    const rows = boardRows();
    expect(rows.length).toBeGreaterThan(300);
    expect(new Set(rows.map((x) => x.type)).size).toBeGreaterThan(40);
  });

  test('THE FIX: exactly ONE decision still routes to the food plan, and it is about food', () => {
    const onFood = boardRows().filter(({ r }) => r.route && r.route.focusField === 'food-plan');
    expect(onFood.map(key).sort()).toEqual(['Dinner Party/menu']);
  });

  test('a count question lands on the count entry', () => {
    const counts = boardRows()
      .filter(({ r }) => /^headcount$|^guestcount$/.test(r.id) && r.route && r.route.tab === 'Guests');
    expect(counts.map(key).sort()).toEqual(['Birthday/headcount', 'Graduation/headcount']);
    for (const { r } of counts) {
      expect(r.route.focusField).toBe('guests-entry');
      // And the resolver has a real landing for it — a route nobody resolves is
      // a route nobody arrives at.
      expect(resolveRoute(r.route)).toEqual({ kind: 'guests', focus: 'entry' });
    }
  });

  test('a guest-LIST question lands on the Guests surface, claiming no anchor', () => {
    const lists = boardRows().filter(({ r }) => r.id === 'guestlist' && r.route && r.route.tab === 'Guests');
    expect(lists.map(key).sort()).toEqual(['Baby Shower/guestlist', 'Bridal Shower/guestlist', 'Gender Reveal/guestlist']);
    for (const { r } of lists) {
      expect(r.route.focusField).toBeUndefined();
      expect(resolveRoute(r.route)).toEqual({ kind: 'guests', focus: null });
    }
  });

  test('NEGATIVE CONTROL: the dietary drill-in still wins over the guest branch', () => {
    // Anniversary and Vow Renewal author guest-list rows whose labels ALSO say
    // "collect dietary/accessibility needs". `isDietaryDecision` is tested
    // first and keeps them on the diet drill-in, which is where that half of
    // the question is answered. If this flips, those hosts lose the only door
    // to the thing the row is mostly about.
    const rows = boardRows().filter(({ type, r }) =>
      (type === 'Anniversary' || type === 'Vow Renewal') && r.id === 'guestlist');
    expect(rows.length).toBe(2);
    for (const { r } of rows) expect(String(r.route.focusField)).toMatch(/^fp-diet-/);
  });

  test('NEGATIVE CONTROL: an OPTIONED decision keeps whatever route it had', () => {
    // The branch is gated on having no options precisely so nothing that
    // settles inline or on the food card can be stolen by a word match.
    // Repast's `headcount` has band options and must not acquire a Guests route.
    const repast = boardRows().find(({ type, r }) => type === 'Repast' && r.id === 'headcount');
    expect(repast).toBeTruthy();
    expect(repast.r.route == null || repast.r.route.tab !== 'Guests').toBe(true);
  });
});
