// ─── ARCHIVED RECORDS TRAVEL, BUT NEVER SERVE (Phase 5F.7) ───────────────────
//
// FOUND BY READING THE CONSOLE, not by a test. Two records archived in 5F.4 for
// grounding dishonesty — `The Cookout p_ice.provenance` (tier `trade-heuristic`,
// sources `[reddy-ice-2026]`) and `Quinceanera p_ice.provenance` (tier `norm`,
// sources `[bar-provision-2026]`) — were still listed in the admin console under a
// heading that read "PUBLISHED FIELDS".
//
// TWO SEPARATE QUESTIONS, and they have different answers:
//
//   Can an archived record reach a HOST?      NO. `isPublishable` requires
//                                             status === 'published'. The bake refuses
//                                             it and reports the refusal.
//   Could an OPERATOR believe it was live?    YES, and they did — the export carries it
//                                             (deliberately, so rollback history is not
//                                             deleted) and the console labelled the
//                                             whole export "published".
//
// So the data flow was correct and the console was lying. The heading is fixed; this
// pins the boundary so neither half can drift.
//
// My 5F.5 report answered "Can archived records return? No" — correct about runtime,
// and it did not distinguish the two questions. This file is that distinction.
import { publishedKcrsForExport } from './publishedExport';
import { buildSnapshot, rejectionReason } from './publishedSnapshotBuild.mjs';

const kcr = (assetId, fieldPath, status, value, version) => ({
  id: `${assetId}-${fieldPath}-${status}`,
  status,
  assetId,
  fieldPath,
  publishedVersion: version,
  proposal: { newValue: value },
  evidence: [],
  review: {},
  audit: [],
});

// The two real records, with the tiers that got them archived.
const COOKOUT = kcr('The Cookout', 'p_ice.provenance', 'archived',
  { tier: 'trade-heuristic', sources: ['reddy-ice-2026'], note: 'n' }, 'the-cookout-v9');
const QUINCE = kcr('Quinceanera', 'p_ice.provenance', 'archived',
  { tier: 'norm', sources: ['bar-provision-2026'], note: 'n' }, 'quince-v9');
const LIVE = kcr('Fish Fry', 'p_ice.provenance', 'published',
  { tier: 'researched', sources: ['reddy-ice-2026'], note: 'n' }, 'fish-fry-v1');

describe('the EXPORT carries history — including archived records', () => {
  test('an archived record with a publishedVersion stays in the export', () => {
    // Deliberate: filtering the export to status==='published' once deleted rollback
    // history and made a rollback irreversible. History travels.
    const out = publishedKcrsForExport([COOKOUT, QUINCE, LIVE]);
    expect(out.map((k) => k.assetId).sort()).toEqual(['Fish Fry', 'Quinceanera', 'The Cookout']);
  });

  test('a record that was NEVER published is not carried', () => {
    const draft = kcr('A', 'p_x.provenance', 'draft', { tier: 'norm' }, null);
    expect(publishedKcrsForExport([draft])).toEqual([]);
  });
});

describe('the BAKE refuses them — no host can ever see an archived record', () => {
  test('archived records are rejected, with the reason stated', () => {
    const { snapshot, accepted, rejected } = buildSnapshot([COOKOUT, QUINCE, LIVE]);
    expect(accepted).toBe(1);
    expect(rejected.length).toBe(2);
    for (const r of rejected) expect(r.reason).toMatch(/status is 'archived', not 'published'/);
    // and nothing archived reached the served entries
    const served = (snapshot.entries || []).map((e) => e.assetId);
    expect(served).toEqual(['Fish Fry']);
  });

  test('the refusal is never silent', () => {
    expect(rejectionReason(COOKOUT)).toMatch(/archived/);
    expect(rejectionReason(QUINCE)).toMatch(/archived/);
  });

  test('THE POINT: an archived record cannot ground, and cannot serve', () => {
    // Both carry approved sources on a non-researched tier — the exact 5F.4 defect.
    // Even if a future change let one through the export unnoticed, the bake refuses
    // it and `corpusIntegrity.test.js` guards what does land.
    const { snapshot } = buildSnapshot([COOKOUT, QUINCE]);
    expect(snapshot.entries || []).toEqual([]);
  });
});
