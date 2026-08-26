// ─── Reconciling browser-only governance (Phase 5F.6 W1) ─────────────────────
//
// Every fixture below is a RECORD THAT ACTUALLY EXISTS in the admin store as measured
// on 2026-08-01, including its defects. The point is not that the code handles
// hypotheticals — it is that it handles the eight records really sitting there.
import {
  reconciliationCandidates, reconcile, reconciliationSummary,
  priorShapeOk, evidenceSubjectMismatch, RECONCILE_ACTIONS, BLOCKERS,
} from './governanceReconciliation';

const rec = (assetId, fieldPath, newValue, extra = {}) => ({
  id: `k-${assetId}-${fieldPath}`, status: 'published', assetId, fieldPath,
  proposal: { newValue }, evidence: [{ id: 'e1' }], review: {}, audit: [],
  currentValue: undefined, ...extra,
});
const prov = (tier, sources, note = 'n') => ({
  tier, confidence: 'medium', verificationStatus: tier, sources, note,
});
const entry = (assetId, fieldPath) => ({ assetId, fieldPath, value: 1, kcrId: 'v1' });

// The real store, reconstructed. 8 published; ONE (Crab Feast p_crabs.provenance) is
// also in the corpus and the snapshot.
const STORE = [
  rec('Crab Feast', 'p_oldbay.qtyPerGuest', 0.08, { currentValue: prov('researched', ['x']) }),
  rec('Crab Feast', 'p_paper.unitCostRange', [24, 48], { currentValue: prov('researched', ['x']) }),
  rec('Crab Feast', 'p_crabs.provenance', prov('researched', ['webstaurant-protein-2026'])),
  // Real: prior AND evidence both inherited from the p_crabs row it was opened from.
  rec('Crab Feast', 'p_ice.provenance', prov('researched', ['reddy-ice-2026']), {
    currentValue: prov('researched', ['webstaurant-protein-2026']),
    evidence: [{ id: 'webstaurant-protein-2026' }],
  }),
  rec('Fish Fry', 'p_ice.qtyPerGuest', 2, { currentValue: 1.5, evidence: [] }),
  rec('Fish Fry', 'p_ice.provenance', prov('researched', ['reddy-ice-2026']), { currentValue: null, evidence: [] }),
  rec('Low Country Boil', 'p_ice.qtyPerGuest', 2, { currentValue: 1.5, evidence: [] }),
  rec('Dinner Party', 'p_ice.provenance', prov('researched', ['bar-provision-2026']), { currentValue: null, evidence: [] }),
];
const SNAPSHOT = [entry('Crab Feast', 'p_crabs.provenance')];
const CORPUS = [{ assetId: 'Crab Feast', fieldPath: 'p_crabs.provenance' }];

describe('detection — browser-only records cannot hide', () => {
  test('THE COUNT IS SEVEN, not six', () => {
    // An earlier report said six. Eight published minus the one already serving is
    // seven, and the divergence banner independently said "7 awaiting bake". Pinned
    // because a miscount here understates the reconciliation backlog.
    const c = reconciliationCandidates(STORE, SNAPSHOT, CORPUS);
    expect(c.length).toBe(7);
  });

  test('a record the snapshot already serves is NOT a candidate', () => {
    const keys = reconciliationCandidates(STORE, SNAPSHOT, CORPUS).map((x) => x.fieldPath);
    expect(keys).not.toContain('p_crabs.provenance');
  });

  test('an empty store yields nothing, and says so plainly', () => {
    expect(reconciliationCandidates([], [], [])).toEqual([]);
    expect(reconciliationSummary([])).toMatch(/Store and runtime agree/);
  });

  test('only PUBLISHED records are candidates — in-flight work is not orphaned', () => {
    const inflight = [{ ...rec('A', 'p_x.provenance', prov('researched', ['reddy-ice-2026'])), status: 'review' }];
    expect(reconciliationCandidates(inflight, [], [])).toEqual([]);
  });

  test('every dossier carries the fields an operator needs to decide', () => {
    for (const d of reconciliationCandidates(STORE, SNAPSHOT, CORPUS)) {
      for (const k of ['assetId', 'fieldPath', 'value', 'priorValue', 'lineage',
        'hostImpact', 'evidenceCount', 'blockers', 'recommended', 'why']) {
        expect(d).toHaveProperty(k);
      }
      expect(d.blockers.every((b) => BLOCKERS.includes(b))).toBe(true);
    }
  });
});

describe('the corrupt-prior defect, as actually found', () => {
  test('a provenance OBJECT recorded as the prior of a quantity field is caught', () => {
    // Measured: Crab Feast p_oldbay.qtyPerGuest recorded a provenance object as its
    // "before" — a 5E-era cross-field artifact. The value 0.08 may be perfectly right;
    // the audit trail describes a change that did not happen.
    const d = reconciliationCandidates(STORE, SNAPSHOT, CORPUS)
      .find((x) => x.fieldPath === 'p_oldbay.qtyPerGuest');
    expect(d.blockers).toContain('corrupt-prior');
    expect(d.recommended).toBe('archive');
    expect(d.why).toMatch(/AUDIT TRAIL/);
  });

  test('the same defect on a cost field is caught', () => {
    const d = reconciliationCandidates(STORE, SNAPSHOT, CORPUS)
      .find((x) => x.fieldPath === 'p_paper.unitCostRange');
    expect(d.blockers).toContain('corrupt-prior');
  });

  test('priorShapeOk accepts every LEGITIMATE prior shape', () => {
    expect(priorShapeOk('p_ice.provenance', { tier: 'norm' })).toBe(true);
    expect(priorShapeOk('p_ice.qtyPerGuest', 1.5)).toBe(true);
    expect(priorShapeOk('p_paper.unitCostRange', [1, 2])).toBe(true);
    // "there was nothing before" is the normal case for a first governance.
    expect(priorShapeOk('p_ice.provenance', null)).toBe(true);
    expect(priorShapeOk('p_ice.qtyPerGuest', undefined)).toBe(true);
    // and it makes no claim about fields it does not know
    expect(priorShapeOk('p_x.somethingElse', 'anything')).toBe(true);
  });

  test('priorShapeOk rejects each cross-field mismatch', () => {
    expect(priorShapeOk('p_ice.qtyPerGuest', { tier: 'researched' })).toBe(false);
    expect(priorShapeOk('p_paper.unitCostRange', { tier: 'researched' })).toBe(false);
    expect(priorShapeOk('p_ice.provenance', 1.5)).toBe(false);
  });
});

describe('mismatched evidence — the one 5F.6 missed (Phase 5F.7)', () => {
  test('a PROTEIN source as the only evidence for an ICE claim is caught', () => {
    // Real: Crab Feast p_ice.provenance carries `webstaurant-protein-2026` as its sole
    // evidence, inherited from the p_crabs row it was opened from. The shape check
    // passed it because a provenance-object prior is valid for a provenance field —
    // the CONTENT was wrong, not the shape.
    expect(evidenceSubjectMismatch('p_ice.provenance', [{ id: 'webstaurant-protein-2026' }]))
      .toEqual(['webstaurant-protein-2026']);
  });

  test('the RIGHT source on the right subject is not flagged', () => {
    expect(evidenceSubjectMismatch('p_ice.provenance', [{ id: 'reddy-ice-2026' }])).toEqual([]);
    expect(evidenceSubjectMismatch('p_ribs.provenance', [{ id: 'webstaurant-protein-2026' }])).toEqual([]);
  });

  test('a source covering TWO subjects is not a mismatch on either (5F.10)', () => {
    // FALSE POSITIVE, found by publishing a correct record. `bar-provision-2026` is a
    // drinks guide whose claim also states "ice ~1.5 lb/guest", so it genuinely grounds
    // an indoor ice line — and the single-source-per-subject assumption reported that
    // record as mismatched. A check that cries wolf on good work is worse than none.
    expect(evidenceSubjectMismatch('p_ice.provenance', [{ id: 'bar-provision-2026' }])).toEqual([]);
    expect(evidenceSubjectMismatch('p_wine.provenance', [{ id: 'bar-provision-2026' }])).toEqual([]);
    // and it still catches a genuinely wrong subject
    expect(evidenceSubjectMismatch('p_ice.provenance', [{ id: 'webstaurant-protein-2026' }]))
      .toEqual(['webstaurant-protein-2026']);
  });

  test('it makes NO claim about unmapped purchases or unmapped sources', () => {
    // Silence where nothing is declared, rather than a guess.
    expect(evidenceSubjectMismatch('p_favors.provenance', [{ id: 'reddy-ice-2026' }])).toEqual([]);
    expect(evidenceSubjectMismatch('p_ice.provenance', [{ id: 'some-unregistered-source' }])).toEqual([]);
    expect(evidenceSubjectMismatch('p_ice.provenance', [])).toEqual([]);
    expect(evidenceSubjectMismatch('', null)).toEqual([]);
  });

  test('a mismatch blocks promotion and says the evidence was inherited', () => {
    const bad = [rec('Crab Feast', 'p_ice.provenance', prov('researched', ['reddy-ice-2026']), {
      currentValue: prov('researched', ['webstaurant-protein-2026']),
      evidence: [{ id: 'webstaurant-protein-2026' }],
    })];
    const d = reconciliationCandidates(bad, [], [])[0];
    expect(d.blockers).toContain('mismatched-evidence');
    expect(d.wrongEvidence).toEqual(['webstaurant-protein-2026']);
    expect(d.recommended).toBe('archive');
    expect(d.why).toMatch(/inherited from the row/);
  });
});

describe('recommendations are derived from checkable facts only', () => {
  test('a record that would FAIL today\'s publish gate is recommended reject', () => {
    // The 5F.4 class: approved source, non-researched tier. It could not be published
    // today, so it must not be promoted today either.
    const bad = [rec('X', 'p_ice.provenance', prov('trade-heuristic', ['reddy-ice-2026']))];
    const d = reconciliationCandidates(bad, [], [])[0];
    expect(d.blockers).toContain('fails-publish-gate');
    expect(d.recommended).toBe('reject');
  });

  test('a CLEAN record is NOT auto-promoted — it needs a human', () => {
    // The most important assertion in this file. Nothing here may conclude that a
    // source's scope reaches an event; that is the judgement the program protects.
    const clean = [rec('Reunion', 'p_ice.provenance', prov('researched', ['reddy-ice-2026']), {
      currentValue: null, evidence: [{ id: 'reddy-ice-2026' }],
    })];
    const d = reconciliationCandidates(clean, [], [])[0];
    expect(d.blockers).toEqual([]);
    expect(d.recommended).toBe('requires-human-decision');
    expect(d.why).toMatch(/judgement a machine must not make/);
  });

  test('NONE of the seven real records is fully clean', () => {
    // Measured. Three carry inherited residue from the p_crabs row; the other four
    // were published with no evidence at all. Worth pinning: "reconcile the seven" is
    // not seven yes/no calls on equally-good records.
    for (const d of reconciliationCandidates(STORE, SNAPSHOT, CORPUS)) {
      expect(d.blockers.length).toBeGreaterThan(0);
    }
  });

  test('"promote" is never returned automatically for ANY input', () => {
    const every = reconciliationCandidates(STORE, SNAPSHOT, CORPUS);
    expect(every.some((d) => d.recommended === 'promote')).toBe(false);
  });

  test('a record already governed in the CORPUS cannot be promoted into a second root', () => {
    const dupe = [rec('Crab Feast', 'p_crabs.provenance', prov('researched', ['webstaurant-protein-2026']))];
    const d = reconciliationCandidates(dupe, [], CORPUS)[0];
    expect(d.blockers).toContain('already-in-corpus');
    expect(d.recommended).toBe('archive');
    expect(d.why).toMatch(/second root lineage/);
  });

  test('missing evidence BLOCKS promotion — proven by attempting it (5F.7)', () => {
    // 5F.6 called this informational. Promoting the cleanest evidence-less record into
    // the corpus broke `publishedExport.test.js`: `canReachCited` needs at least one
    // evidence entry with a source and citation type, and every committed entry must be
    // able to round-trip into a future correction. The promotion was reverted.
    const d = reconciliationCandidates(STORE, SNAPSHOT, CORPUS)
      .find((x) => x.assetId === 'Fish Fry' && x.fieldPath === 'p_ice.provenance');
    expect(d.blockers).toContain('no-evidence');
    expect(d.recommended).toBe('archive');
    expect(d.why).toMatch(/round-trip into a future correction/);
    expect(d.why).toMatch(/Redo it through the composer/);
  });

  test('EVERY committed corpus record carries citable evidence — the invariant', () => {
    // Why the rule above exists, asserted against the real corpus rather than described.
    // eslint-disable-next-line global-require
    const corpus = require('./publishedKcrs.json');
    expect(corpus.length).toBeGreaterThan(0);
    for (const k of corpus) {
      expect(Array.isArray(k.evidence)).toBe(true);
      expect(k.evidence.some((e) => e && (e.source || e.url)
        && ['citation', 'primary', 'secondary', 'dataset'].includes(e.sourceType))).toBe(true);
    }
  });

  test('host impact is stated for each candidate, and distinguishes caption from money', () => {
    const c = reconciliationCandidates(STORE, SNAPSHOT, CORPUS);
    const provRow = c.find((x) => x.fieldPath === 'p_ice.provenance' && x.assetId === 'Fish Fry');
    const qtyRow = c.find((x) => x.fieldPath === 'p_ice.qtyPerGuest' && x.assetId === 'Fish Fry');
    expect(provRow.hostImpact).toMatch(/Sourced/);
    expect(provRow.hostImpact).toMatch(/no number moves/);
    expect(qtyRow.hostImpact).toMatch(/quantity or cost/);
  });
});

describe('no deletion without an audit reason', () => {
  const dossier = () => reconciliationCandidates(STORE, SNAPSHOT, CORPUS)[0];

  test('a decision REQUIRES a reason — including a rejection', () => {
    expect(() => reconcile(dossier(), 'reject', '')).toThrow(/state its reason/);
    expect(() => reconcile(dossier(), 'reject', '   ')).toThrow(/state its reason/);
    expect(() => reconcile(dossier(), 'archive')).toThrow(/state its reason/);
  });

  test('an unknown action is refused', () => {
    expect(() => reconcile(dossier(), 'delete', 'because')).toThrow(/action must be one of/);
    expect(() => reconcile(dossier(), 'promote-quietly', 'because')).toThrow();
  });

  test('a decision records WHAT the machine advised and whether the human overrode it', () => {
    const d = dossier();
    const out = reconcile(d, 'promote', 'Reddy Ice outdoor case reviewed; scope confirmed.', 'todd');
    expect(out.reason).toMatch(/scope confirmed/);
    expect(out.by).toBe('todd');
    expect(out.recommended).toBe(d.recommended);
    expect(out.overrodeRecommendation).toBe(true);   // nothing is ever recommended 'promote'
    expect(out.blockers).toEqual(d.blockers);
  });

  test('a decision record is frozen — it cannot be edited after the fact', () => {
    const out = reconcile(dossier(), 'archive', 'kept for history');
    expect(Object.isFrozen(out)).toBe(true);
  });

  test('every declared action is actually accepted', () => {
    for (const a of RECONCILE_ACTIONS) {
      expect(() => reconcile(dossier(), a, 'stated reason')).not.toThrow();
    }
  });
});

describe('it reports and disclaims', () => {
  test('the summary names the counts and refuses credit for acting', () => {
    const s = reconciliationSummary(reconciliationCandidates(STORE, SNAPSHOT, CORPUS));
    expect(s).toMatch(/7 browser-only published record/);
    expect(s).toMatch(/Nothing is promoted or discarded automatically/);
  });

  test('the hardest decisions sort first', () => {
    const c = reconciliationCandidates(STORE, SNAPSHOT, CORPUS);
    for (let i = 1; i < c.length; i += 1) {
      expect(c[i - 1].blockers.length).toBeGreaterThanOrEqual(c[i].blockers.length);
    }
  });
});
