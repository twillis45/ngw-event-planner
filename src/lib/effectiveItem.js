// ─── Effective Item — the one normalized food-line object (FOOD-2A, Stage 1) ────────
//
// A PURE, READ-ONLY projection. It takes a food-plan line item that playbookFoodPlan has
// ALREADY fully resolved (cost, store order, swaps, locks, BLS factor, sourcing factor all
// applied) and re-shapes it into ONE normalized object every downstream consumer can read.
//
// What this is NOT (by design, this sprint):
//   • It does NOT recompute cost, visibility, sourcing, or quantities. It reads the values
//     the engine already produced. Behavior is therefore identical — there is no math here.
//   • It does NOT introduce category defaults, per-item overrides, already-have flags, or a
//     source-profile catalog. Those are later stages; this is just the stable seam they
//     will attach to.
//
// Why it exists: the FOOD-2 review found cost/source resolution scattered across ~100 lines
// of playbookFoodPlan. This object is the agreed normalized shape so future stages can move
// that logic behind one resolver WITHOUT re-touching every consumer. For now it's additive
// and inert: playbookFoodPlan exposes `effectiveItems` alongside the untouched `list`.
//
// Honesty rules preserved:
//   • A cost range stays a range. We never collapse [low,high] into a single fabricated
//     "quote". `cost.kind` is 'fixed' ONLY when the HOST locked an exact price (their truth)
//     or the line is genuinely $0 ('free' — a $0 added/potluck dish). Engine ranges → 'range'.
//   • Missing data never hides an item: the resolver projects whatever the engine surfaced;
//     it does not re-run the visibility predicate (the `list` is already post-predicate).

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// Map a display group ('Food'/'Drinks'/'Supplies'/'Dessert') to a raw category, used only
// when a line lacks the raw `cat` field (host-added dishes + dietary lines don't carry it).
function categoryOf(item) {
  if (item && item.cat) return item.cat;
  const g = String((item && item.group) || '').toLowerCase();
  if (g === 'drinks') return 'beverage';
  if (g === 'supplies') return 'supplies';
  if (g === 'food' || g === 'dessert') return 'food';
  return 'other';
}

// The cost "kind" — honest about what the number means:
//   fixed → the host entered/locked an exact amount (their own truth, not a fabricated quote)
//   free  → genuinely $0 (a $0 host-added / potluck line)
//   range → an engine estimate (even if low===high for a flat item, it's an estimate, never a quote)
function costKind(item) {
  if (item && item.locked != null) return 'fixed';
  if (num(item && item.low) === 0 && num(item && item.high) === 0) return 'free';
  return 'range';
}

// resolveEffectiveItem(item, event, ctx) → normalized Effective Item.
// `item`  — a fully-resolved playbookFoodPlan list line (base purchase, host-added, or dietary).
// `event` — the event (used read-only for the bought/`foodGot` flag).
// `ctx`   — reserved for later stages (price factor, category defaults). UNUSED today; accepting
//           it now keeps the signature stable so adopting stages don't change every call site.
export function resolveEffectiveItem(item, event, ctx) {
  void ctx;
  const it = item || {};
  const where = Array.isArray(it.where) ? it.where : [];
  const got = !!(event && event.foodGot && typeof event.foodGot === 'object' && event.foodGot[it.id]);
  const kind = costKind(it);

  return {
    id: it.id,
    name: it.item || it.short || '',
    category: categoryOf(it),
    qty: it.qty != null ? it.qty : null,
    unit: it.unit || '',
    // The line is in the rendered list, so it is visible by construction (the engine already
    // ran the choiceShown predicate before building `list`). A swapped-out line still SHOWS
    // (struck through) — that's `flags.skipped`, not invisibility.
    visible: true,
    source: {
      store: where[0] || null,        // the preferred store (already sourcing-ordered upstream)
      options: where,                 // every store the line can come from (item.where)
      global: (event && event.sourcing) || null, // today's single global sourcing string
    },
    cost: {
      low: num(it.locked != null ? it.locked : it.low),
      high: num(it.locked != null ? it.locked : it.high),
      kind,                                            // 'fixed' | 'free' | 'range' — never a fake quote
      perUnit: [num(it.perUnitLow), num(it.perUnitHigh)],
    },
    buyAt: it.buyAt || null,
    alternatives: Array.isArray(it.alternatives) ? it.alternatives : [],
    flags: {
      skipped: !!it.skipped,           // swapped out of the plan (struck through, out of totals)
      locked: it.locked != null,       // host pinned an exact cost
      swapped: !!it.swappedFrom,       // showing an alternative in place of the authored item
      added: !!it.added,               // host-authored line (foodAdd)
      got,                             // checked off as bought (event.foodGot)
    },
    provenance: {
      // Where the cost came from — engine estimate, a host swap, or the host's own number.
      costFrom: it.locked != null ? 'host' : (it.swappedFrom ? 'swap' : 'engine'),
      kind,
    },
  };
}

export default resolveEffectiveItem;
