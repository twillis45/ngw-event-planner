// November 3 C1: unbought estimates now belong to expected, not committed.
// Historical measurements below describe the former mixed total.
// ─── "$1,240 SPOKEN FOR ($1,240 OF THAT STILL AN ESTIMATE)" ─────────────────
//
// The money sheet's grounding line printed the same figure twice in one
// breath. Measured live on My Crab Feast before the fix:
//
//   "$1,240 spoken for, of a $1,000 budget ($1,240 of that still an estimate)
//    · sized for 14-21 guests."
//
// The parenthetical is meant for the PARTIAL case — some of what is committed
// is firm, some is still an estimate. Measured across all 45 playbooks at 30
// guests: `committedEstimated === committed` on 45 of 45. Not most. All of
// them — because until a host records an actual spend, the whole figure is an
// estimate, which is the state every event is in when they first open it.
//
// So the clause that exists to add information was, on every event anyone has
// ever seen, repeating a number the sentence had just said. It now reads
// "— all of it still an estimate", and keeps the figure only when the split is
// real.
//
// THIS TEST PINS THE CONDITION, NOT THE COPY. The copy lives in JSX at
// HostShellV2.jsx and jest cannot execute hostv2 — the standing rule in this
// repo. What jest CAN hold is the fact that made the copy wrong: if a change
// ever makes committed partly-firm at rest, the equality below breaks, and the
// person changing it is told that the "all of it" wording now has a case it
// does not cover.
import { ALL_PLAYBOOKS } from '../playbooks';
import hostSpending from '../hostSpending';

const evFor = (type) => ({
  id: 'e', type, date: '2027-06-12', guestMode: 'count', guestCount: 30,
  guestCountLocked: true, guests: [], vendors: [], budget: [], timeline: [],
  foodChoices: {}, totalBudget: 1500,
});

describe('estimates and commitments have different truth states', () => {
  test('every priced playbook reports expected costs without inventing commitments', () => {
    const priced = ALL_PLAYBOOKS.map(pb => hostSpending(evFor(pb.type))).filter(s => s.expected > 0);
    expect(priced.length).toBeGreaterThan(40);
    for (const s of priced) {
      expect(s.committed).toBe(0);
      expect(s.committedEstimated).toBe(0);
      expect(s.spent).toBe(0);
    }
  });

  test('a bought estimated item and a manual receipt produce the partial estimate case', () => {
    const ev = { ...evFor('Reunion'), foodGot: { p_protein: true }, budget: [{ category: 'Venue', budgeted: 400, actual: 400 }] };
    const s = hostSpending(ev);
    expect(s.spent).toBeGreaterThan(400);
    expect(s.committed).toBe(s.spent);
    expect(s.committedEstimated).toBeGreaterThan(0);
    expect(s.committedEstimated).toBeLessThan(s.committed);
    expect(s.expected).toBeGreaterThan(s.committed);
  });
});
