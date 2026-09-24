// ─── `relevantWhen` IS NOT 260 ROWS OF AUTHORING — IT IS ALREADY SHIPPING ────
//
// `DECISION_SCHEMA_SPEC.md`:
//
//   `relevantWhen` · decision · condition (generalizes `whenChoice`)
//     · event facts → — → surfacing · PARTIAL. Childcare only if kids; alcohol
//     only adult events; buffet-vs-plated matters more at 50 than 8.
//
// That "PARTIAL" was read as "author a condition on all 260 decisions". It was
// measured instead, 2026-09-24, and the reading was wrong. The field exists,
// is authored, is wired, and reaches the host — under FOUR DIFFERENT NAMES:
//
//   whenChoice       {id, in:[…]}        4 decisions   show only while
//   standsDownWhen   {id, in:[…]}        9 decisions   retire once answered
//   optionGates      {option: {…}}       5 decisions   prune ONE option
//   recommendedWhen  [{when:{…}, pick}]  3 decisions   move the recommendation
//
// 21 decisions, four spellings, one idea. Three of the four are read by
// `playbookDecisionBoard`; the fourth by `recommendedPick.evaluateRecommendation`
// through the same index. hostv2 calls both.
//
// ── THE CORRECTION I OWE THIS FILE ──────────────────────────────────────────
//
// My first pass reported `standsDownWhen` and `optionGates` as authored-but-dead
// — "nothing reads them". That was wrong, and the cause was mine: the grep that
// produced it was piped through `head`, and index.js's matches were cut off
// below the fold. The claim died the moment I opened the file. It is written
// down because "authored but unread" is a real failure mode in this corpus and
// the next person is going to run the same grep.
//
// ── WHAT IS ACTUALLY LEFT ───────────────────────────────────────────────────
//
// Not authoring. A NAME: four dialects of one condition, so a reader has to
// know all four to know whether a decision is conditional, and an author has to
// pick one without guidance. Unifying them is a vocabulary job of the same shape
// as `blockVocabulary` — and it is not done here, because renaming a live gate
// is a behaviour change and this file's whole point is that the behaviour is
// correct today.
import { ALL_PLAYBOOKS, playbookDecisionBoard, playbookDecisionOptions } from '../playbooks';

const DIALECTS = ['whenChoice', 'standsDownWhen', 'optionGates', 'recommendedWhen'];

const allDecisions = () => ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).map((d) => ({ type: pb.type, d })));

describe('the census the spec should have carried', () => {
  test('21 decisions already declare a relevance condition, in four dialects', () => {
    const counts = {};
    const conditional = new Set();
    for (const { type, d } of allDecisions()) {
      for (const k of DIALECTS) {
        if (d[k]) { counts[k] = (counts[k] || 0) + 1; conditional.add(`${type}/${d.id}`); }
      }
    }
    expect(counts).toEqual({
      whenChoice: 4, standsDownWhen: 9, optionGates: 5, recommendedWhen: 3,
    });
    // 21 declarations but only 18 decisions, because three decisions carry two
    // dialects at once (Anniversary/help declares BOTH optionGates and
    // recommendedWhen). That overlap is the argument for one name, stated as a
    // number rather than as an opinion.
    expect(conditional.size).toBe(18);
  });
});

describe('THE CONDITION REACHES THE BOARD, not just the data file', () => {
  // Get-Together authors the clearest case in the corpus: answer `food_style`
  // with the caterer and TWO decisions stand down — planning a menu and running
  // a potluck signup are both moot once someone else is cooking.
  const getTogether = (foodChoices) => ({
    id: 'e-gt', type: 'Get-Together', date: '2027-06-12', guestCount: 30, foodChoices,
  });
  // EVERY BUCKET, NOT `open`. The first draft of this read `open` alone and went
  // red on a board that was working: a 2027 event is on a long runway, so the
  // horizon logic moves any decision whose window opens more than 30 days out
  // into `deferred`, and `open` held three rows. The relevance gate runs BEFORE
  // that bucketing — a gated decision is absent from all three — so `open` is
  // the wrong population to ask. Asking it would have proved the gate works by
  // measuring something else entirely.
  const boardIds = (event) => {
    const b = playbookDecisionBoard(event) || {};
    return [...(b.open || []), ...(b.locked || []), ...(b.deferred || [])].map((r) => r.id);
  };

  test('with no answer, both conditional decisions are on the board', () => {
    const ids = boardIds(getTogether({}));
    expect(ids).toContain('menu');
    expect(ids).toContain('potluck');
  });

  test('ANSWER THE CATERER AND THEY LEAVE — the whole point of the field', () => {
    const ids = boardIds(getTogether({ food_style: 'Hire a BBQ caterer / pitmaster' }));
    expect(ids).not.toContain('menu');
    expect(ids).not.toContain('potluck');
    // …and the board is still a board. A gate that empties the screen is a bug
    // wearing the same shape as a gate that works.
    expect(ids.length).toBeGreaterThan(3);
  });

  test('a DIFFERENT answer retires only the decision it moots', () => {
    // `potluck` stands down on the caterer OR on guests-bring-sides; `menu`
    // stands down only on the caterer. Answering potluck must not take the menu
    // with it, or the gate is reading the decision and not the answer.
    const ids = boardIds(getTogether({ food_style: 'Potluck — guests bring sides' }));
    expect(ids).not.toContain('potluck');
    expect(ids).toContain('menu');
  });

  test('AN AUTHORED DEFAULT IS NOT AN ANSWER', () => {
    // The board stands a decision down on an ANSWERED pick only. A default is an
    // assumption, and retiring a real ask on an assumption hides work from the
    // host — the failure this rule exists to prevent. Passing the pick under a
    // key nobody answered must change nothing.
    const ids = boardIds(getTogether({ some_other_decision: 'Hire a BBQ caterer / pitmaster' }));
    expect(ids).toContain('menu');
    expect(ids).toContain('potluck');
  });
});

describe('AND IT PRUNES ONE OPTION, not just one decision', () => {
  // `optionGates` is the finest-grained dialect: a guaranteed room block is
  // absurd for a six-person trip, so the option itself is withdrawn while the
  // decision stays.
  const destEvent = (guestCount) => ({
    id: 'e-d', type: 'Birthday', date: '2027-06-12', guestCount, isDestination: true,
    destinationCity: 'Santa Fe, NM',
  });
  const BLOCK = 'A room block I guarantee fills';

  test('a small party is never offered the guaranteed block', () => {
    const opts = playbookDecisionOptions(destEvent(6), 'dest_lodging');
    expect(opts).toBeTruthy();
    expect(opts.options).not.toContain(BLOCK);
  });

  test('and a large one is', () => {
    const opts = playbookDecisionOptions(destEvent(40), 'dest_lodging');
    expect(opts.options).toContain(BLOCK);
  });

  test("THE HOST'S OWN ANSWER OUTRANKS THE GATE", () => {
    // Withdrawing an option the host already picked would silently rewrite a
    // decision they made. Pinned because it is the rule most likely to be lost
    // in a refactor of the filter above it.
    const e = { ...destEvent(6), foodChoices: { dest_lodging: BLOCK } };
    expect(playbookDecisionOptions(e, 'dest_lodging').options).toContain(BLOCK);
  });
});
