// ─── REAL SHELF PRICES, WHEN THERE ARE ANY ───────────────────────────────────
//
// Layer 2 of three. Talks to the FastAPI proxy, which holds the Kroger client
// id/secret and exchanges them for a short-lived token; no key ever reaches the
// browser. Mirrors `foodPrices.js`, deliberately — the same shape of honest
// degradation, so a surface can treat both the same way.
//
// COVERAGE IS A BANNER FAMILY, NOT ONE CHAIN. Kroger's product API serves every
// banner through one endpoint, with `locationId` choosing the store: Kroger,
// Fred Meyer, Ralphs, Harris Teeter, Fry's, QFC, King Soopers, Smith's, Dillons,
// Baker's, City Market, Food 4 Less, Foods Co, Gerbes, Jay C, Mariano's, Metro
// Market, Pay Less, Pick 'n Save and Ruler. (Corrected 2026-09-23 — the first
// list here stopped at ten and said "and the rest", which undersold the reach of
// the one thing this layer has going for it.) That is wide, and it is still not
// everywhere — which is why this is a layer over the regional band rather than a
// replacement for it.
//
// A PRICE NEEDS A STORE. Kroger returns prices only when a locationId is sent
// ("Required to return additional response data like price…" — their own API
// reference), so `nearbyStores` comes first and its result is the thing that
// makes `storePrices` able to answer at all. Without a chosen store this module
// returns `{ configured, results: [] }` and the plan keeps its regional band.
//
// EVERY FAILURE IS THE SAME FAILURE, from the caller's side: no results. Not
// configured, no store picked, auth failed, network down, nothing matched — all
// of it lands as an empty list, and the price layer above falls through to the
// regional band. The distinctions are kept in `reason` for a surface that wants
// to explain itself, never for one that wants to guess.
import { storeSearchTerm } from './knowledge/storeUnitMap';

const BASE = process.env.REACT_APP_API_BASE_URL;

export function isStorePricesConfigured() {
  return Boolean(BASE);
}

const EMPTY = Object.freeze({ configured: false, results: [], reason: 'no-backend' });

/**
 * Stores near a postal code. The host picks one; its `locationId` is what makes
 * a price possible.
 */
export async function nearbyStores(zip) {
  if (!BASE) return { configured: false, stores: [], reason: 'no-backend' };
  const z = String(zip || '').trim();
  if (!/^\d{5}$/.test(z)) return { configured: true, stores: [], reason: 'no-zip' };
  try {
    const res = await fetch(`${BASE}/api/shopping/kroger/locations?zip=${encodeURIComponent(z)}`);
    if (!res.ok) return { configured: true, stores: [], reason: 'unavailable' };
    const d = await res.json();
    if (d && d.configured === false) return { configured: false, stores: [], reason: 'no-keys' };
    // `locations`, NOT `results` — the two endpoints on this router disagree,
    // and search-list's key is `results`. Written wrong here first, caught by
    // reading the router rather than assuming symmetry; the test below pins both
    // names against the Python so the next reader does not have to.
    const stores = (Array.isArray(d && d.locations) ? d.locations : [])
      .map((s) => ({
        locationId: String(s.locationId || '').trim(),
        name: String(s.name || '').trim(),
        address: String(s.address || '').trim(),
      }))
      .filter((s) => s.locationId && s.name);
    return { configured: true, stores, reason: stores.length ? null : 'none-nearby' };
  } catch (_e) {
    return { configured: true, stores: [], reason: 'unavailable' };
  }
}

/**
 * Shelf prices for a shopping list at one store.
 *
 * `items` is the plan's own list — `{ name }` is all this needs. The response is
 * handed straight to `storePriceIndex` in priceLayers, which drops anything that
 * matched without a price.
 */
export async function storePrices(items, locationId) {
  if (!BASE) return EMPTY;
  const loc = String(locationId || '').trim();
  // No store means Kroger sends no price. Asking anyway would spend a request to
  // learn nothing, and a match without a price is not a price.
  if (!loc) return { configured: true, results: [], reason: 'no-store' };
  // ── NAME IS THE KEY; TERM IS THE QUERY ──────────────────────────────────
  // `name` comes back verbatim and is what priceLayers indexes prices by, so it
  // must stay the plan's own item text. `term` is what Kroger actually
  // searches. Measured 2026-09-23 against a live store: sending the display
  // text as the query matched nothing for 37 of 44 curated grocery lines, and
  // matched the WRONG PRODUCT for two more — "Ribs (racks)" came back as Rib
  // Rack® BBQ Sauce. The term is curated per line in knowledge/storeUnitMap.
  const line = (Array.isArray(items) ? items : [])
    .map((i) => ({ i, name: String((i && (i.name || i.item)) || '').trim() }))
    .filter((x) => x.name)
    .map(({ i, name }) => {
      const term = storeSearchTerm(i && i.line ? i.line : i);
      return term ? { name, term } : { name };
    });
  if (!line.length) return { configured: true, results: [], reason: 'no-items' };
  try {
    const res = await fetch(`${BASE}/api/shopping/kroger/search-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: line, locationId: loc }),
    });
    if (!res.ok) return { configured: true, results: [], reason: 'unavailable' };
    const d = await res.json();
    if (d && d.configured === false) return { configured: false, results: [], reason: 'no-keys' };
    if (d && d.error) return { configured: true, results: [], reason: d.error };
    return { configured: true, results: Array.isArray(d && d.results) ? d.results : [], reason: null };
  } catch (_e) {
    return { configured: true, results: [], reason: 'unavailable' };
  }
}
