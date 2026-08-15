// ─── Claim basis — the ONE classifier for what a knowledge claim rests on ────
//
// Phase 5G-B (NGW Knowledge Strategy Reset). The Phase A audit found that playbook
// authors have been writing TWO dimensions all along, and that everything downstream
// collapsed them into one bit:
//
//   provenance.tier               = the EVIDENCE BASIS   (what kind of knowing)
//   provenance.verificationStatus = the VERIFICATION      (how settled it is)
//
// Of 148 lines carrying both, only 25.7% hold the same string. `cultural-tradition /
// established-consensus` (17 lines) says "this comes from cultural tradition, and
// within that tradition it is settled" — a true claim, and a legitimate basis.
// `isGroundedItemQty` tests `tier === 'researched'`, so it reported all 17 as
// ungrounded, indistinguishable from a blank line, and the host rendered silence.
//
// THIS MODULE RENAMES NOTHING. The basis keys ARE the strings authors wrote. What it
// adds is the classification of each: which family it belongs to, what a host should
// be told, and — separately — what it is eligible for.
//
// THE RULING IT IMPLEMENTS: one predicate must not serve every purpose. A claim can
// be recommendation-eligible, consensus-backed, and NOT directly citation-eligible.
// Those are compatible states, so they are separate fields here.
//
// SCOPE FENCE: classification only. It computes no quantity, moves no threshold,
// changes no readiness, and does not alter `isGroundedItemQty` — which it CALLS
// rather than reimplements, so the two can never drift apart.
import { isGroundedItemQty } from './quantityProvenance';
// The cost axis of the same question — a purchase line's PRICE claim resolves
// against COST_SOURCES, not the quantity registry. See directCitationEligible.
import { isGroundedCost } from './costProvenance';

// ─── Dimension 1: EVIDENCE BASIS ─────────────────────────────────────────────
//
// Keyed by the authored `tier` string, verbatim. `family` groups them for reporting;
// it is NOT a rank. `cultural-tradition` is not weaker `researched` — it is a
// different kind of knowing, and ranking them on one axis is exactly what forced 45
// lines off the doctrine ladder.
export const CLAIM_BASIS = Object.freeze({
  // Research and direct evidence
  researched:           { family: 'researched',   label: 'Researched',            note: 'Grounded in dated, researched sources.' },
  primary:              { family: 'practitioner', label: 'Primary evidence',      note: 'A direct practitioner or first-hand account.' },

  // Consensus
  consensus:            { family: 'consensus',    label: 'Established consensus', note: 'Settled professional or standards-body agreement.' },

  // Community and cultural knowledge — a real basis that is not citable by design
  'cultural-tradition': { family: 'cultural',     label: 'Cultural tradition',    note: 'How the tradition itself does it.' },
  'culture-bearer':     { family: 'cultural',     label: 'Culture bearer',        note: 'A named holder of the tradition.' },
  matriarch:            { family: 'cultural',     label: 'Family authority',      note: 'A named family authority on how this is done.' },
  community:            { family: 'cultural',     label: 'Community practice',    note: 'Common practice in the communities this serves.' },

  // Trade practice
  'trade-heuristic':    { family: 'practitioner', label: 'Trade practice',        note: 'A working rule of thumb in the trade.' },

  // Editorial and board judgment
  'host-coaching':      { family: 'judgment',     label: 'Planning judgment',     note: 'An editorial call a seasoned planner also makes.' },
  norm:                 { family: 'judgment',     label: 'Common practice',       note: 'What is ordinarily done, absent a reason to differ.' },

  // Authored assumption
  estimate:             { family: 'baseline',     label: 'Planning estimate',     note: 'An authored starting figure, to be adjusted.' },
  heuristic:            { family: 'baseline',     label: 'Rule of thumb',         note: 'A simple planning shortcut.' },
});

// ─── Dimension 2: VERIFICATION ───────────────────────────────────────────────
//
// Keyed by the authored `verificationStatus`, verbatim. This axis says how well held
// a claim is — NOT how recent. There is no claim-level date anywhere in the corpus
// (`sourceFreshness` dates SOURCES only), so `verified_current` and `corroborated`
// are unassertable and deliberately absent. Adding them before claim-level dates
// exist would be the exact false-precision this program exists to prevent.
export const CLAIM_VERIFICATION = Object.freeze({
  cited:                   { label: 'Cited',                 settled: true },
  'established-consensus': { label: 'Established consensus', settled: true },
  researched:              { label: 'Researched',            settled: false },
  synthesized:             { label: 'Synthesized',           settled: false },
  partial:                 { label: 'Partially verified',    settled: false },
});

// ─── Host-facing labels ──────────────────────────────────────────────────────
//
// The six truthful labels. Each names WHERE the number comes from, because that is
// what a host needs in order to decide whether to trust it. `Directly sourced` wins
// when it applies, because it is the strongest claim that can actually be PROVEN.
export const HOST_LABELS = Object.freeze({
  DIRECTLY_SOURCED:     'Directly sourced',
  ESTABLISHED_CONSENSUS: 'Established consensus',
  CULTURAL_TRADITION:   'Cultural tradition',
  PRACTITIONER_GUIDANCE: 'Practitioner guidance',
  PLANNING_BASELINE:    'Planning baseline',
  NEEDS_CONFIRMATION:   'Needs confirmation',
});

// A provenance may be authored as a bare string on 21 corpus lines, and measurement
// (not assumption) shows the string is never a tier name. It is one of two things:
//   13 lines  the single word "synthesized"  — a VERIFICATION word, no basis given
//    8 lines  free prose                     — a real rationale, no basis vocabulary
//              e.g. "US bar-stocking norm: 40/30/30 beer/wine/spirits split."
// Both declare something and cite nothing. Neither is read as a basis, because
// inferring one from prose is the false-precision this program exists to prevent.
function readProvenance(prov) {
  if (typeof prov === 'string') {
    const s = prov.trim();
    const isVerificationWord = !!CLAIM_VERIFICATION[s];
    return {
      tier: null,
      verificationStatus: isVerificationWord ? s : null,
      rationale: isVerificationWord ? null : s,
      sources: [],
      obj: null,
    };
  }
  if (!prov || typeof prov !== 'object' || Array.isArray(prov)) return null;
  return {
    tier: prov.tier || null,
    verificationStatus: prov.verificationStatus || null,
    rationale: prov.note || null,
    sources: Array.isArray(prov.sources) ? prov.sources.filter(Boolean) : [],
    obj: prov,
  };
}

/**
 * classifyClaim(provenance) -> the single answer for one claim.
 *
 * Returns the five things the ruling requires, kept apart on purpose:
 *   basis                   what kind of knowing (authored vocabulary, verbatim)
 *   verification            how settled it is
 *   hostLabel               what a host is told
 *   directCitationEligible  === isGroundedItemQty. Narrow, provable, unchanged.
 *   recommendationEligible  may the app lead with this number
 *
 * NEVER returns a field called `grounded`. That word silently excluded established
 * consensus, cultural tradition and primary evidence, which is how 485 lines came to
 * render as silence.
 */
export function classifyClaim(prov) {
  const p = readProvenance(prov);

  // NO BASIS VOCABULARY DECLARED — 368 lines with no provenance at all, 13 carrying
  // only the word "synthesized", 8 carrying only prose.
  //
  // This does NOT mean the line has no basis. It means nobody wrote one down. The
  // host's Part 1 ruling settles what these are: existing playbooks are a
  // `board_approved_authored_baseline`. So they read as a Planning baseline — the
  // weakest of the informative labels, claiming no source and no research, only that
  // the board authored this figure as a starting point.
  //
  // Silence was the alternative, and silence falsely implied no reasoning existed.
  if (!p || !p.tier) {
    const verDef = p && p.verificationStatus ? (CLAIM_VERIFICATION[p.verificationStatus] || null) : null;
    return {
      basis: null,
      basisFamily: 'authored-baseline',
      basisLabel: 'Board-authored baseline',
      basisRecorded: false,          // no basis VOCABULARY was declared
      authoredBaseline: true,        // but the board authored it — Part 1 ruling
      verification: p ? p.verificationStatus : null,
      verificationLabel: verDef ? verDef.label : null,
      rationale: p ? (p.rationale || null) : null,
      hostLabel: HOST_LABELS.PLANNING_BASELINE,
      directCitationEligible: false,
      recommendationEligible: true,  // the app stays decisive; it just names what it is
      offLadder: false,
      sources: p ? p.sources : [],
    };
  }

  const basisDef = CLAIM_BASIS[p.tier] || null;
  const verDef = p.verificationStatus ? (CLAIM_VERIFICATION[p.verificationStatus] || null) : null;
  // A tier nobody has classified. Reported honestly rather than silently scored as
  // absent — an unrecognised basis is a gap in THIS table, not in the corpus.
  const offLadder = !basisDef;

  // ── EITHER AXIS, MATCHED TO THE CLAIM (2026-08-14) ─────────────────────────
  // This was `isGroundedItemQty` alone, and that predicate resolves sources ONLY
  // against QTY_SOURCES — the per-guest QUANTITY registry. But a purchase line
  // makes two different claims, and the one hosts budget on is the PRICE. A
  // `unitCostRange` cited to real, dated market sources registered in
  // COST_SOURCES could never be citation-eligible, because it was being judged
  // against the wrong registry.
  //
  // Measured while grounding the first wedding item: two named surveys (Zola
  // 2026 Registry & Gifting, The Knot 2025 Real Weddings) backing a corrected
  // favors range classified as **"Needs confirmation"** — the label meaning
  // "claims research and cannot back it" — on the best-evidenced line in that
  // file. That is worse than silence: it tells the host to doubt the one number
  // somebody actually checked.
  //
  // Each predicate still demands `tier:'researched'` and that EVERY source id
  // resolve in its own registry, so this widens the axis, not the bar. A cost
  // claim is judged by the cost registry, a quantity claim by the quantity one,
  // and a line citing something registered nowhere still fails both.
  const directCitationEligible = isGroundedItemQty(p.obj) || isGroundedCost(p.obj);

  // Ordered so that the label always names the most INFORMATIVE true thing. Basis
  // beats verification: `cultural-tradition / established-consensus` reads as
  // Cultural tradition, because where a number comes from is what a host needs.
  let hostLabel;
  if (directCitationEligible) {
    hostLabel = HOST_LABELS.DIRECTLY_SOURCED;
  } else if (offLadder) {
    hostLabel = HOST_LABELS.NEEDS_CONFIRMATION;
  } else if (basisDef.family === 'researched') {
    // Claims research and cannot back it — the "looks sourced but is not" class that
    // `knowledgeInventory` calls `ambiguous`. Reading this as guidance would repeat
    // the exact defect the reset exists to remove, so it asks for confirmation.
    hostLabel = HOST_LABELS.NEEDS_CONFIRMATION;
  } else if (basisDef.family === 'cultural') {
    hostLabel = HOST_LABELS.CULTURAL_TRADITION;
  } else if (basisDef.family === 'practitioner') {
    // Includes `trade-heuristic / established-consensus` (23 lines): settled among
    // practitioners is still practitioner guidance, not independent consensus.
    hostLabel = HOST_LABELS.PRACTITIONER_GUIDANCE;
  } else if (basisDef.family === 'consensus' || p.verificationStatus === 'established-consensus') {
    hostLabel = HOST_LABELS.ESTABLISHED_CONSENSUS;
  } else {
    hostLabel = HOST_LABELS.PLANNING_BASELINE;
  }

  return {
    basis: p.tier,
    basisFamily: basisDef ? basisDef.family : null,
    basisLabel: basisDef ? basisDef.label : null,
    basisRecorded: !offLadder,
    authoredBaseline: false,
    verification: p.verificationStatus,
    verificationLabel: verDef ? verDef.label : null,
    rationale: p.rationale || null,
    hostLabel,
    directCitationEligible,
    // The app may lead with any claim whose basis someone recorded and classified.
    // This is the point of the reset: governance protects recommendations, it does
    // not replace them.
    recommendationEligible: !offLadder,
    offLadder,
    sources: p.sources,
  };
}

/** Distribution of claims across bases — the honest replacement for one percentage. */
export function basisDistribution(provenances) {
  const out = { total: 0, byLabel: {}, byFamily: {}, directlyCited: 0, recommendationEligible: 0, offLadder: [] };
  for (const prov of provenances || []) {
    const c = classifyClaim(prov);
    out.total += 1;
    out.byLabel[c.hostLabel] = (out.byLabel[c.hostLabel] || 0) + 1;
    const fam = c.basisFamily || 'unrecorded';
    out.byFamily[fam] = (out.byFamily[fam] || 0) + 1;
    if (c.directCitationEligible) out.directlyCited += 1;
    if (c.recommendationEligible) out.recommendationEligible += 1;
    if (c.offLadder && c.basis) out.offLadder.push(c.basis);
  }
  return out;
}
