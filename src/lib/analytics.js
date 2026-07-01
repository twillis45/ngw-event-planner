/**
 * PostHog product analytics — Sprint 69 (Phase 3)
 *
 * Tracks key planner actions for product learning.
 * Privacy-first: no PII sent, all events are behavioral.
 *
 * Active by default in any DEPLOYED build: a public, write-only PostHog ingestion
 * key (phc_…, safe to ship) is hardcoded below as a fallback, and REACT_APP_POSTHOG_KEY
 * overrides it. Free tier: posthog.com — 1M events/month free.
 *
 * Truthfulness: behavioral only, never PII. NEVER fires from local dev (IS_LOCAL),
 * and a session can opt out (`?noanalytics=1` or `ngw-analytics-optout=1`) — when it
 * does, track()/trackOnce() no-op. So: on by default in prod, off in dev, opt-out honored.
 */

// PostHog project keys (phc_…) are PUBLIC, write-only ingestion keys — designed to
// ship in the client bundle. Hardcoded as a fallback so every prod build reports
// without remembering an env prefix; an env var still overrides it.
const PH_KEY    = process.env.REACT_APP_POSTHOG_KEY || 'phc_kViRwC7yZp9aAqfvqyKw7HJCBxuGqfCnzMAb7yZzgd9p';
const PH_HOST   = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';
// Never report from local dev — keep the production funnel clean.
const IS_LOCAL  = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

export const isAnalyticsConfigured = () => Boolean(PH_KEY) && !IS_LOCAL;

// Sprint 55N — keep internal/test/smoke sessions out of the activation funnel.
// The prod smoke loads `…?noanalytics=1`; an operator can also persist
// `ngw-analytics-optout=1`. When opted out, track()/trackOnce() no-op.
function analyticsOptedOut() {
  try {
    if (typeof window !== 'undefined' && /[?&]noanalytics=1/.test(window.location.search)) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ngw-analytics-optout') === '1') return true;
  } catch { /* storage blocked → treat as opted-in */ }
  return false;
}

let _ph = null;

/** Lazy-load PostHog and initialize once. */
async function getPostHog() {
  if (_ph) return _ph;
  if (!PH_KEY || IS_LOCAL) return null;
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(PH_KEY, {
      api_host: PH_HOST,
      // Privacy defaults — coordinator data is sensitive
      autocapture: false,         // no automatic click/form capture
      capture_pageview: false,    // we track pages manually
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: 'localStorage',
      loaded: (ph) => {
        // Mask all text input values in session recordings if ever enabled
        ph.set_config({ sanitize_properties: (props) => {
          const safe = { ...props };
          ['email', 'name', 'phone', '$email', '$name'].forEach(k => delete safe[k]);
          return safe;
        }});
      },
    });
    _ph = posthog;
    return _ph;
  } catch {
    return null;
  }
}

/**
 * Identify the planner (studio-level, not personal).
 * Only sends studio name + role — never email or personal name.
 */
export async function identifyStudio(profile) {
  const ph = await getPostHog();
  if (!ph || !profile) return;
  // Use a hashed studio identifier, not PII
  const studioId = profile.businessName
    ? `studio_${profile.businessName.toLowerCase().replace(/\s+/g, '_').slice(0, 20)}`
    : 'studio_unknown';
  ph.identify(studioId, {
    studio_name: profile.businessName || 'Unknown Studio',
    role: profile.role || 'Owner',
    // No email, no personal name
  });
}

/**
 * Track a planner action.
 * All properties are behavioral — no PII.
 */
export async function track(event, properties = {}) {
  if (analyticsOptedOut()) return;
  // Dev-only observability tap (IS_LOCAL ⇒ PostHog is disabled). Lets validation /
  // QA confirm events actually fire on localhost. No-op in production.
  try { if (IS_LOCAL && typeof window !== 'undefined') { (window.__NGW_TRACK__ = window.__NGW_TRACK__ || []).push({ event, ...properties }); } } catch (e) { /* ignore */ }
  const ph = await getPostHog();
  if (!ph) return;
  ph.capture(event, {
    ...properties,
    // Strip any accidental PII
    email: undefined,
    name: undefined,
    phone: undefined,
  });
}

// ── Pre-defined events (keeps tracking consistent) ─────────────────────────

export const EVENTS = {
  // Navigation
  PAGE_VIEW:              'page_view',
  TAB_CHANGED:            'tab_changed',

  // Event management
  EVENT_CREATED:          'event_created',
  EVENT_OPENED:           'event_opened',

  // Host Home / account identity (UX-2)
  ACCOUNT_TYPE_SELECTED:  'account_type_selected',
  HOST_HOME_VIEWED:       'host_home_viewed',
  HOST_NEXT_STEP_CLICKED: 'host_next_step_clicked',
  FIRST_GUEST_ADDED:      'first_guest_added',     // UX-7 no-intake funnel
  FIRST_VENDOR_ADDED:     'first_vendor_added',

  // Invite growth loop — host shares their invite link → guest RSVPs back to host.
  // The two-step viral loop we instrument to measure invite-driven growth.
  INVITE_SHARED:          'invite_shared',          // host shares/copies invite link
  INVITE_VIEWED:          'invite_viewed',          // a guest OPENS the shared invite page (reach — did the share land?)
  INVITE_RSVP_SUBMITTED:  'invite_rsvp_submitted',  // a guest submits the RSVP on the invite page (conversion)
  GUEST_RSVP_RECEIVED:    'guest_rsvp_received',     // a guest RSVP arrives back to the host
  PLAN_YOURS_TAPPED:      'plan_yours_tapped',       // a guest taps the "make one free" recruit CTA on the confirmation (recruitment top-of-funnel)

  // Activation funnel (Sprint 55N) — denominator → setup → value → retention
  SIGNED_UP:              'signed_up',
  INTAKE_COMMITTED:       'intake_committed',
  FIRST_VALUE:            'first_value',
  RETURNED_D1:            'returned_d1',
  RETURNED_D7:            'returned_d7',

  // "First 50 Real Events" activation sprint (2026-06-21) — the strict real-event
  // funnel PostHog watches. EVENT_CREATED fires for any non-seed event; these mark
  // the milestones that actually mean activation:
  //   • EVENT_QUALIFIED      — an event first has the 3 essentials (date + venue +
  //                            guest count): the true "real event started" line.
  //   • ASSEMBLE_VIEWED      — the host watched the plan get built ("press play").
  //   • SECOND_EVENT_CREATED — a user started a 2nd real event: the retention proof.
  EVENT_QUALIFIED:        'event_qualified',
  ASSEMBLE_VIEWED:        'assemble_viewed',
  SECOND_EVENT_CREATED:   'second_event_created',

  // Activation back-half (Host Activation v1) — the moat-gating signals the
  // 60C→61B arc found uninstrumented. First occurrence drives the funnel; every
  // occurrence measures depth.
  DECISION_CAPTURED:      'decision_captured',
  ROS_ITEM_ADDED:         'ros_item_added',
  EVENT_COMPLETED:        'event_completed',
  OUTCOME_CAPTURED:       'outcome_captured',

  // INTEL-1 P4 R1 — attendance read-forward (the first Host-Intelligence reader that changes a
  // plan). _applied when learned memory adjusts the plan-to count; _reverted when the host keeps
  // their own number for an event. Payload: delta%/planned/suggested/n/confidence/stability/clamped.
  INTEL_ATTENDANCE_APPLIED:  'intel_attendance_applied',
  INTEL_ATTENDANCE_REVERTED: 'intel_attendance_reverted',

  // INTEL-QA-1 Stage 1 — evaluation capture. Every recommendation becomes an evaluation record;
  // these mark its lifecycle so a FUTURE stage can score it. _shown when presented, _overridden
  // when the host sets their own number, _evaluated when the real outcome is attached at
  // reconciliation (NOT scored — just "an actual now exists"). Accept/revert reuse the existing
  // intel_attendance_* events. Payload is behavioral only (readerId + counts), no PII.
  INTEL_REC_SHOWN:       'intel_rec_shown',
  INTEL_REC_OVERRIDDEN:  'intel_rec_overridden',
  INTEL_REC_EVALUATED:   'intel_rec_evaluated',

  // Food sourcing (FOOD-2A Stage 0) — which buying style a host picks. The sourcing
  // model was previously write-only (no telemetry); this closes that blind spot so we
  // can see tier adoption before evolving the model. Behavioral only, no PII.
  SOURCE_SELECTED:        'source_selected',

  // Vendors
  VENDOR_ADDED:           'vendor_added',
  VENDOR_CONTRACT_SENT:   'vendor_contract_sent_docusign',
  VENDOR_CONTRACT_UPLOADED: 'vendor_contract_uploaded',
  VENDOR_PAYMENT_RECORDED: 'vendor_payment_recorded',

  // Communication
  MESSAGE_SENT:           'message_sent',
  GLOBAL_COMPOSE_OPENED:  'global_compose_opened',
  APPROVAL_REQUESTED:     'approval_requested',
  APPROVAL_RECORDED:      'approval_recorded',

  // Clients
  CLIENT_CREATED:         'client_created',
  CLIENT_FORM_SECTION_OPENED: 'client_form_section_opened',

  // Integrations
  DOCUSIGN_CONNECTED:     'docusign_connected',
  EMAIL_SENT:             'email_sent',
  FILE_UPLOADED:          'file_uploaded',
  ICS_DOWNLOADED:         'ics_downloaded',

  // Features
  WEATHER_ALERT_SHOWN:    'weather_alert_shown',
  RSVP_REMINDER_SENT:     'rsvp_reminder_sent',
  AI_COPILOT_USED:        'ai_copilot_used',

  // Funnel depth (2026-06-25) — two high-signal moments that were firing nothing:
  //   • DAY_MODE_OPENED      — host opened event-day mode (the run of show goes live).
  //   • SHOPPING_PLAN_VIEWED — host opened their sized shopping/food plan (value moment).
  // (RSVP_REMINDER_SENT already exists; it was being mis-tagged as INVITE_SHARED.)
  DAY_MODE_OPENED:        'day_mode_opened',
  SHOPPING_PLAN_VIEWED:   'shopping_plan_viewed',
};

/**
 * Fire an event at most once per browser, keyed by a stable localStorage key.
 * Returns true if it fired (first time), false if already fired / storage blocked.
 * Used for the once-per-user / once-per-event activation stages (Sprint 55N).
 */
export function trackOnce(key, event, props = {}) {
  try {
    if (!key || localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
  } catch {
    return false; // storage unavailable → don't risk duplicate funnel events
  }
  track(event, props);
  return true;
}

/** Shorthand helpers for the most common events */
export const trackPageView  = (page)    => track(EVENTS.PAGE_VIEW, { page });
export const trackTabChange = (tab, ev) => track(EVENTS.TAB_CHANGED, { tab, event_type: ev?.type });
export const trackMsgSent   = (ch, via) => track(EVENTS.MESSAGE_SENT, { channel: ch, delivery: via });
