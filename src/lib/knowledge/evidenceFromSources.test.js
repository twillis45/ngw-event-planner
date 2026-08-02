// ─── EVIDENCE FROM CHOSEN SOURCES (Phase 5F.8) ───────────────────────────────
//
// THE ROOT CAUSE THIS CLOSES. `openAuthoredGovernance` accepts an `evidence` option;
// the admin console never passed one. Every record the Acquisition workflow produced
// therefore had `evidence: []`, which means:
//
//   canReachCited(kcr) === false
//     -> publishedExport.test.js's round-trip assertion fails
//     -> the record cannot enter the committed corpus
//     -> and had it entered, that field could never be corrected again
//
// Found in 5F.7 by promoting the cleanest of four such records and watching the suite
// refuse it. Four records in the admin store are affected.
import {
  evidenceFromSources, validateSourcesFor, wouldGround,
} from './sourceAuthority';
import { canReachCited } from './knowledgeChange';
import { openAuthoredGovernance } from './correctionWorkflow';
import { resolveGroundingSource } from './groundingSources';

describe('it records the choice a human already made', () => {
  test('a resolvable source becomes a citable evidence entry', () => {
    const [e] = evidenceFromSources(['reddy-ice-2026']);
    const src = resolveGroundingSource('reddy-ice-2026');
    expect(e.id).toBe('reddy-ice-2026');
    expect(e.sourceType).toBe('citation');
    expect(e.contradicts).toBe(false);
    // VERBATIM from the registry — not restated, not summarised.
    expect(e.source).toBe(src.org);
    expect(e.url).toBe(src.url);
    expect(e.capturedAt).toBe(src.fetched);
  });

  test('whether the source SUPPORTS the value is left null — that is a human judgement', () => {
    const [e] = evidenceFromSources(['bar-provision-2026']);
    expect(e.supports).toBeNull();
  });

  test('confidence is passed through, never invented', () => {
    expect(evidenceFromSources(['reddy-ice-2026'], { confidence: 'high' })[0].confidence).toBe('high');
    expect(evidenceFromSources(['reddy-ice-2026'])[0].confidence).toBe('medium');
  });

  test('one entry per source, in the order given', () => {
    const out = evidenceFromSources(['bar-provision-2026', 'reddy-ice-2026']);
    expect(out.map((e) => e.id)).toEqual(['bar-provision-2026', 'reddy-ice-2026']);
  });
});

describe('it cannot conjure evidence', () => {
  test('an UNRESOLVABLE id produces nothing — not a stub', () => {
    // A stub with no organisation and no URL fails canReachCited anyway; emitting one
    // would look like evidence while being none.
    expect(evidenceFromSources(['not-a-real-source-2026'])).toEqual([]);
    expect(evidenceFromSources(['https://example.com/some-page'])).toEqual([]);
  });

  test('empty, null and junk input yield an empty list', () => {
    expect(evidenceFromSources([])).toEqual([]);
    expect(evidenceFromSources(null)).toEqual([]);
    expect(evidenceFromSources(undefined)).toEqual([]);
    expect(evidenceFromSources([null, '', false])).toEqual([]);
  });

  test('a mixed list keeps only what resolves', () => {
    const out = evidenceFromSources(['reddy-ice-2026', 'invented-source', 'bar-provision-2026']);
    expect(out.map((e) => e.id)).toEqual(['reddy-ice-2026', 'bar-provision-2026']);
  });
});

describe('THE POINT — the record is now promotable', () => {
  const provenance = {
    tier: 'researched',
    confidence: 'medium',
    verificationStatus: 'researched',
    sources: ['reddy-ice-2026'],
    note: 'Reddy Ice states 1-2 lb of ice per person; its outdoor example computes to 2.1.',
  };

  test('BEFORE — a first governance with no evidence fails canReachCited', () => {
    // Exactly the four records sitting in the admin store.
    const k = openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.provenance', authoredValue: null },
      { newValue: provenance, reason: 'grounding only' },
    );
    expect(k.evidence).toEqual([]);
    expect(canReachCited(k)).toBe(false);
  });

  test('AFTER — the same record with derived evidence passes', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Fish Fry', fieldPath: 'p_ice.provenance', authoredValue: null },
      {
        newValue: provenance,
        reason: 'grounding only',
        evidence: evidenceFromSources(provenance.sources, { confidence: provenance.confidence }),
      },
    );
    expect(k.evidence.length).toBe(1);
    expect(canReachCited(k)).toBe(true);
  });

  test('and it still has to pass every other gate — evidence is not a bypass', () => {
    // A wrong-axis source produces evidence AND still fails source authority, so this
    // cannot be used to smuggle an unapproved citation past the publish gate.
    const wrongAxis = { ...provenance, sources: ['usda-meat-2026'] };
    const ev = evidenceFromSources(wrongAxis.sources);
    expect(ev.length).toBe(1);                                   // it resolves...
    expect(validateSourcesFor('p_ice.provenance', wrongAxis.sources).ok).toBe(false);
    expect(wouldGround('p_ice.provenance', wrongAxis)).toBe(false);
  });

  test('a non-researched tier still refuses to ground, evidence or not', () => {
    const lowTier = { ...provenance, tier: 'trade-heuristic' };
    expect(evidenceFromSources(lowTier.sources).length).toBe(1);
    expect(wouldGround('p_ice.provenance', lowTier)).toBe(false);
  });
});

describe('the corpus invariant it exists to satisfy', () => {
  test('every committed record can reach cited — and new ones now can too', () => {
    // eslint-disable-next-line global-require
    const corpus = require('./publishedKcrs.json');
    for (const k of corpus) expect(canReachCited(k)).toBe(true);
  });
});
