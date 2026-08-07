// ─── THE HERO AND THE BOARD MUST NOT CONTRADICT EACH OTHER (2026-08-06) ─────
//
// The defect this exists to stop, measured and shipping:
//
//   deriveEventPhaseProgress(ev).nextCue  →  'lodging' · "Sort where everyone stays"
//   playbookDecisionBoard(ev).deferred    →  includes 'dest_lodging'
//
// One event, one instant. The home hero called lodging the single most important
// open thing while the Planning board filed the same subject on the horizon
// shelf, which the shell renders as "Comes up closer to the date." A host who
// notices stops trusting the ranking, which is the whole product.
//
// It survived a parity test written the same day, because that test compared
// the hero cue to selectEventNextAction — and selectEventNextAction RETURNS the
// cue (CommandCenter.jsx:3010-3022 reads deriveEventPhaseProgress().nextCue).
// One pipeline with an echo in it. This file compares the two surfaces that are
// genuinely independent: the cue ladder and the decision board.
//
// ROOT CAUSE (board ruling D): `dest_lodging` was the one destination decision
// authored without a `weight`. The board's anchor test reads authored weight
// only, so a row declaring `blocks:['vendors','food']` was misfiled as a
// low-stakes leaf and shelved — while the LATER-opening `dest_transport`
// (weight 'high') stayed open. Timing never drove that split; a missing field
// did. Fixed by authoring the weight, not by touching either engine.
import { playbookDecisionBoard } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';

const NOW = new Date(2026, 7, 6, 9, 0, 0);
const dayFrom = (d) => {
  const x = new Date(NOW); x.setDate(x.getDate() + d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

const evAt = (daysOut, extra) => ({
  id: `hb-${daysOut}`, type: 'Birthday', name: 'A destination birthday',
  isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
  date: dayFrom(daysOut), endDate: dayFrom(daysOut + 4),
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
  ...extra,
});

const cueOf = (ev) => (deriveEventPhaseProgress(ev, NOW) || {}).nextCue || null;
const boardOf = (ev) => playbookDecisionBoard(ev) || {};

// THE INVARIANT. Whatever the hero leads with, the board may not be calling it
// "not yet". Asserted through `records`, which is the cue's own declaration of
// which decision rows it summarises — each side in its own vocabulary.
const contradictions = (ev) => {
  const cue = cueOf(ev);
  if (!cue || !Array.isArray(cue.records)) return [];
  const deferred = new Set((boardOf(ev).deferred || []).map((d) => d.id));
  return cue.records.filter((id) => deferred.has(id));
};

describe('the hero never leads with something the board has shelved', () => {
  // A runway sweep, because agreeing at one distance proves nothing — the board
  // partitions on `when` vs daysOut, so the relationship must hold as time moves.
  test.each([[30], [90], [210], [318], [400]])(
    'destination event, %i days out',
    (daysOut) => {
      const ev = evAt(daysOut);
      expect({ daysOut, contradicting: contradictions(ev) })
        .toEqual({ daysOut, contradicting: [] });
    },
  );

  test('THE REPORTED CASE: 318 days out, lodging leads and is NOT deferred', () => {
    const ev = evAt(318);
    const cue = cueOf(ev);
    expect(cue.id).toBe('lodging');
    const board = boardOf(ev);
    const deferredIds = (board.deferred || []).map((d) => d.id);
    expect(deferredIds).not.toContain('dest_lodging');
    // …and it is genuinely on the open board, not merely absent from deferred.
    expect((board.open || []).map((d) => d.id)).toContain('dest_lodging');
  });

  test('a local event raises no lodging cue at all', () => {
    const local = evAt(318, { isDestination: false });
    expect(cueOf(local).id).not.toBe('lodging');
  });
});

// ─── KNOWN OPEN, RECORDED RATHER THAN SILENTLY PASSED ───────────────────────
// Wiring `records` through pickCue immediately surfaced a SECOND contradiction
// of the same shape, on local events. It is recorded here as the truth it is,
// not asserted away, because fixing it is a separate product question and
// weakening the invariant above to hide it would be the exact move this whole
// audit exists to stop.
//
// THE FINDING: at 318 days out on a LOCAL birthday the hero reads
// "Decide what you're serving · 2 open" — and both decisions it is counting
// (`food_style`, `alcohol`) are on the board's horizon shelf, rendered to the
// host as "Comes up closer to the date."
//
// It is NOT the same root cause as the lodging one. Neither row declares
// `blocks[]`, so the gate-holder rule above is satisfied and deferring them is
// legitimate. The wrong thing is the COUNT: "2 open" is a claim about decisions
// the app has itself decided are not yet due. Same defect class as every other
// one found today — a number that means something other than what it says.
//
// THE FIX, when it is ruled: `openChoices` (phaseProgress.js:133) filters only
// on "unanswered". It should also exclude rows the board has deferred, so the
// cue counts what is actually askable now. That needs the food cue to read the
// board, which is a real cross-module change and a product call about whether
// the hero may summarise not-yet-due work at all.
//
// This test FAILS the day someone fixes it — which is the point. Flip it then.
describe('KNOWN OPEN — the food cue counts decisions the board defers', () => {
  test('local event: the hero says "2 open" about two deferred rows', () => {
    const local = evAt(318, { isDestination: false });
    const cue = cueOf(local);
    expect(cue.id).toBe('food');
    const deferred = new Set((boardOf(local).deferred || []).map((d) => d.id));
    const counted = (cue.records || []).filter((id) => deferred.has(id));
    // Documenting the defect, not endorsing it.
    expect(counted.sort()).toEqual(['alcohol', 'food_style']);
  });
});

describe('a gate-holder is never shelved', () => {
  // The structural half of the same ruling: a decision that other decisions wait
  // on cannot be "later" than the things waiting on it. `blocks` names the
  // categories this row gates.
  test('no row declaring blocks[] sits on the horizon shelf', () => {
    for (const daysOut of [90, 210, 318, 400]) {
      const board = boardOf(evAt(daysOut));
      const shelvedGates = (board.deferred || [])
        .filter((d) => Array.isArray(d.blocks) && d.blocks.length > 0)
        .map((d) => d.id);
      expect({ daysOut, shelvedGates }).toEqual({ daysOut, shelvedGates: [] });
    }
  });
});
