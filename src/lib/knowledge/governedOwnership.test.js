// ─── Governed field ownership (Phase 5E.1) ───────────────────────────────────
//
// The measurement that forced this contract, from 5E:
//   publishing p_crabs.qtyPerGuest = 0.5 moved the stated RATE and left the
//   COUNT at 6 dozens, because the crab engine quantises to buying units.
//   A governed value that does not control output is worse than none: the line
//   then shows two numbers that disagree, both looking authoritative.
import { fieldOwnership, correctableFields, blockedMessage, ENGINES, RUNTIME_CONSUMED_FIELDS } from './governedOwnership';
import { publishKCR } from './knowledgeChange';
import { playbookFoodPlan } from '../playbooks/index';

const AT = '2026-08-01T23:00:00.000Z';
const approved = (fieldPath, newValue, assetId = 'Crab Feast') => ({
  id: 'k', status: 'approved', assetId, fieldPath, type: 'correction', trigger: 'validation',
  proposal: { newValue, newProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['s'] } },
  evidence: [{ id: 's', sourceType: 'citation', source: 'S', url: 'https://x' }],
  review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
  audit: [], createdAt: AT, currentValue: null,
});

describe('ownership declaration', () => {
  test('p_crabs quantity and cost are owned by the crab engine, not the playbook', () => {
    for (const f of ['qtyPerGuest', 'qtyFlat', 'unitCostRange']) {
      const o = fieldOwnership('Crab Feast', `p_crabs.${f}`);
      expect(o.owner).toBe('crabServing');
      expect(o.drivesRuntime).toBe(false);
      expect(o.editable).toBe(false);
      expect(o.correctionType).toBe('delegated');
    }
  });

  test('p_crabs PROVENANCE is still correctable — it drives the host caption directly', () => {
    const o = fieldOwnership('Crab Feast', 'p_crabs.provenance');
    expect(o.drivesRuntime).toBe(true);
    expect(o.editable).toBe(true);
  });

  test('delegation is PER-PURCHASE — other Crab Feast lines stay governable', () => {
    // The line that will carry the 5E host proof.
    for (const pid of ['p_oldbay', 'p_butter', 'p_corn', 'p_shrimp']) {
      const o = fieldOwnership('Crab Feast', `${pid}.unitCostRange`);
      expect(o.drivesRuntime).toBe(true);
      expect(o.editable).toBe(true);
    }
  });

  test('the governing-model fields are correctable and marked as such', () => {
    expect(ENGINES.crabServing.governedBy).toEqual(['priceLadder', 'servingGuide']);
    for (const f of ENGINES.crabServing.governedBy) {
      const o = fieldOwnership('Crab Feast', `p_crabs.${f}`);
      expect(o.editable).toBe(true);
      expect(o.correctionType).toBe('governing-model');
      expect(o.governs).toBe('crabServing');
    }
  });

  test('correctableFields hides delegated fields from the picker', () => {
    expect(correctableFields('Crab Feast', 'p_crabs', ['provenance', 'qtyPerGuest', 'unitCostRange']))
      .toEqual(['provenance']);
    expect(correctableFields('Crab Feast', 'p_oldbay', ['provenance', 'qtyPerGuest', 'unitCostRange']))
      .toEqual(['provenance', 'qtyPerGuest', 'unitCostRange']);
  });

  test('the blocked message names the engine AND the next step', () => {
    const m = blockedMessage(fieldOwnership('Crab Feast', 'p_crabs.qtyPerGuest'));
    expect(m).toMatch(/calculated by the crab engine/);
    expect(m).toMatch(/priceLadder/);           // an admin is told where to go
    // a NON-delegated field has nothing to say
    expect(blockedMessage(fieldOwnership('Crab Feast', 'p_oldbay.qtyPerGuest'))).toBeNull();
  });
});

describe('THE PUBLISH GATE refuses a delegated field', () => {
  test('publishing p_crabs.qtyPerGuest is BLOCKED — the 5E defect, now impossible', () => {
    expect(() => publishKCR(approved('p_crabs.qtyPerGuest', 0.5), { versionId: 'v1', asOf: AT }))
      .toThrow(/not governable/);
  });

  test('publishing p_crabs.unitCostRange is BLOCKED', () => {
    expect(() => publishKCR(approved('p_crabs.unitCostRange', [35, 195]), { versionId: 'v1', asOf: AT }))
      .toThrow(/not governable/);
  });

  test('publishing p_crabs.provenance is ALLOWED', () => {
    const { kcr } = publishKCR(approved('p_crabs.provenance', { sources: ['s'], note: 'n' }), { versionId: 'v1', asOf: AT });
    expect(kcr.status).toBe('published');
  });

  test('publishing a NON-delegated purchase value is ALLOWED', () => {
    const { kcr } = publishKCR(approved('p_oldbay.unitCostRange', [5, 11]), { versionId: 'v1', asOf: AT });
    expect(kcr.proposal.newValue).toEqual([5, 11]);
  });

  test('publishing a GOVERNING-MODEL field is ALLOWED — priceLadder has a real consumer', () => {
    // 5E.1 named `servingModel` and `purchaseThresholds` here. Neither exists in the
    // data model — I invented them from an example, which is the fake governance this
    // contract forbids. The real governing fields are priceLadder + servingGuide,
    // both read by resolveBulkPurchase() off the GOVERNED purchase.
    const { kcr } = publishKCR(
      approved('p_crabs.priceLadder', { largeMale: { perDz: 75, perBushel: 350, servingKey: 'large' } }),
      { versionId: 'v1', asOf: AT },
    );
    expect(kcr.status).toBe('published');
  });

  test('a field with NO runtime consumer cannot publish (5E.2)', () => {
    expect(() => publishKCR(approved('p_crabs.buyingUnits', { note: 'x' }), { versionId: 'v1', asOf: AT }))
      .toThrow(/not governable/);
    expect(() => publishKCR(approved('p_oldbay.madeUpField', 1), { versionId: 'v1', asOf: AT }))
      .toThrow(/not governable/);
  });
});

describe('the measurement that justifies the contract', () => {
  test('the crab COUNT is engine-owned — it does not move with a per-guest rate', () => {
    // Pinning the observed behaviour so the contract cannot be quietly relaxed:
    // whatever qtyPerGuest says, the crab line reports engine-quantised units.
    const plan = playbookFoodPlan({ id: 'x', type: 'Crab Feast', date: '2026-09-01', guestCount: 18 }, {});
    const crab = (plan.list || []).find((i) => i.id === 'p_crabs');
    expect(crab).toBeTruthy();
    // The engine sizes in dozens against real buying units, not guests x rate.
    expect(crab.unit).toMatch(/dozen|crab/i);
    expect(Number(crab.qty)).toBeGreaterThan(0);
  });
});

// ─── The contract cannot drift (Phase 5E.2) ──────────────────────────────────
describe('the registry stays in sync with the actual consumer', () => {
  test('RUNTIME_CONSUMED_FIELDS matches what governedPurchase resolves', () => {
    // The one way this contract rots: someone adds a field to governedPurchase and
    // not here, or here and not there. Pinned so the drift is a test failure.
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../playbooks/index.js'), 'utf8',
    );
    const m = src.match(/const GOVERNED_PURCHASE_FIELDS = \[([\s\S]*?)\];/);
    expect(m).toBeTruthy();
    const declared = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect([...RUNTIME_CONSUMED_FIELDS].sort()).toEqual(declared.sort());
  });

  test('every editable purchase field has a runtime consumer', () => {
    for (const f of ['provenance', 'qtyPerGuest', 'unitCostRange', 'priceLadder', 'servingGuide',
      'buyingUnits', 'madeUp', 'note']) {
      const o = fieldOwnership('Crab Feast', `p_oldbay.${f}`);
      if (o.editable) expect(RUNTIME_CONSUMED_FIELDS).toContain(f);
    }
  });
});

// ─── WIRE PROOF: the governing field actually moves host output ───────────────
describe('priceLadder is genuinely governable (Phase 5E.2)', () => {
  const { playbookFoodPlan, getPlaybook } = require('../playbooks/index');
  const { __setSnapshotForTests, __resetSnapshotForTests } = require('./publishedSnapshot');
  const EV = { id: 'x', type: 'Crab Feast', date: '2026-09-01', guestCount: 18 };

  test('a governed priceLadder changes the BUSHEL recommendation the host buys against', () => {
    // This is the field that survives the ownership contract for the crab line:
    // qtyPerGuest cannot move a bushel, but the LADDER is what the bushel maths reads.
    const authored = getPlaybook('Crab Feast').purchases.find((p) => p.id === 'p_crabs').priceLadder;
    const before = playbookFoodPlan(EV, {}).list.find((i) => i.id === 'p_crabs').bulkRecommendation;
    expect(before).toBeTruthy();

    const moved = JSON.parse(JSON.stringify(authored));
    moved.largeMale = { ...moved.largeMale, perBushel: 999, perDz: 999 };
    __setSnapshotForTests({
      schemaVersion: 1, entryCount: 1, generatedAt: null, snapshotVersion: 't',
      entries: [{
        assetId: 'Crab Feast', fieldPath: 'p_crabs.priceLadder', value: moved,
        kcrId: 'k1', versionId: 'v1', provenance: {}, evidenceIds: [],
      }],
    });
    try {
      const after = playbookFoodPlan(EV, {}).list.find((i) => i.id === 'p_crabs').bulkRecommendation;
      expect(after.price).not.toBe(before.price);      // host-facing number MOVED
      expect(after.unit).toBe(before.unit);            // still quantised to real units
      expect(after.qty).toBe(before.qty);
    } finally { __resetSnapshotForTests(); }
  });
});

// ─── servingGuide had NO consumer until 5E.3 ────────────────────────────────
//
// The defect these tests exist to keep fixed: `servingGuide` sat in the governed set
// from 5E.2, and `resolveBulkPurchase` read it ONLY as `if (!p.servingGuide) return
// null`. Every serving number came off the frozen module constant, which
// governedPurchase cannot reach. Measured before the fix — a guide claiming 20 crabs
// per picker and 12 per bushel produced a byte-identical recommendation:
//
//   BEFORE {"qty":2,"unit":"bushels","totalUnits":84,"price":690}
//   AFTER  {"qty":2,"unit":"bushels","totalUnits":84,"price":690}   MOVED: false
//
// The registry's own drift test could not catch it: it checks that
// RUNTIME_CONSUMED_FIELDS matches GOVERNED_PURCHASE_FIELDS, and both listed the
// field. Two declarations agreeing is consistency, not consumption. So these tests
// assert against OUTPUT, which is the only thing that cannot agree with itself.
describe('servingGuide is genuinely governable (Phase 5E.3)', () => {
  const { playbookFoodPlan: plan } = require('../playbooks/index');
  const { __setSnapshotForTests: set, __resetSnapshotForTests: reset } = require('./publishedSnapshot');
  const EV = { id: 'x', type: 'Crab Feast', date: '2026-09-01', guestCount: 18 };
  const rec = () => plan(EV, {}).list.find((i) => i.id === 'p_crabs').bulkRecommendation;
  const govern = (value) => set({
    schemaVersion: 1, entryCount: 1, generatedAt: null, snapshotVersion: 't',
    entries: [{
      assetId: 'Crab Feast', fieldPath: 'p_crabs.servingGuide', value,
      kcrId: 'k', versionId: 'v', provenance: {}, evidenceIds: [],
    }],
  });
  const row = (o) => ({ withSides: [4, 4], mainOnly: [5, 6], perBushel: [72, 72], ...o });

  afterEach(reset);

  test('crabs-per-picker moves the COUNT — the thing qtyPerGuest could not do', () => {
    const before = rec();
    expect(before).toMatchObject({ qty: 2, totalUnits: 84, price: 690 });
    govern({ bySize: { large: row({ withSides: [3, 3] }) } });
    // 18 guests x 3 = 54... the engine's picker share lands it at 63, under one
    // 72-crab bushel. Two bushels become one and the host spends half as much.
    expect(rec()).toMatchObject({ qty: 1, unit: 'bushel', totalUnits: 63, price: 345 });
  });

  test('crabs-per-bushel moves the number of bushels bought', () => {
    govern({ bySize: { large: row({ perBushel: [30, 30] }) } });
    expect(rec()).toMatchObject({ qty: 3, totalUnits: 84, price: 1035 });
  });

  test('a MALFORMED governed guide degrades to the sourced table, never to NaN', () => {
    // A published value reaches this path without passing through the composer, so
    // the shape check has to live in the engine. Half a row must not become NaN crabs.
    for (const bad of [{ bySize: { large: { withSides: 'junk' } } }, { bySize: { large: {} } },
      { bySize: null }, {}, 'legacy string']) {
      govern(bad);
      expect(rec()).toMatchObject({ qty: 2, totalUnits: 84, price: 690 });
    }
  });

  test('a guide silent on the CHOSEN size falls back for that size', () => {
    // Correcting mediums must not silently re-price a large-male feast.
    govern({ bySize: { medium: row({ withSides: [9, 9] }) } });
    expect(rec()).toMatchObject({ qty: 2, totalUnits: 84, price: 690 });
  });
});
