// Operational failures use the existing transports, with no event content or
// raw identifiers. Reporting is always best-effort and never blocks an action.
import { captureError } from './sentry';
import { track, trackOnce, EVENTS } from './analytics';

const FAILURE_EVENTS = {
  save: EVENTS.SAVE_FAILED, provider: EVENTS.PROVIDER_FAILED, route: EVENTS.ROUTE_FAILED,
  pass_checkout: EVENTS.PASS_CHECKOUT_FAILED, pass_verify: EVENTS.PASS_VERIFY_FAILED,
};

async function contextFor({ where, reason, eventId } = {}) {
  let hash = null;
  try {
    if (eventId && typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(eventId)));
      hash = Array.from(new Uint8Array(bytes)).map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }
  } catch { /* unknown hash stays unknown, never a readable fallback */ }
  return {
    where, reason,
    release_sha: process.env.REACT_APP_RELEASE_SHA || 'unreported',
    release_profile: process.env.REACT_APP_RELEASE_PROFILE || 'unreported',
    ...(hash ? { event_id_hash: hash } : {}),
  };
}

export async function reportFailure(kind, context = {}) {
  if (!FAILURE_EVENTS[kind]) return;
  try {
    const safe = await contextFor(context);
    const { where, reason, ...tags } = safe;
    try { captureError(new Error(kind + ' failed'), { where, reason, tags: { ...tags, failure_class: kind } }); } catch { /* a reporter cannot break an action */ }
    await track(FAILURE_EVENTS[kind], safe);
  } catch { /* analytics cannot break an action */ }
}

const PASS_FUNNEL = {
  sheet_viewed: EVENTS.PASS_SHEET_VIEWED, checkout_started: EVENTS.PASS_CHECKOUT_STARTED,
  purchase_confirmed: EVENTS.PASS_PURCHASE_CONFIRMED,
};

// `purchase_confirmed` is called only after the server (or Stripe, for a legacy
// receipt link) has confirmed the pass, and fires once per event per browser so
// reopening a return link does not count a second purchase.
export async function recordPassFunnel(stage, eventId) {
  const event = PASS_FUNNEL[stage];
  if (!event) return;
  try {
    const props = await contextFor({ eventId, where: 'hostv2.pass' });
    if (stage === 'purchase_confirmed') trackOnce('ngw-pass-confirmed-' + eventId, event, props);
    else await track(event, props);
  } catch { /* observational only */ }
}
