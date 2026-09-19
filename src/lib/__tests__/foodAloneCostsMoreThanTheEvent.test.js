// ─── FOOD ALONE PRICED ABOVE THE WHOLE EVENT ─────────────────────────────────
//
// THIS FILE CHANGES NO NUMBER. It records a measured inconsistency and names the
// rows, the way deadlinesThatContradictTheirSource.test.js and
// theRulingsOwnBarIsUnmet.test.js do: a FACT about the corpus, not a change to
// it, and the place a ninth row has to surface.
//
// Two figures describe the same event and the host sees both in the same shell:
//
//   meta.perGuestCost   the WHOLE-EVENT per-head band, feeding estimateTotalRange
//                       (HostShellV2 ~:6413) — food, venue, vendors, everything
//   playbookFoodPlan    the itemized FOOD plan, priced from each purchase row's
//                       own unitCostRange (HostShellV2 ~:1962, ~:5024)
//
// Food is a SUBSET of the event, so its per-guest ceiling cannot honestly exceed
// the whole-event per-head ceiling: at that ceiling, food alone costs more than
// everything. MEASURED across all 45 playbooks at 40 guests, T-40d — EIGHT do:
//
//   Card Party          band $14–30/head   food $26–56/guest   1.87x
//   Game Night          band  $8–18        food $13–29         1.61x
//   Housewarming        band  $8–22        food $15–33         1.50x
//   The Cookout         band $15–35        food $20–47         1.34x
//   Crab Feast          band $25–60        food $18–74         1.23x
//   Crawfish Boil       band $18–38        food $17–43         1.13x
//   Low Country Boil    band $12–22        food $11–23         1.05x
//   Halloween Party     band  $8–25        food $10–26         1.04x
//
// A SECOND, INDEPENDENT CONTRIBUTOR, worth separating because it is not a
// pricing question. The two engines size the same event to different headcounts:
// `playbookFoodPlan` uses `eventSizing(event, playbook).ceiling`
// (playbooks/index.js:4036-4037) while `estimateTotalRange` uses the raw
// `guestCount` (totalEstimate.js:112). At 40 guests:
//
//   The Cookout / Housewarming / Crab Feast   ceiling 46   (+15%)
//   Card Party / Game Night                   ceiling 42   (+5%)
//   Wedding                                    ceiling 40   (+0%)
//
// So even identical bands would produce mismatched totals. BOTH READINGS ARE
// DEFENSIBLE and that is exactly why neither is changed here: you shop for the
// high end so you do not run out, and you budget against the count you planned.
// It is the same two-questions-one-name shape budgetFor.js was built for, and
// naming them is a bigger job than this file.
//
// WHY NO BAND WAS RE-AUTHORED. The itemized plan is the better-grounded of the
// two — its purchase lines carry `costProvenance` with dated sources, while
// `meta.perGuestCost` has none and its registry record (budget.playbookPerGuestCost)
// is tier 'estimate' with EMPTY sources. That argues for raising the eight bands
// rather than cutting the food lines. But raising a host-facing dollar band is a
// pricing decision, and this file's job is to make it a decision rather than a
// discovery.
//
// ONE MEASUREMENT TRAP, recorded because it cost a probe: `playbookFoodPlan`
// returns `bandLow`/`bandHigh`, and they are the GUEST-COUNT band (32–46), not
// the cost band. The per-guest cost figures are `perGuestLow`/`perGuestHigh`.
import { ALL_PLAYBOOKS, playbookFoodPlan, eventSizing, getPlaybook } from '../playbooks';

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const EV = (type) => ({
  id: 'e', type, date: iso(40), guestMode: 'count', guestCount: 40, guests: [],
});

const overruns = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    const b = pb.meta && pb.meta.perGuestCost;
    if (!b || !Number.isFinite(b.low) || !Number.isFinite(b.high)) continue;
    let fp = null;
    try { fp = playbookFoodPlan(EV(pb.type)); } catch (_e) { continue; }
    if (!fp || !Number.isFinite(fp.perGuestHigh)) continue;
    if (fp.perGuestHigh > b.high) out.push({ type: pb.type, ratio: fp.perGuestHigh / b.high });
  }
  return out.sort((x, y) => y.ratio - x.ratio);
};

describe('food priced above the whole event it is part of', () => {
  test('(premise) both figures exist for the whole corpus', () => {
    // A containment claim over a corpus where one side is missing is a claim
    // about nothing.
    let paired = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const b = pb.meta && pb.meta.perGuestCost;
      if (!b || !Number.isFinite(b.high)) continue;
      try { if (Number.isFinite(playbookFoodPlan(EV(pb.type)).perGuestHigh)) paired += 1; } catch (_e) { /* skip */ }
    }
    expect(paired).toBe(45);
  });

  test('THE FACT: eight playbooks price food above their own whole-event ceiling', () => {
    expect(overruns().map((x) => x.type)).toEqual([
      'Card Party',
      'Game Night',
      'Housewarming',
      'The Cookout',
      'Crab Feast',
      'Crawfish Boil',
      'Low Country Boil',
      'Halloween Party',
    ]);
  });

  test('the worst of them is nearly 2x, which is what makes it visible', () => {
    // Card Party: the budget headline says up to $30 a head while the food list
    // beneath it itemizes up to $56 a guest. Both render in the same shell.
    const worst = overruns()[0];
    expect(worst.type).toBe('Card Party');
    expect(worst.ratio).toBeGreaterThan(1.8);
    const b = getPlaybook('Card Party').meta.perGuestCost;
    const fp = playbookFoodPlan(EV('Card Party'));
    expect(`band $${b.low}-${b.high} / food $${fp.perGuestLow}-${fp.perGuestHigh}`)
      .toBe('band $14-30 / food $26-56');
  });

  test('the SECOND contributor is a headcount disagreement, not a price one', () => {
    // Separated deliberately: this half is not a pricing question. The food plan
    // sizes to the ceiling; the estimator uses the raw count.
    const sized = (t) => eventSizing(EV(t), getPlaybook(t));
    expect(sized('The Cookout').ceiling).toBe(46);
    expect(sized('Card Party').ceiling).toBe(42);
    expect(sized('Wedding').ceiling).toBe(40);
    // The food plan really does size to that ceiling rather than to guestCount.
    expect(playbookFoodPlan(EV('The Cookout')).guests).toBe(46);
    expect(playbookFoodPlan(EV('Wedding')).guests).toBe(40);
  });

  test('NEGATIVE CONTROL: most of the corpus contains its food correctly', () => {
    // If this ever approaches 45 the invariant has stopped meaning anything and
    // the sweep is measuring something other than what it claims.
    expect(overruns().length).toBeLessThan(12);
    expect(ALL_PLAYBOOKS.length - overruns().length).toBeGreaterThan(30);
  });

  test('NEGATIVE CONTROL: nothing here moved a band or a purchase price', () => {
    // A recording test that quietly re-prices what it measures is worthless. The
    // two ends of the worst case are asserted so this file cannot be where a
    // pricing change hides.
    expect(getPlaybook('Card Party').meta.perGuestCost).toEqual({ low: 14, high: 30, currency: 'USD' });
    expect(getPlaybook('The Cookout').meta.perGuestCost).toEqual({ low: 15, high: 35, currency: 'USD' });
  });
});
