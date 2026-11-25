// ─── Task routing — every checklist step lands on its actual item ────────────
// (Routing audit 2026-07-27, host report "checklist tasks don't go to the
// actual item".) Two producers, ONE authority: every route here is a plain
// route object resolveRoute understands, swept by ctaSourceOfTruth — never a
// hand-held setSheet that bypasses the resolver (the old checklistActionFor's
// exact defect, alongside its keyword-missed rows getting nothing at all).

// The row-level vendor rule lives with the step targets (one copy).
import { stepTargetKey, targetFor, firstUndoneVendorRoute } from './stepTarget';

/**
 * Canonical milestone/task route producer (moved from CommandCenter.jsx so the
 * V2 shell can use it without dragging the planner bundle along).
 * FIELD-DRIFT FIX: the fallback used to emit `timelineId` while resolveRoute
 * and routeUpNext read `taskId` — it passed the audit yet dropped the focus.
 * Both names ride now so every reader lands on the exact row.
 */
export function milestoneActionRoute(label, event, timelineId) {
  // A GUEST AS A UNIT OF MEASURE IS NOT GUEST WORK (11/20/2026). "Order the
  // turkey — about a pound and a half per guest" opened the guest list: no
  // rule above named a turkey, and the earliest domain word here was the
  // "guest" in a portion rate. Rates and sizing phrases ("per guest",
  // "~10-12 bites/guest", "size for headcount", "counted to the headcount")
  // say how MUCH, not who; they are dropped before the domains are read.
  // ("a guest book" and "each guest" are left alone: those are guest work.)
  const s = String(label || '').toLowerCase()
    .replace(/\bper\s+(?:guest|person|head)s?\b|\/(?:guest|person)s?\b/g, ' ')
    .replace(/\b(?:size[ds]?|sized|counted|count)\s+(?:for|to|against)\s+(?:the\s+)?(?:final\s+)?head\s?count\b/g, ' ');
  // WHOLE WORDS (11/20/2026): bare substrings sent "vegetable" to the tables
  // list, "content"/"intent" to tents, "costume" to the budget and "workshop"
  // to the food plan — the same collision class as "Holi-day party".
  const DOMAINS = [
    { re: /\b(?:guests?|invit\w*|rsvps?|head\s?counts?|seat)\b/, route: () => ({ tab: 'Guests', focusField: 'guests-entry' }) },
    { re: /\b(?:budget\w*|deposits?|payments?|pay|costs?|spend\w*|quotes?|invoices?)\b/, route: () => ({ tab: 'Budget', focusField: 'hsp-budget' }) },
    { re: /\b(?:vendors?|cater\w*|venues?|photograph\w*|dj|florists?|rentals?|baker\w*|bartend\w*|book)\b/, route: () => firstUndoneVendorRoute(event) },
    { re: /\b(?:food|menus?|shop\w*|grocer\w*|drinks?|supplies|seating)\b/, route: () => ({ tab: 'Planning', focusField: 'food-plan' }) },
    // Families the old V2-only keyword router had that this one lacked
    // (audit gap 2): weather → the rain plan; physical space/helpers → the
    // space sheet. Both are real resolver targets, not sheet-top guesses.
    { re: /\b(?:forecast\w*|weather|rain)\b/, route: () => ({ tab: 'Event Details', focusField: 'rain-plan' }) },
    { re: /\b(?:canop\w*|tents?|chairs|tables?|shade|helpers?|point person|in charge)\b/, route: () => ({ tab: 'Event Details', focusField: 'space' }) },
  ];
  const hits = DOMAINS.map((d) => ({ d, at: s.search(d.re) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
  if (hits.length) return hits[0].d.route();
  return { tab: 'Timeline', taskId: timelineId, timelineId };
}

/**
 * The checklist row's deep link (six root causes, cause 1, 11/23/2026).
 *
 * The row's DECLARED target, resolved by lib/stepTarget — never its words.
 * This was ~90 keyword rules over the row's text (the "act beats the noun"
 * passes, the coverage waves, the parking and crab exceptions); each fixed
 * one collision and the class kept coming back. The rules ran ONCE over every
 * step of every playbook to derive each step's `target`, which is now authored
 * data on the step. `task` (the words) is accepted for the callers' signature
 * and not read. A row with no declared target — one the host wrote, or a
 * sample's own row — gets no button: an honest check-off, never a guess.
 *
 * meta: { taskId (the row's id), target?, provenance? }.
 * Returns { label, route } | { label, href } | null.
 */
// eslint-disable-next-line no-unused-vars
export function checklistRouteFor(task, meta = {}, event = null) {
  const m = meta || {};
  const key = stepTargetKey(event, { id: m.taskId || m.id || null, target: m.target || null, provenance: m.provenance || null });
  const t = targetFor(key, event);
  if (!t) return null;
  return t.href ? { label: t.label, href: t.href } : { label: t.label, route: t.route };
}

/**
 * stepRoute(event, rowId) — where a checklist row's work is done, by its
 * DECLARED target (six root causes, cause 1); its own row on the checklist
 * when it declares none. Replaces milestoneActionRoute for every caller but
 * the frozen CRA shell (src/App.js), which keeps the old function until its
 * scheduled deletion.
 */
export function stepRoute(event, rowId) {
  const t = targetFor(stepTargetKey(event, { id: rowId }), event);
  return t && t.route ? t.route : { tab: 'Timeline', taskId: rowId, timelineId: rowId };
}

/**
 * actionRoute(event, action) — where a board row's work is done (cohesion F,
 * 11/24/2026). THE ONE STEP FALLBACK: its declared route when it has one;
 * otherwise, when the row IS a checklist step (it carries the row's id), the
 * step's declared target or its own row on the checklist (stepRoute). Never
 * dropped, never a dead end. "Then, in order" reads this, and so does batch
 * D's "Up next" lit button. An action that is no step and has no route stays
 * null: there is nowhere honest to send it.
 */
export function actionRoute(event, action) {
  if (!action) return null;
  const declared = action.route || action.primaryRoute || null;
  if (declared) return declared;
  const rowId = action.stepRowId || action.taskId || null;
  return rowId ? stepRoute(event, rowId) : null;
}

/**
 * upNextRoute(event, taskId) — where the checklist's "Up next" lit button goes
 * (cohesion D's hookup, 11/25/2026): the same place a board row for that step
 * goes, read from actionRoute, so the two can never disagree. When the step
 * declares no target, actionRoute's fallback is the step's own checklist row,
 * which is where "Up next" already is: that is null here, and the button says
 * "Check it off" (D4).
 */
export function upNextRoute(event, taskId) {
  if (!taskId) return null;
  const r = actionRoute(event, { taskId });
  if (!r) return null;
  // Exactly stepRoute's own-row fallback, never a declared target.
  const ownRow = r.tab === 'Timeline' && r.taskId === taskId && r.timelineId === taskId
    && Object.keys(r).length === 3;
  return ownRow ? null : r;
}
