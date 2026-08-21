// ─── THE CHECKLIST FOLLOWS THE DECISIONS ────────────────────────────────────
//
// `playbookChecklist()` is a gated generator. Four gates inside it exist for
// one purpose — to make a decision the host takes LATER reshape what is left to
// do: `choiceShown` (the whenChoice pick), `modeShown` (how guests arrive),
// `whenKids`, and the caterer lever. It computes all four correctly.
//
// The host never saw any of it. `event.timeline` was written once at creation
// and never asked again, so every gate fired exactly once, against whatever was
// known before the host had decided anything, and was dead from then on. The
// audit of 2026-08-21 measured the consequence: flip a crab feast's
// `steam_vs_order` to "Steam them myself" and the engine correctly swaps in
// "Rent or borrow a rack steamer pot (40+ qt) + propane burner" and drops the
// pickup rows — while the host's actual list still told them to go collect hot
// crabs from a crab house they were no longer ordering from.
//
// ── WHY MERGE RATHER THAN REGENERATE ────────────────────────────────────────
//
// Regenerating is one line and it is wrong: it throws away every `done` the
// host has ticked, every owner they assigned, and every row they added by hand.
// A planner that forgets what you finished because you answered a question is
// worse than one that never asked.
//
// ── WHY RETIRE RATHER THAN DELETE ───────────────────────────────────────────
//
// When a gate closes, the row it was keeping alive has to leave the open list —
// that is the whole point. But deleting it means a row the host may have
// already half-done vanishes with no trace, and a list that silently loses
// items is a list nobody trusts. So a gated-out row is marked `retired` with
// the reason, stays in the data, and folds away with the done rows. If the host
// changes their mind back, the same row REVIVES carrying its `done` state,
// because it is the same row — it was never destroyed.
//
// ── WHAT IS NEVER TOUCHED ───────────────────────────────────────────────────
//
// Only `pbt-` rows are the engine's to manage. Anything the host typed has no
// such prefix and is passed through untouched, in place. The engine may never
// edit or retire a row a person wrote.

/** Fields the generator owns and may refresh on an existing row. `task` is in
 *  the list deliberately: `copyByAnswer` and the arrival-mode wording mean the
 *  same task id can legitimately change its label when an answer lands. */
const DERIVED_FIELDS = ['task', 'week', 'leadDays', 'category', 'phase', 'provenance'];

/** Host-owned state, preserved across every reconcile. */
const KEPT_FIELDS = ['done', 'owner', 'note', 'notes', 'assignee', 'boughtAt', 'doneAt'];

const isEngineRow = (r) => !!(r && typeof r.id === 'string' && r.id.startsWith('pbt-'));

/**
 * reconcileChecklist(stored, derived, opts) -> { rows, added, retired, revived, relabeled, changed }
 *
 * `stored`  — event.timeline as persisted (may contain manual rows).
 * `derived` — playbookChecklist(event) for the CURRENT event state.
 *
 * `changed` is the whole point of the return shape: the caller patches only
 * when it is true, so a reconcile that finds nothing to do costs one comparison
 * and writes nothing. Without it, running this on every render would rewrite
 * the event forever.
 */
export function reconcileChecklist(stored, derived, opts) {
  const reason = (opts && opts.reason) || 'your answers changed what this needs';
  const prior = Array.isArray(stored) ? stored : [];
  const next = Array.isArray(derived) ? derived : [];

  // A derived set of zero is NOT "every engine row is gone" — it is far more
  // likely that the playbook is missing, the date is unset, or the generator
  // threw. Retiring the host's entire list on that basis would be catastrophic
  // and un-undoable, so an empty derivation is treated as "no information" and
  // the stored list is returned untouched. The 9 typeless event types in the
  // audit produce exactly this, which is why the guard is not hypothetical.
  if (!next.length) {
    return { rows: prior, added: 0, retired: 0, revived: 0, relabeled: 0, changed: false };
  }

  const byId = new Map(next.map((r) => [r.id, r]));
  const seen = new Set();
  let added = 0; let retired = 0; let revived = 0; let relabeled = 0; let changed = false;

  const rows = prior.map((row) => {
    if (!isEngineRow(row)) return row;             // the host's own row: untouched
    const d = byId.get(row.id);

    if (!d) {
      // The gate that was keeping this row open has closed.
      if (row.retired) return row;                 // already retired, nothing to say
      retired += 1; changed = true;
      return { ...row, retired: true, retiredReason: reason };
    }

    seen.add(row.id);
    const out = { ...row };
    let touched = false;

    if (row.retired) {                             // the gate re-opened: revive in place
      delete out.retired; delete out.retiredReason;
      revived += 1; touched = true;
    }
    for (const f of DERIVED_FIELDS) {
      if (d[f] === undefined) continue;
      // Compared by value, not identity: `provenance` is a fresh object every
      // generation, so an identity check would mark every row changed on every
      // pass and the caller would patch in a loop forever.
      const same = JSON.stringify(out[f]) === JSON.stringify(d[f]);
      if (same) continue;
      if (f === 'task') relabeled += 1;
      out[f] = d[f];
      touched = true;
    }
    if (touched) changed = true;
    return touched ? out : row;
  });

  // Anything the generator produced that we have never stored is new work.
  // Appended rather than spliced into position: the stored order is the order
  // the host has been reading, and silently re-sorting a list underneath
  // someone is its own kind of dizzying. `leadDays` is carried, so any surface
  // that wants due-order can sort on the real lead.
  for (const d of next) {
    if (seen.has(d.id)) continue;
    const already = prior.some((r) => r && r.id === d.id);
    if (already) continue;
    const row = { done: false, owner: '' };
    for (const f of DERIVED_FIELDS) if (d[f] !== undefined) row[f] = d[f];
    for (const f of KEPT_FIELDS) if (d[f] !== undefined && row[f] === undefined) row[f] = d[f];
    row.id = d.id;
    rows.push(row);
    added += 1; changed = true;
  }

  return { rows, added, retired, revived, relabeled, changed };
}

/** The one-line summary a toast can carry. Returns '' when nothing moved, so
 *  the caller can stay silent rather than announcing a no-op. */
export function reconcileSummary(res) {
  if (!res || !res.changed) return '';
  const parts = [];
  if (res.added) parts.push(`${res.added} new task${res.added === 1 ? '' : 's'}`);
  if (res.retired) parts.push(`${res.retired} no longer needed`);
  if (res.revived) parts.push(`${res.revived} back on the list`);
  if (!parts.length) return '';                    // relabels alone are silent
  return `Your checklist followed that decision — ${parts.join(', ')}.`;
}

export const __test__ = { isEngineRow, DERIVED_FIELDS, KEPT_FIELDS };
