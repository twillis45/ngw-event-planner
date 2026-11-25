// ─── WHICH STAGE SHE LANDS ON (six root causes, cause 4) ─────────────────────
//
// Thanksgiving walkthrough P0-1 / P1-1 (11/23/2026): there was no single rule.
// The first stage was `bootDraft ? 'create' : 'plan'`, so a few words typed in
// Create reopened Create on every reload for a day, even with a plan saved;
// a switch, a creation and a sign-in each set the stage their own way; and on
// the day itself the app opened on Plan.
//
// One reader, used by every path that sets the stage she LANDS on (the boot,
// switching events, opening a plan she just made). A tap on Plan / The Day /
// After is her own choice and is not a landing.
//
// OWNER RULINGS, 11/23/2026:
//   (a) a plan she has opened is hers on this device, saved or not ("try
//       first, sign in to keep", #122): it is landed on like any other;
//   (b) on a day of the event, the app opens on The Day.
// OWNER RULING, 11/24/2026 (cohesion batch E, rule 13 "fits the moment"):
//   (c) once her event's last day has passed, it opens on After, and stays
//       there indefinitely: a new plan of hers lands by its own dates.
// And: a sentence left in the Create box never outranks a plan she has.

import { isDuringEvent, daysUntilEnd } from './dates';

export const STAGES = Object.freeze(['create', 'plan', 'day', 'after']);

/**
 * landingStage({ event, ownPlan, draftText, now }) → 'create' | 'plan' | 'day' | 'after'
 *   event     — the event she would land on (may be a sample);
 *   ownPlan   — that event is hers on this device (created here, saved or
 *               not, or from her account);
 *   draftText — words left in the Create box (kept a day);
 *   now       — the clock (Date), for "the day itself".
 */
export function landingStage({ event = null, ownPlan = false, draftText = '', now = new Date() } = {}) {
  const words = String(draftText || '').trim();
  // Nothing of hers to land on: her unfinished sentence, else the board (the
  // welcome gate covers a first visit).
  if (!ownPlan || !event) return words ? 'create' : 'plan';
  // (b) On any day of the event — the first through the last of a trip.
  let live = false;
  try { live = !!(event.date && isDuringEvent(event, now)); } catch (_e) { live = false; }
  if (live) return 'day';
  // (c) After its last day (a trip's too): After, with no time limit.
  let over = false;
  try { const d = event.date ? daysUntilEnd(event, now) : null; over = d != null && d < 0; } catch (_e) { over = false; }
  if (over) return 'after';
  // Before it and the day before it: the plan. Her draft waits in Create; it
  // never takes the landing from a plan she has.
  return 'plan';
}
