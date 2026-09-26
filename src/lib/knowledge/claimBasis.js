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
import { RESEARCH_POLICIES } from './researchPolicies';

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
  // ── THE BADGE NAMES WHICH CLAIM IT BACKS (2026-08-15) ─────────────────────
  // A purchase line makes two claims — how much to buy, and what it costs — and
  // `Directly sourced` was answering for both while proving only one.
  //
  // Measured: 42 priced lines carry a per-guest QUANTITY rate AND a
  // `tier:'researched'` provenance whose claim states a dollar figure. The row
  // renders the quantity rationale ("1/2 lb/guest x 15 guests") and then, in the
  // identical `v-meta` style directly beneath it, the badge. A host reads the
  // badge as vouching for the number they are about to put in a cart. It vouched
  // for the price.
  //
  // This is not a new claim, it is the same claim stated at its true scope, so
  // nothing is downgraded and no citation is hidden. The bar is untouched: both
  // still require `tier:'researched'` and every source id resolving in its own
  // registry.
  PRICE_SOURCED:        'Price directly sourced',
  AMOUNT_SOURCED:       'Amount directly sourced',
  ESTABLISHED_CONSENSUS: 'Established consensus',
  CULTURAL_TRADITION:   'Cultural tradition',
  PRACTITIONER_GUIDANCE: 'Practitioner guidance',
  PLANNING_BASELINE:    'Planning baseline',
  NEEDS_CONFIRMATION:   'Needs confirmation',
  // ── THE BADGE MUST DESCRIBE THE NUMBER ON SCREEN (2026-09-19) ─────────────
  // The same defect the two labels above were split for, one layer along. A
  // purchase line's price can be MOVED after it is sourced: a decision declares
  // `costFactors: { '<option>': <mult> }` and the chosen option re-prices the
  // row. 36 of the corpus's 51 cost factors carry `tier: 'synthesized'` and a
  // note that reads, in the authors' own words, "Cost factor heuristics need
  // verification against actual pricing."
  //
  // MEASURED on The Cookout's `p_grown_folks` — one row, three picks, IDENTICAL
  // badge and identical detail string:
  //
  //   no pick                      $147-$368   Directly sourced
  //   "Red drink + soda + water"   $11-$28     Directly sourced   (x0.2)
  //   "Full bar + punch"           $206-$515   Directly sourced   (x1.4)
  //
  // The citation grounds the DRINK RATE (~1 alcoholic drink/guest/hour) and says
  // nothing about 0.2 or 1.4. A host reading $206-$515 under "Directly sourced"
  // is being vouched a number nobody checked.
  //
  // NOTHING IS DOWNGRADED THAT WAS EARNED. The base rate is still sourced and
  // still says so in the detail; this label states the true scope of the claim
  // about the figure actually displayed. A factor of exactly 1, or one whose own
  // provenance IS researched, leaves the label untouched.
  SOURCED_THEN_ADJUSTED: 'Sourced base, adjusted',
});

// The three labels that mean "a real source backs this". `Directly sourced` used to
// be the whole set, so anything asking "is this row cited?" compared against that one
// string. Exported once, because that question is asked in several places and three
// hand-rolled copies of the answer is how the axes drifted apart in the first place.
export const SOURCED_LABELS = Object.freeze([
  HOST_LABELS.DIRECTLY_SOURCED,
  HOST_LABELS.PRICE_SOURCED,
  HOST_LABELS.AMOUNT_SOURCED,
]);

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
 * classifyClaim(provenance, costProvenance?) -> the single answer for one line.
 *
 * TWO CLAIMS, TWO BLOCKS (board ruling, Design A, 2026-08-15). A purchase line says
 * how much to buy AND what it costs. Those are separate claims with separate
 * registries and separate remedies, and they had one slot between them — so citing
 * the price meant overwriting the amount, and ~109 lines were blocked by a claim
 * they already carried.
 *
 * `costProvenance` is optional and additive: every line that omits it classifies
 * exactly as before, which is why no corpus rewrite was needed to land this.
 *
 * Returns the five things the ruling requires, kept apart on purpose:
 *   basis                   what kind of knowing (authored vocabulary, verbatim)
 *   verification            how settled it is
 *   hostLabel               what a host is told
 *   directCitationEligible  === isGroundedItemQty OR isGroundedCost, each judged
 *                           against its own registry. Narrow and provable; the
 *                           axis it passed on is named in `hostLabel`.
 *   recommendationEligible  may the app lead with this number
 *
 * NEVER returns a field called `grounded`. That word silently excluded established
 * consensus, cultural tradition and primary evidence, which is how 485 lines came to
 * render as silence.
 */
export function classifyClaim(prov, costProv, applied) {
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
  // ── ...UNLESS THE PRICE IS CITED IN ITS OWN BLOCK (2026-08-16) ─────────────
  //
  // This branch hardcoded `directCitationEligible: false` and a Planning-baseline
  // label, and it fires on the QUANTITY slot alone. Harmless while cost claims
  // lived in that same slot — impossible to reach with a cited price. The corpus
  // migration makes it reachable and dangerous: moving a cost block OUT of
  // `provenance` empties the slot, and every migrated line would silently drop
  // from "Price directly sourced" to "Planning baseline".
  //
  // Measured before migrating anything: `classifyClaim(null, <cited cost block>)`
  // returned "Planning baseline" with directCitationEligible false. That is 63 rows
  // losing a badge they had earned, as a side effect of tidying where the data
  // lives — the migration would have been a downgrade dressed as a cleanup.
  //
  // So a line with no declared quantity basis but a cited price falls through to
  // the ladder below, which names the axis it actually proved.
  const costCitedOnly = isGroundedCost(costProv);
  if ((!p || !p.tier) && !costCitedOnly) {
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
      // Shape parity with the main return. A planning baseline never claimed the
      // figure was checked, so an unverified factor cannot degrade it — but the
      // field exists on both paths so no caller has to branch on which it got.
      adjustedUnverified: false,
      directCitationEligible: false,
      recommendationEligible: true,  // the app stays decisive; it just names what it is
      offLadder: false,
      sources: p ? p.sources : [],
    };
  }

  // A cost-only line reaches here with NO quantity provenance at all — that is the
  // whole point of the branch above — so normalise rather than assume one exists.
  // Everything downstream reads a basis that is legitimately absent on these lines.
  const pq = p || { obj: null, sources: [] };
  const basisDef = CLAIM_BASIS[pq.tier] || null;
  const verDef = pq.verificationStatus ? (CLAIM_VERIFICATION[pq.verificationStatus] || null) : null;
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
  // ── "DIRECTLY SOURCED" MUST MEAN WHAT THE POLICY MEANS (2026-09-26) ───────
  //
  // `isGroundedCost` and `isGroundedItemQty` accept ONE source and no date.
  // `RESEARCH_POLICIES.pricing` demands `minCorroboration: 2` and a freshness
  // window. So the badge was certifying a standard this repo defines, using a
  // weaker test than the standard — and a host could not tell a price backed by
  // two checked sources from one backed by a single undated source, because
  // both rendered the same words.
  //
  // MEASURED over the 634 priced units the research ratchet walks:
  //   0   backed ONLY by weak evidence   (so nothing is being downgraded)
  //   41  MIXED — one axis meets the policy, the other does not, and the
  //       unqualified badge vouched for both. 36 read "Directly sourced",
  //       5 read "Price directly sourced".
  //
  // The repair needs no new word. `PRICE_SOURCED` and `AMOUNT_SOURCED` already
  // exist, added in 2026-08-15 and 2026-09-19 for this same reason one layer
  // up: state the claim at its true scope. A row whose cost is corroborated and
  // whose quantity is a single undated source now says "Price directly
  // sourced" — true — instead of "Directly sourced" — half true.
  //
  // THRESHOLDS ARE READ FROM THE POLICY, never written here. If
  // `minCorroboration` moves, this moves with it; a second copy of the number
  // is how the badge and the policy drifted apart in the first place.
  const PRICING = RESEARCH_POLICIES.pricing;
  const meetsPolicy = (prov, grounded) => {
    if (!grounded) return false;
    const n = Array.isArray(prov && prov.sources) ? prov.sources.length : 0;
    if (n < (PRICING.minCorroboration || 2)) return false;
    return Boolean(prov && (prov.lastVerified || prov.researchedAt));
  };

  const qtyCited = isGroundedItemQty(pq.obj);
  // Cost grounding is read from the COST block when there is one, and otherwise
  // from the shared slot — which is where every cost citation in the corpus lives
  // today. Both paths, so the migration can proceed line by line without a flag
  // day and without any line losing its badge in between.
  const costCited = isGroundedCost(costProv) || isGroundedCost(pq.obj);
  const directCitationEligible = qtyCited || costCited;

  // Which axes clear the POLICY, not merely the registry. Eligibility to be
  // labelled at all is unchanged above — this only decides how wide the label
  // may be, so no line loses its badge, and none is downgraded to a doubt.
  const qtyStrong = meetsPolicy(pq.obj, qtyCited);
  const costStrong = meetsPolicy(costProv, isGroundedCost(costProv))
    || meetsPolicy(pq.obj, isGroundedCost(pq.obj));

  // Ordered so that the label always names the most INFORMATIVE true thing. Basis
  // beats verification: `cultural-tradition / established-consensus` reads as
  // Cultural tradition, because where a number comes from is what a host needs.
  let hostLabel;
  // ── A PRICE NEVER OUTRANKS A CULTURAL BASIS (board ruling, 2026-08-15) ─────
  //
  // `directCitationEligible` is tested before the cultural branch below, so the
  // moment a cultural line could carry a cost citation it would stop reading
  // "Cultural tradition" and start reading "Price directly sourced". Before the
  // cost block existed that was impossible — `tier` is single-valued, so a
  // `cultural-tradition` slot could never satisfy `isGroundedCost`. Adding the
  // second block removes that accidental protection, so it is made explicit here.
  //
  // The material this guards: half-smokes anchored to Ben's Chili Bowl, the red
  // drink traced through the diaspora, watermelon documented as an early
  // Juneteenth red food "served with dignity, a tradition, not a stereotype".
  // Attaching a per-pound grocery price to those and letting it become the
  // headline would trade cultural scholarship for a coverage percentage. The
  // price is not lost — it stays on the line and in the detail; it just does not
  // get to speak first.
  const culturalBasis = basisDef && basisDef.family === 'cultural';
  if (directCitationEligible && !(culturalBasis && !qtyCited)) {
    // Unqualified only when BOTH axes are actually cited. Otherwise the label
    // says which one — see HOST_LABELS above for the measurement behind this.
    // Unqualified ONLY when both axes clear the policy. Otherwise name the axis
    // that does; and when neither does, keep naming the axis that is cited —
    // downgrading a real citation to a doubt would be the lie in the other
    // direction, and would create exactly the incentive the research ratchet's
    // own header warns about (relabel a claim to get under a number).
    hostLabel = (qtyStrong && costStrong) ? HOST_LABELS.DIRECTLY_SOURCED
      : (costStrong || (costCited && !qtyStrong)) ? HOST_LABELS.PRICE_SOURCED
        : HOST_LABELS.AMOUNT_SOURCED;
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
  } else if (basisDef.family === 'consensus' || pq.verificationStatus === 'established-consensus') {
    hostLabel = HOST_LABELS.ESTABLISHED_CONSENSUS;
  } else {
    hostLabel = HOST_LABELS.PLANNING_BASELINE;
  }

  // ── AND THEN THE PRICE MOVED (2026-09-19) ──────────────────────────────────
  // `applied` is the cost factor the food plan actually put on this line —
  // `{ factor, unverified }`, or absent. OPTIONAL BY DESIGN: every existing
  // two-argument caller is byte-identical to before, which is why the corpus
  // proofs below this file keep passing unchanged.
  //
  // Only a SOURCED label degrades. A line already reading "Planning baseline"
  // never claimed the number was checked, so an unverified multiplier tells the
  // host nothing new; "Cultural tradition" is a claim about where the dish comes
  // from, which a price factor does not touch. The three labels that vouch for a
  // FIGURE are the three that must stop vouching when the figure changes.
  const movedUnverified = !!(applied && applied.unverified && Number(applied.factor) !== 1);
  if (movedUnverified && SOURCED_LABELS.includes(hostLabel)) {
    hostLabel = HOST_LABELS.SOURCED_THEN_ADJUSTED;
  }

  return {
    // True when an unverified multiplier moved the figure — so a caller that
    // wants to say more than the label can (the factor itself, the author's own
    // "needs verification" note) has the fact rather than having to re-derive it.
    adjustedUnverified: movedUnverified,
    // `pq` throughout — a migrated cost-only line has no quantity provenance, and
    // reports that honestly as a null basis rather than borrowing the price's.
    basis: pq.tier || null,
    basisFamily: basisDef ? basisDef.family : null,
    basisLabel: basisDef ? basisDef.label : null,
    basisRecorded: !offLadder,
    authoredBaseline: false,
    verification: pq.verificationStatus,
    verificationLabel: verDef ? verDef.label : null,
    rationale: pq.rationale || null,
    hostLabel,
    directCitationEligible,
    // The app may lead with any claim whose basis someone recorded and classified.
    // This is the point of the reset: governance protects recommendations, it does
    // not replace them.
    recommendationEligible: !offLadder,
    offLadder,
    sources: pq.sources,
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
