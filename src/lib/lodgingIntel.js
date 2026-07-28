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

import { spanNights } from './dates';
import { BOOKING_RISK_SOURCES } from './knowledge/bookingRiskContext';

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

  // Per-option checks — arithmetic on host-entered facts, never a verdict.
  for (const o of options) {
    o.checks = [];
    if (guests && o.sleeps != null) {
      o.checks.push(o.sleeps >= guests
        ? { key: 'fit', ok: true, text: `Sleeps ${o.sleeps} — covers your ${guests}.` }
        : { key: 'fit', ok: false, text: `Sleeps ${o.sleeps} of your ${guests} — ${guests - o.sleeps} would need another plan.` });
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
    lines.push('', 'Look them over and tell me which works for you (or what rules one out) — replying on the invite works too.', '', 'Once we pick, one of us books it through the site’s own checkout and we split it fairly.');
  } else {
    lines.push('No options on the list yet — send me links you like and I’ll add them.');
  }
  const share = { subject: `Where we'd stay — ${name}`, body: lines.join('\n') };

  return { options, chosen, guidance, share, roles, nights, guests };
}

// Proof helper: every guidance source id must resolve in the booking registry.
export function lodgingGuidanceSourcesResolve(intel) {
  return (intel.guidance || []).every((g) => (g.sources || []).every((id) => BOOKING_RISK_SOURCES[id]));
}
