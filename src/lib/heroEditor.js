// ─── WHICH IN-PLACE EDITOR A BOARD CARD OPENS (six root causes, cause 1) ─────
//
// Moved out of HostShellV2's `wiredKind`, which chose the editor partly by
// words in the card's title: "dietary" or "allerg" anywhere put the allergy
// counter on the card (the Thanksgiving invite step, P0-2), "venue" or
// "location" the venue editor ("Pay the venue and caterer balances"), "rain
// backup" the rain editor, "catering count" and "final guest count" the count
// editors. And every step routed to the food plan got the who's-cooking editor
// ("Order the turkey", P1-2).
//
// Now the editor comes only from what the card DECLARES:
//   1. `a.editor` — the producer says which editor answers it;
//   2. a checklist step (`taskId`, `stepRowId`, or a route naming a task) —
//      its declared target's editor (lib/stepTarget), null when it has none;
//   3. otherwise the card's own domain and its route's focusField.
// Nothing here reads a title, a label or a CTA. Guard:
// src/lib/__tests__/everyStepDeclaresItsTarget.test.js.

import { stepTargetKey, targetFor } from './stepTarget';

const DOMAIN_EDITORS = { date: 'date', guests: 'guests', budget: 'budget', food: 'food', starttime: 'date', datetime: 'date', start: 'guests' };
const FIELD_EDITORS = {
  'rain-plan': 'rain', venue: 'venue', 'event-venue': 'venue',
  'event-date': 'date', 'event-start': 'date', 'guests-entry': 'guests',
  // `food-plan` names the food plan itself, not a row inside it (a step that
  // opens the list declares its own target and never reaches this table).
  'food-plan': 'food', 'hsp-budget': 'budget',
};

/** The checklist row a card stands for, by id (never by its title). */
export function stepRowIdOf(a) {
  if (!a) return null;
  return a.stepRowId || a.taskId || (a.route && a.route.taskId) || null;
}

/** editorKindFor(action, event) → the in-place editor kind, or null. */
export function editorKindFor(a, event) {
  if (!a) return null;
  if (typeof a.editor === 'string' && a.editor) return a.editor;
  const rid = stepRowIdOf(a);
  const key = rid ? stepTargetKey(event, { id: rid }) : null;
  if (rid && key !== null) {
    const t = targetFor(key, event);
    return (t && t.editor) || null;
  }
  // A step with no declared target (one the host wrote) has no editor.
  if (rid && event && Array.isArray(event.timeline) && event.timeline.some((t) => t && t.id === rid)) return null;
  if (rid && String(rid).startsWith('pbt-')) return null;
  const f = String((a.route && a.route.focusField) || '');
  if (f.startsWith('fp-diet')) return 'diet';
  if (DOMAIN_EDITORS[a.domain]) return DOMAIN_EDITORS[a.domain];
  return FIELD_EDITORS[f] || null;
}

// ── A BALANCE THAT IS DUE (the "Mark as paid" card) ───────────────────────────
// Was `/^send payment to/i.test(a.title)`. The payment raisers declare the
// vendor's payment section on the route; the vendor record says the balance is
// open. Both are data.
export function isBalanceDueAction(a, event) {
  const r = a && a.route;
  if (!r || r.vendorSection !== 'payment' || !r.vendorId) return false;
  const v = ((event && event.vendors) || []).find((x) => x && x.id === r.vendorId);
  return !!(v && v.payDueDate && !v.balancePaid && (Number(v.cost) || 0) > 0);
}
