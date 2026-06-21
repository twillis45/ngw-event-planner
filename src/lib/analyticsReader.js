// ANALYTICS-1 — Analytics Reader (Admin Analytics suite).
//
// A PURE, OFFLINE reader over an events[] array (the localStorage 'ngw-events'
// book). It does NOT persist, fetch, or own state — same discipline as
// eventMemory.js / disclosure.js. Every function takes the events array and
// returns a small aggregate object.
//
// HONESTY GUARDRAIL: this aggregates only THIS browser's events — it is NOT a
// fleet metric. The fleet/behavioral funnel lives server-side (activation API)
// and in PostHog. The Admin console panels that consume these readers MUST say
// so prominently.
//
// ESM-only (per the prod-bundle lesson — no CJS module.exports in src/).

import { getPlaybook } from './playbooks';
import { eventCulturalMeta, isAtHome, placePhrase } from './doItForMe';
import { getLesson } from './eventMemory';

// ── Seed / sample filtering ───────────────────────────────────────────────────
// App.js owns the canonical SEED_EVENT_IDS set; we do NOT import from there (it
// is concurrently edited and not exported). A reasonable, documented prefix check
// covers the seed id conventions: bundled sample events use 'ev-' ids and seed
// clients use 'cl-' ids. Real events created in-app use uuid-ish / 'evt-' ids, so
// this drops the demo content without touching real books. Conservative: when in
// doubt we KEEP the event (favor showing real data over hiding it).
const isSeedId = (id) => {
  const s = String(id || '');
  return /^ev-/.test(s) || /^cl-/.test(s);
};

const arr = (x) => (Array.isArray(x) ? x : []);
const realEvents = (events) => arr(events).filter((e) => e && !isSeedId(e.id));

const guestCountOf = (e) =>
  Number(e && e.guestCount) ||
  Number(e && e.guestEstimate) ||
  (e && Array.isArray(e.guests) ? e.guests.length : 0) ||
  0;

const hasOutcomes = (e) => Boolean(e && e.outcomes && e.outcomes.capturedAt);

// Vendors actually committed (Confirmed / Booked) — mirrors eventMemory's "used".
const confirmedVendors = (e) =>
  arr(e && e.vendors).filter(
    (v) => v && (v.status === 'Confirmed' || v.status === 'Booked'),
  );

// ── playbookCoverage(events) ──────────────────────────────────────────────────
// Which event TYPES in this book have a registered playbook, and which real types
// have none. byType counts events per (raw) type; unmatchedTypes lists the distinct
// types with no playbook match.
export function playbookCoverage(events) {
  const evs = realEvents(events);
  const byType = {};
  const unmatched = new Set();
  for (const e of evs) {
    const type = String((e && e.type) || 'Unknown').trim() || 'Unknown';
    byType[type] = (byType[type] || 0) + 1;
    if (!getPlaybook(type)) unmatched.add(type);
  }
  return { byType, total: evs.length, unmatchedTypes: [...unmatched] };
}

// ── culturalMix(events) ───────────────────────────────────────────────────────
// Sombre vs festive split + a per-voice tally, from eventCulturalMeta (one source
// of truth with the invite voice).
export function culturalMix(events) {
  const evs = realEvents(events);
  let sombre = 0;
  let festive = 0;
  const byVoice = {};
  for (const e of evs) {
    const meta = eventCulturalMeta(e) || {};
    if (meta.sombre) sombre += 1;
    else festive += 1;
    const voice = meta.voice || 'other';
    byVoice[voice] = (byVoice[voice] || 0) + 1;
  }
  return { total: evs.length, sombre, festive, byVoice };
}

// ── locationSpread(events) ────────────────────────────────────────────────────
// Market distribution + the at-home share + how many events have no venue at all.
export function locationSpread(events) {
  const evs = realEvents(events);
  const byMarket = {};
  let atHome = 0;
  let missingVenue = 0;
  for (const e of evs) {
    const market = String((e && e.market) || '').trim() || 'Unspecified';
    byMarket[market] = (byMarket[market] || 0) + 1;
    if (isAtHome(e)) atHome += 1;
    if (!placePhrase(e)) missingVenue += 1;
  }
  const total = evs.length;
  return {
    total,
    byMarket,
    atHomeShare: total > 0 ? atHome / total : 0,
    missingVenueShare: total > 0 ? missingVenue / total : 0,
  };
}

// ── memoryDepth(events) ───────────────────────────────────────────────────────
// How much compounding signal the book carries: captured outcomes, written lessons,
// confirmed vendors tracked, and vendors rehired across ≥2 events.
export function memoryDepth(events) {
  const evs = realEvents(events);
  let eventsWithOutcomes = 0;
  let eventsWithLessons = 0;
  let vendorsTracked = 0;
  const vendorCounts = new Map(); // normalized name → distinct-event count
  for (const e of evs) {
    if (hasOutcomes(e)) eventsWithOutcomes += 1;
    if (getLesson(e)) eventsWithLessons += 1;
    const used = confirmedVendors(e);
    vendorsTracked += used.length;
    const seenThisEvent = new Set();
    for (const v of used) {
      const key = String((v && v.name) || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key || seenThisEvent.has(key)) continue;
      seenThisEvent.add(key);
      vendorCounts.set(key, (vendorCounts.get(key) || 0) + 1);
    }
  }
  let rehiredVendors = 0;
  for (const count of vendorCounts.values()) if (count >= 2) rehiredVendors += 1;
  return { eventsWithOutcomes, eventsWithLessons, vendorsTracked, rehiredVendors };
}

// ── funnelContent(events) ─────────────────────────────────────────────────────
// A LOCAL content funnel (this book only): qualified (date + guest count), has a
// run-of-show, captured outcomes, and recorded decisions. NOT the behavioral funnel
// (that's PostHog) — just "how complete is the content the host actually entered".
export function funnelContent(events) {
  const evs = realEvents(events);
  let qualified = 0;
  let withRos = 0;
  let withOutcomes = 0;
  let withDecisions = 0;
  for (const e of evs) {
    if (e && e.date && guestCountOf(e) > 0) qualified += 1;
    if (arr(e && e.ros).length > 0) withRos += 1;
    if (hasOutcomes(e)) withOutcomes += 1;
    if (arr(e && e.decisionMemory).length > 0) withDecisions += 1;
  }
  return { total: evs.length, qualified, withRos, withOutcomes, withDecisions };
}
