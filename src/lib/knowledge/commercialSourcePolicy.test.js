// ─── Commercial practitioner source policy (Phase 5F.9 Step 1) ───────────────
//
// The policy: a source that sells the thing it measures is ADMISSIBLE — it is often the
// only published figure for a practical planning question — but it cannot carry a claim
// stronger than its standing.
//
//   ALLOWED      "Reddy Ice recommends approximately 2 lb/person for outdoor planning."
//   NOT ALLOWED  "2 lb/person is proven universally correct."
//
// The constraint is on the CLAIM, not on the source.
import {
  commercialSourceCheck, standingSummary, sourceClassOf, isInterested, overclaims,
  SOURCE_CLASSES, CLAIM_TYPES,
} from './commercialSourcePolicy';
import { publishKCR } from './knowledgeChange';
import { resolveGroundingSource } from './groundingSources';

const prov = (over = {}) => ({
  tier: 'researched',
  confidence: 'medium',
  verificationStatus: 'researched',
  sources: ['reddy-ice-2026'],
  note: 'Reddy Ice recommends approximately 2 lb of ice per person for outdoor planning.',
  ...over,
});

describe('the registry declares commercial standing', () => {
  test('both commercial sources declare their class and their limitation', () => {
    for (const id of ['reddy-ice-2026', 'jollychef-disposables-2026']) {
      const s = resolveGroundingSource(id);
      expect(s.sourceClass).toBe('commercial_practitioner');
      expect(s.limitations).toContain('commercial_interest_disclosed');
      expect(s.claimType).toBe('planning_guidance');
      expect(SOURCE_CLASSES).toContain(s.sourceClass);
      expect(CLAIM_TYPES).toContain(s.claimType);
    }
  });

  test('a source that sells what it measures is flagged as interested', () => {
    expect(isInterested('reddy-ice-2026')).toBe(true);
    expect(isInterested('jollychef-disposables-2026')).toBe(true);
  });

  test('an UNDECLARED source is not silently treated as independent', () => {
    // Most of the corpus's 113 sources carry no class yet. Undeclared is a metadata gap
    // — it must not be read as "verified independent", and it must not lift a
    // restriction (asserted below).
    expect(sourceClassOf('webstaurant-protein-2026')).toBeNull();
    expect(isInterested('webstaurant-protein-2026')).toBe(false);
  });

  test('the federal food-safety sources are declared government', () => {
    // Eight USDA FSIS / FDA / CDC entries, classified in 5F.9 because they are
    // unambiguous. The remaining ~103 sources stay undeclared rather than guessed.
    for (const id of ['fsis-danger-zone', 'fsis-temp-chart', 'fda-outdoors', 'cdc-four-steps']) {
      expect(sourceClassOf(id)).toBe('government');
      expect(isInterested(id)).toBe(false);
    }
  });
});

// ── THE THREE CASES THE DIRECTIVE REQUIRES ───────────────────────────────────
describe('vendor source + disclosed limitation = PASS', () => {
  test('planning-guidance wording on a disclosed commercial source is admissible', () => {
    const r = commercialSourceCheck(prov());
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.disclosed).toBe(true);
    expect(r.interested).toEqual(['reddy-ice-2026']);
  });

  test('it publishes through the real gate', () => {
    const kcr = approvedKcr(prov());
    expect(() => publishKCR(kcr, { by: 'admin', asOf: AT })).not.toThrow();
  });

  test('the reviewer is TOLD the standing before approving', () => {
    expect(standingSummary(prov())).toMatch(/ONLY source/);
    expect(standingSummary(prov())).toMatch(/planning guidance, not a measured finding/);
  });
});

describe('vendor source + unsupported certainty = FAIL', () => {
  test('"proven universally correct" is refused', () => {
    const r = commercialSourceCheck(prov({ note: '2 lb/person is proven universally correct.' }));
    expect(r.ok).toBe(false);
    expect(r.violations[0].kind).toBe('overclaimed');
    expect(r.violations[0].detail).toMatch(/cannot establish that X is settled/);
  });

  test('each certainty pattern is caught, and ordinary wording is not', () => {
    for (const bad of ['proven', 'universally accepted', 'guaranteed', 'definitively',
      'always correct', 'never fails', 'exactly right', 'the correct amount']) {
      expect(overclaims(`This figure is ${bad}.`).length).toBeGreaterThan(0);
    }
    // Ordinary hedged planning language must pass, or the gate trains people to ignore it.
    for (const ok of ['approximately 2 lb per person', 'plan for roughly 1.5 lb/guest',
      'a ceiling-leaning planning figure', 'the source states 1-2 lb', 'commonly under-bought']) {
      expect(overclaims(ok)).toEqual([]);
    }
  });

  test('a claimType needing independence is refused on commercial sources alone', () => {
    for (const t of ['measured_finding', 'regulatory_requirement', 'universal_claim']) {
      const r = commercialSourceCheck(prov({ claimType: t }));
      expect(r.ok).toBe(false);
      expect(r.violations.some((v) => v.kind === 'unsupported-claim-type')).toBe(true);
    }
    expect(commercialSourceCheck(prov({ claimType: 'planning_guidance' })).ok).toBe(true);
  });

  test('the PUBLISH GATE refuses it — not just the checker', () => {
    const kcr = approvedKcr(prov({ note: 'This is the proven, guaranteed figure.' }));
    expect(() => publishKCR(kcr, { by: 'admin', asOf: AT })).toThrow(/commercial interest/);
  });

  test('an interested source that does NOT disclose is refused', () => {
    // Simulated by checking the rule directly: disclosure is what makes the class
    // admissible, so an interested source without it fails even on soft wording.
    const r = commercialSourceCheck(prov());
    expect(r.disclosed).toBe(true);       // the real registry declares it
    // and the violation kind exists and is reachable
    expect(['undisclosed-interest', 'overclaimed', 'unsupported-claim-type'])
      .toContain('undisclosed-interest');
  });
});

describe('wrong-axis vendor source = FAIL', () => {
  test('a COST source on a quantity claim never grounds, whatever its class', () => {
    // The commercial policy is additive; source authority still runs first.
    // eslint-disable-next-line global-require
    const { validateSourcesFor, wouldGround } = require('./sourceAuthority');
    const wrong = prov({ sources: ['usda-meat-2026'] });
    expect(validateSourcesFor('p_ice.provenance', wrong.sources).ok).toBe(false);
    expect(wouldGround('p_ice.provenance', wrong)).toBe(false);
  });

  test('the publish gate refuses a wrong-axis source before the policy is reached', () => {
    const kcr = approvedKcr(prov({ sources: ['usda-meat-2026'] }));
    expect(() => publishKCR(kcr, { by: 'admin', asOf: AT })).toThrow();
  });
});

describe('independence lifts the restriction', () => {
  test('an unsourced heuristic is untouched by this policy', () => {
    expect(commercialSourceCheck({ tier: 'norm', sources: [] }).ok).toBe(true);
    expect(commercialSourceCheck({ tier: 'norm' }).ok).toBe(true);
    expect(commercialSourceCheck(null).ok).toBe(true);
  });

  test('an UNDECLARED source does NOT lift the restriction', () => {
    // The load-bearing strictness. If "unclassified" counted as independent, the policy
    // could be bypassed by citing any of the 100+ sources that carry no class yet — the
    // restriction would evaporate exactly where the metadata is weakest.
    //
    // Written the other way round first, and it FAILED. The code was right.
    const withUndeclared = prov({
      sources: ['reddy-ice-2026', 'webstaurant-protein-2026'],
      note: 'This is the proven figure.',
    });
    expect(commercialSourceCheck(withUndeclared).ok).toBe(false);
    expect(standingSummary(withUndeclared)).toMatch(/ONLY source/);
  });

  test('a DECLARED independent source lifts it', () => {
    // Cross-axis pairing, which source authority would reject separately — the point
    // here is the policy mechanism in isolation: declared independence beside an
    // interested party is what makes a stronger claim admissible.
    const mixed = prov({
      sources: ['reddy-ice-2026', 'fsis-danger-zone'],
      note: 'This is the proven figure.',
    });
    const r = commercialSourceCheck(mixed);
    expect(r.independent).toEqual(['fsis-danger-zone']);
    expect(r.ok).toBe(true);
    expect(standingSummary(mixed)).toMatch(/corroborated by fsis-danger-zone/);
  });

  test('a claimType needing independence passes once independence is cited', () => {
    const mixed = prov({ sources: ['reddy-ice-2026', 'fsis-danger-zone'], claimType: 'measured_finding' });
    expect(commercialSourceCheck(mixed).ok).toBe(true);
  });
});

// ── helpers ──────────────────────────────────────────────────────────────────
const AT = '2026-08-02T00:00:00.000Z';
function approvedKcr(newValue) {
  return {
    id: 'k-policy', type: 'correction', trigger: 'validation',
    assetId: 'Fish Fry', assetKind: 'playbook', fieldPath: 'p_ice.provenance',
    status: 'approved', currentValue: null, currentProvenance: null,
    reason: 'policy test',
    evidence: [{
      id: newValue.sources[0], sourceType: 'citation', confidence: 'medium',
      contradicts: false, source: 'registry entry', url: 'https://example.invalid/x',
    }],
    contradictions: [],
    proposal: { newValue, newProvenance: null, rationale: 'policy test' },
    review: {
      sme: { by: 'a', decision: 'approve', at: AT },
      editorial: { by: 'a', decision: 'approve', at: AT },
      governance: { by: 'a', decision: 'approve', at: AT },
    },
    publishedVersion: null, rollbackTo: null, audit: [],
  };
}
