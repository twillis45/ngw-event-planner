// INTEL-1 P1 — Host Intelligence store + reader (INERT).
//
// Level-4 memory: learned operational behavior, stored as reconciled estimate-vs-reality
// OBSERVATIONS (facts, not conclusions). This module is PURE and INERT — it defines the shape,
// a reader, and append/clear helpers. It does NOT change any estimate, recommendation, or plan,
// and NOTHING in the app consumes it yet (that is P4, gated by the readers registry).
//
// Spec: docs/architecture/INTEL_1_HOST_INTELLIGENCE_PROFILE.md
//       docs/architecture/INTELLIGENCE_READERS_REGISTRY.md
//
// Privacy: store operational ratios/counts/strings only — NEVER guest PII. Observations are
// { eventId, date, estimate, actual } (+ optional string label for named lists). Nothing here
// accepts or retains a guest name, address, or per-guest datum.

const MAX_OBS = 8;          // keep only the last N observations per rollup
const STALE_MONTHS = 18;    // observations older than this stop counting toward confidence

export const CONFIDENCE = { NONE: 'None', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
export const STABILITY  = { NONE: 'None', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

// A domain a consumer can query. `food` is special (per-item, keyed by canonical item id).
export const DOMAINS = ['attendance', 'food', 'budget', 'cooking', 'guests', 'weather', 'shopping', 'equipment'];

// The canonical EMPTY host-intelligence object — the honest-empty default so no caller needs a guard.
export const emptyHostIntelligence = () => ({ version: 1, eventsObserved: 0, domains: {} });

// The honest-empty rollup a reader returns for an absent / thin / malformed domain.
const emptyRollup = () => ({
  n: 0, freshN: 0, ratio: null,
  confidence: CONFIDENCE.NONE, stability: STABILITY.NONE,
  applicable: false,           // P1 never acts on this; P4 readers gate on it (Medium+ conf AND stab)
  observations: [],            // explainability: the facts behind the ratio (empty here)
});

// ── helpers (pure) ──────────────────────────────────────────────────────────
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const num = (x) => (typeof x === 'number' && isFinite(x) ? x : null);

function monthsBetween(iso, now) {
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return Infinity; // undatable ⇒ treat as stale (can't trust its recency)
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function confidenceFor(freshN) {
  if (freshN <= 0) return CONFIDENCE.NONE;
  if (freshN <= 2) return CONFIDENCE.LOW;
  if (freshN <= 4) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.HIGH;
}

// Stability = spread (coefficient of variation) of the ratios. Needs ≥2 to assess consistency.
function stabilityFor(ratios) {
  const vals = ratios.filter((r) => num(r) != null && r > 0);
  if (vals.length < 2) return STABILITY.NONE;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return STABILITY.NONE;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const cv = Math.sqrt(variance) / mean;
  if (cv <= 0.08) return STABILITY.HIGH;   // tight — a real, repeatable pattern
  if (cv <= 0.15) return STABILITY.MEDIUM; // some spread
  return STABILITY.LOW;                    // volatile (e.g. 72–125% swings) — keep asking, don't automate
}

const rank = { None: 0, Low: 1, Medium: 2, High: 3 };
const atLeastMedium = (level) => rank[level] >= rank.Medium;

// Recency-weighted mean of ratios (latest observation weighs most). Deterministic.
function weightedRatio(ratios) {
  const pairs = ratios.map((r, i) => [r, i + 1]).filter(([r]) => num(r) != null && r > 0);
  if (!pairs.length) return null;
  const wsum = pairs.reduce((a, [, w]) => a + w, 0);
  return pairs.reduce((a, [r, w]) => a + r * w, 0) / wsum;
}

// Turn a stored observation list into a computed rollup. `now` is injectable for testing.
function rollupFrom(observations, now) {
  if (!Array.isArray(observations) || observations.length === 0) return emptyRollup();
  // Keep only well-formed, positive-estimate observations; cap to the last MAX_OBS.
  const clean = observations
    .filter((o) => isObj(o) && num(o.estimate) != null && o.estimate > 0 && num(o.actual) != null)
    .slice(-MAX_OBS)
    .map((o) => ({ eventId: o.eventId, date: o.date, estimate: o.estimate, actual: o.actual, ratio: o.actual / o.estimate }));
  if (clean.length === 0) return emptyRollup();
  const fresh = clean.filter((o) => monthsBetween(o.date, now) <= STALE_MONTHS);
  const ratios = clean.map((o) => o.ratio);
  const confidence = confidenceFor(fresh.length);
  const stability = stabilityFor(ratios);
  return {
    n: clean.length,
    freshN: fresh.length,
    ratio: weightedRatio(ratios),
    confidence,
    stability,
    applicable: atLeastMedium(confidence) && atLeastMedium(stability), // P4 gate; exposed, never acted on here
    observations: clean, // explainability: the exact facts a `because` would cite
  };
}

// ── the reader ──────────────────────────────────────────────────────────────
// hostIntel(profile[, asOf]) → an inert view over the profile's learned memory.
//   .present            — is there any stored intelligence?
//   .eventsObserved     — reconciled-event count (master confidence signal)
//   .get(domain)        — rollup for a non-food domain (honest-empty if absent)
//   .getFood(itemId)    — rollup for one food item (keyed by canonical id)
//   .list(domain)       — named-list domains (shopping.stores / equipment.owns|borrows) → array
//   .raw                — the stored object (for inspect/delete at the data level)
// Absent or malformed profile ⇒ every query returns honest-empty; never throws.
export function hostIntel(profile, asOf) {
  const hi = (isObj(profile) && isObj(profile.hostIntelligence)) ? profile.hostIntelligence : null;
  const now = asOf ? new Date(asOf) : new Date();
  const domains = (hi && isObj(hi.domains)) ? hi.domains : {};
  return {
    present: !!hi,
    eventsObserved: (hi && num(hi.eventsObserved)) || 0,
    get: (domain) => rollupFrom(isObj(domains[domain]) ? domains[domain].observations : null, now),
    getFood: (itemId) => {
      const items = (isObj(domains.food) && isObj(domains.food.items)) ? domains.food.items : {};
      return rollupFrom(isObj(items[itemId]) ? items[itemId].observations : null, now);
    },
    list: (domain, key) => {
      const d = domains[domain];
      if (!isObj(d)) return [];
      const arr = key ? d[key] : d.items;
      return Array.isArray(arr) ? arr.slice() : [];
    },
    raw: hi || null,
  };
}

// ── append helpers (pure — for P2 reconciliation capture; nothing calls them in P1) ──────────
// Each returns a NEW hostIntelligence object (immutable); dedupes by eventId; caps at MAX_OBS.
// Observations carry ONLY { eventId, date, estimate, actual } — no PII.

function pushObs(list, obs) {
  const clean = { eventId: obs.eventId, date: obs.date, estimate: num(obs.estimate), actual: num(obs.actual) };
  const kept = (Array.isArray(list) ? list : []).filter((o) => isObj(o) && o.eventId !== clean.eventId);
  return [...kept, clean].slice(-MAX_OBS);
}

export function appendObservation(hostIntelligence, domain, obs) {
  const hi = isObj(hostIntelligence) ? hostIntelligence : emptyHostIntelligence();
  const domains = isObj(hi.domains) ? hi.domains : {};
  const prev = isObj(domains[domain]) ? domains[domain] : {};
  return {
    ...hi,
    version: 1,
    domains: { ...domains, [domain]: { ...prev, observations: pushObs(prev.observations, obs) } },
  };
}

export function appendFoodObservation(hostIntelligence, itemId, obs) {
  const hi = isObj(hostIntelligence) ? hostIntelligence : emptyHostIntelligence();
  const domains = isObj(hi.domains) ? hi.domains : {};
  const food = isObj(domains.food) ? domains.food : {};
  const items = isObj(food.items) ? food.items : {};
  const prev = isObj(items[itemId]) ? items[itemId] : {};
  return {
    ...hi,
    version: 1,
    domains: { ...domains, food: { ...food, items: { ...items, [itemId]: { ...prev, observations: pushObs(prev.observations, obs) } } } },
  };
}

// Bump the reconciled-event counter (call once per fully-reconciled event, in P2).
export function markEventObserved(hostIntelligence) {
  const hi = isObj(hostIntelligence) ? hostIntelligence : emptyHostIntelligence();
  return { ...hi, version: 1, eventsObserved: ((num(hi.eventsObserved)) || 0) + 1 };
}

// ── P2: Reality Reconciliation write (pure, idempotent by eventId) ────────────
// Build the reconciled observations from a single "how'd it go?" entry. SKIPPED fields write
// NOTHING (no fake observations). Re-applying the same eventId edits in place (dedupe) and does
// not double-count eventsObserved. Malformed input ⇒ builds from an empty store, never throws.
//
// entry = {
//   eventId, date,
//   attendance: { planned, actual } | null,
//   food:       [ { itemId, planned, consumedRatio } ] | null,   // consumedRatio: none=1, some=.85, lots=.65
//   budget:     { estimate, ratio } | null,                       // ratio: under=.85, right=1, over=1.2
//   ice:        { ratio } | null,                                 // short=1.4, right=1, too-much=.7 (estimate=1)
//   lesson:     string | null,                                    // host free-text note (no PII stored structurally)
// }
export function applyReconciliation(hostIntelligence, entry) {
  let hi = isObj(hostIntelligence) ? hostIntelligence : emptyHostIntelligence();
  const e = isObj(entry) ? entry : {};
  const eventId = e.eventId;
  if (!eventId) return hi; // never write without a real event key
  const date = e.date;
  let wrote = false;

  if (isObj(e.attendance) && num(e.attendance.planned) > 0 && num(e.attendance.actual) != null) {
    hi = appendObservation(hi, 'attendance', { eventId, date, estimate: e.attendance.planned, actual: e.attendance.actual });
    wrote = true;
  }
  (Array.isArray(e.food) ? e.food : []).forEach((f) => {
    if (isObj(f) && f.itemId && num(f.planned) > 0 && num(f.consumedRatio) != null) {
      hi = appendFoodObservation(hi, f.itemId, { eventId, date, estimate: f.planned, actual: f.planned * f.consumedRatio });
      wrote = true;
    }
  });
  if (isObj(e.budget) && num(e.budget.estimate) > 0 && num(e.budget.ratio) != null) {
    hi = appendObservation(hi, 'budget', { eventId, date, estimate: e.budget.estimate, actual: e.budget.estimate * e.budget.ratio });
    wrote = true;
  }
  if (isObj(e.ice) && num(e.ice.ratio) != null) {
    hi = appendObservation(hi, 'weather', { eventId, date, estimate: 1, actual: e.ice.ratio });
    wrote = true;
  }
  if (e.lesson && String(e.lesson).trim()) {
    const kept = (Array.isArray(hi.lessons) ? hi.lessons : []).filter((l) => isObj(l) && l.eventId !== eventId);
    hi = { ...hi, lessons: [...kept, { eventId, date, text: String(e.lesson).trim() }].slice(-20) };
    wrote = true;
  }

  if (!wrote) return hi; // all fields skipped ⇒ existing store unchanged, nothing reconciled

  const reconciled = { ...(isObj(hi.reconciled) ? hi.reconciled : {}), [eventId]: date || true };
  return { ...hi, version: 1, reconciled, eventsObserved: Object.keys(reconciled).length };
}

// Has this event already been reconciled? (for the card's idempotent "saved / edit" state)
export function isReconciled(profile, eventId) {
  const hi = (isObj(profile) && isObj(profile.hostIntelligence)) ? profile.hostIntelligence : null;
  return !!(hi && isObj(hi.reconciled) && eventId && hi.reconciled[eventId]);
}

// ── delete at the data level (privacy guarantee) ─────────────────────────────
export function clearDomain(hostIntelligence, domain) {
  const hi = isObj(hostIntelligence) ? hostIntelligence : emptyHostIntelligence();
  const domains = { ...(isObj(hi.domains) ? hi.domains : {}) };
  delete domains[domain];
  return { ...hi, domains };
}

export function clearAllHostIntelligence() { return emptyHostIntelligence(); }
