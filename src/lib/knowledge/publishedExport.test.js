// ─── Publish loop: lineage + export (Phase 5C.4) ─────────────────────────────
//
// Two things are proven here, and they are the two that were broken:
//
//   1. LINEAGE. Admin's publish handler passed `prevVersion: k.rollbackTo` — the
//      GRANDPARENT. First publishes hid it (both null). A re-publish chained the
//      new version past its parent, leaving the parent unsuperseded, and since
//      publishedSnapshotBuild selects by lineage that produced TWO LIVE HEADS on
//      one field. Every correction is a re-publish, so this defect sat exactly on
//      the path Phase 5C.2 built.
//
//   2. EXPORT. Nothing projected published KCRs into the file the bake reads, so
//      an approved Admin change could never reach a host.
//
// The lineage tests reproduce the OLD behaviour explicitly before asserting the
// new one, because a regression test that only asserts the fix cannot show the
// bug was real.
import fs from 'fs';
import path from 'path';
import {
  publishedKcrsForExport, serializePublishedExport, exportSummary,
  mergePublishedKnowledge, snapshotEntryToKcr, publishedInventory,
} from './publishedExport';
import { buildSnapshot } from './publishedSnapshotBuild.mjs';
import { publishKCR } from './knowledgeChange';

const EXPORT_PATH = path.resolve(__dirname, '../../../knowledge-exports/published-kcrs.json');
const readExport = () => JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
const AT = '2026-08-01T20:00:00.000Z';

// Minimal approved KCR the publish gate will accept.
const approved = (id, value) => ({
  id, status: 'approved', assetId: 'A', fieldPath: 'f',
  type: 'correction', trigger: 'validation',
  proposal: { newValue: value, newProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['s1'] } },
  evidence: [{ id: 's1', sourceType: 'citation' }],
  review: {}, audit: [], createdAt: AT, currentValue: null,
});

// Exactly what AdminConsole's handler does, parameterised by which ancestor it
// passes — so the OLD and NEW behaviour are compared through the real function.
const adminPublish = (k, ancestor, n) => publishKCR(k, {
  versionId: `v${n}`,
  prevVersion: ancestor,
  by: 'publisher',
  asOf: AT,
}).kcr;

describe('publish lineage (task 1)', () => {
  test('first publish is identical under both the old and new expression', () => {
    const k = approved('k1', 'ONE');
    const oldWay = adminPublish(k, k.rollbackTo || null, 1);        // former code
    const newWay = adminPublish(k, k.publishedVersion || null, 1);  // fixed code
    expect(oldWay.rollbackTo).toBeNull();
    expect(newWay.rollbackTo).toBeNull();
    // This is WHY the defect survived review: on a first publish the two agree.
    expect(newWay.publishedVersion).toBe(oldWay.publishedVersion);
  });

  test('OLD behaviour: a re-publish leaves the parent unsuperseded -> two live heads', () => {
    const v1 = adminPublish(approved('k1', 'ONE'), null, 1);
    const reapproved = { ...v1, status: 'approved' };
    // the bug: passing rollbackTo (null here) instead of publishedVersion ('v1')
    const v2bad = adminPublish(reapproved, reapproved.rollbackTo || null, 2);

    expect(v2bad.rollbackTo).toBeNull();               // chained to nothing
    const r = buildSnapshot([{ ...v1, id: 'k1' }, { ...v2bad, id: 'k2' }]);
    expect(r.superseded).toHaveLength(0);              // v1 never marked replaced
    expect(r.conflicts).toHaveLength(1);               // and the build says so
  });

  test('NEW behaviour: a re-publish supersedes its parent and resolves to the head', () => {
    const v1 = adminPublish(approved('k1', 'ONE'), null, 1);
    const reapproved = { ...v1, status: 'approved', proposal: { ...v1.proposal, newValue: 'TWO' } };
    const v2 = adminPublish(reapproved, reapproved.publishedVersion || null, 2);

    expect(v2.rollbackTo).toBe('v1');
    const r = buildSnapshot([{ ...v1, id: 'k1' }, { ...v2, id: 'k2' }]);
    expect(r.conflicts).toHaveLength(0);
    expect(r.superseded.map((s) => s.versionId)).toEqual(['v1']);
    expect(r.snapshot.entries[0].value).toBe('TWO');
  });

  test('a THREE-version correction chain resolves to the newest, in any order', () => {
    const v1 = adminPublish(approved('k1', 'ONE'), null, 1);
    const v2 = adminPublish({ ...v1, status: 'approved', proposal: { ...v1.proposal, newValue: 'TWO' } }, v1.publishedVersion, 2);
    const v3 = adminPublish({ ...v2, status: 'approved', proposal: { ...v2.proposal, newValue: 'THREE' } }, v2.publishedVersion, 3);

    const a = { ...v1, id: 'k1' }, b = { ...v2, id: 'k2' }, c = { ...v3, id: 'k3' };
    for (const order of [[a, b, c], [c, b, a], [b, c, a]]) {
      const r = buildSnapshot(order);
      expect(r.snapshot.entries[0].value).toBe('THREE');
      expect(r.superseded.map((s) => s.versionId).sort()).toEqual(['v1', 'v2']);
      expect(r.conflicts).toHaveLength(0);
    }
  });

  test('rolling back the head of a 3-chain restores v2, not v1', () => {
    const v1 = adminPublish(approved('k1', 'ONE'), null, 1);
    const v2 = adminPublish({ ...v1, status: 'approved', proposal: { ...v1.proposal, newValue: 'TWO' } }, v1.publishedVersion, 2);
    const v3 = adminPublish({ ...v2, status: 'approved', proposal: { ...v2.proposal, newValue: 'THREE' } }, v2.publishedVersion, 3);

    const withdrawn = { ...v3, id: 'k3', status: 'revision' };
    const r = buildSnapshot([{ ...v1, id: 'k1' }, { ...v2, id: 'k2' }, withdrawn]);
    expect(r.snapshot.entries[0].value).toBe('TWO');
    expect(r.superseded.map((s) => s.versionId)).toEqual(['v1']);
  });
});

describe('published export (task 2)', () => {
  const onDisk = readExport();

  test('re-serializing the committed export is BYTE-IDENTICAL', () => {
    // The determinism contract: an export of unchanged knowledge must produce an
    // empty git diff, or reviewers learn to skim past it.
    expect(serializePublishedExport(onDisk)).toBe(fs.readFileSync(EXPORT_PATH, 'utf8'));
  });

  test('the export feeds the bake and reproduces the committed snapshot', () => {
    const fromExport = buildSnapshot(publishedKcrsForExport(onDisk));
    const committed = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, 'publishedKnowledge.json'), 'utf8',
    ));
    expect(fromExport.snapshot.entries).toEqual(committed.entries);
    expect(fromExport.snapshot.snapshotVersion).toBe(committed.snapshotVersion);
  });

  test('only published KCRs with a proposal are exported', () => {
    const mixed = [
      ...onDisk,
      { id: 'd1', status: 'draft', assetId: 'A', fieldPath: 'f', proposal: { newValue: 1 } },
      { id: 'a1', status: 'approved', assetId: 'A', fieldPath: 'f', proposal: { newValue: 1 } },
      { id: 'p0', status: 'published', assetId: 'A', fieldPath: 'f' },      // no proposal
      { id: 'p1', status: 'published', proposal: { newValue: 1 } },          // no assetId
    ];
    expect(publishedKcrsForExport(mixed).map((k) => k.id)).toEqual(onDisk.map((k) => k.id));
  });

  test('export ordering is stable regardless of input order', () => {
    const shuffled = [...onDisk].reverse();
    expect(serializePublishedExport(shuffled)).toBe(serializePublishedExport(onDisk));
  });

  test('summary separates lineage heads from superseded history', () => {
    const s = exportSummary(onDisk);
    expect(s.records).toBe(onDisk.length);
    expect(s.heads + s.superseded).toBe(s.records);
    // p_wine v1 is superseded by v2 (Phase 5C.2); p_crabs stands alone.
    expect(s.superseded).toBe(1);
    expect(s.fields).toBe(2);
  });

  test('export is pure — it does not touch disk', () => {
    const before = fs.readFileSync(EXPORT_PATH, 'utf8');
    serializePublishedExport(onDisk);
    publishedKcrsForExport(onDisk);
    exportSummary(onDisk);
    expect(fs.readFileSync(EXPORT_PATH, 'utf8')).toBe(before);
  });
});

// ─── Phase 5C.6 — merge safety (defect D2) ───────────────────────────────────
//
// Phase 5C.5 proved the export was a destructive replacement: publishing one new
// item would have emitted a 1-record file over a 3-record committed export,
// deleting governed knowledge Admin had never heard of. These tests encode the
// exact scenarios the repair brief specified.
describe('export merge safety (Phase 5C.6 / D2)', () => {
  const pub = (id, asset, field, ver, value, rollbackTo = null) => ({
    id, status: 'published', assetId: asset, fieldPath: field,
    publishedVersion: ver, rollbackTo,
    proposal: { newValue: value }, evidence: [], review: {}, audit: [],
  });

  test('EXISTING KNOWLEDGE SURVIVES — publishing p_budget keeps p_crabs and p_wine', () => {
    const existing = [
      pub('k-crabs', 'Crab Feast', 'p_crabs.provenance', 'crabs-v1', 'CRABS'),
      pub('k-wine', 'Retirement Party', 'p_wine.provenance', 'wine-v1', 'WINE'),
    ];
    const incoming = [pub('k-budget', 'Dinner Party', 'p_budget.provenance', 'budget-v1', 'BUDGET')];

    const merged = mergePublishedKnowledge(existing, incoming);
    const fields = publishedKcrsForExport(merged).map((k) => k.fieldPath).sort();
    expect(fields).toEqual(['p_budget.provenance', 'p_crabs.provenance', 'p_wine.provenance']);

    // and the bake keeps all three live
    const snap = buildSnapshot(merged).snapshot;
    expect(snap.entries).toHaveLength(3);
  });

  test('the OLD destructive behaviour is what we are preventing', () => {
    const existing = [
      pub('k-crabs', 'Crab Feast', 'p_crabs.provenance', 'crabs-v1', 'CRABS'),
      pub('k-wine', 'Retirement Party', 'p_wine.provenance', 'wine-v1', 'WINE'),
    ];
    const incoming = [pub('k-budget', 'Dinner Party', 'p_budget.provenance', 'budget-v1', 'BUDGET')];
    // exporting the Admin store ALONE (the 5C.4 behaviour) loses both originals
    expect(publishedKcrsForExport(incoming)).toHaveLength(1);
    expect(buildSnapshot(incoming).snapshot.entries).toHaveLength(1);
    // merging does not
    expect(buildSnapshot(mergePublishedKnowledge(existing, incoming)).snapshot.entries).toHaveLength(3);
  });

  test('SUPERSESSION WORKS — publishing p_wine v2 leaves runtime seeing only v2', () => {
    const existing = [pub('k-wine', 'Retirement Party', 'p_wine.provenance', 'wine-v1', 'WINE-1')];
    const incoming = [pub('k-wine-2', 'Retirement Party', 'p_wine.provenance', 'wine-v2', 'WINE-2', 'wine-v1')];

    const r = buildSnapshot(mergePublishedKnowledge(existing, incoming));
    const wine = r.snapshot.entries.filter((e) => e.fieldPath === 'p_wine.provenance');
    expect(wine).toHaveLength(1);                       // not both
    expect(wine[0].value).toBe('WINE-2');
    expect(r.superseded.map((s) => s.versionId)).toEqual(['wine-v1']);
    expect(r.conflicts).toHaveLength(0);
  });

  test('ARRAY ORDER INDEPENDENCE — shuffling merge inputs yields the same snapshot', () => {
    const a = pub('k-crabs', 'Crab Feast', 'p_crabs.provenance', 'crabs-v1', 'CRABS');
    const b = pub('k-wine', 'Retirement Party', 'p_wine.provenance', 'wine-v1', 'WINE-1');
    const c = pub('k-wine-2', 'Retirement Party', 'p_wine.provenance', 'wine-v2', 'WINE-2', 'wine-v1');

    const orders = [[[a, b], [c]], [[b, a], [c]], [[c], [a, b]], [[b, c], [a]]];
    const hashes = orders.map(([x, y]) => buildSnapshot(mergePublishedKnowledge(x, y)).snapshot.snapshotVersion);
    expect(new Set(hashes).size).toBe(1);
  });

  test('merge cannot DROP a field — every input id survives', () => {
    const existing = [pub('a', 'A', 'f1', 'v1', 1), pub('b', 'B', 'f2', 'v1', 2)];
    const incoming = [pub('c', 'C', 'f3', 'v1', 3)];
    expect(mergePublishedKnowledge(existing, incoming).map((k) => k.id).sort()).toEqual(['a', 'b', 'c']);
    expect(mergePublishedKnowledge(existing, []).map((k) => k.id).sort()).toEqual(['a', 'b']);
    expect(mergePublishedKnowledge([], incoming).map((k) => k.id)).toEqual(['c']);
  });

  test('incoming wins on the same id — a fresh publish beats its snapshot reconstruction', () => {
    const fromSnap = pub('same', 'A', 'f', 'v1', 'OLD');
    const fresh = pub('same', 'A', 'f', 'v2', 'NEW', 'v1');
    expect(mergePublishedKnowledge([fromSnap], [fresh])[0].proposal.newValue).toBe('NEW');
  });

  test('snapshotEntryToKcr round-trips the committed snapshot back through the bake', () => {
    const committed = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, 'publishedKnowledge.json'), 'utf8',
    ));
    const rebuilt = committed.entries.map(snapshotEntryToKcr).filter(Boolean);
    expect(rebuilt).toHaveLength(committed.entries.length);
    const snap = buildSnapshot(rebuilt).snapshot;
    // same fields, same values, same versions — the reconstruction is lossless
    // for everything the runtime reads.
    expect(snap.entries.map((e) => [e.assetId, e.fieldPath, e.versionId]))
      .toEqual(committed.entries.map((e) => [e.assetId, e.fieldPath, e.versionId]));
    expect(snap.entries.map((e) => e.value)).toEqual(committed.entries.map((e) => e.value));
  });

  test('publishedInventory answers "what is currently live?"', () => {
    const committed = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, 'publishedKnowledge.json'), 'utf8',
    ));
    const inv = publishedInventory(committed.entries);
    expect(inv).toHaveLength(committed.entries.length);
    const wine = inv.find((r) => r.fieldPath === 'p_wine.provenance');
    expect(wine.assetId).toBe('Retirement Party');
    expect(wine.version).toBe('retirement-party-p-wine-provenance-v2');
    expect(wine.runtimeStatus).toBe('active');
    expect(wine.source).toBe('published');
    expect(wine.confidence).toBe('medium');
  });
});
