// ─── Knowledge acquisition: discovery + first-governance lineage (Phase 5F.2) ─
//
// The bottleneck: `doCorrect` required a live snapshot entry and refused without
// one, so only ALREADY-GOVERNED fields could be governed. 2 assets reachable,
// 39 playbooks in the corpus.
//
// Two things must hold for the picker to be trustworthy:
//   1. it offers exactly the fields the RUNTIME governance contract consumes -
//      never a documented-but-unconsumed field, never an engine-delegated one;
//   2. a field that has never been published starts its OWN lineage and
//      supersedes nothing.
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan } from '../playbooks/index';
import {
  acquisitionTree, acquisitionSummary, governableFieldsFor, fieldState, GOVERNANCE_STATES,
} from './knowledgeAcquisition';
import { fieldOwnership, RUNTIME_CONSUMED_FIELDS } from './governedOwnership';
import { openAuthoredGovernance, openCorrection } from './correctionWorkflow';
import { publishKCR } from './knowledgeChange';
import { buildSnapshot } from './publishedSnapshotBuild.mjs';
import { __setSnapshotForTests, __resetSnapshotForTests } from './publishedSnapshot';

const AT = '2026-08-01T12:00:00.000Z';

describe('the picker offers exactly what runtime consumes', () => {
  test('PICKER FIELDS == RUNTIME GOVERNED FIELDS, across the whole corpus', () => {
    // The contract test. Every field the picker would offer must be one the
    // ownership contract says drives runtime for that specific purchase, and every
    // drivesRuntime field the purchase carries must be offered. Both directions,
    // so the picker can neither over-promise nor hide governable work.
    const mismatches = [];
    for (const pb of ALL_PLAYBOOKS || []) {
      for (const p of (pb.purchases || [])) {
        const offered = new Set(governableFieldsFor(pb.type, p));
        for (const f of RUNTIME_CONSUMED_FIELDS) {
          const drives = fieldOwnership(pb.type, `${p.id}.${f}`, p).drivesRuntime;
          const carried = p[f] !== undefined || f === 'provenance';
          const expected = drives && carried;
          if (expected !== offered.has(f)) {
            mismatches.push(`${pb.type}|${p.id}.${f} expected=${expected} offered=${offered.has(f)}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test('an ENGINE-DELEGATED field is never offered', () => {
    const crabs = getPlaybook('Crab Feast').purchases.find((p) => p.id === 'p_crabs');
    const offered = governableFieldsFor('Crab Feast', crabs);
    for (const dead of ['qtyPerGuest', 'qtyFlat', 'unitCostRange']) {
      expect(offered).not.toContain(dead);          // owned by the crab engine
    }
    expect(offered).toEqual(expect.arrayContaining(['priceLadder', 'servingGuide', 'provenance']));
  });

  test('a CHANNEL-PRICED protein does not offer unitCostRange', () => {
    const ribs = getPlaybook('The Cookout').purchases.find((p) => p.id === 'p_ribs');
    expect(governableFieldsFor('The Cookout', ribs)).not.toContain('unitCostRange');
  });

  test('no field is offered that the picker cannot state a state for', () => {
    const tree = acquisitionTree(ALL_PLAYBOOKS, []);
    for (const a of tree) {
      for (const c of a.categories) {
        for (const it of c.items) {
          for (const f of it.fields) expect(GOVERNANCE_STATES).toContain(f.state);
        }
      }
    }
  });
});

describe('discovery starts from the AUTHORED corpus', () => {
  test('the tree reaches the whole corpus, not just governed assets', () => {
    const tree = acquisitionTree(ALL_PLAYBOOKS, []);
    const s = acquisitionSummary(tree);
    // The number that defines the bottleneck: with an empty published set, every
    // asset is ungoverned and every one of them is still reachable.
    expect(s.assets).toBeGreaterThan(30);
    expect(s.ungovernedAssets).toBe(s.assets);
    expect(s.fields).toBeGreaterThan(500);
  });

  test('published knowledge is an OVERLAY, not the source of discovery', () => {
    const entries = [{ assetId: 'Crab Feast', fieldPath: 'p_ice.provenance' }];
    const tree = acquisitionTree(ALL_PLAYBOOKS, entries);
    const crab = tree.find((a) => a.assetId === 'Crab Feast');
    expect(crab.ungoverned).toBe(false);
    const ice = crab.categories.flatMap((c) => c.items).find((i) => i.id === 'p_ice');
    expect(ice.fields.find((f) => f.field === 'provenance').state).toBe('published');
    // ...and every other asset is still listed.
    expect(tree.length).toBeGreaterThan(30);
  });

  test('filters narrow without hiding state', () => {
    const byState = acquisitionTree(ALL_PLAYBOOKS, [], { state: 'missing-provenance' });
    const all = acquisitionSummary(acquisitionTree(ALL_PLAYBOOKS, []));
    const filtered = acquisitionSummary(byState);
    expect(filtered.counts['missing-provenance']).toBe(all.counts['missing-provenance']);
    expect(filtered.counts.correctable).toBe(0);

    const oneAsset = acquisitionTree(ALL_PLAYBOOKS, [], { assetId: 'Fish Fry' });
    expect(oneAsset).toHaveLength(1);
    expect(oneAsset[0].assetId).toBe('Fish Fry');

    const q = acquisitionTree(ALL_PLAYBOOKS, [], { query: 'ice' });
    expect(q.length).toBeGreaterThan(0);
  });

  test('fieldState uses the HOST predicate, so backlog and host agree', () => {
    const pb = getPlaybook('Crab Feast');
    const authored = pb.purchases.find((p) => p.id === 'p_ice');
    // ── THE UNSOURCED FIXTURE IS BUILT, NOT BORROWED (2026-08-07) ───────────
    // This used to assert that the real p_ice carries no provenance and use it
    // as the unsourced case. That made the test depend on the corpus containing
    // an UNLABELLED item — which is the exact condition task #10 exists to
    // remove, so achieving the goal broke the test. A test that fails when you
    // succeed is testing the wrong thing.
    // What it actually needs is an object with no provenance, so it makes one.
    // The subject under test is fieldState's PREDICATE, not the corpus's state.
    // ABSENT, not null: the host ROW shows `provenance: null` because the render
    // does `purchaseProvenance(...) || null`, while an unsourced purchase simply
    // has no key. Both mean unsourced, so the invariant is falsiness — asserting
    // `toBeNull` would pin a rendering detail as a data contract.
    if (!authored) throw new Error('p_ice no longer exists in the Crab Feast corpus — pick another authored purchase for this fixture');
    const ice = { ...authored };
    delete ice.provenance;
    expect(ice.provenance).toBeFalsy();                      // unsourced by construction
    expect(fieldState('Crab Feast', ice, 'qtyPerGuest', new Set())).toBe('missing-provenance');

    const grounded = { ...ice, provenance: { tier: 'researched', sources: ['reddy-ice-2026'] } };
    expect(fieldState('Crab Feast', grounded, 'qtyPerGuest', new Set())).toBe('correctable');

    const ungroundable = { ...ice, provenance: { tier: 'researched', sources: ['not-a-real-source'] } };
    expect(fieldState('Crab Feast', ungroundable, 'qtyPerGuest', new Set())).toBe('needs-research');
  });
});

describe('FIRST governance of an authored field starts its own lineage', () => {
  const authored = () => getPlaybook('Fish Fry').purchases.find((p) => p.id === 'p_ice');

  test('opens at review, carries the AUTHORED value as the prior, and has no parent', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.qtyPerGuest', authoredValue: authored().qtyPerGuest },
      { newValue: 2, reason: 'Outdoor propane fryer event sized like an indoor party.', asOf: AT },
    );
    expect(k.status).toBe('review');
    expect(k.currentValue).toBe(1.5);                  // the real before
    expect(k.proposal.newValue).toBe(2);
    expect(k.correctionOf).toBeUndefined();            // NO fake parent
    expect(k.rollbackTo == null).toBe(true);
  });

  test('cannot self-approve — review is still required', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.qtyPerGuest', authoredValue: 1.5 },
      { newValue: 2, reason: 'r', asOf: AT },
    );
    expect(() => publishKCR(k, { versionId: 'v1', asOf: AT })).toThrow();
  });

  test('a reason is still mandatory', () => {
    expect(() => openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.qtyPerGuest', authoredValue: 1.5 },
      { newValue: 2, reason: '  ', asOf: AT },
    )).toThrow(/must state its reason/);
  });

  test('an invalid asset cannot open a correction', () => {
    expect(() => openAuthoredGovernance({}, { newValue: 2, reason: 'r' }))
      .toThrow(/assetId and fieldPath are required/);
    expect(() => openAuthoredGovernance({ assetId: 'Fish Fry' }, { newValue: 2, reason: 'r' }))
      .toThrow(/assetId and fieldPath are required/);
  });

  test('the publish GATES are unchanged — ownership still refuses a delegated field', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Crab Feast', fieldPath: 'p_crabs.qtyPerGuest', authoredValue: 0.33 },
      { newValue: 0.5, reason: 'r', asOf: AT },
    );
    const approved = {
      ...k, status: 'approved',
      review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
    };
    expect(() => publishKCR(approved, { versionId: 'v1', asOf: AT })).toThrow(/not governable/);
  });

  test('published first-governance mints a v1 and supersedes NOTHING', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.qtyPerGuest', authoredValue: 1.5 },
      { newValue: 2, reason: 'r', asOf: AT },
    );
    const approved = {
      ...k, status: 'approved',
      review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
    };
    const { kcr } = publishKCR(approved, { versionId: 'ff-ice-v1', asOf: AT });
    expect(kcr.status).toBe('published');
    expect(kcr.rollbackTo == null).toBe(true);

    const built = buildSnapshot([kcr]);
    expect(built.snapshot.entries).toHaveLength(1);
    expect(built.superseded).toHaveLength(0);
    expect(built.conflicts).toHaveLength(0);
  });
});

describe('EXISTING lineage is untouched by the new path', () => {
  test('a published field still supersedes correctly through openCorrection', () => {
    const v1 = {
      id: 'k1', status: 'published', assetId: 'Fish Fry', fieldPath: 'p_ice.qtyPerGuest',
      publishedVersion: 'ff-ice-v1', rollbackTo: null,
      proposal: { newValue: 2, newProvenance: { tier: 'researched', sources: ['reddy-ice-2026'] } },
      evidence: [{ id: 'e1', sourceType: 'citation', source: 'Reddy Ice', url: 'https://x' }],
      review: {}, audit: [],
    };
    const corr = openCorrection(v1, { newValue: 2.5, reason: 'hotter day', asOf: AT });
    expect(corr.correctionOf).toBe('ff-ice-v1');       // lineage preserved
    expect(corr.evidence.length).toBeGreaterThan(0);   // evidence carried forward
    expect(corr.status).toBe('review');

    const approved = {
      ...corr, status: 'approved',
      review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
    };
    const { correctionOf, ...clean } = approved;
    const { kcr: v2 } = publishKCR(clean, { prevVersion: 'ff-ice-v1', versionId: 'ff-ice-v2', asOf: AT });

    const built = buildSnapshot([v1, v2]);
    expect(built.snapshot.entries).toHaveLength(1);
    expect(built.snapshot.entries[0].value).toBe(2.5);  // head of lineage wins
    expect(built.superseded).toHaveLength(1);           // v1 kept for history
  });
});

describe('a first governance reaches the host', () => {
  afterEach(__resetSnapshotForTests);

  test('publishing an authored-only field changes runtime output', () => {
    const EV = { id: 'x', type: 'Fish Fry', date: '2026-09-01', guestCount: 18 };
    const row = () => (playbookFoodPlan(EV, {}).list || []).find((i) => i.id === 'p_ice');
    const before = row();
    expect(before.perGuest).toBe(1.5);

    const k = openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.qtyPerGuest', authoredValue: 1.5 },
      { newValue: 2, reason: 'outdoor cook', asOf: AT },
    );
    const approved = {
      ...k, status: 'approved',
      review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
    };
    const { kcr } = publishKCR(approved, { versionId: 'ff-ice-v1', asOf: AT });
    __setSnapshotForTests(buildSnapshot([kcr]).snapshot);

    const after = row();
    expect(after.perGuest).toBe(2);
    expect(after.qty).toBeGreaterThan(before.qty);      // the host buys more ice
    expect(getPlaybook('Fish Fry').purchases.find((p) => p.id === 'p_ice').qtyPerGuest).toBe(1.5);
  });
});
