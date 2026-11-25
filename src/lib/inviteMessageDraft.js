// ─── THE INVITE MESSAGE: SAVED, PREVIEWED, RECORDED (owner, 11/24/2026) ──────
//
// The Share & invite card's "Invite message" row (renders s2-3 to s2-6):
//   * event.inviteMessageDraft { body, voice, savedAt, edited, line } is the
//     host's saved words, written through patchEvent so it syncs. `line` is the
//     page message (deckLine) the draft was saved against, so a later change to
//     it can be OFFERED ("Use your new line?") and never written over her edits.
//   * event.invitesSentMessage { subject, body, voice, at } is what went out,
//     written at send time; the "What went out" sheet reads it with each
//     guest's own record (invitedAt, invitedVia, guestTold, rsvp).
//   * a text is the body only (the subject is the email's) in plain
//     punctuation: curly quotes and dashes push a text out of the 7-bit
//     alphabet and a phone splits it into more parts.
// Neither field reaches a guest: the backend's guest-visible list
// (rsvp.PUBLIC_EVENT_FIELDS) is an allow-list and names neither.
// PURE.
import { inviteSubjectAndBody, guestWasInvited } from './inviteBatch';
import { guestToldMap } from './guestTold';

/** What a draft carries where the reply link goes while the link isn't ready. */
export const LINK_PLACEHOLDER = '[your reply link goes here]';

const str = (v) => String(v == null ? '' : v);

/** The saved draft, or null. */
export function savedInviteDraft(event) {
  const d = event && event.inviteMessageDraft;
  if (!d || typeof d !== 'object' || !str(d.body).trim()) return null;
  return { body: str(d.body), voice: str(d.voice) || 'as-written', savedAt: d.savedAt || null, edited: !!d.edited, line: str(d.line) };
}

/** The record "Save draft" writes. */
export function inviteDraftRecord({ body, voice, edited, line, now }) {
  return { body: str(body), voice: str(voice) || 'as-written', savedAt: now || new Date().toISOString(), edited: !!edited, line: str(line) };
}

/** The verified reply link in place of the placeholder. No link, no change. */
export function withLink(text, url) {
  const u = str(url).trim();
  return u ? str(text).split(LINK_PLACEHOLDER).join(u) : str(text);
}

/** Her page message changed after she edited the saved words: { from, to }, or null. */
export function lineChange(event) {
  const d = savedInviteDraft(event);
  if (!d || !d.edited) return null;
  const to = str(event.deckLine).trim();
  const from = d.line.trim();
  if (from === to) return null;
  return { from, to };
}

/** Her words with the old page line swapped for the new; null when the old line isn't in them. */
export function swapPageLine(body, from, to) {
  const b = str(body);
  if (!from || !b.includes(from)) return null;
  return b.split(from).join(to);
}

/** Plain punctuation for a text. */
export function plainText(s) {
  return str(s)
    .replace(/[‘’‚‛′]/g, '\'')
    .replace(/[“”„‟″]/g, '"')
    .replace(/[—–‒―]/g, '-')
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/ /g, ' ');
}

/** The text a guest gets: the body without the subject line, in plain punctuation. */
export function textMessageBody(draft, subject) {
  return plainText(inviteSubjectAndBody(draft, subject).body);
}

// The GSM 03.38 basic alphabet; its extension characters count twice.
const GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€\f';

/** { chars, gsm, parts }: how a phone splits a text. */
export function smsSegments(text) {
  const chars = [...str(text)];
  const gsm = chars.every((c) => GSM.includes(c) || GSM_EXT.includes(c));
  if (gsm) {
    const units = chars.reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
    return { chars: chars.length, gsm: true, parts: units <= 160 ? 1 : Math.ceil(units / 153) };
  }
  return { chars: chars.length, gsm: false, parts: chars.length <= 70 ? 1 : Math.ceil(chars.length / 67) };
}

/** What went out. */
export function sentSnapshot({ subject, body, voice, at }) {
  return { subject: str(subject), body: str(body), voice: str(voice) || 'as-written', at: at || new Date().toISOString() };
}

const CHANNEL = { email: 'Email', text: 'Text, by you' };

/** Everyone the invite went to, with how and where their reply stands. */
export function sentRecipients(event) {
  const told = guestToldMap(event);
  return (Array.isArray(event && event.guests) ? event.guests : [])
    .filter((g) => g && guestWasInvited(g, told))
    .map((g) => {
      const ways = str(g.invitedVia).split('+').filter(Boolean);
      const channel = !ways.length ? 'Sent by you'
        : ways.length > 1 ? 'Email and text, by you'
          : (CHANNEL[ways[0]] || 'Sent by you');
      const r = str(g.rsvp);
      const status = r === 'Yes' ? 'Replied yes' : r === 'No' ? 'Replied no' : r === 'Maybe' ? 'Replied maybe' : 'Invited';
      return { id: g.id, name: str(g.name).trim() || 'A guest', channel, status, tone: r === 'Yes' ? 'ok' : '' };
    });
}

const monthDay = (iso) => {
  const t = Date.parse(str(iso));
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
};

/** The "Invite message" row's line: { kind: 'none' | 'saved' | 'sent', line }. */
export function draftStatus(event) {
  const sent = event && event.invitesSentMessage;
  if (sent && str(sent.body).trim()) {
    const d = monthDay(sent.at);
    return { kind: 'sent', line: (d ? 'Sent ' + d : 'Sent') + ' · see what went out' };
  }
  const d = savedInviteDraft(event);
  if (!d) return { kind: 'none', line: 'Written from your plan · check it' };
  return { kind: 'saved', line: d.edited ? 'Draft saved · edited' : 'Draft saved' };
}

/** Saving the words is an edit both shells make: { patch, msg }. Nothing is sent. */
export function saveDraftEdit({ body, voice, edited, line, now }) {
  return { patch: { inviteMessageDraft: inviteDraftRecord({ body, voice, edited, line, now }) }, msg: 'Draft saved — nothing was sent.' };
}
