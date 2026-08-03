// ─── Typed value governance (Phase 5E) ───────────────────────────────────────
//
// The gap 5D stopped at: corrections could fix reasoning but not values, because
// a value has a schema and there was nowhere safe to edit it. These tests pin the
// three things that make value editing safe rather than merely possible —
// parsing, type validation, and the publish gate that refuses a bad number.
import {
  GOVERNED_FIELD_TYPES, fieldTypeFor, governedFieldOf,
  validateGovernedValue, validateForEditor, CONFIDENCE_LEVELS,
} from './governedFieldTypes';
import { publishKCR } from './knowledgeChange';

const AT = '2026-08-01T22:00:00.000Z';
const approved = (fieldPath, newValue) => ({
  id: 'k', status: 'approved', assetId: 'Crab Feast', fieldPath,
  type: 'correction', trigger: 'validation',
  proposal: { newValue, newProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['s'] } },
  evidence: [{ id: 's', sourceType: 'citation', source: 'S', url: 'https://x' }],
  review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
  audit: [], createdAt: AT, currentValue: null,
});

describe('field resolution', () => {
  test('resolves the field suffix of a governed path', () => {
    expect(governedFieldOf('p_oldbay.qtyPerGuest')).toBe('qtyPerGuest');
    expect(governedFieldOf('p_wine.unitCostRange')).toBe('unitCostRange');
    expect(governedFieldOf('nodots')).toBeNull();
  });

  test('unknown paths are UNTYPED and pass — the registry refuses to guess', () => {
    expect(fieldTypeFor('p_x.somethingNew')).toBeNull();
    expect(validateGovernedValue('p_x.somethingNew', { anything: true }).ok).toBe(true);
  });
});

describe('qtyPerGuest — a number, not text', () => {
  const t = GOVERNED_FIELD_TYPES.qtyPerGuest;

  test('parses a clean number', () => {
    expect(t.parse('0.5')).toEqual({ ok: true, value: 0.5 });
    expect(t.parse(' 12 ')).toEqual({ ok: true, value: 12 });
  });

  test('REJECTS "banana" and other non-numbers', () => {
    for (const bad of ['banana', '0.5kg', '', '  ', 'NaN', '1e5x', '--3']) {
      expect(t.parse(bad).ok).toBe(false);
    }
  });

  test('rejects a STRING that survived to validation — the NaN bug', () => {
    // The exact failure the editor exists to prevent: a string reaching the engine.
    expect(validateGovernedValue('p_oldbay.qtyPerGuest', '0.5').ok).toBe(false);
    expect(validateGovernedValue('p_oldbay.qtyPerGuest', '0.5').errors[0]).toMatch(/Expected a number/);
  });

  test('rejects zero, negatives and implausible magnitudes', () => {
    expect(validateGovernedValue('p_oldbay.qtyPerGuest', 0).ok).toBe(false);
    expect(validateGovernedValue('p_oldbay.qtyPerGuest', -1).ok).toBe(false);
    expect(validateGovernedValue('p_oldbay.qtyPerGuest', 5000).ok).toBe(false);
    expect(validateGovernedValue('p_oldbay.qtyPerGuest', 0.5).ok).toBe(true);
  });
});

describe('unitCostRange — a [min, max] TUPLE, not an object', () => {
  const t = GOVERNED_FIELD_TYPES.unitCostRange;

  test('parses two fields into the array shape the engine reads', () => {
    expect(t.parse({ min: '35', max: '195' })).toEqual({ ok: true, value: [35, 195] });
  });

  test('formats the array back into two editable fields', () => {
    expect(t.format([32, 188])).toEqual({ min: 32, max: 188 });
  });

  test('REJECTS an inverted range', () => {
    const r = validateGovernedValue('p_oldbay.unitCostRange', [200, 10]);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/above maximum/);
  });

  test('rejects the WRONG SHAPE — {min,max} is not what the engine reads', () => {
    expect(validateGovernedValue('p_oldbay.unitCostRange', { min: 1, max: 2 }).ok).toBe(false);
    expect(validateGovernedValue('p_oldbay.unitCostRange', [1]).ok).toBe(false);
    expect(validateGovernedValue('p_oldbay.unitCostRange', ['1', '2']).ok).toBe(false);
  });

  test('accepts a valid range', () => {
    expect(validateGovernedValue('p_oldbay.unitCostRange', [35, 195]).ok).toBe(true);
  });
});

// ─── The two engine-governing fields (Phase 5E.3) ───────────────────────────
describe('priceLadder — a row editor, not a JSON box', () => {
  const T = GOVERNED_FIELD_TYPES.priceLadder;
  const LADDER = {
    source: 'X', note: 'Y',
    medium: { perDz: 32, per2Dz: 60, perHalfBushel: 99, perBushel: 195, approxPerBushel: 84, approxPerHalfBushel: 42, servingKey: 'medium' },
    largeMale: { perDz: 72, per2Dz: 140, perHalfBushel: 199, perBushel: 345, approxPerBushel: 72, approxPerHalfBushel: 36, servingKey: 'large' },
  };

  test('rowKeys finds the size rows and ignores the metadata', () => {
    expect(T.rowKeys(LADDER)).toEqual(['medium', 'largeMale']);
  });

  test('format seeds the editor from the live row as strings', () => {
    const d = T.format(LADDER);
    expect(d.key).toBe('medium');
    expect(d.row.perBushel).toBe('195');
    expect(d.base).toBe(LADDER);
  });

  test('an EDITED row publishes the WHOLE ladder — untouched sizes survive verbatim', () => {
    // The defect this shape exists to prevent: publishing only the edited row would
    // replace the field and silently delete every other size the host can buy.
    const d = { base: LADDER, key: 'largeMale', row: { ...T.format({ largeMale: LADDER.largeMale }).row, perBushel: '395' } };
    const r = T.parse(d);
    expect(r.ok).toBe(true);
    expect(r.value.largeMale.perBushel).toBe(395);
    expect(r.value.largeMale.servingKey).toBe('large');   // row metadata kept
    expect(r.value.medium).toEqual(LADDER.medium);        // untouched size verbatim
    expect(r.value.source).toBe('X');                     // ladder metadata kept
  });

  test('a non-number is refused and NAMES the field — one of six boxes is wrong', () => {
    const d = { base: LADDER, key: 'medium', row: { ...T.format(LADDER).row, perBushel: 'banana' } };
    expect(T.parse(d)).toEqual({ ok: false, error: 'perBushel: "banana" is not a number.' });
  });

  test('BLANK deletes the key rather than writing a zero', () => {
    // jumboMale legitimately has no perBushel, and resolveBulkPurchase branches on the
    // field being falsy — a 0 would read as a free bushel, not as "not sold that way".
    const d = { base: LADDER, key: 'medium', row: { ...T.format(LADDER).row, perBushel: '' } };
    const r = T.parse(d);
    expect(r.ok).toBe(true);
    expect('perBushel' in r.value.medium).toBe(false);
  });

  test('a no-op correction is refused — nothing to review', () => {
    expect(T.parse(T.format(LADDER)).ok).toBe(false);
  });

  test('validate refuses a row with no purchasable unit', () => {
    const r = validateGovernedValue('p_crabs.priceLadder', { medium: { approxPerBushel: 84 } });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/at least one of perDz/);
  });

  test('validate refuses a bushel priced below a dozen', () => {
    const r = validateGovernedValue('p_crabs.priceLadder', { medium: { perDz: 200, perBushel: 100 } });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/bushel \(100\) priced below a dozen \(200\)/);
  });

  test('the authored ladder passes its own gate', () => {
    expect(validateGovernedValue('p_crabs.priceLadder', LADDER).ok).toBe(true);
  });
});

describe('servingGuide — the field that moves the COUNT', () => {
  const T = GOVERNED_FIELD_TYPES.servingGuide;
  const GUIDE = {
    note: 'n',
    bySize: {
      medium: { inches: '5–5.5"', withSides: [6, 6], mainOnly: [8, 8], perBushel: [84, 84], tier: 'cited' },
      large: { inches: '5.5–6"', withSides: [4, 4], mainOnly: [5, 6], perBushel: [72, 72], tier: 'cited' },
    },
  };

  test('format seeds low/high boxes from the live spread', () => {
    const d = T.format(GUIDE);
    expect(d.key).toBe('medium');
    expect(d.row.perBushel).toEqual({ low: '84', high: '84' });
  });

  test('an edited size publishes the whole guide and KEEPS the row citation', () => {
    const d = {
      base: GUIDE, key: 'large',
      row: { withSides: { low: '4', high: '4' }, mainOnly: { low: '5', high: '6' }, perBushel: { low: '60', high: '60' } },
    };
    const r = T.parse(d);
    expect(r.ok).toBe(true);
    expect(r.value.bySize.large.perBushel).toEqual([60, 60]);
    expect(r.value.bySize.large.tier).toBe('cited');       // a corrected count is still cited
    expect(r.value.bySize.large.inches).toBe('5.5–6"');
    expect(r.value.bySize.medium).toEqual(GUIDE.bySize.medium);
  });

  test('ALL THREE fields are required — a half row is discarded by the engine', () => {
    // Without this the correction would publish, pass every gate, and change nothing:
    // entryFor() drops a row missing any of the three.
    const d = { base: GUIDE, key: 'large', row: { withSides: { low: '4', high: '4' }, mainOnly: { low: '', high: '6' }, perBushel: { low: '72', high: '72' } } };
    expect(T.parse(d)).toEqual({ ok: false, error: 'mainOnly low: A quantity is required.' });
  });

  test('an inverted spread is refused', () => {
    const d = { base: GUIDE, key: 'large', row: { withSides: { low: '9', high: '4' }, mainOnly: { low: '5', high: '6' }, perBushel: { low: '72', high: '72' } } };
    expect(T.parse(d).error).toMatch(/withSides: low \(9\) is above high \(4\)/);
  });

  test('validate mirrors the ENGINE’s usableRow check', () => {
    // These are exactly the shapes crabServing.js silently ignores. Publishing one
    // would mint an authoritative value that changes nothing — refused here instead.
    for (const bad of [{ bySize: { large: { withSides: 'junk' } } }, { bySize: { large: {} } },
      { bySize: { large: { withSides: [4], mainOnly: [5, 6], perBushel: [72, 72] } } }]) {
      expect(validateGovernedValue('p_crabs.servingGuide', bad).ok).toBe(false);
    }
    expect(validateGovernedValue('p_crabs.servingGuide', { bySize: {} }).ok).toBe(false);
    expect(validateGovernedValue('p_crabs.servingGuide', GUIDE).ok).toBe(true);
  });
});

describe('THE PUBLISH GATE accepts the governing fields (Phase 5E.3)', () => {
  const LADDER = { largeMale: { perDz: 72, perBushel: 395, servingKey: 'large' } };
  const GUIDE = { bySize: { large: { withSides: [4, 4], mainOnly: [5, 6], perBushel: [60, 60] } } };

  test('a valid priceLadder publishes', () => {
    expect(publishKCR(approved('p_crabs.priceLadder', LADDER), { versionId: 'v1', asOf: AT }).kcr.status).toBe('published');
  });

  test('a valid servingGuide publishes', () => {
    expect(publishKCR(approved('p_crabs.servingGuide', GUIDE), { versionId: 'v1', asOf: AT }).kcr.status).toBe('published');
  });

  test('a servingGuide the ENGINE would ignore is refused at publish', () => {
    expect(() => publishKCR(approved('p_crabs.servingGuide', { bySize: { large: { withSides: [4, 4] } } }), { versionId: 'v1', asOf: AT }))
      .toThrow(/invalid value for p_crabs\.servingGuide/);
  });
});

describe('provenance — strict in the composer, permissive at the gate', () => {
  test('the composer requires a source, a note and a valid confidence', () => {
    expect(validateForEditor('p_crabs.provenance', { sources: [], note: 'x', confidence: 'high' }).ok).toBe(false);
    expect(validateForEditor('p_crabs.provenance', { sources: ['s'], note: '', confidence: 'high' }).ok).toBe(false);
    expect(validateForEditor('p_crabs.provenance', { sources: ['s'], note: 'x', confidence: 'med' }).ok).toBe(false);
    expect(validateForEditor('p_crabs.provenance', { sources: ['s'], note: 'x', confidence: 'medium' }).ok).toBe(true);
  });

  test('the publish gate only refuses null — a caption is not a number', () => {
    // Scope note: a malformed provenance degrades a caption; a malformed quantity
    // corrupts a host's shopping list. The gate is strict where the blast radius is.
    expect(validateGovernedValue('p_crabs.provenance', null).ok).toBe(false);
    expect(validateGovernedValue('p_crabs.provenance', 'legacy string').ok).toBe(true);
    expect(validateGovernedValue('p_crabs.provenance', { sources: ['s'] }).ok).toBe(true);
  });

  test('parse builds the structured block from editor fields', () => {
    const r = GOVERNED_FIELD_TYPES.provenance.parse({
      sources: 'webstaurant-protein-2026, bar-provision-2026', note: 'n', confidence: 'medium',
    });
    expect(r.ok).toBe(true);
    expect(r.value.sources).toEqual(['webstaurant-protein-2026', 'bar-provision-2026']);
    expect(r.value.note).toBe('n');
  });

  test('confidence vocabulary is frozen', () => {
    expect(CONFIDENCE_LEVELS).toEqual(['high', 'medium', 'low']);
  });
});

describe('THE PUBLISH GATE — an invalid value cannot reach runtime', () => {
  test('publishing "banana" as a quantity THROWS', () => {
    expect(() => publishKCR(approved('p_oldbay.qtyPerGuest', 'banana'), { versionId: 'v1', asOf: AT }))
      .toThrow(/invalid value for p_oldbay\.qtyPerGuest/);
  });

  test('publishing a stringified number THROWS — this is the NaN class', () => {
    expect(() => publishKCR(approved('p_oldbay.qtyPerGuest', '0.5'), { versionId: 'v1', asOf: AT }))
      .toThrow(/Expected a number/);
  });

  test('publishing an inverted cost range THROWS', () => {
    expect(() => publishKCR(approved('p_oldbay.unitCostRange', [500, 10]), { versionId: 'v1', asOf: AT }))
      .toThrow(/above maximum/);
  });

  test('publishing a VALID quantity succeeds and carries the value', () => {
    const { kcr } = publishKCR(approved('p_oldbay.qtyPerGuest', 0.5), { versionId: 'v1', asOf: AT });
    expect(kcr.status).toBe('published');
    expect(kcr.proposal.newValue).toBe(0.5);
  });

  test('publishing a VALID cost range succeeds', () => {
    const { kcr } = publishKCR(approved('p_oldbay.unitCostRange', [35, 195]), { versionId: 'v1', asOf: AT });
    expect(kcr.proposal.newValue).toEqual([35, 195]);
  });

  test('an untyped PURCHASE field is refused — no consumer, no governance (5E.2)', () => {
    // Premise changed deliberately. In 5E this asserted an untyped field publishes,
    // because the TYPE gate cannot check what it does not know. 5E.2 added the
    // OWNERSHIP gate: governedPurchase does not read `somethingElse`, so publishing
    // it would mint an authoritative value that changes nothing a host sees.
    expect(() => publishKCR(approved('p_crabs.somethingElse', { free: 'form' }), { versionId: 'v1', asOf: AT }))
      .toThrow(/not governable/);
  });

  test('a NON-purchase path is still untouched — the registry does not over-claim', () => {
    const { kcr } = publishKCR(approved('someDecision.weight', 'high'), { versionId: 'v1', asOf: AT });
    expect(kcr.status).toBe('published');
  });
});

// ─── Cross-field lineage (5E defect, found in the browser) ───────────────────
describe('a NEW governed field must not supersede an unrelated lineage', () => {
  test('correcting a different field starts its own lineage', () => {
    // Publishing p_oldbay.qtyPerGuest while p_crabs.provenance is the live record
    // must NOT retire the provenance entry: they are different fields.
    const provV1 = {
      id: 'kp', status: 'published', assetId: 'Crab Feast', fieldPath: 'p_crabs.provenance',
      publishedVersion: 'prov-v1', rollbackTo: null, proposal: { newValue: { sources: ['s'] } },
      evidence: [], review: {}, audit: [],
    };
    const qtyNew = {
      id: 'kq', status: 'published', assetId: 'Crab Feast', fieldPath: 'p_oldbay.qtyPerGuest',
      publishedVersion: 'qty-v1', rollbackTo: null, proposal: { newValue: 0.5 },
      evidence: [], review: {}, audit: [],
    };
    const { buildSnapshot: bs } = require('./publishedSnapshotBuild.mjs');
    const r = bs([provV1, qtyNew]);
    expect(r.snapshot.entries).toHaveLength(2);          // BOTH live
    expect(r.superseded).toHaveLength(0);                // neither retired
    expect(r.conflicts).toHaveLength(0);
  });
});
