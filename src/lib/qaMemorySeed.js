// ── INTEL-QA-1 Stage 1D-A — QA Memory Seeder (dev/test ONLY) ─────────────────
//
// Purpose: create 3–5 valid, stable attendance observations in a profile so that
// `attendanceAdjustment` returns `applied: true` and R1 fires during an activation
// test run. No production user ever calls this code.
//
// PRODUCTION GATE: every exported function throws in process.env.NODE_ENV === 'production'.
// CRA bakes NODE_ENV at build time; the deployed GitHub Pages bundle can never call this.
//
// QA FLAGS: each seeded observation carries  `_qa: true` + `_qaSource: 'qa-seed'`
// so that any future Stage 2 scoring pipeline can filter them out with:
//   obs.filter(o => !o._qa)
// The flag also flows into the intelEvaluation record via the `metadata._qa` field
// (see `applyQaSeedMeta` below), which the admin Intelligence tab already renders.
//
// PII: none. Observations hold only { eventId, date, estimate, actual } + the QA
// flags. No guest names, emails, or real identifiers enter the store.
//
// ── Activation test protocol ─────────────────────────────────────────────────
// In a dev/local browser console (or a Jest test), run:
//
//   import { applyQaSeed } from './lib/qaMemorySeed';
//   // 1. Seed attendance memory onto the profile
//   const seededProfile = applyQaSeed(currentProfile);
//   // 2. Persist it via the normal profile update path:
//   //    setProfile(p => applyQaSeed(p))
//   // 3. Open the Plan tab on a cloud-synced event with a real guest count.
//   //    R1 fires → intelEvaluation frozen → debounced saveEvent() flushes to Supabase.
//   // 4. Open ?admin=1 → Intelligence tab.
//   //    Server Fleet badge + records table must show the new record.
//
// See: docs/architecture/INTEL-QA-1_STAGE_1D_A_ACTIVATION_PROCEDURE.md
// ─────────────────────────────────────────────────────────────────────────────

// Canonical QA markers — shared so the admin reader and Stage 2 can filter by the same value.
export const QA_SOURCE = 'qa-seed';
export const QA_ID_PREFIX = '_qa_seed_';

// Default observation parameters that guarantee R1 fires:
//   • 5 observations → confidence = High (> 4 fresh ⇒ High per confidenceFor())
//   • ratios tightly clustered at ~0.87 (CV ≈ 0.014 → stability = High ≤ 0.08)
//   • All within the past 7 months → all fresh (well inside 18-month recency window)
//   • ratio × planned ≠ planned (0.87 × 40 = 35 ≠ 40) → non-trivial adjustment ⇒ applied = true
const DEFAULTS = {
  n: 5,
  plannedCount: 40,
  ratios: [0.875, 0.850, 0.900, 0.875, 0.875],   // mean ~0.875, CV ~0.018 → High stability
  monthsBack: [1, 2, 3, 5, 7],
  asOf: null,                                       // null → current date
};

function productionGuard(fnName) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[INTEL-QA-1] qaMemorySeed.${fnName} must not run in production. ` +
      'NODE_ENV is "production". This utility is dev/test only.',
    );
  }
}

function isoDate(base, monthsAgo) {
  const d = new Date(base);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

// ── makeQaObservation ────────────────────────────────────────────────────────
// Returns one attendance observation tagged as QA. estimate and actual are
// integers (matching the real store's rounding). No PII fields.
export function makeQaObservation(eventId, planned, ratio, date) {
  productionGuard('makeQaObservation');
  const actual = Math.max(0, Math.round(planned * ratio));
  return {
    eventId,
    date,
    estimate: planned,
    actual,
    _qa: true,
    _qaSource: QA_SOURCE,
  };
}

// ── makeQaAttendanceProfile ──────────────────────────────────────────────────
// Returns a MINIMAL profile object whose hostIntelligence.domains.attendance
// contains n QA-flagged observations that will make attendanceAdjustment() fire.
// Does NOT touch any other profile field — this is a bare seed profile only.
// Merge it with a real profile using applyQaSeed().
export function makeQaAttendanceProfile(opts = {}) {
  productionGuard('makeQaAttendanceProfile');
  const { n, plannedCount, ratios, monthsBack, asOf } = { ...DEFAULTS, ...opts };
  const base = asOf ? new Date(asOf) : new Date();
  const observations = Array.from({ length: n }, (_, i) => (
    makeQaObservation(
      `${QA_ID_PREFIX}${i}`,
      plannedCount,
      ratios[i] != null ? ratios[i] : DEFAULTS.ratios[i % DEFAULTS.ratios.length],
      isoDate(base, monthsBack[i] != null ? monthsBack[i] : i + 1),
    )
  ));
  return {
    hostIntelligence: {
      version: 1,
      eventsObserved: n,
      domains: { attendance: { observations } },
    },
  };
}

// ── applyQaSeed ──────────────────────────────────────────────────────────────
// Merges QA observations into an existing profile. Real (non-QA) observations
// are preserved. If n existing real observations are present and they already
// make R1 eligible, this is a safe no-op in practice (attendanceAdjustment will
// use the merged list, but the result is still applied: true).
//
// Usage: setProfile(p => applyQaSeed(p))
export function applyQaSeed(profile, opts = {}) {
  productionGuard('applyQaSeed');
  const seed = makeQaAttendanceProfile(opts);
  const seedObs = seed.hostIntelligence.domains.attendance.observations;

  const existingHI = profile?.hostIntelligence ?? {};
  const existingDomains = existingHI?.domains ?? {};
  const existingAttObs = existingDomains?.attendance?.observations ?? [];

  // Preserve real observations; append QA ones (never overwrite real data).
  const realObs = Array.isArray(existingAttObs)
    ? existingAttObs.filter((o) => !o?._qa)
    : [];
  const merged = [...realObs, ...seedObs];

  return {
    ...profile,
    hostIntelligence: {
      ...existingHI,
      version: 1,
      // eventsObserved counts reconciled real events (not QA fixtures); keep existing.
      eventsObserved: existingHI.eventsObserved ?? 0,
      domains: {
        ...existingDomains,
        attendance: {
          ...(existingDomains.attendance ?? {}),
          observations: merged,
        },
      },
    },
  };
}

// ── removeQaSeed ─────────────────────────────────────────────────────────────
// Strips all QA observations from the attendance domain. Call this after the
// activation test run to restore the profile to its pre-seed state.
export function removeQaSeed(profile) {
  productionGuard('removeQaSeed');
  const hi = profile?.hostIntelligence;
  if (!hi) return profile;
  const domains = hi?.domains ?? {};
  const attObs = domains?.attendance?.observations ?? [];
  const cleaned = Array.isArray(attObs) ? attObs.filter((o) => !o?._qa) : [];
  return {
    ...profile,
    hostIntelligence: {
      ...hi,
      domains: {
        ...domains,
        attendance: { ...(domains.attendance ?? {}), observations: cleaned },
      },
    },
  };
}

// ── isQaSeeded ───────────────────────────────────────────────────────────────
// True when ALL attendance observations in the profile carry the QA flag.
// Useful for admin diagnostics ("this profile is seeded; its R1 evals don't count").
export function isQaSeeded(profile) {
  const obs = profile?.hostIntelligence?.domains?.attendance?.observations ?? [];
  return obs.length > 0 && obs.every((o) => o?._qa === true);
}

// ── hasAnyQaObs ──────────────────────────────────────────────────────────────
// True when the profile contains at least one QA observation. Looser than
// isQaSeeded — use this to warn when a mixed real+QA profile would produce a
// QA-influenced R1 eval record.
export function hasAnyQaObs(profile) {
  const obs = profile?.hostIntelligence?.domains?.attendance?.observations ?? [];
  return Array.isArray(obs) && obs.some((o) => o?._qa === true);
}

// ── applyQaSeedMeta ──────────────────────────────────────────────────────────
// Returns an extra metadata block to include in the intelEvaluation record when
// the observation pool that fired R1 is known to contain QA observations.
// Callers: FoodPlan capture step (manual integration — see activation procedure).
// Stage 2 scoring must exclude records where metadata._qa === true.
export function applyQaSeedMeta() {
  productionGuard('applyQaSeedMeta');
  return { _qa: true, _qaSource: QA_SOURCE };
}
