// ─── THE INVITE TO THE WHOLE LIST (owner, 11/19/2026) ─────────────────────────
//
// "Build the invite email batch and text queue." This overturns the earlier
// "never bulk" line for ONE thing, the invite, and keeps what that line was
// protecting:
//   * one email PER GUEST (no shared To:, nobody sees another guest's address),
//     each through the app's existing guarded send: the address must be saved
//     on the event, sends are capped per event per day in the database, and the
//     real delivery answer is recorded;
//   * texts are never sent by the app. A web page cannot, and a texting service
//     means carrier registration and consent rules this product does not take
//     on yet. The queue opens one prefilled text per guest; the host taps send;
//     the hand-off is recorded as the host's word, not as a delivery;
//   * nobody is invited twice: a guest with a good email gets the email, a guest
//     with only a phone goes in the queue, and a guest already invited is
//     skipped by the next batch.
//
// PURE except for the `send` function handed to sendInviteEmails.
import { isMalformedEmail } from './contactFormat';

const digitsOf = (p) => String(p || '').replace(/[^+\d]/g, '');

/** Who the invite can go to, and how. Declined guests are in no list. */
export function inviteRecipients(guests) {
  const out = { email: [], text: [], unreachable: [], alreadyInvited: 0 };
  for (const g of Array.isArray(guests) ? guests : []) {
    if (!g || g.rsvp === 'No') continue;
    if (g.invitedAt) { out.alreadyInvited += 1; continue; }
    const email = String(g.email || '').trim();
    const phone = digitsOf(g.phone);
    const who = { id: g.id, name: String(g.name || '').trim() };
    if (email && !isMalformedEmail(email)) out.email.push({ ...who, email });
    else if (phone.replace(/\D/g, '').length >= 7) out.text.push({ ...who, phone });
    else if (email || phone) out.unreachable.push(who);
  }
  return out;
}

/**
 * Send one email per guest, one after another, and keep every answer.
 * `send(guest)` resolves { ok } or { ok:false, error } or { ok:false, capped:true }.
 * A capped answer stops the run: that guest and the rest are left untried.
 */
export async function sendInviteEmails(list, send, onProgress) {
  const out = { sent: [], failed: [], notTried: [], capped: false };
  const items = Array.isArray(list) ? list : [];
  for (let i = 0; i < items.length; i++) {
    const g = items[i];
    let r;
    try { r = await send(g); } catch (e) { r = { ok: false, error: (e && e.message) || 'request failed' }; }
    if (r && r.capped) { out.capped = true; out.notTried = items.slice(i); break; }
    if (r && r.ok) out.sent.push(g);
    else out.failed.push({ ...g, error: (r && r.error) || 'not sent' });
    if (onProgress) onProgress(i + 1, items.length);
  }
  return out;
}

/** Write the invite onto each guest it reached. Same array back when none did. */
export function markInvited(guests, reached, via, at) {
  const ids = new Set((reached || []).map((x) => x && x.id));
  if (!ids.size) return guests;
  return (guests || []).map((g) => {
    if (!g || !ids.has(g.id)) return g;
    // A guest emailed and then texted (or the other way) keeps both, in order,
    // and the first invite stays the first.
    const ways = String(g.invitedVia || '').split('+').filter(Boolean);
    if (!ways.includes(via)) ways.push(via);
    return { ...g, invitedAt: g.invitedAt || at, invitedVia: ways.join('+') };
  });
}

/**
 * One row per guest who has not declined, with every way they can be reached
 * (owner, 11/19/2026: the host sends email AND text to individual guests).
 * `email` is '' unless the address looks right; `phone` is digits or ''.
 */
export function inviteContacts(guests) {
  return (Array.isArray(guests) ? guests : [])
    .filter((g) => g && g.rsvp !== 'No')
    .map((g) => {
      const email = String(g.email || '').trim();
      const phone = digitsOf(g.phone);
      return {
        id: g.id, name: String(g.name || '').trim(),
        email: email && !isMalformedEmail(email) ? email : '',
        phone: phone.replace(/\D/g, '').length >= 7 ? phone : '',
        invitedVia: g.invitedVia || '',
      };
    });
}

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

/** The text for one guest, greeted by first name. */
export function smsHref(guest, body) {
  const hi = firstName(guest && guest.name);
  const text = (hi ? `Hi ${hi}, ` : '') + String(body || '');
  return 'sms:' + digitsOf(guest && guest.phone) + '?&body=' + encodeURIComponent(text);
}

/** The draft as an email: the subject on the envelope, not repeated as line one. */
export function inviteSubjectAndBody(draft, subject) {
  const text = String(draft || '').trim();
  const s = String(subject || '').trim();
  const [first, ...rest] = text.split(/\n\s*\n/);
  if (s && first && first.trim() === s && rest.length) return { subject: s, body: rest.join('\n\n').trim() };
  return { subject: s, body: text };
}
