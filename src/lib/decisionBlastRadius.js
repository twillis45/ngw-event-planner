// ─── HOW MUCH OPENS UP WHEN THIS ONE IS DECIDED ─────────────────────────────
//
// `DECISION_SCHEMA_SPEC.md` lists `blastRadius` as "decision · number (DERIVED
// from `blocks`/`dependsOn`) · graph → — → scorer · derivable now. How many
// downstream things it unblocks." It was never built.
//
// ── THE NAME COLLISION THAT COST AN HOUR ────────────────────────────────────
//
// `knowledge/dependencyEngine.js` already exports a `blastRadius`, and it is a
// COMPLETELY DIFFERENT THING: `blastRadius(playbook, fieldPath, graph)` answers
// "if I edit this knowledge field, which engines, readers, prompts and tests
// does it disturb?" — an authoring-safety tool for the knowledge graph. It
// takes a field path, not a decision, and returns a report, not a number.
//
// I reported the decision-level version as "already built, just needs wiring"
// on the strength of the name. It is not. This module is the decision one, and
// it is named `decisionBlastRadius` so the next reader does not repeat that.
//
// ── WHAT IS ACTUALLY DERIVABLE, MEASURED ────────────────────────────────────
//
// Two different downstream signals live on a decision, and only one is counted
// anywhere today:
//
//   `blocks`     — the SURFACES waiting on it (food, vendors, rentals…).
//                  250 of 260 decisions carry it, and CommandCenter already
//                  counts it as `unlocks: blocks.length`.
//   `dependsOn`  — the DECISIONS waiting on it. 67 entries across the corpus,
//                  28 distinct targets, and every one resolves to a real
//                  decision id. NOTHING counts this.
//
// The second is the interesting half for a ranker: "decide the venue and four
// other calls open up" is a different, stronger claim than "the venue touches
// four surfaces". It is also the only one that can be TRANSITIVE — a surface
// does not unblock another surface, but a decision unblocks a decision that
// unblocks a decision.
import { normalizeBlocks } from './blockVocabulary';

/**
 * Invert `dependsOn` into `unblocks` for one playbook.
 * `{ [decisionId]: [decisionId, …] }` — who is waiting on whom.
 */
export function unblockGraph(playbook) {
  const out = {};
  const decisions = (playbook && playbook.decisions) || [];
  const known = new Set(decisions.map((d) => d && d.id).filter(Boolean));
  for (const d of decisions) {
    for (const dep of (Array.isArray(d && d.dependsOn) ? d.dependsOn : [])) {
      // Only real ids — an unresolvable name would silently inflate every count
      // above it, which is the failure mode this whole module exists to avoid.
      if (!known.has(dep)) continue;
      (out[dep] ||= []).push(d.id);
    }
  }
  return out;
}

/**
 * Everything downstream of one decision, following `dependsOn` transitively.
 *
 * Cycle-safe: a corpus authored by hand can name a loop, and a naive walk would
 * hang rather than report. Visited ids are tracked, so a loop yields a finite
 * set and the cycle is reported rather than hidden.
 */
export function downstreamDecisions(playbook, decisionId, graph) {
  const g = graph || unblockGraph(playbook);
  const seen = new Set();
  const stack = [...(g[decisionId] || [])];
  let cycle = false;
  while (stack.length) {
    const id = stack.pop();
    if (id === decisionId) { cycle = true; continue; }
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of (g[id] || [])) stack.push(next);
  }
  return { ids: [...seen], cycle };
}

/**
 * The decision's blast radius.
 *
 * `{ surfaces, directDecisions, allDecisions, total, cycle }`
 *
 * `surfaces` and the decision counts are kept SEPARATE rather than summed into
 * one headline, because they are different claims and a caller that wants to
 * rank on "other calls open up" should not be handed a number inflated by
 * surface breadth. `total` is offered for the callers that genuinely want both.
 */
export function decisionBlastRadius(playbook, decision, graph) {
  if (!decision) return { surfaces: 0, directDecisions: 0, allDecisions: 0, total: 0, cycle: false };
  const g = graph || unblockGraph(playbook);
  const surfaces = normalizeBlocks(decision.blocks).length;
  const direct = (g[decision.id] || []).length;
  const { ids, cycle } = downstreamDecisions(playbook, decision.id, g);
  return {
    surfaces,
    directDecisions: direct,
    allDecisions: ids.length,
    total: surfaces + ids.length,
    cycle,
  };
}
