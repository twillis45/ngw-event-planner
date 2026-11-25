// ─── messageTimeline — the host's Messages view, as data (owner, 11/20/2026) ──
//
// "Yes, build the Messages view." One read-only timeline per event, newest
// first, of what went out and what came of it. PURE: every input is data the
// shell or the server already has, so every word on the sheet is checkable in
// jest (src/lib/__tests__/messageTimeline.test.js).
//
// THE SOURCES, and the only ones:
//   1. SERVER-LOGGED EMAIL — event_messages rows with metadata.delivery
//      (GET /api/events/{id}/communication/sent): invites, the one-guest email,
//      "Send it to" a vendor, a co-host invite. Its status is what the server
//      or the Resend webhook last wrote (backend main.py _RESEND_STATUS_MAP).
//   2. CO-HOST INVITATIONS — event_cohosts via the same route (host only):
//      invited, or joined. A removed co-host has no row; an invite email whose
//      row is gone reads "No longer a co-host", which is all that is known.
//   3. HOST-RECORDED HANDOFFS — event.sendLedger (lib/sendLedger). Host-
//      attested: the composer opened, nothing more. NEVER "Sent".
//   4. HELPER ASKS — the helper's link (event.helperLinkIds), the handoff the
//      host made with it (sendLedger, about.kind 'helper'), and the helper's own
//      answer from the server (helper-confirmations), in the board's words:
//      "said yes" / "can't do it".
//
// NEVER INVENTED. An email with no delivery report says so. A status this file
// does not know is "No delivery report", not a guess. Signed out, only the
// device's own records show, and the note says server email appears after
// sign-in, so an empty list never reads as "nothing was sent".
import { handoffVia, sendStateLine } from './sendLedger';

export const MESSAGE_GROUPS = Object.freeze([
  ['all', 'All'], ['guests', 'Guests'], ['vendors', 'Vendors'], ['cohosts', 'Co-hosts'], ['helpers', 'Helpers'],
]);

// THE EMPTY STATE AND THE FAILURE ROW (cohesion G #27, owner 11/24/2026). The
// old note pointed "below" at a list that was not there. The empty state now
// says what will be listed; a load failure is its own row ("Email history")
// and says what still shows.
export const EMPTY_EYEBROW = 'Sent from this plan';
export const EMPTY_STAR = 'Nothing yet';
export const EMPTY_LINE = 'When you send the invite, a nudge or an update, it’s listed here: what went out, to whom, and when.';
export const NOTE_TITLE = 'Email history';
export const SIGNED_OUT_NOTE = 'Email the app sends for you shows here after you sign in. Anything sent from this device still shows here.';
export const UNAVAILABLE_NOTE = 'Couldn’t reach it just now. Check your connection and reopen this. Anything sent from this device still shows here.';

/** The ledger title a helper's job is handed off under. One derivation, shared with the shell. */
export const helperAskTitle = (name) => `${String(name || 'Your helper').trim()}’s job`;

const low = (s) => String(s || '').trim().toLowerCase();
const first = (n) => String(n || '').trim().split(/\s+/)[0] || 'They';
const time = (iso) => { const t = Date.parse(String(iso || '')); return Number.isFinite(t) ? t : null; };

/** "Nov 20, 3:10 PM", or null without a real time. `opts` carries a timeZone in tests. */
export function whenLine(iso, opts = {}) {
  const t = time(iso);
  if (t == null) return null;
  const d = new Date(t);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...opts })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...opts })}`;
}

/**
 * A server email's status, in the server's own vocabulary. `tone` is the one
 * place color comes from: red only for what the mail system reports failed.
 */
export function emailStatus(delivery) {
  const s = String((delivery && delivery.status) || '');
  switch (s) {
    case 'email-delivered': return { text: 'Delivered', tone: 'ok' };
    // Resend's opened/clicked: the page loaded in a mail app. "Opened", never "read".
    case 'email-opened': return { text: 'Delivered — opened', tone: 'ok' };
    case 'accepted':
    case 'email-accepted': return { text: 'Queued — the mail service took it; no delivery report yet', tone: 'muted' };
    case 'pending':
    case 'sending': return { text: 'No answer from the mail service was recorded', tone: 'muted' };
    case 'email-deferred': return { text: 'Delayed — the mail service is still trying', tone: 'warn' };
    case 'email-bounced': return { text: 'Bounced — it didn’t reach them', tone: 'danger' };
    case 'email-complained': return { text: 'Marked as spam', tone: 'danger' };
    case 'failed':
    case 'email-failed':
    case 'provider_not_configured':
    case 'no_recipient': return { text: 'Didn’t go out — nothing was sent', tone: 'danger' };
    default: return { text: 'No delivery report', tone: 'muted' };
  }
}

/** A device-ledger entry's status line, without its age (the row carries the time). */
export function handoffStatus(entry) {
  if (!entry) return null;
  // sendStateLine is the ledger's own wording; nowTs 0 makes its age empty.
  const line = sendStateLine(entry, 0);
  if (!line) return { text: 'Recorded on this device', tone: 'attested' };
  if (entry.attested === false) {
    return { text: line, tone: entry.status === 'failed' ? 'danger' : 'muted' };
  }
  return { text: line, tone: 'attested' };
}

function groupForEmail(d, ev) {
  if (d.kind === 'invite') return 'guests';
  if (d.kind === 'helper') return 'helpers';   // the app emailed a helper their job (helper_link.email_helper_job)
  const to = low(d.recipient_email);
  if (to && (ev.guests || []).some((g) => g && low(g.email) === to)) return 'guests';
  if (to && (ev.vendors || []).some((v) => v && low(v.email) === to)) return 'vendors';
  return 'other';
}

function whoForEmail(d, ev) {
  if (d.recipient_name) return String(d.recipient_name);
  const to = low(d.recipient_email);
  const g = to && (ev.guests || []).find((x) => x && low(x.email) === to);
  if (g && g.name) return g.name;
  const v = to && (ev.vendors || []).find((x) => x && low(x.email) === to);
  if (v && v.name) return v.name;
  return d.recipient_email || null;
}

/**
 * buildMessageTimeline({ event, server, helpers, helperAnswers, opts })
 *   server         { status: 'ok', emails, cohosts } | { status: 'signed-out' |
 *                  'unavailable' | 'not-configured' | 'loading' }
 *   helpers        [{ id, name }] — the helper engine's people (shell-derived)
 *   helperAnswers  the server's helper-confirmations rows, newest first
 * → { entries, note, empty }
 */
export function buildMessageTimeline({ event, server, helpers, helperAnswers, opts } = {}) {
  const ev = event || {};
  const srv = server || { status: 'not-configured' };
  const ok = srv.status === 'ok';
  const entries = [];
  const w = (iso) => whenLine(iso, opts);

  // ── 1 + 2. Server email, and co-host invitations ─────────────────────────
  const emails = ok && Array.isArray(srv.emails) ? srv.emails : [];
  const cohostRows = ok && Array.isArray(srv.cohosts) ? srv.cohosts : null;
  const inviteEmail = new Map();   // lower address → newest co-host invite email
  for (const m of emails) {
    const d = (m && m.delivery) || {};
    if (d.intent === 'cohost_invite' && cohostRows) {
      const k = low(d.recipient_email);
      if (k && !inviteEmail.has(k)) inviteEmail.set(k, m);
      continue;
    }
    const st = emailStatus(d);
    entries.push({
      key: `email-${m.id}`, source: 'server',
      group: d.intent === 'cohost_invite' ? 'cohosts' : groupForEmail(d, ev),
      who: whoForEmail(d, ev),
      what: d.subject || (d.intent === 'cohost_invite' ? 'Co-host invite' : 'An email (its subject wasn’t kept)'),
      how: 'by email', at: m.created_at || null, when: w(m.created_at),
      status: st.text, tone: st.tone,
    });
  }
  if (cohostRows) {
    const seen = new Set();
    for (const c of cohostRows) {
      const k = low(c.email); seen.add(k);
      const m = inviteEmail.get(k);
      const e = m ? emailStatus(m.delivery) : null;
      entries.push({
        key: `cohost-${k}`, source: 'server', group: 'cohosts',
        who: c.email, what: 'Co-host invite', how: m ? 'by email' : null,
        at: c.invited_at || null, when: w(c.invited_at),
        status: c.joined_at ? 'Joined' : 'Invited — not signed in yet',
        tone: c.joined_at ? 'ok' : 'muted',
        detail: [c.joined_at ? `Joined ${w(c.joined_at) || ''}`.trim() : null, e ? `Invite email: ${e.text}` : null].filter(Boolean),
        detailTone: e && e.tone === 'danger' ? 'danger' : null,
      });
    }
    for (const [k, m] of inviteEmail) {
      if (seen.has(k)) continue;
      const e = emailStatus(m.delivery);
      entries.push({
        key: `cohost-gone-${m.id}`, source: 'server', group: 'cohosts',
        who: m.delivery.recipient_email, what: 'Co-host invite', how: 'by email',
        at: m.created_at || null, when: w(m.created_at),
        status: 'No longer a co-host', tone: 'muted', detail: [`Invite email: ${e.text}`],
      });
    }
  }

  // ── 3. Host-recorded handoffs (the device's ledger) ──────────────────────
  const ledger = (ev.sendLedger && typeof ev.sendLedger === 'object') ? ev.sendLedger : {};
  const helperHandoff = new Map();   // helper id → { title, entry }
  for (const [title, entry] of Object.entries(ledger)) {
    if (!entry || !entry.status) continue;
    const about = entry.about || null;
    if (about && about.kind === 'helper') { helperHandoff.set(String(about.id || title), { title, entry }); continue; }
    // A server-verified email the device also noted: the server is the truth
    // once it answered, so the device's copy would only repeat it.
    if (entry.attested === false && ok) continue;
    const st = handoffStatus(entry);
    const vendor = about && about.kind === 'vendor' && about.id ? (ev.vendors || []).find((v) => v && String(v.id) === about.id) : null;
    entries.push({
      key: `ledger-${title}`, source: 'device',
      group: about && about.kind === 'vendor' ? 'vendors' : about && about.kind === 'guests' ? 'guests' : 'other',
      who: vendor ? vendor.name || null : about && about.kind === 'guests' ? 'Your guests' : (entry.to || null),
      what: title, how: entry.attested === false ? 'by email' : handoffVia(entry.channel),
      at: entry.at || null, when: w(entry.at),
      status: st.text, tone: st.tone,
    });
  }

  // ── 4. Helper asks ────────────────────────────────────────────────────────
  const names = new Map((Array.isArray(helpers) ? helpers : []).filter((h) => h && h.id != null).map((h) => [String(h.id), h.name]));
  const answers = new Map();
  for (const a of (Array.isArray(helperAnswers) ? helperAnswers : [])) {
    const k = String((a && a.helper_key) || '');
    if (k && !answers.has(k)) answers.set(k, a);   // newest first: the first is the latest
  }
  const ids = new Set([
    ...(Array.isArray(ev.helperLinkIds) ? ev.helperLinkIds.map(String) : []),
    ...helperHandoff.keys(), ...answers.keys(),
  ]);
  for (const id of ids) {
    const h = helperHandoff.get(id);
    const a = answers.get(id);
    const name = names.get(id) || null;
    const aAt = a ? (a.updated_at || a.submitted_at) : null;
    const ats = [h && h.entry.at, aAt].filter((x) => time(x) != null);
    const at = ats.sort((x, y) => time(y) - time(x))[0] || null;
    const answer = a ? `${first(name)} ${a.state === 'confirmed' ? 'said yes' : 'can’t do it'}${a.state !== 'confirmed' && a.note ? ` — “${a.note}”` : ''}${w(aAt) ? ` · ${w(aAt)}` : ''}` : null;
    entries.push({
      key: `helper-${id}`, source: h ? 'device' : 'server', group: 'helpers',
      who: name || 'A helper', what: h ? h.title : helperAskTitle(name || 'Your helper'),
      how: h ? handoffVia(h.entry.channel) : 'by link',
      at, when: w(at),
      status: h ? (handoffStatus(h.entry) || {}).text : 'Link made — no send recorded',
      tone: 'attested',
      detail: answer ? [answer] : [],
      detailTone: a ? (a.state === 'confirmed' ? 'ok' : 'warn') : null,
    });
  }

  entries.sort((x, y) => (time(y.at) ?? -Infinity) - (time(x.at) ?? -Infinity));
  const note = srv.status === 'signed-out' ? SIGNED_OUT_NOTE : srv.status === 'unavailable' ? UNAVAILABLE_NOTE : null;
  // "Nothing sent yet" only when every source answered: never while signed out
  // or after a failed load, where it could be false.
  const empty = entries.length === 0 && (ok || srv.status === 'not-configured');
  return { entries, note, empty };
}

/** The filter's rows: All, then only the groups that have something. */
export function groupsPresent(entries) {
  const have = new Set((entries || []).map((e) => e.group));
  return MESSAGE_GROUPS.filter(([k]) => k === 'all' || have.has(k));
}

export const filterTimeline = (entries, group) => (!group || group === 'all' ? (entries || []) : (entries || []).filter((e) => e.group === group));
