// Instacart — send the shopping list to a pre-filled cart for pickup/delivery.
// Talks to the FastAPI proxy (REACT_APP_API_BASE_URL); the Instacart key lives only
// on the server. Degrades honestly: no backend / no key / failure → { configured:false }
// or { url:null }, and the caller falls back to the plain Instacart search link.

import { BRAND } from './brand';
const BASE = process.env.REACT_APP_API_BASE_URL;

/**
 * Is a real pre-filled cart even possible right now?
 *
 * ── WHY THIS EXISTS: THE AWAIT WAS THE BUG (2026-09-25) ────────────────────
 *
 * `instacartCart` is a POST that has to finish before the caller knows whether
 * to open a cart or fall back. Driven on an iPhone, the tap opened Instacart in
 * the SAME tab — mobile Safari does that — which tore the page down mid-await.
 * The promise never settled, `setSendingCart(false)` never ran, and coming back
 * restored a cached page with the button frozen on "Sending…" forever. The
 * fallback never executed either, so the host got a generic storefront instead
 * of their list.
 *
 * Asking the cheap question ONCE, up front, removes the await from the click
 * entirely on the path that runs every time today: with no key configured the
 * handler is fully synchronous and can navigate inside the tap, which is also
 * the only way Safari will allow it.
 *
 * Fails CLOSED. Anything other than a clear yes is treated as no, because the
 * fallback works and a hung cart request does not.
 */
export async function instacartConfigured() {
  if (!BASE) return false;
  try {
    const res = await fetch(`${BASE}/api/shopping/instacart/status`);
    if (!res.ok) return false;
    const j = await res.json();
    return !!(j && j.configured);
  } catch { return false; }
}

// Returns a URL to a pre-filled Instacart list, or null when unavailable.
export async function instacartCart(title, items) {
  if (!BASE) return { configured: false, url: null };
  const line = (items || [])
    .filter((i) => i && String(i.name || '').trim())
    .map((i) => ({ name: String(i.name).trim(), quantity: Number(i.quantity || i.qty) > 0 ? Number(i.quantity || i.qty) : 1, unit: String(i.unit || 'each').trim() || 'each' }));
  try {
    const res = await fetch(`${BASE}/api/shopping/instacart-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || `${BRAND.full} shopping list`, items: line }),
    });
    if (!res.ok) return { configured: true, url: null };
    return await res.json();
  } catch (e) {
    return { configured: false, url: null };
  }
}

// The honest fallback when there's no API/cart — opens Instacart search.
export const INSTACART_FALLBACK = 'https://www.instacart.com/store/s?k=' + encodeURIComponent('grocery');

/**
 * instacartSearchUrl('Bone-in spiral ham')
 *   -> https://www.instacart.com/store/s?k=Bone-in%20spiral%20ham
 *
 * ── ONE ITEM AT A TIME BEATS A PASTE THAT CANNOT WORK (2026-09-25) ──────────
 *
 * With no API key the app copied the shopping list and told the host to "paste
 * it into Instacart". Measured: that clipboard payload is a 30-line, 1,208-
 * character DOCUMENT — a title, section headers, "[ ]" checkboxes, quantities,
 * per-guest rates and an estimated total. Instacart's search box takes one
 * query. The instruction could not succeed, which makes it the kind of CTA
 * UX_07 exists to forbid.
 *
 * The `?k=` parameter, on the other hand, genuinely searches. Verified twice:
 * by fetch (`?k=collard greens` returns <title>Collard Greens Delivery or
 * Pickup Near Me | Instacart</title>) and by driving it on an iPhone, where
 * `?k=bone-in spiral ham` returned Food Lion and Sprouts with real shelf
 * prices and a green + on every product.
 *
 * AND THE CART ACCUMULATES. The + adds to the host's Instacart session, not to
 * a per-link basket, so stepping through the list one item at a time builds a
 * real cart with no key at all. The paid Products Link API is not what makes a
 * cart possible here; it is what removes the tapping.
 *
 * NOTE THE LIMIT HONESTLY: this is a SEARCH, not a match. Instacart decides
 * what comes back, and a generic term can return the wrong aisle — the repo
 * has live evidence of that shape ("ice" matching Lipton Iced Tea Bags). The
 * host picks the product, which is why this opens a search rather than
 * claiming an item.
 */
export function instacartSearchUrl(term) {
  const q = String(term == null ? '' : term).trim();
  if (!q) return INSTACART_FALLBACK;
  return 'https://www.instacart.com/store/s?k=' + encodeURIComponent(q);
}
