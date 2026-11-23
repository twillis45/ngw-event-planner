// ─── HOW URGENT A CALL IS: ONE READER (owner ruling 11/23/2026, P1-7) ────────
//
// Thanksgiving walkthrough P1-7: "Is anyone staying overnight?" and "Sit-down
// or buffet?" wore a "time-sensitive" tag in Calls to make while the hero moved
// on to shopping. The tag and the hero queue read two different things: the
// Calls list read the board's `timeCritical` flag, and the queue only ever
// raised a call once it was `overdue`. A call could be urgent on one screen and
// absent from the other.
//
// Ruling (11/23): a time-sensitive call is raised into the hero queue ONLY when
// its window closes strictly BEFORE the current top hero item's deadline. A tie,
// or a later window, leaves the queue as the other rulings order it.
//
// This file is the one reader both use: the Calls list's tag
// (`urgencyOf(row).timeSensitive`) and the hero-queue step in eventPlan
// (`timeSensitiveCallToRaise`).

/**
 * The urgency of one decision-board row.
 *   timeSensitive — the board marked its window open and the runway short, and
 *                   it is not already overdue (an overdue call has its own raise).
 *   closesInDays  — days from today until its window closes (negative: closed
 *                   that many days ago), or null when it has no window.
 */
export function urgencyOf(row) {
  if (!row) return { timeSensitive: false, closesInDays: null };
  return {
    timeSensitive: row.timeCritical === true && row.status !== 'overdue',
    closesInDays: Number.isFinite(row.daysOut) ? row.daysOut : null,
  };
}

/**
 * The deadline of a hero-queue action, in days from today. Its own clock when
 * it has one; otherwise the event day, the latest anything on the plan can be
 * done. Null when there is neither.
 */
export function actionDeadline(action, daysToEvent) {
  if (action && Number.isFinite(action.dueInDays)) return action.dueInDays;
  return Number.isFinite(daysToEvent) ? daysToEvent : null;
}

/**
 * The one time-sensitive call to raise above `head`, or null. Among the
 * time-sensitive rows not already `head` itself, the one whose window closes
 * first — raised only when that window closes strictly before head's deadline.
 * `isHead(rowId)` says whether head already is that call.
 */
export function timeSensitiveCallToRaise(rows, head, daysToEvent, isHead = () => false) {
  const deadline = actionDeadline(head, daysToEvent);
  if (deadline == null) return null;
  let best = null;
  for (const r of Array.isArray(rows) ? rows : []) {
    const u = urgencyOf(r);
    if (!r || !r.id || !u.timeSensitive || u.closesInDays == null) continue;
    if (isHead(r.id)) continue;         // the head is this call already
    if (!best || u.closesInDays < urgencyOf(best).closesInDays) best = r;
  }
  return best && urgencyOf(best).closesInDays < deadline ? best : null;
}
