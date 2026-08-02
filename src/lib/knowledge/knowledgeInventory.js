// ─── THE CANONICAL KNOWLEDGE INVENTORY (Phase 5F.6 W2) ───────────────────────
//
// THE PROBLEM THIS REPLACES. NGW had several ways to count its own knowledge and they
// disagreed, each by dropping something:
//
//   groundingAudit.mjs    counts `verificationStatus` of 'cited' | 'synthesized' |
//                         'established-consensus' and SILENTLY IGNORES the other 65
//                         records ('researched' x64, 'partial' x1). It reported "4%
//                         cited" against a denominator missing 27% of the corpus.
//   SAFE_RESEARCH_...md   counted 237 Tier 1 lines by counting only lines with NO
//                         provenance object, omitting 97 that declare a tier and cite
//                         nothing.
//   acquisitionSummary()  counts governable FIELD SLOTS (1,605), which is a different
//                         unit from purchase lines and cannot be compared to either.
//
// Each number was defensible and none was wrong on its own terms. The damage is that an
// operator reading any one of them draws a false conclusion about how much is known.
//
// THE RULE HERE: **the denominator is every authored purchase line, always.** A line
// never leaves the count because its evidence is missing, its provenance is the wrong
// shape, or its field cannot be governed. Missing evidence changes a line's STATE; it
// never changes the total.
//
// Every state below is DERIVED from the same predicate the host reads. Nothing here
// encodes a judgement about whether a source's scope reaches an event — that question
// belongs to a human, and to `TIER1_BACKFILL_READINESS.md`, not to a counter.
//
// PURE: no I/O, no storage, no UI.
import { isGroundedItemQty } from './quantityProvenance';
import { governableFieldsFor } from './knowledgeAcquisition';
import { fieldOwnership } from './governedOwnership';

/**
 * The seven states. EXHAUSTIVE and MUTUALLY EXCLUSIVE over authored purchase lines:
 * every line lands in exactly one, and the states sum to the total. Ordered from
 * most to least known.
 */
export const INVENTORY_STATES = Object.freeze([
  // RENAMED in Phase 5G-B, from 'grounded'. That word silently excluded established
  // consensus, cultural tradition and primary evidence — 45 lines whose basis the
  // predicate cannot see — and so a reader took `52/537` for "the share with any
  // intellectual basis". It is not: it is the share DIRECTLY CITED to a registered
  // source. For what a line actually rests on, use `classifyClaim` in claimBasis.js.
  'directly-cited',    // the runtime predicate passes — a host sees a "Sourced —" line
  'reviewed',          // governance published something here, but it does not ground
  'ambiguous',         // lists sources and does NOT ground — looks sourced, is not
  'needs-source',      // provenance exists, declares a tier, cites nothing
  'needs-provenance',  // a value with no provenance at all
  'blocked',           // no governable field drives runtime — governance cannot reach it
  'unsupported',       // no costed or quantified value here — nothing to ground
]);

const keyOf = (assetId, fieldPath) => `${assetId} ${fieldPath}`;

/** Which state does ONE authored purchase line occupy? */
export function lineState(assetId, purchase, publishedKeys, governedProvenance = null) {
  // THE EFFECTIVE PROVENANCE, not the authored one (Phase 5F.11).
  //
  // This read `purchase.provenance` — what the playbook file says — while a HOST reads
  // the governed value overlaid on top. Measured after Wave 0 committed three grounded
  // ice records: `grounded` stayed at 38 and `reviewed` went 1 -> 4, so the three lines
  // governance had just fixed were counted as "published here, does not ground".
  //
  // The inventory was doing the thing this whole programme exists to prevent: reporting
  // something other than what the runtime serves. `reviewed` is a real state — a value
  // correction with no provenance — but it must not absorb lines that DO ground.
  const prov = governedProvenance || purchase.provenance;
  const sources = (prov && typeof prov === 'object' && Array.isArray(prov.sources))
    ? prov.sources.filter(Boolean) : [];

  // 1. DIRECTLY CITED — the host-facing predicate, not a separate notion of
  //    "researched", and NOT a claim about whether the line has an intellectual basis.
  if (isGroundedItemQty(prov)) return 'directly-cited';

  // 2. REVIEWED — governance has published something on this line. It went through the
  //    chain; it just does not ground (a value correction with no provenance, say).
  const governed = (publishedKeys && [...publishedKeys].some(
    (k) => k.startsWith(`${keyOf(assetId, purchase.id)}.`),
  ));
  if (governed) return 'reviewed';

  // 3. AMBIGUOUS — the dangerous middle. Sources are listed and the predicate fails.
  if (sources.length) return 'ambiguous';

  // 4. NEEDS-SOURCE — a provenance object OR the bare-string form (21 lines carry
  //    provenance as a string, 8 of them full prose). Both declare something and cite
  //    nothing, so both belong here rather than in "no provenance at all".
  if (prov) return 'needs-source';

  // 5. BLOCKED — nothing on this line can be governed, so "needs provenance" would be
  //    an instruction nobody can follow.
  const fields = governableFieldsFor(assetId, purchase);
  const drives = fields.some((f) => fieldOwnership(assetId, `${purchase.id}.${f}`, purchase).drivesRuntime);
  if (!drives) return 'blocked';

  // 6. UNSUPPORTED — no costed and no quantified value, so there is no claim to ground.
  const costed = Array.isArray(purchase.unitCostRange) && purchase.unitCostRange.length === 2;
  const quantified = purchase.qtyPerGuest != null || purchase.qtyFlat != null;
  if (!costed && !quantified) return 'unsupported';

  // 7. The default. A real value, governable, and nothing said about where it came from.
  return 'needs-provenance';
}

/**
 * knowledgeInventory(playbooks, publishedEntries) ->
 *   { total, counts, byPlaybook, orphanedPublished, rows }
 *
 * `total` is the number of AUTHORED purchase lines and is independent of how much
 * evidence exists. `counts` always sums to `total` — asserted by test, not by hope.
 */
export function knowledgeInventory(playbooks = [], publishedEntries = []) {
  const publishedKeys = new Set((publishedEntries || [])
    .filter((e) => e && e.assetId && e.fieldPath).map((e) => keyOf(e.assetId, e.fieldPath)));
  // The governed provenance a host would actually read, keyed by asset+purchase.
  const governedProv = new Map();
  for (const e of (publishedEntries || [])) {
    if (!e || !e.assetId || !/\.provenance$/.test(String(e.fieldPath || ''))) continue;
    governedProv.set(keyOf(e.assetId, String(e.fieldPath).split('.')[0]), e.value);
  }

  const counts = Object.fromEntries(INVENTORY_STATES.map((s) => [s, 0]));
  const byPlaybook = [];
  const rows = [];
  const seenLines = new Set();

  for (const pb of (playbooks || [])) {
    if (!pb || !pb.type) continue;
    const local = Object.fromEntries(INVENTORY_STATES.map((s) => [s, 0]));
    let lines = 0;
    for (const p of (pb.purchases || [])) {
      if (!p || !p.id) continue;
      const state = lineState(pb.type, p, publishedKeys, governedProv.get(keyOf(pb.type, p.id)));
      counts[state] += 1; local[state] += 1; lines += 1;
      seenLines.add(keyOf(pb.type, p.id));
      rows.push({ assetId: pb.type, id: p.id, item: p.item, category: p.category || 'other', state });
    }
    if (lines) byPlaybook.push({ assetId: pb.type, lines, counts: local });
  }

  // A published entry whose authored line no longer exists. Reported, never dropped —
  // a renamed or deleted purchase would otherwise take its governance with it silently.
  //
  // Derived from the ENTRIES, not by splitting the composite key: asset ids contain
  // spaces ("Crab Feast"), so any separator-based parse mis-reads them. The first
  // version of this did exactly that and reported both real entries as orphans.
  const orphanedPublished = (publishedEntries || [])
    .filter((e) => e && e.assetId && e.fieldPath
      && !seenLines.has(keyOf(e.assetId, String(e.fieldPath).split('.')[0])))
    .map((e) => `${e.assetId} ${e.fieldPath}`);

  const total = rows.length;
  return { total, counts, byPlaybook, orphanedPublished, rows };
}

/**
 * What share of the corpus is DIRECTLY CITED to a registered source.
 *
 * This is NOT "the share with any intellectual basis" and must never be presented as
 * such — see claimBasis.js `basisDistribution` for that. Renamed from `groundedShare`
 * in Phase 5G-B for exactly this reason.
 */
export function directlyCitedShare(inv) {
  if (!inv || !inv.total) return 0;
  return Math.round((inv.counts['directly-cited'] / inv.total) * 1000) / 10;
}

/**
 * A tree an operator can read at a glance. Shows the FULL denominator first, so a
 * small numerator cannot be mistaken for a small problem.
 */
export function inventoryTree(inv) {
  if (!inv) return '';
  const pad = (n) => String(n).padStart(5);
  const lines = [`TOTAL CANDIDATES ${pad(inv.total)}`];
  INVENTORY_STATES.forEach((s, i) => {
    const last = i === INVENTORY_STATES.length - 1;
    lines.push(`${last ? '└──' : '├──'} ${s.padEnd(17)}${pad(inv.counts[s])}`);
  });
  if (inv.orphanedPublished.length) {
    lines.push(`(orphaned published entries: ${inv.orphanedPublished.length})`);
  }
  return lines.join('\n');
}
