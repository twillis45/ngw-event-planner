// ─── CROSS-SURFACE DECISION IDENTITY — one card, one subject ─────────────────
//
// THE DEFECT (PR #70, driven on Game Night 2026-07-31, 1440×900).
// One hero card said three different things about what it was for:
//
//   ask    "Decide the menu."          ← heroAskFor, from the word "servings"
//   record "Chips, crackers, pretzels  ← the action itself: a shopping line
//           & popcorn — 13 snack
//           servings tomorrow"
//   panel  We'll cook it (chosen) ·    ← the food SOURCING decision, which the
//          A caterer handles it ·         host had already answered weeks ago
//          Potluck
//
// The board had ZERO open decisions at the time. The panel was not a decision
// the engine raised — it was attached because the action's route carries
// `foodFocus`, the id of an unbought line in the shopping list. A row pointer
// was read as a decision association.
//
// So the invariant under test is identity, not wording: whatever the hero, the
// panel and the CTA are about, they must all be about the SAME thing, and that
// thing must be something the action DECLARES.
import fs from 'fs';
import path from 'path';
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { playbookDecisionBoard } from '../playbooks';
import { heroAskFor } from '../heroAsk';
import { boardDecisionND, foodDecisionND } from '../decisionND';
import { decisionIdentityFor, isSettledDecision, resolveSelection } from '../selectedAction';
import { useFrozenClock } from '../../testUtils/frozenClock';
import { gameNightEvent } from '../../testUtils/gameNightSelectionFixture';

useFrozenClock();

const queueFor = (ev) => {
  const ctx = (() => { try { return buildExperienceContext(ev, null, 1); } catch { return null; } })();
  return (eventPlan(ev, ctx) || {}).nextActions || [];
};

// The resolvers the shell injects, minus `settle` (which writes). Built from the
// shipped builders — the test wires them, it does not re-derive them.
const resolversFor = (ev) => {
  const board = (() => { try { return playbookDecisionBoard(ev) || { open: [] }; } catch { return { open: [] }; } })();
  const open = board.open || [];
  const guests = Number(ev.guestCount || ev.guestEstimate) || 0;
  return {
    boardRow: (identity) => open.find(r => r && String(r.id) === String(identity.decisionId)) || null,
    decisionND: (identity) => {
      if (identity.decisionId === 'phase:food') return foodDecisionND(ev, guests, [...open, ...(board.locked || [])]);
      const row = open.find(r => r && String(r.id) === String(identity.decisionId));
      return row ? boardDecisionND(ev, row) : null;
    },
    actionAsk: (a) => heroAskFor(a, ev),
  };
};

describe('the Game Night reproduction — a shopping line is not a decision', () => {
  test('the queue winner is the snack-buy action, and it declares no decision', () => {
    const ev = gameNightEvent();
    const q0 = queueFor(ev)[0];
    expect(q0).toBeTruthy();
    expect(q0.id).toBe('top:operational:p_snacks');
    expect(q0.title).toMatch(/13 snack servings/);
    // The route names a ROW in the shopping list. That is a scroll target.
    expect(q0.route).toMatchObject({ tab: 'Planning', foodFocus: 'p_snacks' });
    expect(q0.decisionId == null).toBe(true);
    // …so it has no decision identity at all.
    expect(decisionIdentityFor(q0)).toBeNull();
  });

  test('the provider decision is COMPLETED, and the board has nothing open', () => {
    const ev = gameNightEvent();
    expect(ev.foodChoices.sourcing).toBe('host cooks');
    const nd = foodDecisionND(ev, 12, []);
    expect(nd.selected).toBe('host cooks');
    expect(isSettledDecision(nd)).toBe(true);
    // Nothing the engine raised could have supplied that panel.
    expect((playbookDecisionBoard(ev).open || []).length).toBe(0);
  });

  test('hero, panel and CTA resolve to ONE identity — and it is null here', () => {
    const ev = gameNightEvent();
    const q0 = queueFor(ev)[0];
    const sel = resolveSelection(q0, resolversFor(ev));

    expect(sel.actionId).toBe('top:operational:p_snacks');
    expect(sel.decisionId).toBeNull();          // hero
    expect(sel.decision).toBeNull();            // panel — nothing to render
    expect(sel.options).toEqual([]);
    expect(sel.completionState).toBe('none');
    expect(sel.route).toBe(q0.route);           // CTA follows the action
    // No provider options may appear on a non-provider action.
    const labels = sel.options.map(o => o.label).join(' ');
    expect(labels).not.toMatch(/caterer|potluck|cook it/i);
  });

  test('the ask names the real job, and never invents a menu decision', () => {
    const ev = gameNightEvent();
    const q0 = queueFor(ev)[0];
    const sel = resolveSelection(q0, resolversFor(ev));
    // THE PRE-FIX FAILURE: "servings" fell into the menu dimension and the hero
    // told the host to decide something that was neither open nor asked.
    expect(sel.ask).not.toMatch(/menu/i);
    expect(heroAskFor(q0, ev)).not.toMatch(/menu/i);
    // Still a real instruction, not the dead placeholder.
    expect(sel.ask).toBeTruthy();
    expect(sel.ask).not.toBe('Your next step.');
    // Voice: exactly one terminal mark, never a bare or doubled one.
    expect(sel.ask).not.toMatch(/\?\?|\.\.|[?.!]\s*[?.!]/);
    expect(sel.ask).not.toBe('?');
    expect(String(sel.ask)).not.toMatch(/undefined|null|NaN/);
  });
});

describe('completed decisions cannot become the active one', () => {
  test('a settled decision on its OWN action reports settled, and renders no panel', () => {
    const ev = gameNightEvent();
    const settledFoodAction = { id: 'phase:food', title: 'Note dietary needs on the food plan', route: { tab: 'Planning' } };
    const sel = resolveSelection(settledFoodAction, resolversFor(ev));
    expect(sel.completionState).toBe('settled');
    expect(sel.selectedOption).toBe('host cooks');
    expect(sel.decisionId).toBeNull();
    expect(sel.decision).toBeNull();
  });

  test('a resolver offering an unrelated decision cannot attach it to a bare action', () => {
    const ev = gameNightEvent();
    const q0 = queueFor(ev)[0];
    // A deliberately over-eager resolver — the shape the shell used to have, where
    // sharing a food classification was enough to supply a panel.
    const overEager = {
      ...resolversFor(ev),
      decisionND: () => foodDecisionND({ ...ev, foodChoices: {} }, 12, []),
      boardRow: () => null,
    };
    const sel = resolveSelection(q0, overEager);
    // Identity refuses it before the resolver is ever consulted.
    expect(sel.decisionId).toBeNull();
    expect(sel.options).toEqual([]);
  });

  test('shared category, workstream or keywords never confer identity', () => {
    for (const a of [
      { id: 'top:operational:p_snacks', title: 'Buy chips — 13 snack servings', domain: 'food', category: 'food', route: { tab: 'Planning', foodFocus: 'p_snacks' } },
      { id: 'phase:shopping', title: 'Buy the remaining items · 12 left', domain: 'shopping', route: { tab: 'Planning', foodFocus: 'p_snacks' } },
      { id: 'top:food:decide-the-food', title: 'Resolve the food decision', domain: 'food' },
    ]) {
      expect(decisionIdentityFor(a)).toBeNull();
    }
  });
});

describe('identity survives the wording ladder', () => {
  const openBoardEvent = () => {
    // A repast keeps its authored food-provider lever OPEN — the scenario the
    // panel is legitimately for.
    const ev = gameNightEvent();
    return { ...ev, id: 'gn-open', foodChoices: { ...ev.foodChoices, sourcing: null } };
  };

  test('a declared decision is carried, and the authored ask leads', () => {
    const ev = openBoardEvent();
    const action = { id: 'phase:food', title: 'Sort the food', route: { tab: 'Planning' } };
    const sel = resolveSelection(action, resolversFor(ev));
    expect(sel.decisionId).toBe('phase:food');
    expect(sel.completionState).toBe('open');
    expect(sel.decision).toBeTruthy();
    expect(sel.options.length).toBeGreaterThan(0);
  });

  test('removing the authored ask changes the WORDS and nothing else', () => {
    const ev = openBoardEvent();
    const action = { id: 'phase:food', title: 'Sort the food', route: { tab: 'Planning' } };
    const withAsk = resolveSelection(action, {
      ...resolversFor(ev),
      boardRow: () => ({ id: 'phase:food', ask: 'Who provides the food?' }),
    });
    const withoutAsk = resolveSelection(action, {
      ...resolversFor(ev),
      boardRow: () => ({ id: 'phase:food' }),
    });
    expect(withAsk.ask).toBe('Who provides the food?');
    expect(withoutAsk.ask).not.toBe(withAsk.ask);          // wording moved
    expect(withoutAsk.decisionId).toBe(withAsk.decisionId); // identity did not
    expect(withoutAsk.options).toEqual(withAsk.options);
    expect(withoutAsk.route).toBe(withAsk.route);
  });

  test('a title-derived fallback can never conjure a panel', () => {
    const ev = gameNightEvent();
    const decisionish = { id: 'top:operational:x', title: 'Resolve the menu decision — past its window', route: { tab: 'Planning' } };
    const sel = resolveSelection(decisionish, resolversFor(ev));
    expect(sel.decisionId).toBeNull();
    expect(sel.decision).toBeNull();
    expect(sel.ask).toBeTruthy();
  });
});

// ─── THE WIRE ITSELF ─────────────────────────────────────────────────────────
// resolveSelection can only be the single authority if the shell stops asking
// the question three more times. These are the exact call shapes that were the
// competing authorities; each is pinned by name so a re-introduction is loud.
describe('HostShellV2 keeps no independent decision lookup', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
  // Assert on a BOOLEAN, never on SRC itself — a failed toMatch against an
  // 8,500-line file prints the whole file and buries the finding.
  const has = (re) => re.test(SRC);

  test('a route row-pointer never selects the food DECISION editor', () => {
    // `foodFocus` is a shopping-line id. wiredKind mapping it to the food
    // decision is what put a completed provider pick under a snack item.
    expect(has(/a\.route\.foodFocus\)\s*\|\|\s*f === 'food-plan'/)).toBe(false);
    expect(has(/f === 'food-plan'\) return 'food'/)).toBe(true);
  });

  test('the hero panel does not re-dispatch its own decision', () => {
    expect(has(/const nd = decisionFor\(a\);/)).toBe(false);
  });

  test('the decisions-bundle hero does not reach for callsOrdered[0]', () => {
    expect(has(/\/decision\/i\.test\(String\(a\.title \|\| ''\)\) && callsOrdered\[0\]/)).toBe(false);
  });

  test('the hero ask reads the canonical selection', () => {
    expect(has(/resolveSelection/)).toBe(true);
    expect(has(/heroSelection/)).toBe(true);
  });
});
