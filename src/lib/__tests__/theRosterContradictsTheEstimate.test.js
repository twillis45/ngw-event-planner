// ─── A $300 BUDGET OVER A $1,750 RING ────────────────────────────────────────
//
// `estimateTotalRange` multiplies a per-head band by a headcount. That is the
// wrong SHAPE for an event whose costs are flat and whose guest count is one or
// two — and the playbook says so itself, in data it authored.
//
// MEASURED 2026-09-19. Surprise Proposal's vendor roster declares two REQUIRED
// rows, both `costUnit: 'flat'`:
//
//   Proposal photographer (hidden)        $250 – 800     flat   required
//   Jeweler (ring + resize + insurance)   $1,500 – 8,000 flat   required
//
// Required floor $1,750. The estimate at its own typical headcount of ONE:
//
//   Surprise Proposal @1    required floor $1,750    estimate $100–300     5.8x
//   Conference @50          required floor $47,000   estimate $7,500–20,000 2.4x
//
// THIS REPORTS AND DOES NOT RESOLVE, and the reason is that both remedies change
// what a host sees:
//
//   REFUSE — return null, which this function already does for a missing type or
//     count, and which matches the house rule everywhere else (the bracket gate
//     "withholds rather than repairs"; eventGeoQuery is "empty when truly
//     unknown — never a fabricated location"). It costs those hosts a budget
//     headline entirely.
//   FLOOR — raise the estimate to the roster sum. It keeps a number, but builds
//     it from vendor ranges that carry no provenance of their own (all 224 of
//     them — moneyProvenance.js#vendor.playbookCostRange).
//
// So the contradiction is named on the result instead, the same way
// `costFactorApplied` carries a factor's basis out to whoever renders it. A
// surface can now mark, floor or refuse in one line; the engine does not decide
// for it.
//
// THE DISCRIMINATOR THAT WAS MEASURED AND THROWN AWAY, recorded because it looked
// obviously right: "refuse a per-head estimate when a playbook's vendor rows are
// ALL flat." Measured first — **14 of 45** playbooks are all-flat, including
// Quinceañera at 150 guests and a PTA fundraiser at 250. All-flat vendors does
// not mean no per-head cost, and that predicate would have silenced eleven
// perfectly good estimates.
import { estimateTotalRange, PER_HEAD_BY_TYPE } from '../budgetEstimator/totalEstimate';
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';

// A FIXED DATE, AND HERE IS WHY (2026-09-22, three days after this file shipped).
// The helper was `date: iso(60)` — today plus sixty days — under assertions that
// pin absolute dollars. Green the day it was written, red with no code change
// when the clock rolled: today+60 landed on 2026-11-21, a SATURDAY, and the
// estimator carries a day-of-week multiplier. Measured:
//
//     2027-03-05 Fri    8300        2026-11-21 Sat (ordinary)      9000
//     2027-03-06 Sat    9000        2026-11-28 Sat (Thanksgiving) 10100
//     2027-03-07 Sun    7500
//     2027-03-08 Mon    7500
//
// That is the time bomb HANDOFF already records once — `recordDedupStaysLive`,
// green in CI 2026-09-14, red 2026-09-17, no commit in between. A relative date
// under an absolute assertion is a test that schedules its own failure, and this
// is the second instance, so it is named here rather than quietly repaired.
//
// The date is pinned to a plain Sunday carrying no multiplier, and the
// day-of-week behaviour is asserted deliberately below instead of being left for
// whoever is on call to rediscover.
const FIXED_SUNDAY = '2027-03-07';
const est = (type, guestCount) => estimateTotalRange({ type, guestCount, date: FIXED_SUNDAY });

describe('the playbook roster against its own estimate', () => {
  test('(premise) the required rows are really there, really flat, really required', () => {
    // Every assertion below is vacuous if the roster stops declaring them.
    const req = (getPlaybook('Surprise Proposal').vendors || []).filter((v) => v && v.required === true);
    expect(req.map((v) => v.category).sort()).toEqual([
      'Jeweler (ring + resize + insurance)', 'Proposal photographer (hidden)',
    ]);
    expect(req.every((v) => String(v.costUnit).toLowerCase() === 'flat')).toBe(true);
    expect(req.reduce((s, v) => s + v.costRange[0], 0)).toBe(1750);
  });

  test('THE FACT: the estimate now reports the floor its own playbook sets', () => {
    const r = est('Surprise Proposal', 1);
    expect(r.requiredVendorFloor).toBe(1750);
    expect(r.highTotal).toBe(300);
    expect(r.belowRequiredVendors).toBe(true);

    const c = est('Conference', 50);
    expect(c.requiredVendorFloor).toBe(47000);
    expect(c.belowRequiredVendors).toBe(true);
  });

  test('NO NUMBER MOVED — the estimate is byte-identical to before', () => {
    // The whole point: this reports a contradiction, it does not resolve one. If
    // a later pass decides to refuse or to floor, this is the test that should
    // be rewritten deliberately rather than discovered failing.
    expect(est('Surprise Proposal', 1).lowTotal).toBe(100);
    expect(est('Surprise Proposal', 1).highTotal).toBe(300);
    expect(est('Conference', 50).lowTotal).toBe(7500);
    expect(est('Conference', 50).highTotal).toBe(20000);
    const w = est('Wedding', 80);
    expect([w.lowTotal, w.highTotal]).toEqual([80 * PER_HEAD_BY_TYPE.Wedding.low, 80 * PER_HEAD_BY_TYPE.Wedding.high]);
  });

  test('THE CONTRADICTION IS RARE — two playbooks, not a corpus-wide miscalibration', () => {
    // If this ever grows, the per-head model is wrong somewhere new and that is
    // worth knowing loudly. If it shrinks to zero, someone resolved it and this
    // file should say how.
    const hit = [];
    for (const pb of ALL_PLAYBOOKS) {
      const g = pb.meta && pb.meta.typicalGuests;
      const n = Number.isFinite(g) ? g : (g && Number.isFinite(g.low) ? g.low : 20);
      const r = est(pb.type, n);
      if (r && r.belowRequiredVendors) hit.push(pb.type);
    }
    expect(hit.sort()).toEqual(['Conference', 'Surprise Proposal']);
  });

  test('NEGATIVE CONTROL: a playbook with no REQUIRED rows claims no floor', () => {
    // `null` means "this playbook declares nothing", which must never read as a
    // floor of zero — a zero floor would make `belowRequiredVendors` false for a
    // reason that has nothing to do with the estimate being sound.
    const noReq = ALL_PLAYBOOKS.find((pb) => (pb.vendors || []).length
      && !(pb.vendors || []).some((v) => v && v.required === true));
    if (noReq) {
      const r = est(noReq.type, 20);
      expect(r.requiredVendorFloor).toBe(null);
      expect(r.belowRequiredVendors).toBe(false);
    }
    // …and a type with no playbook at all resolves the same way.
    const r = est('Not A Real Type', 10);
    expect(r.requiredVendorFloor).toBe(null);
    expect(r.belowRequiredVendors).toBe(false);
  });

  test('NEGATIVE CONTROL: an OPTIONAL vendor never inflates the floor', () => {
    // Surprise Proposal authors five optional rows, including a $3,000 planner
    // and a $900 videographer. Counting them would nearly double the floor and
    // would be a claim the playbook never made.
    const all = (getPlaybook('Surprise Proposal').vendors || [])
      .filter((v) => v && Array.isArray(v.costRange))
      .reduce((s, v) => s + v.costRange[0], 0);
    expect(all).toBeGreaterThan(1750);
    expect(est('Surprise Proposal', 1).requiredVendorFloor).toBe(1750);
  });

  test('THE MULTIPLIER THAT BROKE THIS FILE IS GONE (2026-09-23)', () => {
    // This test recorded a real defect: a CONFERENCE was charged +20% for
    // being on a Saturday, and +10% for a Friday, with nothing saying why —
    // on an event type where weekday demand runs the OTHER way. Both figures
    // came from wedding sources.
    //
    // The day-of-week premium was demoted to a flag with no multiplier on
    // 2026-09-23, decided against the research in moneyProvenance.js: the only
    // source measuring whole-event spend puts Saturday 1.2% over Sunday, and we
    // were applying sixteen times that. A conference now prices the same on
    // every day of the week, which is the honest answer when no source on the
    // matching unit says otherwise.
    const low = (d) => estimateTotalRange({ type: 'Conference', guestCount: 50, date: d }).lowTotal;
    expect(low('2027-03-07')).toBe(7500);   // Sunday
    expect(low('2027-03-08')).toBe(7500);   // Monday
    expect(low('2027-03-05')).toBe(7500);   // Friday — was 8,300
    expect(low('2027-03-06')).toBe(7500);   // Saturday — was 9,000
    // A HOLIDAY STILL MOVES IT, and should: that factor is about the date
    // itself, not the weekday, and it was never the thing this test caught.
    expect(low('2026-11-28')).toBe(8600);   // Thanksgiving Saturday — was 10,100
    // The basis is still not reported on the holiday premium, which remains
    // this file's open finding.
    expect(estimateTotalRange({ type: 'Conference', guestCount: 50, date: '2026-11-28' }).costFactorApplied ?? null).toBe(null);
  });

  test('NEGATIVE CONTROL: a per-guest required row scales with the headcount', () => {
    // A flat sum would understate any roster priced per guest. Wedding's caterer
    // is `per guest`, so its floor must move with n — otherwise the predicate is
    // silently wrong for every catered type.
    const a = est('Wedding', 10).requiredVendorFloor;
    const b = est('Wedding', 100).requiredVendorFloor;
    expect(b).toBeGreaterThan(a);
    // …and Wedding is NOT in contradiction at either size.
    expect(est('Wedding', 100).belowRequiredVendors).toBe(false);
  });
});
