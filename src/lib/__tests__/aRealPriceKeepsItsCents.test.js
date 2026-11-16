// ─── A REAL PRICE KEEPS ITS CENTS (50-host run, round 2, 11/16/2026) ─────────
// A host typed $42.50 for the turkey; the list showed "$43". The food plan read
// stored prices through Math.round, so every real price lost its cents before
// formatCurrency (which shows cents) ever saw it.
import { playbookFoodPlan } from '../playbooks';
import { formatCurrency } from '../currency';

const EV = { id: 'fg', type: 'Friendsgiving', date: '2026-11-21', guestEstimate: 12, guestMode: 'count',
  guests: [], vendors: [], budget: [], foodLocked: { p_turkey: 42.5 } };

test('a $42.50 turkey stays $42.50', () => {
  const t = playbookFoodPlan(EV, {}).list.find((it) => it.id === 'p_turkey');
  expect(t.locked).toBe(42.5);
  expect(formatCurrency(t.locked)).toBe('$42.50');
});

test('(control) a whole-dollar price stays whole', () => {
  const t = playbookFoodPlan({ ...EV, foodLocked: { p_turkey: 40 } }, {}).list.find((it) => it.id === 'p_turkey');
  expect(formatCurrency(t.locked)).toBe('$40');
});
