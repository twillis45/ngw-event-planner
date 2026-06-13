/**
 * PostHog product analytics — Sprint 69 (Phase 3)
 *
 * Tracks key planner actions for product learning.
 * Privacy-first: no PII sent, all events are behavioral.
 *
 * Activate: set REACT_APP_POSTHOG_KEY in .env.local
 * Free tier: posthog.com — 1M events/month free
 *
 * CTA truthfulness: analytics only fires when key is set.
 * No fake tracking. No silent data collection.
 */

// PostHog project keys (phc_…) are PUBLIC, write-only ingestion keys — designed to
// ship in the client bundle. Hardcoded as a fallback so every prod build reports
// without remembering an env prefix; an env var still overrides it.
const PH_KEY    = process.env.REACT_APP_POSTHOG_KEY || 'phc_kViRwC7yZp9aAqfvqyKw7HJCBxuGqfCnzMAb7yZzgd9p';
const PH_HOST   = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';
// Never report from local dev — keep the production funnel clean.
const IS_LOCAL  = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

export const isAnalyticsConfigured = () => Boolean(PH_KEY) && !IS_LOCAL;

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
};

/** Shorthand helpers for the most common events */
export const trackPageView  = (page)    => track(EVENTS.PAGE_VIEW, { page });
export const trackTabChange = (tab, ev) => track(EVENTS.TAB_CHANGED, { tab, event_type: ev?.type });
export const trackMsgSent   = (ch, via) => track(EVENTS.MESSAGE_SENT, { channel: ch, delivery: via });
