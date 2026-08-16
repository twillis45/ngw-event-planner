// ─── THE COST SLOT IS AUTHORABLE, AND RECORDS SAY THEIR SHAPE (2026-08-16) ───
//
// Design A shipped `costProvenance` as an engine and host field, and three parts of
// the authoring path did not know it existed. That is the same failure the split
// itself was fixing, one layer along: the classifier learned about the cost axis in
// August 2026, the authoring path did not, and nothing detected the disagreement
// for months because every one of these fails SILENTLY — no throw, just a wrong or
// absent answer.
//
// So each property below is gated with the fault to reintroduce named in place.
import { fieldTypeFor, validateGovernedValue, GOVERNED_FIELD_TYPES } from './governedFieldTypes';
import { overrideFromPublishedKCR, overrideSchemaVersion, OVERRIDE_SCHEMA_VERSION } from './knowledgeOverride';
import { lineState } from './knowledgeInventory';
import { COST_SOURCES } from './costProvenance';

const costBlock = () => ({
  tier: 'researched', confidence: 'high', verificationStatus: 'cited',
  sources: [Object.keys(COST_SOURCES)[0]],
  claim: 'A registered cost claim',
});

describe('the composer has an editor for the cost block', () => {
  test('p_x.costProvenance resolves to a field type at all', () => {
    // RED-PROVE: remove the `costProvenance` key from GOVERNED_FIELD_TYPES.
    // `fieldTypeFor` keys on the path SUFFIX, so it returned null, and
    // `validateGovernedValue` then takes its documented unknown-paths-PASS branch —
    // meaning the field was not merely uneditable, it was unvalidated on publish.
    const t = fieldTypeFor('p_ice.costProvenance');
    expect(t).toBeTruthy();
    expect(t.label).toBe('Cost provenance');
  });

  test('it shares the provenance editor rather than duplicating it', () => {
    // Two hand-maintained near-identical descriptors is how the axes drifted in the
    // first place. Sharing makes a change to one a change to both BY CONSTRUCTION,
    // so this asserts identity of behaviour, not similarity of text.
    const p = GOVERNED_FIELD_TYPES.provenance;
    const c = GOVERNED_FIELD_TYPES.costProvenance;
    expect(c.parse).toBe(p.parse);
    expect(c.format).toBe(p.format);
    expect(c.validate).toBe(p.validate);
    expect(c.validateForEditor).toBe(p.validateForEditor);
    // ...and only the host-facing strings differ.
    expect(c.label).not.toBe(p.label);
    expect(c.hint).not.toBe(p.hint);
  });

  test('a null cost block is refused on publish, exactly as provenance is', () => {
    expect(validateGovernedValue('p_ice.costProvenance', null).ok).toBe(false);
    expect(validateGovernedValue('p_ice.costProvenance', costBlock()).ok).toBe(true);
  });
});

describe('the inventory counts a cited PRICE as cited', () => {
  const purchase = (extra) => ({ id: 'p_x', unitCostRange: [1, 2], qtyPerGuest: 1, ...extra });

  test('a price cited in the new block reads directly-cited', () => {
    // RED-PROVE: drop the `isGroundedCost` terms from lineState. This line falls
    // back to `reviewed`/`ambiguous`/`needs-source` — the inventory reporting
    // outstanding work on a line a host is already shown as sourced, which is the
    // precise thing knowledgeInventory's own header says it exists to prevent.
    expect(lineState('A', purchase({ costProvenance: costBlock() }), new Set())).toBe('directly-cited');
  });

  test('and in the shared slot too, so a line reads the same before and after it migrates', () => {
    expect(lineState('A', purchase({ provenance: costBlock() }), new Set())).toBe('directly-cited');
  });

  test('a line with no citation anywhere is still outstanding', () => {
    // The widening must not turn into "everything counts".
    expect(lineState('A', purchase({}), new Set())).not.toBe('directly-cited');
  });
});

describe('an override record states which schema it was written under', () => {
  const kcr = {
    status: 'published', assetId: 'Birthday', fieldPath: 'p_ice.costProvenance',
    id: 'kcr-1', publishedVersion: 'v1', createdAt: '2026-08-16',
    proposal: { newValue: costBlock(), newProvenance: null },
  };

  test('new records carry the current version', () => {
    expect(overrideFromPublishedKCR(kcr).schemaVersion).toBe(OVERRIDE_SCHEMA_VERSION);
  });

  test('a record written before the field existed reads as v1, not as broken', () => {
    // Records already sitting in a browser's localStorage have no version. They are
    // not migrated and not rejected: absent MEANS v1, which is true by construction
    // since every record written before 2026-08-16 was written under it. Treating
    // absent as invalid would strand real published corrections.
    expect(overrideSchemaVersion({ id: 'ovr-old', value: 1 })).toBe(1);
    expect(overrideSchemaVersion(null)).toBe(1);
    expect(overrideSchemaVersion({ schemaVersion: 0 })).toBe(1);      // junk reads as v1
    expect(overrideSchemaVersion({ schemaVersion: 'two' })).toBe(1);
  });

  test('the version is readable back off a record the writer produced', () => {
    // The round trip is the point — a marker nothing can read is decoration.
    expect(overrideSchemaVersion(overrideFromPublishedKCR(kcr))).toBe(OVERRIDE_SCHEMA_VERSION);
    expect(OVERRIDE_SCHEMA_VERSION).toBeGreaterThan(1);
  });
});
