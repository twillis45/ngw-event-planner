// THE INVITE PAGE'S DESIGN, ONE RULE FOR BOTH SHELLS (owner, 11/26/2026: "start
// the card design" in hostv4). What the host shapes on the page a guest opens:
// the layout, her message (event.deckLine), Hosted by, how guests reach her,
// the paper (inviteStyle) and the artwork (inviteCrest). hostv2's
// InviteDesignSheet and hostv4's design page both save through this.
import { suggestedInviteLine, INVITE_MESSAGE_MAX } from './inviteDeck';
import { isValidPhone, isValidEmail, normalizePhone } from './contactFormat';

export const INVITE_LAYOUTS = [['classic', 'Classic'], ['glance', 'At a glance']];
const CONTACT_PROBLEM = 'Add a phone number or an email address, or leave it empty.';

// The suggested line saved unchanged is not her words: it is stored empty, so
// it stays the suggestion (and unsigned) if the event's type changes.
export function storedInviteMessage(event, message) {
  const m = String(message == null ? '' : message).trim();
  return m === suggestedInviteLine(event) ? '' : m.slice(0, INVITE_MESSAGE_MAX);
}

// "How guests reach you": a phone or an email, or nothing.
export function inviteContactProblem(contact) {
  const c = String(contact == null ? '' : contact).trim();
  if (!c) return null;
  // isValidPhone reads "no digits" as a blank (and fine) phone, so "call me"
  // passed hostv2's old inline check. A phone here is phone characters only,
  // with its digits; an email is an email.
  const phone = /^[\d\s()+.-]+$/.test(c) && normalizePhone(c).length > 0 && isValidPhone(c);
  const email = c.includes('@') && isValidEmail(c);
  return phone || email ? null : CONTACT_PROBLEM;
}

// fields: any of { message, inviteLayout, hostName, hostContact, inviteStyle,
// inviteCrest }. Returns { patch, msg }, or { error } and nothing saved.
export function inviteDesignEdit(event, fields) {
  const f = fields || {};
  const patch = {};
  if ('message' in f) patch.deckLine = storedInviteMessage(event, f.message);
  if ('inviteLayout' in f) {
    if (!INVITE_LAYOUTS.some(([v]) => v === f.inviteLayout)) return { error: 'Pick Classic or At a glance.' };
    patch.inviteLayout = f.inviteLayout;
  }
  if ('hostName' in f) patch.hostName = String(f.hostName || '').trim().slice(0, 120);
  if ('hostContact' in f) {
    const problem = inviteContactProblem(f.hostContact);
    if (problem) return { error: problem };
    patch.hostContact = String(f.hostContact || '').trim();
  }
  if ('inviteStyle' in f) patch.inviteStyle = String(f.inviteStyle || '');
  if ('inviteCrest' in f) patch.inviteCrest = f.inviteCrest === 'off' ? 'off' : '';
  return { patch, msg: 'Your invite page is saved — your link shows it now.' };
}
