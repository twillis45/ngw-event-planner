// Instacart — send the shopping list to a pre-filled cart for pickup/delivery.
// Talks to the FastAPI proxy (REACT_APP_API_BASE_URL); the Instacart key lives only
// on the server. Degrades honestly: no backend / no key / failure → { configured:false }
// or { url:null }, and the caller falls back to the plain Instacart search link.

const BASE = process.env.REACT_APP_API_BASE_URL;

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
      body: JSON.stringify({ title: title || 'Event Boss shopping list', items: line }),
    });
    if (!res.ok) return { configured: true, url: null };
    return await res.json();
  } catch (e) {
    return { configured: false, url: null };
  }
}

// The honest fallback when there's no API/cart — opens Instacart search.
export const INSTACART_FALLBACK = 'https://www.instacart.com/store/s?k=' + encodeURIComponent('grocery');
