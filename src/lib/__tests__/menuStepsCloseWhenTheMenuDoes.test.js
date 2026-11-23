// MENU STEPS CLOSE WHEN THE MENU DOES (single-source audit, 11/18/2026).
// One menu pick used to mark "Write the full menu…" and the grocery run as
// handled by the plan, while the hero said "Decide what you're serving · 3
// open". The checklist and the phase meter now ask the same rule.
import { taskSatisfied } from '../taskEngine';
import { openFoodChoices } from '../playbooks';

const base = { id: 'e', type: 'Thanksgiving Host', guestEstimate: 12, guests: [], vendors: [] };
// INPUTS ONLY changed (six root causes, cause 1, part 2): a row is proven by
// the facts its step DECLARES, never by its words. Each row below carries the
// declaration a step with these words carries (derived once from the retired
// text rules, as the playbooks' were). Assertions unchanged.
const FACTS = {
  'The big grocery run: check the list against the menu': ['then:food-bought'],
  'Write the full menu, with who makes each dish': ['menu-decided'],
};
const step = (task) => ({ task, facts: FACTS[task] });
const WRITE = 'Write the full menu, with who makes each dish';

test('(premise) Thanksgiving has more than one menu question', () => {
  expect((openFoodChoices(base) || []).length).toBeGreaterThan(1);
});

test('one pick does not close a menu-writing step', () => {
  const first = openFoodChoices(base)[0];
  expect(taskSatisfied({ ...base, foodChoices: { [first.id]: first.options[0] } }, step(WRITE))).toBe(false);
});

test('every menu question answered closes it', () => {
  const picks = Object.fromEntries(openFoodChoices(base).map((c) => [c.id, c.options[0]]));
  expect(taskSatisfied({ ...base, foodChoices: picks, dietaryNoted: true }, step(WRITE))).toBe(true);
});

test('a grocery run that mentions the menu is not closed by deciding it', () => {
  const picks = Object.fromEntries(openFoodChoices(base).map((c) => [c.id, c.options[0]]));
  expect(taskSatisfied({ ...base, foodChoices: picks }, step('The big grocery run: check the list against the menu'))).toBe(false);
});
