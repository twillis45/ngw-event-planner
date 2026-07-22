// ─── procurement — POP-1E: the reusable procurement model ─────────────────────
//
// A GENUINE new capability, not composition: a generic contract that any
// provisioned good (blue crab today; catering, rentals, florals, bar later)
// implements to produce a fully-EXPLAINED estimate. The shape below is the
// contract — every field is required of every provider, so a wedding's caterer
// estimate and a crab feast's crab order read the same way and any surface can
// render either without knowing the good.
//
// DESIGN RULE (the doctrine's "every estimate must explain"): an estimate is a
// BAND with a stated confidence and its assumptions on the table — never a
// fake-precise number. That is what makes an estimated price honest here where
// buildCrabPlan (coverage/host-price only) deliberately refused to invent one:
// this layer is allowed to estimate BECAUSE it shows its work.
//
// A ProcurementEstimate:
//   {
//     good, label,
//     quantity:  { value, unit, breakdown:[{unit,count,size}] },
//     cost:      { low, high, currency, perPerson:{low,high} } | null,
//     explanation: {
//       assumptions:    [string],      // what the band rests on
//       pricingModel:   string,        // named model, e.g. 'wholesale-seasonal-band'
//       supplierType:   string,        // 'wholesale' | 'seafood-market' | 'retail' | …
//       regionalFactors:{ region, factor, note },
//       confidence:     'high'|'medium'|'low',
//       costReducers:   [{ label, hint }],
//     },
//     logistics: {
//       pickupWindow: { whenBeforeEvent, note } | null,
//       storage:      { note } | null,
//       transport:    { note } | null,
//       servingWaves: [{ wave, timing, note }],
//       cooking:      { note } | null,
//     },
//   }

import { buildCrabPlan, UNIT_LABEL, SIZE_LABEL, lineCrabCount, recommendCrabOrder } from './crabPlan';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (n) => Math.round(n);
const money = (n) => Math.round(n);

// ── Regional crab pricing signal (synchronous, source-aware) ─────────────────
// Blue crab is cheapest at its source (Chesapeake watershed) and climbs with
// distance/freight. A coarse factor with an honest note — never presented as a
// live quote. State comes from the caller (venueCity/profile "…, XX").
const CHESAPEAKE = new Set(['MD', 'VA', 'DE', 'DC']);
const NEAR_COAST = new Set(['NJ', 'NC', 'PA', 'SC', 'GA', 'NY', 'CT']);
function crabRegionFactor(state) {
  const s = String(state || '').toUpperCase();
  if (CHESAPEAKE.has(s)) return { region: 'Chesapeake', factor: 1.0, note: 'At the source — Chesapeake watershed pricing, the floor for blue crab.' };
  if (NEAR_COAST.has(s)) return { region: 'Mid-Atlantic / Southeast', factor: 1.15, note: 'Near the source — modest freight over Chesapeake pricing.' };
  if (!s) return { region: 'unknown', factor: 1.2, note: 'No location set — using a national-average band; set your area to tighten it.' };
  return { region: 'inland / far', factor: 1.35, note: 'Away from the coast — freight and lower supply widen the band.' };
}

// Per-DOZEN wholesale bands by size (USD), mid-season Chesapeake baseline. These
// are deliberately WIDE, LOW-confidence public-knowledge ranges — the estimate's
// whole honesty rests on the confidence flag + assumptions, not on precision.
const DOZEN_BAND = {
  medium:      [30, 55],
  large:       [45, 80],
  extra_large: [65, 110],
  jumbo:       [90, 150],
  mixed:       [45, 90],
  unknown:     [40, 95],
};
const PER_UNIT_MULT = { dozen: 1, half_bushel: 3.5, bushel: 7 }; // ~ crabs per unit vs a dozen
const CRABS_PER_BUSHEL = PER_UNIT_MULT.bushel * 12; // ~84 (7 dozen) — ONE source for pricing AND staging

// ── The crab-feast provider ──────────────────────────────────────────────────
// Consumes buildCrabPlan's coverage (single source, no re-derivation) and adds
// the estimated pricing band + logistics + full explanation.
function crabProvider(event, opts = {}) {
  const plan = buildCrabPlan(event);
  if (!plan || !plan.relevant) return null;

  const state = opts.state || null;
  const region = crabRegionFactor(state);
  const heads = plan.crabEatingHeadcount || 0;
  const target = plan.targetCrabsPerPerson || 6;
  const lines = Array.isArray(plan.lines) ? plan.lines.filter(l => num(l.quantity) > 0) : [];

  // Quantity — from the real order lines if present, else the coverage target.
  let breakdown, totalCrabs, quantityValue, quantityUnit;
  if (lines.length) {
    breakdown = lines.map(l => ({ unit: l.unit, count: num(l.quantity), size: l.size || 'unknown' }));
    totalCrabs = plan.totalEstimatedCrabs || lines.reduce((s, l) => s + (lineCrabCount(l) || 0), 0);
    quantityValue = totalCrabs; quantityUnit = 'crabs';
  } else if (heads) {
    // No lines yet — recommendCrabOrder is the single source for the starting
    // mix (bushel/half-bushel/dozen, kid-adjusted headcount) — no separate
    // re-derivation here.
    const rec = recommendCrabOrder(event);
    if (rec) {
      breakdown = rec.lines.map(l => ({ unit: l.unit, count: l.quantity, size: l.size }));
      totalCrabs = rec.totalCrabs;
    } else {
      totalCrabs = heads * target;
      breakdown = [];
    }
    quantityValue = totalCrabs; quantityUnit = 'crabs';
  } else {
    breakdown = []; totalCrabs = 0; quantityValue = 0; quantityUnit = 'crabs';
  }

  // Cost band — priced from the size/unit bands × region, unless the host has
  // already entered real prices (then defer to buildCrabPlan's honest actual).
  let cost = null;
  if (plan.costComplete && plan.totalEstimatedCost != null) {
    cost = { low: plan.totalEstimatedCost, high: plan.totalEstimatedCost, currency: 'USD',
      perPerson: heads ? { low: round(plan.totalEstimatedCost / heads), high: round(plan.totalEstimatedCost / heads) } : null };
  } else if (breakdown.length) {
    let lo = 0, hi = 0;
    for (const b of breakdown) {
      const band = DOZEN_BAND[b.size] || DOZEN_BAND.unknown;
      const mult = PER_UNIT_MULT[b.unit] || 1;
      lo += band[0] * mult * b.count * region.factor;
      hi += band[1] * mult * b.count * region.factor;
    }
    cost = { low: money(lo), high: money(hi), currency: 'USD',
      perPerson: heads ? { low: round(lo / heads), high: round(hi / heads) } : null };
  }

  const usingEstimate = !(plan.costComplete && plan.totalEstimatedCost != null);

  // ── The EXPLANATION — the POP-1E mandate, in full ──────────────────────────
  const assumptions = [];
  if (usingEstimate) {
    assumptions.push('Mid-season wholesale/seafood-market pricing, not a live quote.');
    assumptions.push(`Sized to ${heads || 'your'} ${heads === 1 ? 'person' : 'people'} at ~${target} crabs each${lines.length ? ' from your order' : ' (coverage target)'}.`);
    if (breakdown.some(b => b.size === 'unknown' || b.size === 'mixed')) assumptions.push('Size not fixed — mixed/size-TBD widens the band; a firm size tightens it.');
  } else {
    assumptions.push('Based on the prices you entered — a real cost, not an estimate.');
  }

  const costReducers = usingEstimate ? [
    { label: 'Buy by the bushel', hint: 'Bushel pricing beats by-the-dozen for the same crabs at feast scale.' },
    { label: 'Go one size down', hint: 'Large instead of jumbo can cut the band substantially with barely less meat.' },
    { label: 'Order mixed size', hint: 'A mixed bushel is cheaper than all-jumbo and eats the same at a picnic table.' },
    { label: 'Pick up, don’t deliver', hint: 'Self-pickup at the dock/market skips a delivery or freight markup.' },
    { label: 'Buy mid-week', hint: 'Weekend demand lifts price — a Thursday/Friday pickup often runs cheaper.' },
  ] : [];

  const explanation = {
    assumptions,
    pricingModel: usingEstimate ? 'wholesale-seasonal-band' : 'host-entered-actual',
    supplierType: 'seafood-market / wholesale',
    regionalFactors: region,
    confidence: usingEstimate ? (region.region === 'unknown' ? 'low' : (breakdown.some(b => b.size === 'unknown' || b.size === 'mixed') ? 'low' : 'medium')) : 'high',
    costReducers,
  };

  // ── Logistics — the operational reality a coverage number can't carry ──────
  const bushels = totalCrabs ? Math.ceil(totalCrabs / CRABS_PER_BUSHEL) : 0;
  const logistics = {
    pickupWindow: totalCrabs ? {
      whenBeforeEvent: 'same day, 2–4 hours ahead',
      note: 'Live or fresh-steamed crabs are a day-of pickup — order ahead, pick up the morning of. They don’t keep for tomorrow.',
    } : null,
    storage: totalCrabs ? {
      note: bushels > 1
        ? `${bushels} bushels: keep live crabs cool and damp (burlap over ice, never submerged) in the shade until the steam pot.`
        : 'Keep live crabs cool and damp (burlap over ice, never submerged) in the shade until they go in the pot.',
    } : null,
    transport: totalCrabs ? {
      note: 'Bushel baskets need trunk or truck-bed space and airflow — a sealed cooler suffocates live crabs. Line the trunk; they drip.',
    } : null,
    servingWaves: totalCrabs && heads ? [
      { wave: 1, timing: 'first steam', note: `Steam in batches of ~1 bushel; the first wave feeds the earliest ${Math.min(heads, 12)}.` },
      { wave: 2, timing: '+20–30 min', note: 'A second steam keeps later crabs hot instead of dumping everything cold at once.' },
    ] : [],
    cooking: totalCrabs ? {
      note: `Plan ~25–30 min per steamed batch; ${bushels > 1 ? bushels + ' bushels means staggered pots or a big steamer' : 'one bushel fits a large steamer pot'}. Old Bay + vinegar/water, layered.`,
    } : null,
  };

  return {
    good: 'blue_crab',
    label: 'Blue crabs',
    quantity: { value: quantityValue, unit: quantityUnit, breakdown },
    cost,
    explanation,
    logistics,
  };
}

// ── Provider registry — the reuse point ──────────────────────────────────────
// Weddings/retirement/corporate/charity add providers here (a caterer provider,
// a rentals provider) that return the SAME ProcurementEstimate shape. No surface
// changes when a new good is added — it just renders the contract.
const PROVIDERS = [
  { good: 'blue_crab', applies: (ev) => /crab/i.test(String(ev.type || '') + ' ' + String(ev.name || '')) || !!(ev.crabPlan), build: crabProvider },
];

// buildProcurementEstimate(event, opts) — the public entry. Returns the array of
// applicable estimates for this event (each a full ProcurementEstimate). Empty
// when nothing procurable applies. opts.state feeds regional pricing.
export function buildProcurementEstimate(event, opts = {}) {
  const ev = event || {};
  const out = [];
  for (const p of PROVIDERS) {
    let applies = false;
    try { applies = p.applies(ev); } catch { applies = false; }
    if (!applies) continue;
    let est = null;
    try { est = p.build(ev, opts); } catch { est = null; }
    if (est) out.push(est);
  }
  return out;
}

// Convenience single-good reader (the common case today: one crab order).
export function buildCrabProcurement(event, opts = {}) {
  return buildProcurementEstimate(event, opts).find(e => e.good === 'blue_crab') || null;
}

export { crabRegionFactor };
