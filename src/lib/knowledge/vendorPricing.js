// ─── Vendor pricing basis — HOW each kind of vendor actually charges ─────────
//
// Host report (2026-07-16): a caterer bills PER HEAD, a DJ bills a FLAT fee (or
// hourly), a photographer flat/hourly, rentals PER ITEM — but the app treated
// every "agreed to pay $" as one opaque total, so catering never showed a
// per-head figure and the budget logic couldn't reason about how a cost scales.
//
// This module is the single source for a vendor CATEGORY → its charging model,
// so cost display, budget estimates, and decisions can all speak the same basis.
// Ranges are US-typical CONSENSUS bands (a real order of magnitude, not a quote);
// tier is honest — 'consensus', never dressed up as a cited quote.
//
// basis:
//   'per_head'  — scales with the guest count (caterer, bar, desserts)
//   'flat'      — one fee for the booking (DJ, videographer, venue, decor, cake)
//   'hourly'    — priced by time on site (some photographers, bartenders, transport)
//   'per_item'  — priced per unit (rentals: tables, chairs, linens, tents, dance floor)

export const PRICING_TIER = 'consensus';

// Category profiles, keyed by a normalized slug the resolver maps fuzzy labels to.
export const VENDOR_PRICING = {
  catering:    { basis: 'per_head', unit: 'head',  low: 15,  high: 75,  label: 'Catering',       note: 'Caterers quote a per-plate rate; the total is that rate × headcount, so it moves with your guest count.' },
  bar:         { basis: 'per_head', unit: 'head',  low: 15,  high: 40,  label: 'Bar',            note: 'Open-bar packages are usually per guest; a limited beer/wine or cash bar is the flat exception.' },
  dessert:     { basis: 'per_head', unit: 'head',  low: 3,   high: 12,  label: 'Desserts',       note: 'A dessert table/cake is often per-serving; a single cake can be a flat order.' },
  dj:          { basis: 'flat',     unit: 'event', low: 400, high: 1500, label: 'DJ',            note: 'A DJ is a flat booking for the event window; overtime is the only per-hour add.' },
  photography: { basis: 'flat',     unit: 'event', low: 500, high: 3000, label: 'Photography',   note: 'Event photographers price by package/coverage window — flat for the booking, sometimes hourly.' },
  video:       { basis: 'flat',     unit: 'event', low: 800, high: 3500, label: 'Videography',   note: 'Videography/tribute films are a flat package for the shoot + edit.' },
  photobooth:  { basis: 'flat',     unit: 'event', low: 400, high: 900,  label: 'Photobooth',    note: 'A photobooth is a flat rate for a set number of hours.' },
  entertainment:{ basis: 'flat',    unit: 'event', low: 300, high: 2500, label: 'Entertainment', note: 'A band, singer, or performer is a flat fee for the set.' },
  decor:       { basis: 'flat',     unit: 'event', low: 200, high: 3000, label: 'Decor',         note: 'Decor/florals are usually a flat package, though a la carte pieces can be per item.' },
  venue:       { basis: 'flat',     unit: 'event', low: 400, high: 8000, label: 'Venue',         note: 'A venue is a flat rental for the block; a few venues bill per head via required catering minimums.' },
  rentals:     { basis: 'per_item', unit: 'item',  low: 2,   high: 25,   label: 'Rentals',       note: 'Tables, chairs, linens, tents, a dance floor — each is priced per unit, so the total moves with the count you rent.' },
  transport:   { basis: 'hourly',   unit: 'hour',  low: 90,  high: 250,  label: 'Transportation', note: 'Shuttles/limos bill per hour, usually with a minimum.' },
  officiant:   { basis: 'flat',     unit: 'event', low: 200, high: 800,  label: 'Officiant',     note: 'A flat fee for the ceremony.' },
  planner:     { basis: 'flat',     unit: 'event', low: 500, high: 5000, label: 'Coordinator',   note: 'A planner/coordinator is a flat fee (or a % of budget) for the engagement.' },
};

// Ordered matchers — MOST SPECIFIC FIRST — so "DJ + Dance Floor" reads as a DJ
// (flat), "photobooth" isn't caught by the generic "photo", and "open bar" hits
// the bar before anything else. A category label maps to its DOMINANT basis.
const MATCHERS = [
  [/photo\s?booth|booth/i, 'photobooth'],
  [/cater|buffet|plated|food service|per[- ]plate/i, 'catering'],
  [/\bbar\b|open bar|beverage|cocktail|bartend|liquor/i, 'bar'],
  [/dessert|cake|sweets|pastry|bakery/i, 'dessert'],
  [/\bdj\b|disc jockey/i, 'dj'],
  [/videograph|video|film|cinemat|tribute/i, 'video'],
  [/photograph|\bphoto\b|photog/i, 'photography'],
  [/band|singer|musician|entertainment|performer|dancer|emcee|\bmc\b/i, 'entertainment'],
  [/rental|tables?\b|chairs?\b|linens?|tent|dance floor|staging|\bstage\b|tableware|glassware/i, 'rentals'],
  [/decor|floral|flower|balloon|centerpiece|signage|backdrop|lighting/i, 'decor'],
  [/venue|hall|ballroom|room rental|space/i, 'venue'],
  [/transport|shuttle|limo|bus|car service|rideshare/i, 'transport'],
  [/officiant|celebrant/i, 'officiant'],
  [/planner|coordinator|day[- ]of/i, 'planner'],
];

// Resolve a free-text vendor category (or name) to its pricing profile. Returns
// null when nothing matches — the caller keeps the plain total, never a guess.
export function vendorPricingBasis(category) {
  const c = String(category || '').trim();
  if (!c) return null;
  for (const [re, slug] of MATCHERS) {
    if (re.test(c)) return { slug, ...VENDOR_PRICING[slug], tier: PRICING_TIER };
  }
  return null;
}

// A short display hint for how a vendor's money reads, given the event headcount.
// - With an agreed cost + a per-head basis → the derived unit price ("$20/head").
// - With an agreed cost + flat/hourly/per-item → the basis word ("flat rate").
// - With NO cost yet → the typical band in the right unit ("~$15–40/head").
// Returns null when the category is unknown (caller shows the plain total only).
export function vendorPricingHint(vendor, guests) {
  const p = vendorPricingBasis(vendor && (vendor.category || vendor.name));
  if (!p) return null;
  const cost = Number(vendor && vendor.cost) || 0;
  const heads = Number(guests) || 0;
  if (cost > 0) {
    if (p.basis === 'per_head' && heads > 0) {
      const per = Math.round(cost / heads);
      return per > 0 ? '$' + per.toLocaleString() + '/head' : null;
    }
    if (p.basis === 'flat') return 'flat rate';
    if (p.basis === 'hourly') return 'hourly';
    if (p.basis === 'per_item') return 'per item';
    return null;
  }
  // No agreed price yet — show the typical band so the host knows what to expect.
  const unit = p.unit === 'head' ? '/head' : p.unit === 'hour' ? '/hr' : p.unit === 'item' ? '/item' : '';
  return '~$' + p.low.toLocaleString() + '–' + p.high.toLocaleString() + unit;
}

// The expected total range for a category at this headcount — for budget/decision
// reasoning (per-head scales with guests; flat/hourly/per-item are the raw band).
// Returns null for unknown categories. Honest: a CONSENSUS order-of-magnitude.
export function vendorExpectedRange(category, guests) {
  const p = vendorPricingBasis(category);
  if (!p) return null;
  const heads = Math.max(0, Number(guests) || 0);
  if (p.basis === 'per_head' && heads > 0) {
    return { low: p.low * heads, high: p.high * heads, basis: p.basis, tier: PRICING_TIER };
  }
  return { low: p.low, high: p.high, basis: p.basis, tier: PRICING_TIER };
}
