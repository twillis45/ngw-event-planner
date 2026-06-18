// Sprint 57K — Value-Level Confidence. Confidence travels WITH the number, not
// beside it. A value like "24 plates" looks exact, but it is a DERIVATION; this
// attaches its Pattern 014 certainty (Known / Likely / Estimated / Needs
// Verification / Unknown) directly to the value — no scores, no percentages, no
// custom system, no sixth category.
//
//   • PRESENTATION ONLY: classifies a value by its PROVENANCE using existing
//     signals (guestCountResolved, the value's source). No new calculation, no
//     altered output, no readiness/decision/quantity change.
//   • HONESTY over coverage: only values whose provenance is OBSERVABLE are
//     classified. Where provenance isn't persisted (e.g. budget manual-vs-estimate
//     — `event.budgetSource` does not exist at runtime), the value is DEFERRED, not
//     guessed (AP-005). User-entered counts are obviously Known ⇒ tagging them
//     everywhere would be confidence spam, so they're not surfaced by default.
//   • pi.valueConfidence flag default OFF ⇒ no tag ⇒ production identity.
//   • Persona changes only the WORD (host/operator/planner), never the level.

import { audiencePersona } from './nextActionRenderer';
import { guestCountResolved } from './playbooks';

export function valueConfidenceOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=valueConfidence / localStorage 'ngw-pi-valueConfidence'='0' / REACT_APP_PI_VALUE_CONFIDENCE='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=valueConfidence\b/.test(q)) return true;
      if (/[?&]pi-off=valueConfidence\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-valueConfidence');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_VALUE_CONFIDENCE === 'false');
}
export function valueConfidenceActive() { return valueConfidenceOn(); }

// The EXACTLY FIVE Pattern 014 value levels — no more.
export const VALUE_LEVELS = ['known', 'likely', 'estimated', 'needs_verification', 'unknown'];

// Provenance NOT observable at runtime ⇒ never classified (would invent certainty).
export const DEFERRED_VALUES = ['budget']; // event.budgetSource is creation-form-only, not persisted

// Level → persona word. Pattern-014 aligned (reuses the confidence-grammar family).
export const VALUE_WORDS = {
  known:              { host: 'Set',     operator: 'Confirmed', planner: 'Known' },
  likely:             { host: 'Likely',  operator: 'Likely',    planner: 'Likely' },
  estimated:          { host: 'About',   operator: 'Estimate',  planner: 'Estimated' },
  needs_verification: { host: 'Confirm', operator: 'Verify',    planner: 'Needs verification' },
  unknown:            { host: 'Not set', operator: 'Not set',   planner: 'Unknown' },
};

// valueConfidence(kind, event) → level | null. null = not classifiable (deferred /
// no value). Derived quantities are the high-value case: a quantity scaled from a
// KNOWN final count is 'likely'; from an estimate/uncertain count it's 'estimated'.
export function valueConfidence(kind, event) {
  if (!event || DEFERRED_VALUES.includes(kind)) return null;
  const gc = guestCountResolved(event);
  // A count is genuinely CONFIRMED only with a real guest list whose RSVPs are all
  // in. `guestCountResolved` treats an estimate-only number as "resolved" (it has
  // no pending RSVPs to block on) — but an estimate is NOT a confirmed count, so for
  // VALUE confidence we additionally require a list.
  const confirmedCount = (event.guests || []).length > 0 && gc.resolved;
  switch (kind) {
    // Derived per-guest quantities (plates, glasses, food, beverage, capacity):
    // never a confirmed inventory — Likely when the count is confirmed, else Estimated.
    case 'capacity':
    case 'supplies':
      return confirmedCount ? 'likely' : 'estimated';
    // The guest count value itself: confirmed list = Known; a working/estimate
    // number = Estimated; nothing yet = Unknown.
    case 'guestCount': {
      const n = Number(event.guestCount) || Number(event.guestEstimate) || (event.guests || []).length || 0;
      if (n <= 0) return 'unknown';
      return confirmedCount ? 'known' : 'estimated';
    }
    // Venue facts NGW can never confirm itself (capacity/parking/power) — AP-005.
    case 'venueCapacity':
      return 'needs_verification';
    default:
      return null; // user-entered counts (vendors/crew/seating/timeline) are Known but
                   // surfacing "Known" everywhere is spam — intentionally unclassified.
  }
}

// valueWord(level, event) → the persona-appropriate display word, or '' .
export function valueWord(level, event) {
  if (!level) return '';
  const w = VALUE_WORDS[level];
  if (!w) return '';
  const p = audiencePersona(event);
  return w[p === 'operator' ? 'operator' : p === 'planner' ? 'planner' : 'host'];
}
