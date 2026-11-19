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
import { guestCountFor } from './guestCountFor';

const PH_KEY    = process.env.REACT_APP_POSTHOG_KEY || 'phc_kViRwC7yZp9aAqfvqyKw7HJCBxuGqfCnzMAb7yZzgd9p';
const PH_HOST   = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';
// A Capacitor shell serves the bundle from localhost (capacitor://localhost, https://localhost)
// but is a real install, not dev (NAT-7). Same native check as publicAppUrl.js.
const IS_NATIVE = typeof window !== 'undefined' && !!(window.Capacitor && window.Capacitor.isNativePlatform());
// Never report from local dev — keep the production funnel clean.
const IS_LOCAL  = typeof window !== 'undefined' && !IS_NATIVE && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

export const isAnalyticsConfigured = () => Boolean(PH_KEY) && !IS_LOCAL;

// Sprint 55N — keep internal/test/smoke sessions out of the activation funnel.
// The prod smoke loads `…?noanalytics=1`; an operator can also persist
// `ngw-analytics-optout=1`. When opted out, track()/trackOnce() no-op.
export const ANALYTICS_OPTOUT_KEY = 'ngw-analytics-optout';
const NOTICE_SEEN_KEY = 'ngw-analytics-notice-seen';

function analyticsOptedOut() {
  try {
    if (typeof window !== 'undefined' && /[?&]noanalytics=1/.test(window.location.search)) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(ANALYTICS_OPTOUT_KEY) === '1') return true;
  } catch { /* storage blocked → treat as opted-in */ }
  return false;
}
export const isAnalyticsOptedOut = () => analyticsOptedOut();

/**
 * The Settings toggle (owner ruling 2026-11-02, option A: notice plus a
 * VISIBLE opt-out — until then the only opt-out was a URL flag). Writes the
 * key this module already honors; if PostHog is loaded, it is paused or
 * resumed too so nothing queued slips out after "off".
 */
export function setAnalyticsOptOut(off) {
  try {
    if (off) localStorage.setItem(ANALYTICS_OPTOUT_KEY, '1');
    else localStorage.removeItem(ANALYTICS_OPTOUT_KEY);
  } catch { /* storage blocked — nothing to persist */ }
  try { if (_ph) { if (off) _ph.opt_out_capturing(); else _ph.opt_in_capturing(); } } catch { /* best-effort */ }
}

/**
 * The notice's one action (owner call B, 11/16/2026): "Turn this off" turns
 * analytics off — it used to only open Settings. `after` lets the shell sync
 * its own state and say so.
 */
export function analyticsNoticeAction(after) {
  return { label: 'Turn this off', fn: () => { setAnalyticsOptOut(true); if (after) after(); } };
}

/** The one-time first-open line: only where analytics would actually run, and only once. */
export function shouldShowAnalyticsNotice() {
  if (!isAnalyticsConfigured() || analyticsOptedOut()) return false;
  try { return localStorage.getItem(NOTICE_SEEN_KEY) !== '1'; } catch { return false; }
}
export function markAnalyticsNoticeSeen() {
  try { localStorage.setItem(NOTICE_SEEN_KEY, '1'); } catch { /* best-effort */ }
}

/** First 16 hex chars of SHA-256, or null when the browser cannot hash. */
async function oneWayLabel(text) {
  try {
    // `crypto`, not globalThis: the CRA build's ESLint has no globalThis and fails the build on it.
    const subtle = typeof crypto !== 'undefined' && crypto && crypto.subtle;
    if (!subtle || typeof TextEncoder === 'undefined') return null;
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch { return null; }
}

let _ph = null;

// ── WHERE A VISITOR CAME FROM: CAMPAIGN TAGS (owner, 11/19/2026: "Build the
// PostHog fixes") ──────────────────────────────────────────────────────────
// PostHog loads lazily, at the first tracked action, so the landing URL's
// utm_* tags and referrer could be gone by then. They are read at BOOT (this
// module's import) and kept as the FIRST touch, then registered on every event
// once PostHog starts. Kept: the five utm_* tags (trimmed, 80 characters) and
// the referring SITE's host name only, never its path or query, and never this
// app's own host. lib/acquisition keeps the invite/vendor arrival separately.
export const FIRST_TOUCH_KEY = 'ngw-first-touch';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

/** The campaign a landing URL carries, or null. PURE. */
export function campaignFrom(search, referrer, ownHost) {
  const out = {};
  try {
    const q = new URLSearchParams(String(search || ''));
    UTM_KEYS.forEach((k) => {
      const v = String(q.get(k) || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
      if (v) out[k] = v;
    });
  } catch { /* a malformed query is no campaign */ }
  try {
    const host = referrer ? new URL(String(referrer)).hostname : '';
    if (host && host !== ownHost) out.referrer_host = host;
  } catch { /* not a URL */ }
  return Object.keys(out).length ? out : null;
}

/** The stored first touch, or null. */
export function firstTouch(storage) {
  try { const v = JSON.parse((storage && storage.getItem(FIRST_TOUCH_KEY)) || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

/** First touch wins: kept once, never overwritten. */
export function rememberFirstTouch(storage, campaign, now = Date.now()) {
  if (!storage || !campaign || firstTouch(storage)) return;
  try { storage.setItem(FIRST_TOUCH_KEY, JSON.stringify({ ...campaign, at: new Date(now).toISOString() })); } catch { /* best-effort */ }
}

/** The first touch as event properties: first_utm_source, first_referrer_host… */
export function firstTouchProps(storage) {
  const t = firstTouch(storage);
  if (!t) return {};
  const out = {};
  [...UTM_KEYS, 'referrer_host'].forEach((k) => { if (t[k]) out['first_' + k] = t[k]; });
  return out;
}

try {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    rememberFirstTouch(localStorage, campaignFrom(window.location.search, typeof document !== 'undefined' ? document.referrer : '', window.location.hostname));
  }
} catch { /* never break the app's boot */ }

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
      // Contact details never leave. Was `sanitize_properties` in a `loaded`
      // callback; posthog-js deprecated it for before_send (11/16/2026).
      before_send: (ev) => {
        if (!ev || !ev.properties) return ev;
        const properties = { ...ev.properties };
        ['email', 'name', 'phone', '$email', '$name'].forEach(k => delete properties[k]);
        return { ...ev, properties };
      },
    });
    _ph = posthog;
    // Every event carries where this browser first came from (see FIRST_TOUCH_KEY).
    try { const ft = firstTouchProps(localStorage); if (Object.keys(ft).length) posthog.register_once(ft); } catch { /* best-effort */ }
    return _ph;
  } catch {
    return null;
  }
}

/**
 * Identify the planner's studio — by a ONE-WAY HASH, never the name (owner
 * ruling 2026-11-02). Until then this sent `studio_<business name>` and the
 * business name itself; a sole proprietor's business name is often their own.
 * An opted-out host is never identified (the old version never checked), and a
 * browser that cannot hash is not identified at all — it never falls back to
 * the readable name. Pinned by analyticsPrivacy.test.js.
 */
export async function identifyStudio(profile) {
  if (analyticsOptedOut() || !profile) return;
  const name = String(profile.businessName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!name) return;
  const label = await oneWayLabel(name);
  if (!label) return;
  const ph = await getPostHog();
  if (!ph) return;
  ph.identify(`studio_${label}`, { role: profile.role || 'Owner' });
}

/**
 * ONE PERSON ACROSS DEVICES (owner, 11/19/2026). A signed-in host is identified
 * by a ONE-WAY HASH of their account id: `host_` plus 16 hex characters. Never
 * the email, never the name, never the raw id. The server uses the same label
 * for a purchase (backend analytics.account_label), so a pass bought on one
 * device joins the person who planned on another. Opted out: nothing. A browser
 * that cannot hash: not identified at all.
 */
export async function accountLabel(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const h = await oneWayLabel(id);
  return h ? 'host_' + h : null;
}

export async function identifyAccount(user) {
  if (analyticsOptedOut() || !user || !user.id) return null;
  const label = await accountLabel(user.id);
  if (!label) return null;
  const ph = await getPostHog();
  if (!ph) return null;
  try {
    let ft = {};
    try { ft = firstTouchProps(localStorage); } catch { /* none */ }
    ph.identify(label, {}, ft);   // first touch as $set_once person properties
  } catch { /* best-effort */ }
  return label;
}

/** Sign-out: the next person on this browser is not counted as this one. */
export async function resetAnalytics() {
  try { if (_ph) _ph.reset(); } catch { /* best-effort */ }
}

/**
 * The account's session signals (ported from the legacy shell's
 * trackActivationSession, which the live app never had): signed_up once per
 * account per browser, with whether the account is new, how they signed in and
 * where they first came from; returned_d1 / returned_d7 from the account's own
 * creation date. Ids stay in localStorage keys, never in what is sent.
 */
export async function trackAccountSession(user, now = Date.now()) {
  if (!user || !user.id || analyticsOptedOut()) return;
  await identifyAccount(user);
  const createdT = Date.parse(user.created_at || '');
  const days = Number.isNaN(createdT) ? null : Math.max(0, Math.floor((now - createdT) / 86400000));
  let ft = {};
  try { ft = firstTouchProps(localStorage); } catch { /* none */ }
  trackOnce('ngw-evt-signed_up-' + user.id, EVENTS.SIGNED_UP, {
    is_new_account: !Number.isNaN(createdT) && (now - createdT) < 10 * 60000,
    auth_method: (user.app_metadata && user.app_metadata.provider) || 'unknown',
    ...ft,
  });
  if (days != null && days >= 1) trackOnce('ngw-returned-d1-' + user.id, EVENTS.RETURNED_D1, { days_since_signup: days });
  if (days != null && days >= 7) trackOnce('ngw-returned-d7-' + user.id, EVENTS.RETURNED_D7, { days_since_signup: days });
}

/**
 * The events that count as REAL plans: a date and a head count (the legacy
 * shell's EVENT_QUALIFIED bar, which the live app never fired). PURE.
 */
export function qualifiedEvents(events) {
  return (events || []).filter((ev) => {
    if (!ev || !ev.id) return false;
    const hasDate = !!String(ev.date || '').trim();
    // The head count through its one reader (theHeadcountHasOneCanonicalReader).
    let hasCount = false;
    try { const g = guestCountFor(ev); hasCount = !!(g && g.known && g.count > 0); } catch { /* no count */ }
    return hasDate && hasCount;
  });
}

/** Fire event_qualified once per event and second_event_created once. */
export function trackActivation(events, now = Date.now()) {
  if (analyticsOptedOut()) return;
  const q = qualifiedEvents(events);
  q.forEach((ev) => {
    const created = Date.parse(ev.createdAt || '');
    trackOnce('ngw-evt-qualified-' + ev.id, EVENTS.EVENT_QUALIFIED, {
      event_type: ev.type || null,
      acquisition_source: (ev.acquisitionSource && ev.acquisitionSource.from) || null,
      days_since_event_created: Number.isNaN(created) ? null : Math.max(0, Math.floor((now - created) / 86400000)),
    });
  });
  if (q.length >= 2) trackOnce('ngw-second-event-created', EVENTS.SECOND_EVENT_CREATED, { qualified_count: q.length });
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
  // Failure classes and paid-path intent (no event contents or raw IDs).
  SAVE_FAILED:            'save_failed',
  PROVIDER_FAILED:        'provider_failed',
  ROUTE_FAILED:           'route_failed',
  PASS_CHECKOUT_FAILED:   'pass_checkout_failed',
  PASS_VERIFY_FAILED:     'pass_verify_failed',
  BRIEF_MINT_FAILED:      'brief_mint_failed',   // a configured vendor-brief mint did not return a code
  PASS_SHEET_VIEWED:      'pass_sheet_viewed',
  PASS_CHECKOUT_STARTED:  'pass_checkout_started',
  PASS_PURCHASE_CONFIRMED: 'pass_purchase_confirmed', // once per event, after the server confirms

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

  // Feature use (owner, 11/16/2026: "add analytics"). Which section was opened,
  // and the moments that matter in the features shipped 11/16. Counts and kinds
  // only: never a name, an email, a code or a message body.
  SECTION_OPENED:         'section_opened',         // { section } — calendar, cohosts, split, family, guests…
  CALENDAR_ADDED:         'calendar_added',         // { how: 'file' | 'subscription' }
  COHOST_INVITED:         'cohost_invited',         // { emailed }
  FAMILY_LINK_ON:         'family_link_on',
  GUEST_UPDATE_POSTED:    'guest_update_posted',    // { emailing } — how many guests get it by email
  GUEST_ANSWERED:         'guest_answered',         // { emailed } — the host answered a guest's question
  GUEST_PHOTO_APPROVED:   'guest_photo_approved',
  FIRST_GUEST_ADDED:      'first_guest_added',     // UX-7 no-intake funnel
  FIRST_VENDOR_ADDED:     'first_vendor_added',

  // Invite growth loop — host shares their invite link → guest RSVPs back to host.
  // The two-step viral loop we instrument to measure invite-driven growth.
  INVITE_SHARED:          'invite_shared',          // host shares/copies invite link
  INVITE_SENT:            'invite_sent',            // { via: 'email' | 'text', count } — the invite batch, the text queue, one guest at a time (11/19/2026)
  INVITE_VIEWED:          'invite_viewed',          // a guest OPENS the shared invite page (reach — did the share land?)
  INVITE_RSVP_SUBMITTED:  'invite_rsvp_submitted',  // a guest submits the RSVP on the invite page (conversion)
  GUEST_RSVP_RECEIVED:    'guest_rsvp_received',     // a guest RSVP arrives back to the host
  PLAN_YOURS_TAPPED:      'plan_yours_tapped',       // a guest taps the "make one free" recruit CTA on the confirmation (recruitment top-of-funnel)

  // ── Rental capture funnel (B3, board 2026-07-28) ────────────────────────
  // Rams made this his price for keeping the bookmarklet at all: "If it is over
  // 10% of adds, it has earned its place and I withdraw. Ship the counter before
  // you ship anything else." Without it the next board argues from anecdote.
  // Three steps, because the interesting failure is BETWEEN them: she pasted and
  // we read nothing (parse problem), or we read it and she walked away (trust
  // problem). One number cannot tell those apart.
  // `method` distinguishes paste vs bookmarklet — that is the kill criterion.
  LODGING_PASTE_ATTEMPTED: 'lodging_paste_attempted', // something arrived to interpret
  LODGING_PASTE_PARSED:    'lodging_paste_parsed',    // we got ≥1 candidate out of it
  LODGING_OPTION_ADDED:    'lodging_option_added',    // it reached the shortlist

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

  // Reasoning Continuity v1 (2026-07-31) — the queue used to render title + arrow
  // only, so "does a host act sooner when told why" had no way to be answered.
  // Every one of these carries reason_type + reason_source so a low-value reason
  // KIND can be retired on evidence rather than opinion.
  REASON_SHOWN:           'reason_shown',
  // RENAMED before any production data existed (instrumentation sprint): the
  // handler is the ROW's onClick and fires only when a reason is present, so it
  // observes "a row carrying a reason was tapped" -- NOT "the reason caused the
  // tap". There is no control arm. The old name asserted causation the event
  // cannot support.
  ROW_WITH_REASON_CLICKED: 'row_with_reason_clicked',
  ACTION_COMPLETED_WITH_REASON: 'action_completed_with_reason',
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
