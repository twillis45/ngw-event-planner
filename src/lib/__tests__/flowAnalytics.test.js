/**
 * @jest-environment jsdom
 */
// The client events for the flows shipped 11/19–11/20/2026 (owner, 11/20:
// "Yes, build the six events"; then the signed-out funnel). For each: it fires
// ONCE, with EXACTLY the allowed properties, carries no contact detail or free
// text, and sends nothing when the host (or guest, or helper) opted out.
// Driven through the real analytics.track with posthog-js mocked, so the
// opt-out tested is the one the app ships.

const captured = [];
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: () => {},
    capture: (e, p) => { captured.push({ e, p }); },
    register_once: () => {},
    set_config: () => {},
  },
}));

const asDeployed = (search = '') => {
  delete window.location;
  window.location = new URL('https://twillis45.github.io/ngw-event-planner/hostv2/' + search);
};
const load = () => { jest.resetModules(); return require('../flowAnalytics'); };
const flush = () => new Promise((r) => setTimeout(r, 0));
// What PostHog would receive: track() sets email/name/phone to undefined, which
// JSON drops; the payload is compared as sent.
const sent = (name) => captured.filter((c) => c.e === name).map((c) => JSON.parse(JSON.stringify(c.p)));

const PII = ['@', 'Ana Ruiz', 'ana.ruiz', '555', 'Running late', 'Jordan'];
const noPii = (payload) => { const s = JSON.stringify(payload); PII.forEach((x) => expect(s).not.toContain(x)); };

beforeEach(() => { captured.length = 0; localStorage.clear(); asDeployed(); });

async function once(name, fire) {
  fire();
  await flush(); await flush();
  const got = sent(name);
  expect(got).toHaveLength(1);
  noPii(got);
  return got[0];
}

async function optedOut(name, fire) {
  localStorage.setItem('ngw-analytics-optout', '1');
  fire();
  await flush(); await flush();
  expect(sent(name)).toHaveLength(0);
}

// ── 1. nudge_sent / nudge_text_sent ────────────────────────────────────────
const RUN = {
  sent: [{ id: 'g1', name: 'Ana Ruiz', email: 'ana.ruiz@x.test' }],
  failed: [{ id: 'g2', name: 'Jordan', email: 'j@x.test', error: 'no connection' }],
  notTried: [{ id: 'g3', name: 'Bo', email: 'bo@x.test' }],
  capped: true,
};
const RECIP = { email: RUN.sent, text: [{ id: 'g4', name: 'Kim', phone: '5551234567' }, { id: 'g5', name: 'Lu', phone: '5559876543' }], recentlyNudged: 3, unreachable: [] };

test('nudge_sent: once per run, counts only', async () => {
  const f = load();
  const p = await once('nudge_sent', () => f.trackNudgeRun(RUN, RECIP));
  expect(p).toEqual({ emailed: 1, email_failed: 1, capped: true, texts_queued: 2, skipped_recent: 3 });
});
test('nudge_sent: opted out sends nothing', async () => { const f = load(); await optedOut('nudge_sent', () => f.trackNudgeRun(RUN, RECIP)); });

test('nudge_text_sent: one per text, no recipient', async () => {
  const f = load();
  const p = await once('nudge_text_sent', () => f.trackNudgeText());
  expect(p).toEqual({});
});
test('nudge_text_sent: opted out sends nothing', async () => { const f = load(); await optedOut('nudge_text_sent', () => f.trackNudgeText()); });

// ── 2. messages_view_opened ────────────────────────────────────────────────
const ENTRIES = [
  { key: 'email-1', who: 'Ana Ruiz', what: 'Running late' }, { key: 'email-2', who: 'ana.ruiz@x.test' },
  { key: 'ledger-Vendor note', who: 'Jordan' }, { key: 'cohost-bo@x.test', who: 'bo@x.test' },
  { key: 'cohost-gone-9' }, { key: 'helper-h1', who: 'Jordan' },
];
test('messages_view_opened: entry, counts by kind, signed in', async () => {
  const f = load();
  const p = await once('messages_view_opened', () => f.trackMessagesViewOpened(ENTRIES, 'jump', true));
  expect(p).toEqual({ entry: 'jump', emails: 2, handoffs: 1, cohost: 2, helper: 1, signed_in: true });
  expect(f.messagesViewProps([], 'section_list', false)).toEqual({ entry: 'section_list', emails: 0, handoffs: 0, cohost: 0, helper: 0, signed_in: false });
  expect(f.messagesViewProps([], 'anything', undefined).entry).toBe('other');
});
test('messages_view_opened: opted out sends nothing', async () => { const f = load(); await optedOut('messages_view_opened', () => f.trackMessagesViewOpened(ENTRIES, 'route', true)); });

// ── 3. helper_email_sent / helper_answered ─────────────────────────────────
test('helper_email_sent: ok, or a reason from the fixed enum', async () => {
  const f = load();
  expect(await once('helper_email_sent', () => f.trackHelperEmail({ ok: true, status: 'accepted' }))).toEqual({ ok: true });
  expect(f.helperEmailProps({ ok: false, kind: 'capped', status: 429 })).toEqual({ ok: false, reason: 'capped' });
  expect(f.helperEmailProps({ ok: false, kind: 'stopped' })).toEqual({ ok: false, reason: 'stopped' });
  expect(f.helperEmailProps({ ok: false, kind: 'refused' })).toEqual({ ok: false, reason: 'refused' });
  expect(f.helperEmailProps({ ok: false, kind: 'failed' })).toEqual({ ok: false, reason: 'refused' });
  expect(f.helperEmailProps({ ok: false, kind: 'network' })).toEqual({ ok: false, reason: 'network' });
  expect(f.helperEmailProps({ ok: false, kind: 'no-email', detail: 'ana.ruiz@x.test' })).toEqual({ ok: false, reason: 'other' });
});
test('helper_email_sent: opted out sends nothing', async () => { const f = load(); await optedOut('helper_email_sent', () => f.trackHelperEmail({ ok: true })); });

test('helper_answered: yes or no, never the note', async () => {
  const f = load();
  expect(await once('helper_answered', () => f.trackHelperAnswered('declined', 'Running late'))).toEqual({ answer: 'no' });
  captured.length = 0;
  expect(await once('helper_answered', () => f.trackHelperAnswered('confirmed'))).toEqual({ answer: 'yes' });
});
test('helper_answered: the helper page honors the same opt-out as the invite page', async () => {
  const f = load(); await optedOut('helper_answered', () => f.trackHelperAnswered('confirmed'));
  // …and the URL flag a guest or helper link can carry.
  localStorage.clear(); asDeployed('?helper=abc&noanalytics=1');
  const g = load(); g.trackHelperAnswered('confirmed'); await flush(); await flush();
  expect(sent('helper_answered')).toHaveLength(0);
});

// ── 4. plan_opened_from_reminder ───────────────────────────────────────────
// A window whose address bar replaceState really rewrites (jsdom's own cannot
// once location is swapped for a URL, which the deployed-host check needs).
const fakeWin = (href) => { const w = { location: { href }, history: { replaceState: (_s, _t, url) => { w.location.href = url; } } }; return w; };
const REM = 'https://twillis45.github.io/ngw-event-planner/hostv2/';
test('plan_opened_from_reminder: once at load, and the tag leaves the address', async () => {
  const w = fakeWin(REM + '?from=reminder&elegant=1');
  const f = load();
  const p = await once('plan_opened_from_reminder', () => expect(f.takeReminderTag(w)).toBe(true));
  expect(p).toEqual({});
  expect(w.location.href).toBe(REM + '?elegant=1');
  expect(f.takeReminderTag(w)).toBe(false);     // a second read finds no tag
  await flush();
  expect(sent('plan_opened_from_reminder')).toHaveLength(1);
});
test('plan_opened_from_reminder: no tag, no event', async () => {
  const f = load();
  expect(f.takeReminderTag(fakeWin(REM + '?from=elsewhere'))).toBe(false);
  await flush();
  expect(sent('plan_opened_from_reminder')).toHaveLength(0);
});
test('plan_opened_from_reminder: opted out sends nothing (the tag still goes)', async () => {
  const w = fakeWin(REM + '?from=reminder');
  const f = load();
  await optedOut('plan_opened_from_reminder', () => f.takeReminderTag(w));
  expect(w.location.href).toBe(REM);
});

// ── 7. plan_drafted ────────────────────────────────────────────────────────
const DRAFT = { id: 'cust-1', type: 'Birthday', name: 'Ana Ruiz’s 40th', honoree: 'Ana Ruiz', date: '2027-03-01', guestEstimate: 30, isDestination: true };
test('plan_drafted: once per draft, the shape of the plan only', async () => {
  const f = load();
  const p = await once('plan_drafted', () => { f.trackPlanDrafted(DRAFT, { from: 'invite', kind: 'Birthday', at: 'x' }); f.trackPlanDrafted(DRAFT, null); });
  expect(p).toEqual({ event_type: 'Birthday', is_destination: true, has_date: true, has_headcount: true, came_from: 'invite' });
  expect(f.planDraftedProps({ id: 'x', type: 'Dinner' }, null)).toEqual({ event_type: 'Dinner', is_destination: false, has_date: false, has_headcount: false });
});
test('plan_drafted: opted out sends nothing', async () => { const f = load(); await optedOut('plan_drafted', () => f.trackPlanDrafted(DRAFT, null)); });

// ── 8. keep_prompt_shown / sign_in_code_requested ──────────────────────────
test('keep_prompt_shown: the intent only, from a fixed set', async () => {
  const f = load();
  expect(await once('keep_prompt_shown', () => f.trackKeepPrompt('invite'))).toEqual({ intent: 'invite' });
  captured.length = 0;
  expect(await once('keep_prompt_shown', () => f.trackKeepPrompt('ana.ruiz@x.test'))).toEqual({ intent: 'other' });
});
test('keep_prompt_shown: opted out sends nothing', async () => { const f = load(); await optedOut('keep_prompt_shown', () => f.trackKeepPrompt('plan')); });

test('sign_in_code_requested: success and whether a keep prompt led here, never the address', async () => {
  const f = load();
  expect(await once('sign_in_code_requested', () => f.trackSignInCodeRequested(true, true))).toEqual({ success: true, after_keep_prompt: true });
  captured.length = 0;
  expect(await once('sign_in_code_requested', () => f.trackSignInCodeRequested(false, false))).toEqual({ success: false, after_keep_prompt: false });
});
test('sign_in_code_requested: opted out sends nothing', async () => { const f = load(); await optedOut('sign_in_code_requested', () => f.trackSignInCodeRequested(true, false)); });

// ── the name table ─────────────────────────────────────────────────────────
test('every client name is in the one name table', () => {
  jest.resetModules();
  const { EVENTS } = require('../analytics');
  ['nudge_sent', 'nudge_text_sent', 'messages_view_opened', 'helper_email_sent', 'helper_answered',
    'plan_opened_from_reminder', 'plan_drafted', 'keep_prompt_shown', 'sign_in_code_requested']
    .forEach((name) => expect(Object.values(EVENTS)).toContain(name));
});

