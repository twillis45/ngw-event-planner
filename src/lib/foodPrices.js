// Sprint 60D · Option B — current regional food-price factor client.
// Fetches a real, current regional price factor (BLS Average Price, via the backend
// proxy) so the food plan can scale its synthesized national estimates to the
// event's local area. Honest: it is REGIONAL (4 census regions), not per-store —
// the UI must label it so — and it degrades to factor 1.0 (no adjustment) whenever
// the backend or BLS is unavailable, so the food plan never breaks on a price miss.
const BASE = process.env.REACT_APP_API_BASE_URL;

export function isFoodPricesConfigured() {
  return !!BASE;
}

// The safe no-op: a 1.0 factor with no regional claim.
const NEUTRAL = Object.freeze({
  factor: 1, region: 'us', regionLabel: 'U.S.', month: null,
  source: 'BLS Average Price', note: null,
  // Per-item factors, keyed by geoItemMap's item names. Empty is the honest
  // no-data answer: every line then takes the basket mean.
  itemFactors: Object.freeze({}),
});

// getFoodPriceFactor({ region, state }) → { factor, region, regionLabel, month, source, note }.
// Pass a census region ('ne'|'mw'|'south'|'west') or a 2-letter state; the backend
// resolves state→region. Never throws.
// ── TWO VOCABULARIES FOR ONE SET OF REGIONS, RECONCILED HERE ────────────────
// The backend keys its BLS areas on 'ne' | 'mw' | 'south' | 'west'
// (food_prices.py `_AREA`), while geoCostIndex — the one place this repo defines
// what a region IS — uses the Census names 'northeast' | 'midwest' | 'south' |
// 'west'. Callers were previously forced to know the backend's spelling, and a
// caller passing the Census name got `reg not in _AREA` on the server, which
// silently falls back to 'us' and a factor of 1.0. That is the worst shape of
// failure available here: a regional adjustment that reports success and does
// nothing. Translated at the boundary so both spellings work.
const REGION_WIRE = Object.freeze({ northeast: 'ne', midwest: 'mw', south: 'south', west: 'west' });

export async function getFoodPriceFactor({ region, state } = {}) {
  if (!BASE) return NEUTRAL;
  const qs = new URLSearchParams();
  if (region) {
    const r = String(region).trim().toLowerCase();
    qs.set('region', REGION_WIRE[r] || r);
  }
  if (state) qs.set('state', String(state));
  try {
    const res = await fetch(`${BASE}/api/food-prices?${qs.toString()}`);
    if (!res.ok) return NEUTRAL;
    const d = await res.json();
    const factor = Number(d.factor) > 0 ? Number(d.factor) : 1;
    return {
      factor,
      region: d.region || 'us',
      regionLabel: d.region_label || 'U.S.',
      month: d.month || null,
      source: d.source || 'BLS Average Price',
      note: d.note || null,
      // Per-item regional factors (2026-08-16). The backend already computed
      // these and discarded them with fmean; now it returns them. Only numbers
      // in a sane band survive — a malformed payload must not reach a price.
      itemFactors: (() => {
        const raw = d && d.item_factors;
        if (!raw || typeof raw !== 'object') return {};
        const out = {};
        for (const [k, v] of Object.entries(raw)) {
          const n = Number(v);
          if (n > 0.5 && n < 2) out[k] = n;
        }
        return out;
      })(),
    };
  } catch {
    return NEUTRAL;
  }
}
