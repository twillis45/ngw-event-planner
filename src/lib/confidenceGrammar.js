// Sprint 57G — Confidence Grammar (Pattern 014 made visible). The same `ON TRACK`
// token today means four different things — confirmed knowledge, a real risk, an
// estimate, and "no data yet" — which destroys trust. This layer remaps the
// rendered status WORD + COLOR by the actual certainty level, per persona, WITHOUT
// touching the predicate that produced the token (AP-002 fence).
//
//   • PRESENTATION ONLY: classify(row) reads the EXISTING statusLabel + note; it
//     changes no threshold, no readiness, no score. The engine still owns reality.
//   • The root fix: split ON TRACK / AT RISK by DATA-PRESENCE. "No budget set" reads
//     UNKNOWN ("Not set yet"), not a false-green ON TRACK nor a false-red AT RISK.
//   • pi.confidence flag default OFF ⇒ confidenceActive false ⇒ raw token renders ⇒
//     byte-identical to production.
//   • One Engine, One Truth, Many Presentations: host / planner / operator differ
//     only in WORDS, never in which level a row resolves to.

import { audiencePersona } from './nextActionRenderer';

// pi.confidence flag (default OFF). Enable via ?pi=confidence / localStorage
// 'ngw-pi-confidence'='1' / REACT_APP_PI_CONFIDENCE='true'. Same triad as the others.
export function confidenceOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=confidence / localStorage 'ngw-pi-confidence'='0' / REACT_APP_PI_CONFIDENCE='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=confidence\b/.test(q)) return true;
      if (/[?&]pi-off=confidence\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-confidence');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_CONFIDENCE === 'false');
}

// Confidence grammar is UNIVERSAL when on (Pattern 014 serves every persona); only
// the words differ. Returns the persona whose vocabulary to use, or null when off.
export function confidencePersona(event) {
  return confidenceOn() ? audiencePersona(event) : null;
}

// The six certainty LEVELS (Pattern 014). A level is derived from the existing
// statusLabel + note — never from a new calculation.
//   KNOWN              confirmed, real data, healthy
//   ATTENTION          partial / threshold (real data, needs a look)
//   AT_RISK            confirmed-bad WITH data present (overdue, over-budget, missing contract)
//   ESTIMATED          engine-computed (Capacity 'ESTIMATE', guest 'estimated · no RSVPs')
//   NEEDS_VERIFICATION assumption to confirm (Reality Check 'REVIEW' — safety/AP-005)
//   UNKNOWN            no data yet ("No vendors/tasks/budget/guests") — the false-token fix
export function classifyLevel(row) {
  if (!row) return 'UNKNOWN';
  const note = String(row.note || '');
  const sl = row.statusLabel;
  if (sl === 'ESTIMATE') return 'ESTIMATED';
  if (sl === 'REVIEW') return 'NEEDS_VERIFICATION';
  // Data-presence split: an empty dimension is UNKNOWN, not KNOWN-good or KNOWN-bad.
  if (/^\s*No\b/i.test(note) || /no budget set/i.test(note)) return 'UNKNOWN';
  if (/estimated|no rsvps/i.test(note)) return 'ESTIMATED';
  if (sl === 'ON TRACK') return 'KNOWN';
  if (sl === 'ATTENTION') return 'ATTENTION';
  if (sl === 'AT RISK') return 'AT_RISK';
  return 'KNOWN';
}

// LEVEL → { word per persona, tier }. Tier maps to an existing Studio Matte color
// at the render site (green confirmed-only; amber partial; red known-bad+data; steel
// estimate/verify/unknown). NEVER green for UNKNOWN, never red for "no data".
export const CONFIDENCE_WORDS = {
  KNOWN:              { host: "You're set",   planner: 'Confirmed',          operator: 'On track',      tier: 'green' },
  ATTENTION:          { host: 'Worth a look', planner: 'Attention',          operator: 'Review',        tier: 'amber' },
  AT_RISK:            { host: 'Needs you',    planner: 'At risk',            operator: 'Action needed', tier: 'red'   },
  ESTIMATED:          { host: 'About',        planner: 'Estimate',           operator: 'Estimate',      tier: 'steel' },
  NEEDS_VERIFICATION: { host: 'Confirm',      planner: 'Needs verification', operator: 'Verify',        tier: 'steel' },
  UNKNOWN:            { host: 'Not set yet',  planner: 'No data',            operator: 'Not started',   tier: 'steel' },
};

// confidenceFor(row, persona) → { word, tier, level } or null when persona is null
// (flag off / unknown persona) so the caller renders the raw token unchanged.
export function confidenceFor(row, persona) {
  if (!persona) return null;
  const level = classifyLevel(row);
  const w = CONFIDENCE_WORDS[level];
  if (!w) return null;
  const p = persona === 'operator' ? 'operator' : persona === 'planner' ? 'planner' : 'host';
  return { word: w[p], tier: w.tier, level };
}
