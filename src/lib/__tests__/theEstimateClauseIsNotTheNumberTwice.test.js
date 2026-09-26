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

describe('the estimate clause has a case to cover', () => {
  test('(premise) these events commit money at all', () => {
    // Without this the equality below is satisfied by 0 === 0 on every event,
    // which would pass while proving nothing.
    const withMoney = ALL_PLAYBOOKS
      .map((pb) => { try { return hostSpending(evFor(pb.type)); } catch (_e) { return null; } })
      .filter((s) => s && s.committed > 0);
    expect(withMoney.length).toBeGreaterThan(40);
  });

  test('AT REST, every committed dollar is an estimate — so the figure must not repeat', () => {
    const partial = [];
    for (const pb of ALL_PLAYBOOKS) {
      let s;
      try { s = hostSpending(evFor(pb.type)); } catch (_e) { continue; }
      if (!s.committed) continue;
      if (s.committedEstimated !== s.committed) {
        partial.push(`${pb.type}: ${s.committedEstimated} of ${s.committed}`);
      }
    }
    // Named, so a failure says WHICH playbook gained a firm commitment at rest
    // — that is a real change in the money model, not a copy question.
    expect(partial).toEqual([]);
  });

  test('and recording an actual spend DOES produce the partial case', () => {
    // The other half. The parenthetical is not dead code — it is the correct
    // rendering once a host records real money, and this proves that state is
    // reachable rather than theoretical.
    const ev = { ...evFor('Reunion'), budget: [{ category: 'Venue', budgeted: 400, actual: 400 }] };
    const s = hostSpending(ev);
    expect(s.spent).toBeGreaterThan(0);
    expect(s.committed).toBeGreaterThan(s.spent);
    expect(s.committedEstimated).toBeLessThan(s.committed);
  });
});
