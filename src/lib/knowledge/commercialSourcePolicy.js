// ─── COMMERCIAL PRACTITIONER SOURCE POLICY (Phase 5F.9) ──────────────────────
//
// THE QUESTION THIS ANSWERS. Two of NGW's registered quantity sources are published by
// companies that sell the thing being measured:
//
//   reddy-ice-2026              a packaged-ice manufacturer, on lb of ice per guest
//   jollychef-disposables-2026  a disposables retailer, on place settings per guest
//
// Between them they are the only evidence behind 48 of 131 Type A lines. Every
// comparable guide found is also a retailer, so "corroboration" among them is trade
// consensus between sellers, not independent verification.
//
// THE POLICY. A commercial source is admissible — it is real, dated, resolvable and
// often the ONLY published figure for a practical planning question. What it may not do
// is carry a claim stronger than its standing:
//
//   ALLOWED      "Reddy Ice recommends approximately 2 lb/person for outdoor planning."
//   NOT ALLOWED  "2 lb/person is proven universally correct."
//
// So the constraint is on the CLAIM, not on the source. A commercial source may support
// `planning_guidance`. It may not, alone, support a universal claim, a mandatory
// quantity, or a guarantee — those need independent evidence beside it.
//
// WHAT THIS IS NOT. It is not a quality score, and it does not rank sources. It asks two
// checkable questions: is the source's class disclosed, and is the claim within what that
// class can carry? Whether the number is RIGHT remains a human judgement.
//
// PURE: no I/O, no UI, no storage.
import { resolveGroundingSource } from './groundingSources';

/** How a source is published. Declared per source; absent means undeclared. */
export const SOURCE_CLASSES = Object.freeze([
  'independent',              // no stake in the answer (standards body, academic, press)
  'government',               // regulator or public agency
  'trade_association',        // industry body — interested, but not selling directly
  'commercial_practitioner',  // sells the product or service being measured
]);

/** What kind of claim a provenance is making. */
export const CLAIM_TYPES = Object.freeze([
  'planning_guidance',        // "plan for roughly X" — a starting point, not a finding
  'measured_finding',         // an observed or surveyed result
  'regulatory_requirement',   // a rule with legal force
  'universal_claim',          // asserted true generally
]);

/** Classes that have a stake in the number being higher or lower. */
const INTERESTED = new Set(['commercial_practitioner', 'trade_association']);

/** Claim types a commercial source may NOT carry on its own. */
const NEEDS_INDEPENDENT = new Set(['measured_finding', 'regulatory_requirement', 'universal_claim']);

// LANGUAGE THAT OVERCLAIMS. Deliberately a short, specific list rather than a broad
// sweep: a false failure here would train an operator to ignore the gate. Each of these
// asserts settled truth, which planning guidance from an interested party cannot be.
const CERTAINTY_PATTERNS = [
  /\bproven\b/i,
  /\buniversally\b/i,
  /\bguarantee(?:d|s)?\b/i,
  /\bdefinitive(?:ly)?\b/i,
  /\balways correct\b/i,
  /\bnever (?:fails|wrong)\b/i,
  /\bexactly right\b/i,
  /\bthe correct (?:amount|quantity|figure)\b/i,
];

/** The declared class of a source, or null when the registry does not say. */
export function sourceClassOf(id) {
  const s = resolveGroundingSource(id);
  return (s && s.sourceClass) || null;
}

export const isInterested = (id) => INTERESTED.has(sourceClassOf(id));

/** Certainty language found in a claim note. Returns the matched phrases. */
export function overclaims(text) {
  const t = String(text || '');
  return CERTAINTY_PATTERNS.map((re) => (t.match(re) || [])[0]).filter(Boolean);
}

/**
 * commercialSourceCheck(provenance) -> { ok, violations[], disclosed, classes }
 *
 * Runs on any provenance that cites sources. Three failures, all checkable:
 *
 *   undisclosed-interest   an interested source whose class the registry does not declare
 *   overclaimed            certainty language while EVERY source is interested
 *   unsupported-claim-type a claim type needing independence with no independent source
 *
 * A provenance with at least one independent source passes the last two: independence
 * beside an interested party is exactly what lifts the restriction.
 */
export function commercialSourceCheck(provenance) {
  const v = provenance;
  const sources = (v && typeof v === 'object' && Array.isArray(v.sources))
    ? v.sources.filter(Boolean) : [];
  if (!sources.length) return { ok: true, violations: [], disclosed: true, classes: {} };

  const classes = {};
  for (const id of sources) classes[id] = sourceClassOf(id);

  const interested = sources.filter((id) => INTERESTED.has(classes[id]));
  const independent = sources.filter((id) => classes[id] && !INTERESTED.has(classes[id]));
  const undeclared = sources.filter((id) => !classes[id]);

  const violations = [];

  // 1. DISCLOSURE. An interested source must say so. Undeclared is only a violation for
  //    sources the registry knows are interested — an unclassified independent source is
  //    a metadata gap, reported elsewhere, not a policy breach.
  for (const id of interested) {
    const s = resolveGroundingSource(id) || {};
    const limitations = Array.isArray(s.limitations) ? s.limitations : [];
    if (!limitations.includes('commercial_interest_disclosed')) {
      violations.push({
        kind: 'undisclosed-interest',
        source: id,
        detail: `${id} is a ${classes[id]} and does not declare `
          + '`limitations: ["commercial_interest_disclosed"]`. A source that profits from '
          + 'the answer must say so where a reviewer will see it.',
      });
    }
  }

  const allInterested = interested.length > 0 && independent.length === 0;

  // 2. OVERCLAIM. Certainty language carried only by interested parties.
  if (allInterested) {
    const found = overclaims(v.note).concat(overclaims(v.claim));
    if (found.length) {
      violations.push({
        kind: 'overclaimed',
        detail: `The claim uses ${found.map((f) => `"${f}"`).join(', ')} while every cited `
          + 'source has a commercial interest in the answer. An interested party can support '
          + '"plan for roughly X"; it cannot establish that X is settled. Soften the wording '
          + 'or add an independent source.',
      });
    }
  }

  // 3. CLAIM TYPE. Some claims need independence by their nature.
  const claimType = v.claimType || null;
  if (allInterested && claimType && NEEDS_INDEPENDENT.has(claimType)) {
    violations.push({
      kind: 'unsupported-claim-type',
      detail: `claimType "${claimType}" cannot rest on commercial sources alone. `
        + 'Downgrade it to "planning_guidance" or cite an independent source.',
    });
  }

  return {
    ok: violations.length === 0,
    violations,
    disclosed: !violations.some((x) => x.kind === 'undisclosed-interest'),
    classes,
    interested,
    independent,
    undeclared,
  };
}

/** One line for a reviewer, naming the standing of what they are about to approve. */
export function standingSummary(provenance) {
  const r = commercialSourceCheck(provenance);
  if (!r.interested || !r.interested.length) return null;
  const which = r.interested.join(', ');
  if (r.independent && r.independent.length) {
    return `${which} has a commercial interest, corroborated by ${r.independent.join(', ')}.`;
  }
  return `${which} has a commercial interest and is the ONLY source. `
    + 'Treat the figure as planning guidance, not a measured finding.';
}
