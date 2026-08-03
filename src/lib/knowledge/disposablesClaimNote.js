// ─── CANONICAL DISPOSABLES CLAIM NOTE (Phase 5F.11 Part 2) ───────────────────
//
// TEN REMAINING RECORDS SHARE ONE REVIEW QUESTION: identical field, identical source,
// identical tier, identical authored value, no value change. Hand-composing ten
// near-identical governed notes is how a caveat gets dropped from the ninth one — and
// the note is host-facing text, so a dropped caveat is a host reading an undisclosed
// vendor figure.
//
// SCOPE, DELIBERATELY NARROW. This builds the note for ONE proven batch shape:
// disposable place settings grounded to `jollychef-disposables-2026`. It is not a copy
// framework and takes no free text. If a future batch needs different wording, it gets
// its own builder or none.
//
// THE WORDING IS NOT NEW. It is the note from the Birthday record that was reviewed,
// approved, published and host-verified, reduced to its parameters. Structure preserved
// exactly: what the source says -> what the line authors -> value NOT changed ->
// LIMITATION (only when it applies) -> CAVEAT (always).
//
// PURE: no I/O, no DOM.

/** What the source states, verbatim from its registry claim. Not restated loosely. */
const SOURCE_FIGURES = Object.freeze({
  jollychef: {
    name: 'JollyChef',
    plates: '1.3-1.5 dinner plates/guest for a buffet',
    cupsCutlery: '1.5 cups+cutlery/guest',
    napkins: '3 napkins/guest',
  },
});

/**
 * buildDisposablesClaimNote(opts) -> string
 *
 * @param authoredValue  the number the playbook already carries. Never changed.
 * @param unit           'sets/guest' | 'cups/guest' — what the line actually counts.
 * @param bundlesNapkins whether the line's unit bundles napkins. Drives the LIMITATION
 *                       sentence, which must appear ONLY when it is true: the source
 *                       counts napkins separately at 3/guest, so a bundled set
 *                       under-provides them and a host should be told. A cups-only line
 *                       makes no napkin claim, and asserting a napkin shortfall there
 *                       would be a caveat about something the line does not buy.
 */
export function buildDisposablesClaimNote({
  authoredValue,
  unit = 'sets/guest',
  bundlesNapkins = true,
  source = 'jollychef',
} = {}) {
  const f = SOURCE_FIGURES[source];
  if (!f) throw new Error(`disposables note: unknown source "${source}"`);
  if (typeof authoredValue !== 'number' || !Number.isFinite(authoredValue)) {
    throw new Error('disposables note: authoredValue must be a number — the note states it verbatim');
  }

  const parts = [
    `${f.name} states ${f.plates} and ${f.cupsCutlery}.`,
    `The authored ${authoredValue} ${unit} sits at that figure; value NOT changed.`,
  ];
  if (bundlesNapkins) {
    parts.push(`LIMITATION: the source recommends ${f.napkins}, more than one set provides.`);
  }
  parts.push('CAVEAT: vendor-published and commercially interested in a higher multiplier - '
    + 'trade consensus among sellers, not independent corroboration.');
  return parts.join(' ');
}

/** The reason line. Same discipline: states the defect and that no value moved. */
export function buildDisposablesReason({ purchaseId, authoredValue, unit = 'sets/guest' } = {}) {
  if (!purchaseId) throw new Error('disposables reason: purchaseId is required');
  return `Batch 2 provenance-only: ${purchaseId} carries no provenance. Grounding the authored `
    + `${authoredValue} ${unit} to the disposables source that states that figure. No value change.`;
}
