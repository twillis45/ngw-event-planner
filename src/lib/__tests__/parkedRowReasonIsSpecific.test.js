// ─── THE PARKED SHELF SAID ITS OWN HEADING N+1 TIMES ───────────────────────
//
// decisionRankReason() opens with:
//
//     if (row.horizon === 'later') return 'Comes up closer to the date.';
//
// and playbookDecisionBoard partitions `deferred = open.filter(r =>
// r.horizon === 'later')`. Those are the same predicate, so EVERY row on the
// parked shelf carried that identical sentence.
//
// HostShellV2 then renders the shelf as:
//
//     <div className="shelf-label">Comes up closer to the date</div>
//     …and each row's explanation column: r.rankReason
//
// so a host with four parked decisions read "comes up closer to the date"
// five times — once as the heading, once per row — and learned nothing about
// any of them. The toggle above it says it a sixth time.
//
// The engine's underlying call is RIGHT and stays: for a parked row the honest
// headline is its timing, not its stakes (that is why this branch deliberately
// wins over an authored priorityBasis.rationale). The defect is that it stated
// the timing in the one phrasing that carries no timing — the shelf already
// said "later"; the row has to say WHEN.
//
// `daysOut` is real data already on the row, so this is derivation, not
// invention.
import { playbookDecisionBoard } from '../playbooks/index';

const ASOF = '2026-06-01';
const dateNDaysOut = (n, asOf = ASOF) => {
  const d = new Date(asOf + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A long runway so the deferral rule (defersFarWindows) is actually in play.
const board = playbookDecisionBoard(
  { id: 'e', type: 'Crab Feast', date: dateNDaysOut(120), guestMode: 'count', guestCount: 20 },
  ASOF,
);

describe('a parked decision explains WHEN, not that it is parked', () => {
  test('the fixture actually parks rows — the probe is real', () => {
    // Without this the three tests below pass vacuously on an empty array,
    // which is the shape of every false green this repo has logged.
    expect(board.deferred.length).toBeGreaterThan(1);
    for (const r of board.deferred) expect(typeof r.rankReason).toBe('string');
  });

  test('no parked row repeats the shelf heading verbatim', () => {
    // The heading rendered above the list in HostShellV2.
    const HEADING = 'comes up closer to the date';
    const echoes = board.deferred
      .filter((r) => r.rankReason.toLowerCase().replace(/[.]$/, '') === HEADING)
      .map((r) => `${r.id}: ${r.rankReason}`);
    expect(echoes).toEqual([]);
  });

  test('a nearer parked shelf reads differently from a farther one', () => {
    // FIRST DRAFT OF THIS TEST WAS WRONG, and the probe caught it: it demanded
    // the five rows on ONE shelf differ from each other. They sit at 110-115
    // days out — genuinely the same window — so satisfying that would have
    // meant manufacturing a distinction the data does not contain, which is
    // the fabrication this repo's grounding rules exist to stop. Same window,
    // same sentence is CORRECT.
    //
    // What must differ is a shelf at a genuinely different distance.
    const near = playbookDecisionBoard(
      { id: 'e', type: 'Crab Feast', date: dateNDaysOut(60), guestMode: 'count', guestCount: 20 },
      ASOF,
    );
    expect(near.deferred.length).toBeGreaterThan(1);
    const farReasons = new Set(board.deferred.map((r) => r.rankReason));
    const nearReasons = new Set(near.deferred.map((r) => r.rankReason));
    // ~113 days out vs ~53: nothing they say may overlap.
    for (const f of farReasons) expect(nearReasons.has(f)).toBe(false);
  });

  test('every parked reason still names a time, not stakes', () => {
    // The deliberate design call this fix must NOT undo: for a parked row the
    // headline is timing. So each reason mentions a real temporal unit.
    for (const r of board.deferred) {
      expect(r.rankReason).toMatch(/week|month|day/i);
    }
  });
});
