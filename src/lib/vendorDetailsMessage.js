// ─── "Send the details" — the text a host sends a vendor from their own phone ─
//
// Owner + host board ruling, 11/15/2026: hosts keep texting from their own
// phones; the app makes that one tap and records the host's word. No Twilio.
// This module only WRITES THE WORDS. It sends nothing, and the shell never
// claims a text went out: an sms: tap proves only that the composer opened.
//
// Who/what/why, in the host's voice:
//   "Hi Marco, it's Vida Reyes. I'm hosting Vida's Game Night on Saturday,
//    November 28 at 6:30 PM at Fort Ward Park, 40 guests (3 vegetarian,
//    1 nut allergy). You're doing the catering. Here's everything in one
//    place — please tap to confirm, or tell me if anything's off: <link>"
//
// EVERY CLAUSE IS OPTIONAL. A clause whose data is missing is left out whole —
// never "undefined", never "TBD", never a number the app made up:
//   - headcount: only a count the HOST gave (briefGuestCount — the same outward
//     gate as the brief), to EVERY vendor (owner ruling 11/15/2026: a DJ and a
//     photographer plan around the size of the room too).
//   - diet counts: only the fixed-vocabulary aggregate the brief already ships
//     (briefDietCounts), and only to a vendor who feeds guests.
//   - the hour: only one the host set (startTimeIsConfirmed); our derived
//     default never leaves, exactly as the brief strips it. The host's own
//     part-of-day ("in the evening") stands in when there is no hour.
//   - the host's name: the event's host name (what the brief signs with), else
//     the profile name.
// PURE: no I/O, no clock, no storage.
import { venueFor } from './venueFor';
import { fmtLongDate } from './doItForMe';
import { startTimeIsConfirmed, parseClock } from './startTime';
import { briefGuestCount, briefDietCounts, briefFeedsGuests } from './vendorBrief';
import { DIET_TAGS } from './dietRows';

const HOMEISH = /^(backyard|back\s?yard|home|house|my place|host'?s home|our (place|home|backyard))$/i;
const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

// "18:30" or "6:30 PM" → "6:30 PM"; anything unreadable → ''.
function clock12(raw) {
  const min = parseClock(clean(raw));
  if (min == null || min < 0 || min >= 24 * 60) return '';
  const h24 = Math.floor(min / 60), mm = String(min % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

function whenClause(e) {
  const date = fmtLongDate(e.date);
  if (!date) return '';
  const t = startTimeIsConfirmed(e) ? clock12(e.startTime) : '';
  if (t) return `on ${date} at ${t}`;
  const tod = clean(e.timeOfDay).toLowerCase();
  if (['morning', 'afternoon', 'evening', 'night'].includes(tod)) return `on ${date} in the ${tod}`;
  return `on ${date}`;
}

function whereClause(e) {
  const vf = venueFor(e);
  const name = clean(vf.name);
  if (name && !HOMEISH.test(name)) return `at ${name}`;
  const addr = clean(vf.address);
  if (addr) return `at ${addr}`;
  if (vf.isHome || (name && HOMEISH.test(name))) return 'at my place';
  return '';
}

// "3 vegetarian, 1 nut allergy" — the brief's own words, comma-joined for prose.
export function dietPhrase(dietCounts) {
  const dc = dietCounts && typeof dietCounts === 'object' ? dietCounts : {};
  return DIET_TAGS
    .filter((tag) => Math.floor(Number(dc[tag]) || 0) > 0)
    .map((tag) => {
      const word = tag === 'Shellfish' ? 'shellfish allergy'
        : (tag === 'Halal' || tag === 'Kosher') ? tag : tag.toLowerCase();
      return `${Math.floor(Number(dc[tag]))} ${word}`;
    })
    .join(', ');
}

// "Catering" → "catering"; "DJ" stays "DJ".
function categoryWord(cat) {
  const c = clean(cat);
  if (!c) return '';
  return c === c.toUpperCase() ? c : c.toLowerCase();
}

// Who the text greets: the vendor's contact person's first name, else the business.
export function vendorGreetingName(vendor) {
  const v = vendor || {};
  const first = clean(v.contactName).split(' ')[0];
  return first || clean(v.name);
}

export function hostSignName(event, profile) {
  const e = event || {}, p = profile || {};
  return clean(e.hostName) || clean(e.hostNames) || clean(p.name);
}

/**
 * The pre-written "send the details" message.
 * @returns {{ subject: string, body: string }}
 */
export function buildVendorDetailsMessage({ vendor, event, profile, link } = {}) {
  const v = vendor || {}, e = event || {};
  const sentences = [];

  const greet = vendorGreetingName(v);
  const host = hostSignName(e, profile);
  if (greet && host) sentences.push(`Hi ${greet}, it’s ${host}.`);
  else if (greet) sentences.push(`Hi ${greet}!`);
  else if (host) sentences.push(`Hi, it’s ${host}.`);
  else sentences.push('Hi!');

  const eventName = clean(e.name);
  const what = eventName || (clean(e.type) ? `a ${clean(e.type).toLowerCase()}` : '');
  const when = whenClause(e);
  const where = whereClause(e);
  let hosting = '';
  if (what || when || where) hosting = ['I’m hosting', what, when, where].filter(Boolean).join(' ');
  if (!what && hosting) hosting = ['I’m hosting', 'an event', when, where].filter(Boolean).join(' ');

  const cat = v.category;
  // Every vendor gets the host's guest count (owner ruling 11/15/2026); diet
  // counts stay with vendors who feed guests.
  const count = briefGuestCount(e);
  let guests = '';
  if (count && count > 0) {
    const diet = briefFeedsGuests(cat) ? dietPhrase(briefDietCounts(e)) : '';
    guests = `${count} ${count === 1 ? 'guest' : 'guests'}${diet ? ` (${diet})` : ''}`;
  }
  if (hosting) sentences.push(`${hosting}${guests ? ', ' + guests : ''}.`);
  else if (guests) sentences.push(`It’s ${guests}.`);

  const word = categoryWord(cat);
  if (word) sentences.push(`You’re doing the ${word}.`);

  const url = clean(link);
  if (url) sentences.push(`Here’s everything in one place — please tap to confirm, or tell me if anything’s off: ${url}`);

  const subject = eventName
    ? `${eventName} — the details${word ? ' for the ' + word : ''}`
    : `The details${word ? ' for the ' + word : ''}`;
  return { subject, body: sentences.join(' ') };
}

// ── The channels: the host's own phone apps, never ours ───────────────────────
// The digits a text goes to — the same rail the guest list uses.
export function textDigits(phone) {
  return String(phone || '').replace(/[^+\d]/g, '');
}

export function detailsSmsHref(phone, body) {
  const digits = textDigits(phone);
  if (!digits) return null;
  return 'sms:' + digits + '?&body=' + encodeURIComponent(String(body || ''));
}

export function detailsMailtoHref(email, subject, body) {
  const to = clean(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return null;
  return 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(String(subject || '')) + '&body=' + encodeURIComponent(String(body || ''));
}
