// ─── WHERE A PRICE ON THIS PLAN CAME FROM ────────────────────────────────────
//
// Three sources can price a shopping line, and until now nothing said which one
// had. This module is the single place that decides, and the single place that
// names the answer.
//
//   1. STORE      a real shelf price from a real store the host picked.
//                 Kroger's product API returns it only when a locationId is
//                 supplied. Best number available, and available least often.
//   2. REGIONAL   the authored national band moved by a BLS regional factor.
//                 Four census regions — the finest geography BLS publishes for
//                 food, confirmed against their own fact sheet.
//   3. NATIONAL   the authored band as written. Honest, and the widest.
//
// THE ORDER IS THE WHOLE DESIGN. Each layer only ever REPLACES a worse one for
// the lines it can actually speak to, and never touches the rest. A store price
// for buns does not license a store claim about napkins; a Midwest factor for
// potatoes does not move the band for a rented tent.
//
// WHY THIS IS A MODULE AND NOT THREE BRANCHES AT THE CALL SITE. Today the food
// sheet and the money panel each answered "were these adjusted?" for themselves,
// and they gave a host opposite answers about the same numbers on the same
// screen. That was two layers. This is three. The only way three layers stay
// consistent across every surface is if exactly one thing knows the order.
//
// NOTHING HERE INVENTS A NUMBER. A line with no store match and no regional
// factor comes back exactly as authored, labelled national. The absence of a
// price is never filled in — it is reported.
import { applyGeo } from './knowledge/geoCostIndex';
import { geoItemForPurchase } from './knowledge/geoItemMap';

/** The layers, worst to best. Exported so a surface can sort or filter by rank. */
export const PRICE_LAYERS = Object.freeze({
  national: { rank: 0, label: 'National average' },
  regional: { rank: 1, label: 'Regional average' },
  store: { rank: 2, label: 'Your store' },
});

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : null);
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * THE ONE KEY. A store price is matched back to a plan line by the line's own
 * `item` text — the string the caller sent to Kroger and the string the router
 * echoes back verbatim. Both the index and every lookup go through here, so the
 * round trip cannot drift: if this changes, it changes on both sides at once.
 *
 * Written as a function rather than two `.toLowerCase()` calls on purpose. Two
 * copies of a key is the same defect as two copies of a fact, and the failure
 * is silent — an index that never hits reads exactly like a store with no
 * prices, which is the state a host is in most of the time anyway.
 */
export function storeKey(x) {
  return String((x && (x.item || x.name)) || '').trim().toLowerCase();
}

/**
 * Normalise whatever the Kroger client returned into { name -> {price, ...} }.
 * Matched-but-priceless rows are dropped: a product match with no price tells a
 * host nothing about cost, and keeping it would make `store` mean two things.
 */
export function storePriceIndex(results) {
  const out = new Map();
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || !r.matched) continue;
    const p = num(r.price);
    if (p === null || p <= 0) continue;
    const promo = num(r.promoPrice);
    out.set(storeKey(r), {
      price: p,
      // promo 0 from Kroger means "no sale", and the client drops it; anything
      // here is a real sale price and is what the host would actually pay.
      effective: promo !== null && promo > 0 ? promo : p,
      promo: promo !== null && promo > 0 ? promo : null,
      size: r.size || null,
      soldBy: r.soldBy || null,
      description: r.description || null,
      brand: r.brand || null,
    });
  }
  return out;
}

/**
 * Resolve ONE line against the three layers.
 *
 * `purchase` is the authored line (id + item text). `range` is its band as the
 * plan currently holds it. `state` and `storeIndex` are the two things that can
 * improve on it.
 *
 * Returns the band to show, which layer produced it, and a sentence a surface
 * can print without composing its own claim.
 */
export function priceForLine({ purchase, range, state, storeIndex } = {}) {
  const band = Array.isArray(range) && range.length === 2
    && num(range[0]) !== null && num(range[1]) !== null
    ? [num(range[0]), num(range[1])]
    : null;

  // ── 1. STORE ──────────────────────────────────────────────────────────────
  // A real shelf price is a POINT, not a band, and it replaces the band rather
  // than scaling it. Scaling an authored estimate by a real price would produce
  // a number that is neither.
  const hit = storeIndex instanceof Map ? storeIndex.get(storeKey(purchase)) : null;
  if (hit) {
    const p = round2(hit.effective);
    return {
      // ── `range` IS NULL ON PURPOSE, AND THIS IS THE LOAD-BEARING DECISION ──
      // A shelf price is priced per the STORE'S package — "1 gal", "12 pk",
      // soldBy "Unit". The plan's lines are in the plan's own units
      // (qtyPerGuest 1.5, unit 'lb'). Multiplying their number by our quantity
      // produces a confidently wrong total, which is worse than the estimate it
      // replaced because it looks like a fact.
      //
      // That reconciliation does not exist yet — it is the same commodity-vs-dish
      // mismatch geoItemMap solved with a curated allowlist, and it needs the
      // same deliberate treatment rather than a unit-guessing regex.
      //
      // So the store layer returns a REFERENCE a host can read ("your store has
      // this at $18.49 for a 12 pk") and no band a caller could multiply by
      // accident. When the unit map exists, this becomes a range and the
      // callers change with it — visibly, because they will have to.
      range: null,
      exact: p,
      size: hit.size || null,
      soldBy: hit.soldBy || null,
      layer: 'store',
      label: PRICE_LAYERS.store.label,
      because: hit.promo
        ? `On sale at your store: $${p.toFixed(2)}${hit.size ? ` · ${hit.size}` : ''} (was $${hit.price.toFixed(2)}).`
        : `Your store's shelf price: $${p.toFixed(2)}${hit.size ? ` · ${hit.size}` : ''}.`,
      product: hit.description || null,
    };
  }

  // ── 2. REGIONAL ───────────────────────────────────────────────────────────
  // Only for the lines geoItemMap allows — a curated allowlist, because BLS
  // prices commodities and this corpus prices dishes. `applyGeo` returns the
  // band untouched and flags `national` when it has no factor.
  if (band && state) {
    let itemKey = null;
    try { itemKey = geoItemForPurchase(purchase); } catch (_e) { itemKey = null; }
    if (itemKey) {
      let g = null;
      try { g = applyGeo(band, itemKey, state); } catch (_e) { g = null; }
      if (g && !g.national && Array.isArray(g.range)) {
        return {
          range: g.range,
          exact: null,
          layer: 'regional',
          label: PRICE_LAYERS.regional.label,
          because: g.basis || `Adjusted for your region from BLS average prices.`,
          product: null,
        };
      }
    }
  }

  // ── 3. NATIONAL ───────────────────────────────────────────────────────────
  return {
    range: band,
    exact: null,
    layer: 'national',
    label: PRICE_LAYERS.national.label,
    because: state
      ? 'National average — no regional or store price for this line.'
      : 'National average — add your venue state and we can localize what we can.',
    product: null,
  };
}

/**
 * LABEL a line whose band is already priced, instead of pricing it again.
 *
 * `priceForLine` above is for a caller holding an AUTHORED band. The food plan
 * is not that caller: `playbookFoodPlan` already multiplied `perUnitLow/High`
 * by the regional factor before the shell ever sees a line. Re-running the
 * regional layer over those numbers would apply the factor twice — a silent
 * ~12% error in the Northeast that never throws and never looks wrong.
 *
 * So this function NEVER returns a range and never does band arithmetic. It
 * reads what the engine recorded (`geoBasis`, written where the factor was
 * chosen) and says which layer that was, then lets a store price outrank it.
 *
 * The store layer still carries `exact`, because a shelf price is a fact the
 * engine does not have and a host can act on — but as a reference beside the
 * band, never as a replacement for it. Same reason `priceForLine` nulls the
 * range: Kroger prices their package, the plan counts plan units.
 */
export function layerForLine({ purchase, geoBasis, storeIndex } = {}) {
  const hit = storeIndex instanceof Map ? storeIndex.get(storeKey(purchase)) : null;
  if (hit) {
    const p = round2(hit.effective);
    return {
      layer: 'store',
      label: PRICE_LAYERS.store.label,
      exact: p,
      size: hit.size || null,
      onSale: !!hit.promo,
      was: hit.promo ? round2(hit.price) : null,
      product: hit.description || null,
      because: hit.promo
        ? `On sale at your store: $${p.toFixed(2)}${hit.size ? ` · ${hit.size}` : ''} (was $${round2(hit.price).toFixed(2)}).`
        : `Your store's shelf price: $${p.toFixed(2)}${hit.size ? ` · ${hit.size}` : ''}.`,
    };
  }
  if (geoBasis && Number(geoBasis.factor) > 0 && Number(geoBasis.factor) !== 1) {
    return {
      layer: 'regional',
      label: PRICE_LAYERS.regional.label,
      exact: null, size: null, onSale: false, was: null, product: null,
      scope: geoBasis.scope === 'item' ? 'item' : 'basket',
      // The two regional answers are NOT the same quality and are not described
      // as if they were. One is this commodity's own published series; the other
      // is the region's basket mean standing in for a line BLS prices nothing
      // like. A host who reads "regional" for both cannot tell which they got.
      because: geoBasis.scope === 'item'
        ? 'Adjusted for your region from this item’s own BLS average price.'
        : 'Adjusted for your region from the regional average — no published price for this line itself.',
    };
  }
  return {
    layer: 'national',
    label: PRICE_LAYERS.national.label,
    exact: null, size: null, onSale: false, was: null, product: null,
    because: 'National average — nothing local moved this line.',
  };
}

/**
 * The one-line summary a sheet can show over a list: how many lines each layer
 * actually reached. Counted, never estimated — this is the number that keeps
 * the feature honest when coverage is thin, which it usually is.
 */
export function layerCoverage(lines) {
  const out = { store: 0, regional: 0, national: 0, regionalItem: 0, total: 0 };
  for (const l of Array.isArray(lines) ? lines : []) {
    if (!l || !l.layer) continue;
    out.total += 1;
    if (out[l.layer] !== undefined) out[l.layer] += 1;
    // Counted separately because the regional layer answers at two different
    // qualities and the summary must not average them into one claim: 12 of the
    // 491 authored lines in this corpus have their own published BLS series;
    // everything else takes the region's basket mean.
    if (l.layer === 'regional' && l.scope === 'item') out.regionalItem += 1;
  }
  return out;
}

/**
 * The sentence for the whole sheet. Names the BEST layer that actually reached
 * anything and says how far it got, so "your store" never implies every line.
 */
export function coverageNote(cov) {
  const c = cov || { store: 0, regional: 0, national: 0, total: 0 };
  if (!c.total) return null;
  if (c.store) {
    return c.store === c.total
      ? 'Every line priced at your store.'
      : `${c.store} of ${c.total} lines priced at your store; the rest are averages.`;
  }
  if (c.regional) {
    const head = c.regional === c.total
      ? 'Every line adjusted for your region.'
      : `${c.regional} of ${c.total} lines adjusted for your region; the rest are national averages.`;
    // Without this clause, "every line adjusted for your region" reads as though
    // every line has a published local price. Almost none do.
    return c.regionalItem
      ? `${head} ${c.regionalItem} use that item’s own published price; the rest use the regional average.`
      : head;
  }
  return 'National averages — no store or regional price for these lines yet.';
}
