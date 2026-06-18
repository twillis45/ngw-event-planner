// Sprint 57C Phase 2 — Vocabulary Layer. Translates planner-facing LABELS that
// bypass the 55M spine seam (health-row labels, status badges, section headers,
// subtitles) into host language. Presentation-only; mirrors the 55M/57A-B contract:
//   • planner persona ⇒ identity (today's UI, byte-identical)
//   • pi.labels flag default OFF ⇒ identity for EVERYONE
//   • unmapped term ⇒ identity (never blanks/guesses)
// No engine/readiness/playbook/routing change. Pattern 011/017; AP-004/AP-005 safe.

import { audiencePersona } from './nextActionRenderer';

// pi.labels flag (default OFF). Enable via ?pi=labels / localStorage 'ngw-pi-labels'
// / REACT_APP_PI_LABELS='true'. OFF ⇒ labelFor is the identity function.
export function labelsOn() {
  try {
    if (typeof window !== 'undefined' && /[?&]pi=labels\b/.test(window.location.search || '')) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ngw-pi-labels') === '1') return true;
  } catch (e) { /* storage blocked */ }
  return typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_LABELS === 'true';
}

// Translate planner INTENT, not just words (grandmother test). Only jargon is mapped;
// already-plain terms (Vendors, Guests, Budget, Documents-as-nav, Needs You, Next Up)
// stay identity. Unmapped ⇒ returned unchanged.
const HOST_LABELS = {
  // section headers
  'Planning Health': 'Where things stand',
  // header subtitles
  'Readiness across the event': 'How your plans are coming along',
  // health-row + section labels
  'Capacity': 'Seating & supplies',
  'Reality Check': 'Before the big day',
  'Run of Show': "Today's plan",
  'Readiness': 'How prepared you are',
  'Vendor Risk': 'Needs attention',
  'Operational': 'To-do & to-buy',
  'Timeline': "What's coming up",
  'Documents': 'Paperwork',
  // status badges (alarm tokens → plain state; never alarm, never false precision)
  'AT RISK': 'Needs attention',
  'ATTENTION': 'Needs a look',
  'ON TRACK': "You're set",
  'OVERDUE': 'Running late',
  'DUE': 'Due',
  'AWAITING': 'Waiting',
  'PENDING': 'Waiting',
  'ESTIMATE': 'about',
  'REVIEW': 'double-check',
  'NEW': 'New',
  'STALE': 'Quiet a while',
};

// labelFor(term, event) → display string. planner / flag-off ⇒ identity; host ⇒ mapped.
export function labelFor(term, event) {
  if (typeof term !== 'string' || !term) return term;
  if (!labelsOn()) return term;                          // flag OFF ⇒ identity ⇒ today
  if (audiencePersona(event) !== 'host') return term;    // planner ⇒ identity
  return HOST_LABELS[term] || term;                      // host; unmapped ⇒ identity
}

// Exported for tests / inventory.
export const HOST_LABEL_MAP = HOST_LABELS;
