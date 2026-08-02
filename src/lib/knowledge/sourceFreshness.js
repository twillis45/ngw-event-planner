// ─── SOURCE FRESHNESS — a WARNING system, never an invalidator (Phase 5F.6 W3) ──
//
// WHAT ALREADY EXISTED, and why none of it was doing this job:
//
//   providerMonitor.js       Rules for provider FAMILIES (an abstract taxonomy), keyed
//                            off a `lastCheckedAt` map. In AdminConsole that map is
//                            `useState({})` and its setter is NEVER CALLED, so
//                            `overdueProviders({})` returns every family as
//                            "never-checked" forever. It cannot report anything else.
//                            **Decorative.**
//   grounding-monitor.yml    A monthly cron that runs `groundingAudit.mjs`. It lives at
//                            `ngw-event-planner/.github/`, one level ABOVE the git root
//                            (`demo/`), so it is untracked and has never run. **Dead.**
//   groundingAudit.mjs       Real and useful, but text-scans playbook files and reports
//                            "lastVerified stamps found: 1". **Runs only by hand.**
//   groundingSourceCatalog() Unions all 20 registries — and reads title/publisher/tier,
//                            never a DATE. **Freshness-blind.**
//
// So: freshness was recorded in 90 places and surfaced in none.
//
// WHAT THIS DOES. Reads the actual source registries, computes age from the `fetched`
// date each one already carries, and classifies it. That is the whole scope.
//
// WHAT THIS MUST NEVER DO — and there is a test for each:
//   - it does not invalidate a source
//   - it does not remove or weaken grounding (a stale source still grounds)
//   - it does not fetch anything
//   - it does not decide that a claim has changed; only that nobody has re-checked it
//
// A stale source is not a wrong source. It is a source nobody has looked at lately, and
// the only correct response is to tell a human.
//
// PURE: no I/O, no network, no storage. `asOf` is always passed in.
import { groundingSourceCatalog, resolveGroundingSource } from './groundingSources';

export const FRESHNESS_STATES = Object.freeze(['fresh', 'aging', 'stale', 'undated']);

// ── THE THREE METADATA FIELDS (Phase 5F.7 W3) ────────────────────────────────
//
// Freshness needs three DIFFERENT facts, and the corpus previously carried only the
// first. Conflating them is how a source looks current when nobody has checked it
// since the day it was first read:
//
//   fetched       CAPTURE      — when the page was first read. Never changes.
//   lastVerified  VERIFICATION — when a human last confirmed the claim still holds.
//                                Absent means "never re-checked since capture".
//   steward       OWNERSHIP    — who is responsible for re-checking it. 'unassigned'
//                                is an honest value and is reported as such; a source
//                                nobody owns will not be re-checked by anyone.
//
// AGE IS MEASURED FROM VERIFICATION WHERE ONE EXISTS, and from capture otherwise —
// because "we read it a year ago and confirmed it last week" is fresh, and the older
// date is the wrong one to warn on.
export const METADATA_FIELDS = Object.freeze(['fetched', 'lastVerified', 'steward']);

// ── THE HORIZONS ARE AN EDITORIAL POLICY, NOT A MEASURED DECAY RATE ──────────
//
// A single global threshold would be dishonest in both directions: it would call an FSIS
// safe-cooking-temperature chart stale while a July crab price stayed "fresh". So the
// axes NGW's NUMBERS depend on get a short horizon, and standards/traditions get a long
// one. Declared here so it can be argued with, and pinned by test so it cannot drift
// silently.
const VOLATILE_AXES = new Set(['Cost', 'Quantity']);
export const HORIZONS = Object.freeze({
  volatile: { aging: 60, stale: 90 },     // prices and per-guest portions genuinely move
  standard: { aging: 270, stale: 365 },   // regulations, safety guidance, cultural practice
});

export const horizonFor = (axis) => (VOLATILE_AXES.has(axis) ? HORIZONS.volatile : HORIZONS.standard);

const MS_PER_DAY = 86400000;

/** Whole days between two ISO dates, or null if either is unusable. */
export function ageInDays(fetched, asOf) {
  if (!fetched || !asOf) return null;
  const a = Date.parse(fetched); const b = Date.parse(asOf);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / MS_PER_DAY);
}

/**
 * sourceFreshness(asOf) -> { asOf, total, counts, rows[] }
 *
 * One row per registered source. Every row carries an `action` in plain words, because
 * a warning an operator cannot act on is just an alarm.
 */
export function sourceFreshness(asOf) {
  const rows = [];
  for (const group of groundingSourceCatalog()) {
    for (const s of group.sources) {
      const raw = resolveGroundingSource(s.id) || {};
      const fetched = raw.fetched || null;
      const lastVerified = raw.lastVerified || null;
      const steward = raw.steward || null;
      // Verification wins over capture: a source re-checked last week is fresh however
      // long ago it was first read.
      const basis = lastVerified || fetched;
      const age = ageInDays(basis, asOf);
      const h = horizonFor(group.axis);

      let state = 'undated';
      if (age != null) {
        if (age >= h.stale) state = 'stale';
        else if (age >= h.aging) state = 'aging';
        else state = 'fresh';
      }

      const missing = METADATA_FIELDS.filter((f) => !raw[f]);

      rows.push({
        id: s.id,
        axis: group.axis,
        org: raw.org || raw.publisher || raw.title || s.id,
        url: raw.url || '',
        fetched,
        lastVerified,
        steward: steward || 'unassigned',
        // 'unassigned' is a recorded value; a MISSING field is not the same thing, and
        // an operator needs to tell those apart.
        ownershipRecorded: !!steward,
        ageBasis: lastVerified ? 'lastVerified' : (fetched ? 'fetched' : null),
        missingMetadata: missing,
        ageDays: age,
        horizonDays: h.stale,
        state,
        action: actionFor(state, group.axis, age, h),
      });
    }
  }
  rows.sort((a, b) => rank(b.state) - rank(a.state)
    || (b.ageDays == null ? -1 : b.ageDays) - (a.ageDays == null ? -1 : a.ageDays)
    || a.id.localeCompare(b.id));

  const counts = Object.fromEntries(FRESHNESS_STATES.map((k) => [k, rows.filter((r) => r.state === k).length]));
  const metadata = {
    captured: rows.filter((r) => r.fetched).length,
    verified: rows.filter((r) => r.lastVerified).length,
    owned: rows.filter((r) => r.ownershipRecorded).length,
    complete: rows.filter((r) => !r.missingMetadata.length).length,
  };
  return { asOf, total: rows.length, counts, metadata, rows };
}

/** Sources missing one of the three metadata fields, worst first. */
export function metadataGaps(f) {
  return (f && f.rows ? f.rows : [])
    .filter((r) => r.missingMetadata.length)
    .sort((a, b) => b.missingMetadata.length - a.missingMetadata.length || a.id.localeCompare(b.id));
}

const rank = (s) => ({ stale: 3, undated: 2, aging: 1, fresh: 0 }[s] || 0);

function actionFor(state, axis, age, h) {
  if (state === 'undated') {
    return 'No fetch date recorded — nobody can tell whether this is current. '
      + 'Add the date it was retrieved.';
  }
  if (state === 'stale') {
    return `Last retrieved ${age} days ago, past the ${h.stale}-day horizon for ${axis}. `
      + 'Re-check the source and record a new date. It still grounds until a human says otherwise.';
  }
  if (state === 'aging') {
    return `Last retrieved ${age} days ago; due for re-check before ${h.stale} days.`;
  }
  return `Retrieved ${age} days ago. Within the ${h.stale}-day horizon for ${axis}.`;
}

/** One line for an operator. Reports; never instructs a removal. */
export function freshnessSummary(f) {
  if (!f || !f.total) return 'No registered sources.';
  const c = f.counts;
  const parts = [];
  if (c.stale) parts.push(`${c.stale} stale`);
  if (c.undated) parts.push(`${c.undated} undated`);
  if (c.aging) parts.push(`${c.aging} aging`);
  const m = f.metadata || {};
  const meta = `${m.verified || 0}/${f.total} re-verified, ${m.owned || 0}/${f.total} owned`;
  if (!parts.length) {
    return `All ${f.total} sources are within their re-check horizon (${meta}). `
      + 'Freshness is a warning — no grounding is withdrawn automatically.';
  }
  return `Sources: ${parts.join(', ')} of ${f.total} (${meta}). `
    + 'Freshness is a warning — no grounding is withdrawn automatically.';
}

/** The rows an operator should look at first. Never used to change runtime behaviour. */
export function needsRecheck(f) {
  return (f && f.rows ? f.rows : []).filter((r) => r.state === 'stale' || r.state === 'undated');
}
