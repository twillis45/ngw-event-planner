// ─── SOURCE AUTHORITY — which sources may ground which claims (Phase 5F.2) ────
//
// THIS FILE ADDS NO REGISTRY. That is the point.
//
// NGW already has the right shape and it was mis-read in Phase 5F. There are ~20
// PER-AXIS source registries (`QTY_SOURCES`, `COST_SOURCES`, `TIMING_SOURCES`,
// `LEGAL_SOURCES`, ...), each owned by exactly one grounding predicate
// (`isGroundedItemQty`, `isGroundedCost`, `isGroundedTiming`, ...). A source is
// trusted FOR AN AXIS, never in general — which is correct, because a meat-price
// series has no standing over a serving quantity and a fire code has none over a
// price. `groundingSources.js` is a read-only UNION of those registries for admin
// audit; the 5F report implied it was a rival authority, and it is not.
//
// So the authority model is: **the per-axis registry that the field's predicate
// reads IS the approved-source list for that field.** This module only makes that
// answerable by a UI, before publish instead of after.
//
// THE DEFECT IT CLOSES. The composer took a free-text source id. Type
// `usda-meat-2026` (real, but a COST source) on a purchase provenance and:
//   - the correction publishes,
//   - `isGroundedItemQty` requires EVERY id to resolve in QTY_SOURCES,
//   - it does not, so `qtyGrounded` stays false,
//   - hostv2 renders no "Sourced -" line,
//   - and nothing anywhere reports an error.
// A silent ungrounding is indistinguishable from never having done the work.
//
// PURE: no I/O, no UI, no storage.
import { QTY_SOURCES, isGroundedItemQty } from './quantityProvenance';
import { COST_SOURCES, isGroundedCost } from './costProvenance';

/**
 * THE AXES a PURCHASE correction can touch.
 *
 * Deliberately narrow. This module answers for the purchase-correction workflow the
 * Admin composer drives; it does not claim authority over decisions, timing, legal
 * or the other axes, which have their own predicates and their own surfaces. A
 * module that over-claims is as untrustworthy as one that under-claims.
 */
export const SOURCE_AXES = Object.freeze({
  quantity: {
    id: 'quantity',
    label: 'Quantity & serving guidance',
    registry: QTY_SOURCES,
    predicate: isGroundedItemQty,
    predicateName: 'isGroundedItemQty',
    // What a source on this axis is allowed to be about.
    supports: ['portion guides', 'serving guides', 'per-guest planning rates', 'operational guidance'],
    refuses: ['retail price', 'vendor price', 'legal or safety requirements'],
    hostImpact: 'qtyGrounded -> the host\'s "Sourced -" line on a shopping row',
  },
  cost: {
    id: 'cost',
    label: 'Cost & pricing',
    registry: COST_SOURCES,
    predicate: isGroundedCost,
    predicateName: 'isGroundedCost',
    supports: ['retailer pricing', 'vendor pricing', 'market price series'],
    refuses: ['serving quantities', 'portion guidance'],
    hostImpact: 'costGrounded on a decision\'s cost factors',
  },
});

/**
 * axisForField(fieldPath) -> axis | null
 *
 * WHICH AXIS GOVERNS A PURCHASE FIELD.
 *
 * The subtlety that matters: a purchase's VALUE fields (`qtyPerGuest`, `qtyFlat`,
 * `unitCostRange`, `priceLadder`, `servingGuide`) do not carry their own sources.
 * The purchase has ONE `provenance` block, and `isGroundedItemQty` reads it — so
 * every source citation on a purchase line is judged on the QUANTITY axis,
 * whatever value field prompted the correction.
 *
 * `cost` is returned only for the decision-level `costFactorProvenance` path, which
 * is what `isGroundedCost` actually guards.
 */
export function axisForField(fieldPath) {
  const f = String(fieldPath || '');
  if (/costFactorProvenance$/.test(f)) return SOURCE_AXES.cost;
  if (/^p_[^.]+\.(provenance|qtyPerGuest|qtyFlat|unitCostRange|priceLadder|servingGuide)$/.test(f)) {
    return SOURCE_AXES.quantity;
  }
  return null;
}

/**
 * approvedSourcesFor(fieldPath) -> [{ id, org, url, fetched, claim, axis }]
 *
 * The picker's list. Derived from the registry the predicate reads, so the options
 * offered and the ids that can actually ground cannot drift apart.
 */
export function approvedSourcesFor(fieldPath) {
  const axis = axisForField(fieldPath);
  if (!axis) return [];
  return Object.entries(axis.registry).map(([id, s]) => ({
    id,
    org: s.org || id,
    url: s.url || null,
    fetched: s.fetched || null,
    claim: s.claim || '',
    axis: axis.id,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * validateSourcesFor(fieldPath, ids) -> { ok, errors[], unknown[], wrongAxis[] }
 *
 * Answers the three questions the brief asks, BEFORE publish:
 *   is the source approved? is it allowed for this field? can it ground this claim?
 *
 * `wrongAxis` is separated from `unknown` on purpose. "That id does not exist" and
 * "that id is real but is a pricing source, and this is a quantity claim" are
 * different mistakes, and an operator can only fix the second if told which it is.
 */
export function validateSourcesFor(fieldPath, ids) {
  const axis = axisForField(fieldPath);
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!axis) {
    return { ok: true, errors: [], unknown: [], wrongAxis: [], axis: null };
  }
  if (!list.length) {
    return { ok: false, errors: ['At least one approved source is required.'], unknown: [], wrongAxis: [], axis };
  }
  const unknown = [];
  const wrongAxis = [];
  for (const id of list) {
    if (axis.registry[id]) continue;
    const other = Object.values(SOURCE_AXES).find((a) => a.id !== axis.id && a.registry[id]);
    if (other) wrongAxis.push({ id, belongsTo: other.id, belongsToLabel: other.label });
    else unknown.push(id);
  }
  const errors = [];
  for (const u of unknown) {
    errors.push(`"${u}" is not an approved source. A citation that resolves nowhere publishes and then silently fails to ground.`);
  }
  for (const w of wrongAxis) {
    errors.push(`"${w.id}" is a ${w.belongsToLabel} source and cannot ground a ${axis.label.toLowerCase()} claim — ${axis.predicateName} would reject it and the host would show no source.`);
  }
  return { ok: errors.length === 0, errors, unknown, wrongAxis, axis };
}

/**
 * wouldGround(fieldPath, provenance) -> boolean
 *
 * Runs the REAL predicate the host runs. The composer uses this so the operator is
 * told, at correction time, exactly what the host will conclude — rather than
 * discovering after a bake that the Sourced line never appeared.
 */
export function wouldGround(fieldPath, provenance) {
  const axis = axisForField(fieldPath);
  if (!axis) return false;
  return !!axis.predicate(provenance);
}
