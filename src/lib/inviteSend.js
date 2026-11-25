// ─── SENDING THE INVITE — one way, for both host shells (11/25/2026) ─────────
// Owner: "Use the hostv2 sign-in for sending in hostv4." Both shells run on one
// origin, so the account session hostv2 signed in is the one commApi reads for
// either. What leaves the device is defined once, here:
//   - the reply link: the public page a guest opens, checked against that
//     same public lookup before anything goes out (api/rsvp checkRsvpCapability);
//   - the email to one guest: the invite, from the host, replies to the host,
//     with every refusal said in words;
//   - what a send records on the plan.
import { checkRsvpCapability } from './api/rsvp';
import { commApi } from './commApi';
import { publicAppUrl } from './publicAppUrl';
import { markInvited } from './inviteBatch';
import { markNudged } from './replyNudge';
import { messageEmailResult } from './appEmail';

/** The public reply page for this plan. */
export const replyLinkUrl = (event) => publicAppUrl() + '?rsvp=' + encodeURIComponent((event && (event.rsvpCode || event.id)) || '');

/** The checked reply link: { url, reason }. No url means nothing may go out; reason says why. */
export async function replyLinkFor(event) {
  const r = await checkRsvpCapability(event);
  if (!r || !r.ready) return { url: '', reason: (r && r.reason) || 'unavailable' };
  try { return { url: replyLinkUrl(event), reason: null }; } catch { return { url: '', reason: 'unavailable' }; }
}

/**
 * Email the invite to one guest. Resolves { ok:true }, { ok:false, capped:true }
 * (the day's cap: stop the run), or { ok:false, error } in words a host reads.
 */
export async function emailInviteTo(event, guest, { subject, body, hostName, replyTo, cardVersion } = {}) {
  try {
    const res = await commApi.createMessage(event.id, 'CLIENT', {
      // The picture uploaded for this card, by version: the server uses a stored
      // card only when it is THIS one, so a stale picture never goes out.
      ...(cardVersion ? { invite_card_version: cardVersion } : {}),
      message_type: 'standard', author_role: 'planner',
      author_name: hostName || 'Your host',
      // invite: the email IS the invitation, its facts from the saved event (backend invite_email).
      body, deliver_email: true, invite: true, recipient_email: guest.email, recipient_name: guest.name || undefined, subject,
      ...(String(replyTo || '').trim() ? { reply_to: String(replyTo).trim() } : {}),
    });
    const d = res && res.metadata && res.metadata.delivery;
    return d && d.status === 'accepted' ? { ok: true } : { ok: false, error: (d && d.error) || 'no delivery confirmation' };
  } catch (e) {
    const m = String((e && e.message) || '');
    if (/→ 429/.test(m)) return { ok: false, capped: true };
    if (/→ 403/.test(m)) return { ok: false, error: 'not saved to your account yet' };
    if (/→ 410/.test(m)) return { ok: false, error: 'they asked not to get emails about this event — text them instead' };
    // The server read the SAVED event and found no day, hour or place (backend
    // invite_gaps). The app checked its own copy first, so the saved copy lags.
    if (/→ 422/.test(m)) return { ok: false, error: 'the saved copy of your event is missing the day, time or place — give it a moment to save, then try again' };
    return { ok: false, error: 'request failed' };
  }
}

/** Guests the invite reached, by email or text: on each guest, the first send's date, and what went out. */
export function invitesReachedEdit(event, reached, via, at, snapshot) {
  const ev = event || {};
  return {
    patch: {
      guests: markInvited(ev.guests || [], reached, via, at),
      ...(ev.invitesSentAt ? {} : { invitesSentAt: at }),
      ...(reached && reached.length ? { invitesSentMessage: snapshot } : {}),
    },
    msg: null,
  };
}

/**
 * The invite fields a host-recorded send writes ("Mark it sent", Share, Text,
 * WhatsApp): the first send's date and the words that went out. Copying is not
 * a send: the clipboard proves a draft, not delivery.
 */
export function inviteSentFields(event, channel, snapshot, at) {
  if (channel === 'copy') return {};
  return { ...((event && event.invitesSentAt) ? {} : { invitesSentAt: at }), invitesSentMessage: snapshot };
}

/**
 * Email the RSVP nudge to one guest (the reviewed words, its reply link checked
 * when the sheet opened). Same answers as the invite: ok, capped, or an error
 * in words.
 */
export async function emailNudgeTo(event, guest, { subject, body, hostName, replyTo } = {}) {
  try {
    const res = await commApi.createMessage(event.id, 'CLIENT', {
      message_type: 'standard', author_role: 'planner',
      author_name: hostName || 'Your host',
      body, deliver_email: true, recipient_email: guest.email, recipient_name: guest.name || undefined, subject,
      ...(String(replyTo || '').trim() ? { reply_to: String(replyTo).trim() } : {}),
    });
    const r = messageEmailResult(res, null);
    return r.ok ? { ok: true } : { ok: false, error: 'the email service didn’t take it' };
  } catch (e) {
    const r = messageEmailResult(null, e);
    if (r.kind === 'capped') return { ok: false, capped: true };
    if (r.kind === 'stopped') return { ok: false, error: 'they asked not to get emails about this event — text them instead' };
    if (r.kind === 'refused') return { ok: false, error: 'not saved to your account yet' };
    return { ok: false, error: r.kind === 'network' ? 'no connection' : 'request failed' };
  }
}

/** The nudge on each guest it reached: when, and how. Never a delivery claim. */
export function nudgedEdit(event, reached, via, at) {
  return { patch: { guests: markNudged((event && event.guests) || [], reached, via, at) }, msg: null };
}
