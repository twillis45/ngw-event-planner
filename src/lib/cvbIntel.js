// ─── Visitors-bureau intelligence — the call, the asks, the contact ──────────
//
// Host directive (2026-07-28): "for call destination visitor's bureau, bring
// back the contact information. and look for direct links associated with piece
// that relate to visitor asks, room blocks if appropriate, welcome bags, etc."
//
// DOCTRINE SHAPE:
//   · The bureau's CONTACT is a host-entered fact (event.cvb) — the app never
//     scrapes or guesses a phone number. Once the host writes it down, the row
//     renders real tel:/site links, so the number they found rides the plan.
//   · Each ASK carries a direct, honestly-labeled find link (a targeted search
//     scoped to the destination city — same truthfulness class as the existing
//     "Find the visitors bureau" link) plus source ids resolving in
//     knowledge/destinationContext.js DESTINATION_SOURCES (the three bureau
//     programs page-verified 2026-07-26 + AHLA room-block practice).
//   · "Room blocks if appropriate": the ask appears only when the group is
//     hotel-shaped — 8+ guests and no rental house already chosen. A chosen
//     rental means the group is housed; the bureau call is then about the
//     guide, bags, and the letter, not rooms.
//   · Plain language only (host standing order): no "attrition", no "courtesy
//     block" — say the real tradeoff instead.

import { venueFor } from './venueFor';
import { DESTINATION_SOURCES } from './knowledge/destinationContext';

const search = (q) => 'https://www.google.com/search?q=' + encodeURIComponent(q);

// Normalize the host-entered contact. tel: strips everything but digits/+ so a
// pasted "(301) 555-0100" still dials.
export function normalizeCvbContact(raw) {
  const c = raw || {};
  const name = String(c.name || '').trim();
  const phone = String(c.phone || '').trim();
  const url = String(c.url || '').trim();
  const email = String(c.email || '').trim();
  if (!name && !phone && !url && !email) return null;
  const dial = phone.replace(/[^\d+]/g, '');
  return {
    name, phone, url, email,
    telHref: dial.length >= 7 ? `tel:${dial}` : null,
    siteHref: /^https?:\/\//i.test(url) ? url : (/^[^\s/]+\.[^\s]{2,}$/.test(url) ? `https://${url}` : null),
    mailHref: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? `mailto:${email}` : null,
  };
}

/**
 * cvbIntelFor(event) → {
 *   city,                          — display name for the destination ('' if unknown)
 *   contact,                       — normalized event.cvb or null
 *   finder: { label, href },       — find the bureau (existing truthful search link)
 *   contactFinder: { label, href },— find its contact page specifically
 *   asks: [{ key, label, why, href, hrefLabel, sources[] }],
 * }
 * Pure. Every ask's sources resolve in DESTINATION_SOURCES; the room-block ask
 * is gated, never defaulted in.
 */
export function cvbIntelFor(event) {
  const ev = event || {};
  const vf = venueFor(ev);
  const city = [vf.city, vf.state].filter(Boolean).join(', ');
  const cityQ = city || 'destination';
  const contact = normalizeCvbContact(ev.cvb);

  const finder = { label: 'Find the visitors bureau', href: search(`${cityQ} convention visitors bureau`) };
  const contactFinder = { label: 'Find their contact page', href: search(`${cityQ} visitors bureau contact phone`) };

  const guests = Number(ev.guestCount) || Number(ev.guestEstimate) || (Array.isArray(ev.guests) ? ev.guests.length : 0) || null;
  const rentalChosen = Array.isArray(ev.lodgingOptions) && ev.lodgingOptions.some((o) => o && o.status === 'chosen');
  const roomBlockFits = !rentalChosen && (guests == null || guests >= 8);

  const asks = [
    {
      key: 'kit',
      label: 'Their group planning kit',
      why: 'Bureaus keep a free planning kit — venue lists, group-friendly restaurants, a local who answers the phone. Hotel tax pays for it.',
      href: search(`${cityQ} visitors bureau group planning kit reunion`),
      hrefLabel: 'Find the kit',
      sources: ['cvb-gwinnett', 'cvb-atlanta'],
    },
    ...(roomBlockFits ? [{
      key: 'rooms',
      label: 'Room options at 2–3 price points',
      why: 'They’ll gather hotel offers across the city for free. A softer hold costs nothing if rooms don’t fill; a guaranteed hold gets a better rate but you pay for empty rooms — say which you want.',
      href: search(`${cityQ} hotel room block group rate`),
      hrefLabel: 'See how room holds work',
      sources: ['ahla-roomblock', 'cvb-myrtle-beach'],
    }] : []),
    {
      key: 'bags',
      label: 'Welcome bags for arrivals',
      why: 'Many bureaus stuff and deliver welcome bags — maps, coupons, local treats — when your group books locally. Ask what qualifies.',
      href: search(`${cityQ} visitors bureau welcome bags group`),
      hrefLabel: 'Find the bag program',
      sources: ['cvb-gwinnett'],
    },
    {
      key: 'letter',
      label: 'A welcome letter for the program',
      why: 'Bureaus can arrange a mayor’s or governor’s welcome letter for your printed program — free, but it needs lead time.',
      href: search(`${cityQ} mayor welcome letter event request`),
      hrefLabel: 'Find the letter request',
      sources: ['cvb-atlanta'],
    },
  ];

  return { city, contact, finder, contactFinder, asks };
}

// Proof helper: every ask's source ids must resolve in the destination registry.
export function cvbAskSourcesResolve(intel) {
  return (intel.asks || []).every((a) => (a.sources || []).length > 0 && a.sources.every((id) => DESTINATION_SOURCES[id]));
}
