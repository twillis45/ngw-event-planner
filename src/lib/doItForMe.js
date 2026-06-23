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

// Cultural/voice metadata for analytics + readers — a stable occasion slug + the
// sombre flag, computed from the SAME regexes as the invite voice (one source of
// truth). Used as PostHog props on event_qualified and by the analytics readers.
export function eventCulturalMeta(event) {
  const type = (event && event.type ? String(event.type) : '').toLowerCase();
  if (SOMBRE_RE.test(type)) return { sombre: true, voice: 'remembrance' };
  const V = [
    [/graduat/, 'graduation'], [/wedding/, 'wedding'], [/quince/, 'quinceanera'],
    [/bar ?mitzvah|bat ?mitzvah|b['’]?nai ?mitzvah/, 'mitzvah'],
    [/baptism|christen|communion|confirmation|dedication/, 'faith_milestone'],
    [/diwali/, 'diwali'], [/eid/, 'eid'], [/lunar ?new ?year|chinese ?new ?year|tết|tet/, 'lunar_new_year'],
    [/sweet ?16|sweet ?sixteen/, 'sweet_sixteen'], [/birthday|bday/, 'birthday'],
    [/anniversary/, 'anniversary'], [/baby ?shower/, 'baby_shower'],
    [/bridal ?shower|bachelorette/, 'bridal'], [/retire/, 'retirement'],
    [/reunion/, 'reunion'], [/holiday|christmas|thanksgiving|hanukkah|new ?year/, 'holiday'],
    [/dinner|cookout|bbq|barbecue|cocktail|party|gathering|housewarm/, 'gathering'],
  ];
  for (const [re, slug] of V) if (re.test(type)) return { sombre: false, voice: slug };
  return { sombre: false, voice: 'other' };
}

// isAtHome — the location signal used in invites and analytics (mirrors placePhrase).
export function isAtHome(event) {
  return placePhrase(event) === 'our place';
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

// Shopping list — the clearest "do, don't advise" win. The food plan already computes
// every item AND quantity; instead of making the host read it off a screen, we WRITE
// the list they take to the store or hand to whoever's shopping. But a flat checklist
// makes the host re-plan their route in their head; a STORE-GROUPED, logically-ordered
// list does that thinking for them. opts.items is the richer food-plan spread (see
// buildShoppingPlan). Pure, no invention; we never name a real store, price, or distance.

const CATEGORY_ORDER = ['food', 'beverage', 'cleanup', 'logistics', 'rental', 'other'];
const WAREHOUSE_RE = /costco|sam'?s|warehouse|bj'?s/i;

// HONEST integrations for the shopping list. We NEVER fabricate a store name, address,
// or distance. Instead we emit LIVE LINKS that resolve to real stores/distances at tap
// time — a Maps search ("grocery near <host's address>") opens the actual nearby stores
// WITH their real distances, and grocery-delivery entry points let the host send the
// list off for pickup/delivery. NOTE: these order links open each retailer's storefront;
// they do NOT pre-fill a cart — a true one-tap pre-filled cart requires each retailer's
// own API (Instacart/Walmart/Amazon), which is future work.
const ORDER_LINKS = [
  { label: 'Instacart', url: 'https://www.instacart.com/store/s?k=' + encodeURIComponent('grocery') },
  { label: 'Walmart', url: 'https://www.walmart.com/search?q=' + encodeURIComponent('grocery') },
  { label: 'Amazon Fresh', url: 'https://www.amazon.com/alm/storefront' },
];

function catRank(c) {
  const i = CATEGORY_ORDER.indexOf((c ? String(c) : 'other').toLowerCase());
  return i === -1 ? CATEGORY_ORDER.indexOf('other') : i;
}

// localityAnchor — sanitize a place string into a clean, geocodable locality for a maps
// "near X" search. Host-facing venue labels often carry chrome the user should never see
// in a search query or a copyable list, e.g. "My place — Atlanta, Georgia" or
// "Backyard – Pasadena, MD". Strip the chrome and keep the geographic segment (the part
// that reads like "City, ST"). If no segment looks geographic (e.g. "Hartwell Legal Aid —
// Main Conference Room"), leave the string untouched — never guess a location.
export function localityAnchor(raw) {
  const s = String(raw || '').trim();
  if (!s || !/\s[—–-]\s/.test(s)) return s;
  const parts = s.split(/\s[—–-]\s/).map((p) => p.trim()).filter(Boolean);
  const geo = [...parts].reverse().find((p) => /,\s*[A-Za-z]/.test(p) || /\b[A-Z]{2}\b/.test(p));
  return geo || s;
}

// buildShoppingPlan — the pure engine. Takes the richer item spread and returns a
// structured store-grouped plan, collapsed onto as few stores as possible (fewest
// trips). Never invents a store name/price/distance — distance stays null for a later
// caller to fill once we actually compute it.
export function buildShoppingPlan(items, opts = {}) {
  const all = (Array.isArray(items) ? items : []).filter((x) => x && String(x.name || '').trim());
  // anchor = the host's address or "City, ST" (may be empty). When present, each store
  // section gets a real Maps search link that opens the actual nearby stores of that type
  // WITH distances. When empty, we degrade to null — never a fabricated "Kroger 1.2 mi".
  // Sanitize first so venue chrome ("My place — Atlanta, GA") never leaks into the query
  // or the copyable list as an ugly percent-encoded blob.
  const anchor = localityAnchor(String((opts && opts.anchor) || '').trim());
  const mapLinkFor = (storeType) => anchor
    ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(String(storeType) + ' near ' + anchor)
    : null;
  // 1. partition day-of (grab the morning of) from the rest.
  const dayOf = all.filter((i) => i.buyAt === 'T0');
  const rest = all.filter((i) => i.buyAt !== 'T0');

  // 2. FEWEST-TRIPS store assignment. Score each store-type by coverage (how many items
  // list it anywhere), tie-break by earliest position seen, then alphabetical.
  const coverage = new Map();   // store -> count of items listing it
  const earliest = new Map();   // store -> best (lowest) index seen in a where[]
  for (const it of rest) {
    const where = Array.isArray(it.where) ? it.where.filter((w) => String(w || '').trim()) : [];
    where.forEach((w, idx) => {
      const s = String(w).trim();
      coverage.set(s, (coverage.get(s) || 0) + 1);
      if (!earliest.has(s) || idx < earliest.get(s)) earliest.set(s, idx);
    });
  }
  const rank = (a, b) => {
    const ca = coverage.get(a) || 0, cb = coverage.get(b) || 0;
    if (cb !== ca) return cb - ca;                              // coverage desc
    const ea = earliest.has(a) ? earliest.get(a) : 99, eb = earliest.has(b) ? earliest.get(b) : 99;
    if (ea !== eb) return ea - eb;                              // earliest position
    return a < b ? -1 : a > b ? 1 : 0;                          // alphabetical
  };
  // Greedily assign each item to the highest-ranked store that appears in its own where[].
  const buckets = new Map();    // store -> [items]
  for (const it of rest) {
    const where = Array.isArray(it.where) ? it.where.filter((w) => String(w || '').trim()).map((w) => String(w).trim()) : [];
    let store = 'Anywhere';
    if (where.length) {
      store = where.slice().sort(rank)[0];
    }
    if (!buckets.has(store)) buckets.set(store, []);
    buckets.get(store).push(it);
  }

  // 3. order stores by item count desc, then store name; within a store: forgotten desc,
  // category order, name asc.
  const itemSort = (a, b) => {
    const fa = a.forgotten ? 1 : 0, fb = b.forgotten ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const ra = catRank(a.category), rb = catRank(b.category);
    if (ra !== rb) return ra - rb;
    const na = String(a.name).trim().toLowerCase(), nb = String(b.name).trim().toLowerCase();
    return na < nb ? -1 : na > nb ? 1 : 0;
  };
  const stores = Array.from(buckets.entries())
    .map(([store, its]) => ({ store, distance: null, mapLink: mapLinkFor(store), items: its.slice().sort(itemSort) }))
    .sort((a, b) => {
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.store < b.store ? -1 : a.store > b.store ? 1 : 0;
    });

  // 4. day-of order: forgotten desc, then name asc.
  const dayOfSorted = dayOf.slice().sort((a, b) => {
    const fa = a.forgotten ? 1 : 0, fb = b.forgotten ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const na = String(a.name).trim().toLowerCase(), nb = String(b.name).trim().toLowerCase();
    return na < nb ? -1 : na > nb ? 1 : 0;
  });

  const storeCount = stores.length;

  // 5. decisions — max 3, only when genuinely applicable.
  const decisions = [];
  if (storeCount >= 2) {
    const [a, b] = stores;
    decisions.push(`This is a ${storeCount}-store run: ${a.store} (${a.items.length} item${a.items.length === 1 ? '' : 's'}) + ${b.store} (${b.items.length}). Costco-type stops save the most.`);
  }
  const bulky = all.find((i) => Array.isArray(i.where) && i.where.some((w) => WAREHOUSE_RE.test(String(w || ''))) && Number(i.qty) >= 10);
  if (bulky) {
    decisions.push(`${String(bulky.name).trim()} is cheaper in bulk — a warehouse run pays off when the quantity is this large.`);
  }
  if (opts.headcountLoose === true) {
    const g = (opts.guests != null && opts.guests !== '') ? opts.guests : 'your';
    decisions.push(`Quantities assume ${g} guests — final headcount changes proteins + ice the most.`);
  }
  const trimmed = decisions.slice(0, 3);

  // 6. est total range — MODELED, only when enough items carry both costLow + costHigh.
  const withCost = all.filter((i) => i.costLow != null && i.costHigh != null && i.costLow !== '' && i.costHigh !== '');
  let estTotalRange = null;
  if (withCost.length && withCost.length >= Math.ceil(all.length / 2)) {
    const low = withCost.reduce((s, i) => s + Number(i.costLow), 0);
    const high = withCost.reduce((s, i) => s + Number(i.costHigh), 0);
    if (Number.isFinite(low) && Number.isFinite(high)) estTotalRange = [low, high];
  }

  return { stores, dayOf: dayOfSorted, decisions: trimmed, estTotalRange, storeCount, orderLinks: ORDER_LINKS };
}

export function draftShoppingList(event, profile, opts = {}) {
  if (!event) return { subject: '', body: '' };
  const items = Array.isArray(opts.items) ? opts.items.filter((x) => x && String(x.name || '').trim()) : [];
  const name = (event.name ? String(event.name) : '').trim() || subjectThing(event);
  const count = headCount(event);
  const qtyOf = (i) => {
    const q = i.qty; const u = (i.unit ? String(i.unit) : '').trim();
    return (q != null && q !== '' && Number(q) > 0) ? `${q}${u ? ' ' + u : ''}` : '';
  };
  // honest-empty: menu not set yet (preserve existing behavior).
  if (items.length === 0) {
    const lines = [`🛒 Shopping List — ${name}`, '', 'Your menu isn’t set yet — pick your food and I’ll build the list.'];
    return { subject: `Shopping list — ${name}`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
  }
  // everything already checked off → ready.
  if (items.every((i) => i.got)) {
    const lines = [`🛒 Shopping List — ${name}`, '', 'Everything’s checked off — you’re ready.'];
    return { subject: `Shopping list — ${name}`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
  }
  // build from the structured plan, rendering only what's still needed.
  const need = items.filter((i) => !i.got);
  const plan = buildShoppingPlan(need, opts);
  const renderItem = (i) => {
    const q = qtyOf(i);
    const star = i.forgotten ? '   ⭐' : '';
    // The "because" — the per-person rate this quantity was scaled from (authored
    // in the playbook, never invented). Only shown alongside a real quantity, so a
    // bare item never reads "· ½ lb/guest" with nothing to explain.
    const basis = q && i.basis ? `  · ${String(i.basis).trim()}` : '';
    return `[ ] ${String(i.name).trim()}${q ? ` — ${q}` : ''}${basis}${star}`;
  };
  const header = `🛒 Shopping List — ${name}${count ? ` (${count} guests)` : ''}`;
  const lines = [header, ''];
  // single most useful decision line for text.
  if (plan.decisions.length) { lines.push(plan.decisions[0]); lines.push(''); }
  for (const s of plan.stores) {
    lines.push(String(s.store).toUpperCase());
    // Honest store finder: a live Maps link that opens the real nearby stores of this
    // type WITH distances — only when the host gave us an anchor. Never a fake address.
    if (s.mapLink) lines.push(`📍 Find one near you: ${s.mapLink}`);
    for (const it of s.items) lines.push(renderItem(it));
    lines.push('');
  }
  if (plan.dayOf.length) {
    lines.push('DAY-OF (grab the morning of)');
    for (const it of plan.dayOf) lines.push(renderItem(it));
    lines.push('');
  }
  // Send-to-store: one clean delivery/pickup entry point in the text (Instacart). The
  // other retailers ride along in the structured orderLinks for the UI to surface.
  if (plan.orderLinks && plan.orderLinks.length) {
    const ic = plan.orderLinks.find((l) => l.label === 'Instacart') || plan.orderLinks[0];
    if (ic) { lines.push(`🛒 Order for pickup/delivery: ${ic.label} ${ic.url}`); lines.push(''); }
  }
  if (plan.estTotalRange) {
    lines.push(`Estimated total ~$${plan.estTotalRange[0]}–$${plan.estTotalRange[1]} (modeled, not live prices)`);
  }
  return { subject: `Shopping list — ${name}`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

// Day-before details — the logistics blast every host sends the night before (where,
// when, what to bring). Kills the day-of "what's the address?" texts. From venue/date/
// time the host already gave us; opts.rsvpUrl optional. Never invents parking/bring info.
export function draftDayBeforeDetails(event, profile, opts = {}) {
  if (!event) return { subject: '', body: '' };
  const v = inviteVoice(event);
  const name = subjectThing(event);
  const date = fmtLongDate(event.date);
  const time = timePhrase(event);
  const place = placePhrase(event);
  const host = hostName(profile);
  const when = [date, time].filter(Boolean).join(' · ');
  // Only a real, host-provided "bring" note — never invented.
  const bring = String((event.guestBring || event.whatToBring || event.bringNote || '')).trim();
  const lines = [v.sombre ? `A few details for ${name}` : `See you soon! 💛 A few details for ${name}:`, ''];
  if (when)  lines.push(`📅 ${when}`);
  if (place) lines.push(`📍 ${place === 'our place' ? 'Our place' : place}`);
  if (bring) lines.push(`🎁 ${bring}`);
  lines.push('');
  lines.push(v.sombre ? 'Thank you for being with us.' : 'Can’t wait to see you!');
  if (host) { lines.push(''); lines.push(`— ${host}`); }
  return { subject: v.sombre ? `Details — ${name}` : `See you soon — ${name}`, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

// Vendor reconfirm — the day-before "still on for Saturday?" note to a BOOKED vendor.
// Reuses the vendor + event facts; name optional (a no-name note reads "Hi there," so
// one card can serve several vendors). Practical, anxiety-reducing.
export function draftVendorReconfirm(event, vendor, profile) {
  if (!event) return { subject: '', body: '' };
  const name = (vendor && vendor.name ? String(vendor.name) : '').trim();
  const date = fmtLongDate(event.date);
  const time = timePhrase(event);
  const place = placePhrase(event);
  const host = hostName(profile);
  const arrival = String((vendor && (vendor.arrivalTime || vendor.loadIn || vendor.arrival)) || '').trim();
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  let confirm = `Just confirming we’re all set for ${date || 'the event'}`;
  if (place && place !== 'our place') confirm += ` at ${place}`;
  confirm += '.';
  const lines = [greeting, '', confirm];
  if (arrival) lines.push(`Planned arrival/setup: ${arrival}.`);
  else if (time) lines.push(`Things kick off ${time}.`);
  lines.push('Anything you need from us beforehand? Looking forward to it.', '', 'Thanks so much!');
  if (host) lines.push(host);
  return { subject: `Confirming ${date || 'our date'}${name ? ' — ' + name : ''}`, body: lines.join('\n').trim() };
}

// hasToastMaterial — does the host's own words give us anything to shape a toast from?
// (We never fabricate a speech; the card only appears when there's real material.)
export function hasToastMaterial(event) {
  if (!event) return false;
  return !!(String(event.honoree || '').trim() || String(event.honoree_story || '').trim()
    || String(event.meaning_why || '').trim() || String(event.feeling_words || '').trim());
}

// The toast — the one thing hosts dread. We draft a SHORT starting point from the host's
// OWN words (honoree, the story, why it matters) — shaping, never inventing, never a
// generated monologue. Hard cap: 5 spoken lines. The host edits/polishes from here.
export function draftToast(event, profile) {
  if (!event) return { subject: '', body: '' };
  const honoree = String(event.honoree || '').trim();
  const type = (event.type ? String(event.type) : 'celebration').toLowerCase();
  // Trim a host line to one short, speakable beat: first sentence, or ~120 chars on a
  // word boundary. Never lengthen, never invent — just shorten.
  const speakable = (raw) => {
    let s = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    const stop = s.search(/[.!?]/);
    if (stop !== -1 && stop <= 120) s = s.slice(0, stop + 1);
    else if (s.length > 120) {
      let cut = s.slice(0, 120);
      const sp = cut.lastIndexOf(' ');
      if (sp > 40) cut = cut.slice(0, sp);
      s = cut;
    }
    return s.replace(/\s+$/, '').replace(/[.!?,;:]*$/, '') + '.';
  };
  const story = speakable(event.honoree_story);
  const why = speakable(event.meaning_why);
  const feeling = String(event.feeling_words || '').trim().replace(/\.$/, '');
  const sombre = SOMBRE_RE.test(type);
  // Build at most 5 lines: opener, the host's own 1–2 lines, a closer.
  const lines = [];
  if (sombre) {
    lines.push('If I could say a few words…');
    lines.push(honoree ? `We’re here because of ${honoree} — and what ${honoree} meant to all of us.` : 'We’re here tonight to remember, and to hold each other close.');
    if (story) lines.push(story);
    if (why) lines.push(why);
    lines.push('Thank you for being here.');
  } else {
    lines.push('A few words, if I can…');
    lines.push(honoree ? `Tonight is about ${honoree}.` : 'Thank you all for being here — it means the world.');
    if (story) lines.push(story);
    if (why) lines.push(why);
    // Feeling is the soft option: only when we have room and no story+why pair already.
    if (feeling && lines.length < 4 && !(story && why)) lines.push(`Here’s to ${feeling}.`);
    lines.push(honoree ? `So raise your glass — to ${honoree}.` : 'So raise your glass — to all of us, and to nights like this.');
  }
  // Hard cap at 5 lines: keep opener (first) + closer (last) + the most meaningful
  // host material in between (story/why win over a separate feeling line).
  if (lines.length > 5) {
    const opener = lines[0];
    const closer = lines[lines.length - 1];
    const middle = lines.slice(1, -1).slice(0, 3); // story, why, [feeling]
    while (1 + middle.length + 1 > 5) middle.pop(); // drop feeling first, then trim tail
    lines.length = 0;
    lines.push(opener, ...middle, closer);
  }
  if (hostName(profile)) { /* a toast is spoken, not signed */ }
  return { subject: honoree ? `A toast to ${honoree}` : 'A toast', body: lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() };
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
