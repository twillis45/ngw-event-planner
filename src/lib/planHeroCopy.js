// ─── planHeroCopy — PLAN-HERO-1 (BUD-1 grammar for the Plan tab) ──────────────
//
// Todd (2026-07-07): "Look at the plan tab hero copy. I want to design the
// hero copy here like we did for the budget tab."
//
// Same contract as lib/budgetCopy.js: a PURE helper that derives the Plan
// tab's hero from THAT TAB'S real data — the decision board and the food
// plan/shopping state — so the language rules are testable and the hero can
// never contradict the panels below it (they read the same sources).
//
// States (calmest-last):
//   settle_overdue · the board has overdue decisions — they ARE the hero
//   settle_ready   · decisions open, none overdue — invite, don't push
//   shopping       · everything settled, items still to buy — count + $
//   allset         · settled and bought — the exhale
//   null           · no real plan data yet (setup flows own the hero)
//
// Language: host-friendly only. Never "locked/blocked/overdue by N days";
// "past its easy window" is the strongest phrasing.

import { playbookDecisionBoard, playbookFoodPlan } from './playbooks';

const money = (n) => '$' + Math.round(Math.abs(Number(n) || 0)).toLocaleString();

export function planHeroCopy(event, priceFactor) {
  const ev = event || {};

  let board = null;
  try { board = playbookDecisionBoard(ev); } catch { board = null; }
  let plan = null;
  try { plan = playbookFoodPlan(ev, priceFactor ? { priceFactor } : undefined); } catch { plan = null; }

  const open = (board && Array.isArray(board.open)) ? board.open : [];
  const list = (plan && Array.isArray(plan.list)) ? plan.list : [];
  if (!open.length && !list.length) return null; // nothing real yet — setup owns the hero

  const overdue = open.filter((r) => r.status === 'overdue');
  if (overdue.length) {
    const first = overdue[0];
    return {
      state: 'settle_overdue',
      title: `Settle: ${first.label}.`,
      line: overdue.length === 1
        ? 'It’s past its easy window — the spread and shopping list size from it.'
        : `${overdue.length} decisions are past their easy window — this one first. The spread and shopping list size from them.`,
      cta: 'Open what to settle',
      route: { tab: 'Planning', focusField: 'host-decisions' },
      numbers: { overdue: overdue.length, open: open.length },
    };
  }

  const ready = open.filter((r) => r.status === 'ready');
  if (ready.length) {
    return {
      state: 'settle_ready',
      title: `Good to settle: ${ready[0].label}.`,
      line: open.length === 1
        ? 'No rush — it’s ready when you are.'
        : `No rush — ${open.length} open, each in its own time.`,
      cta: 'Open what to settle',
      route: { tab: 'Planning', focusField: 'host-decisions' },
      numbers: { overdue: 0, open: open.length },
    };
  }

  // Board quiet (nothing overdue or ready) — shopping is the live work.
  const got = (ev.foodGot && typeof ev.foodGot === 'object') ? ev.foodGot : {};
  const unbought = list.filter((i) => i && !i.skipped && !got[i.id]);
  if (unbought.length) {
    const low = unbought.reduce((s, i) => s + (Number(i.locked != null ? i.locked : i.low) || 0), 0);
    const high = unbought.reduce((s, i) => s + (Number(i.locked != null ? i.locked : i.high) || 0), 0);
    const dollars = high > 0 ? (Math.round(low) === Math.round(high) ? money(low) : `${money(low)}–${money(high)}`) : null;
    return {
      state: 'shopping',
      title: `Buy the remaining ${unbought.length} item${unbought.length === 1 ? '' : 's'}.`,
      line: `${dollars ? `About ${dollars} still to spend — ` : ''}everything else on the plan is settled.${open.length ? ` ${open.length} decision${open.length === 1 ? '' : 's'} will be ready closer in.` : ''}`,
      cta: 'Open the list',
      // ROW-LEVEL CTA RULE (Todd, 2026-07-07): land on the FIRST unbought line
      // (foodFocus scrolls + highlights the row), never the food-plan section top.
      route: { tab: 'Planning', foodFocus: unbought[0].id },
      numbers: { unbought: unbought.length, low, high },
    };
  }

  return {
    state: 'allset',
    title: 'The plan’s handled.',
    line: 'Spread settled, shopping done — nothing on this tab needs you.',
    cta: null,
    route: null,
    numbers: { open: open.length },
  };
}
