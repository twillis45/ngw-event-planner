// Stripe Checkout helpers — Sprint 64.
// Uses server-side Stripe Checkout sessions only — no @stripe/stripe-js needed.
// The planner creates a session, copies/shares the URL, then checks payment status.
//
// CTA truthfulness:
//   createCheckoutSession → DONE   (real Stripe session, returns URL immediately)
//   verifySession         → DONE   (actual payment_status from Stripe API)
//   Sharing the URL       → LIGHT HANDOFF (copy to clipboard or share externally)

const BASE = process.env.REACT_APP_API_BASE_URL;

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount_cents: amountCents,
      label,
      fee_id:      feeId,
      event_id:    eventId    || '',
      client_name: clientName || '',
      success_url: `${origin}${pathname}?stripe_paid=1&fee_id=${encodeURIComponent(feeId)}`,
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
    headers: { 'Content-Type': 'application/json' },
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
 * Verify payment status for a Checkout Session.
 * Returns { payment_status, fee_id, amount_total }.
 * payment_status: "paid" | "unpaid" | "no_payment_required"
 */
export const verifySession = async (sessionId) => {
  if (!BASE) throw new Error('No API backend configured.');
  const res = await fetch(
    `${BASE}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Verify error ${res.status}`);
  }
  return res.json();
};
