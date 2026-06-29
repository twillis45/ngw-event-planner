// Sprint 57E-A — Host Information Architecture. Reduces the 14-item event sidebar
// to a ~6-item host nav by HIDING planner-only destinations, REVEALING data-bearing
// ones, and RELABELING for hosts. Presentation-only: it filters/relabels the nav
// LIST; it never touches routes, route keys, or any deep link (every tab remains
// reachable by route/URL — it's just not shown in the simplified host nav).
//   • planner / operator persona ⇒ identity (full nav, today)
//   • pi.nav flag default OFF ⇒ identity for EVERYONE (byte-identical to prod)
// No engine/readiness/playbook/routing/data change. Pattern 011/017.

import { audiencePersona } from './nextActionRenderer';

// pi.nav flag (default OFF). Enable via ?pi=nav / localStorage 'ngw-pi-nav' /
// REACT_APP_PI_NAV='true'. OFF ⇒ hostNav is the identity function.
export function navOn() {
  // Host Activation v1: default ON, persona-gated downstream (hostNavActive).
  // QA off: ?pi-off=nav / localStorage 'ngw-pi-nav'='0' / REACT_APP_PI_NAV='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=nav\b/.test(q)) return true;
      if (/[?&]pi-off=nav\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-nav');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_NAV === 'false');
}

// Host nav active only for the HOST audience with the flag on. Operator/planner keep
// the full nav (operator is a future sprint).
export function hostNavActive(event) {
  return navOn() && audiencePersona(event) === 'host';
}

// pi.shell (default OFF) — routes a host event to the dedicated HostEventShell (the
// host L3 over the shared core) instead of the planner EventPlanner with runtime
// gating. See docs/product-os/HOST_SHELL_DECISION.md. Enable: ?shell=1 / localStorage
// 'ngw-pi-shell'='1' / REACT_APP_PI_SHELL='true'. OFF ⇒ the existing EventPlanner path,
// byte-identical to today.
export function hostShellOn() {
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]shell=1\b/.test(q)) return true;
      if (/[?&]shell=0\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-shell');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  // Promoted to default ON (host events route through HostEventShell over the shared
  // core). QA off: ?shell=0 / localStorage 'ngw-pi-shell'='0' / REACT_APP_PI_SHELL='false'.
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_SHELL === 'false');
}

// pi.planv2 (default OFF) — the recomposed host Plan tab: ONE command lead, the
// prerequisite (decisions/count) before the food it sizes, and the planner ops console
// (EventPlanningTab) shed from the host per the Ruthless Host Lens. Enable: ?pi=planv2 /
// localStorage 'ngw-pi-planv2'='1' / REACT_APP_PI_PLANV2='true'. OFF ⇒ today's stack.
export function planV2On() {
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=planv2\b/.test(q)) return true;
      if (/[?&]pi-off=planv2\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-planv2');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  // Promoted to default ON (the recomposed host Plan tab). QA off: ?pi-off=planv2 /
  // localStorage 'ngw-pi-planv2'='0' / REACT_APP_PI_PLANV2='false'.
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_PLANV2 === 'false');
}

// Always-shown host essentials (route keys). Decisions/Client Intake/Crew/Seating/
// Calendar are HIDDEN in host mode (still reachable by route/deep-link).
// UX-SAAS: "Event Details" (a venue/date FORM) dropped from the primary nav — a host
// sets it at creation and rarely revisits; still reachable by route/deep-link and from
// the home. Fewer, warmer tabs: Your event · Plan · Guests · Budget · The Day.
const HOST_KEEP = ['Command', 'Planning', 'Guests', 'Budget', 'Event Day Schedule'];
// Render order, including the data-revealed items when present.
const HOST_ORDER = ['Command', 'Communication', 'Planning', 'Vendors', 'Guests', 'Budget', 'Documents', 'Event Day Schedule'];

// hostNav(tabs, event) → the host-reduced tab list. Identity when not host/flag-off.
// REVEAL-when-data: Vendors / Documents / Messages appear only once the event has them.
export function hostNav(tabs, event) {
  if (!hostNavActive(event) || !Array.isArray(tabs)) return tabs;
  const has = (k) => Array.isArray(event && event[k]) && event[k].length > 0;
  const allowed = new Set(HOST_KEEP);
  if (has('vendors')) allowed.add('Vendors');
  // Docs only surface for a host once there's a VENDOR to attach paperwork to AND
  // actual documents exist — otherwise the tab is an empty filing cabinet (host ask).
  if (has('documents') && has('vendors')) allowed.add('Documents');
  if (has('commClient') || has('messages')) allowed.add('Communication');
  return HOST_ORDER.filter((t) => allowed.has(t) && tabs.includes(t));
}

// Host display labels (route keys unchanged). Returns null when not host ⇒ the caller
// falls back to its existing TAB_LABELS[t] || t (today).
// Board #6 — the L3 sidebar must speak the SAME words as the host home cards
// (home says "Budget" and "Venue"). Drift like Budget→"Money" / Venue→"Details"
// made one destination wear three names. Aligned to the home's vocabulary.
const HOST_TAB_LABELS = {
  Command: 'Your event',           // UX-SAAS: "Overview" is a software module word
  Planning: 'Plan',
  Budget: 'Budget',
  'Event Day Schedule': 'The Day',
  'Event Details': 'Venue & Details',  // kept for any deep-link/caller that still routes here
  Communication: 'Messages',
  Documents: 'Paperwork',
};
export function hostTabLabel(t, event) {
  if (!hostNavActive(event)) return null;        // ⇒ caller uses its default
  return HOST_TAB_LABELS[t] || null;             // mapped host label, or null → caller default (e.g. Guests)
}
