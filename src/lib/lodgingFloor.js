// ─── WHAT THE STAY ALONE COSTS, WHEN WE HONESTLY KNOW ────────────────────────
//
// MEASURED on the Santa Fe 80th (10 guests, 4 nights, resort spa). The estimate
// is a per-head band from `PER_HEAD_BY_FAMILY.travel_led` — $200–600 a head —
// and `confidence.js` says that band is meant to cover airfare, lodging AND
// travel insurance alongside the event itself. Against the six real listings in
// `__fixtures__/airbnbSantaFeResults.js`, captured for this host's own search:
//
//   Private backyard   $2,180 / 4 nights   $218 a head   already past the $200 low
//   5-acre villa       $4,371              $437
//   Secluded estate    $5,400              $540
//   Mountain views     $6,211              $621          ABOVE the $600 high
//   3-unit compound    $6,984              $698          ABOVE
//   Rooftop jacuzzi    $9,040              $904          ABOVE
//
// The cheapest place on the page the app itself hands the host consumes the
// whole low end of the band, leaving nothing for flights or the party. Three of
// six exceed the high end on lodging alone.
//
// THIS REPORTS AND DOES NOT RESOLVE, the same shape as `requiredVendorFloor`.
// Re-authoring the band is a host-facing dollar decision and needs a basis this
// file does not have; naming the contradiction needs neither.
//
// TWO THINGS IT REFUSES TO DO.
//   · It never estimates a stay. No listing, no number — `null`, not a guess.
//   · It never treats a PICK as a price. `priceShown` is deliberately not called
//     `total` in lodgingIntel ("we did not see a checkout"), so what comes back
//     is labelled with the basis it actually has.

/** A finite positive number, or null. Guards the whole file's arithmetic. */
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const optionsOf = (event) => {
  const o = event && event.lodgingOptions;
  return Array.isArray(o) ? o.filter((x) => x && typeof x === 'object') : [];
};

/** The option the host settled on, matched by url first and then by name. */
function pickedOption(event) {
  const stay = (event && event.lodging && typeof event.lodging === 'object') ? event.lodging : null;
  if (!stay) return null;
  const opts = optionsOf(event);
  if (!opts.length) return null;
  const url = String(stay.url || '').trim();
  if (url) {
    const byUrl = opts.find((o) => String(o.url || '').trim() === url);
    if (byUrl) return byUrl;
  }
  const name = String(stay.hotelName || '').trim().toLowerCase();
  if (!name) return null;
  return opts.find((o) => String(o.name || '').trim().toLowerCase() === name) || null;
}

/**
 * What the stay costs in total, and where that figure came from.
 *
 * Returns `{ total, perHead, basis, name }` or null when nothing is known.
 * `basis` is one of:
 *   'picked'   — the option the host settled on carries a shown price
 *   'cheapest' — no pick yet, so the LEAST expensive shortlisted option. The
 *                most favourable reading available, deliberately: a flag built
 *                on the cheapest candidate only fires when even that one
 *                breaches, which is the only version worth showing a host.
 */
export function lodgingFloorFor(event, guestCount) {
  const guests = Number(guestCount);
  const opts = optionsOf(event);
  if (!opts.length) return null;

  const priced = opts
    .map((o) => ({ o, total: money(o.priceShown) }))
    .filter((x) => x.total != null);
  if (!priced.length) return null;

  const pick = pickedOption(event);
  const pickPriced = pick ? priced.find((x) => x.o === pick) : null;
  const chosen = pickPriced || priced.reduce((a, b) => (b.total < a.total ? b : a));

  const perHead = (Number.isFinite(guests) && guests > 0)
    ? Math.round(chosen.total / guests) : null;
  return {
    total: chosen.total,
    perHead,
    basis: pickPriced ? 'picked' : 'cheapest',
    name: String(chosen.o.name || '').trim() || null,
  };
}
