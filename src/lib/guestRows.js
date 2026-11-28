// THE GUEST ROWS (G2c-2b-2a; owner, 11/28/2026, UX_12 §8a, render screen 1).
// What the Guests kit's list shows under each name, how it is read by group,
// its plus-ones and kids total, and what the find box matches. The old Guests
// sheet showed and searched the same fields (HostShellV2's roster); the kit
// reads them from here.
import { plusOneLabel, plusOneCount } from './plusOneCount';
import { sizingRange, attendanceBand } from './playbooks';
import { wasInvited } from './replyNudge';
import { inviteRecipients, greetingName } from './inviteBatch';
import { guestToldMap } from './guestTold';
import { invitesOut } from './taskEngine';

/** The find box shows from this many names (owner, 11/28/2026: from 8, was 21). */
export const FIND_FROM = 8;

const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';

/** Short tags under a guest's name: +1, "with" a partner, kids, diets, allergies. */
export function guestRowTags(g, guests) {
  if (!g) return [];
  const out = [];
  const plus = plusOneLabel(g);
  if (plus) out.push(plus);
  if (g.coupleId) {
    const p = (guests || []).find((x) => x && x !== g && x.id !== g.id && x.coupleId === g.coupleId);
    if (p && first(p.name)) out.push('with ' + first(p.name));
  }
  const kids = Number(g.kids) || 0;
  if (kids > 0) out.push(kids + (kids === 1 ? ' kid' : ' kids'));
  for (const d of Array.isArray(g.diets) ? g.diets : []) if (d) out.push(String(d));
  for (const a of Array.isArray(g.allergens) ? g.allergens : []) if (a) out.push(a + ' allergy');
  return out;
}

/** The find box's match: the name, the +1, the group and the email. */
export function findGuests(guests, q) {
  const s = String(q || '').trim().toLowerCase();
  const list = (guests || []).filter(Boolean);
  if (!s) return list;
  return list.filter((g) => [g.name, g.plusOne, g.group, g.email].some((v) => String(v || '').toLowerCase().includes(s)));
}

/**
 * The list read by group (Family, Friends, Work): groups in the order first
 * used, guests with no group last (group ''). Null when no guest has a group,
 * so a plain list stays plain.
 */
export function households(guests) {
  const list = (guests || []).filter(Boolean);
  const name = (g) => String(g.group || '').trim();
  if (!list.some(name)) return null;
  const order = []; const by = new Map();
  for (const g of list) {
    const k = name(g);
    if (!by.has(k)) { by.set(k, []); if (k) order.push(k); }
    by.get(k).push(g);
  }
  const out = order.map((k) => ({ group: k, guests: by.get(k) }));
  if (by.has('')) out.push({ group: '', guests: by.get('') });
  return out;
}

/** Plus-ones and kids across the list. */
export function partyTotals(guests) {
  let plusOnes = 0; let kids = 0;
  for (const g of guests || []) { if (!g) continue; plusOnes += plusOneCount(g); kids += Number(g.kids) || 0; }
  return { plusOnes, kids };
}

/**
 * The turnout line (owner, 11/28/2026, call B): "Likely 3–5 on the day." from
 * the replies (sizingRange, the one sized-for reader), with its reason (the
 * reply band's own words) for one tap down. Null without a range, or when a
 * planned count outranks a short list (that is the plan, not a turnout).
 */
export function turnoutLine(event) {
  let sized = null; let band = null;
  try { sized = sizingRange(event); band = attendanceBand(event); } catch { return null; }
  if (!sized || sized.plannedOverRoster || !sized.spread || !band || !band.because) return null;
  return { line: 'Likely ' + sized.label + ' on the day.', why: band.because };
}

/**
 * Who you can reach and hasn't had the invite (render screen 1, #5): a phone or
 * an email, and no invite record of any kind (emailed or texted, or told by
 * hand: replyNudge wasInvited). Only after an invite went out with per-guest
 * records; a link shared with none went to the whole list (the Replies rule).
 */
export function notToldYet(event) {
  const guests = (Array.isArray(event && event.guests) ? event.guests : []).filter(Boolean);
  if (!event || !event.invitesSentAt || !guests.some((g) => wasInvited(event, g))) return null;
  const reach = (g) => !!(String(g.email || '').trim() || String(g.phone || '').replace(/\D/g, '').length >= 7);
  const count = guests.filter((g) => reach(g) && !wasInvited(event, g)).length;
  if (!count) return null;
  return { count, line: count + ' you can reach ' + (count === 1 ? 'hasn’t' : 'haven’t') + ' had the invite yet.' };
}

/**
 * The guests added after the invite went out (UX_12 §8a, render screen 4):
 * reachable, not declined, never invited, once the invite is out (recorded as
 * sent, a reply, or any guest it reached). { count, label, line }, or null.
 * The old sheet's "Invite N new guests" reads this too, so both say the same.
 */
export function lateInvite(event) {
  if (!event) return null;
  const r = inviteRecipients(event.guests, guestToldMap(event));
  const all = [...r.email, ...r.text];
  if (!all.length) return null;
  const out = !!invitesOut(event) || (Array.isArray(event.guests) ? event.guests : []).some((g) => g && wasInvited(event, g));
  if (!out) return null;
  const names = all.map((x) => x.name || 'A guest');
  const who = names.length === 1 ? names[0] + ' was'
    : (names.length === 2 ? names.join(' and ') : names.slice(0, 2).join(', ') + ' and ' + (names.length - 2) + ' more') + ' were';
  const how = r.email.length && r.text.length ? 'by email or text' : r.email.length ? 'by email' : 'by text';
  const gets = all.length === 1 ? (greetingName(all[0].name) || 'a guest') + ' gets' : 'They get';
  return {
    count: all.length,
    label: all.length === 1 ? 'Invite 1 new guest' : 'Invite ' + all.length + ' new guests',
    line: who + ' added after your invite went out. ' + gets + ' the same message ' + how + '.',
  };
}
