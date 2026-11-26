// ─── WHICH SHOPPING ITEMS A TICKED "BUY" STEP BUYS (11/16/2026) ──────────────
//
// Ticking a checklist step that says buy/shop writes the shopping list's
// "bought" marks, so the list, totals and the day-before brief agree. It used to
// mark the WHOLE list for any such step, so "Buy the turkey" bought the ice and
// the dish labels too (50-host run, round 2). Now:
//   · a step that names list items buys those items;
//   · a general step ("Do the shopping", "Buy everything") buys the whole list;
//   · anything else buys nothing.
// Only the step's lead clause is read: "Buy the turkey: about a pound…" names
// the turkey, not every word in its advice. PURE.
// Only lines she buys (hostBuysLine, the rule "Still to get" counts by): a
// dish a friend or the guests bring is never marked bought by her tick
// (live check, 11/26/2026: Still to get 28, the tick said 40).
import { hostBuysLine } from './playbooks';

const IS_BUY = /\b(buy|shop|shopping|groceries|grocery)\b/i;
const GENERAL = /\b(shopping|groceries|grocery|everything|the list|all of it)\b|\bdo the (?:big )?shop\b/i;
// Words that appear in item names but say nothing about WHICH item.
const FILLER = new Set(['the', 'and', 'for', 'with', 'from', 'your', 'host', 'covers', 'makings', 'spare', 'whole', 'small', 'table', 'what', 'made', 'send', 'home', 'kit', 'option', 'one']);

const leadOf = (task) => String(task || '').split(/[:.;—]/)[0];
const words = (s) => String(s || '').toLowerCase().match(/[a-z]+/g) || [];
const singular = (w) => w.replace(/(?:es|s)$/, '');

/** @returns {{ scope: 'items'|'all'|'none', ids: string[] }} */
export function itemsBoughtByTask(task, list) {
  const lead = leadOf(task);
  const items = (Array.isArray(list) ? list : []).filter((it) => it && it.id && !it.skipped && hostBuysLine(it));
  if (!IS_BUY.test(lead)) return { scope: 'none', ids: [] };
  const said = new Set(words(lead).map(singular));
  const named = items.filter((it) => words(String(it.item || '').split('(')[0])
    .some((w) => w.length >= 3 && !FILLER.has(w) && said.has(singular(w))));
  if (named.length) return { scope: 'items', ids: named.map((it) => it.id) };
  if (GENERAL.test(lead)) return { scope: 'all', ids: items.map((it) => it.id) };
  return { scope: 'none', ids: [] };
}
