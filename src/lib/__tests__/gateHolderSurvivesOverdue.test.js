// ─── A LATE GATE IS STILL A GATE ────────────────────────────────────────────
//
// `gateHolder` answers a FACT: does any sibling decision wait on this one? The
// ranker reads it as a consequence signal — `compareNextActions` ranks on it, and
// it is the difference between "settle this and three others open up" and "one
// more late thing".
//
// It was only ever stamped inside the ready-only bump loop, which is a SCORING
// POLICY. Because decisions saturate to `overdue` early on a real countdown, the
// fact and the policy came apart completely. Measured on a wedding, before:
//
//   T-400   3 rows with dependents   gateHolder on 2    (statuses ready)
//   T-300   3 rows with dependents   gateHolder on 0    (all overdue)
//   T-120   3 rows with dependents   gateHolder on 0
//   T-30    3 rows with dependents   gateHolder on 0
//
// So from roughly T-300 to the day itself — effectively the whole planning arc —
// the ranker could not see that a late decision gated three others. `gateHolder`
// was 0 across all 161 raises in the census that found this.
//
// The fix separates them: the fact is stamped for every open row with dependents;
// the +GATE_HOLDER_BUMP stays ready-only and untouched (lifting an overdue row is
// pointless — the 100-point status tier already carries it — and would risk the
// safety clamp).
import { playbookDecisionBoard } from '../playbooks';
import { raiseAll } from '../surfaceRegistry';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const EV = (days) => ({
  id: 'ev-gh', type: 'Wedding', date: isoIn(days),
  venue: 'The Hall', venueCity: 'Santa Fe, NM',
  guestMode: 'count', guestCount: 60, totalBudget: 15000,
});

const board = (days) => (playbookDecisionBoard(EV(days)) || {}).open || [];
const withDeps = (days) => board(days).filter((r) => (r._dependedOnCount || 0) > 0);
const gates = (days) => board(days).filter((r) => r.gateHolder);

describe('gateHolder is a fact, not a scoring mood', () => {
  test('PREMISE — this playbook really authors decision dependencies', () => {
    // Wedding authors 17 dependsOn edges. Without real dependents every
    // assertion below is about an empty set.
    expect(withDeps(400).length).toBeGreaterThan(0);
    expect(withDeps(30).length).toBeGreaterThan(0);
  });

  test('THE DEFECT — dependents do not vanish when a decision goes late', () => {
    // The count of rows with real dependents is stable across the countdown;
    // only the FLAG used to disappear. Same fact, every distance.
    const far = withDeps(400).length;
    for (const d of [300, 120, 60, 30, 10]) expect(withDeps(d).length).toBe(far);
  });

  test('AN OVERDUE GATE IS STILL FLAGGED — this was 0 before', () => {
    for (const d of [300, 120, 60, 30, 10]) {
      const rows = board(d);
      // The situation only means something if the rows really are late here.
      expect(rows.some((r) => r.status === 'overdue')).toBe(true);
      expect(gates(d).length).toBeGreaterThan(0);
    }
  });

  test('and it reaches the RAISE, where the ranker can read it', () => {
    // The board carrying it is not enough — the census measured zero at the
    // raise. This is the end of the chain that actually matters.
    for (const d of [300, 120, 30]) {
      expect(raiseAll(EV(d)).filter((r) => r.gateHolder).length).toBeGreaterThan(0);
    }
  });

  test('a safety row is never called a gate', () => {
    // The isSafety carve-out is deliberate: an allergy row leads on its own
    // terms and must not be re-sorted as a sequencing gate.
    for (const d of [300, 30]) {
      for (const r of gates(d)) {
        expect(/dietary|allerg/i.test(`${r.id} ${r.label || ''}`)).toBe(false);
        expect(r.deliversHeartMoment).not.toBe(true);
      }
    }
  });

  test('a row with no dependents is never flagged', () => {
    // The fact must stay a fact — no blanket stamping.
    for (const d of [400, 120, 30]) {
      for (const r of board(d)) {
        if (!(r._dependedOnCount > 0)) expect(r.gateHolder).not.toBe(true);
      }
    }
  });
});
