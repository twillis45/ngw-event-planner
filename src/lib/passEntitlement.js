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
  SERVER.set(String(eventId), held === true);
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
 */
export async function refreshEventPass(eventId) {
  if (!eventId) return null;
  const key = String(eventId);
  if (INFLIGHT.has(key)) return INFLIGHT.get(key);

  const p = (async () => {
    try {
      const out = await fetchEventPass(key);
      if (out && typeof out.held === 'boolean') {
        SERVER.set(key, out.held);
        return out;
      }
      return null;                       // shape we do not recognise: no record
    } catch {
      return null;                       // see the paragraph above
    } finally {
      INFLIGHT.delete(key);
    }
  })();

  INFLIGHT.set(key, p);
  return p;
}

/** Test seam. Module state that leaks between tests is its own kind of lie. */
export function resetPassEntitlements() {
  SERVER.clear();
  INFLIGHT.clear();
}
