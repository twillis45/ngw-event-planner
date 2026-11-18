// A LATE CHECKLIST STEP IS ASKED AS ONE (owner screenshot, 11/18/2026): the board's
// headline read "Decide the menu." over the late step "walk the kitchen with whoever
// lives there: oven size, refrigerator space, serving dishes, and parking".
import { heroAskFor } from '../heroAsk';

const late = (task) => ({ id: 'decision:t1', taskId: 't1', decisionId: 't1', category: 'decision', level: 'attention', title: `Resolve "${task}".` });

test('the kitchen walk-through is not "Decide the menu."', () => {
  const ask = heroAskFor(late('If it is not at your place, walk the kitchen with whoever lives there: oven size, refrigerator space, serving dishes, and parking'), {});
  expect(ask).toBe('Catch up on this step.');
});

test('nor is any other late step read for a topic in its prose', () => {
  expect(heroAskFor(late('Set the budget line for the dessert table'), {})).toBe('Catch up on this step.');
  expect(heroAskFor(late('Text the guests the parking map'), {})).toBe('Catch up on this step.');
});

test('a real menu decision still asks for the menu', () => {
  expect(heroAskFor({ id: 'food', domain: 'food', title: 'Plan the menu' }, {})).toBe('Decide the menu.');
});
