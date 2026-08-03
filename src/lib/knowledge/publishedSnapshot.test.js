// NOTE (Phase 5E.1): this slice used p_crabs.unitCostRange as its subject. The
// crab line is owned by the crab engine (bushel thresholds), so that field is no
// longer governable by declaration. The subject moved to p_oldbay - a plain
// per-unit purchase - which is what a value slice should exercise anyway.
// ─── CONVEYOR 1 TRANSPORT — published knowledge reaches runtime, safely ───────
//
// The governance chain was already proven end to end by kasVerticalSlice.test.js.
// What it could NOT prove is that a published KCR reaches anyone but the admin who
// published it: the override lands in that browser's localStorage, and the KAS
// server store is admin-scoped by design.
//
// These gates prove the build-time transport, and — just as important — prove what
// it REFUSES to carry. A transport that will move a draft KCR is not a transport,
// it is a hole in governance.
import {
  buildSnapshot, isPublishable, contentHash, SNAPSHOT_SCHEMA_VERSION,
} from './publishedSnapshotBuild.mjs';
import {
  publishedEntry, publishedEntries, snapshotMeta,
  __setSnapshotForTests, __resetSnapshotForTests,
} from './publishedSnapshot';
import { effectiveValue, readAuthored, applyOverride, clearOverrides, rollbackOverride, overrideFromPublishedKCR } from './knowledgeOverride';
import { resolveField } from './runtimeKnowledge';
import { resolveKnowledge, isResolutionInert } from './runtimeResolver';
import { createObservation } from './observation';
import { createEvidence } from './evidence';
import { deriveFinding, findingToKCR } from './finding';
import { advanceKCR, recordReview, publishKCR } from './knowledgeChange';
import { getPlaybook } from '../playbooks/index';

const ASOF = '2026-07-02';
const FIELD = 'p_oldbay.unitCostRange';
const NEW_VALUE = [3, 8];
const crab = getPlaybook('Crab Feast');

// Drive the REAL governance chain to produce a genuinely published KCR — the same
// machinery kasVerticalSlice.test.js exercises. Nothing here hand-writes a KCR
// object, so the transport is fed exactly what governance emits.
function publishedKcr({ approve = true } = {}) {
  const obs = createObservation({ kind: 'pricing', gapType: 'pricing', assetId: 'Crab Feast', fieldPath: FIELD, statement: 'DMV blue-crab prices appear up', source: 'corpus', at: ASOF });
  const evidence = [
    createEvidence({ source: 'USDA', sourceType: 'official', authorityLevel: 'primary', assetId: 'Crab Feast', fieldPath: FIELD, excerpt: 'blue crab dockside up', extractedFacts: [{ field: FIELD, value: NEW_VALUE }], at: ASOF }),
    createEvidence({ source: 'Restaurant Depot', sourceType: 'commercial', authorityLevel: 'trade', assetId: 'Crab Feast', fieldPath: FIELD, extractedFacts: [{ field: FIELD, value: NEW_VALUE }], at: ASOF }),
    createEvidence({ source: 'Maine Ave Market', sourceType: 'regional', authorityLevel: 'community', assetId: 'Crab Feast', fieldPath: FIELD, extractedFacts: [{ field: FIELD, value: NEW_VALUE }], at: ASOF }),
  ];
  const finding = deriveFinding(obs, evidence, { asOf: ASOF });
  let kcr = findingToKCR(finding, evidence, crab, ASOF);
  kcr = advanceKCR(kcr, 'researching', { asOf: ASOF });
  kcr = advanceKCR(kcr, 'grounded', { asOf: ASOF });
  kcr = advanceKCR(kcr, 'review', { asOf: ASOF });
  if (!approve) return kcr;                       // stops at 'review' — never published
  kcr = recordReview(kcr, 'sme', { by: 'John Shields', decision: 'approve' }, ASOF);
  kcr = recordReview(kcr, 'editorial', { by: 'editor', decision: 'approve' }, ASOF);
  kcr = recordReview(kcr, 'governance', { by: 'publisher', decision: 'approve' }, ASOF);
  kcr = advanceKCR(kcr, 'approved', { by: 'publisher', asOf: ASOF });
  return publishKCR(kcr, { versionId: 'crab-p_crabs-v1', prevVersion: 'crab-p_crabs-v0', by: 'publisher', asOf: ASOF }).kcr;
}

const bake = (kcrs) => __setSnapshotForTests(buildSnapshot(kcrs, { at: ASOF }).snapshot);

beforeEach(() => { clearOverrides(); __resetSnapshotForTests(); });
afterEach(() => { clearOverrides(); __resetSnapshotForTests(); });

describe('1 - published knowledge loads and resolves at runtime', () => {
  test('a genuinely published KCR travels the whole transport', () => {
    const authored = readAuthored(crab, FIELD);
    const kcr = publishedKcr();
    expect(kcr.status).toBe('published');

    bake([kcr]);
    expect(snapshotMeta().entryCount).toBe(1);

    const eff = effectiveValue(crab, FIELD);
    expect(eff.value).toEqual(NEW_VALUE);
    expect(eff.source).toBe('published');
    // The governance record travels with the value, not just the number.
    expect(eff.kcrId).toBe(kcr.id);
    expect(eff.versionId).toBe('crab-p_crabs-v1');
    expect(eff.evidenceIds.length).toBe(3);
    // And the authored source file is untouched.
    expect(readAuthored(crab, FIELD)).toEqual(authored);
  });

  test('the runtime reader reports the governance context, and an honest rollback', () => {
    bake([publishedKcr()]);
    const r = resolveField(crab, FIELD);
    expect(r.source).toBe('published');
    expect(r.value).toEqual(NEW_VALUE);
    expect(r.authoredValue).toEqual(readAuthored(crab, FIELD));
    expect(r.kcrId).toBeTruthy();
    expect(r.evidenceIds.length).toBe(3);
    // A baked value CANNOT be dropped in place; saying otherwise would promise a
    // rollback this transport cannot perform.
    expect(r.rollbackAvailable).toBe(false);
    expect(r.rollbackMechanism).toBe('rebuild the snapshot and redeploy');
    // The trace names the stage, so lineage is auditable end to end.
    expect(r.trace.map((t) => t.stage)).toEqual(['canonical', 'published']);
  });

  test('resolution is no longer inert once knowledge is published', () => {
    expect(isResolutionInert(crab, FIELD)).toBe(true);     // empty snapshot
    bake([publishedKcr()]);
    expect(isResolutionInert(crab, FIELD)).toBe(false);
    expect(resolveKnowledge(crab, FIELD).source).toBe('published');
  });
});

describe('2 - unpublished knowledge does nothing', () => {
  test.each([
    ['draft', { id: 'k1', status: 'draft', assetId: 'Crab Feast', fieldPath: FIELD, proposal: { newValue: [99, 99] } }],
    ['researching', { id: 'k2', status: 'researching', assetId: 'Crab Feast', fieldPath: FIELD, proposal: { newValue: [99, 99] } }],
    ['review', { id: 'k3', status: 'review', assetId: 'Crab Feast', fieldPath: FIELD, proposal: { newValue: [99, 99] } }],
    ['approved-but-not-published', { id: 'k4', status: 'approved', assetId: 'Crab Feast', fieldPath: FIELD, proposal: { newValue: [99, 99] } }],
    ['rejected', { id: 'k5', status: 'rejected', assetId: 'Crab Feast', fieldPath: FIELD, proposal: { newValue: [99, 99] } }],
  ])('a %s KCR is refused by the build and never reaches runtime', (_label, kcr) => {
    expect(isPublishable(kcr)).toBe(false);
    const { snapshot, accepted, rejected } = buildSnapshot([kcr], { at: ASOF });
    expect(accepted).toBe(0);
    expect(snapshot.entries).toEqual([]);
    expect(rejected[0].reason).toMatch(/not 'published'/);
    __setSnapshotForTests(snapshot);
    expect(effectiveValue(crab, FIELD).source).toBe('authored');
  });

  test('a KCR that reached review but was never approved does not publish', () => {
    const kcr = publishedKcr({ approve: false });
    expect(kcr.status).not.toBe('published');
    bake([kcr]);
    expect(snapshotMeta().entryCount).toBe(0);
    expect(effectiveValue(crab, FIELD).source).toBe('authored');
  });

  test('a published CONTRADICTION KCR carries no proposal and is refused', () => {
    // findingToKCR emits type 'contradiction' with proposal null - humans resolve it.
    // Even stamped published, there is no value to carry.
    const kcr = { id: 'kc', status: 'published', assetId: 'Crab Feast', fieldPath: FIELD, proposal: null };
    expect(isPublishable(kcr)).toBe(false);
    expect(buildSnapshot([kcr]).rejected[0].reason).toMatch(/no proposal/);
  });
});

describe('3 - rollback behavior', () => {
  test('dropping a local override falls back to the baked value, then to authored', () => {
    const authored = readAuthored(crab, FIELD);
    const kcr = publishedKcr();
    bake([kcr]);

    // A live local override outranks the baked snapshot (precedence tier 2 over 3).
    const ovr = overrideFromPublishedKCR(kcr);
    applyOverride({ ...ovr, value: [5, 9] });
    expect(effectiveValue(crab, FIELD)).toMatchObject({ value: [5, 9], source: 'override' });

    // Drop it: the baked published value is what remains.
    rollbackOverride(ovr.id);
    expect(effectiveValue(crab, FIELD)).toMatchObject({ value: NEW_VALUE, source: 'published' });

    // Un-bake (the redeploy equivalent): the authored value returns.
    bake([]);
    expect(effectiveValue(crab, FIELD)).toMatchObject({ value: authored, source: 'authored' });
  });
});

describe('4 - no regression for UNPUBLISHED fields', () => {
  // ERA NOTE (Phase 5E.1). This asserted `entryCount === 0` - true when written,
  // because HEAD shipped the EMPTY snapshot and no governed knowledge had ever
  // reached a build. Phase 5C.6 committed the governed corpus (that was the P0
  // fix), so an empty artifact is now the anomaly, not the baseline. The property
  // worth protecting was never "nothing is published" - it is "a field NOBODY
  // published still resolves to its authored value", which is what this now says.
  test('the artifact loads, and an UNPUBLISHED field is still authored', () => {
    const meta = snapshotMeta();
    expect(meta.loaded).toBe(true);
    expect(meta.entryCount).toBe(publishedEntries().length);
    // a field with no governed entry
    expect(publishedEntry('Crab Feast', 'p_oldbay.unitCostRange')).toBeNull();
  });

  test('resolution is byte-identical to authored for fields nobody published', () => {
    for (const [type, field] of [['Wedding', 'type'], ['Repast', 'type']]) {
      const pb = getPlaybook(type);
      if (!pb) continue;
      const eff = effectiveValue(pb, field);
      expect(eff.source).toBe('authored');
      expect(eff.value).toEqual(readAuthored(pb, field));
      expect(isResolutionInert(pb, field)).toBe(true);
    }
  });

  test('the local-override path is unchanged by the new tier', () => {
    const kcr = publishedKcr();
    applyOverride(overrideFromPublishedKCR(kcr));       // no snapshot baked
    const eff = effectiveValue(crab, FIELD);
    expect(eff.source).toBe('override');                 // NOT 'published'
    expect(eff.value).toEqual(NEW_VALUE);
    expect(resolveField(crab, FIELD).rollbackAvailable).toBe(true);
  });
});

describe('5 - governance preservation', () => {
  test('only the published state is eligible - every other state is refused', () => {
    for (const status of ['draft', 'researching', 'grounded', 'review', 'approved', 'rejected', 'revision', 'monitoring']) {
      expect(isPublishable({ status, assetId: 'A', fieldPath: 'f', proposal: { newValue: 1 } })).toBe(false);
    }
    expect(isPublishable({ status: 'published', assetId: 'A', fieldPath: 'f', proposal: { newValue: 1 } })).toBe(true);
  });

  test('the loader re-validates the artifact - an untraceable entry is dropped', () => {
    // Defence in depth: the build already filters, but a hand-edited or stale
    // artifact must not become a way to inject a value with no KCR behind it.
    __setSnapshotForTests({
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      entries: [
        { assetId: 'Crab Feast', fieldPath: FIELD, value: [1, 2] },              // no kcrId
        { assetId: 'Crab Feast', fieldPath: 'p_x.unitCostRange', kcrId: 'k' },   // no value
        { fieldPath: FIELD, value: [1, 2], kcrId: 'k' },                          // no assetId
      ],
    });
    expect(snapshotMeta().entryCount).toBe(0);
    expect(effectiveValue(crab, FIELD).source).toBe('authored');
  });

  test('a snapshot from an unknown schema version is ignored, not half-read', () => {
    __setSnapshotForTests({
      schemaVersion: SNAPSHOT_SCHEMA_VERSION + 99,
      entries: [{ assetId: 'Crab Feast', fieldPath: FIELD, value: [1, 2], kcrId: 'k' }],
    });
    expect(snapshotMeta().loaded).toBe(false);
    expect(effectiveValue(crab, FIELD).source).toBe('authored');
  });

  test('a malformed artifact degrades to authored and never throws', () => {
    for (const bad of [null, undefined, 'nope', 42, {}, { entries: 'x' }]) {
      expect(() => __setSnapshotForTests(bad)).not.toThrow();
      expect(effectiveValue(crab, FIELD).source).toBe('authored');
    }
  });
});

describe('the artifact is deterministic', () => {
  test('same input, byte-identical output', () => {
    const kcr = publishedKcr();
    const a = buildSnapshot([kcr], { at: ASOF }).snapshot;
    const b = buildSnapshot([kcr], { at: ASOF }).snapshot;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.snapshotVersion).toBe(b.snapshotVersion);
  });

  test('input order does not change the artifact', () => {
    const k1 = { id: 'a', status: 'published', assetId: 'B', fieldPath: 'f', proposal: { newValue: 1 } };
    const k2 = { id: 'b', status: 'published', assetId: 'A', fieldPath: 'f', proposal: { newValue: 2 } };
    expect(JSON.stringify(buildSnapshot([k1, k2]).snapshot))
      .toBe(JSON.stringify(buildSnapshot([k2, k1]).snapshot));
  });

  test('a changed value changes the snapshot version', () => {
    const base = { id: 'a', status: 'published', assetId: 'A', fieldPath: 'f', proposal: { newValue: 1 } };
    const changed = { ...base, proposal: { newValue: 2 } };
    expect(buildSnapshot([base]).snapshot.snapshotVersion)
      .not.toBe(buildSnapshot([changed]).snapshot.snapshotVersion);
  });

  test('the version is a content hash, not a clock', () => {
    expect(contentHash('x')).toBe(contentHash('x'));
    expect(contentHash('x')).not.toBe(contentHash('y'));
  });
});
