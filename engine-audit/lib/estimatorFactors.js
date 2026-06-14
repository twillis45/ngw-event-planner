// demo/src/lib/estimatorFactors.js
// Sprint 57g · Compression-Aware Estimator Factors
//
// PROBLEM
// -------
// The estimator was (event type × guest count × metro × rush/compression).
// Useful, not world-class. A Saturday evening wedding on Labor Day weekend
// in peak season should not estimate the same as a Wednesday brunch in
// February. Catering and venue invoices routinely add 20% service + 6% tax
// on top of a base quote. Last-minute changes need a planning buffer.
//
// DECISION
// --------
// Add four transparent factors that compose with the existing rush/compression
// + metro stack. Every factor:
//   - returns a multiplier the estimator can fold in
//   - returns a friendly label and explanation for the breakdown panel
//   - is opt-in or auto-detected from the event date (planner never has to
//     remember to add a holiday premium — we surface it)
//
// SOURCE OF TRUTH
// ---------------
// Factors are derived from inputs the planner already has: event date,
// event type, time-of-day chip, two toggle states. No new persisted fields.
// Existing rush/compression vocabulary (TIGHT / COMPRESSED / RUSH) is reused
// as-is from Sprint 57e — this file does NOT introduce a competing threshold.
//
// LANGUAGE
// --------
// Every label is planner-native. No "guaranteed market rate". No "exact tax".
// Service+Tax line is labeled "Estimated service charge + tax" because the
// rate IS configurable per region — we can't promise a jurisdiction match.

// ─── Date-premium constants ──────────────────────────────────────────────────

// US holiday weekends. Each entry expresses the rule used to evaluate a given
// date; year-agnostic so this works any year without maintenance.
// Format: { test: (dateObj) => boolean, label, weight }.
// Weight stacks via Math.max — we never double-count two holidays on the
// same date.
const isMemorialDayWeekend = (d) => {
  // Memorial Day = last Monday of May. Weekend = Sat/Sun/Mon of that week.
  if (d.getMonth() !== 4) return false; // May
  const day = d.getDay();
  if (day !== 0 && day !== 1 && day !== 6) return false;
  // Find this calendar week's Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  // Is it the LAST Monday of May? Next Monday must be in June.
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return nextMonday.getMonth() === 5;
};

const isLaborDayWeekend = (d) => {
  // Labor Day = first Monday of September. Weekend = Sat/Sun/Mon.
  if (d.getMonth() !== 8) return false; // September
  const day = d.getDay();
  if (day !== 0 && day !== 1 && day !== 6) return false;
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.getDate() <= 7; // Monday is in first week
};

const isJulyFourthWeekend = (d) => {
  // Treat July 3, 4, 5 + nearest Sat/Sun as premium.
  if (d.getMonth() !== 6) return false;
  const day = d.getDate();
  return day >= 3 && day <= 5;
};

const isThanksgivingWeekend = (d) => {
  // Thanksgiving = 4th Thursday of November.
  if (d.getMonth() !== 10) return false; // November
  const day = d.getDay();
  // Wed (3) thru Sun (0) of Thanksgiving week.
  if (day < 4 && day !== 0) return false; // exclude Mon/Tue
  // Find the 4th Thursday
  let thursday = null;
  for (let i = 1; i <= 30; i++) {
    const test = new Date(d.getFullYear(), 10, i);
    if (test.getDay() === 4) {
      if (!thursday) thursday = test;
      else if (test.getDate() <= 28) thursday = test;
      else break;
    }
  }
  if (!thursday) return false;
  const diff = (d - thursday) / 86400000;
  return diff >= -1 && diff <= 3; // Wed thru Sun
};

const isNewYearsEve = (d) => d.getMonth() === 11 && d.getDate() === 31;
const isNewYearsDay = (d) => d.getMonth() === 0 && d.getDate() === 1;
const isValentinesDay = (d) => d.getMonth() === 1 && d.getDate() === 14;
const isChristmasWeek = (d) => d.getMonth() === 11 && d.getDate() >= 22 && d.getDate() <= 26;

export const US_HOLIDAYS = [
  { test: isNewYearsEve,         label: "New Year's Eve",     premium: 0.30 },
  { test: isNewYearsDay,         label: "New Year's Day",     premium: 0.20 },
  { test: isValentinesDay,       label: "Valentine's Day",    premium: 0.15 },
  { test: isMemorialDayWeekend,  label: 'Memorial Day weekend', premium: 0.20 },
  { test: isJulyFourthWeekend,   label: 'July 4 weekend',     premium: 0.20 },
  { test: isLaborDayWeekend,     label: 'Labor Day weekend',  premium: 0.20 },
  { test: isThanksgivingWeekend, label: 'Thanksgiving weekend', premium: 0.15 },
  { test: isChristmasWeek,       label: 'Christmas week',     premium: 0.25 },
];

// Wedding-season demand. May–October is the heavy band in most US markets.
// This is a planning premium, not a market rate — copy clearly hedges.
const PEAK_WEDDING_MONTHS_SET = new Set([4, 5, 6, 7, 8, 9]); // 0-indexed: May–Oct
export const isPeakWeddingSeason = (d) => PEAK_WEDDING_MONTHS_SET.has(d.getMonth());

// Day-of-week premiums. Saturday is the heavy hitter.
const DOW_PREMIUM = {
  0: { premium: 0.00, label: 'Sunday' },
  1: { premium: 0.00, label: 'Monday' },
  2: { premium: 0.00, label: 'Tuesday' },
  3: { premium: 0.00, label: 'Wednesday' },
  4: { premium: 0.00, label: 'Thursday' },
  5: { premium: 0.10, label: 'Friday' },
  6: { premium: 0.20, label: 'Saturday' },
};

// Cap on the total date-premium multiplier so an evening Saturday in
// peak season ON a holiday weekend doesn't compound into an absurd number.
// 45% feels honest as a "this is a high-demand date" ceiling without
// pretending we modeled every contract.
export const DATE_PREMIUM_CAP = 0.45;

// ─── Date premium ───────────────────────────────────────────────────────────

// Parse YYYY-MM-DD into a local-midnight Date safely.
const parseISODate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

// Return { multiplier, label, components, explanation } for date-driven
// budget premium. Multiplier = 1 + sum_of_components capped at 1 + CAP.
// `components` is the breakdown the UI shows so the planner sees WHY.
//
// `eventType` is currently advisory — peak-wedding-season only fires for
// Wedding / Vow Renewal / Quinceañera / Engagement Party / Bridal Shower
// where the seasonal demand band is real. Other types ignore peak season.
const WEDDING_FAMILY_TYPES = new Set([
  'Wedding', 'Vow Renewal', 'Quinceañera',
  'Engagement Party', 'Bridal Shower',
]);

export const getDatePremium = (eventDate, eventType) => {
  const d = parseISODate(eventDate);
  if (!d) return {
    multiplier: 1,
    label: null,
    components: [],
    explanation: null,
  };

  const components = [];

  // Day-of-week
  const dow = DOW_PREMIUM[d.getDay()];
  if (dow && dow.premium > 0) {
    components.push({
      key: 'dow',
      label: `${dow.label} premium`,
      premium: dow.premium,
      explanation: `${dow.label}s book up faster — vendors and venues commonly charge more.`,
    });
  }

  // Holiday
  for (const h of US_HOLIDAYS) {
    if (h.test(d)) {
      components.push({
        key: 'holiday',
        label: `${h.label}`,
        premium: h.premium,
        explanation: `${h.label} is a high-demand date — expect a planning premium.`,
      });
      break; // one holiday match is enough
    }
  }

  // Peak wedding season (only for wedding-family types)
  if (eventType && WEDDING_FAMILY_TYPES.has(eventType) && isPeakWeddingSeason(d)) {
    components.push({
      key: 'season',
      label: 'Peak wedding season',
      premium: 0.15,
      explanation: 'May–October are the heaviest demand months for weddings in most US markets.',
    });
  }

  // Sum + cap
  const rawSum = components.reduce((s, c) => s + c.premium, 0);
  const capped = Math.min(rawSum, DATE_PREMIUM_CAP);
  const cappedAtCap = rawSum > DATE_PREMIUM_CAP;
  const multiplier = 1 + capped;

  // Friendly summary
  let label = null;
  if (components.length === 0) label = null;
  else if (components.length === 1) label = components[0].label;
  else label = `${components.length} date factors`;

  const explanation = components.length === 0
    ? null
    : `${components.map(c => c.label).join(' + ')} — ${cappedAtCap ? `capped at ${Math.round(DATE_PREMIUM_CAP * 100)}% so the estimate stays honest.` : `~+${Math.round(capped * 100)}% planning premium.`}`;

  return { multiplier, label, components, explanation, cappedAtCap };
};

// ─── Time-of-day factor ─────────────────────────────────────────────────────

export const TIME_OF_DAY_SLOTS = [
  { key: 'morning',   label: 'Morning / Brunch', shortLabel: 'Morning',  multiplier: 0.85, explanation: 'Morning and brunch events often run shorter and use lighter staffing — a planning discount is typical.' },
  { key: 'afternoon', label: 'Afternoon',        shortLabel: 'Afternoon',multiplier: 1.00, explanation: 'Afternoon is the baseline assumption — no time-of-day adjustment.' },
  { key: 'evening',   label: 'Evening',          shortLabel: 'Evening',  multiplier: 1.10, explanation: 'Evenings often require extended staffing, lighting, and bar service — small planning premium.' },
  { key: 'late',      label: 'Late-night',       shortLabel: 'Late-night',multiplier: 1.25, explanation: 'Late-night events typically need overtime, transportation, and extended vendor coverage.' },
];

export const getTimeOfDayFactor = (slotKey) => {
  const found = TIME_OF_DAY_SLOTS.find(s => s.key === slotKey);
  if (!found) return { multiplier: 1, label: null, explanation: null, key: null };
  return {
    multiplier: found.multiplier,
    label: found.label,
    explanation: found.explanation,
    key: found.key,
  };
};

// ─── Service charges + tax ──────────────────────────────────────────────────
//
// We surface these as ONE combined factor because invoices typically apply
// them together as "service + tax" line items. Default rates reflect common
// US catering norms — they are estimates, never claimed as exact for any
// jurisdiction.

export const SERVICE_CHARGE_DEFAULT = 0.20; // common US catering norm
export const TAX_DEFAULT             = 0.06; // estimated baseline; varies wildly by state
export const SERVICE_TAX_DEFAULT_ON  = true;

// Compose to one multiplier. Tax usually applies on the (subtotal + service)
// bundle in many jurisdictions; we use the same convention here to stay
// close to how real invoices read.
//
// Sprint 57h: rates can now come from per-studio profile defaults
// (`profile.defaultServiceRate` / `profile.defaultTaxRate`). When the caller
// passes nullish / undefined, we fall back to the SERVICE_CHARGE_DEFAULT and
// TAX_DEFAULT constants — same behavior as Sprints 57g/57g.1. We also expose
// a `source` flag so the breakdown UI can label the line "Using studio
// defaults" vs "Using default planning rates" honestly.
export const getServiceTaxFactor = (enabled, serviceRate, taxRate) => {
  if (!enabled) return {
    multiplier: 1, label: null, explanation: null,
    serviceRate: 0, taxRate: 0, source: 'disabled',
  };
  const sourceService = (serviceRate ?? null) !== null;
  const sourceTax     = (taxRate ?? null) !== null;
  const sr = sourceService ? serviceRate : SERVICE_CHARGE_DEFAULT;
  const tr = sourceTax     ? taxRate     : TAX_DEFAULT;
  const multiplier = (1 + sr) * (1 + tr);
  // Source tag: 'studio' if BOTH rates came from profile, 'mixed' if one of
  // each, 'default' if neither (i.e. profile has no overrides yet).
  const source = sourceService && sourceTax ? 'studio'
               : sourceService || sourceTax ? 'mixed'
               : 'default';
  const sourceWord = source === 'studio' ? 'studio defaults'
                   : source === 'mixed'  ? 'studio defaults (partial)'
                                         : 'default planning rates';
  return {
    multiplier,
    label: 'Estimated service charge + tax',
    explanation: `Using ${sourceWord}: ~${Math.round(sr * 100)}% service · ~${Math.round(tr * 100)}% tax. Rates vary by region — turn off if your contracts already include them.`,
    serviceRate: sr,
    taxRate:     tr,
    source,
  };
};

// ─── Contingency buffer ─────────────────────────────────────────────────────

export const CONTINGENCY_DEFAULT_RATE = 0.10;
export const CONTINGENCY_DEFAULT_ON   = false;

export const getContingencyFactor = (enabled, rate = CONTINGENCY_DEFAULT_RATE) => {
  if (!enabled) return { multiplier: 1, label: null, explanation: null, rate: 0 };
  return {
    multiplier: 1 + rate,
    label: 'Planning contingency',
    explanation: `Adds ~${Math.round(rate * 100)}% as a planning buffer for last-minute changes, delivery fees, or small misses. Recommended for tighter timelines and luxury-tier events.`,
    rate,
  };
};

// ─── Composite estimator ────────────────────────────────────────────────────
//
// Given the base per-head price plus all factor inputs, return:
//   - perHead       — final per-head amount after all factors
//   - total         — rounded total for the guest count
//   - breakdown[]   — line items the UI can render transparently
//
// `breakdown` includes every applied factor with its delta vs base, so the
// planner sees exactly where each dollar went. We intentionally compute
// each factor's delta against the *prior* running total so the line items
// add up to the final number (no hidden compounding mystery).

export const computeEstimatorBreakdown = ({
  basePerHead,
  guests,
  metroFactor = 1,
  rushFactor = 1,
  datePremium = { multiplier: 1, components: [], label: null },
  timeOfDay = { multiplier: 1, label: null },
  serviceTax = { multiplier: 1, label: null },
  contingency = { multiplier: 1, label: null },
  metroLabel = null,
  rushLabel = null,
}) => {
  const g = Math.max(0, Number(guests) || 0);
  if (!basePerHead || g === 0) {
    return { perHead: 0, total: 0, breakdown: [] };
  }

  const breakdown = [];
  let running = basePerHead * g;
  breakdown.push({
    key: 'base',
    label: `Base estimate — ${g} guests × $${Math.round(basePerHead)}/person`,
    amount: running,
    kind: 'base',
  });

  const applyFactor = (key, label, multiplier, kind, explanation) => {
    if (!multiplier || multiplier === 1) return;
    const before = running;
    running = running * multiplier;
    const delta = running - before;
    breakdown.push({
      key, label, amount: delta, kind, multiplier, explanation,
    });
  };

  applyFactor('metro', metroLabel || 'Metro adjustment', metroFactor, 'metro');
  applyFactor('rush',  rushLabel || 'Timeline rush adjustment', rushFactor, 'rush');
  applyFactor('date',  datePremium.label || 'Date premium', datePremium.multiplier, 'date', datePremium.explanation);
  applyFactor('tod',   timeOfDay.label ? `Time of day · ${timeOfDay.label}` : 'Time of day', timeOfDay.multiplier, 'tod', timeOfDay.explanation);
  applyFactor('stx',   serviceTax.label || 'Service + tax', serviceTax.multiplier, 'stx', serviceTax.explanation);
  applyFactor('ctg',   contingency.label || 'Contingency', contingency.multiplier, 'ctg', contingency.explanation);

  const total   = Math.round(running / 100) * 100;
  const perHead = Math.round(running / g);

  breakdown.push({ key: 'total', label: 'Estimated planning total', amount: total, kind: 'total' });

  return { perHead, total, breakdown };
};
