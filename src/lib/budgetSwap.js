// Swap-to-save — ONE discretionary budget row whose removal genuinely clears
// the overage. Extracted VERBATIM from App.js (pickDroppableBudgetRow) so both
// apps consume one implementation; re-derives over/under from the SAME
// hostSpending source — no parallel math, fully honest.
import hostSpending from './hostSpending';

// \bcater\b missed 'Catering'/'Caterer' (no boundary after 'cater') — the
// engine offered to DROP THE CATERER as a discretionary cut. cater\w* fixes
// the word family; found live the day this was extracted from App.js.
export const BUDGET_ESSENTIAL_RE = /\b(venue|food|cater\w*|rental\w*|chairs?|tables?|hall|space)\b/i;

export function pickDroppableBudgetRow(event, priceFactor) {
  const ev = event || {};
  const rows = Array.isArray(ev.budget) ? ev.budget : [];
  // Whether the ceiling is FIXED (host set an explicit total) or DERIVED (sum of row
  // budgets). When derived, removing a row lowers the ceiling too, so we must simulate
  // the FULL removal — committed AND total both move — and only offer the drop if the
  // post-drop state is genuinely under. hostSpending is the one source for both numbers.
  const fixedTotal = (Number(ev.totalBudget) > 0);
  const candidates = rows
    .filter((r) => r && (r.category || r.label))
    .filter((r) => !BUDGET_ESSENTIAL_RE.test(String(r.category || r.label || '')))
    .map((r) => {
      // Simulate dropping this row entirely and re-derive over/under from the SAME
      // hostSpending source — no parallel math, fully honest.
      const after = { ...ev, budget: rows.filter((x) => x !== r) };
      let sp2;
      try { sp2 = hostSpending(after, priceFactor); } catch { sp2 = null; }
      const clears = sp2 && (sp2.committed <= sp2.total);
      const drop = Math.max(0, Number(r.actual) || 0) || Math.max(0, Number(r.budgeted) || 0);
      return { row: r, drop, clears };
    })
    // Only rows whose REMOVAL genuinely brings the committed total back under the
    // (possibly-lowered) ceiling, and that represent a real amount.
    .filter((c) => c.clears && c.drop > 0)
    .sort((a, b) => b.drop - a.drop);
  void fixedTotal;
  return candidates.length ? candidates[0] : null;
}
