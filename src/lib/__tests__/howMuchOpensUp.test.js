// ─── NOTHING COUNTED HOW MANY DECISIONS WAIT ON A DECISION ──────────────────
//
// `DECISION_SCHEMA_SPEC.md` lists `blastRadius` as "DERIVED from
// `blocks`/`dependsOn` · derivable now · How many downstream things it
// unblocks." It was never built.
//
// ── A NAME COLLISION I REPORTED AS A FINISHED FEATURE ───────────────────────
//
// `knowledge/dependencyEngine.js` exports a `blastRadius` and I told the owner
// the decision version was "already built, just needs wiring". It is not the
// same thing at all: that one takes a playbook and a FIELD PATH and reports
// which engines, readers, prompts and tests an authoring edit would disturb.
// Different inputs, different output, different job. This module is the
// decision one, and the file name says so.
//
// ── WHAT IS ACTUALLY DERIVABLE ──────────────────────────────────────────────
//
// `blocks` names the SURFACES waiting on a decision and CommandCenter already
// counts it (`unlocks: blocks.length`). `dependsOn` names the DECISIONS waiting
// on it — 67 entries, 28 distinct targets, every one resolving to a real id —
// and NOTHING counts that. It is also the only half that can be transitive: a
// surface does not unblock a surface, but a decision unblocks a decision.
import { ALL_PLAYBOOKS } from '../playbooks';
import { decisionBlastRadius, unblockGraph, downstreamDecisions } from '../decisionBlastRadius';

const pbOf = (type) => ALL_PLAYBOOKS.find((p) => p.type === type);
const decOf = (type, id) => (pbOf(type).decisions || []).find((d) => d.id === id);

describe('(premise) the corpus can actually support this', () => {
  test('every dependsOn entry resolves to a real decision in its own playbook', () => {
    // If any did not, every count above it would be silently inflated — which
    // is why unblockGraph drops unresolvable names rather than trusting them.
    let entries = 0; const dangling = [];
    for (const pb of ALL_PLAYBOOKS) {
      const ids = new Set((pb.decisions || []).map((d) => d.id));
      for (const d of (pb.decisions || [])) {
        for (const dep of (d.dependsOn || [])) {
          entries++;
          if (!ids.has(dep)) dangling.push(`${pb.type}/${d.id} -> ${dep}`);
        }
      }
    }
    expect(entries).toBe(67);
    expect(dangling).toEqual([]);
  });

  test('and the graph has no cycles, so the transitive walk terminates honestly', () => {
    // A hand-authored corpus can name a loop. The walk is cycle-safe either
    // way, but if one ever appears this says so instead of it being absorbed.
    const looped = [];
    for (const pb of ALL_PLAYBOOKS) {
      const g = unblockGraph(pb);
      for (const d of (pb.decisions || [])) {
        if (downstreamDecisions(pb, d.id, g).cycle) looped.push(`${pb.type}/${d.id}`);
      }
    }
    expect(looped).toEqual([]);
  });
});

describe('it counts what was never counted', () => {
  test('Wedding/venue has three decisions waiting on it', () => {
    const b = decisionBlastRadius(pbOf('Wedding'), decOf('Wedding', 'venue'));
    expect(b.directDecisions).toBe(3);
    expect(b.allDecisions).toBe(3);
    expect(b.surfaces).toBeGreaterThan(0);
  });

  test('THE TRANSITIVE HALF EARNS ITS KEEP — the Gala target reaches past its neighbours', () => {
    // 4 decisions name it directly; 6 are downstream once their own dependents
    // are followed. A first-order count would under-report the single most
    // load-bearing decision in that playbook by a third.
    const b = decisionBlastRadius(pbOf('Fundraiser / Gala'), decOf('Fundraiser / Gala', 'target'));
    expect(b.directDecisions).toBe(4);
    expect(b.allDecisions).toBe(6);
    expect(b.allDecisions).toBeGreaterThan(b.directDecisions);
  });

  test('a decision nothing waits on counts zero, not one', () => {
    // An off-by-one here would make every decision look load-bearing and the
    // signal would carry nothing.
    const pb = pbOf('Wedding');
    const g = unblockGraph(pb);
    const leaf = (pb.decisions || []).find((d) => !(g[d.id] || []).length);
    expect(leaf).toBeTruthy();
    expect(decisionBlastRadius(pb, leaf, g).allDecisions).toBe(0);
  });

  test('SURFACES AND DECISIONS ARE KEPT APART, deliberately', () => {
    // They are different claims. "Four other calls open up" is stronger than
    // "this touches four surfaces", and a ranker handed one number cannot tell
    // them apart. `total` exists for callers that genuinely want both.
    // Asserted on a decision where the two genuinely differ. The first version
    // used Wedding/venue, where both happen to be 3 — it would have passed on a
    // module that returned one number twice.
    const b = decisionBlastRadius(pbOf('Fundraiser / Gala'), decOf('Fundraiser / Gala', 'target'));
    expect(b.surfaces).toBe(4);
    expect(b.allDecisions).toBe(6);
    expect(b.total).toBe(10);
    // …and the sum holds everywhere, not just here.
    for (const pb of ALL_PLAYBOOKS) {
      const g = unblockGraph(pb);
      for (const d of (pb.decisions || [])) {
        const r = decisionBlastRadius(pb, d, g);
        expect(r.total).toBe(r.surfaces + r.allDecisions);
      }
    }
  });

  test('it refuses rather than guessing on junk input', () => {
    expect(decisionBlastRadius(null, null).total).toBe(0);
    expect(decisionBlastRadius(pbOf('Wedding'), null).allDecisions).toBe(0);
    expect(unblockGraph(null)).toEqual({});
    expect(unblockGraph({ decisions: [{ id: 'a', dependsOn: ['nope'] }] })).toEqual({});
  });
});

describe('THE POPULATION — small, and that is the finding', () => {
  // AMENDED 2026-09-24, while the packet was already with the board: reading
  // `whenChoice.id` as a dependency added Watch Party's three gated decisions,
  // moving 41 -> 42 and the raw-wiring figure 76 -> 77. The packet carries the
  // same amendment. This is why the numbers are pinned — the drift was caught
  // by these tests going red, not by anyone re-reading the document.
  test('only a sixth of decisions have anything waiting on them', () => {
    // Which is why this is a RANKING signal and not a headline: it speaks for
    // 41 decisions out of 260, and says nothing about the other 219.
    let withDownstream = 0; let total = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const g = unblockGraph(pb);
      for (const d of (pb.decisions || [])) {
        total++;
        if (decisionBlastRadius(pb, d, g).allDecisions > 0) withDownstream++;
      }
    }
    expect(total).toBe(260);
    expect(withDownstream).toBe(42);
  });
});

// ─── WHY THIS IS NOT WIRED INTO THE SCORER, MEASURED ────────────────────────
//
// The spec says this feeds "the scorer", and `CommandCenter#actionConsequence`
// adds `unlocks` to consequence directly. So the obvious wiring is
// `unlocks = blocks.length + allDecisions`.
//
// MEASURED BEFORE DOING IT, and the measurement says don't:
//
//   Fundraiser / Gala/target    unlocks 4 -> 10   (+6)
//   Anniversary/format          unlocks 4 ->  9   (+5)
//   Wedding/budget              unlocks 4 ->  9   (+5)
//   Wedding/venue               unlocks 3 ->  6   (+3)
//
// against the scorer's ruled bands:
//
//   gateHolder            +2
//   closing window        +3.5   (ruled 2026-09-23, deliberately BELOW…)
//   lateness floor         4     (…this, ruled 2026-08-17)
//   lateness ceiling       4.9
//   priorityScore        /100    (bounded to a hundredth)
//
// A +6 term is larger than every other signal in the model. It would put a
// fundraising target above a genuinely late item, which is the exact direction
// the 2026-08-17 ruling fixed and the 2026-09-23 closing-window ruling was
// deliberately sized to respect at 3.5.
//
// So the engine ships and the wiring does not. Sizing a new term against ruled
// bands is a board call with a packet, the same way the closing window was.
describe('the wiring is a board call, and these are the numbers for it', () => {
  test('the term would be bigger than every other signal in the scorer', () => {
    const b = decisionBlastRadius(pbOf('Fundraiser / Gala'), decOf('Fundraiser / Gala', 'target'));
    const wouldAdd = b.allDecisions;               // on top of the surfaces already counted
    expect(wouldAdd).toBe(6);
    // The ruled constants it would have to sit beside. If any of these move,
    // the packet's arithmetic changes and this test says so.
    expect(wouldAdd).toBeGreaterThan(3.5);         // closing window
    expect(wouldAdd).toBeGreaterThan(4.9);         // lateness ceiling
  });

  test('and it would move a sixth of the corpus, not a handful', () => {
    let changed = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const g = unblockGraph(pb);
      for (const d of (pb.decisions || [])) {
        if (decisionBlastRadius(pb, d, g).allDecisions > 0) changed++;
      }
    }
    expect(changed).toBe(42);
  });
});

// ─── THE PACKET'S HEADLINE, PINNED ──────────────────────────────────────────
//
// docs/audits/2026-09-24_BLAST_RADIUS_BOARD_PACKET.md asks the board a question
// it did not commission: `unlocks` is unbounded and ALREADY outranks maximum
// lateness on a quarter of the corpus, with no change from this work. A packet
// whose numbers drift is worse than no packet, so they are facts here.
import { actionConsequence, latenessBoost } from '../../CommandCenter';

describe('the inversion that is already shipping', () => {
  const asBlocker = (unlocks) => actionConsequence({ dueInDays: 20, leadDays: 0, gateHolder: true, unlocks });
  const MAX_LATE = latenessBoost({ dueInDays: -365, leadDays: 0 });   // the ruled ceiling

  test('(premise) the lateness ceiling is what the 2026-08-17 ruling fixed', () => {
    expect(MAX_LATE).toBeCloseTo(4.9, 5);
  });

  test('A GATE-HOLDER NAMING THREE SURFACES ALREADY BEATS IT', () => {
    // 2 (gateHolder) + 3 (unlocks) = 5.00 against a ceiling of 4.90. No part of
    // this comes from the blast radius work — it is today's shipping arithmetic.
    expect(asBlocker(3)).toBe(5);
    expect(asBlocker(3)).toBeGreaterThan(MAX_LATE);
  });

  test('…on 64 of 260 decisions, and 76 if the new term were wired raw', () => {
    let already = 0; let wired = 0; let total = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const g = unblockGraph(pb);
      for (const d of (pb.decisions || [])) {
        total++;
        const b = decisionBlastRadius(pb, d, g);
        if (asBlocker(b.surfaces) > MAX_LATE) already++;
        if (asBlocker(b.surfaces + b.allDecisions) > MAX_LATE) wired++;
      }
    }
    expect(total).toBe(260);
    expect(already).toBe(64);
    expect(wired).toBe(77);
  });

  test('the packet’s distribution table is the real distribution', () => {
    const dist = {};
    for (const pb of ALL_PLAYBOOKS) {
      const g = unblockGraph(pb);
      for (const d of (pb.decisions || [])) {
        const n = decisionBlastRadius(pb, d, g).allDecisions;
        dist[n] = (dist[n] || 0) + 1;
      }
    }
    expect(dist).toEqual({ 0: 218, 1: 28, 2: 5, 3: 4, 5: 4, 6: 1 });
  });
});
