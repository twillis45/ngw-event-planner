// STEPS THAT NAME A SCREEN LINK TO IT (owner, 11/18/2026: "make sure check
// boxes link to all places"). These rows named a place the app has and had no
// link; kitchen work keeps none, honestly.
import { routeByWords } from '../__fixtures__/stepByWords';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';

const hit = (t) => routeByWords(t, {}, { id: 'e', vendors: [] });
const CASES = [
  ['Decide how money works, so you can say it on the invitation instead of after dinner', 'budget'],
  ['Agree the money rule up front: one treasurer handles every dollar in and out', 'budget'],
  ['Add up the shared receipts and send one request to each friend, with the receipts attached', 'budget'],
  ['Settle up within the week — the treasurer reimburses everyone who fronted receipts', 'budget'],
  ['Pick the date and time to fit the audience — kids parties run early afternoon into dusk', 'date'],
  ['Build the schedule in 90-minute shifts — nobody signs up for six hours', 'space'],
  ['Chase the empty shifts by name — a personal ask fills what a reminder email never does', 'space'],
  ['Ask one friend to own the main, and agree on its size and when it arrives', 'food'],
];

test.each(CASES)('%s → %s', (task, kind) => {
  const h = hit(task);
  expect(h).not.toBeNull();
  expect(resolveRoute(h.route).kind).toBe(kind);
});

test('kitchen work still has no link', () => {
  expect(hit('Marinate proteins; prep cold sides')).toBeNull();
});
