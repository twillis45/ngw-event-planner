// ─── flowAnalytics — the counters for the flows shipped 11/19–11/20/2026 ─────
//
// Owner, 11/20/2026: "Yes, build the six events", then the signed-out funnel
// ("we are missing activity in posthog"). Every event here goes through
// analytics.track / trackOnce, so the opt-out, the dev tap and the super
// properties apply exactly as they do to every other event.
//
// WHAT TRAVELS: counts, booleans and fixed enums. Never an email address, a
// name, a phone number, a message body, a note or any other free text. Each
// builder below picks its properties by name from a fixed list; nothing a
// caller passes is forwarded wholesale. Pinned by flowAnalytics.test.js.
import { track, trackOnce, EVENTS } from './analytics';
import { guestCountFor } from './guestCountFor';

const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const len = (a) => (Array.isArray(a) ? a.length : 0);
const safe = (fn) => { try { fn(); } catch { /* a counter never blocks a host, a guest or a helper */ } };

// ── 1. The nudge ─────────────────────────────────────────────────────────────

/** nudge_sent's properties from one email run (inviteBatch.sendInviteEmails) and the recipients (replyNudge.nudgeRecipients). PURE. */
export function nudgeRunProps(result, recipients) {
  const out = result || {};
  const r = recipients || {};
  return {
    emailed: len(out.sent),
    email_failed: len(out.failed),
    capped: out.capped === true,
    texts_queued: len(r.text),
    skipped_recent: n(r.recentlyNudged),
  };
}

/** Once per email run of "Nudge the N who haven't answered". */
export const trackNudgeRun = (result, recipients) => safe(() => track(EVENTS.NUDGE_SENT, nudgeRunProps(result, recipients)));

/** Each text the host marks as sent from the queue. Nothing about who. */
export const trackNudgeText = () => safe(() => track(EVENTS.NUDGE_TEXT_SENT, {}));

// ── 2. The Messages view ─────────────────────────────────────────────────────

export const MESSAGES_ENTRIES = Object.freeze(['section_list', 'jump', 'route']);

/** messages_view_opened's properties from the built timeline (messageTimeline.buildMessageTimeline). PURE. */
export function messagesViewProps(entries, entry, signedIn) {
  const count = (prefix) => (Array.isArray(entries) ? entries : []).filter((e) => e && String(e.key || '').startsWith(prefix)).length;
  return {
    entry: MESSAGES_ENTRIES.includes(entry) ? entry : 'other',
    emails: count('email-'),
    handoffs: count('ledger-'),
    cohost: count('cohost-'),
    helper: count('helper-'),
    signed_in: signedIn === true,
  };
}

export const trackMessagesViewOpened = (entries, entry, signedIn) =>
  safe(() => track(EVENTS.MESSAGES_VIEW_OPENED, messagesViewProps(entries, entry, signedIn)));

// ── 3. The helper ask, and the helper's answer ──────────────────────────────

// emailHelperJob's failure kinds, folded to the enum. 'failed' is Resend
// refusing the send; 'refused' is the server refusing the caller (403).
const HELPER_REASON = { capped: 'capped', stopped: 'stopped', refused: 'refused', failed: 'refused', network: 'network' };

/** helper_email_sent's properties from emailHelperJob's result. PURE. */
export function helperEmailProps(r) {
  if (r && r.ok === true) return { ok: true };
  return { ok: false, reason: HELPER_REASON[r && r.kind] || 'other' };
}

export const trackHelperEmail = (r) => safe(() => track(EVENTS.HELPER_EMAIL_SENT, helperEmailProps(r)));

/** From the helper's own page, after the server took the answer. Never the note. */
export const trackHelperAnswered = (state) =>
  safe(() => track(EVENTS.HELPER_ANSWERED, { answer: state === 'confirmed' ? 'yes' : 'no' }));

// ── 4. "Open your plan" from the week-before reminder ───────────────────────

export const REMINDER_TAG = 'from';
export const REMINDER_TAG_VALUE = 'reminder';

/**
 * The reminder's tag on this URL: { tagged, url } where `url` is the same
 * address without it (every other parameter kept). PURE.
 */
export function readReminderTag(href) {
  try {
    const u = new URL(String(href));
    if (u.searchParams.get(REMINDER_TAG) !== REMINDER_TAG_VALUE) return { tagged: false, url: null };
    u.searchParams.delete(REMINDER_TAG);
    return { tagged: true, url: u.toString() };
  } catch { return { tagged: false, url: null }; }
}

/**
 * At load: if the address carries the reminder's tag, strip it (so a refresh
 * or a bookmark never counts twice) and send plan_opened_from_reminder once.
 * Returns whether it was tagged.
 */
export function takeReminderTag(win) {
  let tagged = false;
  safe(() => {
    const w = win || (typeof window !== 'undefined' ? window : null);
    if (!w) return;
    const t = readReminderTag(w.location.href);
    if (!t.tagged) return;
    tagged = true;
    try { w.history.replaceState(null, '', t.url); } catch { /* the tag stays; the event still sends once per load */ }
    track(EVENTS.PLAN_OPENED_FROM_REMINDER, {});
  });
  return tagged;
}

// ── 7. The signed-out funnel ────────────────────────────────────────────────

/** plan_drafted's properties from the held draft and where the host came from. PURE. */
export function planDraftedProps(ev, arrivedFrom) {
  const e = ev || {};
  let hasHeadcount = false;
  try { const g = guestCountFor(e); hasHeadcount = !!(g && g.known && g.count > 0); } catch { /* unknown is no */ }
  return {
    event_type: e.type ? String(e.type) : null,
    is_destination: e.isDestination === true,
    has_date: !!String(e.date || '').trim(),
    has_headcount: hasHeadcount,
    ...(arrivedFrom && arrivedFrom.from ? { came_from: String(arrivedFrom.from) } : {}),
  };
}

/** Once per draft (keyed by the draft's id, which a correction keeps). */
export const trackPlanDrafted = (ev, arrivedFrom) =>
  safe(() => { if (ev && ev.id) trackOnce('ngw-plan-drafted-' + ev.id, EVENTS.PLAN_DRAFTED, planDraftedProps(ev, arrivedFrom)); });

// ── 8. Asked to keep it, and the sign-in email ──────────────────────────────

export const KEEP_INTENTS = Object.freeze(['plan', 'invite', 'device_plan']);

export const trackKeepPrompt = (intent) =>
  safe(() => track(EVENTS.KEEP_PROMPT_SHOWN, { intent: KEEP_INTENTS.includes(intent) ? intent : 'other' }));

/** After the sign-in email was asked for: whether the service took it, and whether a keep prompt led here. */
export const trackSignInCodeRequested = (success, afterKeepPrompt) =>
  safe(() => track(EVENTS.SIGN_IN_CODE_REQUESTED, { success: success === true, after_keep_prompt: afterKeepPrompt === true }));

// ── 9. Device notifications, on and off (owner decision "B", 11/20/2026) ────

/** "Notifications on this device" turned on: the browser allowed it and the server took the device. */
export const trackPushEnabled = () => safe(() => track(EVENTS.PUSH_ENABLED, {}));

/** …and turned off. Nothing about the device or the host. */
export const trackPushDisabled = () => safe(() => track(EVENTS.PUSH_DISABLED, {}));
