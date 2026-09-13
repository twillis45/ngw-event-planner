// Host report (2026-09-13): the "Your budget — Typical/Lean/All-out" number
// never looked at what's actually in the plan. Every home-hosted type (The
// Cookout, Fish Fry, Crab Feast, Sunday Dinner...) has its own authored,
// type-specific `meta.perGuestCost` — the SAME data the real, itemized food
// plan (playbookFoodPlan) prices from — but PER_HEAD_BY_TYPE has no entry for
// any of them, so all ~20 fell to the flat $30-120/head `home_hosted` family
// default regardless of how different their real per-guest cost is. A Fish
// Fry ($8-18/head authored) showed a "Typical" up to 6x its own playbook's
// number, and disagreed with the plan's own real itemized total.
//
// Deliberately scoped: this ONLY fills types missing from PER_HEAD_BY_TYPE.
// Several already-curated types (Wedding, Birthday, Reunion...) have a
// DIFFERENT, independently-sourced perGuestCost on their own playbook that
// disagrees with the curated table — reconciling those is a pricing-research
// call, not this bug, and must stay untouched here.
import { estimateTotalRange, PER_HEAD_BY_TYPE, PER_HEAD_BY_FAMILY } from '../budgetEstimator/totalEstimate';

const neutral = { date: null, timeOfDay: 'afternoon' };

describe('estimateTotalRange — playbook-specific per-head cost fills the real gap', () => {
  // estimateTotalRange rounds both ends to the nearest $100 — accounted for below.
  const round100 = (n) => Math.round(n / 100) * 100;

  test('The Cookout uses its OWN playbook band, not the generic home_hosted default', () => {
    const r = estimateTotalRange({ type: 'The Cookout', guestCount: 15, ...neutral });
    // theCookout.js meta.perGuestCost: { low: 15, high: 35 }
    expect(r.lowTotal).toBe(round100(15 * 15));   // $200, was round100(15*30)=$500 pre-fix
    expect(r.highTotal).toBe(round100(15 * 35));  // $500, was round100(15*120)=$1,800 pre-fix
  });

  test('Fish Fry — the widest gap from the old generic default (was up to 6x too high)', () => {
    const r = estimateTotalRange({ type: 'Fish Fry', guestCount: 20, ...neutral });
    // fishFry.js meta.perGuestCost: { low: 8, high: 18 }
    expect(r.lowTotal).toBe(round100(20 * 8));
    expect(r.highTotal).toBe(round100(20 * 18));
    // Sanity: this is well below what the old flat family default would give.
    expect(r.highTotal).toBeLessThan(round100(20 * PER_HEAD_BY_FAMILY.home_hosted.high));
  });

  test('a type with NO playbook and NO PER_HEAD_BY_TYPE entry falls to the safe-middle family (unchanged, pre-existing behavior)', () => {
    // eventTaxonomy.mjs: an unrecognized type resolves to the "safe middle"
    // family, host_driven — this fix never touches that path.
    const r = estimateTotalRange({ type: 'Not A Real Type', guestCount: 10, ...neutral });
    expect(r.lowTotal).toBe(round100(10 * PER_HEAD_BY_FAMILY.host_driven.low));
    expect(r.highTotal).toBe(round100(10 * PER_HEAD_BY_FAMILY.host_driven.high));
  });

  test('an already-curated PER_HEAD_BY_TYPE entry is NEVER overridden by its playbook — out of scope, left alone', () => {
    // Birthday's playbook carries its own (lower) perGuestCost, but the curated
    // table wins — reconciling the two is a pricing call, not this fix.
    const r = estimateTotalRange({ type: 'Birthday', guestCount: 40, ...neutral });
    expect(r.lowTotal).toBe(40 * PER_HEAD_BY_TYPE.Birthday.low);
    expect(r.highTotal).toBe(40 * PER_HEAD_BY_TYPE.Birthday.high);
  });

  test('destination blending still applies on top of a playbook-sourced band', () => {
    const plain = estimateTotalRange({ type: 'The Cookout', guestCount: 15, ...neutral });
    const dest = estimateTotalRange({ type: 'The Cookout', guestCount: 15, isDestination: true, ...neutral });
    const tl = PER_HEAD_BY_FAMILY.travel_led;
    expect(dest.lowTotal).toBe(15 * tl.low);
    expect(dest.highTotal).toBe(15 * tl.high);
    expect(dest.destinationAdjusted).toBe(true);
    expect(dest.lowTotal).toBeGreaterThan(plain.lowTotal);
  });
});
