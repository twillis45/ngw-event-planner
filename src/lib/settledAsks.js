// ─── AN ANSWERED ASK STAYS ANSWERED (six root causes, cause 2) ───────────────
//
// Thanksgiving walkthrough P1-2 (11/23/2026): she answered the board's ask,
// the board rolled on, and a reload brought the same ask back. "Settled" lived
// in a `useState` in the shell (`satisfiedIds`), cleared on every load and on
// every event switch, so the one thing she had done was forgotten.
//
// Now it is ONE field on the event, `settledAsks` (the ask ids she settled),
// with one reader and one writer here. It is saved with the event, so it
// survives a reload, another device and an event switch. The queue reads it
// (`unsettledActions`); the settle writes it in the same save as the answer
// (setDown.js), so the answer's Undo brings the ask back with it.

export const SETTLED_FIELD = 'settledAsks';

const clean = (ids) => [...new Set((Array.isArray(ids) ? ids : [ids])
  .filter((x) => x != null && x !== '').map(String))];

/** The ask ids this event has settled (strings, in the order settled). */
export function settledAskIds(event) {
  const raw = event && event[SETTLED_FIELD];
  return Array.isArray(raw) ? clean(raw) : [];
}

/** Has she settled this ask on this event? */
export function isAskSettled(event, id) {
  return id != null && settledAskIds(event).includes(String(id));
}

/** The patch that settles `ids` (null when they are all settled already). */
export function withSettled(event, ids) {
  const cur = settledAskIds(event);
  const add = clean(ids).filter((x) => !cur.includes(x));
  return add.length ? { [SETTLED_FIELD]: [...cur, ...add] } : null;
}

/** The patch that brings `ids` back (null when none of them is settled). */
export function withoutSettled(event, ids) {
  const cur = settledAskIds(event);
  const drop = new Set(clean(ids));
  const next = cur.filter((x) => !drop.has(x));
  return next.length === cur.length ? null : { [SETTLED_FIELD]: next };
}

/** The asks still open: every action whose id she has not settled. */
export function unsettledActions(actions, event) {
  const done = new Set(settledAskIds(event));
  return (Array.isArray(actions) ? actions : []).filter((a) => a && !done.has(String(a.id)));
}
