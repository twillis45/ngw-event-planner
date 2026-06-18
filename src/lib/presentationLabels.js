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
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=labels / localStorage 'ngw-pi-labels'='0' / REACT_APP_PI_LABELS='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=labels\b/.test(q)) return true;
      if (/[?&]pi-off=labels\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-labels');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_LABELS === 'false');
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

// Sprint 57I — OPERATOR labels. Business-like, organized, clear; NOT host-soft
// ("Where things stand", "Before the big day") and NOT planner event-industry
// ("Run of Show", "Vendor Risk"). The competent organizer's vocabulary. Status
// badges mirror the operator confidence words (On track / Action needed / …) for
// consistency when pi.confidence is off but pi.labels is on. Unmapped ⇒ identity.
const OPERATOR_LABELS = {
  // section headers / subtitles
  'Planning Health': 'Event Status',
  'Readiness across the event': 'Status across the event',
  // health-row + section labels
  'Capacity': 'Attendance & Supplies',
  'Reality Check': 'Things To Confirm',
  'Run of Show': 'Event Schedule',
  'Readiness': 'Preparation status',
  'Vendor Risk': 'Vendor Follow-Up',
  'Operational': 'Tasks & Supplies',
  'Timeline': 'Schedule',
  // status badges → operator state words (no alarm tokens, no false precision)
  'AT RISK': 'Action needed',
  'ATTENTION': 'Review',
  'ON TRACK': 'On track',
  'OVERDUE': 'Overdue',
  'DUE': 'Due',
  'AWAITING': 'Awaiting',
  'PENDING': 'Awaiting',
  'ESTIMATE': 'Estimate',
  'REVIEW': 'To confirm',
  'NEW': 'New',
  'STALE': 'No recent activity',
};

// labelFor(term, event) → display string. flag-off / planner ⇒ identity; host ⇒
// host vocabulary; operator ⇒ operator vocabulary. Unmapped term ⇒ identity.
export function labelFor(term, event) {
  if (typeof term !== 'string' || !term) return term;
  if (!labelsOn()) return term;                          // flag OFF ⇒ identity ⇒ today
  const persona = audiencePersona(event);
  if (persona === 'host')     return HOST_LABELS[term] || term;
  if (persona === 'operator') return OPERATOR_LABELS[term] || term;
  return term;                                           // planner ⇒ identity
}

// Exported for tests / inventory.
export const HOST_LABEL_MAP = HOST_LABELS;
export const OPERATOR_LABEL_MAP = OPERATOR_LABELS;
