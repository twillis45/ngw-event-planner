// ─── Claim basis classifier (Phase 5G-B) ─────────────────────────────────────
//
// THE INVARIANT UNDER TEST: the classifier may make the corpus more LEGIBLE. It may
// never make a line look better sourced than it is today. Every value it reports
// traces to something an author wrote — never to a default filled in to complete a
// schema.
import { ALL_PLAYBOOKS } from '../playbooks/index';
import { isGroundedItemQty } from './quantityProvenance';
import {
  classifyClaim, basisDistribution, CLAIM_BASIS, CLAIM_VERIFICATION, HOST_LABELS,
} from './claimBasis';

const allProvenances = () => ALL_PLAYBOOKS.flatMap((pb) => (pb.purchases || []).map((p) => p.provenance));

describe('it does not weaken or duplicate the citation predicate', () => {
  test('directCitationEligible IS isGroundedItemQty, on every corpus line', () => {
    // Not "agrees with" — identical. The classifier calls the predicate rather than
    // reimplementing it, so the two modules that disagreed in Phase A cannot drift.
    let checked = 0;
    for (const prov of allProvenances()) {
      expect(classifyClaim(prov).directCitationEligible).toBe(isGroundedItemQty(prov));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(500);
  });

  test('the citation count is unchanged by classification', () => {
    const d = basisDistribution(allProvenances());
    const predicate = allProvenances().filter((p) => isGroundedItemQty(p)).length;
    expect(d.directlyCited).toBe(predicate);
    expect(d.directlyCited).toBeGreaterThan(0);
  });

  test('NO field is called `grounded` — that word is what caused the collapse', () => {
    const c = classifyClaim({ tier: 'researched', verificationStatus: 'cited', sources: ['reddy-ice-2026'] });
    expect(Object.keys(c)).not.toContain('grounded');
    expect(c.directCitationEligible).toBe(true);
  });
});

describe('the two authored dimensions are read separately', () => {
  test('basis and verification are reported independently', () => {
    // The 17-line pair the audit found. Both halves must survive classification.
    const c = classifyClaim({ tier: 'cultural-tradition', verificationStatus: 'established-consensus', sources: [] });
    expect(c.basis).toBe('cultural-tradition');
    expect(c.verification).toBe('established-consensus');
    expect(c.basisFamily).toBe('cultural');
  });

  test('the same basis at different verifications keeps ONE basis', () => {
    const a = classifyClaim({ tier: 'trade-heuristic', verificationStatus: 'synthesized', sources: [] });
    const b = classifyClaim({ tier: 'trade-heuristic', verificationStatus: 'established-consensus', sources: [] });
    expect(a.basis).toBe(b.basis);
    expect(a.verification).not.toBe(b.verification);
  });

  test('basis keys are the AUTHORED strings, not renamed', () => {
    // The ruling: do not introduce parallel values that merely rename what authors
    // already write. Every key here must be a tier some author actually wrote.
    const authored = new Set(allProvenances()
      .map((p) => (typeof p === 'string' ? p : p && typeof p === 'object' ? p.tier : null))
      .filter(Boolean));
    for (const key of Object.keys(CLAIM_BASIS)) expect(authored.has(key)).toBe(true);
  });
});

describe('every authored tier is classified — the ratchet', () => {
  test('the real corpus produces ZERO off-ladder claims', () => {
    // Phase A found 7 of 12 authored tiers fell off the doctrine ladder and scored as
    // absent. If a new tier is authored without being classified here, this fails —
    // which is the point. An unrecognised basis is a gap in the table, not the corpus.
    const d = basisDistribution(allProvenances());
    expect(d.offLadder).toEqual([]);
  });

  test('an UNKNOWN tier is reported honestly, never silently scored as absent', () => {
    const c = classifyClaim({ tier: 'astrology', verificationStatus: 'cited', sources: [] });
    expect(c.offLadder).toBe(true);
    expect(c.basisRecorded).toBe(false);
    expect(c.recommendationEligible).toBe(false);
    expect(c.hostLabel).toBe(HOST_LABELS.NEEDS_CONFIRMATION);
    // and it still reports WHAT it saw, so the gap is findable
    expect(c.basis).toBe('astrology');
  });
});

describe('host labels are truthful', () => {
  test('EVERY authored line gets a label — silence is gone', () => {
    // The largest honesty defect Phase A found: 52 lines labelled, 485 silent.
    const labelled = allProvenances().filter((p) => !!classifyClaim(p).hostLabel);
    expect(labelled.length).toBe(allProvenances().length);
    expect(labelled.length).toBeGreaterThan(500);
  });

  test('cultural knowledge reads as cultural tradition, not as a gap', () => {
    for (const tier of ['cultural-tradition', 'culture-bearer', 'matriarch', 'community']) {
      expect(classifyClaim({ tier, verificationStatus: 'synthesized', sources: [] }).hostLabel)
        .toBe(HOST_LABELS.CULTURAL_TRADITION);
    }
  });

  test('settled-among-practitioners is NOT sold as independent consensus', () => {
    // 23 lines are `trade-heuristic / established-consensus`. Established within a
    // trade is still the trade's view.
    expect(classifyClaim({ tier: 'trade-heuristic', verificationStatus: 'established-consensus', sources: [] }).hostLabel)
      .toBe(HOST_LABELS.PRACTITIONER_GUIDANCE);
  });

  test('a claim of research that cannot be backed asks for confirmation', () => {
    // tier says researched; the source does not resolve in QTY_SOURCES.
    const c = classifyClaim({ tier: 'researched', verificationStatus: 'researched', sources: ['not-a-real-source'] });
    expect(c.directCitationEligible).toBe(false);
    expect(c.hostLabel).toBe(HOST_LABELS.NEEDS_CONFIRMATION);
  });

  test('a line with NO provenance reads as a board-authored baseline', () => {
    // 368 corpus lines. The host's Part 1 ruling settles what these are; silence was
    // the alternative and it falsely implied no reasoning existed.
    for (const bad of [null, undefined, {}, [], 0]) {
      const c = classifyClaim(bad);
      expect(c.hostLabel).toBe(HOST_LABELS.PLANNING_BASELINE);
      expect(c.authoredBaseline).toBe(true);
      expect(c.basisRecorded).toBe(false);   // no basis VOCABULARY was declared
      expect(c.basis).toBeNull();            // and it does NOT claim there is no basis
      expect(c.directCitationEligible).toBe(false);
      expect(c.recommendationEligible).toBe(true);   // the app stays decisive
    }
  });

  test('a bare STRING provenance is never mistaken for a basis (measured, 21 lines)', () => {
    // Measurement, not assumption: ZERO of the 21 string provenances is a tier name.
    // 13 are the verification word "synthesized"; 8 are free prose rationale.
    const word = classifyClaim('synthesized');
    expect(word.basis).toBeNull();
    expect(word.verification).toBe('synthesized');
    expect(word.rationale).toBeNull();
    expect(word.hostLabel).toBe(HOST_LABELS.PLANNING_BASELINE);

    const prose = classifyClaim('US bar-stocking norm: 40/30/30 beer/wine/spirits split.');
    expect(prose.basis).toBeNull();                  // prose is NOT read as a basis
    expect(prose.verification).toBeNull();
    expect(prose.rationale).toMatch(/40\/30\/30/);   // but the reasoning is preserved
    expect(prose.hostLabel).toBe(HOST_LABELS.PLANNING_BASELINE);
    expect(prose.directCitationEligible).toBe(false);
  });

  test('the corpus string forms are exactly what was measured', () => {
    // Pins the 13/8 split. If someone authors a THIRD string shape, this fails rather
    // than letting it fall silently into the baseline bucket.
    const strings = allProvenances().filter((p) => typeof p === 'string');
    expect(strings.length).toBe(21);
    expect(strings.filter((s) => s === 'synthesized').length).toBe(13);
    expect(strings.filter((s) => s !== 'synthesized').length).toBe(8);
    for (const s of strings) expect(classifyClaim(s).basis).toBeNull();
  });

  test('only the six approved labels are ever produced', () => {
    const allowed = new Set(Object.values(HOST_LABELS));
    for (const prov of allProvenances()) expect(allowed.has(classifyClaim(prov).hostLabel)).toBe(true);
  });
});

describe('the honesty boundary holds', () => {
  test('recency is NOT assertable — no claim-level verification date exists', () => {
    // sourceFreshness dates SOURCES, never claims. Until claim-level dates exist,
    // these two statuses would be false precision, so they must not be in the model.
    expect(Object.keys(CLAIM_VERIFICATION)).not.toContain('verified_current');
    expect(Object.keys(CLAIM_VERIFICATION)).not.toContain('corroborated');
    const labels = Object.values(CLAIM_VERIFICATION).map((v) => v.label).join(' ');
    expect(labels).not.toMatch(/current|up to date|corroborat/i);
    expect(Object.values(HOST_LABELS).join(' ')).not.toMatch(/current|verified|corroborat/i);
  });

  test('recommendation eligibility is BROADER than citation eligibility', () => {
    // The compatible-states ruling: consensus-backed and recommendation-eligible
    // without being directly citable.
    const c = classifyClaim({ tier: 'cultural-tradition', verificationStatus: 'established-consensus', sources: [] });
    expect(c.recommendationEligible).toBe(true);
    expect(c.directCitationEligible).toBe(false);

    const d = basisDistribution(allProvenances());
    expect(d.recommendationEligible).toBeGreaterThan(d.directlyCited);
  });

  test('classification NEVER upgrades a line into citation eligibility', () => {
    // The one thing that would make a line look better sourced than it is.
    for (const prov of allProvenances()) {
      const c = classifyClaim(prov);
      if (c.directCitationEligible) expect(isGroundedItemQty(prov)).toBe(true);
    }
  });

  test('basis carries no RANK — the families are kinds, not rungs', () => {
    for (const def of Object.values(CLAIM_BASIS)) {
      expect(def).not.toHaveProperty('rank');
      expect(def).not.toHaveProperty('grounded');
    }
  });
});

describe('the distribution replaces the single percentage', () => {
  test('it reports the corpus by label and by family, summing to the total', () => {
    const d = basisDistribution(allProvenances());
    expect(d.total).toBe(allProvenances().length);
    expect(Object.values(d.byLabel).reduce((a, b) => a + b, 0)).toBe(d.total);
    expect(Object.values(d.byFamily).reduce((a, b) => a + b, 0)).toBe(d.total);
  });

  test('more than one label is populated — a single bucket would be a defect', () => {
    const d = basisDistribution(allProvenances());
    expect(Object.keys(d.byLabel).length).toBeGreaterThanOrEqual(4);
  });
});
