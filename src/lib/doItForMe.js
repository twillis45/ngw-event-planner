// "Do it for me" — the leap from advising to DOING. Instead of asking the host to
// write the invitation / the vendor inquiry / the thank-yous, the app WRITES them
// from the event facts it already has, and hands the host a ready-to-send message
// they share or copy in one tap. Pure, offline, no API key, no invented facts — it
// only ever uses what the host already told us (name, type, date, time, place,
// honoree, head count). An AI key can polish later; the honest baseline is here.

// A gathering that must carry a somber, respectful tone — never the festive template.
const SOMBRE_RE = /funeral|memorial|shiva|celebration of life|life celebration|wake|remembrance|in memoriam|mourn|repast/i;

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
  // CRITICAL cultural guard: a somber gathering (memorial, shiva, funeral, celebration
  // of life) must NEVER get the festive template — no "🎉 You're invited!", no "come
  // celebrate," no party emoji. A generic festive invite here is the worst kind of miss.
  if (SOMBRE_RE.test(type)) {
    return { sombre: true, emoji: '', head: 'You’re invited to gather',
      line: honoree
        ? `We’re gathering to remember ${honoree}. It would mean a great deal to have you with us.`
        : `We’re gathering to remember and support one another. It would mean a great deal to have you with us.` };
  }
  const T = (re, v) => re.test(type) && v;
  return (
    T(/graduat/, { emoji: '🎓', head: 'You’re invited!', line: `We’re celebrating ${honoree ? honoree + '’s' : 'a'} graduation and would love you there.` }) ||
    T(/wedding/, { emoji: '💍', head: 'Save the date — you’re invited!', line: `We’re getting married and can’t imagine the day without you.` }) ||
    // Cultural / faith milestones — named specifically, never flattened into "a party."
    T(/(quince)/, { emoji: '👑', head: '¡Están invitados! You’re invited!', line: `We’re celebrating ${honoree ? honoree + '’s' : 'a'} quinceañera — fifteen years — and we’d be honored to have you and your family there.` }) ||
    T(/(bar ?mitzvah|bat ?mitzvah|b['’]?nai ?mitzvah)/, { emoji: '✡️', head: 'You’re invited!', line: `We’re celebrating ${honoree || 'our child'} becoming a${/bat/i.test(type) ? ' bat' : ' bar'} mitzvah — please join us for this milestone.` }) ||
    T(/(baptism|christening|first ?communion|confirmation|dedication)/, { emoji: '🕊️', head: 'You’re invited!', line: `We’re celebrating ${honoree ? honoree + '’s' : 'a'} ${/communion/i.test(type) ? 'First Communion' : /confirm/i.test(type) ? 'Confirmation' : /christen/i.test(type) ? 'christening' : 'baptism'} — we’d love to share the day with you.` }) ||
    T(/(diwali)/, { emoji: '🪔', head: 'You’re invited!', line: `We’re celebrating Diwali and would love for you to join us for light, food, and family.` }) ||
    T(/(eid)/, { emoji: '🌙', head: 'You’re invited!', line: `We’re celebrating Eid and would be delighted to have you join us.` }) ||
    T(/(lunar ?new ?year|chinese ?new ?year|tết|tet)/, { emoji: '🧧', head: 'You’re invited!', line: `We’re celebrating the Lunar New Year and would love for you to join us.` }) ||
    T(/(sweet ?16|sweet ?sixteen)/, { emoji: '✨', head: 'You’re invited!', line: `We’re celebrating ${honoree || 'a milestone'} and would love you there.` }) ||
    T(/(^|\b)(birthday|bday)\b/, { emoji: '🎉', head: 'You’re invited!', line: `We’re throwing ${honoree ? honoree + ' a birthday party' : 'a birthday party'} and want you there.` }) ||
    T(/anniversary/, { emoji: '💛', head: 'You’re invited!', line: `We’re marking a special anniversary and would love to celebrate with you.` }) ||
    T(/(baby ?shower)/, { emoji: '👶', head: 'You’re invited!', line: `We’re showering ${honoree || 'the parents-to-be'} with love before the baby arrives — join us!` }) ||
    T(/(bridal ?shower|bachelorette)/, { emoji: '🥂', head: 'You’re invited!', line: `We’re celebrating ${honoree || 'the bride-to-be'} — come join us!` }) ||
    T(/(retire)/, { emoji: '🎊', head: 'You’re invited!', line: `We’re celebrating ${honoree ? honoree + '’s retirement' : 'a well-earned retirement'} — come raise a glass.` }) ||
    T(/(reunion)/, { emoji: '🤗', head: 'You’re invited!', line: `It’s been too long — we’re getting everyone back together.` }) ||
    T(/(dinner|cookout|bbq|barbecue|cocktail|party|gathering|housewarm)/, { emoji: '🍽️', head: 'You’re invited!', line: `We’re hosting and would love to have you over.` }) ||
    T(/(holiday|christmas|thanksgiving|hanukkah|new ?year)/, { emoji: '🎄', head: 'You’re invited!', line: `We’re gathering for the holidays and hope you’ll join us.` }) ||
    { emoji: '🎉', head: 'You’re invited!', line: `We’re hosting ${subjectThing(event)} and would love you there.` }
  );
}

// #1 — the guest invite. { subject, body } ready to drop into a text or email.
// opts.rsvpUrl closes the loop: when present, the invite carries a one-tap RSVP link
// so guests reply on the hosted page and the headcount flows back to the host (instead
// of the host chasing replies in a group text). That's what turns the invite from a
// dead-end message into the product's front door.
export function draftInvite(event, profile, opts = {}) {
  if (!event) return { subject: '', body: '' };
  const v = inviteVoice(event);
  const date = fmtLongDate(event.date);
  const time = timePhrase(event);
  const place = placePhrase(event);
  const host = hostName(profile);
  const rsvpUrl = (opts && opts.rsvpUrl) ? String(opts.rsvpUrl).trim() : '';
  const when = [date, time].filter(Boolean).join(' · ');
  const lines = [v.emoji ? `${v.emoji} ${v.head}` : v.head, v.line, ''];
  if (when)  lines.push(`📅 ${when}`);
  if (place) lines.push(`📍 ${place}`);
  if (when || place) lines.push('');
  // Closer follows the TONE. Somber gatherings never get "hope you can make it!"; and
  // when there's a real RSVP page, we point them to it (one place, headcount comes back).
  lines.push(v.sombre
    ? (rsvpUrl ? 'Please let us know if you’ll be joining us:' : 'Please join us.')
    : (rsvpUrl ? 'Tap to let us know if you can make it:'
              : (place ? 'Hope you can make it — let us know!' : 'Hope you can make it — details to follow. Let us know!')));
  if (rsvpUrl) lines.push(rsvpUrl);
  if (host) { lines.push(''); lines.push(`— ${host}`); }
  const honoree = (event.honoree || '').trim();
  const subject = v.sombre
    ? `In remembrance${honoree ? ' of ' + honoree : ''}`
    : `You’re invited — ${subjectThing(event)}`;
  return { subject, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
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
  const host = hostName(profile);
  // Somber events get gratitude for PRESENCE, never for "celebrating."
  if (SOMBRE_RE.test(type)) {
    const lines = [
      `Thank you for being with us as we remembered ${honoree || 'our loved one'}.`,
      'Your presence and kindness meant more to us than words can say.',
    ];
    if (host) lines.push('', `With heartfelt thanks,\n${host}`);
    return { subject: `Thank you${honoree ? ' — remembering ' + honoree : ''}`, body: lines.join('\n').trim() };
  }
  const thing = honoree ? `${honoree}’s ${type}` : `our ${type}`;
  const lines = [
    `Thank you so much for celebrating ${thing} with us. 💛`,
    'It meant the world to have you there — we’re so grateful for you.',
  ];
  if (host) lines.push('', `With love,\n${host}`);
  return { subject: `Thank you — ${thing}`, body: lines.join('\n').trim() };
}

// RSVP chase — a gentle nudge to the people who haven't replied yet. The single
// highest-leverage do-it-for-me: replies grow the headcount that sizes everything.
// opts.rsvpUrl points them back to the hosted page (so the count comes back).
export function draftRsvpChase(event, profile, opts = {}) {
  if (!event) return { subject: '', body: '' };
  const v = inviteVoice(event);
  const date = fmtLongDate(event.date);
  const time = timePhrase(event);
  const host = hostName(profile);
  const rsvpUrl = (opts && opts.rsvpUrl) ? String(opts.rsvpUrl).trim() : '';
  const honoree = (event.honoree ? String(event.honoree) : '').trim();
  const type = (event.type ? String(event.type) : 'get-together').toLowerCase();
  const thing = honoree ? `${honoree}’s ${type}` : `our ${type}`;
  const whenBit = date ? ` on ${date}${time ? ' ' + time : ''}` : '';
  const lines = [];
  if (v.sombre) {
    lines.push(`Hi — just a gentle note: we’re gathering for ${thing}${whenBit}.`);
    lines.push('If you’re able to join us it would mean a great deal — please let us know when you can.');
  } else {
    lines.push(`Hi! Just a friendly nudge 💛 — we’d love to have you at ${thing}${whenBit}.`);
    lines.push('Could you let us know if you can make it when you get a sec?');
  }
  if (rsvpUrl) { lines.push('', 'Tap here to let us know:', rsvpUrl); }
  if (host) { lines.push('', `Thanks!\n${host}`); }
  return { subject: v.sombre ? `A note about ${thing}` : `Quick RSVP nudge — ${thing}`, body: lines.join('\n').trim() };
}

// HH:MM (24h) → "12:00 PM". Blank/garbage → ''.
function fmtClock(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return '';
  let h = Number(m[1]); const mm = m[2];
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${mm} ${ap}`;
}

// Day-of helper brief — from the run-of-show, the app writes "here's everyone's part"
// the host drops in the group chat the night before. Grounded in the ROS owners + cues.
export function draftHelperBrief(event, profile, opts = {}) {
  if (!event) return { subject: '', body: '' };
  const ros = Array.isArray(event.ros) ? event.ros : (Array.isArray(opts.ros) ? opts.ros : []);
  const date = fmtLongDate(event.date);
  const host = hostName(profile);
  const name = (event.name ? String(event.name) : '').trim() || subjectThing(event);
  // group cues by owner, preserving time order
  const order = [];
  const byOwner = new Map();
  for (const r of ros) {
    if (!r) continue;
    const seg = (r.segment ? String(r.segment) : '').trim();
    if (!seg) continue;
    const owner = (r.owner ? String(r.owner) : '').trim() || 'Everyone';
    if (!byOwner.has(owner)) { byOwner.set(owner, []); order.push(owner); }
    byOwner.get(owner).push({ t: fmtClock(r.time), seg });
  }
  const lines = [`Here’s the plan for ${name}${date ? ` — ${date}` : ''} 💛`, 'Thanks for helping out — here’s everyone’s part:', ''];
  if (order.length === 0) {
    lines.push('(The run of the day isn’t filled in yet — I’ll send it once it is.)');
  } else {
    for (const owner of order) {
      lines.push(`${owner}:`);
      for (const c of byOwner.get(owner)) lines.push(`  • ${c.t ? c.t + ' — ' : ''}${c.seg}`);
      lines.push('');
    }
    lines.push('You’ve got this — text me if anything comes up!');
  }
  if (host) lines.push('', `— ${host}`);
  return { subject: `The plan for ${name}`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

// Dietary note to the cook/caterer — from the guests' own dietary/needs fields, the app
// writes the "here's what the table needs" note. Never invents needs; honest when none.
export function draftDietaryNote(event, profile, opts = {}) {
  if (!event) return { subject: '', body: '' };
  const guests = Array.isArray(event.guests) ? event.guests : (Array.isArray(opts.guests) ? opts.guests : []);
  const host = hostName(profile);
  const coming = guests.filter((g) => g && g.rsvp === 'Yes').length;
  const withNeeds = guests.filter((g) => g && String(g.needs || '').trim());
  const lines = [];
  if (withNeeds.length === 0) {
    lines.push(`Quick note for the food${coming ? ` — we’re expecting about ${coming}` : ''}.`);
    lines.push('No special dietary needs to flag so far — I’ll let you know if that changes.');
  } else {
    lines.push(`A few dietary notes for the food${coming ? ` (about ${coming} guests)` : ''}:`);
    for (const g of withNeeds) lines.push(`• ${(g.name ? String(g.name) : 'A guest').trim()}: ${String(g.needs).trim()}`);
    lines.push('', 'Thanks so much for accommodating these!');
  }
  if (host) lines.push('', host);
  return { subject: 'Dietary notes for the food', body: lines.join('\n').trim() };
}

// Recap keepsake — a warm, shareable few lines the host WANTS to send round after the
// event ("Maya's Graduation — thank you"). Grounded in the event + its heart; tone
// follows the occasion (somber events get remembrance, not "it was everything!").
export function draftRecap(event, profile) {
  if (!event) return { subject: '', body: '' };
  const v = inviteVoice(event);
  const name = (event.name ? String(event.name) : '').trim() || subjectThing(event);
  const date = fmtLongDate(event.date);
  const honoree = (event.honoree ? String(event.honoree) : '').trim();
  const host = hostName(profile);
  const mh = (event.must_have_moment ? String(event.must_have_moment) : '').trim();
  const mhMeaningful = mh && mh.split(/\s+/).filter(Boolean).length >= 2;
  const lines = [v.emoji ? `${v.emoji} ${name}` : name];
  if (date) lines.push(date);
  lines.push('');
  if (v.sombre) {
    lines.push(honoree ? `We came together to remember ${honoree}.` : 'We came together to remember and hold each other close.');
    if (mhMeaningful) lines.push(`At the heart of it: ${mh.replace(/\.$/, '')}.`);
    lines.push('Thank you to everyone who was there — it meant everything.');
  } else {
    if (mhMeaningful) lines.push(`At the heart of it: ${mh.replace(/\.$/, '')}.`);
    lines.push('What a day — and getting to share it with the people we love made it.');
    lines.push('Thank you for being part of it. 💛');
  }
  if (host) { lines.push(''); lines.push(`— ${host}`); }
  return { subject: v.sombre ? `Remembering — ${name}` : `${name} — thank you`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
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
