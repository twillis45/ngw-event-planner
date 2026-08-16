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
import { isAllowedMedia } from './lodgingBookmarklet';
import { googleTravelTs } from './googleTravelTs';
// LEAF IMPORT ON PURPOSE (2026-08-16). Importing this from './playbooks'
// dragged the entire 1.4MB playbook corpus onto the guest invite path,
// because InviteV2 imports this module. See destLodgingOptions.js.
import { DEST_LODGING_OPTIONS } from './destLodgingOptions';

// ─── A PHOTO VIEWER IS NOT A DIFFERENT HOUSE ────────────────────────────────
// Opening a listing's gallery keeps the listing URL and swaps the title, so a
// pasted link can arrive named "Photo gallery for Golden Crest". The right
// repair is to recover the property's name, never to reject the row — the URL
// was always correct. Module-level so BOTH readers share it (the results-page
// card parser and the single-listing og:title path); it lived inside the card
// parser alone, which is why single links still showed the raw gallery name.
const ungalleryName = (l) => String(l || '')
  .replace(/^\s*(photo gallery|photos?|image gallery|gallery)\s+(for|of)\s+/i, '')
  .trim();


// URL host → platform id. Anything else is 'other' — named honestly, never
// upgraded to a platform we have no policy grounding for.
// ─── ONE DATE VOICE FOR THIS SURFACE (live drive, 2026-08-03) ──────────────
// This formatter lived INSIDE lodgingSearchBlocked, whose own comment records
// the fix: "Host language, not ISO. The first version printed '2028-06-17 to
// 2028-06-21' at a host who has never typed a date that way."
//
// The fix never spanned. `lodgingSearchLinks` built its `said[]` summary from
// the raw ISO slices, so the very line under the search doors — "Opens with
// your own answers already in it" — still read "2028-06-17 to 2028-06-21".
// Caught by driving the sheet on a phone, not by any gate: a fix applied at one
// call site is not a fix applied to the class. Both sites now share this.
export const niceDay = (iso) => {
  try {
    return new Date(String(iso) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return iso; }
};

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
    // 'room' when the rate buys ONE ROOM (a hotel) rather than the whole place
    // (a rental). Decides whether rate x nights is a stay total or a fragment
    // of one — see the allIn block. Absent means whole-place, the long-standing
    // default for every Airbnb/Vrbo row.
    rateBasis: o.rateBasis === 'room' ? 'room' : null,
    totalPrice: num(o.totalPrice),
    // FEES ARE PART OF THE PRICE (host directive 2026-07-28: "include fees in
    // rate for the per person cost"). Cleaning, service and taxes are what turn
    // an $1,800 listing into a $2,300 bill, and splitting the sticker price
    // understates what each person actually owes. Host-typed like everything
    // else here; when they leave it blank we say the number is before fees
    // rather than quietly pretending it is the whole cost.
    fees: num(o.fees),
    cancellationTier: String(o.cancellationTier || '').toLowerCase().trim(),
    // ── METADATA THE NORMALIZER USED TO EAT (2026-08-03) ───────────────────
    // This function rebuilds a clean option from known keys, which is right —
    // but it silently dropped three fields the surfaces depend on, so the
    // provenance line and the price history rendered blank while their engines
    // and gates were green. A normalizer that discards a field is a data loss
    // no unit test on the engine can catch; it only shows on the surface.
    //   sources        which fields were READ off a page vs TYPED by the host
    //   priceFirstSeen the first number the host ever recorded, for "was $X"
    //   wasChosen      that a now-gone place HAD been the pick
    // None of these are listing facts, so the host-entered-facts-only doctrine
    // is untouched: they describe where our own data came from.
    sources: (o.sources && typeof o.sources === 'object' && !Array.isArray(o.sources))
      ? { ...o.sources } : undefined,
    priceFirstSeen: num(o.priceFirstSeen),
    wasChosen: o.wasChosen === true ? true : undefined,
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
    // ── WHAT THE LISTING SAID IT HAS (2026-08-06) ──────────────────────────
    // The page carries a structured amenity list — "Kitchen", "Hot tub",
    // "Free washer – In unit" — and the normalizer used to drop it, so every
    // must-have row in the side-by-side read "—" even when the listing plainly
    // said yes. These are the page's OWN words, kept verbatim; nothing is
    // inferred from them beyond the host's own must-have patterns.
    amenities: Array.isArray(o.amenities)
      ? o.amenities.map((a) => String(a || '').trim()).filter(Boolean).slice(0, 40)
      : [],
    status: o.status === 'chosen' ? 'chosen' : 'option',
  };
}

/**
 * Everything we may match a host's must-have against, for ONE option.
 *
 * There were two matchers reading two different things: the ranker used
 * `label + notes`, and the side-by-side used `notes` ALONE. Neither saw the
 * amenity list, so a house whose listing said "Free washer – In unit" showed
 * "—" against "Washer & dryer" (host report, 2026-08-06). One hay, both
 * callers, so they cannot disagree about what a place offers.
 *
 * Only the host's own typed words and the listing's own words — never a guess.
 */
export function optionHay(option) {
  const o = option || {};
  const am = Array.isArray(o.amenities) ? o.amenities.join(' ') : '';
  return `${o.label || ''} ${o.notes || ''} ${am}`;
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
/**
 * IS THERE A KITCHEN WHERE EVERYONE IS STAYING?  true | false | null
 *
 * WHY THIS EXISTS. A resort and a rental house produce nearly disjoint food plans.
 * A hotel has no kitchen: the plan is reservations, private dining and banquet
 * minimums, and a grocery list is meaningless. A whole-home rental has a full
 * kitchen: the plan is a grocery run, someone cooking, and — across a multi-day
 * span — a meal per day rather than one event. The app already ASKED which it was
 * (`dest_lodging`, "How are guests staying?") and already derived the platform from
 * a pasted listing URL, and then told neither fact to the food engine.
 *
 * THE THIRD STATE IS THE POINT. "Guests book on their own" says nothing about a
 * kitchen — the host genuinely does not know where anyone will be. That returns
 * null, not false, so a surface can ask instead of assuming a hotel.
 *
 * Reads host answers only. No inference from a city, a price, or an event type.
 */
/**
 * The same ladder lodgingKitchen has always walked, but it now reports WHERE the
 * answer came from as well as what it is.
 *
 * Driving the cockpit on 2026-08-04: pasting one bare Airbnb link put "There is
 * a kitchen." on screen in the same voice the app uses for facts the host typed.
 * Nothing in that paste established a kitchen — the rule reads it off the URL
 * host, and Airbnb lists private rooms, shared rooms and hotel rooms too. The
 * inference is a reasonable default and stays; presenting it as settled fact,
 * with no basis and no way to correct it, is the defect. This decides the whole
 * food plan, so a wrong one is expensive.
 *
 * `from` is the tier, in the app's own vocabulary: 'told' is the host answering,
 * 'inferred' is us reading it off a link.
 */
export function kitchenSignal(event) {
  const ev = event || {};

  // 1 · WHAT THE HOST TOLD US, FIRST. This used to run second, behind the URL
  //     inference, and the ordering was asserted in a test heading — "a pasted
  //     listing outranks the multiple choice" — that no test actually exercised:
  //     every case there supplied a listing and no answer, so the two never met.
  //
  //     They met on the 2026-08-04 drive. The host pressed "A hotel or room
  //     block" to correct a kitchen we had inferred from an Airbnb URL; the
  //     answer was stored, and the screen went on saying "There is a kitchen."
  //     A control that records your answer and then overrules it is worse than
  //     no control at all.
  //
  //     Told beats inferred — the app's own grounding ladder, applied here. A
  //     link is us reading a URL host; this is the host answering the question.
  const picks = (ev.foodChoices && typeof ev.foodChoices === 'object') ? ev.foodChoices : {};
  const pick = String(picks.dest_lodging || '').trim();
  if (/airbnb|rental|house|cabin|villa/i.test(pick)) {
    return { value: true, from: 'told', basis: `You said: “${pick}”.` };
  }
  // A room block IS a hotel — that is what a block is.
  if (/room block/i.test(pick)) {
    return { value: false, from: 'told', basis: `You said: “${pick}”.` };
  }

  // 2 · Nothing told, so read the listing. Platform comes from the URL host,
  //     never from prose. This still outranks silence — it is a real signal —
  //     it just no longer outranks the host.
  const opts = Array.isArray(ev.lodgingOptions) ? ev.lodgingOptions : [];
  for (const o of opts) {
    const platform = lodgingPlatformFor(o && o.url);
    // Whole-home rental platforms. A kitchen is what the host is booking.
    if (platform === 'vrbo' || platform === 'airbnb') {
      return {
        value: true,
        from: 'inferred',
        basis: `Taken from the ${platform === 'vrbo' ? 'Vrbo' : 'Airbnb'} link you brought back — most whole-home rentals have one. If this is a room rather than the whole place, say so.`,
      };
    }
  }

  // 3 · "Guests book on their own", or nothing asked yet. NOT TOLD.
  return { value: null, from: 'none', basis: '' };
}

/** The long-standing three-valued answer. Unchanged contract — the basis rides
 *  alongside on kitchenSignal so no existing caller has to care. */
export function lodgingKitchen(event) {
  return kitchenSignal(event).value;
}

// ─── WHAT THE KITCHEN DECIDES (workflow census, 2026-08-03) ────────────────
// `lodgingKitchen` had ZERO render sites on the lodging surface. The host
// answered "where does everyone sleep" HERE and the consequence appeared only
// on the food sheet and the reveal — the surface that owns the decision never
// said what the decision does.
//
// Worse, the question that sets it can be switched off: `dest_lodging` is
// removed whenever a `lodging` or `room_block` base decision already exists
// (playbooks/index.js:756). On those events the only remaining source is a
// pasted Airbnb/Vrbo URL, so a host who books a hotel by phone and types the
// name reaches `kitchen === null` permanently and the food plan never learns.
//
// So this returns the consequence AND, when nothing has told us, the two
// answers that can settle it in place. Answering writes the same
// `foodChoices.dest_lodging` the playbook would have written, which is what
// `lodgingKitchen` already reads — no second source of truth.
// DERIVED, NOT RESTATED. The first cut hardcoded the two option strings, which
// made this a second source of truth for `dest_lodging`'s wording — reword the
// playbook and these buttons would quietly write a value `lodgingKitchen` no
// longer matches. Instead the real option list is imported and each answer is
// SELECTED from it by the very predicate lodgingKitchen uses, so a button can
// never promise a kitchen value it does not produce. If no option matches, the
// answer is dropped rather than guessed.
export const KITCHEN_ANSWERS = (() => {
  const pickBy = (re) => DEST_LODGING_OPTIONS.find((o) => re.test(String(o)));
  const rental = pickBy(/airbnb|rental|house|cabin|villa/i);
  const hotel = pickBy(/room block/i);
  return [
    rental ? { id: 'rental', label: 'A house we rent', kitchen: true, pick: rental } : null,
    hotel ? { id: 'hotel', label: 'A hotel or room block', kitchen: false, pick: hotel } : null,
  ].filter(Boolean);
})();

export function kitchenConsequence(event) {
  const ev = event || {};
  // Only a destination event has a lodging decision to have a consequence.
  if (ev.isDestination !== true) return null;

  const sig = kitchenSignal(ev);
  const k = sig.value;
  // An INFERRED answer keeps the answers on offer — it is a good guess about a
  // decision that sets the entire food plan, and the host must be able to
  // overrule it in place. An answer the host TOLD us needs no such escape.
  const correctable = sig.from === 'inferred' ? KITCHEN_ANSWERS : [];
  if (k === true) {
    return {
      state: 'kitchen', answered: true, from: sig.from, basis: sig.basis,
      headline: 'There is a kitchen.',
      detail: 'So the food plan is a grocery run, and the shopping list is the real artifact.',
      answers: correctable,
    };
  }
  if (k === false) {
    return {
      state: 'no-kitchen', answered: true, from: sig.from, basis: sig.basis,
      headline: 'There is no kitchen.',
      detail: 'So the food plan is reservations. A shopping list is not the plan for a hotel stay.',
      answers: correctable,
    };
  }
  // NOT TOLD. Never assume a hotel — say it is open, and offer the answer.
  return {
    state: 'untold', answered: false, from: 'none', basis: '',
    headline: 'Nobody has told you yet.',
    detail: 'Where everyone sleeps decides whether the food plan is a grocery run or a set of reservations. Until it is answered the plan sizes one gathering.',
    answers: KITCHEN_ANSWERS,
  };
}

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
    // ── A ROOM RATE IS NOT A STAY (2026-08-06, review board, both override
    // seats). A rental's nightly rate buys the WHOLE HOUSE, so rate x nights is
    // the stay. A hotel's buys ONE ROOM, and a party of ten needs about five of
    // them. This computed rate x nights either way and then divided the result
    // across every guest — so a $212 hotel read "$848 ÷ 10 ≈ $85 a person" when
    // the real figure is nearer $4,240. That is the SAME defect this file fixed
    // twice today (bed count read as capacity; a nightly rate stored as a stay
    // total), surviving one multiplication further along.
    //
    // We do not know the room count and will not guess one: a party does not
    // divide into rooms by arithmetic (couples, children, singles). So a
    // per-room rate yields NO stay total and NO per-person split until a host
    // says how many rooms. The rate itself still shows — it is real, and it is
    // labelled as what it is.
    o.perRoom = o.rateBasis === 'room';
    o.allIn = o.totalPrice != null ? o.totalPrice + (o.fees || 0)
      : (!o.perRoom && o.pricePerNight != null && nights
        ? o.pricePerNight * nights + (o.fees || 0) : null);
    o.feesKnown = o.fees != null;
    if (o.perRoom && o.pricePerNight != null) {
      o.checks.push({ key: 'total', ok: false,
        text: `$${o.pricePerNight.toLocaleString()} a night for ONE ROOM${nights ? ` — ${nights} night${nights === 1 ? '' : 's'}` : ''}. How many rooms you need decides the real total, so nothing is totalled here yet.` });
    }
    if (o.allIn != null) {
      o.checks.push({ key: 'total', ok: true,
        text: o.feesKnown
          ? `$${o.allIn.toLocaleString()} all in — $${o.totalPrice != null ? o.totalPrice.toLocaleString() : (o.pricePerNight * nights).toLocaleString()} plus $${o.fees.toLocaleString()} in fees.`
          : `$${o.allIn.toLocaleString()} before fees — cleaning and service still to come.` });
    }
    if (o.totalPrice != null && guests) {
      o.checks.push({ key: 'split', ok: true, text: `$${o.allIn.toLocaleString()} ÷ ${guests} ≈ $${Math.round(o.allIn / guests).toLocaleString()} a person${nights ? ` for ${nights} night${nights === 1 ? '' : 's'}` : ''}${o.feesKnown ? ', fees included' : ' — before fees'}.` });
    } else if (o.allIn != null && guests) {
      o.checks.push({ key: 'split', ok: true, text: `~$${o.allIn.toLocaleString()} for ${nights} night${nights === 1 ? '' : 's'} ÷ ${guests} ≈ $${Math.round(o.allIn / guests).toLocaleString()} a person${o.feesKnown ? ', fees included' : ' (before fees — the listing total is the real number)'}.` });
    }
  }

  // Grounded guidance — platform-aware, from the booking-risk registry.
  const guidance = [];
  const platforms = new Set(options.map((o) => o.platform).filter(Boolean));
  // ── A CLAIM RENDERS ONLY WHERE ITS SOURCES REACH (2026-08-06, review board)
  // Every line below is sourced from Airbnb's and Vrbo's own consumer-
  // protection regimes. They were rendering on ANY shortlist, including one
  // made entirely of hotels — telling a host that "rebooking help, refunds and
  // fraud protection" cover a booking that inherits none of them, and citing
  // "Airbnb's inaccuracy claims close 72 hours after discovery" over a Marriott.
  //
  // `platforms.size === 0` was doing the damage: a hotel row has no url and so
  // no platform, which made an all-hotel shortlist indistinguishable from an
  // EMPTY one, and the empty case deliberately shows the general guidance.
  // Splitting the two restores that default without extending these particular
  // claims past the platforms that back them.
  const noneYet = !options.length;
  const hasRental = platforms.has('airbnb') || platforms.has('vrbo');
  if (hasRental || noneYet) {
    guidance.push({
      key: 'checkout',
      text: 'Book through the platform’s own checkout, never off-platform — rebooking help, refunds, and fraud protection only exist inside it.',
      sources: ['airbnb-rebooking', 'vrbo-book-confidence'],
    });
  }
  if (platforms.has('airbnb') || noneYet) {
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

const API_BASE = process.env.REACT_APP_API_BASE_URL;

/** True when the unfurl endpoint can be reached at all. */
export const isUnfurlConfigured = () => Boolean(API_BASE);

/**
 * READ ONE LISTING PAGE (host decision 2026-07-28 — an explicit exception).
 *
 * The standing rule is that this app never contacts Airbnb or Vrbo. The host
 * overrode it for exactly this: one page, that they pasted, on a button they
 * pressed, read for the sharing metadata the page publishes for that purpose.
 * It is a link unfurl — what every messaging app does with a pasted link — not
 * a crawl, not a search harvest, and not a gallery grab. The gallery still comes
 * from the host's own copy-paste, which needs no fetch and always works.
 *
 * Verified 2026-07-28: a real Airbnb listing returns a title carrying its own
 * bedrooms / beds / baths, plus a description and one sharing image. Vrbo
 * declined the automated read — which is expected, is reported plainly, and is
 * why the paste path stays primary.
 *
 * @returns {{ok:true, url, title, facts, image, description}|{ok:false, reason}}
 */
// How long we will make a host watch a spinner before we answer them ourselves.
// Long enough for a warm backend to read a real listing page, short enough that
// it never reads as "stuck". A cold Render dyno takes far longer than this and
// that is exactly the case this bounds.
const UNFURL_MS = 12000;

/**
 * Read the listing LINKS off a results page the host is looking at.
 *
 * Host-initiated and one page — never a crawl. It returns links and nothing
 * else, because that is all a results page reliably carries: the ids sit in an
 * embedded map-pin payload with names and prices in a different structure, and
 * pairing them by position would be a guess. A confident wrong price is worse
 * than no price.
 *
 * The host then unticks what they were not really considering, and only the
 * places they KEEP are ever read individually.
 */
export async function lodgingResults(url) {
  if (!API_BASE) return { ok: false, reason: 'Reading searches isn’t switched on here — copy the results page and paste it instead.' };
  const clean = String(url || '').trim();
  if (!HTTPS.test(clean)) return { ok: false, reason: 'That needs to be an https link to the search.' };
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), UNFURL_MS) : null;
  try {
    const res = await fetch(`${API_BASE}/api/lodging/results?url=${encodeURIComponent(clean)}`,
      ctl ? { signal: ctl.signal } : undefined);
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, reason: failureReason(res.status, body) };
    return { ok: true, ...body };
  } catch (err) {
    const timedOut = err && (err.name === 'AbortError' || String(err).includes('aborted'));
    return { ok: false, reason: timedOut
      ? 'Reading that search is taking too long. Open it and copy the page instead.'
      : 'Couldn’t reach that search. Copy the results page and paste it instead.' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function unfurlListing(url) {
  if (!API_BASE) return { ok: false, reason: 'Reading listings isn’t switched on here — copy the page and paste it instead.' };
  const clean = String(url || '').trim();
  if (!HTTPS.test(clean)) return { ok: false, reason: 'That needs to be an https link to the listing.' };
  // ── A READ THAT NEVER ANSWERS IS THE ONE WE HADN'T HANDLED ────────────────
  // Driving this on 2026-08-04: a single Airbnb link left the button reading
  // "Reading…" for 33 seconds and counting. Every FAILURE was handled — bad
  // link, 404, 502, refused — but a server that simply never replies is not a
  // failure, it is silence, and silence had no path out. The host was stranded
  // on a spinner with no way to keep going.
  //
  // Render cold-starts and a heavy listing page can genuinely take a minute. We
  // do not make the host wait it out: cut it at UNFURL_MS, say what happened in
  // their words, and let the keep-the-link path do its job. The link is never
  // lost — losing it would be worse than not filling it in.
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), UNFURL_MS) : null;
  try {
    const res = await fetch(`${API_BASE}/api/lodging/unfurl?url=${encodeURIComponent(clean)}`,
      ctl ? { signal: ctl.signal } : undefined);
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, reason: failureReason(res.status, body) };
    return { ok: true, ...body };
  } catch (err) {
    // Distinguish "took too long" from "couldn't get there" — they are different
    // situations and the host can act on them differently.
    const timedOut = err && (err.name === 'AbortError' || String(err).includes('aborted'));
    return { ok: false, reason: timedOut
      ? 'Reading that listing is taking too long — I’ve kept the link. Open it and paste the page if you want the name and price filled in.'
      : 'Couldn’t reach the listing. Copy the page and paste it instead.' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * WHY THIS EXISTS: driving the live app on 2026-07-28, "Read the listing" put the
 * word "Not Found" on the screen. The backend hadn't shipped the route yet, so
 * FastAPI answered its own framework 404 — `{"detail": "Not Found"}` — and the
 * client passed `detail` straight through to the host. A raw HTTP reason phrase
 * is not host language, and it tells the host nothing they can act on.
 *
 * Our own router NEVER answers 404: it uses 400 for a bad link and 502/504 for a
 * refused or slow read, and every one of its messages is a full sentence written
 * for a person. So a 404 means the endpoint isn't there at all — say that — and
 * any `detail` that doesn't read like our copy gets replaced rather than shown.
 */
export function failureReason(status, body) {
  const detail = body && typeof body.detail === 'string' ? body.detail.trim() : '';
  if (status === 404) {
    return 'Reading listings isn’t switched on here yet — copy the listing page and paste it instead.';
  }
  // Host-facing copy from our router: a real sentence, spaces and a full stop.
  // Framework phrases ("Not Found", "Internal Server Error") have neither.
  const isHostCopy = detail.length >= 20 && /\s/.test(detail) && /[.!?]$/.test(detail);
  return isHostCopy ? detail : 'Couldn’t read that listing. Copy the page and paste it instead.';
}

/**
 * ONE PASTE FILLS THE FORM (host question 2026-07-28: "if the app can pull the
 * deep links does the host need to input the urls for property and gallery?").
 *
 * The deep link only goes OUT — it is a string we build from facts the event
 * already holds, and it fetches nothing, so nothing comes back on it. The host
 * is still the only thing that crosses back from the platform, because the app
 * contacting Airbnb or Vrbo is the never-build line. What we CAN do is make that
 * crossing cost one action instead of three: a copied listing page carries its
 * canonical link and its title in the same clipboard payload as the images.
 *
 * Extracted, never fetched. Fills only EMPTY fields, so it can't overwrite what
 * the host typed.
 */
export function extractListingMeta(payload) {
  const text = String(payload == null ? '' : payload);
  if (!text.trim()) return { url: '', title: '' };

  // The listing URL: prefer an explicit canonical/og:url, else the first link
  // that looks like a property page on a platform we recognise.
  const pick = (re) => { const m = text.match(re); return m ? m[1].trim() : ''; };
  let url = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || pick(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  if (!url) {
    const all = text.match(/https:\/\/[^\s"'<>)]+/gi) || [];
    url = all.find((u) => /(^|\.)airbnb\.[a-z.]+\/rooms\//i.test(u))
      || all.find((u) => /(^|\.)vrbo\.com\/\d/i.test(u))
      || all.find((u) => /(^|\.)booking\.com\/hotel\//i.test(u))
      || '';
  }
  url = url.split('?')[0];

  // The name: og:title or <title>, with the platform's own suffix trimmed off
  // ("… - Pensacola Beach | Vrbo" → "…") — and the gallery prefix stripped by
  // the SAME helper the results-page parser uses. It only ran on that path, so
  // a link pasted from an open photo viewer still landed on the shortlist as
  // "Photo gallery for Serendipity by the Slopes: hot tub", and that junk then
  // rode into the recommendation sentence and the CTA ("Go with Photo gallery
  // for …"). One cleaner, both paths.
  let title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || pick(/<title[^>]*>([^<]+)<\/title>/i);
  title = ungalleryName(title)
    .replace(/\s*[|·—-]\s*(Vrbo|Airbnb|Booking\.com).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  return { url: /^https:\/\//i.test(url) ? url : '', title };
}

// ─── ONE PASTE, THE WHOLE SHORTLIST ─────────────────────────────────────────
//
// Host question 2026-07-28: "if you initially tested by creating a search on the
// vrbo and airbnb platforms to create a list and used the list to find listings
// that fit our criteria, why can't you do the same here? why does the host have
// to pull a url?"
//
// Fair question, and the answer is about WHO does the searching. During testing
// the searching was done by the host's own browser — their profile, their IP, a
// page already open in front of them. For the app to do it, Render would have to
// hit the search endpoint from a datacenter, which is (a) the harvesting the
// never-build list names, and (b) mostly futile: Vrbo already refuses our
// single-page read in production, and that is the easy case.
//
// So the app doesn't search. It makes the RETURN TRIP cost one action. The app
// already builds the search with the host's own answers in it; this reads the
// results page they copied back.
//
// WHAT A COPIED RESULTS PAGE ACTUALLY CONTAINS (measured against a live Airbnb
// McHenry search, 2026-07-28 — not assumed):
//   · the `/rooms/` anchors have EMPTY text, and a text/plain copy is mostly
//     chrome ("Prices include all fees" ×11). Plain text CANNOT pair a name to a
//     link, so the HTML flavour of the clipboard is the one that carries meaning.
//   · linearised, each card reads:
//       [link ×7] "Top guest favorite" "Cabin in McHenry" "Spacious 5BR Family
//       Cabin" "5 bedrooms" "5 bedrooms" "," "·" "8 beds" "8 beds" "$1,997"
//       "$1,668" "Show price breakdown" "for 2 nights"
//     — the link repeats, accessibility text duplicates, and the card's own text
//     FOLLOWS its link. Grouping by "most recent link seen" recovers each card.
//
// Nothing here fetches. It reads a document the host copied, exactly like
// extractListingMeta does for a single page — this one just yields many.

// Chrome the cards carry that is never a property name.
const CARD_NOISE = /^(top guest favorite|guest favorite|superhost|rare find|show price breakdown|for \d+ nights?|book early to save|prices include all fees|add to wishlist|save this home|new|check availability|\d+ nights?|[,·|+]|)$/i;
// "Cabin in McHenry" / "Home in Deep Creek Lake" — Airbnb's type line, not a name.
const TYPE_LINE = /^(home|cabin|condo|cottage|villa|townhouse|apartment|guesthouse|guest suite|chalet|loft|bungalow|tiny home|camper|farm stay|houseboat|place|room|barn|treehouse|tent)\b.*\bin\b\s+(.+)$/i;

/** Linearise HTML into an ordered stream of {link} / {text} tokens. */
function tokenStream(html) {
  const toks = [];
  if (typeof DOMParser === 'undefined') return toks;
  let doc;
  try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (_e) { return toks; }
  if (!doc || !doc.body) return toks;
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 1) {
        const href = child.getAttribute && child.getAttribute('href');
        if (child.tagName === 'A' && href) toks.push({ link: href });
        // The card's thumbnail rides in the same pasted HTML as its words.
        if (child.tagName === 'IMG' && child.getAttribute) {
          toks.push({ img: child.getAttribute('src') || '' });
        }
        walk(child);
      } else if (child.nodeType === 3) {
        const t = String(child.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (t) toks.push({ text: t });
      }
    }
  };
  walk(doc.body);
  return toks;
}

/** A listing page URL on a platform we model — absolute or site-relative. */
function listingUrl(href, hint) {
  const h = String(href || '').trim();
  const abs = /^https?:\/\//i.test(h) ? h
    : h.startsWith('/rooms/') ? `https://www.airbnb.com${h}`
      // ── VRBO'S CARDS ARE BARE NUMBERS (real Vrbo page, 2026-08-05) ────────
      // Airbnb's relative card link announces itself ("/rooms/123"); Vrbo's is
      // just "/963775", so every card on a real pasted Vrbo results page was
      // dropped before it was ever read — the app offered a Vrbo door, the
      // door worked, and nothing could come back through it.
      //
      // A bare number is only a listing in context, so it resolves ONLY when
      // the page itself is demonstrably Vrbo's (its own domain appears in the
      // markup — media.vrbo.com on the card images, or a vrbo.com link). The
      // caller passes that verdict in; without it, a bare number stays what it
      // looks like on its own: not a listing.
      : (hint === 'vrbo' && /^\/\d{5,}$/.test(h.split('?')[0])) ? `https://www.vrbo.com${h.split('?')[0]}`
        : '';
  if (!abs) return '';
  const clean = abs.split('?')[0].split('#')[0];
  if (!/^https:\/\//i.test(clean)) return '';
  // Booking.com removed 2026-07-28 (review board): its terms uniquely name
  // browser-based assistants, and this gate feeds the same collector path.
  return /(^|\.)airbnb\.[a-z.]+\/rooms\/\d/i.test(clean)
    || /(^|\.)vrbo\.com\/\d/i.test(clean)
    ? clean : '';
}

const numFrom = (lines, re) => {
  for (const l of lines) { const m = l.match(re); if (m) return Number(m[1]); }
  return null;
};

/**
 * Read a copied SEARCH RESULTS page into shortlist candidates.
 *
 * @returns {{candidates: Array, source: string|null, linksOnly: boolean}}
 *   `linksOnly` is true when all we could recover were URLs (a plain-text paste)
 *   — the caller must say so rather than presenting nameless rows as a read.
 */
export function extractListingCandidates(payload) {
  const html = String(payload == null ? '' : payload);
  if (!html.trim()) return { candidates: [], source: null, linksOnly: false };

  const toks = tokenStream(html);
  // Whose results page is this? Only used to resolve Vrbo's bare-numeric card
  // links (see listingUrl) — never to label a listing we could not read.
  const hint = /(^|[^a-z])(media\.)?vrbo\.com/i.test(html) ? 'vrbo' : null;
  const byUrl = new Map();
  const imgByUrl = new Map();
  let current = '';
  for (const t of toks) {
    if (t.link !== undefined) {
      const u = listingUrl(t.link, hint);
      if (u) { current = u; if (!byUrl.has(u)) byUrl.set(u, []); }
      continue;
    }
    if (!current) continue;
    // FIRST image per card wins — later ones are carousel frames or badges.
    if (t.img !== undefined) { if (!imgByUrl.has(current) && t.img) imgByUrl.set(current, t.img); continue; }
    if (t.text) byUrl.get(current).push(t.text);
  }

  // A plain-text paste (or a page with no card markup) still yields URLs — say so.
  if (!byUrl.size) {
    // HOTELS HAS NO CARD LINK TO GROUP ON (host, 2026-08-06: "get a real
    // google page for our hotel and our options/amenities"). A real captured
    // page proved every card's <a href> is a Google ad-click redirect
    // (/aclk?...&adurl=), not a stable per-hotel URL like Airbnb's /rooms/N —
    // there is no canonical link anywhere on the page to key a candidate on.
    // So this groups on the <a> tag BOUNDARY instead of its href, and never
    // stores that href as `url` — a real name/price/rating/amenities comes
    // back, "Open the listing" simply has nothing to point at, same honest
    // no-url pattern normalizeLodgingOption already supports.
    // ONE HOTEL'S PAGE IS REFUSED OUTRIGHT, not fed to the card parser — see
    // looksLikeHotelDetailPage for the row it used to manufacture. `source`
    // names it so the surface can say the true thing instead of the generic
    // "nothing readable", which would send the host back to re-copy a page that
    // will never parse.
    if (looksLikeHotelDetailPage(html)) {
      return { candidates: [], source: 'HotelsDetail', linksOnly: false };
    }
    if (looksLikeHotelsResultsPage(html)) {
      const candidates = extractHotelCandidates(toks);
      if (candidates.length) return { candidates, source: 'Hotels', linksOnly: false };
    }
    const urls = (html.match(/https:\/\/[^\s"'<>)\]]+/gi) || [])
      .map((u) => listingUrl(u, hint)).filter(Boolean);
    const uniq = [...new Set(urls)];
    return {
      candidates: uniq.map((url) => ({ url, name: '', kind: '', place: '', bedrooms: null, beds: null, priceShown: null })),
      source: uniq.length ? platformOf(uniq[0]) : null,
      linksOnly: uniq.length > 0,
    };
  }

  const candidates = candidatesFromGroups(
    [...byUrl].map(([url, lines]) => ({ url, lines, img: imgByUrl.get(url) || '' })), hint);
  return { candidates, source: candidates.length ? platformOf(candidates[0].url) : null, linksOnly: false };
}

// ── A HOTEL CARD, READ WITHOUT A URL TO KEY ON ──────────────────────────────
// Every field here self-identifies by shape (a price looks like "$389", a
// rating like "4.2/5"), not by position — real captured cards put the OTA
// badge line in different places, and Hilton's own badge alt text duplicates
// the hotel's name outright, so position alone would misread it.
function extractHotelCandidates(toks) {
  const groups = [];
  let cur = null;
  for (const t of toks) {
    if (t.link !== undefined) { cur = { lines: [], img: '' }; groups.push(cur); continue; }
    if (!cur) continue;
    if (t.img !== undefined) {
      if (!cur.img && t.img) cur.img = t.img.startsWith('//') ? `https:${t.img}` : t.img;
      continue;
    }
    if (t.text) cur.lines.push(t.text);
  }
  const PRICE = /^\$[\d,]+$/;
  const RATING = /^(\d(?:\.\d)?)\/5$/;
  const REVIEWS = /^\(([\d.,]+[KM]?)\)$/;
  const STAR = /^(\d)-star hotel$/i;
  // The OTA badge line, whenever it names a domain rather than the hotel
  // itself — "Expedia.com", "Booking.com". When the badge alt text is the
  // hotel's OWN name instead (Hilton's real card does this), the exact-match
  // check below catches it — this regex only needs the common case.
  const SITE = /\.(com|net|org)$/i;
  const SEP = /^[·•]$/;

  const out = [];
  for (const g of groups) {
    let name = '';
    let priceShown = null;
    let rating = null;
    let ratingCount = null;
    let starClass = null;
    const amenities = [];
    for (const raw of g.lines) {
      const l = raw.trim();
      if (!l || SEP.test(l)) continue;
      if (PRICE.test(l)) { priceShown = Number(l.replace(/[$,]/g, '')); continue; }
      const rm = l.match(RATING); if (rm) { rating = Number(rm[1]); continue; }
      const cm = l.match(REVIEWS); if (cm) { ratingCount = cm[1]; continue; }
      const sm = l.match(STAR); if (sm) { starClass = Number(sm[1]); continue; }
      if (SITE.test(l)) continue;
      if (!name) { name = l; continue; }
      if (l === name) continue;   // the OTA badge repeated the hotel's own name
      amenities.push(l);
    }
    if (name || priceShown != null) {
      out.push({
        url: '', name, kind: '', place: '', bedrooms: null, beds: null,
        // ── THE NUMBER CARRIES ITS OWN MEANING (2026-08-06, review board) ──
        // A Google hotel card quotes a NIGHTLY rate for one room — its own
        // control says "Nightly price with fees", and a live 4-night Santa Fe
        // search returned $125–$258 where a stay total would have been four
        // times that. The Airbnb/Vrbo card that shares this field quotes a STAY
        // TOTAL ("for 2 nights"), so one field held two different meanings and
        // the caller could not tell them apart. It mapped both into
        // `totalPrice`, and the per-person split then divided ONE ROOM FOR ONE
        // NIGHT across the whole party — "$389 ÷ 12 ≈ $32 a person for 3
        // nights" — under sources.totalPrice:'read'.
        //
        // Third instance of the same defect class in one day, after occupancy
        // (bed count read as capacity) and the Hotels door's dates. Same shape
        // every time: a number that means something other than what it is
        // stored as, wearing 'read' provenance.
        //
        // The rate is not suppressed — routed. `pricePerNight` already exists
        // and allIn computes rate × nights + fees, so the split becomes true.
        // (`fees` is host-typed and absent here; Google's figure already
        // includes fees, so nothing double-counts unless the host adds them.)
        priceBasis: 'night',
        priceShown, rating, ratingCount, starClass, amenities,
        // ── THE SAME GATE THE RENTAL PATH USES (2026-08-06, review board) ──
        // This stored `g.img` RAW while the Airbnb/Vrbo path one function down
        // runs the identical value through isAllowedMedia. The asymmetry was
        // not a judgement call, it was an omission, and the Liability seat
        // found what it costs: `lodgingOptions` is on the guest-published
        // whitelist (backend/app/routers/rsvp.py:105) and InviteV2 renders
        // photoList(o) straight to guests — so an image host that never
        // cleared the allowlist fires a request from EVERY GUEST'S BROWSER on
        // a public invite link, disclosing who is looking at a private guest
        // list and when, to a party that was never in the transaction.
        //
        // DELIBERATELY NOT WIDENING MEDIA_HOSTS to admit Google's CDN, which
        // was the obvious "fix" and is the wrong one for exactly that reason.
        // A hotel row therefore arrives without a photo, and the card already
        // has honest words for that — "no picture yet, this one's still real"
        // — plus a paste-your-own-photo path if the host wants one.
        photo: isAllowedMedia(g.img) ? String(g.img).trim() : '',
      });
    }
  }
  return out;
}

/**
 * THE ONE INTERPRETER.
 *
 * Both entry points land here: a pasted results page (tokenised above) and the
 * bookmarklet (which ships this exact shape, already grouped, so it can stay a
 * dumb collector — see lib/lodgingBookmarklet). Two copies of this reasoning
 * would drift the first time a platform changed a label, and the copy running in
 * the host's browser is the one we could never re-deploy.
 *
 * @param {Array<{url:string, lines:string[]}>} groups
 */
export function candidatesFromGroups(groups, hint) {
  const candidates = [];
  for (const { url, lines: raw, img } of (Array.isArray(groups) ? groups : [])) {
    if (!listingUrl(url, hint)) continue;
    // Collapse the accessibility duplicates ("8 beds" twice) while keeping order.
    const lines = [];
    for (const l of raw) { if (!CARD_NOISE.test(l) && lines[lines.length - 1] !== l) lines.push(l); }

    let kind = '', place = '';
    const typeIdx = lines.findIndex((l) => TYPE_LINE.test(l));
    if (typeIdx >= 0) {
      const m = lines[typeIdx].match(TYPE_LINE);
      kind = m[1]; place = m[2].trim();
    }
    // The NAME is the first substantial line after the type line that isn't a
    // count or a price. Airbnb writes it there; Vrbo puts it first, so a card
    // with no type line falls back to the first substantial line.
    const isFact = (l) => /^\$|\d+\s*(bed|bedroom|bath|guest)/i.test(l);
    // A PHOTO VIEWER IS NOT A DIFFERENT HOUSE (found in the host's own data,
    // 2026-07-28: seven of eight shortlist rows were named "Photo gallery for
    // Golden Crest"). Opening a listing's gallery keeps the listing URL and
    // swaps the title, so the right repair is to recover the property's name,
    // not to reject the row — the URL was always correct.
    const ungallery = ungalleryName;
    const name = ungallery(lines.slice(typeIdx + 1).find((l) => l.length > 3 && !isFact(l))
      || lines.find((l) => l.length > 3 && !isFact(l) && !TYPE_LINE.test(l))
      || '').slice(0, 70);

    // PRICE: cards show a strike-through original then the discounted figure
    // ("$1,997 $1,668"). The LAST one is what the platform is actually asking.
    // Named `priceShown`, never `total` — we did not see a checkout, and the
    // page's own "prices include all fees" claim is theirs, not ours to repeat.
    //
    // ── "PAY $0 TODAY" IS NOT A PRICE (real Santa Fe page, 2026-08-05) ───────
    // Taking the LAST money figure is right for the strike-through pair and
    // wrong the moment a card ends on Airbnb's part-payment badge: two of six
    // real cards carried "Pay $0 today" after their total, so a $2,180 house
    // and a $4,371 house both reached the shortlist priced at $0 — under every
    // budget, ahead of everything, and free-looking to the host. Every
    // synthetic fixture we ever wrote missed this; the live page had it twice.
    //
    // Drop the figures that are not what the stay costs — the deposit badge and
    // an outright $0 — then keep taking the last of what remains. If nothing
    // survives, the price is unknown, which the surface already says honestly
    // rather than guessing.
    //
    // ── AND VRBO SAYS IT IN PROSE (real Vrbo page, 2026-08-05) ──────────────
    // Vrbo writes "The current price is $1,705", and a discounted card carries
    // three money figures in this order: the SAVING ("Early booking $580 off"),
    // the OLD price ("The previous price was $1,850", then "$1,850" again), and
    // only last the price being asked. Last-wins survives that one, but a card
    // whose only money is a saving ("Early booking $145 off" — a real card on
    // this page) would have reported $145 as the cost of the stay.
    //
    // So: when the page says outright which figure is current, believe it.
    // Otherwise strip the figures that are demonstrably not the asking price —
    // the deposit badge, a saving, an explicitly previous price — and keep
    // taking the last of what remains. Nothing left means unknown, which the
    // surface says honestly rather than guessing.
    const joined = lines.join(' ');
    const current = joined.match(/current price is\s*\$([\d,]+)/i);
    const priceLine = joined
      .replace(/\bpay\s+\$[\d,]+\s+today\b/gi, ' ')
      .replace(/\$[\d,]+\s*off\b/gi, ' ')
      .replace(/previous price was\s*\$[\d,]+/gi, ' ');
    const money = (priceLine.match(/\$[\d,]+/g) || [])
      .map((m) => Number(m.replace(/[$,]/g, '')))
      .filter((n) => Number.isFinite(n) && n > 0);
    const priceShown = current ? Number(current[1].replace(/,/g, ''))
      : money.length ? money[money.length - 1] : null;

    candidates.push({
      url: listingUrl(url, hint) || url,
      name,
      kind,
      place,
      // Gated on BOTH paths (paste and bookmarklet) by the one media allowlist —
      // the paste path reads arbitrary HTML too, so it needs the same guard.
      photo: isAllowedMedia(img) ? String(img).trim() : '',
      bedrooms: numFrom(lines, /(\d+)\s*bedrooms?/i),
      beds: numFrom(lines, /(\d+)\s*beds?\b/i),
      baths: numFrom(lines, /(\d+(?:\.\d)?)\s*baths?\b/i),
      priceShown: Number.isFinite(priceShown) ? priceShown : null,
    });
  }

  // A card with neither a name nor a single fact is markup we misread — drop it
  // rather than offering the host a blank row.
  return candidates.filter((c) => c.name || c.bedrooms || c.beds || c.priceShown);
}

function platformOf(url) {
  if (/airbnb\./i.test(url)) return 'Airbnb';
  if (/vrbo\./i.test(url)) return 'Vrbo';
  if (/booking\./i.test(url)) return 'Booking.com';
  return null;
}

/**
 * Rank pasted candidates against what the event says the house needs.
 *
 * HONEST LIMITS, and they matter because this decides what the host looks at:
 *   · a results card carries bedrooms, beds and a price — NOT amenities. So a
 *     must-have like "hot tub" can only be judged from the NAME ("…Hot Tub!"),
 *     and absence of the word is NOT absence of the feature. Unmatched
 *     requirements are reported as `unknown`, never as failed.
 *   · the only hard filters are ones the card can actually answer: real beds for
 *     the party, and the budget the host set. Everything else informs the order.
 */
export function rankCandidates(candidates, event, opts) {
  const list = Array.isArray(candidates) ? candidates : [];
  const wants = mustHavesFor(event || {});
  const guests = Number((event && (event.guestCount || event.guests)) || 0) || 0;
  const budget = Number((opts && opts.budget) || 0) || 0;

  const scored = list.map((c) => {
    const hay = `${c.name || ''} ${c.kind || ''} ${c.place || ''}`;
    const matched = wants.filter((w) => w.match && w.match.test(hay)).map((w) => w.label);
    const unknown = wants.filter((w) => !(w.match && w.match.test(hay))).map((w) => w.label);

    // REAL BEDS, not headline capacity — the researched guidance this engine
    // already carries (book under stated capacity so nobody is on an air bed).
    const bedsShort = guests > 0 && c.beds != null && c.beds < guests;
    const overBudget = budget > 0 && c.priceShown != null && c.priceShown > budget;

    return {
      ...c,
      matched,
      unknown,
      clears: !bedsShort && !overBudget,
      why: bedsShort ? `${c.beds} beds for ${guests} — someone's on a sofa`
        : overBudget ? `$${c.priceShown.toLocaleString()} is over the $${budget.toLocaleString()} you set`
          : null,
      score: matched.length * 10 + (c.beds || 0) - (overBudget ? 100 : 0) - (bedsShort ? 100 : 0),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return { ranked: scored, clearing: scored.filter((c) => c.clears), considered: scored.length };
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
  // ── RESEARCHED ADDITIONS (2026-07-28, see GROUP_RENTAL_SOURCES) ─────────────
  // The event-permission gate is the highest-stakes item on this list: Airbnb's
  // own policy prohibits disruptive gatherings REGARDLESS OF SIZE and carves out
  // no exception for host approval, so booking a rental as a party or ceremony
  // venue is a live risk, not a formality.
  { id: 'eventok',  label: 'Gathering allowed in writing', search: null, match: /event(s)? (ok|allowed|welcome)|part(y|ies) (ok|allowed)|wedding|celebration(s)? welcome|gathering(s)? (ok|allowed)/i },
  // "Sleeps 14" routinely means sofa beds and air mattresses; the guidance is to
  // book at 70-80% of stated capacity so everyone gets a real bed.
  { id: 'realbeds', label: 'Real beds, not pull-outs', search: null, match: /real bed|king|queen|bunk|no (sofa|pull)/i },
  // One bathroom per two-to-three people for a large group; a ground-floor bed
  // AND bath is "the single most overlooked thing" in a multigenerational stay.
  { id: 'baths',    label: 'Enough bathrooms',      search: null, match: /(\d+(\.\d+)?)\s*(full\s*)?bath|ensuite|en-suite/i },
  { id: 'quiet',    label: 'A room to escape to',   search: null, match: /den|study|bonus room|finished basement|screened porch|sunroom/i },
  { id: 'wifi',     label: 'Wifi that holds a call',search: null, match: /wifi|wi-fi|fiber|gigabit|internet|workspace|desk/i },
];

/**
 * Sources behind the requirement vocabulary and the suggestions. Registered in
 * knowledge/groundingSources.js so the provenance is auditable in the admin.
 */
export const GROUP_RENTAL_SOURCES = {
  'airbnb-disturbance': {
    title: 'Community Disturbance Policy — parties, events and disruptive gatherings',
    publisher: 'Airbnb (platform policy)',
    url: 'https://www.airbnb.com/help/article/2704/party-and-events-policy',
    fetched: '2026-07-28',
    tier: 'cited',
    note: 'Prohibits "disruptive gatherings and other community disturbances, regardless of size" and "open-invite gatherings"; names excessive noise, trash, trespassing, smoking, parking nuisances and vandalism as indicators; enforcement runs to "account or listing suspension or removal". NO exception for host-approved events — which is why a rental booked as a ceremony or party venue needs written permission from the property host, and why the plan should say so.',
  },
  'multigen-rental-fit': {
    title: 'Choosing a group rental that works for a multi-generational party',
    publisher: 'Wandering Educators (travel guidance)',
    url: 'https://www.wanderingeducators.com/best/traveling/group-vacation-rentals-multi-generational-travel-how-to-choose-one-that-actually-works',
    fetched: '2026-07-28',
    tier: 'researched',
    note: 'Checkable attributes for a group stay: "one bathroom per two-to-three people"; "a ground-floor bedroom and bathroom" / "a primary suite on the entry level"; whether "sleeps 14" means real beds "or a lot of sofa beds and air mattresses"; kitchen "counter space, a full-size refrigerator", "enough plates and chairs that everyone sits down at once"; "one big gathering space, plus somewhere to escape to"; "which rooms have doors that close"; "minimal stairs to the main living space".',
  },
  'retreat-rental-fit': {
    title: 'What a corporate offsite actually needs from a rental',
    publisher: 'Industry guidance (offsite/retreat venue sourcing)',
    tier: 'established-consensus',
    note: 'Bandwidth for "20+ people on simultaneous video calls, screen sharing and cloud collaboration", verified rather than taken from "high-speed" marketing copy, often with a backup connection; "multiple rooms for breakouts" and screens; book at "70-80% of stated capacity so everyone gets actual beds instead of pullouts"; extras beyond the nightly rate "can add 40-60% to initial venue quotes" — the same reason fees belong in our per-person number.',
  },
};

const mustHaveById = (id) => LODGING_MUST_HAVES.find((m) => m.id === String(id || '').trim()) || null;

/**
 * WHAT SHE ALREADY TOLD US SHE WANTED (host, 2026-08-05: "did we add that the
 * 80th birthday was for resort spa?").
 *
 * She typed "Santa Fe, NM resort spa". The parser took the town and dropped the
 * rest, so the requirement list proposed six things she never mentioned and not
 * the ONE she did — while this module holds a hot-tub filter VERIFIED against
 * Airbnb's own search. The words were heard, understood, and thrown away one
 * step before the only place they could have been used.
 *
 * These are the same `match` regexes the ranker already scores pasted listings
 * with, pointed at the host's own sentence. Nothing is invented: an id only
 * appears here if her words matched the vocabulary this file already defines,
 * and it arrives as a PROPOSAL like every other suggested must-have — the
 * moment she edits the list, hers wins outright.
 */
/**
 * THE KIND OF PLACE SHE NAMED, not a feature inside one (host correction,
 * 2026-08-05: "resort spa is a type of property not a hot tub").
 *
 * A first pass read "Santa Fe, NM resort spa" as a request for a hot tub,
 * because the hot-tub matcher lists "spa" — correct when scoring a LISTING's
 * prose, wrong when reading a host's sentence, where "resort spa" names the
 * sort of place she wants to sleep in. That distinction decides which door she
 * should be walking through: a resort is the hotels search, not a whole-home
 * rental with an amenity checkbox.
 *
 * Returns the phrase VERBATIM so the surface can repeat her own words back and
 * carry them into the hotel query. Never mapped onto a filter we cannot honour.
 */
// "Resort spa retreat" and "wellness retreat" (host, 2026-08-05: "a resort
// spa retreat is a type of property that caters to health and wellness") —
// the style vocabulary knew "resort spa" but not the trailing "retreat" or
// the "wellness" variant, so a full "resort spa retreat" only matched its
// first two words and left "retreat" as leftover text for the amenity
// matcher to (harmlessly, but incompletely) ignore.
const STAY_STYLE = /\b((?:all[- ]inclusive|boutique|luxury|historic|mountain|desert|beach(?:front)?|ski|golf|dude|wellness)?\s*(?:resort\s*(?:and\s*)?spa(?:\s*retreat)?|spa\s*resort|spa\s*retreat|wellness\s*retreat|resort(?:\s*retreat)?|lodge|inn|ranch|hacienda|villa|casita|bed\s*(?:and|&)\s*breakfast|b&b|guest\s*house|hotel))\b/i;

export function heardStayStyle(text) {
  const m = String(text || '').trim().match(STAY_STYLE);
  return m ? m[1].trim().replace(/\s+/g, ' ').toLowerCase() : null;
}

export function heardMustHaves(text) {
  // A stay style is consumed FIRST so the words that name a kind of place can
  // never be re-read as a request for a feature: "resort spa" leaves nothing
  // behind for the hot-tub matcher, while "a house with a hot tub" is untouched.
  const t = String(text || '').replace(STAY_STYLE, ' ').trim();
  if (!t) return [];
  // TWO GUARDS, both learned the hard way on real sentences.
  //
  // SCOPE: only the requirements carrying a VERIFIED platform filter. Those
  // regexes are concrete amenity nouns (hot tub / jacuzzi / spa, pool, pets);
  // the rest were written to score a LISTING's prose, where "family" hints
  // kid-ready — pointed at a host's sentence, "family reunion in Deep Creek
  // Lake" asked for a crib. Reading a request is a stricter job than scoring a
  // description, and these are also exactly the ids that can change the search.
  //
  // BOUNDARY: anchored so an amenity is a word, not a substring — "carpet" is
  // not a request to bring the dog.
  return LODGING_MUST_HAVES
    .filter((m) => m.search && m.match)
    .filter((m) => { try { return new RegExp(`\\b(?:${m.match.source})`, 'i').test(t); } catch { return false; } })
    .map((m) => m.id);
}

/**
 * WHAT THIS EVENT NEEDS FROM A HOUSE (host directive 2026-07-28: "app should
 * default to the options/amenities needed for event from intelligence engine").
 *
 * Propose-don't-ask, applied to requirements: rather than ten empty chips, the
 * engine reads the event and says which ones this gathering actually needs, with
 * the reason attached. Every suggestion is earned by a fact — the event's type,
 * its roster, its span — and each carries the source that makes it more than an
 * opinion. The host can drop any of them; the moment they touch the list, theirs
 * wins outright.
 *
 * @returns {Array<{id, label, why, source}>}
 */
export function suggestedMustHaves(event) {
  const ev = event || {};
  const type = String(ev.type || '').toLowerCase();
  const roster = Array.isArray(ev.guests) ? ev.guests : [];
  const guests = Number(ev.guestCount) || Number(ev.guestEstimate) || roster.length || 0;
  const nights = spanNights(ev);
  const out = [];
  const add = (id, why, source) => {
    const m = mustHaveById(id);
    if (m && !out.some((x) => x.id === id)) out.push({ id, label: m.label, why, source });
  };

  // A ROOM BLOCK IS NOT A SHARED HOUSE (host, 2026-08-05: testing the Hotels
  // door for a Santa Fe resort spa birthday surfaced "Real beds, not
  // pull-outs", "Enough bathrooms" and "Washer & dryer" as suggested musts —
  // every one of them a ONE-SHARED-RENTAL-HOUSE concern (source:
  // multigen-rental-fit) applied to a hotel stay where each guest has their
  // own room and bath. The app already asks this exact question and already
  // has the answer — kitchenSignal() reads `foodChoices.dest_lodging`, "How
  // are guests staying?" — so this reads the SAME signal rather than a
  // second one. Only gates when the host has POSITIVELY said hotel/room
  // block; unknown or "renting a house" still gets the rental defaults, same
  // propose-don't-ask stance as everywhere else in this file.
  let kitchen = null;
  try { kitchen = kitchenSignal(ev); } catch { kitchen = null; }
  const isHotelStay = !!kitchen && kitchen.value === false;

  // HER OWN WORDS COME FIRST. `lodgingWants` is what she said at intake, matched
  // against this file's own vocabulary — a stronger signal than anything we infer
  // from the event's shape, so it leads the list and says plainly where it came
  // from rather than dressing itself up as a finding.
  for (const id of (Array.isArray(ev.lodgingWants) ? ev.lodgingWants : [])) {
    const m = mustHaveById(id);
    if (m) add(id, `You said so when you started this — ${m.label.toLowerCase()}.`, null);
  }

  // THE PERMISSION GATE — anything that reads as a party or a ceremony. Also
  // a rental-specific concern: a hotel books its own event space through its
  // own process, not Airbnb's community-disturbance policy.
  if (!isHotelStay && /wedding|vow|quince|sweet 16|engagement|bachelor|bachelorette|reception|party|reunion|anniversary|retirement|graduation|shower/.test(type)) {
    add('eventok', 'A rental is a home, not a venue — the platform bans disruptive gatherings regardless of size and makes no exception for host approval, so get the yes in writing before you book.', 'airbnb-disturbance');
  }
  // A GROUP SLEEPING SOMEWHERE — real beds and enough bathrooms. Meaningless
  // once every guest has their own hotel room and bath.
  if (!isHotelStay && guests >= 6 && nights >= 1) {
    add('realbeds', `Sleeping ${guests} on paper often means sofa beds and air mattresses — the guidance is to book under the headline capacity so everyone gets a real bed.`, 'multigen-rental-fit');
    add('baths', `One bathroom per two or three people is the working ratio; ${guests} people sharing one is the morning everybody remembers.`, 'multigen-rental-fit');
  }
  // WHO IS ACTUALLY COMING — the roster decides these, not the event type.
  // Step-free access and kid-readiness are real regardless of house or hotel.
  const access = roster.filter((g) => g && /wheelchair|step-free|stairs|mobility|walker|cane|elder/i.test(String(g.needs || ''))).length;
  if (access > 0) add('stepfree', `${access === 1 ? 'Someone' : access + ' people'} asked about stairs — a ground-floor bed and bath is the most overlooked thing in a group house.`, 'multigen-rental-fit');
  const kids = roster.reduce((n, g) => n + (Number(g && g.kids) || 0), 0) || Number(ev.kidsCount) || 0;
  if (kids > 0) add('kids', `${kids} ${kids === 1 ? 'child' : 'children'} coming — cribs, a fence and doors that close matter more than square footage.`, 'multigen-rental-fit');
  // MULTI-DAY UNDER ONE ROOF — somewhere to be together, and somewhere not
  // to be. A hotel already has a lobby/bar for "together" and a door that
  // closes for "not together"; laundry is the hotel's problem, not the host's.
  if (!isHotelStay && nights >= 2) {
    add('bigtable', 'More than one night together means at least one meal where everyone sits down at once.', 'multigen-rental-fit');
    add('quiet', 'A few days under one roof needs somewhere to escape to as much as it needs the big room.', 'multigen-rental-fit');
    add('laundry', 'Past a couple of nights, laundry stops being a luxury.', 'multigen-rental-fit');
  }
  // WORKING EVENTS — the connection is the venue.
  if (/retreat|board|conference|meeting|offsite/.test(type)) {
    add('wifi', 'Confirm the actual bandwidth rather than the word "high-speed" — a room of people on calls is a different load, and a backup connection is normal now.', 'retreat-rental-fit');
    add('quiet', 'Sessions need breakout rooms, not one big table.', 'retreat-rental-fit');
  }
  // TRAVELLING IN — cars have to land somewhere.
  if (ev.isDestination || guests >= 8) {
    add('parking', `${guests >= 8 ? 'A group this size' : 'People travelling in'} arrives in several cars, and a one-car driveway becomes the neighbours' problem.`, 'airbnb-disturbance');
  }
  return out;
}

/**
 * The requirement list in force: the host's own once they have touched it, else
 * the engine's proposal. `basis` says which, so a surface can present a
 * proposal as a proposal.
 */
export function mustHavesFor(event, opts) {
  const own = Array.isArray(event && event.lodgingMustHaves) ? event.lodgingMustHaves : null;
  if (own) return own.map(mustHaveById).filter(Boolean);
  if (opts && opts.hostOnly) return [];
  return suggestedMustHaves(event).map((sug) => mustHaveById(sug.id)).filter(Boolean);
}

/** 'host' once they have edited the list, otherwise 'suggested'. */
export function mustHaveBasis(event) {
  return Array.isArray(event && event.lodgingMustHaves) ? 'host' : 'suggested';
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
/**
 * WHY THERE ARE NO SEARCHES YET, or null when there are.
 *
 * `lodgingSearchLinks` returns [] with no town, which is correct - you cannot
 * honestly search a place nobody has named. But the surface then rendered NOTHING
 * (HostShellV2 `if (!links.length) return null`), so a host planning "a destination
 * 80th, ten of us, June 17-21" with the town still open got no lodging help at all -
 * and the town was the very thing they were trying to decide.
 *
 * The app is not searching on the host's behalf either way. It builds the query;
 * the host runs it. This just names the one input still missing, and says that
 * everything else is already in hand.
 */
export function lodgingSearchBlocked(event) {
  const ev = event || {};
  // Only a destination event owes the host a lodging search.
  if (ev.isDestination !== true) return null;
  if (lodgingSearchLinks(ev).length > 0) return null;

  const start = String(ev.date || '').slice(0, 10);
  const end = String(ev.endDate || '').slice(0, 10);
  const guests = Number(ev.guestCount) || Number(ev.guestEstimate) || 0;
  // Host language, not ISO. The first version printed "2028-06-17 to 2028-06-21"
  // at a host who has never typed a date that way.
  const nice = niceDay;
  const inHand = [
    // EN DASH, matching lodgingSearchLinks' `said[]` one screen later. The two
    // producers rendered the same span with different characters — "Jun 17-Jun
    // 21" here, "Jun 17–Jun 21" there — which is the kind of drift that only
    // shows when you walk the workflow end to end. One span, one dash.
    start && end ? `${nice(start)}–${nice(end)}` : (start ? nice(start) : null),
    guests ? `${guests} guests` : null,
  ].filter(Boolean);

  return {
    reason: 'no-town',
    label: 'Name the town and the searches open up',
    // Never claims to know the answer - names the one gap and what is already held.
    detail: inHand.length
      ? `Airbnb, Vrbo and hotel searches all need a place. ${inHand.join(' and ')} are already filled in.`
      : 'Airbnb, Vrbo and hotel searches all need a place.',
    route: { tab: 'Event Details', focusField: 'event-venue' },
  };
}

export function lodgingSearchLinks(event) {
  const ev = event || {};
  const vf = venueFor(ev);
  const place = [vf.city, vf.state].filter(Boolean).join(', ');
  if (!place) return [];                       // no town, no honest search

  const start = /^\d{4}-\d{2}-\d{2}/.test(String(ev.date || '')) ? String(ev.date).slice(0, 10) : null;
  const end = (() => {
    // A STAY IS AT LEAST A NIGHT (sim drive 2026-08-04): a single-day event
    // produced checkin==checkout — a zero-night search both platforms reject —
    // and the copy read "Jun 20–Jun 20". Anyone sleeping over sleeps INTO the
    // next day, so a same-day span searches one night, and the applied-copy
    // shows the same span the URL carries (never two different stories).
    const e = spanEnd(ev);
    const iso = /^\d{4}-\d{2}-\d{2}/.test(String(e || '')) ? String(e).slice(0, 10) : null;
    if (!start) return iso;
    if (iso && iso !== start) return iso;
    const d = new Date(start + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const guests = Number(ev.guestCount) || Number(ev.guestEstimate) || (Array.isArray(ev.guests) ? ev.guests.length : 0) || null;
  const budget = Number(ev.totalBudget) > 0 ? Math.round(Number(ev.totalBudget)) : null;

  // ── EACH DOOR SAYS WHAT ITS OWN URL CARRIES (2026-08-06) ───────────────────
  // One shared `said` list used to be handed to all three doors under the copy
  // "Opens with your own answers already in it — …". It was not true of any of
  // them. Only Airbnb's URL takes the budget (`price_max`) and the must-have
  // filters; Vrbo's takes destination, dates and adults and nothing else; the
  // style rides the Google query alone; and until this same commit the Hotels
  // door carried neither the dates nor the party at all.
  //
  // An overclaim here is not cosmetic. The line's whole job is to tell the host
  // she does not need to re-enter her answers — a host who believes "under
  // $3,000" reached Vrbo stops checking, and the door quietly shows her houses
  // at any price. So each door now states its own truth, built from the params
  // that door actually sets rather than from one list written once.
  const dateSaid = start && end ? `${niceDay(start)}–${niceDay(end)}` : null;
  const guestSaid = guests ? `${guests} guests` : null;
  const budgetSaid = budget ? `under $${budget.toLocaleString()}` : null;

  const musts = mustHavesFor(ev);
  const mustSaid = musts.filter((m) => m.search).map((m) => m.label.toLowerCase());

  // Airbnb: checkin / checkout / adults / price_max / the must-have filters,
  // with the town in the path slug.
  const said = [place, dateSaid, guestSaid, budgetSaid, ...mustSaid].filter(Boolean);
  // Vrbo: destination / startDate / endDate / adults. No budget, no filters.
  const saidVrbo = [place, dateSaid, guestSaid].filter(Boolean);
  const ab = new URLSearchParams();
  if (start) ab.set('checkin', start);
  if (end) ab.set('checkout', end);
  // Airbnb's own search stops at 16 guests — adults=40 lands on an error page
  // or a silent clamp. Send the most the platform accepts; the applied-copy
  // (`said`) keeps the REAL count, because that line is ours to say honestly.
  if (guests) ab.set('adults', String(Math.min(guests, 16)));
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

  // ── WHY VRBO'S LINK USED TO BE DIFFERENT (2026-07-28, REVERSED 2026-08-03) ──
  // Kept because the reasoning is still the reasoning; only the decision changed.
  // See the note on the vrbo link below for who reversed it and why.
  // Airbnb's terms carry no deep-link prohibition; Vrbo's §2 does, verbatim:
  // "deep link to any part of our Service". We were emitting a constructed URL
  // into a non-homepage path with parameters we chose — if "deep link" means
  // anything it means that, and we are the party who read the clause and shipped
  // it anyway. (The clause is widely regarded as unenforceable post-Ticketmaster
  // v. Tickets.com and is near-universally violated; that is a reason not to
  // panic, not a reason to be the one violating it by construction.)
  //
  // The proportionate answer is not to drop Vrbo — hosts genuinely use it, and
  // removing it would harm them for our comfort. It is to send them to the front
  // door with their own answers in hand to paste. She loses a few seconds; we
  // stop violating the one clause we violate by construction rather than by
  // interpretation. Treating different terms differently is what reading them is
  // for. `criteria` is rendered for the host to copy.
  // HOTELS, not just rentals. The lodging question the playbook asks
  // (`dest_lodging`) offers room blocks as three of its four options, and the food
  // plan now branches on whether there is a kitchen - so a host choosing the HOTEL
  // path had no way out of the app at all. Sent through a general search entry
  // point rather than any chain's booking surface: same construct-the-query,
  // host-runs-it rule as the two below, and no platform's terms to read.
  // A FOURTH PRODUCER, and the sneakiest one (2026-08-03). This string is
  // encoded into an href, so the ISO sweep whitelisted it as machine-facing —
  // but Google echoes the query verbatim into its own search box, so the host
  // READS it the moment the door opens. The `href` exemption exists for
  // parameters a platform parses (Airbnb's `checkin=`), not for prose that
  // happens to travel inside a URL.
  //
  // ── THE CLAIM THAT USED TO SIT HERE WAS FALSE (corrected 2026-08-06) ───────
  // It read: "Google parses 'Jun 17-Jun 21' perfectly well, so there is nothing
  // to trade away." Driven live: it does not. Google takes the PLACE out of `q`
  // and discards the dates and the party, then falls back to its own defaults —
  // tomorrow, one night, two guests. So the host arrived at a page of one-night,
  // two-guest, wrong-month prices, and extractHotelCandidates() would store one
  // of those as `priceShown`. Same defect class as the occupancy/capacity bug:
  // a number carrying the page's authority while meaning something else.
  //
  // The dates and the party now ride `ts`, the one parameter Google actually
  // parses — see googleTravelTs.js for the decoded shape and what was proven
  // live. `ts` is null when the trip cannot be carried truthfully (no dates, or
  // a stay already under way, which Google silently ignores); in that case the
  // door still opens on the place, and `applied` below does not claim otherwise.
  //
  // The prose dates came OUT of `q` in the same move. With `ts` carrying them,
  // leaving "Jun 17–Jun 21" in the search box would tell the host one story
  // while the date pickers beside it told another.
  //
  // SEARCH FOR THE KIND OF PLACE SHE ASKED FOR. When the host named a stay
  // style ("resort spa"), it leads the hotel query — searching "hotels in Santa
  // Fe" for someone who said "resort spa" hands back the wrong 115 results.
  const style = String((ev.lodgingStyle || '')).trim();
  const hotelQ = [style || 'hotels', 'in', place].join(' ');
  const hotelTs = googleTravelTs({ place, start, end, guests });
  const hotelHref = `https://www.google.com/travel/search?q=${encodeURIComponent(hotelQ)}`
    + (hotelTs ? `&ts=${hotelTs}` : '');
  // The style is in `q`; the dates and party are in `ts` — and ONLY when `ts`
  // was actually built. No budget and no must-have filters ride this door.
  const saidHotels = [
    style || null,
    place,
    hotelTs ? dateSaid : null,
    hotelTs ? guestSaid : null,
  ].filter(Boolean);

  // `carriesDates` is what the SURFACES branch on. HostShellV2 had to hard-code
  // "Hotels open at the town only" on 2026-08-05 because that was then true;
  // now that it can be false, no surface should be deciding it from the door's
  // id. It is one boolean, set by the code that builds each URL.
  const dated = !!(start && end);
  return [
    { id: 'airbnb', label: 'Search Airbnb', href: `https://www.airbnb.com/s/${encodeURIComponent(abSlug)}/homes?${ab.toString()}`, applied: said, carriesDates: dated },
    // ── RULING REVERSED BY THE HOST, 2026-08-03 ──────────────────────────────
    // Vrbo now gets the SAME constructed search Airbnb gets: destination,
    // startDate, endDate, adults — all the host's own answers, carried into
    // their own browser.
    //
    // What changed is the decision, not the facts. The clause below is still
    // real and still says what it said. The host was shown it twice, in full,
    // and chose to build the link anyway: hosts genuinely use Vrbo, sending
    // them to a bare homepage with a string to re-type is a worse product, and
    // the clause is widely regarded as unenforceable post-Ticketmaster v.
    // Tickets.com. That is the host's call to make, and it is recorded here as
    // theirs rather than dressed up as a technical finding.
    //
    // `criteria` stays. It is no longer the only path, but a host who prefers
    // to type into Vrbo's own picker still has the words, and it costs nothing.
    { id: 'vrbo', label: 'Open Vrbo', href: `https://www.vrbo.com/search?${vr.toString()}`, applied: saidVrbo,
      // Host language: `criteria` is what she READS. The URL above carries ISO
      // because Vrbo parses it; that split is exactly what the ISO gate encodes.
      criteria: [place, start && end ? `${niceDay(start)}–${niceDay(end)}` : null, guests ? `${guests} guests` : null].filter(Boolean).join(' · '),
      carriesDates: dated },
    { id: 'hotels', label: 'Search hotels', href: hotelHref, applied: saidHotels, carriesDates: !!hotelTs },
  ];
}

/**
 * What EVERY door in the list actually carries — the intersection, not the
 * union.
 *
 * One line sits under all three doors saying "opens with your own answers
 * already in it". Rendering `links[0].applied` there spoke for Airbnb and put
 * its budget and must-have filters into a sentence that also covered Vrbo and
 * Google, neither of which takes them. The intersection is the only list that
 * sentence can honestly show. Underclaiming for Airbnb is the safe direction:
 * a host who re-checks a filter loses a moment, one who trusts a filter that
 * was never sent gets the wrong houses.
 */
export function appliedByEveryDoor(links) {
  const lists = (Array.isArray(links) ? links : [])
    .map((l) => (l && Array.isArray(l.applied) ? l.applied : []));
  if (!lists.length) return [];
  return lists[0].filter((item) => lists.every((l) => l.includes(item)));
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
    // Compare on what it actually costs, fees and all — a cheaper sticker with a
    // $600 cleaning fee is not the cheaper house.
    const total = o.allIn != null ? o.allIn : null;
    if (total != null) {
      const cheapest = Math.min(...options.map((x) => (x.allIn != null ? x.allIn : Infinity)));
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
    const hay = optionHay(o);
    const met = [], missing = [];
    for (const m of musts) (m.match.test(hay) ? met : missing).push(m.label.toLowerCase());
    // Cap the LISTS, not just the reason count — the run-on was inside a single
    // reason ("has dock, hot tub, pool, table for everyone, washer & dryer…"),
    // so capping the outer array changed nothing (host report 2026-07-28).
    const brief = (xs) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more`);
    if (met.length) { score += met.length * 2; reasons.push(`has ${brief(met)}`); }
    if (missing.length) { score -= missing.length; reasons.push(`doesn't mention ${brief(missing)}`); }

    // WHO IS COMING — these only speak when the roster actually says so.
    if (needsAccess > 0 && o.notes) {
      if (/step-free|ground floor|single (level|story|storey)|no stairs|elevator|accessible/i.test(o.notes)) {
        score += 2; reasons.push(`step-free — ${needsAccess === 1 ? 'someone' : needsAccess + ' people'} asked for that`);
      }
    }
    if (kids > 0 && o.notes && /crib|pack.?n.?play|fenced|pool fence|kid|family/i.test(o.notes)) {
      score += 1; reasons.push(`set up for kids — ${kids} coming`);
    }

    // met/missing are computed above and were thrown away at the return, so
    // "Fits 6 of your 6 musts" — the line D6/W9 leads its card with — had no
    // source. These are COUNTS of the host's own stated requirements matched
    // against what the host typed about the option; no listing was fetched.
    return { id: o.id, label: o.label, score, fits, reasons, met, missing,
      mustsMet: met.length, mustsTotal: met.length + missing.length };
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

/**
 * WHAT THE STAY BLOCK ALREADY KNOWS (DIFM audit, host 2026-07-28).
 *
 * The "The stay" form asks the host to type a place name, a nightly rate and a
 * booking code — for a house they have ALREADY put on the shortlist and marked
 * as the pick. That is the app asking for its own data back. Same for "Backup
 * place": the runner-up in the ranking IS the backup.
 *
 * Returns a proposal, never a write. `from` names where each value came from so
 * the surface can show it as ours rather than as fact.
 */
/**
 * WHAT THE CHOSEN HOUSE COSTS THE PLAN (review board, 2026-07-28).
 *
 * The board's finding, verified by grep: `lodgingOptions` was read by NOTHING —
 * not travelPlan, not hostSpending, not surfaceRegistry, not phaseProgress. The
 * host could shortlist eighteen houses, pick a $6,400 one, and read a toast
 * saying "the plan reads it now" while the budget stayed at zero. The intake was
 * a pipe into a display component.
 *
 * This is the outlet. It reports the ALL-IN cost of the chosen option — sticker
 * plus fees, the same `allIn` the recommendation already compares on, because a
 * cheaper listing with a $600 cleaning fee is not the cheaper house.
 *
 * HONEST LIMITS, because this feeds money:
 *   · only the CHOSEN option counts. Shortlisted-but-not-picked is not a
 *     commitment and must never move the budget.
 *   · a chosen option with no price returns 0, not a guess. The host sees "I
 *     couldn't weigh what it costs" elsewhere; inventing a number here would
 *     contradict that to the penny.
 *   · this is a COMMITMENT, not spend — the same class as vendorOwed. If the
 *     host ALSO types the rental as a budget line by hand it will double-count,
 *     exactly as vendor balances can. That is a known shape in this engine, not
 *     a new one (see hostSpending's C1 note), and the fix if it bites is
 *     de-duplication at the source, not silently dropping the term.
 */
// ─── "THAT IS THE SEARCH LINK, NOT A HOUSE" (2026-08-03) ───────────────────
// Reported live: pasting the very URL this app builds —
//   airbnb.com/s/Santa-Fe--NM/homes?checkin=…&adults=10
// answered "Nothing readable in that". True, and useless: the extractor only
// recognises LISTING urls (/rooms/<id>, vrbo.com/<id>), and a search page is
// not one. But the host did not invent that link — WE handed it to them, so
// answering as though they pasted junk is our defect, not their mistake.
//
// A search URL carries no listing facts at all: names, bedrooms and prices are
// rendered by the platform in the browser, which is exactly why the round trip
// exists. So this cannot be "read" — it can only be named, precisely, with the
// next real step attached.
export function looksLikeSearchUrl(text) {
  const t = String(text || '').trim();
  if (!t || /\s/.test(t)) return null;          // prose or a pasted page, not a bare url
  if (/airbnb\.[a-z.]+\/s\//i.test(t)) return 'airbnb';
  if (/vrbo\.com\/search/i.test(t)) return 'vrbo';
  if (/google\.[a-z.]+\/travel\/search/i.test(t)) return 'hotels';
  return null;
}

// HONEST COPY, NOT A SILENT DEAD END (host, 2026-08-05). extractListingCandidates
// only recognizes airbnb.com/rooms/N and vrbo.com/N card links — the Hotels
// door has no card parser at all (there is no verified Google Hotels fixture
// to build one against, the same discipline that gates every OTHER unverified
// filter in this file). A host who follows the paste box's own instruction —
// "Paste the whole results page and every card on it is read right here" —
// from the Hotels door gets zero candidates back, and looksLikeSearchUrl()
// only catches a BARE search link, not a full pasted page, so the failure
// fell through to a generic "tap Share, then Copy Link, try again" message
// that implies retrying would work. It would not. This checks the pasted
// TEXT itself (any shape, not just a bare url) for Google Travel/Hotels
// markers, so the caller can say the true thing instead.
export function looksLikeHotelsResultsPage(text) {
  const t = String(text || '');
  // The door's own href is absolute (google.com/travel/search); a card link
  // ON that results page is typically relative (/travel/hotels/entity/…),
  // so the domain prefix can't be required for both. lh3.googleusercontent.com
  // is Google's own photo host and a second, independent signal — either one
  // firing is enough, neither appears on an Airbnb or Vrbo page.
  return /travel\/(search|hotels)\b/i.test(t) || /lh3\.googleusercontent\.com/i.test(t);
}

// ─── ONE HOTEL'S PAGE IS NOT A RESULTS PAGE (2026-08-06, review board) ──────
// Two board seats found the same shipped defect and one reproduced it: a pasted
// property DETAIL view satisfies looksLikeHotelsResultsPage above (it carries
// both `travel/hotels` and lh3.googleusercontent.com), so it fell into
// extractHotelCandidates — which groups on the <a> BOUNDARY and therefore
// discards everything before the first anchor. The hotel's name, price and
// rating all sit above the Visit-site button, so they were thrown away and the
// first text AFTER that anchor became the name. The row committed as:
//
//   { name: 'Visit site', priceShown: null, amenities: ['Hot tub', 'Spa',
//     'Guests loved the pools. Check-in 4pm. Cancellation policy varies…'] }
//
// — a shortlist row literally called "Visit site", with review prose stored as
// amenities, carrying sources:{label:'read', amenities:'read'}. Fabricated
// provenance is the one thing UX_08 forbids outright, and it shipped.
//
// WHY THIS MATCHES ON TEXT AND NOT ON MARKUP. The obvious discriminators were
// measured live and all three failed:
//   · `/aclk` anchor count — BOTH pages carry them (9 on the list, 67 on the
//     detail view). Not a discriminator.
//   · "exactly one absolute non-Google anchor" (proposed by a board seat) —
//     the detail page carries 27. Measured; the proposal was wrong.
//   · entity-href count — real (0 vs 37), but hrefs are the part of a paste
//     least likely to survive: a plain-text copy drops them entirely.
//
// The tab strip is VISIBLE TEXT. Every paste carries it, HTML or plain, and it
// appears on the detail view and never on the results list. Two independent
// markers are required so an ordinary listing that happens to say "Overview"
// cannot trip it.
const DETAIL_TABS = ['overview', 'prices', 'reviews', 'location', 'about', 'photos'];

// ─── THE SAME DEFECT, IN URL FORM (2026-08-07) ─────────────────────────────
// The tab strip above is VISIBLE TEXT, and a pasted URL has none — so the
// 2026-08-06 guard covered the pasted PAGE and left the pasted LINK uncovered.
// Driven through the predicates: a bare `/travel/hotels/entity/<id>` URL
// scored looksLikeHotelsResultsPage true, looksLikeHotelDetailPage false, and
// extracted zero candidates — so the surface told the host "I couldn't find
// any hotels on that page — copy the whole list", while the host was standing
// on ONE hotel's page. That instruction can never succeed there; it is a loop.
//
// It does NOT manufacture a "Visit site" row the way the pasted page did —
// extractHotelCandidates groups on the <a> boundary and a bare URL has no
// anchors, so it returns empty. The damage is the wrong instruction, not
// fabricated provenance.
//
// Anchored ^…$ so the whole payload must BE the link. A results page that
// happens to link one entity cannot trip it — the captured Santa Fe results
// page carries zero entity hrefs and the detail view carries 37 (measured
// 2026-08-06), but hrefs are the part of a paste least likely to survive, so
// this is deliberately not a count over page text.
const HOTEL_ENTITY_URL = /^https?:\/\/[^\s]*\/travel\/hotels\/entity\/[^\s]*$/i;

export function looksLikeHotelDetailPage(text) {
  const t = String(text || '');
  if (HOTEL_ENTITY_URL.test(t.trim())) return true;
  if (!looksLikeHotelsResultsPage(t)) return false;
  const low = t.toLowerCase();
  const tabs = DETAIL_TABS.filter((w) => new RegExp(`(^|[>\\s])${w}([<\\s]|$)`, 'i').test(low)).length;
  // The whole strip, or most of it plus the control that only a property page
  // carries. "Visit site" is the label on the one real anchor a detail view
  // has; a results page carried zero of them (measured live, twice).
  return tabs >= 5 || (tabs >= 3 && /visit site/i.test(low));
}

// ─── A NAME, NOT "OPTION 1" (lodging listing research, 2026-08-01) ─────────
// The paste flow's weakest moment is the instant after it works: a bare link
// carries no name, so a real house landed on the shortlist called "Option 1"
// and the host had no reason to believe anything had happened.
//
// Airbnb's own card solves this and the research flags it as a gift to us:
// their title is TYPE + PLACE — "Apartment in San Juan", "Room in Southeast
// Washington" — and the listing's marketing headline is demoted to the detail
// page. It is "cheaper to extract AND more scannable than whatever the host
// pasted". Our extractor already recovers `kind` and `place` off a results card.
//
// Order: what the host typed wins; then what the page said; then type+place;
// then the platform and nothing else. It never invents a place — an unnamed
// listing on an unknown platform stays unnamed rather than being given a
// plausible label.
export function lodgingTitleFor(cand) {
  const c = cand || {};
  const typed = String(c.label || '').trim();
  if (typed) return typed;
  const name = String(c.name || '').trim();
  if (name) return name;

  const kind = String(c.kind || '').trim();
  const place = String(c.place || '').trim();
  if (kind && place) return `${kind[0].toUpperCase()}${kind.slice(1)} in ${place}`;
  if (place) return `Place in ${place}`;
  if (kind) return `${kind[0].toUpperCase()}${kind.slice(1)}`;

  const platform = c.platform || lodgingPlatformFor(c.url);
  if (platform === 'airbnb') return 'Airbnb listing';
  if (platform === 'vrbo') return 'Vrbo listing';
  return '';   // nothing known — the surface must ask, not guess
}

// lodgingTitleFor's own last resort — "Airbnb listing" / "Vrbo listing" — is
// a platform-generic label WE wrote in, not a name read off the page. A
// caller crediting `lodgingTitleFor(c)` truthy as `sources.label: 'read'`
// (LodgingCockpit.jsx, found live 2026-08-05: a paste with no real names
// still showed "Name — read from the link" on every card) claims provenance
// for a value we made up ourselves. This mirrors lodgingTitleFor's own
// precedence but stops before the platform fallback, so it is true exactly
// when a REAL name was read or typed.
export function lodgingTitleIsReal(cand) {
  const c = cand || {};
  if (String(c.label || '').trim()) return true;
  if (String(c.name || '').trim()) return true;
  if (String(c.kind || '').trim() || String(c.place || '').trim()) return true;
  return false;
}

// ─── IT WENT WRONG, AND IT IS STILL RUNNING (Blink addendum, 2026-08-01) ───
// "Report a Problem sits at the same level as Mark As Complete — not buried,
// not a fallback — and forks to End Trip OR Continue Trip. Reporting a problem
// does not force the job to end… A surface that offers only resolve-or-ignore
// trains hosts to mark things done that are not done, which corrupts the
// readiness signal our whole product rests on."
//
// Lodging has exactly this shape and could not express it: a house can be taken
// by someone else, a group rate can lapse, a host can be outbid. Until now the
// only moves were forward. `status: 'gone'` says a place is no longer available
// WITHOUT deleting it — the host still wants to see what they lost and why the
// shortlist got shorter — and the pick falling through is a first-class state
// rather than a silent revert to weighing.
export function lodgingTrouble(event, intel) {
  const ev = event || {};
  if (ev.isDestination !== true) return null;
  let li = intel;
  if (!li) { try { li = lodgingIntel(ev); } catch (_e) { return null; } }

  const raw = Array.isArray(ev.lodgingOptions) ? ev.lodgingOptions : [];
  const gone = raw.filter((o) => o && o.status === 'gone');
  if (!gone.length) return null;

  const chosenGone = gone.find((o) => o.wasChosen === true);
  const named = (o) => String((o && o.label) || '').trim() || 'One of your places';
  const left = raw.filter((o) => o && o.status !== 'gone').length;

  if (chosenGone) {
    return {
      state: 'pick-fell-through',
      headline: `${named(chosenGone)} fell through.`,
      // Never "start again": the work is not lost, and saying so is the point.
      detail: left > 0
        ? `Your shortlist still has ${left === 1 ? 'one other place' : `${left} other places`} on it — the comparison is intact.`
        : 'Nothing else is on the shortlist yet, so this one is back to looking.',
      act: left > 0 ? 'Pick another' : 'Find more places',
    };
  }
  return {
    state: 'option-gone',
    headline: gone.length === 1 ? `${named(gone[0])} is gone.` : `${gone.length} places are gone.`,
    detail: 'Kept on the list, struck through — a place you already ruled out is worth remembering.',
    act: null,
  };
}

// ─── WHAT WE READ vs WHAT YOU TYPED (2026-08-03) ───────────────────────────
// The listing research caught us in the same fault we levelled at Blink:
// "our unfurl parses, normalises and infers, and says nothing." Airbnb marks
// machine-touched text — "Some info has been automatically translated. Show
// original" — and that is our own grounding doctrine applied to a listing.
//
// An option now remembers WHERE each field came from. `read` means it came off
// the page or the unfurl; `typed` means the host wrote it. A field with no
// recorded source is reported as unknown rather than credited to either — we do
// not backfill provenance we never captured.
export const LODGING_FIELD_LABELS = {
  label: 'Name', beds: 'Beds', sleeps: 'Sleeps', amenities: 'What it has',
  totalPrice: 'Total', pricePerNight: 'A night', fees: 'Fees',
  photoUrl: 'Photo', notes: 'Notes', cancellationTier: 'Cancellation',
};

export function lodgingProvenance(option) {
  const o = option || {};
  const src = (o.sources && typeof o.sources === 'object') ? o.sources : {};
  const has = (k) => {
    const v = o[k];
    return v != null && String(v).trim() !== '';
  };
  const rows = Object.keys(LODGING_FIELD_LABELS)
    .filter(has)
    .map((k) => ({ field: k, label: LODGING_FIELD_LABELS[k], source: src[k] || 'unknown' }));
  return {
    rows,
    read: rows.filter((r) => r.source === 'read').length,
    typed: rows.filter((r) => r.source === 'typed').length,
    unknown: rows.filter((r) => r.source === 'unknown').length,
  };
}

// ─── WHY THESE, IN THIS ORDER (listing research: "Why these hotels?") ──────
// HotelTonight puts a plain button at the foot of the list and the curation
// explains itself on demand. "We rank candidates by must-have fit and currently
// never say so." rankCandidates already computes the basis — matched must-haves,
// real beds against the head count, the budget ceiling — so this states what it
// actually did rather than describing an algorithm in the abstract.
export function lodgingRankBasis(event, intel) {
  const ev = event || {};
  let li = intel;
  if (!li) { try { li = lodgingIntel(ev); } catch (_e) { return null; } }
  const opts = (li && li.options) || [];
  if (opts.length < 2) return null;

  let wants = [];
  try { wants = mustHavesFor(ev) || []; } catch (_e) { wants = []; }
  const guests = (li && li.guests) || 0;
  const budget = Number(ev.totalBudget) || 0;

  const lines = [];
  if (wants.length) {
    lines.push(`Ordered by how many of your ${wants.length} must-have${wants.length === 1 ? '' : 's'} each one matches.`);
  }
  if (guests) {
    lines.push(`Real beds count, not headline capacity — a place with fewer than ${guests} beds drops, because the difference is someone on a sofa.`);
  }
  if (budget > 0) {
    lines.push(`Anything over the $${budget.toLocaleString()} you set drops below the ones that clear it.`);
  }
  if (!lines.length) return null;

  return {
    lines,
    // Stated so the order is never mistaken for a verdict.
    caveat: 'Nothing is ruled out — this is the order they are shown in, not a judgement about which you should take.',
  };
}

// ─── "WAS $412 WHEN YOU SAVED IT" (HotelTonight, via the listing research) ──
// Their struck price is THEIR OWN HISTORY — "was on HT $210" — a checkable
// claim about themselves rather than an unverifiable claim about the market
// (compare Expedia's struck reference price, which nobody can audit).
//
// Ours is the same shape and the research names it outright: "was $412 when you
// saved it — honest, checkable, and genuinely useful when a host returns to a
// shortlist built three weeks ago." It compares against WHAT THE HOST FIRST
// RECORDED, never against a price we fetched, because we never fetch prices.
export function lodgingPriceHistory(option) {
  const o = option || {};
  const now = Number(o.totalPrice);
  const first = Number(o.priceFirstSeen);
  if (!Number.isFinite(now) || now <= 0) return null;
  if (!Number.isFinite(first) || first <= 0) return null;
  if (Math.round(now) === Math.round(first)) return null;

  const money = (n) => `$${Math.round(n).toLocaleString()}`;
  const up = now > first;
  return {
    first: Math.round(first),
    now: Math.round(now),
    direction: up ? 'up' : 'down',
    delta: Math.abs(Math.round(now - first)),
    // No adjective. It states the change and when the first number was taken.
    text: `was ${money(first)} when you saved it`,
    // ── SAY WHICH NUMBER, AND SAY BOTH (driven 2026-08-04) ─────────────────
    // `text` alone is only safe when it sits beside the very field it compares.
    // On the W9 card it sat under the ALL-IN price ($4,500 with fees) while
    // comparing the sticker ($4,200 against $4,480 first seen) — so the host
    // read "$4,500 · was $4,480", a $20 RISE, when the engine had computed a
    // $280 FALL. Two quantities stacked, pointing opposite ways.
    //
    // `full` carries its own subject and both numbers, so it stays true no
    // matter what headline sits above it. Surfaces should prefer it.
    full: `the total was ${money(first)} when you saved it — now ${money(now)}`,
  };
}

// ─── THE STAGE THIS HOST IS ACTUALLY IN (reimagine, 2026-08-03) ────────────
//
// Host, after reading the live panel end to end: "not very readable... we need
// way more than folding." Correct. Folding hid four surfaces behind carets; it
// did not stop there being four.
//
// THE DIAGNOSIS: this sheet is five surfaces wearing one scroll —
//   a search launcher · an intake · a comparison · a commitment · a record.
// Those are five different MOMENTS, and a host is only ever in one of them.
// Stacking all five forces the host to work out which part is theirs, every
// time they open it. That is the opposite of a cockpit (02_STUDIO_MATTE
// "Detail View Rule": readiness, why it matters, next action, phase sections)
// and it breaks "every view has exactly one dominant element"
// (UX_04 hierarchy enforcement).
//
// THE REIMAGINE: derive the stage from data the app already holds, show that
// stage's cockpit, and make the other stages REACHABLE rather than stacked.
// Nothing is deleted — the same blocks live behind a named step instead of
// below a scroll. This is the D6 workflow made live.
//
// Stage is DERIVED, never stored: no new field, no second source of truth, and
// it cannot drift from what the host actually has.
export const LODGING_STAGES = ['no-town', 'looking', 'weighing', 'picked', 'booked'];

export function lodgingStage(event, intel) {
  const ev = event || {};
  if (ev.isDestination !== true) return null;

  let li = intel;
  if (!li) { try { li = lodgingIntel(ev); } catch (_e) { li = null; } }
  const opts = (li && li.options) || [];
  const chosen = (li && li.chosen) || null;

  // A booking RECORD exists once the host has written something only a booked
  // stay produces — a name they typed off a confirmation, a code, or a date
  // from the money-safe chain. Never inferred from a pick alone: choosing is
  // not booking, and saying it is would be the kind of claim this file bans.
  // ── THE COMMENT ABOVE WAS RIGHT; THIS LINE USED TO CONTRADICT IT ──────────
  // Driving the cockpit on 2026-08-04, one press of "Make it the pick" moved
  // the host from "Weigh them" to "The stay is on the books." — skipping the
  // whole pick stage and claiming a booking that does not exist.
  //
  // Because pick() writes stayFromPick(), and that fills hotelName with the
  // chosen option's label. `hotelName` carries two different facts: the place
  // you picked, and the name on your confirmation. Reading either as a booking
  // made choosing into booking — the exact claim the comment above bans, and
  // the one lodgingStage.test.js pins ("CHOOSING IS NOT BOOKING"). That gate
  // passed because it hand-built the event; nothing ever drove pick().
  //
  // A name only counts as a booking record when it did NOT come from the pick.
  //
  // MOVED OUT 2026-08-06 (review board). The test used to live only here, and
  // phaseProgress had its own looser copy — a bare `hotelName` — so the
  // readiness board called the stay sorted while THIS surface still called it a
  // pick. It is one exported predicate now, read by both.
  const booked = lodgingIsHeld(ev);

  let blocked = null;
  try { blocked = lodgingSearchBlocked(ev); } catch (_e) { blocked = null; }

  const stage = booked ? 'booked'
    : chosen ? 'picked'
    : opts.length > 0 ? 'weighing'
    : blocked ? 'no-town'
    : 'looking';

  // ── UNKNOWN IS NOT A YES (2026-08-06, review board — two seats) ───────────
  // `o.sleeps == null` used to COUNT AS FITTING, so a shortlist of hotels —
  // which never carry an occupancy figure — rendered "3 places, 3 that fit."
  // in the largest type on the screen, while every card eight lines below read
  // "Fits 0 of your 3 musts" and the comparison table showed "—" for Sleeps.
  // One screen, three different answers, and the loudest one was a claim over
  // an absence. The hotel path made that the guaranteed outcome rather than an
  // edge case.
  const guests = (li && li.guests) || 0;
  const fits = guests ? opts.filter((o) => o.sleeps != null && o.sleeps >= guests).length : opts.length;
  const unweighed = guests ? opts.filter((o) => o.sleeps == null).length : 0;

  // ONE dominant line per stage, and the ONE act that moves it forward. Both
  // state what is true right now — never a target, never a guess.
  const COPY = {
    'no-town': {
      title: 'Name the town.',
      why: blocked ? blocked.detail : 'Every search needs a place.',
      act: 'Use this town',
    },
    looking: {
      title: 'Go find some places.',
      why: 'Three doors, opened with your own answers already in them. Bring back a link — or the whole results page.',
      act: 'Search Airbnb',
    },
    weighing: {
      title: opts.length === 1 ? 'One place so far.'
        : !guests ? `${opts.length} places.`
        : unweighed === opts.length ? `${opts.length} places — none say how many they sleep.`
        : unweighed ? `${opts.length} places, ${fits} known to fit.`
        : `${opts.length} places, ${fits} that fit.`,
      why: 'Side by side on the things you said matter. Nothing here is scraped.',
      act: 'Make one the pick',
    },
    picked: {
      // trimmed: a whitespace-only label is not a name, and must not become one
      title: (chosen && String(chosen.label || '').trim()) ? `${String(chosen.label).trim()}.` : 'You have a pick.',
      why: 'Book it on the platform, then bring the confirmation numbers back here so the money dates are watched.',
      act: 'Save the stay details',
    },
    booked: {
      title: 'The stay is on the books.',
      why: 'What is watched from here: the refund window, the next payment, and who still needs a room.',
      act: 'Open the money dates',
    },
  };

  const c = COPY[stage];
  return {
    stage,
    index: LODGING_STAGES.indexOf(stage),
    total: LODGING_STAGES.length,
    title: c.title,
    why: c.why,
    act: c.act,
    counts: { options: opts.length, fits, guests },
    // Every stage stays REACHABLE — the point is that only one is loud, not
    // that the others are gone. `done` is the honest read of what is behind you.
    steps: LODGING_STAGES.map((s, i) => ({
      id: s,
      done: i < LODGING_STAGES.indexOf(stage),
      current: s === stage,
    })),
  };
}

// ─── THE COMPARISON, TRANSPOSED (research rec #1, 2026-08-01) ──────────────
// "Adopt the Zillow transpose for the shortlist. Named attribute rows down a
// left rail, candidates as columns. Missing data becomes a visible gap in a
// known row instead of an absent element. This is the single highest-value item
// here, because our comparison axis is a finite must-have list."
//
// THE HONESTY LIMIT THAT SHAPES THIS: a must-have is checked against the host's
// own typed notes. Typed notes can CONFIRM an amenity and can never DENY one —
// a blank note means she did not mention it, not that the house lacks it. So
// every amenity row is two-valued: 'yes' or NOT SAID. There is no 'no', because
// we would be inventing it. Only `sleeps` earns a real no, because it is a
// number she typed and the comparison is arithmetic.
//
// Absence renders as '—', never blank and never zero (research rec #2), and a
// disqualifying value is grey rather than red (rec #7): too small is not faulty.
export function lodgingCompare(event, intel) {
  const ev = event || {};
  let li = intel;
  if (!li) { try { li = lodgingIntel(ev); } catch (_e) { return null; } }
  const opts = (li && li.options) || [];
  if (opts.length < 2) return null;            // one option is not a comparison

  const cols = opts.slice(0, 3);
  const guests = li.guests || 0;
  const money = (n) => (Number.isFinite(n) && n > 0 ? `$${Math.round(n).toLocaleString()}` : null);
  const allIn = (o) => {
    const t = Number(o.totalPrice) || 0;
    const f = Number(o.fees) || 0;
    return t > 0 ? t + f : null;
  };
  const nights = spanNights(ev) || 0;

  const rows = [];
  const push = (id, label, fn) => rows.push({
    id, label,
    values: cols.map((o) => { const v = fn(o); return v == null || v === '' ? '—' : v; }),
    flags: cols.map((o) => {
      if (id !== 'sleeps') return null;
      if (!guests || o.sleeps == null) return null;
      return o.sleeps >= guests ? 'ok' : 'short';
    }),
  });

  push('allin', nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}, all-in` : 'All-in', (o) => money(allIn(o)));
  push('night', 'A night', (o) => money(o.pricePerNight != null ? o.pricePerNight
    : (allIn(o) && nights > 0 ? allIn(o) / nights : null)));
  // SAY THE SHORTFALL, DO NOT MARK IT (lodging listing research, 2026-08-01).
  // Booking.com's best-in-class move: a room that cannot hold the party renders
  // "These options won't accommodate your entire group" — visible, self-
  // explaining, unselectable. The first cut of this appended a bare "·" to the
  // number, which explains nothing and reads as a typo. The number now carries
  // the gap in words the host can act on.
  push('sleeps', 'Sleeps', (o) => {
    if (o.sleeps == null) return null;
    if (!guests || o.sleeps >= guests) return String(o.sleeps);
    return `${o.sleeps} — ${guests - o.sleeps} without a bed`;
  });

  // only the requirements the host actually asked for — not the whole catalogue
  let musts = [];
  try { musts = mustHavesFor(ev) || []; } catch (_e) { musts = []; }
  for (const m of musts) {
    if (!m || !m.match) continue;
    push(m.id, m.label, (o) => (m.match.test(optionHay(o)) ? 'yes' : null));
  }

  return {
    columns: cols.map((o) => ({ id: o.id, label: o.label })),
    rows,
    guests,
    // Stated on the surface so the dashes are never read as "the house lacks it".
    //
    // ── "THE NUMBERS YOU TYPED" WAS FALSE FOR MOST ROWS (2026-08-06) ────────
    // The tail used to read "these are the numbers you typed". A pasted results
    // page fills these values by READING, and each card's own provenance table
    // says so ("read from the link") — so one screen carried two contradictory
    // accounts of where the same price came from. The Grandmother seat: "I know
    // I didn't type them. Once I catch it in one sentence I stop believing the
    // other twelve." Provenance is per-value and already recorded per option;
    // this footer must not overwrite it with a blanket claim.
    note: '“—” means the listing didn’t say. Nothing here is scraped — each card says which of its numbers were read and which you typed.',
  };
}

export function lodgingCommitted(event) {
  let li = null;
  try { li = lodgingIntel(event); } catch (_e) { return 0; }
  const chosen = li && li.chosen;
  if (!chosen || chosen.allIn == null) return 0;
  const n = Number(chosen.allIn);
  if (!Number.isFinite(n) || n <= 0) return 0;

  // ── DON'T CHARGE HER TWICE (audit finding, 2026-07-28) ────────────────────
  // The first cut of this documented the double-count risk and shipped it
  // anyway. Measured: a host with the house on her shortlist AND typed as a
  // budget row read `committed = 4,848` for a $2,200 house. Documenting a money
  // bug is not the same as it being acceptable.
  //
  // vendorOwed can never double-count structurally — outstanding money cannot
  // already be in a paid row. Lodging has no such protection, so it needs an
  // explicit check. When a budget row already accounts for the house, THE ROW
  // WINS: it is the host's own record, and skipping the derived term is
  // correct rather than under-counting.
  const rows = Array.isArray(event && event.budget) ? event.budget : [];
  const label = String(chosen.label || '').trim().toLowerCase();
  const already = rows.some((r) => {
    const l = String((r && r.label) || '').trim().toLowerCase();
    if (!l) return false;
    if (label && (l === label || l.includes(label) || label.includes(l))) return true;
    return /\b(rental|lodging|airbnb|vrbo|the house|house rental|cabin|stay)\b/.test(l);
  });
  return already ? 0 : Math.round(n);
}

/**
 * Where a `lodging` record came from. A stay written by CHOOSING carries this
 * stamp; a stay the host typed off a booking confirmation does not. Two
 * different facts have always lived in `lodging.hotelName` — "the place I
 * picked" and "the name on my confirmation" — and this is what tells them
 * apart. Compared in lodgingStage; never write the literal in either place.
 */
export const STAY_FROM_PICK = 'the option you picked';
/**
 * The one stamp that says a room is actually HELD.
 *
 * Written only where the host has said so in as many words. It is a literal
 * because it is also host-facing provenance ("where this came from"), and it is
 * exported so no surface has to retype the string that decides whether the
 * command board tells her lodging is done.
 */
export const STAY_FROM_CONFIRMATION = 'typed off the confirmation';
/** A name with no booking behind it — where we PLAN to stay, not a held room. */
export const STAY_FROM_PLAN = 'the plan, not booked yet';

/**
 * IS THE STAY ACTUALLY HELD — not merely picked.
 *
 * This test lived inside lodgingStage and nowhere else, which is how the
 * readiness engines came to disagree with the lodging surface about the same
 * event (review board, 2026-08-06, event-pro seat). `phaseProgress` marked
 * lodging DONE on a bare `ev.lodging.hotelName`, and `stayFromPick` writes
 * exactly that field from a PICK — so one press of "Make it the pick" flipped
 * the command board to "sorted" with no rooms held, no code, and no cutoff on
 * file. The surface knew better and the board did not.
 *
 * `hotelName` carries two different facts — the place you picked, and the name
 * on your confirmation — so it can only be read as a booking when it did NOT
 * come from the pick. Everything else here is something only a booked stay
 * produces: a code, or a date off the money-safe chain.
 *
 * Choosing is not booking. One predicate, so nothing can claim otherwise again.
 */
export function lodgingIsHeld(event) {
  const ev = event || {};
  const stay = (ev.lodging && typeof ev.lodging === 'object') ? ev.lodging : {};
  const md = (ev.moneyDates && typeof ev.moneyDates === 'object') ? ev.moneyDates : {};
  // ── WHICH NAMES ARE BOOKINGS (2026-08-06, third sitting) ─────────────────
  // The board's event seat wanted this inverted outright — require an explicit
  // confirmation stamp, because "held by negation" means any writer that
  // forgets the stamp gets a booking for free.
  //
  // Inverting it wholesale would have been wrong, and the tests said so before
  // I did: a bare `hotelName` with NO `from` is the old booking form's own
  // shape (lodgingAudit.test.js pins it as "a real off-confirmation name"),
  // and stored events carry it. Flipping that would have silently un-booked
  // real stays to satisfy a rule about writers.
  //
  // So the fix is on the CLAIMING side, which is where the actual complaint
  // was: there is now an explicit value for "this is the plan, not a booking"
  // (STAY_FROM_PLAN), and the front door asks which one the host means instead
  // of stamping every answer as a confirmation. A name is a booking unless it
  // says otherwise — and now it CAN say otherwise.
  const from = String(stay.from || '');
  const namedOffConfirmation = !!String(stay.hotelName || '').trim()
    && from !== STAY_FROM_PICK && from !== STAY_FROM_PLAN;
  // TWO KEYS FOR ONE FACT, and both are real. `code` is what travelPlan and the
  // guest note read; `bookingCode` is what the cockpit wrote alone until
  // 2026-08-06, so events saved before that carry only it. Reading either is
  // the only answer that does not silently un-hold somebody's existing stay.
  const bookingCode = String(stay.code || stay.bookingCode || '').trim();
  return !!(namedOffConfirmation || bookingCode
    || String(md.refundDeadline || '').trim() || String(md.installmentDue || '').trim());
}

export function stayFromPick(event, intel) {
  const li = intel || lodgingIntel(event);
  const chosen = li.chosen;
  if (!chosen) return null;
  const nights = li.nights;
  const perNight = chosen.pricePerNight != null
    ? chosen.pricePerNight
    : (chosen.totalPrice != null && nights ? Math.round(chosen.totalPrice / nights) : null);
  return {
    hotelName: chosen.label || '',
    rate: perNight,
    url: chosen.url || '',
    from: STAY_FROM_PICK,
    // "ON THE BOOKS... no image. This is where we are all staying for our
    // beautiful trip" (host, 2026-08-05). The pick already carried a real
    // photo — Choices renders it hero-sized on Weigh Them — but stayFromPick
    // only ever wrote hotelName/rate/url/from, so the moment a place became
    // the actual booked stay, its own picture was left behind. Same host-
    // pasted photo, same fields Choices already trusts; nothing new fetched.
    photoUrl: chosen.photoUrl || '',
    photos: Array.isArray(chosen.photos) ? chosen.photos : [],
    sleeps: chosen.sleeps != null ? chosen.sleeps : null,
    beds: chosen.beds != null ? chosen.beds : null,
    cancellationTier: chosen.cancellationTier || '',
  };
}

/** The runner-up — which is what "if the first fills up" means. */
export function backupFromRunnerUp(event, intel) {
  const li = intel || lodgingIntel(event);
  const rec = lodgingRecommendation(event, li);
  if (!rec || !rec.scores || rec.scores.length < 2) return null;
  const chosenId = li.chosen && li.chosen.id;
  const runnerUp = rec.scores.find((x) => x.id !== chosenId && x.fits) || rec.scores.find((x) => x.id !== chosenId);
  if (!runnerUp) return null;
  const opt = li.options.find((o) => o.id === runnerUp.id);
  if (!opt) return null;
  return {
    name: opt.label,
    note: [
      opt.allIn != null ? `$${opt.allIn.toLocaleString()}${opt.feesKnown ? ' all in' : ' before fees'}` : null,
      opt.sleeps != null ? `sleeps ${opt.sleeps}` : null,
    ].filter(Boolean).join(' · '),
    from: 'next best on your shortlist',
  };
}

// Proof helper: every guidance source id must resolve in the booking registry.
export function lodgingGuidanceSourcesResolve(intel) {
  return (intel.guidance || []).every((g) => (g.sources || []).every((id) => BOOKING_RISK_SOURCES[id]));
}
