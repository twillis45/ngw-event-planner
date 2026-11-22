// ─── THE MENU COUNT IS ONE COUNT (Wanda audit P0-12, 11/22/2026) ─────────────
//
// The Plan tab read "Your choices · 4 open" under a hero reading "1 open", and
// its list re-asked "At home, a restaurant, or the workplace?" for a booked VFW
// hall that Calls to make lists as settled. The Plan counted the host's picks
// only; the hero counted openFoodChoices less what the board parks for later.
// `menuChoicesTally` is the one count: the calls a record settles are not
// shown, and what is open now and what comes up later are both named.
import WANDA from '../../data/wandaGoldEvent';
import { menuChoicesTally, openFoodChoices } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
const ids = (xs) => xs.map((c) => c.id);

test('a call the event already answers is not on the list', () => {
  const t = menuChoicesTally(wanda());
  expect(ids(t.shown)).not.toContain('venue');
  expect(ids(t.shown)).toEqual(['food_style', 'format', 'bar']);
  expect(t.total).toBe(3);
  expect(t.settled).toBe(0);
});

test('the open calls are openFoodChoices, and "now" is what the hero asks', () => {
  const ev = wanda();
  const t = menuChoicesTally(ev);
  expect(ids(t.open)).toEqual(ids(openFoodChoices(ev)));
  const food = (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'food');
  expect(ids(t.openNow)).toEqual(food.records);
  expect(t.later).toBe(t.open.length - t.openNow.length);
  expect(food.cueLabel).toMatch(new RegExp(`· ${t.openNow.length} open`));
});

test('a pick moves the count by one, and only that one', () => {
  const t = menuChoicesTally(wanda({ foodChoices: { food_style: 'Drop-off catering / buffet' } }));
  expect(t.total).toBe(3);
  expect(t.settled).toBe(1);
  expect(t.open.length).toBe(2);
});

test('no food plan, no tally', () => {
  expect(menuChoicesTally({ id: 'x', type: 'Not a type' })).toBe(null);
});
