// ─── GOVERNED CORRECTION PATH — tests (Phase 5C.2) ───────────────────────────
//
// Success criterion for this phase: NGW can discover a published defect and
// safely replace the published truth. "Safely" is the load-bearing word, so the
// tests below assert the four properties that make it safe rather than merely
// possible:
//
//   1. a superseded artifact cannot win resolution
//   2. an active artifact must carry a valid version
//   3. rollback restores the previous active version
//   4. the runtime explanation matches the ACTIVE artifact
//
// Property 3 is the one that turns this from a write path into a correction
// path. Publishing over a defect is easy; being able to undo the correction
// without restoring anything is what makes it safe to try.
import fs from 'fs';
import path from 'path';
import { buildSnapshot } from './publishedSnapshotBuild.mjs';
import { correctPublishedKCR, lineageOf, openCorrection } from './correctionWorkflow';
import { rollbackKCR, advanceKCR, publishKCR, canReachCited } from './knowledgeChange';

const EXPORT_PATH = path.resolve(__dirname, './publishedKcrs.json');
const readExport = () => JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
const AT = '2026-08-01T18:00:00.000Z';

// The corrected p_wine provenance. Mirrors the repair already made to the
// authored playbook in Phase 5C.1, so the override and the authored value tell
// the host the same story instead of contradicting each other.
export const P_WINE_V2_VALUE = Object.freeze({
  tier: 'researched',
  confidence: 'medium',
  verificationStatus: 'researched',
  sources: ['bar-provision-2026'],
  note: 'DERIVATION CORRECTED (Phase 5C.2, supersedes v1). bar-provision-2026 states ~1/2 bottle '
      + 'of wine per DRINKING guest (~1 bottle per ~2.5 drinking guests per hour; a 750ml pours ~5 '
      + 'servings). This line is expressed per GUEST, so the sourced 0.5/drinker is multiplied by an '
      + 'assumed ~80% drinking rate for an older mixed daytime crowd: 0.5 x 0.8 = 0.4 bottle/guest. '
      + 'The ~80% rate is an ASSUMPTION, not sourced, and is the one unverified step. '
      + 'WITHDRAWN FROM v1: "wine carries ~40% of the drink load" was wrong twice - the source '
      + 'assigns ~40% to BEER (beer+wine ~75%, implying wine ~35%), and v1\'s own arithmetic '
      + '(3h x 1/h x 40% / 5 glasses) yields 0.24 bottle/guest, not the 0.4 it published. '
      + 'The VALUE survives; only the reasoning was defective.',
  claim: 'Source states ~1/2 bottle of wine per drinking guest at ~1 drink/guest/hour; at an assumed '
       + '~80% drinking rate for an older daytime crowd this yields ~0.4 bottle per guest',
  sufficientWhen: 'A drinking-participation rate for older daytime retirement gatherings confirms the '
       + '~80% assumption, OR wine consumption data from >=2 comparable 3h events confirms ~0.4 '
       + 'bottle/guest when beer/seltzer is also present',
});

export const P_WINE_V2_REASON =
  'Published v1 carried a derivation that does not reproduce: it attributed the source\'s ~40% BEER '
  + 'share to wine, and its stated arithmetic yields 0.24 bottle/guest against a published 0.4. '
  + 'Found by the Phase 5C.1 trust repair audit. The quantity is unchanged; the reasoning is replaced.';

export function buildPWineV2(exportList, { asOf = AT } = {}) {
  const v1 = exportList.find((k) => k.fieldPath === 'p_wine.provenance' && k.status === 'published');
  if (!v1) throw new Error('p_wine v1 not found in export');
  return correctPublishedKCR(v1, {
    newValue: P_WINE_V2_VALUE,
    reason: P_WINE_V2_REASON,
    rationale: 'Replaces a non-reproducing derivation. Same source, same value, corrected reasoning.',
    versionId: 'retirement-party-p-wine-provenance-v2',
    id: 'kcr-kas-retirement-party-p-wine-provenance-v2',
    by: 'publisher',
    asOf,
  });
}

// ── fixtures for the invariants (independent of corpus content) ──────────────
const mk = (id, ver, rollbackTo, value, status = 'published') => ({
  id, status, assetId: 'A', fieldPath: 'f',
  proposal: { newValue: value }, publishedVersion: ver, rollbackTo,
  evidence: [], review: {}, audit: [],   // shapes rollbackKCR/stamp require
});

describe('correction path — selection invariants', () => {
  test('1 — a superseded artifact cannot win resolution, in either array order', () => {
    const v1 = mk('k1', 'v1', null, 'OLD');
    const v2 = mk('k2', 'v2', 'v1', 'NEW');

    const forward = buildSnapshot([v1, v2]);
    const reverse = buildSnapshot([v2, v1]);

    expect(forward.snapshot.entries).toHaveLength(1);
    expect(forward.snapshot.entries[0].value).toBe('NEW');
    // The regression this phase existed to close: order must not decide truth.
    expect(reverse.snapshot.entries[0].value).toBe('NEW');
    expect(forward.snapshot.snapshotVersion).toBe(reverse.snapshot.snapshotVersion);

    expect(forward.superseded).toEqual([
      { id: 'k1', versionId: 'v1', supersededBy: 'k2' },
    ]);
  });

  test('1b — a three-deep lineage resolves to the head, not the middle', () => {
    const r = buildSnapshot([mk('k2', 'v2', 'v1', 'MID'), mk('k3', 'v3', 'v2', 'HEAD'), mk('k1', 'v1', null, 'OLD')]);
    expect(r.snapshot.entries[0].value).toBe('HEAD');
    expect(r.superseded.map((s) => s.versionId).sort()).toEqual(['v1', 'v2']);
  });

  test('2 — an active artifact must carry a valid version; a versionless duplicate is a reported conflict', () => {
    // Without publishedVersion nothing can supersede it, so it cannot be
    // silently displaced — the build must SAY the field has two live heads.
    const r = buildSnapshot([mk('k1', 'v1', null, 'OLD'), mk('k9', null, null, 'RIVAL')]);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ assetId: 'A', fieldPath: 'f' });

    // And a KCR with no version at all is still publishable but can never be the
    // target of a correction — correctPublishedKCR refuses it.
    expect(() => correctPublishedKCR(mk('k9', null, null, 'X'), { newValue: 'Y', reason: 'r' }))
      .toThrow(/no publishedVersion/);
  });

  test('3 — ROLLBACK restores the previous active version, with nothing to restore', () => {
    const v1 = mk('k1', 'v1', null, 'OLD');
    const v2 = mk('k2', 'v2', 'v1', 'NEW');
    expect(buildSnapshot([v1, v2]).snapshot.entries[0].value).toBe('NEW');

    // rollbackKCR moves v2 to 'revision', so it stops being publishable. v1 is
    // untouched on disk the whole time — this is why history must be preserved.
    const rolled = rollbackKCR(v2, { by: 'publisher', asOf: AT });
    expect(rolled.status).toBe('revision');

    const after = buildSnapshot([v1, rolled]);
    expect(after.snapshot.entries[0].value).toBe('OLD');
    expect(after.superseded).toHaveLength(0);

    // Re-publishing v2 makes it current again — rollback is reversible.
    expect(buildSnapshot([v1, v2]).snapshot.entries[0].value).toBe('NEW');
  });

  test('a correction must state a reason and must supersede a published artifact', () => {
    const v1 = mk('k1', 'v1', null, 'OLD');
    expect(() => correctPublishedKCR(v1, { newValue: 'X', reason: '' })).toThrow(/must state its reason/);
    expect(() => correctPublishedKCR({ ...v1, status: 'draft' }, { newValue: 'X', reason: 'r' }))
      .toThrow(/must be published/);
  });

  test('lineageOf reports head, superseded and conflicts consistently with the builder', () => {
    const v1 = mk('k1', 'v1', null, 'OLD');
    const v2 = mk('k2', 'v2', 'v1', 'NEW');
    const l = lineageOf([v1, v2], 'A', 'f');
    expect(l.head.id).toBe('k2');
    expect(l.superseded.map((k) => k.id)).toEqual(['k1']);
    expect(l.conflicts).toEqual([]);
    expect(lineageOf([v1, mk('k9', 'v9', null, 'RIVAL')], 'A', 'f').conflicts.sort()).toEqual(['k1', 'k9']);
  });
});

describe('correction path — p_wine v2 against the real export', () => {
  const list = readExport();

  test('v2 is produced by the governed API and walks every gate', () => {
    const { kcr, version } = buildPWineV2(list);
    expect(kcr.status).toBe('published');
    expect(version.supersedes).toBe('retirement-party-p-wine-provenance-v1');
    expect(kcr.rollbackTo).toBe('retirement-party-p-wine-provenance-v1');
    // Review is not skippable for a correction.
    for (const gate of ['sme', 'editorial', 'governance']) {
      expect(kcr.review[gate].decision).toBe('approve');
    }
    expect(kcr.reason).toMatch(/does not reproduce/);
  });

  test('4 — the runtime explanation matches the ACTIVE artifact, not the superseded one', () => {
    const { kcr: v2 } = buildPWineV2(list);
    const { snapshot } = buildSnapshot([...list, v2]);
    const entry = snapshot.entries.find((e) => e.fieldPath === 'p_wine.provenance');

    expect(entry.versionId).toBe('retirement-party-p-wine-provenance-v2');
    expect(entry.value.claim).toMatch(/per drinking guest/);
    // The defect must be gone from what runtime serves.
    expect(entry.value.claim).not.toMatch(/wine carries ~40%/);
    // Value unchanged: this was a reasoning defect, not a quantity defect.
    expect(entry.value.sources).toEqual(['bar-provision-2026']);
  });

  test('v1 is PRESERVED in the export, not deleted or mutated', () => {
    const v1 = list.find((k) => k.fieldPath === 'p_wine.provenance'
      && k.publishedVersion === 'retirement-party-p-wine-provenance-v1');
    expect(v1).toBeTruthy();
    expect(v1.status).toBe('published');
    expect(v1.proposal.newValue.claim).toMatch(/wine carries ~40%/);
  });

  // ── the anti-hand-edit assertion ──────────────────────────────────────────
  // Phase 5C.2's rule was "no direct edits to published-kcrs.json". This makes
  // that rule ENFORCEABLE rather than merely stated: the on-disk v2 must be
  // byte-identical to what the governed API produces from v1. A hand-edit to the
  // export fails here.
  test('the on-disk v2 is exactly what the governed API produces (no hand-edits)', () => {
    const onDisk = list.find((k) => k.publishedVersion === 'retirement-party-p-wine-provenance-v2');
    if (!onDisk) {
      // Not yet generated — see the generator below. Not a failure.
      expect(list.find((k) => k.fieldPath === 'p_wine.provenance')).toBeTruthy();
      return;
    }
    const v1only = list.filter((k) => k.publishedVersion !== 'retirement-party-p-wine-provenance-v2');
    const { kcr: regenerated } = buildPWineV2(v1only);
    // `audit` carries per-run stamps; everything governance-bearing must match.
    const strip = (k) => { const { audit, ...rest } = k; return rest; };
    expect(strip(onDisk)).toEqual(strip(regenerated));
  });
});

// ── generator (writes the export; off by default) ────────────────────────────
// Run: WRITE_KCR_EXPORT=1 CI=true npx react-scripts test --testPathPattern=correctionWorkflow
// The export is written THROUGH the governance API, never by hand.
describe('generator', () => {
  const enabled = process.env.WRITE_KCR_EXPORT === '1';
  (enabled ? test : test.skip)('writes p_wine v2 into the export via the governed API', () => {
    const list = readExport().filter((k) => k.publishedVersion !== 'retirement-party-p-wine-provenance-v2');
    const { kcr } = buildPWineV2(list);
    fs.writeFileSync(EXPORT_PATH, `${JSON.stringify([...list, kcr], null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`\n  wrote v2 -> ${EXPORT_PATH}\n  supersedes ${kcr.rollbackTo}\n`);
    expect(readExport()).toHaveLength(list.length + 1);
  });
});

// ─── Phase 5C.7 — the UI correction path ─────────────────────────────────────
//
// openCorrection is the half a button can safely call: it stops at Review. The
// tests below prove the three-deep lineage the sprint asked for, and record the
// evidence-gate behaviour Phase 0 established.
describe('openCorrection — the reviewable half (Phase 5C.7)', () => {
  const published = (id, ver, value, rollbackTo = null, evidence = [{ id: 'e1', sourceType: 'citation', source: 'S', url: 'https://x' }]) => ({
    id, status: 'published', assetId: 'Retirement Party', fieldPath: 'p_wine.provenance',
    type: 'correction', publishedVersion: ver, rollbackTo,
    proposal: { newValue: value, newProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['e1'] } },
    evidence, review: {}, audit: [], createdAt: AT,
  });

  test('stops at review — it does NOT publish and does NOT approve', () => {
    const c = openCorrection(published('k1', 'v1', 'ONE'), { newValue: 'TWO', reason: 'arithmetic did not reproduce', asOf: AT });
    expect(c.status).toBe('review');
    expect(c.publishedVersion).toBeFalsy();
    // review must remain unrecorded — the button cannot approve on the reviewer's behalf
    // createKCR seeds each gate as null; what matters is that no DECISION exists,
    // so advanceKCR(..,'approved') would still throw.
    for (const gate of ['sme', 'editorial', 'governance']) {
      expect(c.review[gate] && c.review[gate].decision).toBeFalsy();
    }
    expect(() => advanceKCR(c, 'approved', { by: 't', asOf: AT }))
      .toThrow(/requires SME \+ editorial \+ governance/);
    expect(c.correctionOf).toBe('v1');    // the ancestor the publish step will supersede
  });

  test('carries evidence forward, so the publish gate can still be satisfied', () => {
    const prior = published('k1', 'v1', 'ONE');
    const c = openCorrection(prior, { newValue: 'TWO', reason: 'r', asOf: AT });
    expect(c.evidence).toHaveLength(1);
    expect(canReachCited(c)).toBe(true);
  });

  test('a correction still requires a stated reason and a published ancestor', () => {
    const prior = published('k1', 'v1', 'ONE');
    expect(() => openCorrection(prior, { newValue: 'X', reason: '  ' })).toThrow(/must state its reason/);
    expect(() => openCorrection({ ...prior, status: 'draft' }, { newValue: 'X', reason: 'r' })).toThrow(/must be published/);
  });

  test('CORRECTION LINEAGE v1 -> v2 -> v3: v3 active, v2 superseded, v1 historical', () => {
    const v1 = published('k1', 'v1', 'ONE');
    const v2 = published('k2', 'v2', 'TWO', 'v1');
    const v3 = published('k3', 'v3', 'THREE', 'v2');
    const r = buildSnapshot([v1, v2, v3]);
    expect(r.snapshot.entries).toHaveLength(1);
    expect(r.snapshot.entries[0].value).toBe('THREE');            // v3 active
    expect(r.superseded.map((s) => s.versionId).sort()).toEqual(['v1', 'v2']);
    expect(r.conflicts).toHaveLength(0);
    // v1 historical: still present in the corpus, just not the head
    expect(lineageOf([v1, v2, v3], 'Retirement Party', 'p_wine.provenance').head.id).toBe('k3');
  });

  test('ARRAY ORDER INDEPENDENCE across the exact orders specified', () => {
    const v1 = published('k1', 'v1', 'ONE');
    const v2 = published('k2', 'v2', 'TWO', 'v1');
    const v3 = published('k3', 'v3', 'THREE', 'v2');
    const a = buildSnapshot([v3, v1, v2]).snapshot;
    const b = buildSnapshot([v2, v3, v1]).snapshot;
    expect(a.entries[0].value).toBe('THREE');
    expect(b.entries[0].value).toBe('THREE');
    expect(a.snapshotVersion).toBe(b.snapshotVersion);
  });

  test('ROLLBACK: withdrawing v3 makes v2 active, not v1 and not authored', () => {
    const v1 = published('k1', 'v1', 'ONE');
    const v2 = published('k2', 'v2', 'TWO', 'v1');
    const v3 = published('k3', 'v3', 'THREE', 'v2');
    const rolled = rollbackKCR(v3, { by: 'publisher', asOf: AT });
    expect(rolled.status).toBe('revision');
    const r = buildSnapshot([v1, v2, { ...rolled, id: 'k3' }]);
    expect(r.snapshot.entries[0].value).toBe('TWO');              // v2, not v1
    expect(r.snapshot.entries).toHaveLength(1);                   // not authored fallback
    expect(r.superseded.map((s) => s.versionId)).toEqual(['v1']);
  });

  test('EVIDENCE GATE (documented, Phase 0): advanceKCR never checks evidence', () => {
    // The 0-Evidence Studio counter reads a DIFFERENT store (ngw-kas-evidence) from
    // kcr.evidence[]. Only publishKCR consults evidence, and only for `cited`.
    const noEv = { id: 'x', status: 'researching', assetId: 'A', fieldPath: 'f', evidence: [], review: {}, audit: [] };
    expect(() => advanceKCR(noEv, 'grounded', { by: 't', asOf: AT })).not.toThrow();

    const citedNoEv = {
      ...noEv, status: 'approved', evidence: [],
      review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
      proposal: { newValue: 1, newProvenance: { verificationStatus: 'cited', sources: ['s'] } },
    };
    expect(() => publishKCR(citedNoEv, { versionId: 'v1', by: 't', asOf: AT }))
      .toThrow(/cannot publish a cited value without supporting evidence/);
  });
});
