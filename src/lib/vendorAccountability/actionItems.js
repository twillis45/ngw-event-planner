// ─── Grounded Action Items ─────────────────────────────────────────────────
// Slice 1 of the grounded action loop (spec: docs/architecture/2026-07-18_
// GROUNDED_ACTION_ENGINE_CONTRACT.md). Maps the REAL conflicts produced by
// deriveVendorPromiseConflicts() into ActionItems the elegant hero can render
// as the grounded action itself (ask · detail · resolution · why · sources ·
// impact · progressDelta).
//
// HONESTY (slice 1): today's Conflict carries plain-language `explanation` +
// `recommendedAction` but NOT structured fix data (the proposed time/number
// value). So we map to a `choice` resolution split from the "X or Y"
// recommendedAction — a genuine either/or, never a faked pre-fill. Pre-filled
// resolutions (time/number/confirm) require conflicts.js to ALSO emit a
// structured `proposedFix` hint; that is the phase-2 enhancement, called out
// per kind in NEEDS_STRUCTURED_FIX below.

/**
 * @typedef {Object} Resolution
 * @property {'confirm'|'number'|'time'|'choice'|'message'} kind
 * @property {string} [label]
 * @property {Array<{label:string, sub?:string}>} [options]  // for kind:'choice'
 */

/**
 * @typedef {Object} ActionItem
 * @property {string} id
 * @property {string} ask          host-plain one-liner (the loud line)
 * @property {string} detail       the guide-voice sentence (the situation)
 * @property {Resolution} resolution
 * @property {string} why          grounded reason
 * @property {Array<{type:string,id:string}>} sources   provenance
 * @property {string} impact       what resolving unlocks/ticks
 * @property {{done:number,total:number}} progressDelta
 * @property {'proposed'|'derived'|'certain'} confidence   ENGINE-INTERNAL (never shown)
 * @property {?{reason:string,unlocksWhen:string,unlockAction?:ActionItem}} lock
 */

// REGROUNDED (2026-07-18): the punchy loud line + the impact are no longer authored
// HERE as generic per-kind maps — they now come from the conflict's own engine fields
// (`headline`, `impact`), built per-instance from real vendor names in conflicts.js.
// This mapper only reads real conflict data; it invents nothing. (The old ASK_BY_KIND /
// IMPACT_BY_KIND lived here and one entry — "Two vendors want the same hour" — was
// outright wrong for a single vendor-vs-venue clash. Moved + corrected in the engine.)

// Kinds where an honest pre-filled resolution (time/number/confirm) is possible
// ONCE conflicts.js emits a structured `proposedFix`. Until then they degrade to
// `choice`. Documented so the phase-2 producer knows exactly where to add hints.
export const NEEDS_STRUCTURED_FIX = {
  arrival_before_access:  'time',   // propose arrival = venue access time
  setup_after_guest_arrival: 'time',// propose setup earlier than guest arrival
  coverage_gap:           'time',   // propose coverage end past the key moment
  count_mismatch:         'number', // propose count = confirmed headcount
  timeline_clash:         'time',   // propose the missing ceremony/reception time
  delivery_window_conflict: 'time',
};

const SEV_RANK = { critical: 4, high: 3, attention: 2, watch: 1 };

/**
 * Split a "Do X, or do Y." recommendedAction into two choice options.
 * Returns null when it isn't a genuine either/or (single action).
 * @param {string} rec
 * @returns {?Array<{label:string}>}
 */
export function splitRecommendation(rec) {
  if (!rec || typeof rec !== 'string') return null;
  const clean = rec.replace(/\.$/, '').trim();
  // Split on ", or " / " or " (the recommendedActions are authored as "X or Y").
  const parts = clean.split(/,?\s+or\s+/i).map(s => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  // Capitalize each option's first letter for a clean button label.
  return parts.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1) }));
}

/**
 * Derive the honest resolution for a conflict.
 * Slice 1: a `choice` from the recommendedAction when it's a real either/or;
 * otherwise a single `confirm` of that action. (Pre-filled time/number waits on
 * structured fix data — see NEEDS_STRUCTURED_FIX.)
 * @param {Object} conflict
 * @returns {Resolution}
 */
export function deriveResolution(conflict) {
  // PHASE 2: the detector emitted a structured `proposedFix` — two concrete
  // vendor patches. Carry them onto the choice options as `apply` (a vendor
  // patch) + `receipt` so the hero resolves IN PLACE (one tap → writeVendor →
  // receipt → next), no navigation. This is the honest pre-filled resolution
  // the contract's `time`/`confirm` kinds describe.
  const pf = conflict.proposedFix;
  if (pf && pf.confirm && pf.set) {
    return {
      kind: 'choice',
      inPlace: true,
      options: [
        { label: pf.confirm.label, apply: pf.confirm.patch, receipt: pf.confirm.receipt },
        { label: pf.set.label,     apply: pf.set.patch,     receipt: pf.set.receipt },
      ],
      // Host can pick any value (e.g. a custom arrival time), not just the two canned fixes.
      custom: pf.custom || null,
    };
  }
  const options = splitRecommendation(conflict.recommendedAction);
  if (options) return { kind: 'choice', options };
  const label = (conflict.recommendedAction || 'Sort it out').replace(/\.$/, '');
  return { kind: 'confirm', label };
}

/**
 * Map ONE conflict → an ActionItem, grounded in the conflict's real fields.
 * @param {Object} conflict   a Conflict from deriveVendorPromiseConflicts()
 * @param {{done?:number,total?:number}} [ctx]
 * @returns {ActionItem}
 */
export function conflictToActionItem(conflict, ctx = {}) {
  if (!conflict) return null;
  const kind = conflict.kind;
  const done = Number.isFinite(ctx.done) ? ctx.done : 0;
  const total = Number.isFinite(ctx.total) ? ctx.total : 1;
  // Real per-conflict fields from the engine (conflicts.js) — never invented here.
  const impact = conflict.impact || 'the plan stays in sync';
  return {
    id: conflict.id,
    kind,
    // Where the fix is made. Slice 1 has no structured `proposedFix`, so a
    // resolution can't mutate the conflicting value in place — it routes the
    // host to this vendor's cockpit to apply it. Carried through so the hero
    // consumer can send the tap to the right row (phase-2: in-place fix).
    affectedVendorId: conflict.affectedVendorId || null,
    ask: conflict.headline || conflict.title || 'Sort this out.',
    detail: conflict.explanation || conflict.title || '',
    detailShort: conflict.detailShort || null,
    resolution: deriveResolution(conflict),
    // WHY: grounded in the conflict's own explanation + what it unlocks. Not a
    // second guess — the same facts the detector fired on.
    why: `Worth it now: ${impact}.`,
    sources: Array.isArray(conflict.sourceRefs) ? conflict.sourceRefs : [],
    impact,
    // resolving this clears one clash — the tick moves forward by one.
    progressDelta: { done: Math.min(done + 1, total), total },
    // ENGINE-INTERNAL: a two-option choice is a judgment call ('proposed');
    // once structured pre-fills land the certain ones become 'derived'.
    confidence: conflict.proposedFix ? 'derived' : (NEEDS_STRUCTURED_FIX[kind] ? 'proposed' : 'derived'),
    lock: null,
  };
}

/**
 * Map a list of conflicts → sorted ActionItems (severity-ranked, unchanged from
 * the detector's own ordering intent). The hero consumes items[0]; never reorders.
 * @param {Array} conflicts
 * @returns {ActionItem[]}
 */
export function conflictsToActionItems(conflicts) {
  const list = Array.isArray(conflicts) ? conflicts.filter(Boolean) : [];
  const total = list.length;
  const sorted = [...list].sort((a, b) => (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0));
  return sorted.map((c, i) => conflictToActionItem(c, { done: i, total }));
}
