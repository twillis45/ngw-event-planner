// ─── PHASE 5A-2 — the first governed artifact reaching runtime ───────────────
//
// One field, end to end: a KCR published through the real governance chain is
// baked into publishedKnowledge.json and read by the playbook engine as the
// provenance of a purchase. Scope is ONE field on ONE purchase; nothing about
// value, quantity, cost, decisions, ranking or reasoning changes.
//
// The authored p_crabs provenance cites four DMV retailers as FREE PROSE, so no
// id resolves in QTY_SOURCES and isGroundedItemQty() reads it as ungrounded
// despite being genuinely well sourced. The published KCR supplies the same claim
// with a resolvable source id, which is what makes the slice observable.
import fs from 'fs';
import path from 'path';
import { getPlaybook, purchaseProvenance } from '../playbooks/index';
import { isGroundedItemQty } from './quantityProvenance';
import { effectiveValue } from './knowledgeOverride';
import { publishedEntry, __setSnapshotForTests, __resetSnapshotForTests } from './publishedSnapshot';
import { buildSnapshot } from './publishedSnapshotBuild.mjs';
import snapshot from './publishedKnowledge.json';

const FIELD = 'p_crabs.provenance';
const pb = () => getPlaybook('Crab Feast');
const crabs = () => (pb().purchases || []).find((p) => p.id === 'p_crabs');

describe('the baked artifact', () => {
  // 5A-3: a SECOND artifact joined the snapshot (Retirement Party / p_wine).
  // entryCount is asserted as a count of governed entries, and EVERY entry must be
  // traceable — an untraceable one is not eligible however well-formed it looks.
  test('every entry is traceable to its KCR', () => {
    expect(snapshot.entryCount).toBe(snapshot.entries.length);
    expect(snapshot.entryCount).toBeGreaterThanOrEqual(2);
    for (const e of snapshot.entries) {
      expect(e.assetId).toBeTruthy();
      expect(e.fieldPath).toBeTruthy();
      expect(e.kcrId).toBeTruthy();
      expect(e.versionId).toBeTruthy();
    }
    const crab = snapshot.entries.find((e) => e.assetId === 'Crab Feast' && e.fieldPath === FIELD);
    expect(crab).toBeTruthy();
  });

  test('the exported KCR is genuinely PUBLISHED, not hand-written', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, './publishedKcrs.json'), 'utf8'));
    expect(raw.length).toBeGreaterThanOrEqual(1);
    const k = raw.find((x) => x.fieldPath === FIELD);
    expect(k.status).toBe('published');
    expect(k.review.sme.decision).toBe('approve');
    expect(k.review.editorial.decision).toBe('approve');
    expect(k.review.governance.decision).toBe('approve');
    expect(k.evidence.length).toBeGreaterThan(0);
    // 5A-1.5 derivation is visible on the published record
    expect(k.proposal.newProvenance.tier).toBe('researched');
    expect(k.proposal.newProvenance.confidence).toBe('medium');
  });
});

describe('the runtime reader', () => {
  test('published provenance overrides the authored block', () => {
    const eff = effectiveValue(pb(), FIELD, null);
    expect(eff.source).toBe('published');
    expect(eff.value.tier).toBe('researched');
    expect(eff.value.sources).toEqual(['webstaurant-protein-2026']);
  });

  test('the engine reads it — purchaseProvenance returns the governed value', () => {
    const got = purchaseProvenance(pb(), crabs());
    expect(got.sources).toEqual(['webstaurant-protein-2026']);
    expect(got).not.toEqual(crabs().provenance);      // it is NOT the authored block
  });

  test('GROUNDING: the governed value passes where the authored prose does not', () => {
    expect(isGroundedItemQty(crabs().provenance)).toBe(false);          // prose sources
    expect(isGroundedItemQty(purchaseProvenance(pb(), crabs()))).toBe(true);
  });

  test('an override outranks the published value', () => {
    const ovr = [{ id: 'o1', assetId: 'Crab Feast', fieldPath: FIELD, value: { tier: 'primary', sources: ['x'] } }];
    const eff = effectiveValue(pb(), FIELD, ovr);
    expect(eff.source).toBe('override');
    expect(eff.value.tier).toBe('primary');
  });

  test('ROLLBACK: with the entry withdrawn, the authored value returns', () => {
    // Simulates removing the published entry — the resolver falls through.
    const other = (pb().purchases || []).find((p) => p.id === 'p_softdrinks');
    const eff = effectiveValue(pb(), 'p_softdrinks.provenance', null);
    expect(eff.source).toBe('authored');
    expect(eff.value).toEqual(other.provenance);
  });

  test('every OTHER purchase is untouched — authored fallback preserved', () => {
    // GOVERNED fields are excluded because governance is supposed to override the
    // authored value — that is the whole point. `p_ice` joined `p_crabs` in Wave 0
    // (5F.11), grounded to reddy-ice-2026 with the authored 2 lb/guest unchanged.
    // The assertion that matters is that everything NOT governed still falls through
    // to what the playbook authored.
    const GOVERNED = new Set(['p_crabs', 'p_ice']);
    for (const p of pb().purchases) {
      if (GOVERNED.has(p.id)) continue;
      expect(purchaseProvenance(pb(), p)).toEqual(p.provenance);
    }
  });

  test('the governed fields ARE overridden, and by the expected source', () => {
    // The other half of the same property — without this, adding an id to the skip
    // list above could silently hide a governance failure.
    const ice = (pb().purchases || []).find((p) => p.id === 'p_ice');
    const prov = purchaseProvenance(pb(), ice);
    expect(prov).not.toEqual(ice.provenance);
    expect(prov.sources).toEqual(['reddy-ice-2026']);
    expect(prov.tier).toBe('researched');
  });

  test('a junk playbook or purchase never throws', () => {
    for (const bad of [null, undefined, {}, { id: null }]) {
      expect(() => purchaseProvenance(pb(), bad)).not.toThrow();
      expect(() => purchaseProvenance(bad, crabs())).not.toThrow();
    }
  });
});

describe('governance cannot be bypassed by the transport', () => {
  test('an APPROVED-but-unpublished KCR is refused by the builder', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, './publishedKcrs.json'), 'utf8'));
    const notYet = { ...raw[0], status: 'approved' };
    const { snapshot: s, accepted, rejected } = buildSnapshot([notYet], { at: '2026-08-01T12:00:00.000Z' });
    expect(accepted).toBe(0);
    expect(s.entryCount).toBe(0);
    expect(rejected[0].reason).toMatch(/not 'published'/i);
  });

  // Defence in depth: the builder gates on governance, and the LOADER re-validates
  // every entry it reads, because the artifact is a build output that could be
  // hand-edited or arrive stale from another branch.
  test('a malformed entry (no kcrId) is dropped by the LOADER, not trusted', () => {
    __setSnapshotForTests({
      schemaVersion: snapshot.schemaVersion, snapshotVersion: 'test', generatedAt: snapshot.generatedAt,
      entries: [
        { assetId: 'Crab Feast', fieldPath: FIELD, value: { tier: 'forged' } },   // no kcrId
        { assetId: 'Crab Feast', fieldPath: 'p_ice.provenance', value: { tier: 'ok' }, kcrId: 'k-1' },
      ],
    });
    try {
      expect(publishedEntry('Crab Feast', FIELD)).toBeNull();          // untraceable -> refused
      expect(publishedEntry('Crab Feast', 'p_ice.provenance')).toBeTruthy();
      // and the engine falls back to the authored block for the refused field
      expect(purchaseProvenance(pb(), crabs())).toEqual(crabs().provenance);
    } finally {
      __resetSnapshotForTests();
    }
  });

  test('after reset, the real artifact is back in force', () => {
    expect(effectiveValue(pb(), FIELD, null).source).toBe('published');
  });
});

// ─── PHASE 5A-3 — SECOND governed artifact: portability ─────────────────────
// Different playbook (Retirement Party, not Crab Feast), different category
// (beverage, not food), different source (bar-provision-2026). It also proves the
// pipeline can CORRECT a data-quality defect without editing playbook data: the
// authored p_wine provenance records confidence 'med', which is outside the frozen
// high|medium|low vocabulary and therefore unaggregatable. The governed value
// serves 'medium' while the authored file stays exactly as written.
describe('second governed artifact — Retirement Party / p_wine.provenance', () => {
  const FIELD2 = 'p_wine.provenance';
  const pb2 = () => getPlaybook('Retirement Party');
  const wine = () => (pb2().purchases || []).find((p) => p.id === 'p_wine');

  test('1 — the artifact is published and traceable', () => {
    const e = snapshot.entries.find((x) => x.assetId === 'Retirement Party' && x.fieldPath === FIELD2);
    expect(e).toBeTruthy();
    // UPDATED 2026-08-01 (Phase 5C.2). This pinned the v1 KCR id. Phase 5C.1
    // found v1's derivation does not reproduce (it attributed the source's ~40%
    // BEER share to wine; its own arithmetic yields 0.24, not the 0.4 it
    // published), and 5C.2 superseded it through the governed correction path.
    // The head of the lineage is now v2 — so this asserts the CORRECTION won,
    // which is a stronger statement than the original pin, not a weaker one.
    expect(e.kcrId).toBe('kcr-kas-retirement-party-p-wine-provenance-v2');
    expect(e.versionId).toBe('retirement-party-p-wine-provenance-v2');
    expect(e.value.confidence).toBe('medium');
    // The defect must not be what runtime serves.
    expect(e.value.claim).not.toMatch(/wine carries ~40%/);
    expect(e.value.claim).toMatch(/per drinking guest/);
  });

  test('2 — the authored value is UNTOUCHED on disk', () => {
    // still the original, including the non-canonical spelling
    expect(wine().provenance.confidence).toBe('med');
    expect(wine().provenance.sources).toEqual(['bar-provision-2026']);
  });

  test('3 — the governed value overrides authored, correcting the vocabulary', () => {
    const eff = effectiveValue(pb2(), FIELD2, null);
    expect(eff.source).toBe('published');
    expect(eff.value.confidence).toBe('medium');          // corrected
    expect(purchaseProvenance(pb2(), wine()).confidence).toBe('medium');
  });

  test('3b — grounding still holds after the override', () => {
    expect(isGroundedItemQty(wine().provenance)).toBe(true);                    // was already grounded
    expect(isGroundedItemQty(purchaseProvenance(pb2(), wine()))).toBe(true);    // and stays grounded
  });

  test('4 — ROLLBACK: with no published entry the authored value returns', () => {
    __setSnapshotForTests({ schemaVersion: snapshot.schemaVersion, snapshotVersion: 'rollback', generatedAt: null, entries: [] });
    try {
      const eff = effectiveValue(pb2(), FIELD2, null);
      expect(eff.source).toBe('authored');
      expect(eff.value.confidence).toBe('med');            // the authored spelling is back
      expect(purchaseProvenance(pb2(), wine())).toEqual(wine().provenance);
    } finally {
      __resetSnapshotForTests();
    }
  });

  test('5 — the FIRST artifact still resolves (no interference)', () => {
    const eff = effectiveValue(getPlaybook('Crab Feast'), 'p_crabs.provenance', null);
    expect(eff.source).toBe('published');
    expect(eff.value.sources).toEqual(['webstaurant-protein-2026']);
  });

  test('every other Retirement Party purchase is untouched', () => {
    for (const p of pb2().purchases) {
      if (p.id === 'p_wine') continue;
      expect(purchaseProvenance(pb2(), p)).toEqual(p.provenance);
    }
  });
});
