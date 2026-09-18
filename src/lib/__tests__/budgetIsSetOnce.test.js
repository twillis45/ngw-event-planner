// ─── ONE ANSWER TO "IS THE BUDGET SET" ───────────────────────────────────────
//
// Measured 2026-09-18 (money-engine audit). SIX readers each decided for
// themselves, on three different rules. The SHIPPED demo wedding — budget rows
// totalling $18,900, no `totalBudget` field (src/App.js ~4277) — made them
// disagree all at once, on one screen:
//
//   money bar          "$3,113 of $18,900 left"
//   budget editor      "A number to plan around… Use $X"   (asking for one)
//   hero cue           "Set your budget"
//   checklist          "Set the budget" — DONE
//   Reveal card        "$0 allocated across 6 categories. Budget is set and live."
//
// The Reveal is the sharpest: its GATE read the rows sum, then it packed only
// `totalBudget` into its data and printed `Number(undefined) || 0`. A wrong
// dollar figure and a false readiness claim in one sentence, on the surface
// whose whole job is to earn trust.
import { budgetFor, budgetTotal, budgetIsSet, budgetBasis, hostSetOverallBudget } from '../budgetFor';
import { hostSpending } from '../hostSpending';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { taskSatisfied } from '../taskEngine';
import { buildAssembleRevealStages } from '../assembleRevealEngines';
import { pickDroppableBudgetRow } from '../budgetSwap';

const iso = (d) => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

// THE SHIPPED SHAPE, not an invented one: six categories, real budgeted figures,
// no overall total. Mirrors src/App.js's seeded wedding.
const ROWS_ONLY = () => ({
  id: 'rows-only', type: 'Wedding', name: 'Seeded', date: iso(120),
  guestMode: 'count', guestCount: 80,
  venue: 'The Hall', venueCity: 'Santa Fe', venueState: 'NM',
  budget: [
    { category: 'Venue', budgeted: 5000, actual: 5000 },
    { category: 'Catering', budgeted: 8000, actual: 6000 },
    { category: 'Photography', budgeted: 2500, actual: 2500 },
    { category: 'Flowers', budgeted: 1800, actual: 1200 },
    { category: 'Music', budgeted: 1200, actual: 0 },
    { category: 'Stationery', budgeted: 400, actual: 385 },
  ],
});
const TOTAL_ONLY = () => ({ ...ROWS_ONLY(), id: 'total-only', budget: [], totalBudget: 18900 });
const BOTH = () => ({ ...ROWS_ONLY(), id: 'both', totalBudget: 25000 });
const NEITHER = () => ({ ...ROWS_ONLY(), id: 'neither', budget: [] });

describe('the accessor answers both questions, and says which', () => {
  test('rows only — there IS a number, and the host did not name it', () => {
    const b = budgetFor(ROWS_ONLY());
    expect(b.total).toBe(18900);
    expect(b.basis).toBe('rows');
    expect(b.isSet).toBe(true);
    expect(b.hostSetTotal).toBe(false);   // the editor's question — still open
    expect(b.rowCount).toBe(6);
  });

  test('an explicit total wins over the rows, and says so', () => {
    const b = budgetFor(BOTH());
    expect(b.total).toBe(25000);          // not 18900, not 43900
    expect(b.basis).toBe('host-total');
    expect(b.hostSetTotal).toBe(true);
    expect(b.rowsSum).toBe(18900);        // the rows are still reported, not lost
  });

  test('no budget anywhere returns NULL, never 0', () => {
    // "No budget" and "a budget of $0" are different facts. A reader that gets 0
    // cannot tell them apart, and that is how "$0 allocated" got printed.
    const b = budgetFor(NEITHER());
    expect(b.total).toBe(null);
    expect(b.basis).toBe(null);
    expect(b.isSet).toBe(false);
    expect(budgetTotal(NEITHER())).toBe(null);
  });

  test('a row budgeted at zero is not a budget', () => {
    const b = budgetFor({ budget: [{ category: 'Venue', budgeted: 0 }] });
    expect(b.isSet).toBe(false);
    expect(b.rowCount).toBe(0);
  });

  test('junk does not throw and claims nothing', () => {
    for (const ev of [null, undefined, {}, { budget: 'nope', totalBudget: 'lots' }]) {
      expect(budgetIsSet(ev)).toBe(false);
      expect(budgetBasis(ev)).toBe(null);
    }
  });
});

describe('every reader now agrees on the shipped shape', () => {
  // This is the whole point: one event, six surfaces, one answer.
  test('hostSpending reports the rows total', () => {
    expect(hostSpending(ROWS_ONLY()).total).toBe(18900);
  });

  test('the readiness ledger no longer asks for a budget it already has', () => {
    const pp = deriveEventPhaseProgress(ROWS_ONLY());
    const cues = (pp.items || []).filter((i) => i.id === 'budget');
    expect(cues.length).toBe(1);
    expect(cues[0].cueLabel).not.toBe('Set your budget');
  });

  test('…and it still asks when there is genuinely no number', () => {
    // The negative control. A gate that never fires is not a gate.
    const pp = deriveEventPhaseProgress(NEITHER());
    const cue = (pp.items || []).find((i) => i.id === 'budget');
    expect(cue.cueLabel).toBe('Set your budget');
    expect(cue.handled).toBe(false);
  });

  test('the checklist agrees with the ledger, both ways', () => {
    expect(taskSatisfied(ROWS_ONLY(), { task: 'Set the budget' })).toBe(true);
    expect(taskSatisfied(NEITHER(), { task: 'Set the budget' })).toBe(false);
  });

  test('budgetSwap knows the ceiling moves when the total is derived', () => {
    // Not "is a budget set" — a different question, now named. Rows-only means a
    // dropped row lowers the ceiling too, so the swap must simulate both sides.
    expect(() => pickDroppableBudgetRow(ROWS_ONLY(), 1)).not.toThrow();
    expect(budgetBasis(ROWS_ONLY())).toBe('rows');
    expect(budgetBasis(TOTAL_ONLY())).toBe('host-total');
    expect(hostSetOverallBudget(TOTAL_ONLY())).toBe(true);
  });
});

describe('the Reveal prints the money that is actually there', () => {
  const budgetStage = (ev) => {
    const stages = buildAssembleRevealStages(ev, null, null) || [];
    return stages.find((s) => s && /budget/i.test(String(s.title || s.key || '')));
  };

  test('(premise) the card is shown for a rows-only plan at all', () => {
    // It always was — the gate read the rows. That is what made the $0 possible.
    expect(budgetStage(ROWS_ONLY())).toBeTruthy();
  });

  test('$18,900 — never $0', () => {
    const s = budgetStage(ROWS_ONLY());
    expect(s.what).toContain('18,900');
    expect(s.what).not.toMatch(/\$0\b/);
  });

  test('it does not claim a budget is "set and live" when nobody set one', () => {
    // The rows are real money the host planned. A ceiling is not what they gave.
    const s = budgetStage(ROWS_ONLY());
    expect(s.why).not.toMatch(/set and live/i);
    expect(s.why).toMatch(/overall number|ceiling/i);
  });

  test('a host who DID set a total still hears the confident line', () => {
    const s = budgetStage(BOTH());
    expect(s.what).toContain('25,000');
    expect(s.why).toMatch(/set and live/i);
  });

  test('no budget at all — no card, rather than a $0 card', () => {
    expect(budgetStage(NEITHER())).toBeFalsy();
  });
});

// ─── THE RATCHET: NO SURFACE RE-DERIVES THIS ─────────────────────────────────
// A gate five readers use and a sixth does not is the exact shape this repo hit
// all day — the venue verdict had eight copies, this had six.
describe('no engine keeps a private copy of the rule', () => {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '..', '..', '..');
  const strip = (f) => fs.readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  // The re-derivation shape: totalBudget coerced and compared to zero.
  const PRIVATE = /Number\(\s*(ev|event)\.totalBudget[^)]*\)\s*>\s*0/;

  test.each([
    ['src/lib/hostSpending.js'],
    ['src/lib/phaseProgress.js'],
    ['src/lib/taskEngine.js'],
    ['src/lib/budgetSwap.js'],
    ['src/lib/assembleRevealEngines.js'],
    ['hostv2/src/HostShellV2.jsx'],
  ])('%s asks the accessor', (rel) => {
    const src = strip(path.join(ROOT, rel));
    expect(src).toMatch(/budgetFor|budgetTotal|budgetIsSet|budgetBasis|hostSetOverallBudget/);
    expect(src).not.toMatch(PRIVATE);
  });

  test('canary: the scanner bites the shape it is meant to catch', () => {
    expect(PRIVATE.test('const isSet = Number(event.totalBudget) > 0;')).toBe(true);
    expect(PRIVATE.test('const isSet = budgetFor(event).hostSetTotal;')).toBe(false);
  });
});
