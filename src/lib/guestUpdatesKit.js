// ─── UPDATES AND QUESTIONS, ONE WAY (owner, 11/25/2026) ─────────────────────
// "Start the updates and questions flow" in hostv4. Both host shells post an
// update to every guest's invite and answer guests' questions through this
// file, so the rules and the words live once:
//   - updates: 3 a day and 20 per event (counted by the server, shown before
//     she hits them); a second tap before any guest is emailed, because an
//     email cannot be taken back; removing one takes it off the invite and
//     says that emails already sent stay sent;
//   - questions: unanswered first; a reply shows on that guest's invite and is
//     emailed only to a guest who asked for email; block and unblock.
// Every failure is named (signed out, not allowed, unavailable), never shown as
// an empty list. The words are hostv2's, moved here unchanged.
import { useEffect, useState } from 'react';
import { listAnnouncements, postAnnouncement, removeAnnouncement, isAnnouncementsApiConfigured } from './api/announcements';
import { isGuestMessagesApiConfigured, fetchGuestThreads, fetchGuestThread, replyToGuestThread, blockGuestThread } from './api/guestMessages';
import { sortThreads, questionsWaiting } from './guestInbox';
import { track as trackEvent, EVENTS as ANALYTICS } from './analytics';

const guests = (n) => `${n} guest${n === 1 ? '' : 's'}`;
const gets = (n) => (n === 1 ? 'gets' : 'get');   // "1 guest gets", "2 guests get"

export const updatesRoom = (limits) => {
  const dayLeft = Math.max(0, limits.per_day - limits.today);
  const eventLeft = Math.max(0, limits.per_event - limits.total);
  return { dayLeft, eventLeft, canPost: dayLeft > 0 && eventLeft > 0 };
};
export const updatesReachLine = (emailN) => (emailN > 0
  ? `It shows on every guest’s invite, and the ${guests(emailN)} who asked for email ${gets(emailN)} it by email.`
  : 'It shows on every guest’s invite. No guest has asked for email yet, so nobody is emailed.');
export const updatesLimitLine = (limits, eventLeft) => (eventLeft === 0
  ? `You’ve posted the most updates this event allows (${limits.per_event}).`
  : `You’ve posted ${limits.per_day} updates in the last day — you can post again tomorrow.`);
export const updatesFailedLine = (st) => (st.status === 503 ? 'Updates to everyone aren’t switched on yet.'
  : st.failed === 'signed-out' ? 'Sign in to post updates.'
  : st.failed === 'forbidden' ? 'This account can’t post updates for this event.'
  : 'Couldn’t load updates — check your connection and reopen this list.');
export const postedLine = (emailing) => (emailing > 0
  ? `Posted — it’s on every invite, and ${guests(emailing)} ${gets(emailing)} it by email.`
  : 'Posted — it’s on every invite.');
export const postingLine = (emailN) => (emailN > 0 ? `Posting, and emailing ${guests(emailN)}…` : 'Posting the update…');
export const postAndEmailLabel = (emailN) => `Post and email ${guests(emailN)}`;

export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'this guest';
// Placeholders never pass for an answer (owner, 11/25/2026; UX_11 rule 2): the
// update box's example is marked as one, and the reply box says what to do.
export const UPDATE_PLACEHOLDER = 'For example: Parking is on Elm after 5.';
export const replyPlaceholder = (name) => 'Write your reply to ' + firstName(name);
export const inboxWhy = (reason, what) => (reason === 'signed-out'
  ? `Sign in to see ${what}.`
  : reason === 'forbidden' ? `This account can’t see ${what} for this event.`
  : `Couldn’t load ${what} — check your connection and reopen this list.`);
export const replyHintLine = (thread) => {
  const f = firstName(thread && thread.guest_name);
  return thread && thread.email_notices ? `It shows on ${f}’s invite, and ${f} gets it by email.` : `It shows on ${f}’s invite. ${f} didn’t ask for email.`;
};
export const replySentLine = (thread) => {
  const f = firstName(thread && thread.guest_name);
  return thread && thread.email_notices ? `Sent — it shows on ${f}’s invite, and ${f} gets it by email.` : `Sent — it shows on ${f}’s invite.`;
};
export const replyErrorLine = (e) => (e && e.status === 409 ? 'This guest is blocked. Unblock them to reply.'
  : e && e.status === 422 ? 'Plain text only, up to 1,000 characters.'
  : 'Your reply didn’t send. Check your connection and try again.');
export const blockedLine = (name, blocked) => (blocked ? `${firstName(name)} can’t send more questions.` : `${firstName(name)} can ask again.`);

/**
 * Updates to everyone, for one event. st: undefined (loading), the server's
 * { announcements, limits, email_guests }, or { failed, status }.
 * post(text) → true once the server took it; its first tap only asks, when
 * guests will be emailed.
 */
export function useGuestUpdates(eventId) {
  const [st, setSt] = useState(undefined);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await listAnnouncements(eventId);
    // A 200 without the expected shape (a proxy, a half-deployed server) is a failed load, never a crash.
    const good = r.ok && r.limits && Array.isArray(r.announcements);
    setSt(good ? r : { failed: r.ok ? 'unavailable' : r.reason, status: r.ok ? 0 : r.status });
  };
  useEffect(() => { if (isAnnouncementsApiConfigured()) load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  const emailN = (st && !st.failed && st.email_guests) || 0;

  const post = async (text) => {
    const body = String(text || '').trim();
    if (!body || busy) return false;
    if (emailN > 0 && !confirm) { setConfirm(true); return false; }
    setBusy('post'); setErr(''); setLine('');
    const r = await postAnnouncement(eventId, body);
    setBusy(''); setConfirm(false);
    if (!r.ok) { setErr(r.status === 429 || r.status === 422 ? r.reason : 'That didn’t post. Try again.'); return false; }
    try { trackEvent(ANALYTICS.GUEST_UPDATE_POSTED, { emailing: r.emailing || 0 }); } catch (_e) { /* counter only */ }
    setLine(postedLine(r.emailing));
    load();
    return true;
  };
  const remove = async (a) => {
    setBusy(a.id); setErr('');
    const r = await removeAnnouncement(eventId, a.id);
    setBusy('');
    if (!r.ok) { setErr('That didn’t go through. Try again.'); return; }
    setLine('Taken off the invite. Emails already sent stay sent.');
    load();
  };
  return { st, emailN, confirm, setConfirm, busy, line, err, post, remove };
}

/**
 * Guests' questions, for one event. rows: undefined (loading), the sorted
 * threads (unanswered first), or { failed }. open: the thread being read.
 */
export function useGuestQuestions(eventId, onWaiting) {
  const [rows, setRows] = useState(undefined);
  const [open, setOpen] = useState(null);           // { id, thread, messages } | null
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await fetchGuestThreads(eventId);
    if (!r.ok) { setRows({ failed: r.reason }); return; }
    const sorted = sortThreads(r.rows);
    setRows(sorted);
    if (onWaiting) onWaiting(questionsWaiting(sorted));
  };
  useEffect(() => { if (isGuestMessagesApiConfigured()) load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep: a refresh after a reply or a block keeps that status line.
  const openThread = async (id, keep = false) => {
    if (!keep) { setErr(''); setLine(''); setDraft(''); }
    const r = await fetchGuestThread(eventId, id);
    if (!r.ok) { setErr(inboxWhy(r.reason, 'this question')); return; }
    setOpen({ id, thread: r.thread, messages: r.messages });
  };
  const reply = async () => {
    const body = draft.trim();
    if (!body || busy || !open) return;
    setBusy('reply'); setErr(''); setLine('');
    try {
      await replyToGuestThread(eventId, open.id, body);
      try { trackEvent(ANALYTICS.GUEST_ANSWERED, { emailed: !!open.thread.email_notices }); } catch (_e) { /* counter only */ }
      setDraft('');
      setLine(replySentLine(open.thread));
      await openThread(open.id, true);
      await load();
    } catch (e) {
      setErr(replyErrorLine(e));
    } finally { setBusy(''); }
  };
  const block = async (blocked) => {
    if (!open || busy) return;
    setBusy(blocked ? 'block' : 'unblock'); setErr('');
    try {
      await blockGuestThread(eventId, open.id, blocked);
      setLine(blockedLine(open.thread.guest_name, blocked));
      await openThread(open.id, true);
      await load();
    } catch { setErr('That didn’t save. Try again.'); }
    finally { setBusy(''); }
  };
  const close = () => { setOpen(null); setLine(''); setErr(''); };
  return { rows, open, draft, setDraft, busy, line, err, openThread, reply, block, close };
}
