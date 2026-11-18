// THE DAY-OF RAIN ROW FOLLOWS THE PLACE, NOT THE TYPE (owner ruling 11/18/2026).
// Only 6 of 46 playbooks authored a 'weather' row, so a fish fry or a birthday
// in a park reached the day with no rain check.
import { playbookDayOfChecklist } from '../playbooks';
import { placeIsOutdoors, derivePlaceIntelligence } from '../placeIntelligence';

const has = (ev) => (playbookDayOfChecklist(ev).items || []).some((i) => i.key === 'weather');
const ev = (type, venue, extra = {}) => ({ id: 'e', type, venue, guests: [], vendors: [], ...extra });

test('a birthday in a park gets the rain row', () => {
  expect(has(ev('Birthday', 'Druid Hill Park pavilion'))).toBe(true);
});

test('a fish fry in the backyard gets it, though its playbook never wrote one', () => {
  expect(has(ev('Fish Fry', 'Our backyard'))).toBe(true);
});

test('a dinner party in a dining room does not', () => {
  expect(has(ev('Dinner Party', 'The Wilsons, 12 Elm St'))).toBe(false);
});

test('an authored weather row is kept, not doubled', () => {
  const items = playbookDayOfChecklist(ev('Get-Together', 'Patterson Park')).items;
  expect(items.filter((i) => i.key === 'weather')).toHaveLength(1);
});

test('one outdoors rule: the day-of row and the place checks agree', () => {
  for (const e of [ev('Birthday', 'Druid Hill Park'), ev('Dinner Party', 'Home'), ev('Fish Fry', 'Our backyard')]) {
    const rain = derivePlaceIntelligence(e).sections.find((s) => s.key === 'rain');
    expect(placeIsOutdoors(e)).toBe(rain.state === 'risk');
  }
});
