// ─── TRUST INTEGRITY CHECKS — reporting only (Phase 5C.1) ────────────────────
//
// WHY THIS EXISTS. `isGroundedCost` answers "does this claim cite a source id
// that resolves?" It cannot answer "does that source support this claim?" Phase
// 5B-5 audited 40 claim legs by hand and found 0 DIRECT, 4 DERIVED, 22
// ANALOGOUS, 14 UNSUPPORTED. These checks mechanise the parts of that audit that
// do NOT require reading source prose, so the next audit is cheaper than the last.
//
// REPORTING ONLY. Nothing here gates CI, changes a predicate, or alters runtime.
// The functions are pure: (playbooks) -> findings[]. The harness that prints them
// lives in trustIntegrityChecks.test.js and asserts nothing about the counts, so
// a finding cannot turn the build red. Wiring these to a gate is a Phase 5C.2
// decision, made deliberately, after the counts have been looked at at least once.
//
// THE THREE-OUTCOME RULE (check 1). Variance across claims citing one source is
// not automatically a defect. bar-provision-2026 states "~5-6 drinks/guest over a
// 4-5h event", so beer at 1.5/guest for a housewarming and 6/guest for a bachelor
// party are BOTH consistent with it — the source parameterises by duration. A
// check that flags that as a defect gets muted within a week. So each group
// resolves to one of three outcomes, and only the third is a finding:
//
//   consistent           — all claims agree
//   justified-variance   — they differ AND every differing claim records a
//                          `varianceReason` explaining why
//   unexplained-variance — they differ and no reason is recorded   <- FINDING
//
// `varianceReason` does not exist on any provenance object today. That is the
// point: the check names the field authors need to add, and until they do, honest
// variance and sloppy variance are indistinguishable — which is the actual state.

// ── relationship normalisation ───────────────────────────────────────────────
// Two claims are "the same relationship" if they describe the same arrangement.
// Option labels vary in prose ("Potluck", "Potluck — guests bring sides",
// "Potluck (everybody brings a dish)") while naming one thing.
const RELATIONSHIPS = [
  ['potluck',      /potluck|everybody brings|guests bring|bring a dish|sign up to bring|dish-shar/i],
  ['host-cooks',   /host cooks|host makes|host provides|host does|host grills|family cooks|cook it yourself|from scratch|steam (them |it )?myself|make all from scratch/i],
  ['caterer',      /cater(er|ing)|drop-?off|passed apps|tea service|trays|platters/i],
  ['restaurant',   /restaurant|private room/i],
  ['pitmaster',    /pitmaster|grill master|bbq caterer|boil caterer/i],
];

export function relationshipOf(label) {
  const s = String(label || '');
  for (const [name, re] of RELATIONSHIPS) if (re.test(s)) return name;
  return null;
}

const round = (n) => Math.round(Number(n) * 1000) / 1000;

// ── CHECK 1 — same source + same relationship -> different values ────────────
export function checkSameSourceDifferentValues(playbooks) {
  const groups = new Map();

  for (const pb of playbooks || []) {
    // decisions: one entry per costFactor leg
    for (const d of pb.decisions || []) {
      const prov = d.costFactorProvenance;
      if (!d.costFactors || !prov || !Array.isArray(prov.sources)) continue;
      for (const src of prov.sources) {
        for (const [label, value] of Object.entries(d.costFactors)) {
          const rel = relationshipOf(label);
          if (!rel) continue;
          const key = `${src}::${rel}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push({
            where: `${pb.type}/${d.id}`, label, value: round(value),
            varianceReason: prov.varianceReason || null,
          });
        }
      }
    }
    // purchases: one entry per (source, purchase id, unit)
    for (const p of pb.purchases || []) {
      const prov = p.provenance;
      if (!prov || typeof prov === 'string' || !Array.isArray(prov.sources)) continue;
      const qty = p.qtyPerGuest != null ? p.qtyPerGuest : p.qtyFlat;
      if (qty == null) continue;
      for (const src of prov.sources) {
        const key = `${src}::${p.id}::${p.unit || '?'}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({
          where: `${pb.type}/${p.id}`, label: p.unit || '?', value: round(qty),
          varianceReason: prov.varianceReason || null,
        });
      }
    }
  }

  const findings = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const values = [...new Set(members.map((m) => m.value))];
    if (values.length < 2) continue;                       // consistent
    const unexplained = members.filter((m) => !m.varianceReason);
    const outcome = unexplained.length === 0 ? 'justified-variance' : 'unexplained-variance';
    if (outcome === 'justified-variance') continue;
    findings.push({
      check: 1, key, outcome, distinctValues: values.sort((a, b) => a - b),
      spread: round(Math.max(...values) / Math.min(...values)),
      members: members.slice().sort((a, b) => a.value - b.value),
    });
  }
  return findings.sort((a, b) => b.members.length - a.members.length);
}

// ── CHECK 2 — source claim-type mismatch ─────────────────────────────────────
// Enforceable form needs `supportsClaimTypes` / `excludedClaimTypes` on the
// source registry — proposed in PHASE_5C_1, not yet added. Until then this runs
// a heuristic: if a claim's text names a domain the source demonstrably does not
// cover, flag it. Narrow on purpose; a heuristic that over-fires gets ignored.
const DOMAIN_TOKENS = [
  ['seafood', /seafood|shrimp|crab|crawfish|oyster|clam|mussel|lobster|\bfish\b|catfish|whiting|porgy|porgies/i],
  ['produce', /vegetable|salad|greens|fruit/i],
];

export function checkSourceClaimTypeMismatch(playbooks, sourceCoverage) {
  const cov = sourceCoverage || {};
  const findings = [];
  const scan = (where, prov) => {
    if (!prov || typeof prov === 'string' || !Array.isArray(prov.sources)) return;
    const text = `${prov.claim || ''} ${prov.note || ''}`;
    for (const src of prov.sources) {
      const excluded = cov[src] && cov[src].excludes;
      if (!excluded) continue;
      for (const [domain, re] of DOMAIN_TOKENS) {
        if (excluded.includes(domain) && re.test(text)) {
          findings.push({ check: 2, where, source: src, domain, outcome: 'claim-type-mismatch' });
        }
      }
    }
  };
  for (const pb of playbooks || []) {
    for (const d of pb.decisions || []) scan(`${pb.type}/${d.id}`, d.costFactorProvenance);
    for (const p of pb.purchases || []) scan(`${pb.type}/${p.id}`, p.provenance);
  }
  return findings;
}

// ── CHECK 3 — derived claim without a derivation record ──────────────────────
// A claim that states a NUMBER the source does not state verbatim is a
// derivation, and a derivation nobody wrote down cannot be checked. crab_size is
// the only decision in the corpus whose method was recorded — and it is the only
// one whose arithmetic could be verified (3 of 4 legs reproduced; 1 did not).
const DERIVATION_MARKERS = /ratio|midpoint|multipl|calculat|derive|yields|x 0\.|= 0\.|per dozen as 1\.0|as 1\.0/i;

export function checkDerivedWithoutDerivation(playbooks) {
  const findings = [];
  const scan = (where, prov, kind) => {
    if (!prov || typeof prov === 'string') return;
    if (prov.tier !== 'researched') return;
    const text = `${prov.claim || ''} ${prov.note || ''}`;
    if (DERIVATION_MARKERS.test(text)) return;             // a method is described
    findings.push({ check: 3, where, kind, tier: prov.tier, outcome: 'no-derivation-recorded' });
  };
  for (const pb of playbooks || []) {
    for (const d of pb.decisions || []) scan(`${pb.type}/${d.id}`, d.costFactorProvenance, 'decision');
    for (const p of pb.purchases || []) scan(`${pb.type}/${p.id}`, p.provenance, 'purchase');
  }
  return findings;
}

// ── CHECK 4 — researched tier without an evidence assessment ─────────────────
// `sufficientWhen` states what evidence WOULD justify the claim. It is populated
// on every grounded costFactor decision and has never been evaluated. There is no
// field recording whether it was met, so this check reports the two states it can
// distinguish: no criterion at all, versus a criterion with no verdict.
export function checkResearchedWithoutAssessment(playbooks) {
  const findings = [];
  const scan = (where, prov, kind) => {
    if (!prov || typeof prov === 'string') return;
    if (prov.tier !== 'researched') return;
    const hasCriterion = !!prov.sufficientWhen;
    const hasVerdict = prov.sufficiencyMet !== undefined;
    if (hasCriterion && hasVerdict) return;
    findings.push({
      check: 4, where, kind,
      outcome: hasCriterion ? 'criterion-never-evaluated' : 'no-sufficiency-criterion',
    });
  };
  for (const pb of playbooks || []) {
    for (const d of pb.decisions || []) scan(`${pb.type}/${d.id}`, d.costFactorProvenance, 'decision');
    for (const p of pb.purchases || []) scan(`${pb.type}/${p.id}`, p.provenance, 'purchase');
  }
  return findings;
}

// ── runner ───────────────────────────────────────────────────────────────────
export function runTrustIntegrityChecks(playbooks, sourceCoverage) {
  return {
    check1: checkSameSourceDifferentValues(playbooks),
    check2: checkSourceClaimTypeMismatch(playbooks, sourceCoverage),
    check3: checkDerivedWithoutDerivation(playbooks),
    check4: checkResearchedWithoutAssessment(playbooks),
  };
}

// The PROPOSED source coverage map (Phase 5C.1 task 3). Documented here so check 2
// is runnable today; it is NOT read by any predicate and adds nothing to the
// registry. Moving it into the source registry is a Phase 5C.2 decision.
export const PROPOSED_SOURCE_COVERAGE = Object.freeze({
  'usda-meat-2026':          { supports: ['meat-retail-price'], excludes: ['seafood', 'produce'] },
  'catering-perperson-2026': { supports: ['catering-service-tier-price'], excludes: [] },
  'dmv-crab-2026':           { supports: ['blue-crab-retail-price'], excludes: [] },
});
