// "Do it for me" — the leap from advising to DOING. Instead of asking the host to
// write the invitation / the vendor inquiry / the thank-yous, the app WRITES them
// from the event facts it already has, and hands the host a ready-to-send message
// they share or copy in one tap. Pure, offline, no API key, no invented facts — it
// only ever uses what the host already told us (name, type, date, time, place,
// honoree, head count). An AI key can polish later; the honest baseline is here.

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// "Sunday, July 7" — explicit arrays so output is stable across locales/tests.
export function fmtLongDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return '';
  return `${WD[dt.getDay()]}, ${MO[m - 1]} ${d}`;
}

// The time the host actually gave us — an explicit start time if present, else the
// rough part-of-day from create. Never invented.
export function timePhrase(event) {
  const t = (event && (event.startTime || '')).trim && event.startTime ? String(event.startTime).trim() : '';
  if (t) return t;
  const tod = (event && event.timeOfDay ? String(event.timeOfDay) : '').toLowerCase().trim();
  if (['morning', 'afternoon', 'evening', 'night'].includes(tod)) return `in the ${tod}`;
  return '';
}

// Place line: a real venue string, or "our place" for an at-home event. Empty when
// the host hasn't said where yet (we won't guess — we just leave it off).
export function placePhrase(event) {
  const v = (event && event.venue ? String(event.venue) : '').trim();
  if (!v) return '';
  if (/\bhome\b/i.test(v) || /our (place|home|backyard)/i.test(v) || v.toLowerCase() === "host's home") return 'our place';
  return v;
}

function hostName(profile) {
  const n = (profile && profile.name ? String(profile.name) : '').trim();
  return n;
}

function headCount(event) {
  const n = Number(event && event.guestCount) || Number(event && event.guestEstimate) || (event && event.guests ? event.guests.length : 0) || 0;
  return n > 0 ? n : null;
}

// Possessive that reads right: "Maya's" / "the family's". Falls back to the event
// name when there's no honoree.
function subjectThing(event) {
  const honoree = (event && event.honoree ? String(event.honoree) : '').trim();
  const type = (event && event.type ? String(event.type) : 'celebration').toLowerCase();
  if (honoree) return `${honoree}’s ${type}`;
  const name = (event && event.name ? String(event.name) : '').trim();
  return name || `our ${type}`;
}

// Per-type warmth for the invite. Generic fallback always reads naturally.
function inviteVoice(event) {
  const type = (event && event.type ? String(event.type) : '').toLowerCase();
  const honoree = (event && event.honoree ? String(event.honoree) : '').trim();
  const who = honoree || 'us';
  const T = (re, v) => re.test(type) && v;
  return (
    T(/graduat/, { emoji: '🎓', head: 'You’re invited!', line: `We’re celebrating ${honoree ? honoree + '’s' : 'a'} graduation and would love you there.` }) ||
    T(/wedding/, { emoji: '💍', head: 'Save the date — you’re invited!', line: `We’re getting married and can’t imagine the day without you.` }) ||
    T(/(^|\b)(birthday|bday)\b/, { emoji: '🎉', head: 'You’re invited!', line: `We’re throwing ${honoree ? honoree + ' a birthday party' : 'a birthday party'} and want you there.` }) ||
    T(/anniversary/, { emoji: '💛', head: 'You’re invited!', line: `We’re marking a special anniversary and would love to celebrate with you.` }) ||
    T(/(baby ?shower)/, { emoji: '👶', head: 'You’re invited!', line: `We’re showering ${honoree || 'the parents-to-be'} with love before the baby arrives — join us!` }) ||
    T(/(bridal ?shower|bachelorette)/, { emoji: '🥂', head: 'You’re invited!', line: `We’re celebrating ${honoree || 'the bride-to-be'} — come join us!` }) ||
    T(/(quince|sweet ?16|sweet ?sixteen)/, { emoji: '✨', head: 'You’re invited!', line: `We’re celebrating ${honoree || 'a milestone'} and would love you there.` }) ||
    T(/(retire)/, { emoji: '🎊', head: 'You’re invited!', line: `We’re celebrating ${honoree ? honoree + '’s retirement' : 'a well-earned retirement'} — come raise a glass.` }) ||
    T(/(reunion)/, { emoji: '🤗', head: 'You’re invited!', line: `It’s been too long — we’re getting everyone back together.` }) ||
    T(/(dinner|cookout|bbq|barbecue|cocktail|party|gathering|housewarm)/, { emoji: '🍽️', head: 'You’re invited!', line: `We’re hosting and would love to have you over.` }) ||
    T(/(holiday|christmas|thanksgiving|hanukkah|new ?year)/, { emoji: '🎄', head: 'You’re invited!', line: `We’re gathering for the holidays and hope you’ll join us.` }) ||
    { emoji: '🎉', head: 'You’re invited!', line: `We’re hosting ${subjectThing(event)} and would love you there.` }
  );
}

// #1 — the guest invite. { subject, body } ready to drop into a text or email.
export function draftInvite(event, profile) {
  if (!event) return { subject: '', body: '' };
  const v = inviteVoice(event);
  const date = fmtLongDate(event.date);
  const time = timePhrase(event);
  const place = placePhrase(event);
  const host = hostName(profile);
  const when = [date, time].filter(Boolean).join(' · ');
  const lines = [`${v.emoji} ${v.head}`, v.line, ''];
  if (when)  lines.push(`📅 ${when}`);
  if (place) lines.push(`📍 ${place}`);
  if (when || place) lines.push('');
  lines.push(place ? 'Hope you can make it — let us know!' : 'Hope you can make it — details to follow. Let us know!');
  if (host) lines.push(`— ${host}`);
  return { subject: `You’re invited — ${subjectThing(event)}`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

// #2 — the vendor inquiry. Drafts the "are you available + what's your pricing" note
// from the event facts. `vendor` is optional (category + name personalize it).
export function draftVendorOutreach(event, vendor, profile) {
  if (!event) return { subject: '', body: '' };
  const cat = (vendor && vendor.category ? String(vendor.category) : 'help').toLowerCase();
  const name = (vendor && vendor.name ? String(vendor.name) : '').trim();
  const type = (event.type ? String(event.type) : 'event').toLowerCase();
  const date = fmtLongDate(event.date);
  const count = headCount(event);
  const place = placePhrase(event);
  const host = hostName(profile);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const bits = [`I’m planning ${/^[aeiou]/i.test(type) ? 'an' : 'a'} ${type}`];
  if (date)  bits.push(`on ${date}`);
  if (count) bits.push(`for about ${count} guests`);
  if (place && place !== 'our place') bits.push(`at ${place}`);
  const ask = `I’m looking for ${cat}. Are you available that date, and could you share your pricing and what’s included?`;
  const lines = [greeting, '', `${bits.join(' ')}. ${ask}`, '', 'Thanks so much!'];
  if (host) lines.push(host);
  return { subject: `${type[0].toUpperCase()}${type.slice(1)}${date ? ' · ' + date : ''} — ${cat} inquiry`, body: lines.join('\n').trim() };
}

// #3 — the thank-yous. One warm note the host sends to guests / anyone who helped.
export function draftThankYou(event, profile) {
  if (!event) return { subject: '', body: '' };
  const honoree = (event.honoree ? String(event.honoree) : '').trim();
  const type = (event.type ? String(event.type) : 'celebration').toLowerCase();
  const thing = honoree ? `${honoree}’s ${type}` : `our ${type}`;
  const host = hostName(profile);
  const lines = [
    `Thank you so much for celebrating ${thing} with us. 💛`,
    'It meant the world to have you there — we’re so grateful for you.',
  ];
  if (host) lines.push('', `With love,\n${host}`);
  return { subject: `Thank you — ${thing}`, body: lines.join('\n').trim() };
}

// One-tap hand-off: native share sheet on mobile, clipboard everywhere else.
// Returns 'shared' | 'copied' | 'cancelled' | 'failed' so the caller can confirm
// honestly ("Shared" vs "Copied — paste it anywhere").
export async function shareOrCopy({ title, text }) {
  const body = String(text || '');
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: title || '', text: body });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    // fall through to clipboard
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(body);
      return 'copied';
    }
  } catch { /* fall through */ }
  return 'failed';
}
