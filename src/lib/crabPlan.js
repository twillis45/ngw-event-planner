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
import { crabsPerPicker, crabsPerBushel, DEFAULT_CRAB_SIZE, crabServingProvenance } from './crabServing';
import { kidCount, vegCount, KID_PROTEIN_FACTOR } from './appetite';

export const CRAB_UNITS = ['dozen', 'half_bushel', 'bushel'];
export const CRAB_SIZES = ['medium', 'large', 'extra_large', 'jumbo', 'mixed', 'unknown'];
// Bushel counts come from the sourced table, not a local literal. The literal that
// used to live here said jumbo = 52, which matches no source anywhere (and disagreed
// with the crabFeast priceLadder's own 48 sitting three files away). Sourced: medium
// 84, large 72, jumbo 60, colossal 48 — Crab Dynasty + Linton's, and MD DNR's
// regulatory conversion (1 bushel = 40 lb = 7 dozen = 84) for the base case.
export function defaultCountPerUnit(size, unit) {
  if (unit === 'dozen') return 12;
  // 'mixed' / 'unknown' stay honest: the vendor has to tell you. normalizeCrabSize
  // would happily default them to 'large', which is exactly the kind of quiet guess
  // this whole change exists to remove.
  if (!KNOWN_SIZE.has(String(size))) return null;
  const perBushel = crabsPerBushel(size);
  if (!perBushel) return null;
  return unit === 'bushel' ? perBushel : Math.round(perBushel / 2);
}

// How much of a full picker's share this event's crabs represent. When crabs ARE the
// meal (a crab feast) a picker eats a full share; when they're one dish among many,
// less. This is a SHARE, not a crab count — the crab count itself is per-size and
// comes from the sourced guide, because a jumbo feeds a person on ~half the crabs a
// medium does.
//
// It replaces `TARGET_BY_ROLE = { main: 6, supplement: 3, snack: 1 }`, whose own
// comment said it was "grounded in the crab-feast playbook's serving guide" — it was
// a size-blind copy that had drifted. 6 is the guide's MEDIUM number, while
// recommendCrabOrder() hardcodes size='large' (whose real figure is 4 with sides), so
// the recommender bought large crabs at the medium rate and over-ordered every feast.
// On jumbos it planned DOUBLE what any source publishes.
const ROLE_SHARE = { main: 1, supplement: 0.5, snack: 0.2 };
const KNOWN_SIZE = new Set(['medium', 'large', 'extra_large', 'xl', 'jumbo', 'colossal']);

// The size the plan is being built for: what the host actually put in the order, else
// the playbook's default (Large Males).
function planSize(lines) {
  const sized = (lines || []).map(l => l && l.size).filter(s => KNOWN_SIZE.has(String(s)));
  return sized.length ? sized[0] : DEFAULT_CRAB_SIZE;
}

/** Crabs per picker for this plan — sourced, size-aware, scaled by the crabs' role. */
export function targetFor(size, role) {
  const share = ROLE_SHARE[role] != null ? ROLE_SHARE[role] : ROLE_SHARE.main;
  return Math.max(1, Math.round(crabsPerPicker(size) * share));
}

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

// A roster ROW is not a PERSON. `kids` ("Children in Party") is ADDITIVE — a row for
// one adult bringing three children is FOUR mouths. This file used to count rows, so a
// roster of 10 adults each bringing 3 kids read as 10 heads while the food engine's
// attendance band correctly resolved 40 — and the crab order was sized for a quarter of
// the party. Counting people, not rows, is what attendanceBand already does.
function rosterHeadcount(ev) {
  const rows = Array.isArray(ev.guests) ? ev.guests.filter(g => g && /^y/i.test(String(g.rsvp || ''))) : [];
  return rows.reduce((s, g) => s + 1 + Math.max(0, num(g.kids)), 0);
}

export function buildCrabPlan(event) {
  const ev = event || {};
  const cp = (ev.crabPlan && typeof ev.crabPlan === 'object') ? ev.crabPlan : null;
  const isCrabEvent = /crab/i.test(String(ev.type || '') + ' ' + String(ev.name || ''));
  if (!cp && !isCrabEvent) return { relevant: false };

  const role = (cp && cp.role) || 'main';
  const lines = (cp && Array.isArray(cp.lines)) ? cp.lines.filter(Boolean) : [];
  const guestFallback = num(ev.guestCount) || num(ev.guestEstimate) || rosterHeadcount(ev);
  // ── WHAT THE GUESTS THEMSELVES SAID ─────────────────────────────────────────
  // The crab order is the biggest cost of the event and it sizes to PICKERS, not
  // heads. Until now that number was the host's guess. The invite now asks each
  // guest outright ("Are you picking crabs?" → guest.picksCrabs), so for the first
  // time the people who actually know are the ones answering.
  //
  // Precedence, deliberately:
  //   1. An explicit host number ALWAYS wins. They may know something we don't
  //      (a cousin who eats two dozen), and overriding a human's stated decision
  //      with a partial roster would be the app lying about who is in charge.
  //   2. Otherwise, if ANY guest has answered, the yes-count beats the old default
  //      — which was "assume every single guest picks", the very over-order this
  //      whole thread is about.
  //   3. Otherwise, the guest count, exactly as before.
  //
  // Unanswered guests are NOT counted either way. A silent guest is not a "no"
  // (and not a "yes") — the counts are exposed so the host can see the gap and
  // decide, rather than the app inventing an answer on a guest's behalf.
  const roster = Array.isArray(ev.guests) ? ev.guests : [];
  const attending = roster.filter(g => g && /^y/i.test(String(g.rsvp || '')));
  const pickersYes = attending.filter(g => g.picksCrabs === true).length;
  const pickersNo = attending.filter(g => g.picksCrabs === false).length;
  const pickersUnanswered = attending.length - pickersYes - pickersNo;
  const anyoneAnswered = (pickersYes + pickersNo) > 0;

  const rawPickers = (cp && num(cp.crabEatingHeadcount) > 0) ? num(cp.crabEatingHeadcount)
    : (anyoneAnswered ? pickersYes : null);
  // PICKERS-GUARDRAIL: pickers are a subset of the event's guests — a count
  // higher than the guest list is impossible and would size the whole order
  // off a number that can't be true. Clamp the MATH, not the host's stored
  // input (they may add guests later); say so instead of silently rewriting
  // what they typed.
  let heads = rawPickers != null ? rawPickers : guestFallback;
  let pickerNote = null;
  // DENOMINATORS-1: neutral, not a warning — the host deliberately set pickers
  // to something other than the full guest count (not everyone eats crabs).
  // Kept separate from pickerNote (the actual clamp warning below) so this
  // routine reconciliation never renders in a "something's wrong" color.
  let pickerReconcileNote = null;
  if (rawPickers != null && guestFallback > 0 && rawPickers > guestFallback) {
    heads = guestFallback;
    pickerNote = `Pickers can’t outnumber your ${guestFallback} guests — using ${guestFallback} for coverage.`;
  } else if (rawPickers != null && guestFallback > 0 && rawPickers !== guestFallback) {
    pickerReconcileNote = `${rawPickers} of your ${guestFallback} guests are picking crabs.`;
  }
  // A host who states a target owns it. Otherwise: the sourced, size-aware number.
  const _planSize = planSize(lines);
  const target = (cp && num(cp.targetCrabsPerPerson) > 0) ? num(cp.targetCrabsPerPerson) : targetFor(_planSize, role);

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
  // Uses the EFFECTIVE picker count (kid-discounted, vegetarian-aware) — the same number
  // recommendCrabOrder sizes the order from. Reading raw `heads` here made the plan say
  // "planning around 72 crabs" directly above a recommendation built for 67.
  const _effHeads = effectivePickers(ev, heads);
  const targetTotal = heads ? Math.round(_effHeads * target) : 0;
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
    // What the guests said, so the host can SEE the gap instead of the app guessing
    // for the silent ones. `basis` names where the number actually came from — the
    // host should never have to wonder whether a count is theirs or ours.
    guestPickers: {
      yes: pickersYes,
      no: pickersNo,
      unanswered: pickersUnanswered,
      basis: (cp && num(cp.crabEatingHeadcount) > 0) ? 'host'
        : (anyoneAnswered ? 'guests' : 'guest-count'),
    },
    pickerNote,
    pickerReconcileNote,
    targetCrabsPerPerson: target,
    // Kid-discounted, vegetarian-aware. THE headcount the crabs are sized for — the food
    // row reads this rather than re-deriving its own, which is how the two screens
    // ended up printing different crab totals.
    effectivePickerCount: effectivePickers(ev, heads),
    planSize: _planSize,
    // Whether that number is published or our own interpolation — so a surface can say so.
    targetProvenance: crabServingProvenance(_planSize),
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

// ─── recommendCrabOrder — a real starting mix, not just a coverage check ──────
// buildCrabPlan only ever judges lines the host already typed in. Before any
// line exists, the host is left to guess bushels-vs-dozens and sizes from
// scratch. This computes an honest starting mix from the SAME headcount/target
// buildCrabPlan already resolved (single source — never re-derived), sized in
// whole/half bushels once the total clears the same 60-crab threshold
// bushelLikelyUseful already uses, dozens below it. One default size to start
// — real orders often DO mix sizes across lines (see file header), but a
// forced two-size guess would be inventing detail the host hasn't chosen yet;
// the returned lines are plain editable stubs the host can split further.
// KID_CRAB_FACTOR removed — it was 0.4, the same number the food engine calls
// KID_PROTEIN_FACTOR. Two names for one heuristic is how they drift apart.
// the food engine uses for other appetite-driven mains (KID_PROTEIN_FACTOR in
// playbooks/index.js); kept as a local constant since this file is a leaf
// module with no engine imports.
// The ONE effective picker count — kid-discounted and vegetarian-aware. Exported on the
// plan (as `effectivePickerCount`) so the food row and the crab sheet cannot disagree
// about how many mouths the crabs are being sized for. They did: the food row applied
// its own kids/vegetarian appetite math while this stayed private to recommendCrabOrder,
// so declaring a vegetarian moved one screen and not the other.
export function effectivePickers(ev, heads) {
  if (!heads) return heads;
  const guestFallback = num(ev.guestCount) || num(ev.guestEstimate) || rosterHeadcount(ev);
  // Kids and vegetarians come from the SHARED reader (lib/appetite.js), not from this
  // file's own idea of where those live. That was the drift: the food engine read
  // `dietCounts` and the roster's meal/needs/diets, this file read neither, so a
  // declared vegetarian shrank the food row and left the crab plan untouched.
  const kids = kidCount(ev);
  const veg = vegCount(ev);

  let out = heads;
  // A vegetarian is not a crab picker. They eat NONE of it — a full subtraction.
  if (veg > 0) {
    const vegAmongPickers = guestFallback > 0 ? Math.round(veg * (heads / guestFallback)) : Math.min(veg, heads);
    out = Math.max(1, out - Math.min(vegAmongPickers, out));
  }
  if (kids > 0) {
    // Pickers are often a SUBSET of guests (not everyone picks crabs) — assume kids are
    // represented among pickers in the same proportion as the picker count is to the
    // guest count, not "all kids picked," which would overstate the reduction whenever
    // pickers is a deliberately narrower group.
    const kidsAmongPickers = guestFallback > 0 ? Math.round(kids * (heads / guestFallback)) : Math.min(kids, heads);
    const clamped = Math.max(0, Math.min(kidsAmongPickers, out));
    if (clamped) out = Math.max(1, out - clamped * (1 - KID_PROTEIN_FACTOR));
  }
  return out;
}

export function recommendCrabOrder(event) {
  const plan = buildCrabPlan(event);
  if (!plan || !plan.relevant || !plan.crabEatingHeadcount) return null;
  const heads = plan.crabEatingHeadcount;
  const target = plan.targetCrabsPerPerson;
  const eHeads = plan.effectivePickerCount || heads;
  const totalTarget = Math.max(1, Math.round(eHeads * target));

  // Was hardcoded to 'large' while the target was the size-blind 6 — i.e. it bought
  // large crabs at the medium rate. Size and target now come from the same place.
  const size = plan.planSize || DEFAULT_CRAB_SIZE;
  const perBushel = defaultCountPerUnit(size, 'bushel');
  const perHalfBushel = defaultCountPerUnit(size, 'half_bushel');
  const perDozen = 12;
  // GREEDY COVER — biggest unit down. The old shape ran `if (wholeBushels > 0) …` then
  // ONE `else if` chain for the remainder, which silently under-bought whenever no whole
  // bushel fit but the remainder was still large: a 67-crab target produced a lone half
  // bushel (36 crabs) and called it done — barely half the order. It only looked right
  // while the target was the inflated size-blind 6; dropping to the sourced 4 walked
  // straight into it. Cover the remainder, don't sample it.
  const lines = [];
  let rem = totalTarget;
  const wholeBushels = Math.floor(rem / perBushel);
  if (wholeBushels > 0) {
    lines.push({ unit: 'bushel', size, quantity: wholeBushels, estimatedCountPerUnit: perBushel });
    rem -= wholeBushels * perBushel;
  }
  // A half bushel is worth buying once it's ~3/4 full of work — below that, dozens are
  // the honest unit rather than paying for crabs nobody will pick.
  if (rem >= perHalfBushel * 0.75) {
    lines.push({ unit: 'half_bushel', size, quantity: 1, estimatedCountPerUnit: perHalfBushel });
    rem -= perHalfBushel;
  }
  if (rem >= perDozen / 2) {
    lines.push({ unit: 'dozen', size, quantity: Math.max(1, Math.ceil(rem / perDozen)), estimatedCountPerUnit: perDozen });
    rem = 0;
  }
  // Never recommend nothing.
  if (!lines.length) lines.push({ unit: 'dozen', size, quantity: 1, estimatedCountPerUnit: perDozen });
  const totalCrabs = lines.reduce((s, l) => s + l.quantity * l.estimatedCountPerUnit, 0);
  const plural = (u, q) => (u === 'dozen' ? 'dozen' : q > 1 ? UNIT_LABEL[u] + 's' : UNIT_LABEL[u]);
  const summary = lines.map(l => `${l.quantity} ${plural(l.unit, l.quantity)} ${SIZE_LABEL[size]}`).join(' + ');
  const kidNote = eHeads < heads;

  return {
    lines,
    totalCrabs,
    effectivePickers: Math.round(eHeads * 10) / 10,
    targetCrabsPerPerson: target,
    summary,
    note: kidNote
      // The copy said "about 60% of an adult's share" while the factor is 0.4 — it was
      // reading out the amount SUBTRACTED, not the amount a kid EATS. It told the host
      // the opposite of what the engine does. Stated from the constant so it cannot
      // drift again: KID_PROTEIN_FACTOR 0.4 → 40%.
      ? `A starting point for ${heads} pickers (kids eat less — figured at about ${Math.round(KID_PROTEIN_FACTOR * 100)}% of an adult's share) at about ${target} crabs each.`
      : `A starting point for ${heads} pickers at about ${target} crabs each.`,
  };
}
