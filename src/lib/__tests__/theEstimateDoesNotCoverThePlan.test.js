// ─── WHEN THE HEADLINE NUMBER DOES NOT COVER THE PLAN'S OWN VENDORS ─────────
//
// `estimateTotalRange` has reported `requiredVendorFloor` and
// `belowRequiredVendors` since 2026-09-19 and NOTHING READ THEM. Another correct
// fact with no consumer — the same shape as `timingConflict`, which sat unread
// for five days, and `belowRequiredVendors` sat unread for four.
//
// ── THE CALL WAS "REFUSE OR FLOOR", AND THE ANSWER IS NEITHER ───────────────
//
// Open call #3 put two options: refuse the headline when it does not cover the
// plan, or raise it to the vendor floor.
//
//   REFUSING costs those hosts the one number they came for, and the estimate
//   is not WRONG about what a typical event of that type costs — it is silent
//   about what THIS plan already commits to.
//
//   FLOORING builds the host's primary number out of 224 playbook vendor cost
//   ranges carrying ZERO provenance. That is laundering an unsourced figure
//   into the most load-bearing position on the screen.
//
// So the host gets BOTH numbers and is told which is which — strictly more
// information than either option, and the answer this codebase reaches
// everywhere else: disclose rather than invent or withhold.
//
// ── WHERE IT ACTUALLY FIRES, MEASURED ──────────────────────────────────────
// Swept across all 45 playbooks at seven guest counts (315 combinations): 15
// fire, and they are not scattered. They are SMALL-HEADCOUNT, VENDOR-HEAVY
// events — a 10-person wedding, a 20-person conference, a 2-person proposal —
// which is exactly where a per-head model breaks down, because per-head scales
// with guests and a vendor floor does not. That is the same finding open call
// #3 was filed under, now visible to the host it affects.
import { estimateTotalRange } from '../budgetEstimator';
import { estimateShortfallNote } from '../budgetCopy';
import { ALL_PLAYBOOKS } from '../playbooks';

const est = (type, guestCount) => estimateTotalRange({ type, guestCount });

describe('(premise) the shortfall is real, and the engine already knew', () => {
  test('Surprise Proposal’s own roster costs more than its whole estimate', () => {
    // The packet's headline case. Without this, every assertion below could be
    // passing over an estimator that no longer produces the gap.
    const e = est('Surprise Proposal', 2);
    expect(e.requiredVendorFloor).toBe(1750);
    expect(e.highTotal).toBe(500);
    expect(e.belowRequiredVendors).toBe(true);
  });

  test('and it was reported, with no reader, before today', () => {
    // The flag is the engine's, not this module's. The note must never
    // re-derive the comparison — it reads the verdict already taken.
    const e = est('Surprise Proposal', 2);
    expect(Object.prototype.hasOwnProperty.call(e, 'belowRequiredVendors')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(e, 'requiredVendorFloor')).toBe(true);
  });
});

describe('the note says both numbers and marks which is which', () => {
  test('it names the floor, the top of the range, and what to do', () => {
    const note = estimateShortfallNote(est('Surprise Proposal', 2));
    expect(note).toMatch(/what a typical event of this kind costs/);
    expect(note).toMatch(/start around \$1,750/);
    expect(note).toMatch(/more than the \$500 top of it/);
    expect(note).toMatch(/setting your number from the vendors, not the range/);
  });

  test('THE FLOOR IS NEVER A PRICE — "start around", because it has no sources', () => {
    // The floor is built from vendor ranges registered at tier 'estimate' with
    // EMPTY sources. Presenting it as a figure rather than a starting point
    // would make it the very thing flooring the headline was refused for.
    const note = estimateShortfallNote(est('Surprise Proposal', 2));
    expect(note).toMatch(/start around/);
    expect(note).not.toMatch(/will cost|costs \$|the price|quote/i);
  });

  test('IT DOES NOT MOVE THE ESTIMATE. The headline is untouched.', () => {
    // The whole point of refusing to floor. If a future pass makes the note by
    // changing the number instead, this fails.
    const e = est('Surprise Proposal', 2);
    expect(e.lowTotal).toBe(100);
    expect(e.highTotal).toBe(500);
  });
});

describe('it stays silent whenever it has nothing true to say', () => {
  test('an estimate that covers its own vendors says nothing', () => {
    // A full-size wedding's per-head band clears its roster comfortably.
    const e = est('Wedding', 80);
    expect(e.belowRequiredVendors).toBe(false);
    expect(estimateShortfallNote(e)).toBe(null);
  });

  test('a playbook with no required vendors says nothing', () => {
    const e = est('Birthday', 20);
    expect(e.requiredVendorFloor).toBe(null);
    expect(estimateShortfallNote(e)).toBe(null);
  });

  test('and it refuses anything it cannot state truthfully', () => {
    expect(estimateShortfallNote(null)).toBe(null);
    expect(estimateShortfallNote({})).toBe(null);
    // Flagged but with a floor that is not actually above the top — the
    // sentence would contradict itself.
    expect(estimateShortfallNote({ belowRequiredVendors: true, requiredVendorFloor: 400, highTotal: 500 })).toBe(null);
    expect(estimateShortfallNote({ belowRequiredVendors: true, requiredVendorFloor: 0, highTotal: 500 })).toBe(null);
  });
});

describe('THE POPULATION — where a per-head model breaks down', () => {
  const sweep = () => {
    const out = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const g of [2, 10, 20, 40, 80, 150, 300]) {
        let e = null;
        try { e = est(pb.type, g); } catch (_err) { e = null; }
        if (e && estimateShortfallNote(e)) out.push(`${pb.type}@${g}`);
      }
    }
    return out;
  };

  test('it fires on a real, bounded set — not everywhere, and not nowhere', () => {
    const fires = sweep();
    // Bounded: a note that fired on most of the corpus would be a disclaimer,
    // and a disclaimer on every screen is read as decoration.
    expect(fires.length).toBeGreaterThan(5);
    expect(fires.length).toBeLessThan(40);
    expect(fires).toContain('Surprise Proposal@2');
  });

  test('EVERY ONE IS A SMALL HEADCOUNT — which is the finding, not a coincidence', () => {
    // Per-head scales with guests; a vendor floor does not. So the gap lives at
    // the bottom of the guest range, and closes as the event grows. If this ever
    // starts firing at 150 and 300, the estimator has a different problem and
    // this note is no longer describing it.
    for (const f of sweep()) {
      const g = Number(String(f).split('@')[1]);
      expect(g).toBeLessThanOrEqual(80);
    }
  });

  test('…and the same type at full size says nothing at all', () => {
    // The clearest proof it is a headcount effect: one type, two sizes.
    expect(estimateShortfallNote(est('Wedding', 10))).toBeTruthy();
    expect(estimateShortfallNote(est('Wedding', 80))).toBe(null);
  });
});
