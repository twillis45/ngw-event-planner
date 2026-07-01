// INTEL-1 P1 — Host Intelligence store + reader (INERT).
//
// Level-4 memory: learned operational behavior, stored as reconciled estimate-vs-reality
// OBSERVATIONS (facts, not conclusions). Pure. The store/reader/reconciliation/summary are inert;
// the ONLY read-forward is `attendanceAdjustment` (P4 R1), gated + clamped, registered in
// INTELLIGENCE_READERS_REGISTRY. No other engine consumes memory yet.
//
// Spec: docs/architecture/INTEL_1_HOST_INTELLIGENCE_PROFILE.md
//       docs/architecture/INTELLIGENCE_READERS_REGISTRY.md
//
// Privacy: store operational ratios/counts/strings only — NEVER guest PII. Observations are
// { eventId, date, estimate, actual } (+ optional string label for named lists). Nothing here
// accepts or retains a guest name, address, or per-guest datum.

const MAX_OBS = 8;          // keep only the last N observations per rollup
const STALE_MONTHS = 18;    // observations older than this stop counting toward confidence
const ATTENDANCE_CLAMP = 0.25; // P4 R1 — attendance memory may move the plan-to count at most ±25%

export const CONFIDENCE = { NONE: 'None', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
export const STABILITY  = { NONE: 'None', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

// A domain a consumer can query. `food` is special (per-item, keyed by canonical item id).
export const DOMAINS = ['attendance', 'food', 'budget', 'cooking', 'guests', 'weather', 'shopping', 'equipment'];

// The canonical EMPTY host-intelligence object — the honest-empty default so no caller needs a guard.
export const emptyHostIntelligence = () => ({ version: 1, eventsObserved: 0, domains: {} });

const REQUIRED_OBS = 3; // observations needed for Medium confidence (the eligibility floor)

// Applicability — the FIRST-CLASS contract every read-forward gates on (not a bare boolean). It
// bundles WHY a domain is/isn't eligible so every engine + the Observatory read the same shape.
function applicabilityFor(confidence, stability, n, freshN, lastUpdated) {
  const eligible = rank[confidence] >= rank.Medium && rank[stability] >= rank.Medium;
  let reason;
  if (eligible) reason = `${freshN} recent event${freshN === 1 ? '' : 's'} · ${confidence} confidence · ${stability} stability`;
  else if (rank[confidence] < rank.Medium) reason = n === 0 ? 'No events closed out yet' : `Only ${n} event${n === 1 ? '' : 's'} — still learning (need ${REQUIRED_OBS})`;
  else if (stability === STABILITY.LOW) reason = 'Varies too much to rely on yet';
  else reason = 'Not enough signal yet';
  return { eligible, reason, confidence, stability, observations: n, freshObservations: freshN, required: REQUIRED_OBS, lastUpdated: lastUpdated || null, staleAfterMonths: STALE_MONTHS, fresh: freshN > 0 };
}

// The honest-empty rollup a reader returns for an absent / thin / malformed domain.
const emptyRollup = () => ({
  n: 0, freshN: 0, ratio: null,
  confidence: CONFIDENCE.NONE, stability: STABILITY.NONE,
  applicable: false,           // = applicability.eligible (kept for back-compat)
  applicability: applicabilityFor(CONFIDENCE.NONE, STABILITY.NONE, 0, 0, null),
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
  const lastUpdated = clean[clean.length - 1].date || null;
  const applicability = applicabilityFor(confidence, stability, clean.length, fresh.length, lastUpdated);
  return {
    n: clean.length,
    freshN: fresh.length,
    ratio: weightedRatio(ratios),
    confidence,
    stability,
    applicable: applicability.eligible,   // = applicability.eligible (kept for back-compat)
    applicability,                         // the first-class contract every read-forward gates on
    lastUpdated,
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
// clearDomain handles the keyed domains AND the top-level `lessons` list.
export function clearDomain(hostIntelligence, domain) {
  const hi = isObj(hostIntelligence) ? hostIntelligence : emptyHostIntelligence();
  if (domain === 'lessons') { const next = { ...hi }; delete next.lessons; return next; }
  const domains = { ...(isObj(hi.domains) ? hi.domains : {}) };
  delete domains[domain];
  return { ...hi, domains };
}

export function clearAllHostIntelligence() { return emptyHostIntelligence(); }

// Profile-safe clears for the Settings UI — return a NEW profile with ONLY hostIntelligence
// changed; every other profile key is preserved (no accidental deletion of unrelated data).
export function clearMemoryDomain(profile, domain) {
  const p = isObj(profile) ? profile : {};
  return { ...p, hostIntelligence: clearDomain(p.hostIntelligence, domain) };
}
export function clearAllMemory(profile) {
  const p = isObj(profile) ? profile : {};
  return { ...p, hostIntelligence: clearAllHostIntelligence() };
}

// ── P3: plain-language summary for the "What Event Boss remembers" Settings section ──────────
// Pure. Turns stored observations into calm, human sentences — NO recommendations, no read-forward,
// no PII (observations only ever hold eventId/date/estimate/actual + host-typed lesson text).
const humanize = (id) => String(id || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const pctDelta = (r) => Math.round(Math.abs((num(r) || 1) - 1) * 100);
function noteFor(rollup) {
  let n = rollup.confidence === CONFIDENCE.LOW ? 'Just starting to learn this'
    : rollup.confidence === CONFIDENCE.MEDIUM ? 'Getting a feel for this' : 'Confident';
  if (rollup.stability === STABILITY.LOW) n += ' · but it varies a lot';
  return n;
}

export function summarizeHostIntel(profile, asOf) {
  const h = hostIntel(profile, asOf);
  const groups = [];
  if (!h.present) return { present: false, eventsObserved: 0, groups };

  const att = h.get('attendance');
  if (att.confidence !== CONFIDENCE.NONE && num(att.ratio) != null) {
    const d = pctDelta(att.ratio);
    groups.push({ domain: 'attendance', title: 'Guest turnout',
      lines: [d === 0 ? 'About the number you plan for shows up.' : `About ${d}% ${att.ratio < 1 ? 'fewer' : 'more'} guests show up than you plan for.`],
      note: noteFor(att) });
  }

  const foodItems = (h.raw && isObj(h.raw.domains) && isObj(h.raw.domains.food) && isObj(h.raw.domains.food.items)) ? h.raw.domains.food.items : {};
  const foodLines = Object.keys(foodItems).map((id) => {
    const r = h.getFood(id);
    if (r.confidence === CONFIDENCE.NONE || num(r.ratio) == null) return null;
    const d = pctDelta(r.ratio);
    if (d === 0) return `${humanize(id)}: usually about right.`;
    return r.ratio < 1 ? `${humanize(id)}: usually about ${d}% left over.` : `${humanize(id)}: usually runs about ${d}% short.`;
  }).filter(Boolean);
  if (foodLines.length) groups.push({ domain: 'food', title: 'Food amounts', lines: foodLines, note: '' });

  const bud = h.get('budget');
  if (bud.confidence !== CONFIDENCE.NONE && num(bud.ratio) != null) {
    const d = pctDelta(bud.ratio);
    groups.push({ domain: 'budget', title: 'Spending',
      lines: [d === 0 ? 'Spending lands about on your plan.' : `Spending runs about ${d}% ${bud.ratio > 1 ? 'over' : 'under'} your plan.`],
      note: noteFor(bud) });
  }

  const wx = h.get('weather');
  if (wx.confidence !== CONFIDENCE.NONE && num(wx.ratio) != null) {
    const d = pctDelta(wx.ratio);
    groups.push({ domain: 'weather', title: 'Ice & cooling',
      lines: [d === 0 ? 'Ice: about the amount you plan.' : `Ice: you tend to need about ${d}% ${wx.ratio > 1 ? 'more' : 'less'}.`],
      note: noteFor(wx) });
  }

  const lessons = (h.raw && Array.isArray(h.raw.lessons)) ? h.raw.lessons : [];
  if (lessons.length) groups.push({ domain: 'lessons', title: 'Your notes', lines: lessons.map((l) => `“${(l && l.text) || ''}”`), note: '' });

  return { present: groups.length > 0, eventsObserved: h.eventsObserved, groups };
}

// ── P4 · R1: attendance read-forward (the FIRST reader that changes a plan) ──────────────────
// Pure. Given the host's memory + this event, returns whether the plan-to headcount should shift,
// clamped to ±25%, ONLY when the attendance domain is applicable (Confidence ≥ Medium AND Stability
// ≥ Medium) and the host hasn't reverted it for this event. No memory / low confidence / unstable /
// reverted ⇒ `applied:false, suggested === planned` (existing behavior, exactly). The `because` is
// present ONLY when applied. Registered as R1 in INTELLIGENCE_READERS_REGISTRY.md.
export function attendanceAdjustment(profile, event, asOf) {
  const ev = isObj(event) ? event : {};
  const planned = Number(ev.guestCount) || Number(ev.guestEstimate) || 0;
  const r = hostIntel(profile, asOf).get('attendance');
  const base = {
    applied: false, planned, suggested: planned, ratio: 1, rawRatio: num(r.ratio),
    clamped: false, clampHit: null, because: null,
    confidence: r.confidence, stability: r.stability, n: r.n,
  };
  if (!planned) return base;
  if (ev.intelAttendanceReverted) return base;           // host kept their own number for this event
  if (!r.applicable || num(r.ratio) == null) return base; // gate: Medium+ confidence AND stability

  const lo = 1 - ATTENDANCE_CLAMP, hi = 1 + ATTENDANCE_CLAMP;
  const rawRatio = r.ratio;
  const ratio = Math.max(lo, Math.min(hi, rawRatio));
  const suggested = Math.max(0, Math.round(planned * ratio));
  if (suggested === planned) return base;                 // no visible change ⇒ don't dress it up

  const fewer = suggested < planned;
  return {
    applied: true, planned, suggested, ratio, rawRatio,
    clamped: ratio !== rawRatio,
    clampHit: ratio !== rawRatio ? (rawRatio > hi ? 'high' : 'low') : null,
    because: `Based on your last events, ${fewer ? 'fewer' : 'more'} people usually came than planned — size for ${suggested}?`,
    confidence: r.confidence, stability: r.stability, n: r.n,
  };
}

// The analytics payload for R1 (kept beside the reader so the applied/reverted events carry the same
// shape). Delta is the signed % the plan-to count moved.
export function attendanceAnalyticsPayload(adj) {
  const a = isObj(adj) ? adj : {};
  return {
    delta: a.planned ? Math.round(((a.suggested - a.planned) / a.planned) * 100) : 0,
    planned: a.planned || 0, suggested: a.suggested || 0,
    n: a.n || 0, confidence: a.confidence || CONFIDENCE.NONE, stability: a.stability || STABILITY.NONE,
    clamped: !!a.clamped,
  };
}
