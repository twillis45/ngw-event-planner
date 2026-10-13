// Stripe Checkout helpers — Sprint 64.
// Uses server-side Stripe Checkout sessions only — no @stripe/stripe-js needed.
// The planner creates a session, copies/shares the URL, then checks payment status.
//
// CTA truthfulness:
//   createCheckoutSession → DONE   (real Stripe session, returns URL immediately)
//   verifySession         → DONE   (actual payment_status from Stripe API)
//   Sharing the URL       → LIGHT HANDOFF (copy to clipboard or share externally)

import { plannerAuthHeaders } from './commApi';

const BASE = process.env.REACT_APP_API_BASE_URL;

// EVERY call here carries planner auth as of 2026-08-07. create-checkout-session
// became signed-in-only when its anonymous charge-minting was closed, so without
// this the fee flow would ship as a 401. verify-session and the subscription call
// get the same treatment now rather than as a second decision later — one line
// each, and it means nobody has to re-reason about which of the three is gated.

export const isStripeApiConfigured = () => Boolean(BASE);

// Synchronous check using the capabilities cache populated by commApi.getCapabilities().
// Returns false until getCapabilities() has resolved.
let _stripeConfigured = false;
export const setStripeConfigured = (v) => { _stripeConfigured = v; };
export const isStripeConfigured  = () => _stripeConfigured;

/**
 * Create a Stripe Checkout Session for a fee milestone.
 * Returns { url, session_id }.
 * The planner shares `url` with the client.
 */
export const createCheckoutSession = async ({ amountCents, label, feeId, eventId, clientName }) => {
  if (!BASE) throw new Error('No API backend configured (REACT_APP_API_BASE_URL).');

  const origin   = window.location.origin;
  const pathname = window.location.pathname;

  const res = await fetch(`${BASE}/api/stripe/create-checkout-session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...(await plannerAuthHeaders()) },
    body: JSON.stringify({
      amount_cents: amountCents,
      label,
      fee_id:      feeId,
      event_id:    eventId    || '',
      client_name: clientName || '',
      // {CHECKOUT_SESSION_ID} is Stripe's own substitution token — it lands in
      // the redirect as the real session id, which lets the return handler
      // VERIFY payment server-side (verifySession) instead of trusting the
      // redirect params. Additive for the planner fee flow, load-bearing for
      // the One-Event Pass unlock (Model D, D-2 gate 3: audited Stripe path).
      success_url: `${origin}${pathname}?stripe_paid=1&fee_id=${encodeURIComponent(feeId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}${pathname}?stripe_cancel=1`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Stripe API error ${res.status}`);
  }
  return res.json(); // { url, session_id }
};

/**
 * Create a Stripe Checkout Session in SUBSCRIPTION mode for the planner's own plan
 * (self-serve billing). The backend maps `plan` → the recurring Stripe price and
 * returns a hosted checkout URL. Throws 'billing-not-configured' when no backend is
 * set, so the caller can degrade HONESTLY — it must never silently grant a plan.
 * Returns { url, session_id }.
 */
export const createSubscriptionSession = async ({ plan, email, studioId }) => {
  if (!BASE) throw new Error('billing-not-configured');
  const origin   = window.location.origin;
  const pathname = window.location.pathname;
  const res = await fetch(`${BASE}/api/stripe/create-subscription-session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...(await plannerAuthHeaders()) },
    body: JSON.stringify({
      plan,
      email:     email    || '',
      studio_id: studioId || '',
      success_url: `${origin}${pathname}?plan_upgraded=1&plan=${encodeURIComponent(plan)}`,
      cancel_url:  `${origin}${pathname}?plan_cancel=1`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Subscription API error ${res.status}`);
  }
  return res.json(); // { url, session_id }
};

/**
 * Start checkout for the One-Event Pass on a specific event.
 * Returns { url, session_id }.
 *
 * ── WHY THIS IS NOT `createCheckoutSession` WITH A $39 ARGUMENT ────────────
 * It was, until 2026-10-13: the pass sheet called
 * `createCheckoutSession({ amountCents: 3900, feeId: 'one-event-pass-' + id })`,
 * which is gap #3 of `docs/audits/2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md`
 * shipped in the shell — **the price came from the browser**. `amount_cents` is
 * correct for a planner's own fee, where the planner sets the number; on a
 * fixed-price product the same property means a buyer who edits the bundle
 * posts one cent and gets the same entitlement.
 *
 * `create-pass-session` has NO price field at all — the server charges
 * `PASS_AMOUNT_CENTS` and a test asserts the request model cannot carry an
 * amount. So this function takes no amount either, and must not grow one.
 *
 * It also stamps the tenant key into the session metadata, which is the only
 * way the webhook can know which studio to write the entitlement for: that
 * request arrives with a signature and nothing else, no principal.
 */
export const createPassSession = async ({ eventId }) => {
  if (!BASE) throw new Error('No API backend configured (REACT_APP_API_BASE_URL).');

  const origin   = window.location.origin;
  const pathname = window.location.pathname;

  const res = await fetch(`${BASE}/api/stripe/create-pass-session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...(await plannerAuthHeaders()) },
    body: JSON.stringify({
      event_id: eventId,
      // `?pass_paid=1`, not the fee flow's `?stripe_paid=1&fee_id=…`: the pass
      // session's metadata carries `kind: 'pass'` and no fee_id, so the old
      // return shape has nothing to verify against. The session id still rides
      // along — not as evidence of payment (the webhook is what grants), but so
      // the return can say something true about a session it can name.
      success_url: `${origin}${pathname}?pass_paid=1&event_id=${encodeURIComponent(eventId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}${pathname}?pass_cancel=1`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Pass checkout error ${res.status}`);
  }
  return res.json(); // { url, session_id }
};

/**
 * Read whether an event holds a One-Event Pass — the server's own record
 * (`public.event_passes`), written only by the signature-verified webhook.
 * Returns { event_id, held } and, when held, { sku, amount_cents, currency,
 * purchased_at }.
 *
 * Studio-scoped server-side: a signed-in caller cannot read another studio's
 * entitlement by event id.
 *
 * THROWS rather than returning a falsy answer, because the caller must be able
 * to tell "the server says no pass" from "the server could not be asked".
 * `passEntitlement.refreshEventPass` is what turns that distinction into the
 * never-asked / false / true the gates read; collapsing the two here would let
 * a cold backend revoke a pass somebody paid for.
 */
export const fetchEventPass = async (eventId) => {
  if (!BASE) throw new Error('No API backend configured.');
  const res = await fetch(
    `${BASE}/api/stripe/pass?event_id=${encodeURIComponent(eventId)}`,
    { headers: { ...(await plannerAuthHeaders()) } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Pass lookup error ${res.status}`);
  }
  return res.json();
};

/**
 * Verify payment status for a Checkout Session.
 * Returns { payment_status, fee_id, amount_total }.
 * payment_status: "paid" | "unpaid" | "no_payment_required"
 */
export const verifySession = async (sessionId) => {
  if (!BASE) throw new Error('No API backend configured.');
  const res = await fetch(
    `${BASE}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`,
    { headers: { ...(await plannerAuthHeaders()) } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Verify error ${res.status}`);
  }
  return res.json();
};
