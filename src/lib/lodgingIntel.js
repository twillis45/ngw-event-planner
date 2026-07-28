// ─── Rental-house intelligence — shortlist, share, choose, with provenance ───
//
// Host directive (2026-07-28): "we need rental house intelligence engine …
// reference to the top rental platforms. Need ways to select and share rental
// house choices with group … who does what … ground it using our doctrine."
//
// DOCTRINE SHAPE:
//   · Host-entered facts ONLY. The never-build list bans live rental APIs and
//     price scraping — the host pastes the listing link and types what the
//     listing says (sleeps, beds, price, cancellation tier). We compute and
//     advise; we never fetch or invent a listing fact.
//   · Platform is DERIVED from the URL host — airbnb.com → 'airbnb',
//     vrbo.com → 'vrbo' — never guessed from text.
//   · Every guidance line carries source ids resolving in
//     knowledge/bookingRiskContext.js (Airbnb help-article primaries, the
//     Vrbo/Expedia primary, CFPB, Markel) — fetched 2026-07-28.
//   · Group choice rides the EXISTING rails: the share draft goes out on the
//     draft-sheet composer; guest picks come back per-guest through the RSVP
//     public-code write path (rsvp.py `lodging_pick` — an OPINION, not a
//     capacity claim, so the claims-ledger architecture ruling doesn't gate
//     it). The host decides; picks inform, never auto-commit (propose-don't-
//     ask, host-owns-the-call).
//
// event.lodgingOptions — the shortlist, stored on the event blob:
//   [{ id, label, url, sleeps, beds, pricePerNight, totalPrice,
//      cancellationTier ('flexible'|'moderate'|'limited'|'firm'|'strict'|''),
//      notes, status: 'option'|'chosen' }]
// The chosen option feeds the existing trip-brief `event.lodging` surface.

import { spanNights, spanEnd } from './dates';
import { BOOKING_RISK_SOURCES } from './knowledge/bookingRiskContext';
import { venueFor } from './venueFor';

// URL host → platform id. Anything else is 'other' — named honestly, never
// upgraded to a platform we have no policy grounding for.
export function lodgingPlatformFor(url) {
  try {
    const h = new URL(String(url || '')).hostname.toLowerCase();
    if (/(^|\.)airbnb\./.test(h)) return 'airbnb';
    if (/(^|\.)vrbo\.com$/.test(h) || /(^|\.)homeaway\./.test(h)) return 'vrbo';
    if (/(^|\.)booking\.com$/.test(h)) return 'booking';
    return h ? 'other' : null;
  } catch { return null; }
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

// Every https photo the host pasted for one option, in order, deduped. Accepts
// an array (`photos`), the legacy single `photoUrl`, or one string holding
// several links — hosts paste in bulk and a comma is not a URL delimiter they
// think about.
const HTTPS = /^https:\/\//i;

/**
 * Pull every image URL out of ONE paste (host ask 2026-07-28: "can the app do
 * the several link pasting?").
 *
 * DOCTRINE — why this is allowed where a gallery fetch is not: the never-build
 * list bans a live rental API and scraping the platform, and this does neither.
 * The app never contacts Airbnb or Vrbo. The HOST performs the access, copies
 * what they are looking at, and pastes it here; we parse content they supplied.
 * That is the same sanctioned shape as the vendor-reply parser ("apply reviewed
 * extraction", skill 06) — extraction only ever PROPOSES into a field the host
 * can still edit, and nothing is written on their behalf.
 *
 * Copying from a web page puts `text/html` on the clipboard, so one copy of a
 * gallery carries every <img src> in it. Plain text works too, for a host who
 * pasted a column of links.
 */
export function extractPhotoUrls(payload) {
  const text = String(payload == null ? '' : payload);
  if (!text.trim()) return [];
  const out = [];
  const add = (u) => {
    const clean = String(u || '').trim().replace(/&amp;/g, '&');
    if (HTTPS.test(clean) && !out.includes(clean)) out.push(clean);
  };
  // 1 · src="…" / data-src="…" — the ordinary gallery image.
  for (const m of text.matchAll(/(?:data-)?src\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  // 2 · srcset="url 400w, url 800w" — take each candidate's URL.
  for (const m of text.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const cand of m[1].split(',')) add(cand.trim().split(/\s+/)[0]);
  }
  // 3 · CSS background-image:url(…) — some galleries paint rather than <img>.
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1]);
  // 4 · Bare links in plain text — a host who pasted a column of addresses.
  for (const m of text.matchAll(/https:\/\/[^\s"'<>)]+/gi)) add(m[0]);
  // Only things that actually look like images. A listing page paste is full of
  // icons, logos and tracking pixels otherwise.
  return out.filter((u) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) || /\/(photo|image|media|lodging|pictures)\//i.test(u));
}
export function photoList(raw) {
  const o = raw || {};
  const bag = [];
  const push = (v) => {
    String(v == null ? '' : v)
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter((x) => HTTPS.test(x))
      .forEach((x) => { if (!bag.includes(x)) bag.push(x); });
  };
  if (Array.isArray(o.photos)) o.photos.forEach(push); else push(o.photos);
  push(o.photoUrl);
  return bag;
}

/**
 * Normalize one host-entered option. Pure; unknown fields ride through so the
 * shortlist can grow without this file changing.
 */
export function normalizeLodgingOption(raw, i = 0) {
  const o = raw || {};
  const url = String(o.url || '').trim();
  return {
    id: o.id || `lodge-${i + 1}`,
    label: String(o.label || '').trim() || `Option ${i + 1}`,
    url,
    platform: lodgingPlatformFor(url),
    sleeps: num(o.sleeps),
    beds: num(o.beds),
    pricePerNight: num(o.pricePerNight),
    totalPrice: num(o.totalPrice),
    cancellationTier: String(o.cancellationTier || '').toLowerCase().trim(),
    notes: String(o.notes || '').trim(),
    // The listing photos, HOST-PASTED (copy image address on the listing) —
    // never fetched from the listing page; https-only so a stray string can't
    // become a request. MULTIPLE now (host ask 2026-07-28: "if the other images
    // can be pulled in and advance in place for property that would be
    // helpful"), so a guest can flip through the house instead of judging it
    // from one shot. `photoUrl` stays as the first one for every existing
    // reader; `photos` is the strip.
    photos: photoList(o),
    photoUrl: photoList(o)[0] || '',
    status: o.status === 'chosen' ? 'chosen' : 'option',
  };
}

/**
 * lodgingIntel(event) → the engine read:
 * {
 *   options: [normalized + perOption checks],
 *   chosen:  the chosen option or null,
 *   guidance: [{ key, text, sources[] }]   — grounded, platform-aware
 *   share:   { subject, body }             — the group-choice draft (rails-ready)
 *   roles:   [{ role, why }]               — who-does-what, from the sources
 * }
 * Pure and honest: money math only when the host typed prices; sleeps-fit only
 * against a real guest count; nothing scraped, nothing invented.
 */
export function lodgingIntel(event) {
  const ev = event || {};
  const nights = spanNights(ev);
  const guests = Number(ev.guestCount) || Number(ev.guestEstimate) || (Array.isArray(ev.guests) ? ev.guests.length : 0) || null;
  const options = (Array.isArray(ev.lodgingOptions) ? ev.lodgingOptions : []).map(normalizeLodgingOption);
  const chosen = options.find((o) => o.status === 'chosen') || null;

  // ── WHAT THE GROUP SAID (migration 016, guest picks come home) ─────────────
  // Guests answer on the invite; the reply rides the per-guest upsert as
  // `lodging_pick` and lands on the roster row as `lodgingPick`. This is a TALLY
  // and nothing more — it informs the host, it never picks for them, and a guest
  // who has not answered is silent rather than counted as a no.
  const roster = Array.isArray(ev.guests) ? ev.guests : [];
  const votes = {};
  let voted = 0;
  for (const g of roster) {
    const pick = String((g && g.lodgingPick) || '').trim();
    if (!pick) continue;
    votes[pick] = (votes[pick] || 0) + 1;
    voted += 1;
  }

  // Per-option checks — arithmetic on host-entered facts, never a verdict.
  for (const o of options) {
    o.checks = [];
    if (guests && o.sleeps != null) {
      o.checks.push(o.sleeps >= guests
        ? { key: 'fit', ok: true, text: `Sleeps ${o.sleeps} — covers your ${guests}.` }
        : { key: 'fit', ok: false, text: `Sleeps ${o.sleeps} of your ${guests} — ${guests - o.sleeps} would need another plan.` });
    }
    // The group's own answer, when there is one. Never a percentage — a bar at
    // 60% of four replies reads as certainty the room does not have.
    o.votes = votes[o.id] || 0;
    if (o.votes) {
      o.checks.push({ key: 'votes', ok: true,
        text: `${o.votes} ${o.votes === 1 ? 'person prefers' : 'people prefer'} this one${voted ? ` — ${voted} of ${roster.length || voted} have said` : ''}.` });
    }
    if (o.totalPrice != null && guests) {
      o.checks.push({ key: 'split', ok: true, text: `$${o.totalPrice.toLocaleString()} ÷ ${guests} ≈ $${Math.round(o.totalPrice / guests).toLocaleString()} a person${nights ? ` for ${nights} night${nights === 1 ? '' : 's'}` : ''}.` });
    } else if (o.pricePerNight != null && nights && guests) {
      const total = o.pricePerNight * nights;
      o.checks.push({ key: 'split', ok: true, text: `~$${total.toLocaleString()} for ${nights} night${nights === 1 ? '' : 's'} ÷ ${guests} ≈ $${Math.round(total / guests).toLocaleString()} a person (before fees — the listing total is the real number).` });
    }
  }

  // Grounded guidance — platform-aware, from the booking-risk registry.
  const guidance = [];
  const platforms = new Set(options.map((o) => o.platform).filter(Boolean));
  guidance.push({
    key: 'checkout',
    text: 'Book through the platform’s own checkout, never off-platform — rebooking help, refunds, and fraud protection only exist inside it.',
    sources: ['airbnb-rebooking', 'vrbo-book-confidence'],
  });
  if (platforms.has('airbnb') || platforms.size === 0) {
    guidance.push({
      key: 'tier',
      text: 'The listing’s cancellation tier is visible before you book. A big group booking far out should weigh Flexible/Moderate listings — your own attrition shouldn’t be a total loss.',
      sources: ['airbnb-cancel-tiers'],
    });
    guidance.push({
      key: 'arrival',
      text: 'On arrival, photograph anything materially wrong immediately — Airbnb’s inaccuracy claims close 72 hours after discovery.',
      sources: ['airbnb-rebooking'],
    });
  }
  guidance.push({
    key: 'hostcancel',
    text: 'A host CAN cancel — penalties don’t prevent it. The remedy is a full refund plus rebooking help; the real risk is scarcity close to the date, so lock the house early and keep a second option’s link.',
    sources: ['airbnb-host-cancel', 'vrbo-book-confidence'],
  });
  guidance.push({
    key: 'weather',
    text: 'Storm-season bookings have NO weather safety net from the platform — foreseeable-season weather is excluded from Airbnb’s disruptive-events policy. That protection is event/travel insurance, bought when the booking is made.',
    sources: ['airbnb-mde'],
  });
  guidance.push({
    key: 'pay',
    text: 'Deposits go on a credit card, never cash or app transfers — the federal dispute clock runs 60 days from the statement, and event deposits age.',
    sources: ['cfpb-fcba'],
  });

  // Who-does-what — the roles the sources make real (host assigns names).
  const roles = [
    { role: 'One booker', why: 'One person books through checkout and holds the confirmation — the 72-hour inaccuracy window and any host-cancel remedy run through the booking account.' },
    { role: 'Money lead', why: 'Collects shares against the real listing total (fees included) — pay links ride the existing cost-sharing rails; the booker’s card takes the charge.' },
    { role: 'Arrival checker', why: 'First one in walks the house against the listing — beds, listed amenities — and photographs anything off, same day.' },
  ];

  // The group-choice draft — plain text on the existing draft rails; guests
  // reply with a pick via the invite (lodging_pick on the RSVP rail).
  const name = String(ev.name || '').trim() || 'our trip';
  const lines = [`Where we'd stay — ${name}`, ''];
  if (options.length) {
    lines.push('The options so far:');
    options.forEach((o, i) => {
      const bits = [
        o.sleeps != null ? `sleeps ${o.sleeps}` : null,
        o.beds != null ? `${o.beds} beds` : null,
        o.totalPrice != null ? `$${o.totalPrice.toLocaleString()} total` : (o.pricePerNight != null ? `$${o.pricePerNight.toLocaleString()}/night` : null),
        o.cancellationTier ? `${o.cancellationTier} cancellation` : null,
      ].filter(Boolean).join(' · ');
      lines.push(`${i + 1}. ${o.label}${bits ? ` — ${bits}` : ''}`);
      if (o.url) lines.push(`   ${o.url}`);
      if (o.notes) lines.push(`   ${o.notes}`);
    });
    // COPY FOLLOWS THE CAPABILITY (2026-07-28). This said "replying on the invite
    // works too" while the invite had no way to reply — a soft promise the app
    // could not keep. The pick block ships now, with the photo and the listing, so
    // the draft names it plainly and tells them what tapping it does and doesn't do.
    lines.push('', 'Tap your pick on the invite — the photos and listings are right there. It’s just a preference, not a booking; I’ll make the call.', '', 'Once we pick, one of us books it through the site’s own checkout and we split it fairly.');
  } else {
    lines.push('No options on the list yet — send me links you like and I’ll put them on the invite for everyone to see.');
  }
  const share = { subject: `Where we'd stay — ${name}`, body: lines.join('\n') };

  // The honest headline for the shortlist block: silence is silence.
  const groupSaid = !options.length ? null
    : voted === 0 ? 'Nobody has weighed in yet.'
    : (() => {
        const top = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
        const tie = options.filter((o) => (o.votes || 0) === (top.votes || 0) && o.votes).length > 1;
        if (!top || !top.votes) return `${voted} ${voted === 1 ? 'reply' : 'replies'} in — no clear favourite yet.`;
        return tie
          ? `${voted} ${voted === 1 ? 'reply' : 'replies'} in — it's a tie so far.`
          : `${top.votes} of ${voted} ${voted === 1 ? 'reply leans' : 'replies lean'} toward ${top.label}. Yours is still the call.`;
      })();

  return { options, chosen, guidance, share, roles, nights, guests, votes, voted, groupSaid };
}

/**
 * WHAT THIS HOUSE HAS TO HAVE (host directive 2026-07-28: "have the host input
 * other amenities or things that are requirements for the search").
 *
 * `search` carries a platform filter ONLY where that filter was verified against
 * the live search page on 2026-07-28 — Airbnb's own chips produced
 * `amenities[]=25` (hot tub), `amenities[]=7` (pool) and `pets=1`, and applying
 * two of them cut 495 homes to 125. The rest have no verified filter param, so
 * they are NOT faked into the URL; they steer the recommendation instead, matched
 * against what the host typed about each option. A filter we cannot prove is a
 * filter we do not send.
 */
export const LODGING_MUST_HAVES = [
  { id: 'hottub',   label: 'Hot tub',            search: { 'amenities[]': '25' }, match: /hot ?tub|jacuzzi|spa\b/i },
  { id: 'pool',     label: 'Pool',               search: { 'amenities[]': '7' },  match: /\bpool\b/i },
  { id: 'pets',     label: 'Pets welcome',       search: { pets: '1' },           match: /pet|dog friendly|dogs? ok/i },
  { id: 'stepfree', label: 'Step-free access',   search: null, match: /step-free|ground floor|single (level|story|storey)|no stairs|elevator|accessible/i },
  { id: 'kids',     label: 'Kid-ready',          search: null, match: /crib|pack.?n.?play|high ?chair|fenced|kid|family/i },
  { id: 'bigtable', label: 'Table for everyone', search: null, match: /big table|large table|seats \d+|dining for/i },
  { id: 'water',    label: 'Dock / water access',search: null, match: /dock|lakefront|waterfront|beach access|boat/i },
  { id: 'laundry',  label: 'Washer & dryer',     search: null, match: /washer|laundry|dryer/i },
  { id: 'ac',       label: 'Air conditioning',   search: null, match: /\ba\/?c\b|air.?condition/i },
  { id: 'parking',  label: 'Parking for several',search: null, match: /parking|driveway|garage/i },
];

const mustHaveById = (id) => LODGING_MUST_HAVES.find((m) => m.id === String(id || '').trim()) || null;

/** The host's requirement list off the event, junk dropped. */
export function mustHavesFor(event) {
  const raw = Array.isArray(event && event.lodgingMustHaves) ? event.lodgingMustHaves : [];
  return raw.map(mustHaveById).filter(Boolean);
}

/**
 * GO LOOK, WITH YOUR OWN ANSWERS ALREADY IN THE BOX (host question 2026-07-28:
 * "can the app use the event to find our suggest say a top 3 compatible options
 * from airbnb or vrbo?").
 *
 * The app cannot SEARCH those platforms — a live rental API is on the
 * never-build list and the alternative is scraping their results, which is both
 * banned here and against their terms. What it can do is hand the host a search
 * that is already filtered by everything the event knows: the town, the real
 * dates, the real head count, the budget they set. The platform runs its own
 * search in its own UI; the host brings back the two or three they like (the
 * paste flow takes a whole gallery at once) and lodgingRecommendation ranks
 * those against the same criteria.
 *
 * Verified against both platforms' live search on 2026-07-28 — these parameter
 * names are the ones their own search pages produce, not invented.
 */
export function lodgingSearchLinks(event) {
  const ev = event || {};
  const vf = venueFor(ev);
  const place = [vf.city, vf.state].filter(Boolean).join(', ');
  if (!place) return [];                       // no town, no honest search

  const start = /^\d{4}-\d{2}-\d{2}/.test(String(ev.date || '')) ? String(ev.date).slice(0, 10) : null;
  const end = (() => {
    const e = spanEnd(ev);
    return /^\d{4}-\d{2}-\d{2}/.test(String(e || '')) ? String(e).slice(0, 10) : null;
  })();
  const guests = Number(ev.guestCount) || Number(ev.guestEstimate) || (Array.isArray(ev.guests) ? ev.guests.length : 0) || null;
  const budget = Number(ev.totalBudget) > 0 ? Math.round(Number(ev.totalBudget)) : null;

  const said = [
    place,
    start && end ? `${start} to ${end}` : null,
    guests ? `${guests} guests` : null,
    budget ? `under $${budget.toLocaleString()}` : null,
  ].filter(Boolean);

  const musts = mustHavesFor(ev);
  for (const m of musts) if (m.search) said.push(m.label.toLowerCase());
  const ab = new URLSearchParams();
  if (start) ab.set('checkin', start);
  if (end) ab.set('checkout', end);
  if (guests) ab.set('adults', String(guests));
  if (budget) ab.set('price_max', String(budget));
  // Only the filters proven against the live search page ride the URL.
  for (const m of musts) {
    if (!m.search) continue;
    for (const [k, v] of Object.entries(m.search)) ab.append(k, v);
  }
  const abSlug = place.replace(/,\s*/g, '--').replace(/\s+/g, '-');

  const vr = new URLSearchParams({ destination: place });
  if (start) vr.set('startDate', start);
  if (end) vr.set('endDate', end);
  if (guests) vr.set('adults', String(guests));

  return [
    { id: 'airbnb', label: 'Search Airbnb', href: `https://www.airbnb.com/s/${encodeURIComponent(abSlug)}/homes?${ab.toString()}`, applied: said },
    { id: 'vrbo', label: 'Search Vrbo', href: `https://www.vrbo.com/search?${vr.toString()}`, applied: said },
  ];
}

/**
 * WHICH ONE THE PLAN WOULD PICK (host directive 2026-07-28: "intelligence should
 * derive a rental choice based on our event choices and criteria").
 *
 * DOCTRINE:
 *   · This is a PROPOSAL with its reasoning shown, never a decision. Nothing here
 *     writes; the host still taps "Make it the pick". Same shape as every other
 *     grounded proposal in the app (propose-don't-ask, host-owns-the-call).
 *   · It scores ONLY on facts the host typed and facts the event already knows —
 *     the guest count, the nights, the budget, who needs step-free access, how
 *     many kids. It never invents a listing fact to justify a preference.
 *   · A criterion with no data DOES NOT SCORE. An option is not punished for a
 *     price the host never entered; it simply says what it could not weigh, so
 *     the host can see the recommendation is partial rather than authoritative.
 *   · Fit is a GATE, not a weight. A house that cannot sleep the group is not a
 *     cheaper option, it is the wrong house.
 *
 * @returns {{ pick, why: string[], unweighed: string[], scores: Array }|null}
 */
export function lodgingRecommendation(event, intel) {
  const ev = event || {};
  const li = intel || lodgingIntel(ev);
  const options = li.options || [];
  if (options.length < 2) return null;      // nothing to choose between

  const guests = li.guests;
  const nights = li.nights;
  const budget = Number(ev.totalBudget) > 0 ? Number(ev.totalBudget) : null;
  const roster = Array.isArray(ev.guests) ? ev.guests : [];
  const needsAccess = roster.filter((g) => g && /wheelchair|step-free|stairs|mobility|walker|cane/i.test(String(g.needs || ''))).length;
  const kids = roster.reduce((n, g) => n + (Number(g && g.kids) || 0), 0);

  const musts = mustHavesFor(ev);
  const unweighed = [];
  if (!guests) unweighed.push('how many are coming');
  if (!options.some((o) => o.totalPrice != null || o.pricePerNight != null)) unweighed.push('what any of them cost');
  if (!options.some((o) => o.cancellationTier)) unweighed.push('how cancellation works on them');

  const scored = options.map((o) => {
    const reasons = [];
    let score = 0;
    let fits = true;

    // GATE — it has to hold the group at all.
    if (guests && o.sleeps != null) {
      if (o.sleeps < guests) { fits = false; reasons.push(`sleeps ${o.sleeps} of your ${guests}`); }
      else {
        score += 3;
        const slack = o.sleeps - guests;
        reasons.push(slack === 0 ? `sleeps exactly your ${guests}` : `sleeps ${o.sleeps}, ${slack} spare`);
        if (slack > 0 && slack <= 4) score += 1;          // room to breathe, not wasted money
      }
    }

    // MONEY — against the host's own budget when they set one, else cheapest wins.
    const total = o.totalPrice != null ? o.totalPrice : (o.pricePerNight != null && nights ? o.pricePerNight * nights : null);
    if (total != null) {
      const cheapest = Math.min(...options.map((x) => (x.totalPrice != null ? x.totalPrice : (x.pricePerNight != null && nights ? x.pricePerNight * nights : Infinity))));
      if (total === cheapest && options.length > 1) { score += 2; reasons.push('the least expensive of these'); }
      if (budget && total <= budget) { score += 1; reasons.push('inside the budget you set'); }
      if (budget && total > budget) { score -= 2; reasons.push(`$${(total - budget).toLocaleString()} over your budget`); }
    }

    // CANCELLATION — a big group booked far out should not be locked in hard.
    if (o.cancellationTier) {
      if (/flexible|moderate/.test(o.cancellationTier)) { score += 2; reasons.push(`${o.cancellationTier} cancellation`); }
      else { score -= 1; reasons.push(`${o.cancellationTier} cancellation — your own drop-outs would be a total loss`); }
    }

    // THE HOST'S OWN REQUIREMENTS — the strongest signal here, because they are
    // the only criterion the host stated outright rather than us inferring it.
    // An option is credited for meeting one and named for missing one; we match
    // against what the HOST typed about the option, never against a listing fact
    // we went and fetched.
    const hay = `${o.label} ${o.notes || ''}`;
    const met = [], missing = [];
    for (const m of musts) (m.match.test(hay) ? met : missing).push(m.label.toLowerCase());
    if (met.length) { score += met.length * 2; reasons.push(`has ${met.join(', ')}`); }
    if (missing.length) { score -= missing.length; reasons.push(`doesn't say it has ${missing.join(', ')}`); }

    // WHO IS COMING — these only speak when the roster actually says so.
    if (needsAccess > 0 && o.notes) {
      if (/step-free|ground floor|single (level|story|storey)|no stairs|elevator|accessible/i.test(o.notes)) {
        score += 2; reasons.push(`step-free — ${needsAccess === 1 ? 'someone' : needsAccess + ' people'} asked for that`);
      }
    }
    if (kids > 0 && o.notes && /crib|pack.?n.?play|fenced|pool fence|kid|family/i.test(o.notes)) {
      score += 1; reasons.push(`set up for kids — ${kids} coming`);
    }

    return { id: o.id, label: o.label, score, fits, reasons };
  });

  const eligible = scored.filter((x) => x.fits);
  const pool = eligible.length ? eligible : scored;
  const ranked = [...pool].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  // A tie is not a recommendation. Say so rather than picking arbitrarily.
  if (ranked.length > 1 && ranked[1].score === top.score) {
    return { pick: null, why: [], unweighed, scores: ranked, tie: true };
  }
  return { pick: top, why: top.reasons, unweighed, scores: ranked, tie: false };
}

// Proof helper: every guidance source id must resolve in the booking registry.
export function lodgingGuidanceSourcesResolve(intel) {
  return (intel.guidance || []).every((g) => (g.sources || []).every((id) => BOOKING_RISK_SOURCES[id]));
}
