// ─── ASK HISTORY, KEPT ON THE EVENT (owner, 11/12/2026) ─────────────────────
//
// Ask conversations vanished on reload. Ask is per event, so the history is a
// bounded field on the event (`askHistory`), written through the shell's one
// event write path and synced with the event like every other field.
//
// WHAT IS KEPT: the question, the answer text the host was shown, its stated
// basis and route, and — when the broader look ran — that answer's text and
// whether a figure in it failed the grounding check. NOT kept: tool results,
// the streamed partial, or anything the engines read to answer. The answers
// are derived from the event itself, so nothing here holds guest data the
// event does not already hold.
//
// BOUNDED: the newest ASK_HISTORY_MAX exchanges per event, each text clipped,
// so the event row cannot grow without limit.

export const ASK_HISTORY_MAX = 50;
const CLIP = 2000;

const clip = (s) => (typeof s === 'string' ? s.slice(0, CLIP) : '');
const list = (h) => (Array.isArray(h) ? h.filter((x) => x && typeof x === 'object' && typeof x.q === 'string') : []);

/** A new exchange from a question and the deterministic answer it got. */
export function askExchange(question, result, at = Date.now()) {
  const r = result || {};
  return {
    id: `ask-${at}-${Math.random().toString(36).slice(2, 7)}`,
    at,
    q: clip(String(question || '').trim()),
    answer: clip(r.answer),
    basis: Array.isArray(r.basis) ? r.basis.slice(0, 8).map(clip) : [],
    matched: !!r.matched,
    route: typeof r.route === 'string' ? r.route : null,
  };
}

/** The history with `entry` appended, keeping only the newest `max`. */
export function appendAskExchange(history, entry, max = ASK_HISTORY_MAX) {
  if (!entry || typeof entry.q !== 'string' || !entry.q) return list(history);
  return [...list(history), entry].slice(-max);
}

/** Attach the broader look's answer to the exchange it was asked for. */
export function attachBroaderLook(history, id, out) {
  const answer = clip(out && out.answer);
  if (!answer) return list(history);
  const flagged = !!(out && out.grounded && out.grounded.ok === false);
  return list(history).map((x) => (x.id === id ? { ...x, broader: { answer, flagged } } : x));
}
