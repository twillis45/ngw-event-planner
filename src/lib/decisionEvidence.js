// ─── THE DECISION EVIDENCE ENVELOPE — intelligence that survives the boundary ──
//
// WHY THIS FILE EXISTS (intelligence audit, 2026-07-31).
//
// playbookDecisionBoard computes, per decision: a priority score, the sentence
// explaining that score (`rankReason`), whether importance was authored or
// derived, how much the call unblocks, and THIRTEEN grounded axes — each with a
// factor, a research tier, a verification status and cited source ids.
//
// None of it reached a recommendation. The audit traced the drop to two seams:
//
//   1. surfaceRegistry.raiseAll() — an explicit-field-list normalizer that copied
//      11 fields and silently dropped priorityScore, gateHolder, unlocks and ask.
//      Its own comment records that this is where `sourceCategory` died for
//      months; four more fields were still dying there.
//   2. Nothing downstream carried the axes or the citations at all.
//
// So a decision the board scored 308.5 — grounded against the ADA events guide,
// a venue-capacity standard and an NOAA outdoor-weather standard — arrived at the
// ranker as a bare date with a null score, and reached the host with no way to
// answer "why this?".
//
// This module is the CARRIER, not a new engine. It computes nothing the board did
// not already compute; it reads what is on the row, resolves cited source ids to
// their real citations, and states honestly how confident the row's own evidence
// permits us to be.
//
// PURE: no React, no I/O, no event mutation.
import { resolveGroundingSource } from './knowledge/groundingSources';
import { DEFERRED_DECISIONS } from './decisionConfidence';

// The thirteen axes playbookDecisionBoard attaches. Each contributes `<axis>Context`
// (the guidance object, or null) and `<axis>Grounded` (boolean).
export const GROUNDED_AXES = [
  'timing', 'cultural', 'military', 'destination', 'accessibility', 'cost',
  'legal', 'venue', 'weather', 'human', 'dietary', 'budget', 'childcare',
];

// A cost axis is grounded WITHOUT a context object (isGroundedCost reads the
// decision's costFactorProvenance, not a resolver), so absence of context is not
// absence of grounding — the flag is the truth.
function axisEntry(row, axis) {
  if (row[axis + 'Grounded'] !== true) return null;
  const ctx = row[axis + 'Context'] || null;
  return {
    axis,
    factor: (ctx && ctx.factor) || null,
    guideline: (ctx && ctx.guideline) || null,
    tier: (ctx && ctx.tier) || null,
    verificationStatus: (ctx && ctx.verificationStatus) || null,
    resolvedBy: (ctx && ctx.resolvedBy) || null,
    sources: Array.isArray(ctx && ctx.sources) ? ctx.sources.filter(Boolean) : [],
  };
}

// Resolve cited ids to real citations (org, url, fetched, claim). An id that
// resolves nowhere is kept as an unresolved marker rather than dropped — a
// citation we cannot back is a finding, not something to hide.
function citationsFor(ids) {
  const out = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    let s = null;
    try { s = resolveGroundingSource(id); } catch { s = null; }
    out.push(s
      ? { id, axis: s.axis, org: s.org || s.title || null, url: s.url || null, fetched: s.fetched || null, claim: s.claim || null, resolved: true }
      : { id, axis: null, org: null, url: null, fetched: null, claim: null, resolved: false });
  }
  return out;
}

// evidenceFromDecisionRow(row) → the envelope, or null when there is no row.
// Every field is READ from the row. Nothing here invents a number or a claim.
export function evidenceFromDecisionRow(row) {
  if (!row || row.id == null) return null;
  const decisionId = String(row.id);
  const groundedAxes = GROUNDED_AXES.map((a) => axisEntry(row, a)).filter(Boolean);
  const sources = citationsFor(groundedAxes.flatMap((a) => a.sources));
  const importanceBasis = row.importanceBasis || null;

  // CONFIDENCE — three honest states, derived only from what the row carries.
  //   grounded — at least one axis is grounded to a cited source
  //   authored — no grounded axis, but a human authored this decision's weight
  //   derived  — neither; importance was inferred from the decision's structure
  const confidence = groundedAxes.length ? 'grounded'
    : (importanceBasis === 'authored' ? 'authored' : 'derived');

  // UNCERTAINTY — said plainly, and only when true. Ordered most-limiting first.
  // The deferred list is decisionConfidence's own: those decisions have no
  // persisted state, so readiness cannot be claimed for them at all.
  let uncertaintyReason = null;
  if (DEFERRED_DECISIONS.includes(decisionId)) {
    uncertaintyReason = 'This decision has no persisted state, so NGW does not claim it is ready — only that it is open.';
  } else if (!groundedAxes.length && importanceBasis !== 'authored') {
    uncertaintyReason = 'No axis on this decision is grounded to a cited source, and its importance was derived from structure rather than authored.';
  } else if (!groundedAxes.length) {
    uncertaintyReason = 'No axis on this decision is grounded to a cited source; its ranking rests on authored weight alone.';
  } else if (importanceBasis === 'derived') {
    uncertaintyReason = 'Importance was derived from the decision’s structure, not authored by a human.';
  }

  return {
    decisionId,
    // No capability spine exists yet (audit finding D5). Carried when a row
    // declares one, null otherwise — never inferred from an id prefix.
    capabilityId: row.capabilityId != null ? String(row.capabilityId) : null,
    priorityScore: Number.isFinite(row.priorityScore) ? row.priorityScore : null,
    // The board's OWN sentence for why this ranks where it does.
    rankReason: row.rankReason || (row.priorityBasis && row.priorityBasis.rationale) || null,
    priorityTier: (row.priorityBasis && row.priorityBasis.tier) || null,
    importanceBasis,
    gateHolder: row.gateHolder === true,
    unlocks: Number.isFinite(row._dependedOnCount) ? row._dependedOnCount : 0,
    status: row.status || null,
    dueDate: row.dueDate || null,
    daysOut: Number.isFinite(row.daysOut) ? row.daysOut : null,
    groundedAxes,
    sources,
    confidence,
    uncertaintyReason,
  };
}

// explainEvidence(ev) → the plain-language answer to "Why did NGW recommend this?",
// as ordered lines. Every line is a fact from the envelope; when the envelope is
// thin the explanation is short and says so, rather than padding.
export function explainEvidence(ev) {
  if (!ev) return [];
  const lines = [];
  if (ev.rankReason) lines.push('Why it ranks here: ' + ev.rankReason);
  if (ev.priorityScore != null) {
    lines.push('Priority score ' + ev.priorityScore
      + (ev.importanceBasis ? ' (' + ev.importanceBasis + ' importance' + (ev.priorityTier ? ', ' + ev.priorityTier + ' basis' : '') + ')' : ''));
  }
  const plural = (n, one, many) => n + ' ' + (Math.abs(n) === 1 ? one : many);
  if (ev.gateHolder) lines.push('Settling it unblocks other work' + (ev.unlocks ? ' — ' + plural(ev.unlocks, 'decision depends', 'decisions depend') + ' on it.' : '.'));
  else if (ev.unlocks) lines.push(plural(ev.unlocks, 'decision depends', 'decisions depend') + ' on it.');
  if (ev.status === 'overdue' && ev.daysOut != null) lines.push('Its easy window closed ' + plural(Math.abs(ev.daysOut), 'day', 'days') + ' ago.');
  for (const a of ev.groundedAxes) {
    lines.push('Grounded on ' + a.axis + (a.factor ? ' — ' + a.factor : '')
      + (a.tier ? ' (' + a.tier + ')' : ''));
  }
  for (const s of ev.sources) {
    lines.push(s.resolved
      ? 'Source: ' + s.org + (s.url ? ' — ' + s.url : '') + (s.fetched ? ' (fetched ' + s.fetched + ')' : '')
      : 'Source id "' + s.id + '" does not resolve to a citation.');
  }
  lines.push('Confidence: ' + ev.confidence);
  if (ev.uncertaintyReason) lines.push('What we do not know: ' + ev.uncertaintyReason);
  return lines;
}
