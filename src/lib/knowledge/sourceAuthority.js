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
import { resolveGroundingSource } from './groundingSources';

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
 * groundingHonesty(fieldPath, value) -> { ok, error?, reason?, tier?, status? }
 *
 * THE PUBLISH GATE (Phase 5F.4). Answers one question: **if this record cites sources,
 * will the runtime predicate agree that it is grounded?**
 *
 * It exists because "the source picker validated the source" turned out not to be the
 * same claim as "this will ground". Two records — The Cookout (`trade-heuristic`) and
 * Quinceanera (`norm`) — published citing APPROVED sources and grounded false. The UI
 * had said "Will ground". The gap was the TIER, which the editor carried forward
 * invisibly and nothing checked.
 *
 * SCOPE, deliberately narrow:
 *   - fires ONLY on a provenance value that carries a non-empty `sources` array;
 *   - a provenance with no sources is honest on any tier and passes;
 *   - a non-provenance field is not this gate's business.
 *
 * It never upgrades a tier. Evidence quality is a human claim.
 */
export function groundingHonesty(fieldPath, value) {
  const f = String(fieldPath || '');
  if (!/\.provenance$/.test(f)) return { ok: true };
  if (!value || typeof value !== 'object') return { ok: true };
  const sources = Array.isArray(value.sources) ? value.sources.filter(Boolean) : [];
  if (!sources.length) return { ok: true };            // an unsourced heuristic is honest

  const axis = axisForField(f);
  if (!axis) return { ok: true };                      // no axis claims authority here

  const check = validateSourcesFor(f, sources);
  if (!check.ok) {
    return {
      ok: false,
      status: 'unresolvable source',
      error: `${check.errors.join(' ')} Publishing it would create a record that lists sources and never grounds.`,
    };
  }
  if (!axis.predicate(value)) {
    const tier = value.tier == null ? '(none)' : String(value.tier);
    return {
      ok: false,
      tier,
      status: `Will NOT ground ${axis.label.toLowerCase()} claims`,
      error: `evidence tier "${tier}" does not satisfy ${axis.predicateName}. `
        + 'The cited sources are approved, but the record would list sources and show no '
        + `Sourced line to a host. Set the tier to "researched" if the research was actually `
        + 'done, or remove the sources — do not publish a record that looks sourced and is not.',
    };
  }
  return { ok: true, status: `Will ground — ${axis.hostImpact}` };
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

// ─── EVIDENCE FROM THE SOURCES A HUMAN ALREADY CHOSE (Phase 5F.8) ────────────
//
// THE DEFECT THIS CLOSES, and it invalidated every record the Acquisition workflow
// has ever produced. `openAuthoredGovernance` accepts an `evidence` option and the
// admin console never passed one, so every first-governance record was written with
// `evidence: []`. Measured consequence:
//
//   canReachCited(kcr)                     -> false
//   publishedExport.test.js round-trip     -> FAILS
//   the record cannot enter the corpus     -> and if it somehow did, that field
//                                             could never be corrected again
//
// Four such records sit in the store. Promoting the cleanest one in 5F.7 broke the
// suite, which is how the root cause surfaced.
//
// THIS MANUFACTURES NOTHING. The human picked the source from the axis-approved list;
// this records that choice in the shape the corpus requires, copying organisation, URL
// and capture date VERBATIM from the registry entry. It invents no claim, asserts no
// confidence beyond what the caller states, and refuses any id that does not resolve —
// so it cannot conjure an evidence record for a source that does not exist.
//
// `supports: null` deliberately: whether the source supports the specific value is a
// human judgement recorded in the KCR's reason, not something derivable from an id.

/** The evidence sourceTypes `canReachCited` accepts. Mirrored, not guessed. */
const CITABLE_TYPE = 'citation';

/**
 * evidenceFromSources(sources, opts) -> evidence[]
 *
 * Returns one evidence entry per RESOLVABLE source id, in registry order. Unresolvable
 * ids are dropped rather than stubbed: a stub with no organisation and no URL fails
 * `canReachCited` anyway, and emitting one would look like evidence while being none.
 */
export function evidenceFromSources(sources, { confidence = 'medium' } = {}) {
  const ids = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const out = [];
  for (const id of ids) {
    const s = resolveGroundingSource(id);
    if (!s) continue;
    const org = s.org || s.publisher || s.title || '';
    const url = s.url || '';
    if (!org && !url) continue;             // nothing citable to record
    out.push({
      id,
      sourceType: CITABLE_TYPE,
      confidence,
      supports: null,
      contradicts: false,
      capturedAt: s.fetched || null,
      source: org,
      url,
    });
  }
  return out;
}
