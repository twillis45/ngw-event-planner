// ─── Grounding Doctrine — ONE consistent research standard ───────────────────
//
// Host directive (2026-07-16): "make sure we have consistent good doctrine on
// research." The engine grounds decisions across ~13 axes, but each axis invented
// its own `tier` vocabulary (ada-standard, fda-standard, noaa-standard, planning-
// standard, established-consensus, consensus, researched, reasoned, synthesized…),
// so "grounded" didn't mean one thing. This file is the single canonical ladder +
// a normalizer that maps every legacy/domain tier onto it, so every axis — and the
// admin sources view — speaks the same grounding language.
//
// Pairs with researchPolicies.js (the research PROCESS: freshness, corroboration,
// retry) and feedback_hold_source_provenance (every grounded claim carries source
// ids). This governs WHAT a grounding tier MEANS.

// The canonical ladder, most → least grounded. `grounded:true` = it counts as real
// grounding; false = honest judgment/heuristic that must NOT be scored as grounded.
export const GROUNDING_TIERS = {
  cited: { rank: 4, grounded: true, label: 'Cited', note: 'A specific, dated, authoritative source is named — fully traceable to a reference, regulation, or study.' },
  'established-consensus': { rank: 3, grounded: true, label: 'Established consensus', note: 'An authoritative standard/regulation or well-established professional consensus (ADA, FDA, NOAA, federal law, DoD/service regs, standard industry practice).' },
  researched: { rank: 2, grounded: true, label: 'Researched', note: 'Grounded in dated, researched sources (web/industry research captured with a date).' },
  synthesized: { rank: 1, grounded: false, label: 'Synthesized', note: 'A heuristic derived from grounded inputs but NOT yet verified to a source — honestly flagged, never scored as grounded.' },
  reasoned: { rank: 0, grounded: false, label: 'Reasoned', note: 'Editorial judgment with no external source — a call a seasoned planner also makes without citing (taste, choreography, sequence). NOT grounded, and forcing a citation here would be false precision.' },
};

// Legacy / domain-specific tier names → their canonical rung. Domain "standards"
// (an ADA/FDA/NOAA/legal standard) ARE established consensus; "guidance"/"heuristic"
// names collapse to researched or synthesized honestly.
const TIER_ALIASES = {
  'consensus': 'established-consensus',
  'established-guidance': 'established-consensus',
  'ada-standard': 'established-consensus',
  'fda-standard': 'established-consensus',
  'noaa-standard': 'established-consensus',
  'legal-standard': 'established-consensus',
  'childcare-standard': 'established-consensus',
  'planning-standard': 'established-consensus',
  'relational-guidance': 'researched',
  'regional-heuristic': 'synthesized',
  'trade-heuristic': 'synthesized',
  'needs-verification': 'synthesized',
  'norm': 'synthesized',
  'heuristic': 'synthesized',
};

// Map any tier string onto the canonical ladder (unknown → itself, so it's visible).
export function normalizeTier(tier) {
  const t = String(tier || '').toLowerCase().trim();
  if (GROUNDING_TIERS[t]) return t;
  return TIER_ALIASES[t] || t;
}

// Does this tier count as REAL grounding? The one uniform test every axis should use.
export function isGroundedTier(tier) {
  const c = GROUNDING_TIERS[normalizeTier(tier)];
  return !!(c && c.grounded);
}

// Full info for a tier (for display/audit) — always returns something honest.
export function tierInfo(tier) {
  const canon = normalizeTier(tier);
  return GROUNDING_TIERS[canon] || { rank: -1, grounded: false, label: String(tier || 'unspecified'), note: 'Off-ladder tier — normalize it into the canonical set.', canon };
}

// The whole doctrine, ordered — for the admin to render the ladder.
export function groundingLadder() {
  return Object.entries(GROUNDING_TIERS)
    .sort((a, b) => b[1].rank - a[1].rank)
    .map(([tier, info]) => ({ tier, ...info }));
}
