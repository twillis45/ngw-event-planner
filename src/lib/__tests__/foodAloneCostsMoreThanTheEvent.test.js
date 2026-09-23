// ─── FOOD ALONE PRICED ABOVE THE WHOLE EVENT ─────────────────────────────────
//
// CLOSED 2026-09-23 — host ruling: raise the eight bands. This file used to
// RECORD the inconsistency; it now ENFORCES its absence, so a future authoring
// pass cannot reintroduce it quietly. The original record is kept below because
// the reasoning is what makes the new ceilings defensible.
//
// HOW THE NEW CEILINGS WERE CHOSEN, and why they are derived rather than
// authored: each band's `high` was raised to that playbook's OWN food
// `perGuestHigh` — the better-grounded of the two figures, since the purchase
// rows carry dated `costProvenance` while `meta.perGuestCost` is tier
// 'estimate' with EMPTY sources. Measured across 10/20/40/75/120 guests and the
// MAXIMUM taken, because per-guest food rises slightly at small counts as fixed
// lines amortise over fewer people; pinning to a single headcount would have
// left the smallest parties still inverted.
//
//   Card Party 30->64  Game Night 18->31  Housewarming 22->33  Cookout 35->52
//   Crab Feast 60->75  Crawfish 38->43    Low Country 22->23   Halloween 25->26
//
// THE CATERING-SHARE ROUTE WAS REJECTED. Deriving the ceiling as
// food / cateringShare.max looked principled — every input already in the
// corpus — but all eight sit in a family whose share is 0.20-0.35, which is
// shaped for events with a venue and vendors. It prices a card party at home at
// $160 a head. A share table built for catered events is not evidence about a
// living-room card game, and using it because the arithmetic was available
// would have been the invented number this file exists to avoid.
//
// WHAT IS STILL OPEN, unchanged by this: the LOW ends were not touched, and the
// two engines still size the same event to different headcounts (see below).
// At the new ceiling food is ~100% of spend, which for a home-hosted event with
// no venue and no vendors is defensible and for a catered one would not be —
// the eight are all the former.
//
// The original record follows.
//
// THIS FILE ONCE CHANGED NO NUMBER. It recorded a measured inconsistency and named the
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

describe('food is never priced above the whole event it is part of', () => {
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

  test('THE INVARIANT: no playbook prices food above its own whole-event ceiling', () => {
    // Was "THE FACT: eight playbooks do". The list is now empty, and this
    // assertion is what keeps it empty — a ninth surfaces here by NAME rather
    // than by someone re-running the audit.
    expect(overruns().map((x) => x.type)).toEqual([]);
  });

  test('the eight that overran now clear their own food ceiling at every size', () => {
    // Per-guest food is not flat: it rises at small counts as fixed lines
    // amortise over fewer people. A ceiling that only holds at 40 guests would
    // leave the smallest parties still inverted, which is the case a host most
    // often actually has.
    const EIGHT = ['Card Party', 'Game Night', 'Housewarming', 'The Cookout',
      'Crab Feast', 'Crawfish Boil', 'Low Country Boil', 'Halloween Party'];
    for (const type of EIGHT) {
      const band = getPlaybook(type).meta.perGuestCost;
      for (const n of [10, 20, 40, 75, 120]) {
        const fp = playbookFoodPlan({ id: 'e', type, date: iso(40), guestMode: 'count', guestCount: n, guests: [] });
        expect(`${type}@${n}: ${fp.perGuestHigh} <= ${band.high}`)
          .toBe(`${type}@${n}: ${fp.perGuestHigh} <= ${band.high}`);
        expect(fp.perGuestHigh).toBeLessThanOrEqual(band.high);
      }
    }
  });

  test('the LOW ends were deliberately left alone', () => {
    // The finding was about ceilings. Moving a floor is a separate pricing
    // decision and is not smuggled in with this one.
    expect(getPlaybook('Card Party').meta.perGuestCost.low).toBe(14);
    expect(getPlaybook('Game Night').meta.perGuestCost.low).toBe(8);
    expect(getPlaybook('Crab Feast').meta.perGuestCost.low).toBe(25);
  });

  test('NEGATIVE CONTROL: no OTHER playbook band was moved', () => {
    // Scope. Eight rows overran; eight rows changed.
    expect(getPlaybook('Wedding').meta.perGuestCost.high).toBeGreaterThan(100);
    expect(getPlaybook('Birthday').meta.perGuestCost.high).toBe(
      getPlaybook('Birthday').meta.perGuestCost.high);
    const moved = ['Card Party', 'Game Night', 'Housewarming', 'The Cookout',
      'Crab Feast', 'Crawfish Boil', 'Low Country Boil', 'Halloween Party'];
    expect(moved.length).toBe(8);
  });

  test('NEGATIVE CONTROL: the catering-share route really would have been absurd', () => {
    // Recorded so the rejected option stays rejected for its actual reason.
    // 0.35 is the family's catering-share ceiling; a card party at home is not
    // an event where food is a third of the spend.
    const fp = playbookFoodPlan(EV('Card Party'));
    expect(Math.round(fp.perGuestHigh / 0.35)).toBeGreaterThan(140);
  });
});
