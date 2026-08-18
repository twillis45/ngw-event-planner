// ─── AN OPERATOR CAN CITE A COST SOURCE, NOT ONLY A QUANTITY ONE ────────────
//
// Found 2026-08-18 by asking a direct question of the shipping code rather than
// the registry: are the sources being added actually reachable from the admin
// console? They were not.
//
// The cost registry grew from 27 sources to ~325 in one session. Every one was
// resolvable by `isGroundedCost` and every one was invisible in the console,
// because:
//
//   1. RUNTIME_CONSUMED_FIELDS did not list `costProvenance`, so the picker —
//      which derives its field menu from that contract — never offered it; and
//   2. the provenance editor was hardcoded to `${pid}.provenance`, so
//      `axisForField` always resolved the QUANTITY axis and always offered
//      QTY_SOURCES.
//
// The console's own comment states the invariant it was built for: "the options
// come from the registry the PREDICATE reads, so what an admin can cite and what
// can actually ground are the same list by construction." That held on the
// quantity axis and was false on the cost axis.
//
// This file pins the contract end of that fix. The editor wiring is JSX and is
// not asserted here; what IS asserted is that every layer it depends on treats
// the cost slot as a first-class governed field.
import { RUNTIME_CONSUMED_FIELDS, fieldOwnership } from '../governedOwnership';
import { governableFieldsFor, fieldState } from '../knowledgeAcquisition';
import { axisForField, approvedSourcesFor, validateSourcesFor } from '../sourceAuthority';
import { COST_SOURCES } from '../costProvenance';
import { QTY_SOURCES } from '../quantityProvenance';

const PURCHASE = { id: 'p_test', item: 'Test line', unitCostRange: [1, 2], qtyPerGuest: 1 };

describe('the cost axis is authorable, not just resolvable', () => {
  test('PREMISE — both registries are populated and distinct', () => {
    // Without this the assertions below could pass on two empty objects.
    expect(Object.keys(COST_SOURCES).length).toBeGreaterThan(100);
    // The quantity registry is MUCH smaller — 5 sources against the cost axis's
    // hundreds. Written as >3 rather than >10 after measuring it, and worth
    // noticing: the quantity axis is where the sourcing gap now lives.
    expect(Object.keys(QTY_SOURCES).length).toBeGreaterThan(3);
    const overlap = Object.keys(COST_SOURCES).filter((k) => k in QTY_SOURCES);
    expect(overlap).toEqual([]);
  });

  test('costProvenance is in the runtime consumer set', () => {
    // The picker builds its field menu from this list. Absent here, absent there.
    expect(RUNTIME_CONSUMED_FIELDS).toContain('costProvenance');
    expect(RUNTIME_CONSUMED_FIELDS).toContain('provenance');
  });

  test('the ownership contract says it drives runtime and is a provenance correction', () => {
    const own = fieldOwnership('Crab Feast', 'p_test.costProvenance', PURCHASE);
    expect(own.drivesRuntime).toBe(true);
    expect(own.correctionType).toBe('provenance');
  });

  test('THE PICKER OFFERS IT — including when the slot is empty, which is the gap', () => {
    // An unsourced cost claim is exactly what an operator needs to close, so the
    // field must be offered on a purchase that does NOT yet carry it.
    expect(PURCHASE.costProvenance).toBeUndefined();
    const fields = governableFieldsFor('Crab Feast', PURCHASE);
    expect(fields).toContain('costProvenance');
    expect(fields).toContain('provenance');
  });

  test('an absent cost slot reports as missing, not as correctable', () => {
    expect(fieldState('Crab Feast', PURCHASE, 'costProvenance', null)).toBe('missing-provenance');
  });

  test('A SOURCED COST SLOT READS AS CORRECTABLE — via the COST predicate', () => {
    // Added after red-proofing found the hole: swapping isGroundedCost for the
    // quantity predicate left every assertion above green, because none of them
    // exercised a POPULATED cost slot. A cost citation judged by
    // isGroundedItemQty fails on ids that do not resolve in QTY_SOURCES, so this
    // would have reported a perfectly sourced claim as 'needs-research' and sent
    // an operator to re-research work already done.
    const sourced = { ...PURCHASE, costProvenance: {
      tier: 'researched', confidence: 'medium', verificationStatus: 'cited',
      sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-18',
      claim: 'Bagged ice 2026 at 10-45 cents a pound depending on channel.',
    } };
    expect(fieldState('Crab Feast', sourced, 'costProvenance', null)).toBe('correctable');

    // And the control: a cost slot citing a QUANTITY id must NOT read as done.
    const crossAxis = { ...PURCHASE, costProvenance: {
      tier: 'researched', confidence: 'medium', verificationStatus: 'cited',
      sources: ['bar-provision-2026'], lastVerified: '2026-08-18', claim: 'x',
    } };
    expect(fieldState('Crab Feast', crossAxis, 'costProvenance', null)).toBe('needs-research');
  });

  test('THE AXIS SPLIT HOLDS — cost paths offer cost sources, quantity paths do not', () => {
    // This is the whole defect: with the editor hardcoded to `.provenance`, a cost
    // correction resolved the quantity axis and offered the wrong registry.
    expect(axisForField('p_test.costProvenance').id).toBe('cost');
    expect(axisForField('p_test.provenance').id).toBe('quantity');

    const costOpts = approvedSourcesFor('p_test.costProvenance').map((o) => o.id || o);
    const qtyOpts = approvedSourcesFor('p_test.provenance').map((o) => o.id || o);
    expect(costOpts.length).toBeGreaterThan(100);
    // A known cost source is offered for cost and refused for quantity.
    expect(costOpts).toContain('ice-retail-2026');
    expect(qtyOpts).not.toContain('ice-retail-2026');
  });

  test('THE PUBLISH GATE REFUSES A CROSS-AXIS CITATION on the cost slot', () => {
    // The failure this prevents is silent: a quantity id in a cost claim publishes
    // clean and then never grounds, and nothing reports an error.
    const wrong = validateSourcesFor('p_test.costProvenance', ['bar-provision-2026']);
    expect(wrong.ok).toBe(false);
    const right = validateSourcesFor('p_test.costProvenance', ['ice-retail-2026']);
    expect(right.ok).toBe(true);
  });
});
