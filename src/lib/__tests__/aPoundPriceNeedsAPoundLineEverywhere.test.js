// ─── THE UNIT GUARD MUST HOLD AT EVERY DOOR TO THE TABLE ────────────────────
//
// 2026-09-25 fixed a per-pound price landing on a per-bite line by guarding
// `srcTierRange`. Measured on shipped code 2026-09-29, the same table was still
// reachable through TWO other callers, and one of them is a host-visible price:
//
//   Engagement Party, 30 guests, p_apps_cold ("Crostini & deviled eggs …")
//     default            $72-216
//     sourcing=grocery   $85-255     ← guarded: the authored band × tier factor
//     foodWhere chip     $1,080-1,680 ← UNGUARDED: shrimp's $9-14 A POUND × 120 bites
//
// $36 a head of appetizer, for a host who never opened the tier picker and
// simply tapped "Grocery" on one row. The third caller is the sourcing card's
// per-tier "~$X" figure, whose key protein on this playbook is also a bites
// line.
//
// WHY THE FIRST FIX MISSED IT: the rule was written into the caller that
// happened to be under investigation. The rule is a property of the TABLE — its
// numbers are dollars per pound — so it now lives in one function beside the
// lookup (`canonicalFor` in playbooks/index.js) and every caller goes through
// it. This file is the behavioural proof, per door.
//
// RED-PROOFED. Reverting `perItemStoreRange` to call `canonicalProteinPrice`
// directly puts the chip case back at $1,080-1,680 and the first test below
// fails on that literal.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import { isProteinItem, canonicalProteinPrice } from '../sourcing';

const WEIGHT_UNIT_RE = /^(lb|lbs|pound|pounds|oz|ounce|ounces|kg)\b/i;

const plan = (extra) => playbookFoodPlan({
  id: 'x', type: 'Engagement Party', guestCount: 30, guestCountLocked: true,
  guestEstimate: 30, foodChoices: {}, foodLocked: {}, foodSkip: {}, ...extra,
}) || {};
const row = (p, id) => (p.list || []).find((r) => r.id === id);
const band = (p, id) => { const r = row(p, id); return r ? `$${r.low}-${r.high}` : '(missing)'; };

describe('door 2 — the per-item store chip', () => {
  test('THE DEFECT: a bites line tapped to a store does not take a $/lb price', () => {
    // Written first as "the chip must equal the tier answer" and it went red at
    // $72-216 vs $85-255 — the fix is right and the assertion was not. With the
    // canonical price refused, `perItemStoreRange` returns null and the line
    // keeps the DEFAULT band; the tier case differs because the plan-wide
    // factor is applied there and the chip has no per-line factor to apply.
    //
    // NAMED, NOT SMOOTHED: that is a gap. Tapping "Grocery" on one bites line
    // now moves nothing at all, where it used to move 15x the wrong way. Going
    // from a wrong number to no number is the right first step and is not the
    // finished answer — whether a per-item chip should carry the tier's factor
    // is a product decision, not a defect fix, so it is stated here rather than
    // decided inside a bug fix.
    const chip = plan({ foodWhere: { p_apps_cold: 'Grocery store' } });
    const base = plan({});
    expect(band(chip, 'p_apps_cold')).toBe(band(base, 'p_apps_cold'));
    // The literal the defect produced, so a reader can see what was at stake.
    expect(band(chip, 'p_apps_cold')).not.toBe('$1080-1680');
  });

  test('and a POUND line still takes its researched per-tier price', () => {
    // The other half. A guard that returns null everywhere would pass the test
    // above and silently disable the feature the chip exists for.
    const base = plan({ type: 'Sunday Dinner' });
    const chipped = playbookFoodPlan({
      id: 'x', type: 'Sunday Dinner', guestCount: 30, guestCountLocked: true,
      guestEstimate: 30, foodChoices: {}, foodLocked: {}, foodSkip: {},
      foodWhere: { p_chicken: 'Grocery store' },
    }) || {};
    const b = row(base, 'p_chicken'); const c = row(chipped, 'p_chicken');
    expect(WEIGHT_UNIT_RE.test(String(b.unit || ''))).toBe(true);
    expect(c.low).not.toBe(b.low);
  });
});

describe('door 3 — the sourcing card', () => {
  test('the per-tier figure does not quote a number the plan refuses to use', () => {
    // WRITTEN TWICE. The first version asserted "no tier exceeds 5x the
    // default" and passed with the fix REVERTED, because the real defect is
    // 4.3x — a threshold I picked without measuring, on a test whose whole job
    // is to detect this. Re-measured and pinned to the literal figures:
    //
    //   Engagement Party, key protein "Meatballs & sliders", 30 guests
    //     before   butcher 158 · costco 450 · grocery 675
    //     after    butcher 158 · costco 134 · grocery 186
    //
    // This is the card that answers "where should I shop", and before the fix
    // it told every Engagement Party host that grocery costs 4.3x butcher —
    // for a line sold in bites, priced off shrimp's $9-14 a pound. It is also
    // the only screen in the product that compares tiers, so a wrong number
    // here does not sit beside the right one: it IS the answer.
    const p = plan({});
    expect(p.sourcingKey).toBeTruthy();
    expect(p.sourcingKey.item).toBe('Meatballs & sliders');
    expect(p.sourcingKey.byTier).toEqual({ butcher: 158, costco: 134, grocery: 186 });
  });
});

describe('the census that found it', () => {
  test('no shipped line is both protein-matching, non-weight, and canonically priced WITHOUT the guard', () => {
    // This is the standing inventory, not an assertion that the list is empty —
    // three such lines exist and are legitimate appetizer rows. What it pins is
    // WHICH they are, so a new one arrives with a reason rather than silently.
    const hits = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        if (p.category !== 'food' || !isProteinItem(p.item)) continue;
        if (p.sourcingPrices && Object.keys(p.sourcingPrices).length) continue;
        if (WEIGHT_UNIT_RE.test(String(p.unit || ''))) continue;
        if (canonicalProteinPrice(p.item, 'grocery')) hits.push(`${pb.type}/${p.id} (${p.unit})`);
      }
    }
    expect(hits.sort()).toEqual([
      'Engagement Party/p_apps_cold (bites)',
      'Engagement Party/p_apps_hot (bites)',
      'Holiday Party/p_apps_cold (bites)',
    ]);
  });
});
