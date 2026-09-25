// ─── A PER-POUND PRICE MAY ONLY REPLACE A PER-POUND LINE ─────────────────────
//
// `canonicalProteinPrice` returns researched dollars PER POUND. `srcTierRange`
// used it to re-price any food line that satisfied `isProteinItem`, and never
// checked that the line was measured in pounds. Four shipped lines are not.
//
// Measured 2026-09-25 at 30 guests, on a non-default sourcing tier:
//
//   Engagement Party · Crostini & deviled eggs (shrimp, caprese skewers)
//     4 bites/guest authored at $0.60–$1.80 a bite
//     butcher $72  →  grocery $1,080
//     because shrimp is $9–$14 A POUND and 120 BITES were multiplied by it.
//     $36 a head, of appetizer.
//
//   Engagement Party · Meatballs & sliders      $90 → $450
//   Holiday Party    · Charcuterie & crudité    same shape
//   Low Country Boil · Old Bay / crab boil      $0.40–$1 a SERVING → $8–$14,
//     because "crab boil" satisfies isProteinItem. The seasoning was priced
//     as shrimp.
//
// WHY IT SURVIVED THIS LONG. `srcTierRange` returns null on the DEFAULT tier,
// so none of it fires until a host changes sourcing. The butcher default was
// hiding it — which is also why the change this investigation began as
// (defaulting everyone to Costco or grocery) had to wait: it would have
// shipped these numbers to every affected host at once.
//
// THE GUARD IS ON THE UNIT, NOT ON A LIST OF NAMES. A name blocklist needs
// editing every time a playbook adds an appetizer, and the next "crab boil"
// would arrive unannounced. A line priced in bites cannot take a price quoted
// in pounds, whatever the line is called.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import { isProteinItem, canonicalProteinPrice } from '../sourcing';

const WEIGHT = /^(lb|lbs|pound|pounds|oz|ounce|ounces|kg)\b/i;

const at = (type, sourcing, guests = 30) => playbookFoodPlan({
  id: 'x', type, date: '2026-11-06', venueCity: 'Annapolis', venueState: 'MD',
  guestMode: 'count', guestCount: guests, guestCountLocked: true, totalBudget: 3000,
  sourcing, foodChoices: {}, foodLocked: {}, foodSkip: {}, budget: [], vendors: [], guests: [],
}, {});

const lineLow = (plan, id) => {
  const row = (plan.list || []).find((i) => i && i.id === id);
  return row ? Math.round(Number(row.low) || 0) : null;
};

describe('a pound price only re-prices a pound line', () => {
  test('(premise) the corpus still HAS lines that match a protein but are not sold by weight', () => {
    // Without this the assertions below could pass over an empty set — the
    // failure mode that made three earlier "absent" findings in this project
    // wrong. If a future corpus prices everything by weight, this goes red and
    // the reader is told the guard has nothing left to guard.
    const mismatched = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        if (!p || p.category !== 'food' || !isProteinItem(p.item)) continue;
        if (WEIGHT.test(String(p.unit || ''))) continue;
        if (!canonicalProteinPrice(p.item, 'grocery')) continue;
        mismatched.push(`${pb.type} · ${p.id} (${p.unit})`);
      }
    }
    expect(mismatched.length).toBeGreaterThan(0);
  });

  test('THE DEFECT: a bite does not cost what a pound of shrimp costs', () => {
    // The concrete row, with the number a host would have read.
    const low = lineLow(at('Engagement Party', 'grocery'), 'p_apps_cold');
    expect(low).not.toBeNull();
    expect(low).toBeLessThan(200);          // was 1080
  });

  test('and seasoning is not priced as seafood', () => {
    // "Old Bay / crab boil seasoning" matched isProteinItem on the word crab.
    const b = at('Low Country Boil', 'butcher');
    const g = at('Low Country Boil', 'grocery');
    const seasoning = (b.list || []).find((i) => i && /old bay|crab boil/i.test(i.item || ''));
    expect(seasoning).toBeTruthy();   // the line is still in this playbook
    const lowB = lineLow(b, seasoning.id);
    const lowG = lineLow(g, seasoning.id);
    // A channel change may move a price a little. It may not multiply it.
    expect(lowG).toBeLessThanOrEqual(Math.max(5, lowB * 2));
  });

  // THREE LINES ARE STILL OUT, AND THEY ARE A DIFFERENT PROBLEM. Each is a
  // genuine protein sold by the pound, so neither guard applies; what is wrong
  // is that the SHARED table's band does not fit this particular protein:
  //
  //   Fish Fry      · whiting / catfish / porgies   $3-7/lb authored,
  //                   quoted the table's $9-14/lb seafood band. Those are
  //                   cheap fish; $9-14 is shrimp and crab.
  //   Crawfish Boil · live crawfish BY THE SACK     same shape — sack pricing
  //                   is not retail-seafood pricing.
  //   Sunday Dinner · whole chicken / fryer         table chicken band.
  //
  // Which number is right is a RESEARCH question, not a code one: the authored
  // bands carry their own cited sources and so does the table, and picking a
  // winner here would be a product decision wearing a bug fix's clothes. So
  // they are named, frozen, and visible — the same treatment this repo gives
  // NO_SINGLE_GATEWAY and AMBIGUOUS_BARE. A FOURTH one fails this test.
  const KNOWN_BAND_DISAGREEMENTS = [
    'Fish Fry · Fresh fish (whiting, catfish, porgies)',
    'Sunday Dinner · Whole chicken or cut-up fryer pieces (the main)',
    'Crawfish Boil · Live crawfish (by the sack, ~30-35 lb/sack)',
  ];

  test('NO food line anywhere multiplies when the channel changes', () => {
    // The general form, so the next bundled appetizer is covered without a new
    // test. A sourcing tier is a channel, and a channel is a discount or a
    // premium — never a different order of magnitude. 2x is far looser than
    // any real channel spread (the file's own table spans 0.69–1.08) and still
    // catches every defect above.
    const blown = [];
    for (const pb of ALL_PLAYBOOKS) {
      let base; let alt;
      try { base = at(pb.type, 'butcher'); alt = at(pb.type, 'grocery'); } catch { continue; }
      for (const row of (base.list || [])) {
        if (!row || row.skipped) continue;
        const a = Math.round(Number(row.low) || 0);
        const b = lineLow(alt, row.id);
        if (!a || b == null) continue;
        if (b > a * 2) blown.push(`${pb.type} · ${row.item} — $${a} → $${b}`);
      }
    }
    expect(blown.map((b) => b.split(' — ')[0]).sort()).toEqual([...KNOWN_BAND_DISAGREEMENTS].sort());
  });

  test('a REAL per-pound protein still re-prices, or the guard has eaten the feature', () => {
    // The other half. The guard must not silence the thing it is guarding: a
    // line actually sold by the pound should still pick up the researched
    // per-tier price. Costco is the cheaper channel, so the total must fall.
    const b = at('The Cookout', 'butcher');
    const c = at('The Cookout', 'costco');
    expect(c.foodLow).toBeLessThan(b.foodLow);
  });
});
