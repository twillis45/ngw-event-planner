// ─── NUDGE THE ONES WHO HAVEN'T ANSWERED (owner ruling, 11/20/2026) ─────────
//
// "Approve as written." One action, built on the invite batch (lib/inviteBatch):
//   * WHO: guests whose invite went out (the batch's `invitedAt`, or the host
//     marked them told) and who have not answered.
//   * WHO IT SKIPS: anyone nudged in the last 3 days. A stopped email address is
//     the server's to refuse (410), exactly as for every other email.
//   * HOW: email goes from the app, one per guest, through the guarded message
//     route; a text goes into the one-at-a-time prefilled queue and is the
//     host's word, never a delivery.
//   * ONLY where reply tracking is on (guestMode.showsReplyTracking). A
//     headcount-only event is never nudged.
//   * WHEN: never by itself. The board asks 3 days before a reply-by date the
//     HOST set (rsvpDeadlineFor source 'override'; a derived date is never used
//     or stated), and again from the day after it passes, while anyone invited
//     is still unanswered and not nudged in the last 3 days.
//   * THE CHECKLIST: a chase step is done when everyone invited has answered or
//     been nudged (taskEngine). Opening the sheet records nothing.
//
// PURE. Every date is a LOCAL calendar date (dates.localISO / daysUntil); `now`
// is optional and exists so tests can pin the day.
import { isMalformedEmail } from './contactFormat';
import { rsvpHasResponded } from './rsvp';
import { guestToldMap } from './guestTold';
import { guestWasInvited } from './inviteBatch';
import { showsReplyTracking } from './guestMode';
import { daysUntil, isPastEvent, localISO, rsvpDeadlineFor } from './dates';
import { emailStatus } from './messageTimeline';

/** Nobody is nudged twice inside this many calendar days. */
export const NUDGE_GAP_DAYS = 3;
/** The board asks this many days before the host's reply-by date. */
export const NUDGE_LEAD_DAYS = 3;

const digitsOf = (p) => String(p || '').replace(/[^+\d]/g, '');
const timeOf = (iso) => { const t = Date.parse(String(iso || '')); return Number.isFinite(t) ? t : null; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Did this guest's invite go out? The batch wrote `invitedAt`, or the host marked them told. */
export function wasInvited(event, guest) {
  return guestWasInvited(guest, guestToldMap(event));
}

/** Whole calendar days since the guest's last nudge (0 = today), or null if never nudged. */
export function daysSinceNudge(guest, now) {
  const t = timeOf(guest && guest.nudgedAt);
  if (t == null) return null;
  const d = daysUntil(localISO(new Date(t)), now);
  return d == null ? null : -d;
}

export const nudgedRecently = (guest, now) => {
  const k = daysSinceNudge(guest, now);
  return k != null && k < NUDGE_GAP_DAYS;
};

/**
 * Who the nudge goes to, and how. `email` and `text` are the guests it will
 * reach (a good address gets the email; only a phone goes in the text queue);
 * `recentlyNudged` were skipped by the 3-day rule; `invited` / `answered` are
 * the evidence the board shows. Empty for a headcount-only event.
 */
export function nudgeRecipients(event, now) {
  const out = { email: [], text: [], unreachable: [], recentlyNudged: 0, invited: 0, answered: 0 };
  if (!event || !showsReplyTracking(event)) return out;
  for (const g of Array.isArray(event.guests) ? event.guests : []) {
    if (!g || g.id == null || !wasInvited(event, g)) continue;
    out.invited += 1;
    if (rsvpHasResponded(g)) { out.answered += 1; continue; }
    if (nudgedRecently(g, now)) { out.recentlyNudged += 1; continue; }
    const email = String(g.email || '').trim();
    const phone = digitsOf(g.phone);
    const who = { id: g.id, name: String(g.name || '').trim() };
    if (email && !isMalformedEmail(email)) out.email.push({ ...who, email });
    else if (phone.replace(/\D/g, '').length >= 7) out.text.push({ ...who, phone });
    else out.unreachable.push(who);
  }
  return out;
}

/** How many the one action reaches: "Nudge the N who haven't answered". */
export const nudgeCount = (r) => (r ? r.email.length + r.text.length : 0);

/**
 * Write the nudge onto each guest it reached. The latest nudge's day is kept;
 * a guest emailed and texted on the same day keeps both ways, in order.
 * Same array back when nobody was reached.
 */
export function markNudged(guests, reached, via, at) {
  const ids = new Set((reached || []).map((x) => x && x.id));
  if (!ids.size) return guests;
  const day = (iso) => { const t = timeOf(iso); return t == null ? null : localISO(new Date(t)); };
  return (guests || []).map((g) => {
    if (!g || !ids.has(g.id)) return g;
    const sameDay = g.nudgedAt && day(g.nudgedAt) === day(at);
    const ways = sameDay ? String(g.nudgedVia || '').split('+').filter(Boolean) : [];
    if (!ways.includes(via)) ways.push(via);
    return { ...g, nudgedAt: at, nudgedVia: ways.join('+') };
  });
}

const weekdayOf = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
const monthDayOf = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * THE TIMING RULE. The board item, or null.
 *   before: from 3 days before the host's reply-by date through that day —
 *           "3 haven't answered — replies due Friday"
 *   after:  from the day after it passes, while anyone invited is unanswered
 *           and not nudged in the last 3 days — "3 haven't answered — replies were due Friday"
 * Never for a derived date, a past event, a headcount-only event, or when
 * nobody is left to nudge.
 */
export function nudgeBoardItem(event, now) {
  if (!event || !showsReplyTracking(event)) return null;
  if (isPastEvent(event.date, now)) return null;
  let dl = null;
  try { dl = rsvpDeadlineFor(event); } catch (_e) { return null; }
  if (!dl || dl.source !== 'override' || !dl.iso) return null;   // only a date the host set
  const days = daysUntil(dl.iso, now);
  if (!Number.isFinite(days) || days > NUDGE_LEAD_DAYS) return null;
  const r = nudgeRecipients(event, now);
  const n = nudgeCount(r);
  if (!n) return null;
  const who = n === 1 ? '1 hasn’t replied' : `${n} haven’t replied`;
  // COUNT FIRST (owner, 11/20/2026): a phone's "Then, in order" row keeps only
  // what comes before " — ", so the count leads and survives the trim.
  const title = days >= 0
    ? `${who} — replies due ${days === 0 ? 'today' : weekdayOf(dl.iso)}`
    : `${who} — replies were due ${-days <= 6 ? weekdayOf(dl.iso) : monthDayOf(dl.iso)}`;
  const why = [`${r.answered} of ${r.invited} invited have answered`,
    r.recentlyNudged ? `${plural(r.recentlyNudged, 'was', 'were')} nudged in the last ${NUDGE_GAP_DAYS} days` : null]
    .filter(Boolean).join(' · ');
  return { phase: days >= 0 ? 'before' : 'after', days, count: n, title, why };
}

/**
 * THE CHECKLIST RULE. A chase step is done when everyone invited has answered
 * or been nudged. False when nobody was invited: no invite, nothing to chase.
 */
export function chaseAnsweredOrNudged(event) {
  const guests = Array.isArray(event && event.guests) ? event.guests : [];
  const invited = guests.filter((g) => wasInvited(event, g));
  if (!invited.length) return false;
  return invited.every((g) => rsvpHasResponded(g) || timeOf(g.nudgedAt) != null);
}

/**
 * The server's newest email to this guest from the nudge on, or null. `server`
 * is listSentMessages' answer; only an 'ok' read is evidence.
 */
export function nudgeDeliveryFor(guest, server) {
  if (!guest || !server || server.status !== 'ok') return null;
  const to = String(guest.email || '').trim().toLowerCase();
  const at = timeOf(guest.nudgedAt);
  if (!to || at == null) return null;
  const SLACK = 10 * 60 * 1000;   // the row is written before the guest's record is
  let best = null;
  for (const m of Array.isArray(server.emails) ? server.emails : []) {
    const d = (m && m.delivery) || {};
    const t = timeOf(m && m.created_at);
    if (String(d.recipient_email || '').trim().toLowerCase() !== to || t == null || t < at - SLACK) continue;
    if (!best || t > best.t) best = { t, delivery: d };
  }
  return best ? best.delivery : null;
}

/**
 * The guest row's line: "Nudged Nov 21 · emailed — Delivered" or
 * "Nudged Nov 21 · texted by you". A text is the host's word: never "sent".
 * `delivery` is the server's report (nudgeDeliveryFor); without one, the email
 * says only what is known — the email service took it. `opts` may carry a
 * timeZone for tests.
 */
export function nudgeRowLine(guest, delivery, opts = {}) {
  const t = timeOf(guest && guest.nudgedAt);
  if (t == null) return null;
  const day = new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...opts });
  const ways = String(guest.nudgedVia || '').split('+').filter(Boolean);
  const how = ways.map((w) => (w === 'text'
    ? 'texted by you'
    : `emailed — ${delivery ? emailStatus(delivery).text : 'the email service took it'}`));
  return `Nudged ${day}${how.length ? ' · ' + how.join(' · ') : ''}`;
}

/**
 * The nudge as a text: the reviewed words without a greeting of their own,
 * because the queue greets each guest by first name (inviteBatch.smsHref).
 */
export function nudgeTextBody(body) {
  const s = String(body || '').trim();
  const m = /^Hi(?:!|\s+—)\s+(\S)/.exec(s);
  return m ? m[1].toLowerCase() + s.slice(m[0].length) : s;
}
