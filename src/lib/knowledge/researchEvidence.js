// ─── WHAT AN ADMIN RESEARCH RUN IS ALLOWED TO WRITE ─────────────────────────
//
// MEASURED 2026-09-26 (docs/audits/2026-09-26_PRICE_PATH_COHERENCE.md). The
// admin console wrote its research results straight into `costProvenance`:
//
//     verificationStatus: 'researched',
//     tier: 'researched',
//     sources: result.providersUsed || [],     // <- fam.label, a DISPLAY STRING
//     researchedAt: asOf,
//
// `providersUsed` is built as `usedFamilies.push(fam.label)` — the human-readable
// name of a provider family, never an id. Two systems read `sources` and both
// require ids that resolve in a registry, so the object judged by each of them:
//
//     isGroundedCost .............. false
//     hostLabel ................... "Needs confirmation"
//     source ids resolving ........ 0 of 2
//     ratchet counts it a claim ... true
//     ratchet uncorroborated ...... true   (one provider family, the common case)
//
// So a SUCCESSFUL research run made the host's badge worse — a just-researched
// row landed on the most doubtful label the system has — and pushed the
// uncorroborated baseline up at the same time. Nothing errored.
//
// ── THE RULING (owner, 2026-09-26): option B with C folded in ──────────────
//
// B. A research run records what it found under its OWN name. It never writes
//    `sources`, because `sources` means "ids that resolve in a curated
//    registry" to every reader in this repo, and a provider family is not one.
//
// C. It does not claim a `verificationStatus` no id backs. The existing status
//    is preserved exactly. A run that cites nothing registered has not changed
//    what is proven, and saying otherwise is the whole defect.
//
// It also does NOT write `researchedAt`. That field is read as freshness for
// the claim's SOURCES, and this run did not touch them; stamping it would
// freshen a claim nothing re-verified — the same overclaim in a third place.
//
// WHAT THIS DELIBERATELY DOES NOT DO. It does not mint registry entries (option
// A). That is the right destination if admin research is ever meant to produce
// publishable grounding, but registry entries carry curated `claim` and
// `sufficientWhen` prose, and a machine writing those honestly is a project,
// not a field assignment.

/** The field an admin research run owns. Nothing else reads it as a citation. */
export const RESEARCH_EVIDENCE_FIELD = 'researchEvidence';

/**
 * Record a research run on a provenance block WITHOUT making any claim about
 * what is proven. Returns a new block; the input is not mutated.
 *
 * Everything the caller knows about the run goes in one place, so a later
 * reader can see that research happened, when, and against which providers —
 * and can tell at a glance that it added no registered source.
 */
export function recordResearchRun(prov, { providers, at, evidenceCount } = {}) {
  const base = (prov && typeof prov === 'object') ? prov : {};
  const list = Array.isArray(providers) ? providers.filter(Boolean).map(String) : [];
  return {
    ...base,
    [RESEARCH_EVIDENCE_FIELD]: {
      providers: list,
      at: at || null,
      evidenceCount: Number(evidenceCount) || 0,
      // Stated, not implied. A reader that finds this block knows the run did
      // not produce a citation, without having to know the history above.
      addedRegisteredSources: false,
    },
  };
}

/** True when a block carries a recorded run. Used by surfaces, never by a gate. */
export function hasResearchEvidence(prov) {
  const e = prov && prov[RESEARCH_EVIDENCE_FIELD];
  return !!(e && typeof e === 'object');
}

/**
 * A one-line, host-safe summary of the run, or null. Deliberately says what it
 * is — a look, not a proof — because the surfaces that show provenance are the
 * ones where overclaiming did the damage.
 */
export function researchEvidenceNote(prov) {
  if (!hasResearchEvidence(prov)) return null;
  const e = prov[RESEARCH_EVIDENCE_FIELD];
  const n = e.evidenceCount || 0;
  const who = (e.providers || []).join(', ');
  if (!n) return null;
  return `Checked ${n} result${n === 1 ? '' : 's'}${who ? ` via ${who}` : ''}${e.at ? ` on ${e.at}` : ''} — no registered source added.`;
}
