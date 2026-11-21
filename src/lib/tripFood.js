// ─── tripFood — the celebration's parts and the trip's food money ────────────
//
// Owner decision 11/21/2026 ("B with A's money"). The playbook-aware half of
// the trip-food model; the leaf half (days, the night, the meals) is
// tripMeals.js, which the guest invite can load.
//
// ONE CALCULATION, TWO LAYERS. `tripFoodMoney` is the only place the trip's
// food is added up. The Spread and Your money both render it:
//   "The celebration" — the dinner: the Spread's live estimate (the caller
//     passes the number the Spread shows), or, when the dinner is at a
//     restaurant, the restaurant rate before drinks, tax and tip.
//   "Around it" — the trip's other meals: on-your-own is $0 to the host; a
//     meal out where each person pays (or the table splits) is $0 to the host;
//     a DINNER out the host covers is the restaurant rate per head; breakfast
//     or lunch out the host covers, and meals at the house, have no price
//     source here, so they are counted and named — never priced by invention.
import { getPlaybook, decisionAnswered, isMenuDecision } from './playbooks';
import { guestCountFor } from './guestCountFor';
import { accessNeedsFor } from './accessNeeds';
import { venueFor } from './venueFor';
import {
  celebrationAppliesWith, celebrationNight, celebrationTitle, celebrationPlace,
  aroundMeals, mealsOutPayer, placeWithArticle,
} from './tripMeals';

/** The celebration dinner applies to this event (destination, multi-day, a type with one). */
export function celebrationApplies(event) {
  const pb = (() => { try { return getPlaybook(event && event.type); } catch { return null; } })();
  return celebrationAppliesWith(event, pb);
}

// boxedlunch-restaurant-2026: "a three-course mid-range meal for two is $80
// nationally (range $50-150), i.e. about $40 a head before drinks and tip."
// Dinners only — the source prices a dinner, not a breakfast or a lunch.
export const RESTAURANT_DINNER = { low: 25, high: 75, source: 'boxedlunch-restaurant-2026' };

/** The dinner is at a restaurant when the place she named, or the venue, says so. */
export function celebrationAtRestaurant(event) {
  const ev = event || {};
  const words = `${celebrationPlace(ev) || ''} ${ev.venue || ''} ${ev.venueKind === 'restaurant' ? 'restaurant' : ''}`;
  return /\b(restaurant|bistro|steakhouse|trattoria|brasserie|tavern|cantina|supper club)\b/i.test(words);
}

const n0 = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

/**
 * tripFoodMoney(event, { foodEstimate: { low, high } }) → {
 *   celebration: { title, low, high, basis: 'spread'|'restaurant', guests } | null,
 *   around: { plan, total, planned, rows: [{ mode, count, low, high, payer?, needsPriceSource, unpriced }] },
 *   totalLow, totalHigh, unpricedMeals, sources,
 * }
 */
export function tripFoodMoney(event, { foodEstimate } = {}) {
  const ev = event || {};
  const cel = celebrationApplies(ev);
  const guests = (() => { try { return guestCountFor(ev).count || null; } catch { return null; } })();
  const sources = [];

  let celebration = null;
  if (cel) {
    if (celebrationAtRestaurant(ev) && guests) {
      celebration = { title: celebrationTitle(ev), low: RESTAURANT_DINNER.low * guests, high: RESTAURANT_DINNER.high * guests, basis: 'restaurant', guests };
      sources.push(RESTAURANT_DINNER.source);
    } else {
      const lo = n0(foodEstimate && foodEstimate.low);
      const hi = n0(foodEstimate && foodEstimate.high);
      celebration = { title: celebrationTitle(ev), low: lo, high: hi, basis: 'spread', guests };
    }
  }

  const a = aroundMeals(ev, { celebration: cel });
  const payer = mealsOutPayer(ev);
  const outSlots = a.slots.filter((s) => s.mode === 'out');
  const outDinners = outSlots.filter((s) => s.meal === 'dinner').length;
  const hostPays = payer === 'host';
  const outUnpriced = hostPays ? outSlots.length - outDinners : 0;
  let outLow = 0;
  let outHigh = 0;
  if (hostPays && outDinners) {
    if (guests) {
      outLow = RESTAURANT_DINNER.low * guests * outDinners;
      outHigh = RESTAURANT_DINNER.high * guests * outDinners;
      sources.push(RESTAURANT_DINNER.source);
    } else { outLow = null; outHigh = null; }
  }
  const rows = [
    { mode: 'out', count: a.counts.out, payer, low: outLow, high: outHigh, needsPriceSource: outUnpriced > 0 || outLow == null, unpriced: outUnpriced },
    { mode: 'house', count: a.counts.house, low: null, high: null, needsPriceSource: a.counts.house > 0, unpriced: a.counts.house },
    { mode: 'own', count: a.counts.own, low: 0, high: 0, needsPriceSource: false, unpriced: 0 },
  ];

  const celLow = celebration && celebration.low != null ? celebration.low : 0;
  const celHigh = celebration && celebration.high != null ? celebration.high : 0;
  const totalLow = celLow + (a.counts.out && outLow ? outLow : 0);
  const totalHigh = celHigh + (a.counts.out && outHigh ? outHigh : 0);
  return {
    celebration,
    around: { plan: a.plan, total: a.total, planned: a.planned, rows },
    totalLow,
    totalHigh,
    unpricedMeals: rows.reduce((s, r) => s + (r.unpriced || 0), 0),
    sources: [...new Set(sources)],
  };
}

/** "1 out together · 4 at the house · 2 on your own" — the around layer in words. */
export function aroundSummary(money) {
  const by = Object.fromEntries(((money && money.around && money.around.rows) || []).map((r) => [r.mode, r.count]));
  return [
    by.out ? `${by.out} out together` : null,
    by.house ? `${by.house} at the house` : null,
    by.own ? `${by.own} on your own` : null,
  ].filter(Boolean).join(' · ');
}

/**
 * dinnerParts(event) → the dinner's parts, each OWNED by another sheet. The
 * dinner sheet shows each part's state and links to its owner; it edits none
 * of them (01_PRODUCT_ARCHITECTURE_GUARDRAILS: no second command center).
 *   { id, label, set, goes, sub?, stepFree? }
 */
export function dinnerParts(event) {
  const ev = event || {};
  const pb = (() => { try { return getPlaybook(ev.type); } catch { return null; } })();
  const decs = (pb && Array.isArray(pb.decisions)) ? pb.decisions : [];
  const night = celebrationNight(ev);
  const place = celebrationPlace(ev);
  const vf = (() => { try { return venueFor(ev); } catch { return null; } })();
  const drinks = decs.find((d) => d && d.drinksCall === true) || null;
  const cake = decs.find((d) => d && /^cake/i.test(String(d.id || ''))) || null;
  const foodId = (pb && pb.cookLever && pb.cookLever.decision)
    || ((decs.find((d) => d && isMenuDecision(d) && d !== drinks && d !== cake && !/diet|headcount|guest/i.test(d.id))) || {}).id
    || null;
  const stepFree = (() => {
    try { const r = accessNeedsFor(ev).requirements.find((x) => x.kind === 'step-free'); return r ? (r.phrase || 'a step-free need') : null; } catch { return null; }
  })();
  const walkDone = (Array.isArray(ev.timeline) ? ev.timeline : []).some((t) => t && t.id === `pbt-${ev.id}-dest_t_access` && t.done);
  const seated = (Array.isArray(ev.guests) ? ev.guests : []).some((g) => g && g.tableNum != null && g.tableNum !== '');

  const parts = [
    { id: 'night', label: 'The night', set: night.picked, goes: 'night' },
    { id: 'place', label: 'The place', set: !!(vf && vf.isSet && ev.venueKind !== 'home'), goes: 'venue', sub: place ? `You wrote “${placeWithArticle(place)}” — which one?` : null },
    foodId ? { id: 'food', label: 'Who makes the dinner', set: decisionAnswered(ev, foodId), goes: 'foodplan', decision: foodId } : null,
    drinks ? { id: 'drinks', label: 'Drinks', set: decisionAnswered(ev, drinks.id), goes: 'foodplan', decision: drinks.id } : null,
    cake ? { id: 'cake', label: cake.label || 'The cake', set: decisionAnswered(ev, cake.id), goes: 'foodplan', decision: cake.id } : null,
    { id: 'seats', label: 'Seats and the path in', set: stepFree ? walkDone : seated, goes: 'seating', stepFree },
  ];
  return parts.filter(Boolean);
}
