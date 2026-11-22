// Swap-to-save — ONE discretionary budget row whose removal genuinely clears
// the overage. Extracted VERBATIM from App.js (pickDroppableBudgetRow) so both
// apps consume one implementation; re-derives over/under from the SAME
// hostSpending source — no parallel math, fully honest.
import hostSpending from './hostSpending';
import { budgetBasis } from './budgetFor';
import { getPlaybook, playbookFoodPlan } from './playbooks';
import { cashBarParent } from './playbooks/cashBarCover';
import { normalizeCategory } from './vendorAccountability/playbooks';

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
  //
  // 2026-09-18: this file is asking a DIFFERENT question from the other five
  // budget readers — not "is a budget set" but "does the ceiling move when a row
  // goes". That distinction had no name, which is how the six copies drifted
  // apart in the first place. `budgetBasis` names it: 'host-total' is a fixed
  // ceiling, 'rows' is a derived one. Same value as before, now stated.
  const fixedTotal = budgetBasis(ev) === 'host-total';
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

// ─── A CHEAPER BAR BEFORE NO BAR (Wanda audit P2-9, 11/22/2026) ──────────────
// The one-line fix said "drop Open Bar (~$700)" on a plan whose own drinks call
// offers a cash bar. When the row the fix would drop is the bar, and the drinks
// call has a cash pick, this prices that pick the way the spread does (the
// beverage lines the host still covers, at their midpoints) and returns it when
// it costs less than the row: { option, cover, saves, clears } or null.
// `clears` is true only when setting the row to `cover` brings the EXPECTED
// total under the ceiling — the basis the recovery headline speaks on.
const mid = (l) => (l.locked != null ? Number(l.locked) : (Number(l.low) + Number(l.high)) / 2) || 0;
export function cheaperBarOption(event, candidate, priceFactor) {
  const ev = event || {};
  const row = candidate && candidate.row;
  if (!row || normalizeCategory(String(row.category || row.label || '')) !== normalizeCategory('Bar / Beverage')) return null;
  const parent = (() => { try { return cashBarParent(getPlaybook(ev.type)); } catch (_e) { return null; } })();
  if (!parent) return null;
  const current = (ev.foodChoices || {})[parent.decision.id];
  if (parent.picks.includes(current)) return null;   // already a cash bar
  let plan = null;
  try { plan = playbookFoodPlan({ ...ev, foodChoices: { ...(ev.foodChoices || {}), [parent.decision.id]: parent.pick } }, { priceFactor: Number(priceFactor) > 0 ? Number(priceFactor) : 1 }); } catch (_e) { plan = null; }
  if (!plan) return null;
  const cover = Math.round((plan.list || []).filter((l) => l && l.cat === 'beverage' && !l.skipped).reduce((s2, l) => s2 + mid(l), 0));
  const drop = Number(candidate.drop) || 0;
  if (!(cover > 0) || cover >= drop) return null;
  const rows = Array.isArray(ev.budget) ? ev.budget : [];
  let clears = false;
  try {
    const sp = hostSpending({ ...ev, budget: rows.map((r) => (r === row ? { ...r, budgeted: cover } : r)) }, priceFactor);
    clears = sp.total > 0 && sp.expected <= sp.total;
  } catch (_e) { clears = false; }
  return { option: parent.pick, cover, saves: drop - cover, clears };
}
