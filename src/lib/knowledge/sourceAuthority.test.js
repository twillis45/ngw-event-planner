// ─── Source authority: which sources may ground which claims (Phase 5F.2) ─────
//
// THE DEFECT. The composer took a free-text source id. Typing `usda-meat-2026`
// (real — but a COST source) on a purchase provenance published cleanly, then
// `isGroundedItemQty` refused it because the id does not resolve in QTY_SOURCES,
// `qtyGrounded` stayed false, and the host rendered no "Sourced -" line. No error
// anywhere. A silent ungrounding is indistinguishable from never doing the work.
import {
  SOURCE_AXES, axisForField, axesForField, approvedSourcesFor, validateSourcesFor, wouldGround,
} from './sourceAuthority';
import { QTY_SOURCES } from './quantityProvenance';
import { COST_SOURCES } from './costProvenance';

describe('the authority is the registry the PREDICATE reads', () => {
  test('no new registry was invented — the axes point at the existing ones', () => {
    // The rule this phase was given: do not create another source registry.
    expect(SOURCE_AXES.quantity.registry).toBe(QTY_SOURCES);
    expect(SOURCE_AXES.cost.registry).toBe(COST_SOURCES);
  });

  test('the approved list IS the registry, so options and grounding cannot drift', () => {
    const ids = approvedSourcesFor('p_ice.provenance').map((s) => s.id);
    expect(ids.sort()).toEqual(Object.keys(QTY_SOURCES).sort());
    expect(ids).toContain('reddy-ice-2026');
    // A price field offers the COST registry — the half of this that WAS wrong.
    expect(approvedSourcesFor('p_ice.qtyPerGuest').map((s) => s.id).sort())
      .toEqual(Object.keys(QTY_SOURCES).sort());
    expect(approvedSourcesFor('p_ice.unitCostRange').map((s) => s.id).sort())
      .toEqual(Object.keys(COST_SOURCES).sort());
  });

  test('every offered source carries what a reviewer needs to judge it', () => {
    for (const s of approvedSourcesFor('p_ice.provenance')) {
      expect(s.org).toBeTruthy();
      expect(s.url).toBeTruthy();
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);   // a capture DATE, not "recent"
      expect(s.claim.length).toBeGreaterThan(20);         // what it actually says
    }
  });
});

describe('a purchase line is judged on ONE axis', () => {
  test('purchase fields map to the axis of the CLAIM they carry', () => {
    // This asserted that all six mapped to `quantity`, on the reasoning that a
    // purchase has one `provenance` block and `isGroundedItemQty` reads it. That
    // reasoning was overtaken on 2026-08-14, when `classifyClaim` started reading
    // `isGroundedItemQty || isGroundedCost` because a purchase line's PRICE claim
    // resolves in COST_SOURCES. The authoring path was never updated to match, so
    // a correct cost source on `p_x.unitCostRange` was reported to the operator as
    // `wrongAxis` and the picker offered the 5-entry quantity registry for a price.
    for (const f of ['qtyPerGuest', 'qtyFlat', 'servingGuide']) {
      expect(axisForField(`p_ice.${f}`).id).toBe('quantity');
    }
    for (const f of ['unitCostRange', 'priceLadder']) {
      expect(axisForField(`p_ice.${f}`).id).toBe('cost');
    }
    // The shared slot admits it is shared — both, in the classifier's own order.
    // The shared slot stays on quantity here; see axesForField for why that is a
    // recorded contradiction with classifyClaim rather than something to loosen.
    expect(axesForField('p_ice.provenance').map((a) => a.id)).toEqual(['quantity']);
  });

  test('decision cost factors map to the COST axis', () => {
    expect(axisForField('crab_size.costFactorProvenance').id).toBe('cost');
  });

  test('an unknown path claims no authority', () => {
    // Over-claiming is as untrustworthy as under-claiming.
    expect(axisForField('someDecision.weight')).toBeNull();
    expect(validateSourcesFor('someDecision.weight', ['anything']).ok).toBe(true);
  });
});

describe('validation blocks the silent-ungrounding path', () => {
  test('THE DEFECT: a real COST source is refused on a quantity claim, with a reason', () => {
    // LEFT STANDING 2026-08-15, deliberately. Widening the shared slot to accept
    // cost sources would make this pass — and would silently relax the same rule
    // in four other suites, letting a purchase earn a sourced badge from a price
    // citation with nothing asserting the amount was ever checked. See the note in
    // axesForField: the fix is a separate cost slot, not a looser gate here.
    const r = validateSourcesFor('p_crabs.provenance', ['usda-meat-2026']);
    expect(r.ok).toBe(false);
    expect(r.wrongAxis).toEqual([
      { id: 'usda-meat-2026', belongsTo: 'cost', belongsToLabel: 'Cost & pricing' },
    ]);
    expect(r.errors[0]).toMatch(/Cost & pricing source/);
    expect(r.errors[0]).toMatch(/isGroundedItemQty would reject it/);
    // ...and the predicate agrees, which is what makes the message true rather than
    // merely plausible.
    expect(wouldGround('p_crabs.provenance', {
      tier: 'researched', sources: ['usda-meat-2026'],
    })).toBe(false);
  });

  test('a cost source is still REFUSED on a field that is purely a quantity claim', () => {
    // The widening above is scoped to the shared slot. `qtyPerGuest` is a quantity
    // claim and nothing else, so a pricing source there is still the wrong axis —
    // otherwise "either axis" would have quietly become "no axis at all".
    const r = validateSourcesFor('p_crabs.qtyPerGuest', ['usda-meat-2026']);
    expect(r.ok).toBe(false);
    expect(r.wrongAxis).toEqual([
      { id: 'usda-meat-2026', belongsTo: 'cost', belongsToLabel: 'Cost & pricing' },
    ]);
    expect(wouldGround('p_crabs.qtyPerGuest', {
      tier: 'researched', sources: ['usda-meat-2026'],
    })).toBe(false);
  });

  test('an id that resolves NOWHERE is a different mistake and says so', () => {
    const r = validateSourcesFor('p_ice.provenance', ['reddy-ice-2027']);
    expect(r.ok).toBe(false);
    expect(r.unknown).toEqual(['reddy-ice-2027']);
    expect(r.wrongAxis).toEqual([]);
    expect(r.errors[0]).toMatch(/not an approved source/);
  });

  test('a pasted URL — the current corpus habit — is refused', () => {
    // ~8 raw URLs sit in `sources[]` arrays today. They resolve nowhere, so those
    // claims have never grounded.
    const r = validateSourcesFor('p_ice.provenance', ['https://www.eatlikenoone.com/x.htm']);
    expect(r.ok).toBe(false);
    expect(r.unknown).toHaveLength(1);
  });

  test('no sources at all is refused', () => {
    expect(validateSourcesFor('p_ice.provenance', []).ok).toBe(false);
    expect(validateSourcesFor('p_ice.provenance', null).ok).toBe(false);
  });

  test('an approved source on the right axis passes AND grounds', () => {
    const r = validateSourcesFor('p_ice.provenance', ['reddy-ice-2026']);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(wouldGround('p_ice.provenance', {
      tier: 'researched', sources: ['reddy-ice-2026'],
    })).toBe(true);
  });

  test('MIXED sources fail if ANY is wrong — the predicate requires every id', () => {
    // Each predicate uses .every() over ONE registry, so a set mixing a quantity
    // source with a cost source grounds under NEITHER. Validating ids one at a
    // time against "any allowed axis" would call this ok and then silently fail to
    // ground — this test caught exactly that mistake during the 2026-08-15 fix.
    const r = validateSourcesFor('p_ice.provenance', ['reddy-ice-2026', 'usda-meat-2026']);
    expect(r.ok).toBe(false);
    expect(wouldGround('p_ice.provenance', {
      tier: 'researched', sources: ['reddy-ice-2026', 'usda-meat-2026'],
    })).toBe(false);
  });

  test('validation agrees with the predicate on every approved id, both axes', () => {
    // The invariant that keeps the picker honest: if validation says yes, the host
    // predicate must also say yes. Swept rather than spot-checked.
    for (const id of Object.keys(QTY_SOURCES)) {
      expect(validateSourcesFor('p_x.provenance', [id]).ok).toBe(true);
      expect(wouldGround('p_x.provenance', { tier: 'researched', sources: [id] })).toBe(true);
    }
    for (const id of Object.keys(COST_SOURCES)) {
      expect(validateSourcesFor('d.costFactorProvenance', [id]).ok).toBe(true);
      expect(wouldGround('d.costFactorProvenance', { tier: 'researched', sources: [id] })).toBe(true);
    }
  });

  test('tier still matters — an approved source on a non-researched tier does not ground', () => {
    // The picker cannot make a claim grounded by itself; the predicate needs the
    // tier too. Pinned so a future "just select a source" shortcut is a failing test.
    expect(wouldGround('p_ice.provenance', { tier: 'estimate', sources: ['reddy-ice-2026'] })).toBe(false);
  });
});
