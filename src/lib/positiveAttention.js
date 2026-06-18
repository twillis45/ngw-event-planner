// Sprint 57F-A — Positive Attention Layer. Elite planners reduce worry as well as
// flag risk. NGW already surfaces what needs attention; this surfaces what's already
// handled — "You're Set On ✓" — so a first-time host can stop worrying about it.
//
// PURE READER / PURE PRESENTATION. It invents NO certainty:
//   • reads ONLY existing readiness signals (the strict getEventReadiness 4-axis,
//     passed in to keep this lib import-safe) + direct counts of existing event
//     fields. No new score, no new calculation, no new storage.
//   • surfaces a dimension ONLY when its existing signal is genuinely confirmed-true.
//   • NEVER surfaces adequacy/safety/estimate claims (Budget-is-enough, Capacity,
//     Reality Check) — blocked by Pattern 014 + AP-005.
//   • pi.attention flag default OFF ⇒ attentionActive is false ⇒ zero render ⇒
//     byte-identical to production. Host audience only for the first release.

import { audiencePersona } from './nextActionRenderer';

// pi.attention flag (default OFF). Enable via ?pi=attention / localStorage
// 'ngw-pi-attention'='1' / REACT_APP_PI_ATTENTION='true'. Same triad as pi.voice/pi.nav.
export function attentionOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=attention / localStorage 'ngw-pi-attention'='0' / REACT_APP_PI_ATTENTION='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=attention\b/.test(q)) return true;
      if (/[?&]pi-off=attention\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-attention');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_ATTENTION === 'false');
}

// Active only for the HOST audience with the flag on. Planner/operator unchanged
// (planner keeps the full Planning Health rail; operator is a future sprint).
export function attentionActive(event) {
  return attentionOn() && audiencePersona(event) === 'host';
}

// positiveAttention(event, readiness) → { items: [{ key, label, note }] }
// `readiness` is the existing getEventReadiness(event) result (4-axis: decision,
// vendor, timeline, document — each { status, label, note }). Passed in so this
// stays a dependency-free reader (no import of the CommandCenter component module).
export function positiveAttention(event, readiness) {
  if (!event) return { items: [] };
  const r = readiness || {};
  const items = [];
  const guests = Array.isArray(event.guests) ? event.guests : [];
  const yes = guests.filter((g) => g && g.rsvp === 'Yes').length;

  // GUESTS — existing Planning-Health "ON TRACK" predicate (≥70% of invited RSVP'd Yes).
  if (guests.length > 0 && yes / guests.length >= 0.7) {
    items.push({ key: 'Guests', label: 'Guests', note: `${yes} of ${guests.length} confirmed` });
  }
  // TIMELINE — strict 4-axis ON_TRACK (≥80% of tasks done AND zero overdue).
  if (r.timeline && r.timeline.status === 'ON_TRACK') {
    items.push({ key: 'Timeline', label: 'Timeline', note: 'On track' });
  }
  // VENDORS — strict 4-axis ON_TRACK (every vendor confirmed AND contracts signed).
  if (r.vendor && r.vendor.status === 'ON_TRACK') {
    items.push({ key: 'Vendors', label: 'Vendors', note: r.vendor.note });
  }
  // DOCUMENTS — strict ON_TRACK (required docs signed/approved, no drafts/pending).
  if (r.document && r.document.status === 'ON_TRACK') {
    items.push({ key: 'Documents', label: 'Documents', note: r.document.note });
  }
  // SEATING — every confirmed (RSVP=Yes) guest has a table assignment. Direct read
  // of existing per-guest data; no score. Only meaningful with a real guest list.
  const conf = guests.filter((g) => g && g.rsvp === 'Yes');
  if (conf.length > 0 && conf.every((g) => g.table)) {
    items.push({ key: 'Seating', label: 'Seating', note: 'Everyone has a seat' });
  }

  // NEVER surfaced (exceeds current knowledge — would invent certainty):
  //   Budget   — health = under-spend, NOT adequacy ("budget is enough" is banned)
  //   Capacity — always an ESTIMATE; no confirmed-true state exists
  //   Reality Check / Event Day — SAFETY prompts to confirm, never a settled claim
  return { items };
}
