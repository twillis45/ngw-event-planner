// ─── WHERE THE PASS FACT LIVES ───────────────────────────────────────────────
//
// Until 2026-10-13 the only answer to "does this event hold a One-Event Pass?"
// was `ev.passPurchased` — a boolean written onto the event blob by
// `hostv2/src/HostShellV2.jsx` after a Stripe redirect, and then persisted with
// the event. `docs/audits/2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md`
// named what that costs, in the words of the 2026-08-07 board ruling:
//
//   "There is no server-side entitlement (feeSchedule is localStorage and the
//    webhook only logs), so an anonymous purchase produces a charge and nothing
//    the host can ever recover."
//
// `public.event_passes` (supabase/migrations/017_event_passes.sql) and
// `GET /api/stripe/pass` are the recoverable record. This module is the one
// place in the frontend that holds its answers, so `passGate` — which is
// synchronous and runs inside render — can consult them without becoming async.
//
// ── WHAT THE SERVER RECORD ACTUALLY BUYS, STATED HONESTLY ──────────────────
// Not security. `passGate` runs in the browser; anyone willing to edit the
// bundle can return `allowed: true` from any of it. The real boundary is the
// route: an `event_passes` row can only be created by the signature-verified
// Stripe webhook, and only read through a studio-scoped endpoint.
//
// What it buys is RECOVERY and REVOCATION:
//   · recovery — a host who paid, then closed the tab, cleared the browser, or
//     opened the app on a second device still has their unlock, because the
//     answer is no longer only in that browser's copy of the event.
//   · revocation — a server answer of `held: false` OVERRIDES a blob that says
//     `passPurchased: true`. A stale or hand-edited claim stops granting.
//
// ── WHY THE BLOB IS STILL A FALLBACK, AND NOT DEAD ─────────────────────────
// An earlier draft of this work proposed "never grant from the persisted event
// blob" outright. That is the wrong rule and this comment exists so it does not
// get re-adopted by someone reading only the headline. Refusing to grant while
// the server has not answered buys nothing — the gate is client-side either way
// — and it costs a host who has genuinely paid their unlock on every cold load
// and every offline minute. So:
//
//   server answered true   → held (source 'server')
//   server answered false  → NOT held, whatever the blob says (source 'server')
//   server never answered  → the blob's claim stands (source 'claim')
//
// The source travels with the answer so copy can be honest about which one it
// is, rather than the shell having to guess.
//
// ── IN MEMORY ONLY, DELIBERATELY ───────────────────────────────────────────
// Nothing here is written to localStorage. A persisted copy of the server's
// answer would be exactly the forgeable blob this module was built to demote,
// wearing a different name. The cost is one fetch per event per session, which
// is the right trade.
import { fetchEventPass } from './stripeApi';

// eventId -> true | false. Absent means NEVER ASKED, which is not the same as
// false and must never be collapsed into it.
const SERVER = new Map();

// eventId -> in-flight promise. Several surfaces can gate the same event in one
// render pass; without this they would each issue their own request.
const INFLIGHT = new Map();

// Nothing in `passGate` is reactive — it is called inside render and reads this
// module synchronously. So a landing answer has to tell React something moved,
// or a teased surface stays teased until some unrelated state change happens to
// re-render it. These are the `useSyncExternalStore` subscribers.
const LISTENERS = new Set();

function notify() {
  // A copy, because a listener may unsubscribe while being notified.
  for (const fn of [...LISTENERS]) { try { fn(); } catch { /* a bad listener is not this module's problem */ } }
}

function put(key, held) {
  const before = SERVER.get(key);
  SERVER.set(key, held === true);
  if (before !== (held === true)) notify();     // no render for a repeat answer
}

/**
 * Subscribe to changes in the recorded answers. Returns an unsubscribe.
 *
 * Shaped for `useSyncExternalStore`: it reports THAT something changed, not
 * what. The consumer reads `serverPassHeld(id)` for the value, which is a
 * primitive and therefore a stable snapshot across repeat reads.
 */
export function subscribePassEntitlements(fn) {
  if (typeof fn !== 'function') return () => {};
  LISTENERS.add(fn);
  return () => { LISTENERS.delete(fn); };
}

/**
 * How hard to push back on a "no" when the event's own blob claims a pass —
 * see the race described over `refreshEventPass`. Two delays means three asks
 * in total, which is bounded on purpose: this is a confirmation, not a poll.
 *
 * Exported because `refreshEventPass` takes it as an overridable option (so a
 * test can run the real logic without waiting six seconds) and the production
 * cadence then has to be pinnable rather than buried.
 */
export const CLAIM_RETRY_DELAYS_MS = [2000, 4000];

/**
 * The server's answer for this event: `true`, `false`, or `null` for
 * "never asked". Synchronous — this is what `passGate` reads.
 */
export function serverPassHeld(eventId) {
  if (!eventId) return null;
  const v = SERVER.get(String(eventId));
  return v === undefined ? null : v;
}

/**
 * Record an answer that came from the server. Exported for the return handler,
 * which already holds a verified session and should not have to re-fetch to
 * publish what it learned.
 */
export function recordServerPass(eventId, held) {
  if (!eventId) return;
  put(String(eventId), held);
}

/**
 * Ask the server and remember the answer. Returns the response body on success,
 * or `null` when the question could not be answered.
 *
 * A FAILURE RECORDS NOTHING. A 403, a 404, a cold backend or a dropped
 * connection must not be written down as `held: false` — that would revoke a
 * real pass on a network blip, which is the worst outcome this module can
 * produce. On failure the event falls back to its blob claim, exactly as before
 * this module existed.
 *
 * ── `claimed`: THE WEBHOOK/REDIRECT RACE ───────────────────────────────────
 * Pass `{ claimed: true }` when the event's own blob already says
 * `passPurchased`. It changes nothing about a "yes" and nothing about a
 * failure; it only makes a **"no" provisional**, re-asking on a bounded
 * backoff before it is written down.
 *
 * The race it exists for is real and arrives with the money: Stripe redirects
 * the browser back and POSTs the webhook INDEPENDENTLY. If the redirect wins,
 * the host lands with a blob that claims a pass and an `event_passes` table
 * that does not have the row yet. A refresh on event open — which is exactly
 * what the shell now does — would read `held: false` and revoke the unlock of
 * someone who just paid, seconds after they paid.
 *
 * The cost of being wrong the other way is two extra requests: a stale or
 * hand-edited claim re-asks twice, gets the same "no", and is revoked. That is
 * the right side to be wrong on when the subject is a $39 charge.
 */
export async function refreshEventPass(
  eventId,
  { claimed = false, retryDelaysMs = CLAIM_RETRY_DELAYS_MS } = {},
) {
  if (!eventId) return null;
  const key = String(eventId);

  // AN IN-FLIGHT ASK CAN BE UPGRADED, AND HAS TO BE. On a paid return the shell
  // asks once on mount — before the return handler has written the claim onto
  // the event — and again a beat later with `claimed: true`. Handing the second
  // caller the first caller's promise would apply the FIRST call's policy, so
  // the "no" the race produces would be written down as a revocation. The flag
  // lives in a record the running loop re-reads, so the upgrade reaches it.
  const live = INFLIGHT.get(key);
  if (live) {
    if (claimed) live.claimed = true;
    return live.p;
  }

  const rec = { claimed, p: null };
  rec.p = (async () => {
    try {
      // attempt 0 is the real ask; the rest only happen on a provisional "no".
      for (let attempt = 0; ; attempt += 1) {
        let out = null;
        try {
          out = await fetchEventPass(key);
        } catch {
          return null;                     // see A FAILURE RECORDS NOTHING
        }
        if (!out || typeof out.held !== 'boolean') return null;   // unknown shape

        // `rec.claimed`, not the parameter — an upgrade that arrived while this
        // request was in flight must count.
        const retryable = rec.claimed && out.held === false && attempt < retryDelaysMs.length;
        if (!retryable) {
          put(key, out.held);
          return out;
        }
        await new Promise((r) => setTimeout(r, retryDelaysMs[attempt]));
      }
    } finally {
      INFLIGHT.delete(key);
    }
  })();

  INFLIGHT.set(key, rec);
  return rec.p;
}

/** Test seam. Module state that leaks between tests is its own kind of lie. */
export function resetPassEntitlements() {
  SERVER.clear();
  INFLIGHT.clear();
  LISTENERS.clear();
}
