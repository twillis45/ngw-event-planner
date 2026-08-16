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
export function axesForField(fieldPath) {
  const f = String(fieldPath || '');
  // Both cost-block names, matched BEFORE the shared-slot pattern below.
  //
  // The board flagged a suffix collision here — that `/\.provenance$/` tests
  // elsewhere would also match `costProvenance`. Checked, and they do not: the
  // capital P means `p_ice.costProvenance` has no `.provenance` ending. The real
  // consequence is the opposite one, and easy to miss: suffix checks written for
  // the bare slot SKIP the cost block entirely, so it inherits no validation by
  // default. Each such site has to opt the new field in — see the shape check in
  // governanceReconciliation.
  if (/\.(costFactorProvenance|costProvenance)$/.test(f)) return [SOURCE_AXES.cost];
  const m = f.match(/^p_[^.]+\.(provenance|qtyPerGuest|qtyFlat|unitCostRange|priceLadder|servingGuide)$/);
  if (!m) return [];
  switch (m[1]) {
    // A PRICE FIELD IS A COST CLAIM (fixed 2026-08-15). These three lived in the
    // quantity branch, which meant a correct, registered COST source attached to
    // `p_x.unitCostRange` was reported to the operator as `wrongAxis`, and
    // `approvedSourcesFor` offered them the 5-entry QUANTITY picker for a price.
    // This is the same axis confusion as the 2026-08-14 `directCitationEligible`
    // bug: that one was fixed in the classifier, and the AUTHORING path was left
    // pointing the wrong way, so the surface stopped lying while the tool that
    // creates the data kept doing so.
    case 'unitCostRange':
    case 'priceLadder':
      return [SOURCE_AXES.cost];
    case 'qtyPerGuest':
    case 'qtyFlat':
    case 'servingGuide':
      return [SOURCE_AXES.quantity];
    // THE SHARED SLOT STAYS ON THE QUANTITY AXIS HERE, and that is a KNOWN,
    // DELIBERATE DISAGREEMENT with `classifyClaim`, recorded rather than papered
    // over.
    //
    // `classifyClaim` accepts either registry on this slot; this validator accepts
    // only quantity. So a cost citation living in `p_x.provenance` renders a
    // sourced badge to a host (63 rows do today) yet cannot be authored through
    // the admin tool. That is genuinely broken.
    //
    // It is NOT fixed by widening this to both axes. Five gates across four suites
    // (iceAcquisitionRepeatability, commercialSourcePolicy, tierGroundingGate,
    // evidenceFromSources, sourceAuthority) deliberately encode "a cost source
    // cannot ground a purchase quantity claim", and widening the slot silently
    // relaxes all five — a purchase would gain a sourced badge from a price
    // citation with nothing left asserting the amount was ever checked.
    //
    // The board ruled the real fix on 2026-08-15: a separate cost slot, with every
    // existing block keeping its current meaning (Design A). Until that migration
    // lands, the honest state is a contradiction that is WRITTEN DOWN, not one
    // resolved by loosening the only gates that still hold the line.
    case 'provenance':
    default:
      return [SOURCE_AXES.quantity];
  }
}

// Back-compat: the PRIMARY axis, which is what the picker defaults to.
export function axisForField(fieldPath) {
  return axesForField(fieldPath)[0] || null;
}

/**
 * approvedSourcesFor(fieldPath) -> [{ id, org, url, fetched, claim, axis }]
 *
 * The picker's list. Derived from the registry the predicate reads, so the options
 * offered and the ids that can actually ground cannot drift apart.
 */
export function approvedSourcesFor(fieldPath) {
  const axes = axesForField(fieldPath);
  if (!axes.length) return [];
  // The picker offers exactly what the validator will accept. When those two
  // disagree the operator is invited to make a mistake and then told off for it.
  return axes.flatMap((axis) => Object.entries(axis.registry).map(([id, s]) => ({
    id,
    org: s.org || id,
    url: s.url || null,
    fetched: s.fetched || null,
    claim: s.claim || '',
    axis: axis.id,
  }))).sort((a, b) => a.id.localeCompare(b.id));
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
  const axes = axesForField(fieldPath);
  const axis = axes[0] || null;
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!axis) {
    return { ok: true, errors: [], unknown: [], wrongAxis: [], axis: null };
  }
  if (!list.length) {
    return { ok: false, errors: ['At least one approved source is required.'], unknown: [], wrongAxis: [], axis };
  }
  // EVERY ID MUST RESOLVE IN THE **SAME** REGISTRY, not merely in some registry.
  //
  // `isGroundedItemQty` and `isGroundedCost` each use `.every()` over one registry,
  // so a set mixing a quantity source with a cost source grounds under NEITHER.
  // Checking ids one at a time against "any allowed axis" therefore reports `ok`
  // for a citation that cannot ground — the exact silent-ungrounding path this
  // function exists to block. (Caught by the test at sourceAuthority.test.js:106,
  // which is the only reason this is not shipping.)
  const satisfying = axes.find((a) => list.every((id) => a.registry[id]));
  const unknown = [];
  const wrongAxis = [];
  if (!satisfying) {
    // Report against whichever allowed axis the operator got CLOSEST to, so the
    // message names the smallest correct fix rather than the first axis in the list.
    const best = axes.reduce((acc, a) =>
      (list.filter((id) => a.registry[id]).length > list.filter((id) => acc.registry[id]).length ? a : acc), axes[0]);
    for (const id of list) {
      if (best.registry[id]) continue;
      const other = Object.values(SOURCE_AXES).find((a) => a.id !== best.id && a.registry[id]);
      if (other) wrongAxis.push({ id, belongsTo: other.id, belongsToLabel: other.label });
      else unknown.push(id);
    }
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
  const axes = axesForField(fieldPath);
  if (!axes.length) return false;
  // ANY allowed axis whose predicate passes. On the shared `provenance` slot this
  // is `isGroundedItemQty(p) || isGroundedCost(p)` — the same union `classifyClaim`
  // has used since 2026-08-14. When this asked the quantity predicate alone, it
  // answered "would not ground" about 63 corpus rows that render a sourced badge
  // to a host right now, and the admin tool refused to author more of them.
  return axes.some((a) => !!a.predicate(provenance));
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
 * provenanceMirror(field, newValue) -> newProvenance | null
 *
 * THE TWO HALVES OF PROVENANCE MUST AGREE (Phase 5F.10).
 *
 * A proposal carries provenance twice, and the halves are read by different layers:
 *
 *   GOVERNANCE / HOST   read `proposal.newValue`  (tier + sources -> isGroundedItemQty)
 *   TRANSPORT / BAKE    read `proposal.newProvenance` (-> entry.provenance, evidenceIds)
 *
 * The composer left `newProvenance` null, so `format()` supplied the default
 * `{verificationStatus: 'synthesized', sources: []}`. Measured on three records
 * promoted to the corpus in 5F.10:
 *
 *   snapshot entry            evidenceIds: []   provenance.verificationStatus: 'synthesized'
 *   snapshotEntryToKcr(entry) no evidence ids to hydrate
 *   canReachCited(...)        FALSE  -> the field could never be corrected again
 *
 * A host still saw the "Sourced -" line, because that reads `newValue` — so the defect
 * was invisible from the front and fatal from the back. This mirrors the cited sources
 * into the transport half so both agree.
 *
 * Returns null for non-provenance fields: a quantity correction has no provenance of its
 * own, and inventing one would be the same class of mistake in the other direction.
 */
export function provenanceMirror(field, newValue) {
  if (field !== 'provenance') return null;
  if (!newValue || typeof newValue !== 'object' || Array.isArray(newValue)) return null;
  const sources = Array.isArray(newValue.sources) ? newValue.sources.filter(Boolean) : [];
  return {
    // `cited` only when there is something to cite — an unsourced heuristic stays
    // honestly synthesized rather than being promoted by the mirror.
    verificationStatus: sources.length ? 'cited' : (newValue.verificationStatus || 'synthesized'),
    sources,
    tier: newValue.tier || null,
    confidence: newValue.confidence || null,
  };
}

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
