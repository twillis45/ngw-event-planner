// ─── "DIRECTLY SOURCED" OVER A NUMBER NOBODY CHECKED ─────────────────────────
//
// A purchase line's price can be MOVED after it is sourced. A decision declares
// `costFactors: { '<option>': <mult> }` + `affects: ['<purchaseId>']`, and the
// chosen option re-prices the row. MEASURED across the corpus: 51 decisions carry
// cost factors and **36 of them are `tier: 'synthesized'`**, with a note that
// reads, in the authors' own words, *"Cost factor heuristics need verification
// against actual pricing."* Seventy affected rows render a claim badge.
//
// The badge read the line's own provenance and nothing else. MEASURED on The
// Cookout's `p_grown_folks` — one row, three picks, IDENTICAL badge AND identical
// detail string:
//
//   no pick                      $147-$368   Directly sourced
//   "Red drink + soda + water"   $11-$28     Directly sourced   (x0.2)
//   "Full bar + punch"           $206-$515   Directly sourced   (x1.4)
//
// The citation grounds the DRINK RATE — "~1 alcoholic drink/guest/hour is the
// source-stated party drink rate". It says nothing about 0.2 or 1.4. A host
// reading $206-$515 under "Directly sourced" was being vouched a number nobody
// checked, and the same badge vouched a figure seven times smaller.
//
// THIS IS THE 2026-08-15 FIX ONE LAYER ALONG. That one split `Directly sourced`
// into `Amount directly sourced` / `Price directly sourced` because the badge
// "was answering for both while proving only one". Same defect, next layer: it
// answered for the displayed figure while proving only the base.
//
// NOTHING EARNED IS TAKEN AWAY. The base rate is still sourced and still says so
// in the detail line underneath. A factor of exactly 1, or one whose own
// provenance is researched, leaves the label untouched.
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan } from '../playbooks';
import { classifyClaim, HOST_LABELS, SOURCED_LABELS } from '../knowledge/claimBasis';

const ev = (type, foodChoices) => ({
  id: 'e', type, date: '2026-10-20', guestMode: 'count', guestCount: 20, guests: [], foodChoices: foodChoices || {},
});
const rowOf = (type, foodChoices, rowId) =>
  (playbookFoodPlan(ev(type, foodChoices)).list || []).find((x) => x.id === rowId);
const labelOf = (it) => classifyClaim(it.provenance, it.costProvenance, it.costFactorApplied).hostLabel;

describe('the badge describes the number on screen', () => {
  test('(premise) the defect material is really in the corpus', () => {
    // Every assertion below is vacuous if no decision carries a synthesized factor.
    let withFactors = 0; let synthesized = 0;
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!d || !d.costFactors) continue;
        withFactors += 1;
        const cp = d.costFactorProvenance;
        if (!cp || cp.tier !== 'researched' || cp.verificationStatus !== 'researched') synthesized += 1;
      }
    }
    expect(withFactors).toBeGreaterThan(40);
    expect(synthesized).toBeGreaterThan(30);
  });

  test('THE DEFECT: the same row, three prices, and the badge now moves with them', () => {
    const R = 'p_grown_folks';
    const unpicked = rowOf('The Cookout', {}, R);
    const cheap = rowOf('The Cookout', { drinks: 'Red drink + soda + water (family-friendly)' }, R);
    const dear = rowOf('The Cookout', { drinks: 'Full bar + punch' }, R);

    // The prices genuinely diverge — without this the badge test proves nothing.
    expect(cheap.low).toBeLessThan(unpicked.low);
    expect(dear.low).toBeGreaterThan(unpicked.low);

    // Untouched by any factor, the sourced claim stands exactly as before.
    expect(labelOf(unpicked)).toBe(HOST_LABELS.DIRECTLY_SOURCED);
    // Moved by a synthesized factor, it states its true scope.
    expect(labelOf(cheap)).toBe(HOST_LABELS.SOURCED_THEN_ADJUSTED);
    expect(labelOf(dear)).toBe(HOST_LABELS.SOURCED_THEN_ADJUSTED);
  });

  test('the factor and the author’s own caveat travel with the line', () => {
    const dear = rowOf('The Cookout', { drinks: 'Full bar + punch' }, 'p_grown_folks');
    expect(dear.costFactorApplied.factor).toBeCloseTo(1.4, 5);
    expect(dear.costFactorApplied.unverified).toBe(true);
    // The note is the authors', not synthesized here — a caller that wants to say
    // more than the label can has the real words.
    expect(dear.costFactorApplied.note).toMatch(/need[s]? verification/i);
    expect(classifyClaim(dear.provenance, dear.costProvenance, dear.costFactorApplied).adjustedUnverified).toBe(true);
  });

  test('NEGATIVE CONTROL: a factor of exactly 1 changes no label', () => {
    // A multiplier that moves nothing cannot mislead about anything, so it must
    // not cost the line its badge. An unpicked decision resolves to its default,
    // which is usually 1.0 — this is the common case across the whole corpus.
    const unpicked = rowOf('Fish Fry', {}, 'p_fish');
    expect(unpicked.costFactorApplied).toBe(null);
    expect(SOURCED_LABELS).toContain(labelOf(unpicked));
  });

  test('NEGATIVE CONTROL: a RESEARCHED factor leaves the badge alone', () => {
    // The point is not that adjustment is bad — it is that an UNVERIFIED
    // adjustment cannot wear a sourced badge. Repast's `food_source` carries a
    // real `costFactorProvenance` grounded to 2026 catering data, so a line it
    // moves keeps whatever its own claim earned.
    const d = (getPlaybook('Repast').decisions || []).find((x) => x.id === 'food_source');
    expect(d.costFactorProvenance.tier).toBe('researched');
    expect(d.costFactorProvenance.verificationStatus).toBe('researched');
    for (const rowId of d.affects) {
      const moved = rowOf('Repast', { food_source: 'Have it catered' }, rowId);
      if (!moved || !moved.costFactorApplied) continue;
      expect(`${rowId}: ${moved.costFactorApplied.unverified}`).toBe(`${rowId}: false`);
      expect(`${rowId}: ${labelOf(moved)}`).not.toBe(`${rowId}: ${HOST_LABELS.SOURCED_THEN_ADJUSTED}`);
    }
  });

  test('NEGATIVE CONTROL: only a SOURCED label degrades', () => {
    // A "Planning baseline" never claimed the figure was checked, so an
    // unverified multiplier tells the host nothing new; "Cultural tradition" is a
    // claim about where a dish comes from, which a price factor does not touch.
    // Degrading those would trade real information for a warning nobody needs.
    const moved = { factor: 1.4, unverified: true, note: '' };
    expect(classifyClaim(null, null, moved).hostLabel).toBe(HOST_LABELS.PLANNING_BASELINE);
    const cultural = { tier: 'cultural-tradition', verificationStatus: 'established-consensus', sources: ['x'] };
    expect(classifyClaim(cultural, null, moved).hostLabel).toBe(HOST_LABELS.CULTURAL_TRADITION);
  });

  test('NEGATIVE CONTROL: two-argument callers are byte-identical to before', () => {
    // The third argument is optional by design. Every existing caller — and the
    // corpus proofs in claimLabelHostProof and claimFamilies — must be untouched.
    for (const pb of ALL_PLAYBOOKS.slice(0, 12)) {
      for (const it of (playbookFoodPlan(ev(pb.type, {})).list || [])) {
        const two = classifyClaim(it.provenance, it.costProvenance);
        const three = classifyClaim(it.provenance, it.costProvenance, undefined);
        expect(three.hostLabel).toBe(two.hostLabel);
      }
    }
  });

  test('every adjusted row still keeps its sourced detail underneath', () => {
    // The label changed; the citation did not. If the detail ever disappears with
    // the badge, this fix has removed information instead of scoping it.
    const dear = rowOf('The Cookout', { drinks: 'Full bar + punch' }, 'p_grown_folks');
    expect(String(dear.provenance.note)).toMatch(/source-stated party drink rate/i);
  });
});
