// ─── crabPlan — CRAB-PRICING-1: Maryland crab quantity / bushel / mixed-size ──
//
// Crabs aren't priced like normal food: they're bought live or steamed, by the
// DOZEN, HALF-BUSHEL, or BUSHEL, by SIZE — and a real order mixes them
// ("1 bushel large + 2 dozen jumbo"). What the host actually needs to know:
//   · how many total crabs the order covers
//   · about how many crabs per person that is
//   · whether that's under / covered / extra for the role crabs play
//   · whether bushel-buying makes sense at this headcount
//   · what the order costs — from THEIR entered prices only
// HARD RULES (test-locked): no fake market prices (cost only from explicit
// host-entered pricePerUnit); bushel is never claimed cheaper without explicit
// prices proving it; estimates stay estimates ("about", never "spent");
// bought means the host marked the line bought; dozens are never forced into
// bushels for small groups.
//
// This is a thin food-domain helper over host-entered state
// (event.crabPlan) — Food Intelligence owns it; no separate engine.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Crabs per unit. A dozen is definitional. Bushel counts genuinely vary by
// size — defaults come from the crab-feast playbook's RESEARCHED ladder
// (Captain White's July 2026: ~72 large / ~84 medium per bushel) and are
// always labeled "about"; the host's vendor count, when entered, wins.
export const CRAB_UNITS = ['dozen', 'half_bushel', 'bushel'];
export const CRAB_SIZES = ['medium', 'large', 'extra_large', 'jumbo', 'mixed', 'unknown'];
const DEFAULT_PER_BUSHEL = { medium: 84, large: 72, extra_large: 60, jumbo: 52 };
export function defaultCountPerUnit(size, unit) {
  if (unit === 'dozen') return 12;
  const perBushel = DEFAULT_PER_BUSHEL[size];
  if (!perBushel) return null; // mixed / unknown — the vendor has to tell you
  return unit === 'bushel' ? perBushel : Math.round(perBushel / 2);
}

// Default crabs-per-person target by the role crabs play. Grounded in the
// crab-feast playbook's serving guide (about a half-dozen each when crabs are
// the meal, with sides).
const TARGET_BY_ROLE = { main: 6, supplement: 3, snack: 1 };

export const UNIT_LABEL = { dozen: 'dozen', half_bushel: 'half-bushel', bushel: 'bushel' };
export const SIZE_LABEL = { medium: 'medium', large: 'large', extra_large: 'extra-large', jumbo: 'jumbo', mixed: 'mixed', unknown: 'size TBD' };

export function lineCrabCount(line) {
  const qty = Math.max(0, num(line && line.quantity));
  if (!qty) return null;
  const per = (line.estimatedCountPerUnit != null && num(line.estimatedCountPerUnit) > 0)
    ? num(line.estimatedCountPerUnit)
    : defaultCountPerUnit(line.size, line.unit);
  if (per == null) return null;
  return Math.round(qty * per);
}

export function buildCrabPlan(event) {
  const ev = event || {};
  const cp = (ev.crabPlan && typeof ev.crabPlan === 'object') ? ev.crabPlan : null;
  const isCrabEvent = /crab/i.test(String(ev.type || '') + ' ' + String(ev.name || ''));
  if (!cp && !isCrabEvent) return { relevant: false };

  const role = (cp && cp.role) || 'main';
  const lines = (cp && Array.isArray(cp.lines)) ? cp.lines.filter(Boolean) : [];
  const guestFallback = num(ev.guestCount) || num(ev.guestEstimate)
    || (Array.isArray(ev.guests) ? ev.guests.filter(g => g && /^y/i.test(String(g.rsvp || ''))).length : 0);
  const rawPickers = (cp && num(cp.crabEatingHeadcount) > 0) ? num(cp.crabEatingHeadcount) : null;
  // PICKERS-GUARDRAIL: pickers are a subset of the event's guests — a count
  // higher than the guest list is impossible and would size the whole order
  // off a number that can't be true. Clamp the MATH, not the host's stored
  // input (they may add guests later); say so instead of silently rewriting
  // what they typed.
  let heads = rawPickers != null ? rawPickers : guestFallback;
  let pickerNote = null;
  if (rawPickers != null && guestFallback > 0 && rawPickers > guestFallback) {
    heads = guestFallback;
    pickerNote = `Pickers can’t outnumber your ${guestFallback} guests — using ${guestFallback} for coverage.`;
  }
  const target = (cp && num(cp.targetCrabsPerPerson) > 0) ? num(cp.targetCrabsPerPerson) : (TARGET_BY_ROLE[role] || 3);

  const issues = [];

  // ── Coverage ────────────────────────────────────────────────────────────────
  let totalEstimatedCrabs = 0;
  let countsComplete = lines.length > 0;
  for (const l of lines) {
    const c = lineCrabCount(l);
    if (c == null) { countsComplete = false; continue; }
    totalEstimatedCrabs += c;
  }

  let coverageStatus;
  let coveredCrabsPerPerson = null;
  if (!heads) {
    coverageStatus = 'needs_headcount';
    issues.push({ type: 'headcount', copy: 'Set how many people are eating crabs so we can calculate coverage.', actionLabel: 'Set crab headcount', route: { focusField: 'crab-headcount' } });
  } else if (!lines.length) {
    // NO-ORDER-YET FIX: zero lines entered is "haven't started," not "started
    // and fell short." Without this branch, totalEstimatedCrabs/heads = 0 fell
    // through to the ratio math below and read as coverageStatus 'under' —
    // "This covers about 0 crabs per person," the exact wording of an order
    // that undershot. A host who hasn't ordered yet needs a calm starting
    // state, not a false shortfall.
    coverageStatus = 'no_order';
  } else if (lines.length && !countsComplete && totalEstimatedCrabs === 0) {
    coverageStatus = 'needs_count_per_unit';
  } else {
    coveredCrabsPerPerson = totalEstimatedCrabs / heads;
    const r = coveredCrabsPerPerson / target;
    coverageStatus = r < 0.9 ? 'under' : r <= 1.5 ? 'covered' : 'extra';
  }
  if (lines.some(l => lineCrabCount(l) == null && num(l.quantity) > 0)) {
    if (coverageStatus !== 'needs_headcount' && totalEstimatedCrabs === 0) coverageStatus = 'needs_count_per_unit';
    const l = lines.find(x => lineCrabCount(x) == null && num(x.quantity) > 0);
    issues.push({ type: 'count_per_unit', lineId: l.id, copy: `Add the vendor’s estimated count per ${UNIT_LABEL[l.unit] || 'unit'} so we can calculate coverage.`, actionLabel: 'Add count per unit', route: { focusField: `crabline-${l.id}-count` } });
  }

  // ── Cost — explicit host-entered prices ONLY ───────────────────────────────
  let totalEstimatedCost = 0;
  let pricedLines = 0;
  for (const l of lines) {
    const qty = Math.max(0, num(l.quantity));
    if (!qty) continue;
    if (l.pricePerUnit != null && num(l.pricePerUnit) > 0) {
      totalEstimatedCost += qty * num(l.pricePerUnit);
      pricedLines++;
    }
  }
  const activeLines = lines.filter(l => num(l.quantity) > 0);
  const costComplete = activeLines.length > 0 && pricedLines === activeLines.length;
  if (activeLines.length && !costComplete) {
    const l = activeLines.find(x => !(x.pricePerUnit != null && num(x.pricePerUnit) > 0));
    issues.push({ type: 'price', lineId: l.id, copy: 'Add the quote price to estimate budget impact.', actionLabel: 'Add price', route: { focusField: `crabline-${l.id}-price` } });
  }
  const costPerPerson = (costComplete && heads) ? totalEstimatedCost / heads : null;

  // ── Bushel guidance — coverage clarity, NEVER a price claim ────────────────
  const targetTotal = heads ? heads * target : 0;
  const hasBushelLine = lines.some(l => l.unit === 'bushel' || l.unit === 'half_bushel');
  const hasBushelPrice = lines.some(l => (l.unit === 'bushel' || l.unit === 'half_bushel') && num(l.pricePerUnit) > 0);
  const bushelLikelyUseful = !!heads && (targetTotal >= 60 || hasBushelPrice);
  const bushelExplanation = !heads ? null
    : bushelLikelyUseful
      ? (hasBushelLine
          ? null // already ordering by the bushel — no nudge needed
          : `You’re planning around ${targetTotal} crabs. Bushel buying may make sense at this headcount — compare by total crabs covered, not just price.`)
      : (targetTotal > 0 && targetTotal < 36 && hasBushelLine
          ? 'Dozens may be easier than a bushel for this headcount unless crabs are the main meal.'
          : null);

  // ── Summary copy — "about", "covers", never guarantees ─────────────────────
  const fmt1 = (n) => (Math.round(n * 10) / 10).toString();
  const mixedSummary = activeLines.length
    ? activeLines.map(l => `${l.quantity} ${UNIT_LABEL[l.unit] || l.unit} ${SIZE_LABEL[l.size] || ''}`.trim()).join(' + ')
    : null;
  let coverageCopy = null;
  if (coverageStatus === 'under' && coveredCrabsPerPerson != null) coverageCopy = `This covers about ${fmt1(coveredCrabsPerPerson)} crabs per person. Add more if crabs are the main food.`;
  else if (coverageStatus === 'covered') coverageCopy = `This covers about ${fmt1(coveredCrabsPerPerson)} crabs per person.`;
  else if (coverageStatus === 'extra') coverageCopy = `This covers about ${fmt1(coveredCrabsPerPerson)} crabs per person. That may be extra unless crabs are the main event.`;
  else if (coverageStatus === 'needs_headcount') coverageCopy = 'Set the crab-eating headcount to see coverage.';
  else if (coverageStatus === 'no_order') coverageCopy = 'No crab order yet — add a line to see coverage.';
  else if (coverageStatus === 'needs_count_per_unit') coverageCopy = 'Add the vendor’s estimated count per unit so we can calculate coverage.';

  // ── Handled (green-dot) — real completeness only ───────────────────────────
  const handled = activeLines.length > 0
    && heads > 0
    && countsComplete
    && (coverageStatus === 'covered' || coverageStatus === 'extra' || cp?.acceptLowerCoverage === true);

  return {
    relevant: true,
    role,
    crabEatingHeadcount: heads || null,
    pickerNote,
    targetCrabsPerPerson: target,
    lines,
    totalEstimatedCrabs,
    coveredCrabsPerPerson,
    coverageStatus,
    coverageCopy,
    mixedSummary,
    totalEstimatedCost: costComplete ? Math.round(totalEstimatedCost) : (pricedLines > 0 ? Math.round(totalEstimatedCost) : null),
    costComplete,
    costPerPerson: costPerPerson != null ? Math.round(costPerPerson * 100) / 100 : null,
    // spent = bought lines with explicit prices only (estimate never becomes actual)
    boughtCost: Math.round(lines.reduce((s, l) => s + ((l.bought === true && num(l.pricePerUnit) > 0) ? Math.max(0, num(l.quantity)) * num(l.pricePerUnit) : 0), 0)),
    bushelLikelyUseful,
    bushelExplanation,
    issues,
    handled,
  };
}
