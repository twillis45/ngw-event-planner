// Gold run (GOLD-05, 11/5/2026): "Backyard cookout … burgers and hot dogs"
// listed "burgers" and "hot dogs" under "didn't make it into the plan" — and the
// cookout playbook already plans p_burgers_dogs. For an event whose plan does
// NOT carry a food she named, it was simply lost.
import { heardFoods, uncoveredFoods } from '../heardFoods';
import { clausesNotUsed } from '../heardClauses';

test('the foods she named are heard', () => {
  expect(heardFoods('Backyard cookout for 25, burgers and hot dogs').map((f) => f.name)).toEqual(['Burgers', 'Hot dogs']);
  expect(heardFoods('game night with pizza and wings').map((f) => f.name)).toEqual(['Pizza', 'Wings']);
});

test('a food she ruled out is not heard', () => {
  expect(heardFoods('birthday, no pizza, tacos instead').map((f) => f.name)).toEqual(['Tacos']);
});

test('a food the plan already carries is covered; one it does not is uncovered', () => {
  const plan = [{ name: 'Burgers + hot dogs' }, { name: 'Potato salad' }];
  const heard = heardFoods('cookout, burgers and hot dogs, and brisket');
  expect(uncoveredFoods(heard, plan).map((f) => f.name)).toEqual(['Brisket']);
});

test('heard foods are no longer reported as dropped', () => {
  const dropped = clausesNotUsed("Backyard cookout at my house this Saturday for 25 people, burgers and hot dogs").join(' | ');
  expect(dropped).not.toMatch(/burgers|hot dogs/i);
});

test('on the real cookout plan, burgers and hot dogs add no duplicate line; brisket does', () => {
  const { playbookFoodPlan } = require('../playbooks');
  const ev = { id: 'c1', type: 'The Cookout', date: '2026-11-07', guestEstimate: 25 };
  const list = (playbookFoodPlan(ev) || {}).list;
  expect(Array.isArray(list) && list.length).toBeTruthy();
  const heard = heardFoods('Backyard cookout for 25, burgers and hot dogs, and brisket');
  expect(uncoveredFoods(heard, list).map((f) => f.name)).toEqual(['Brisket']);
});

// Run 2 (11/6/2026, R2-14): "drinks" was reported as dropped on a game night
// whose plan carried soda, water, beer and wine.
test('"drinks" is heard, is covered by any drink line, and is no longer reported dropped', () => {
  const { playbookFoodPlan } = require('../playbooks');
  const vida = 'Vida is hosting a girls’ game night this Saturday, November 7, at 12 Sample Rd in Pasadena, Maryland. Ten girlfriends are coming. We want fun, team-oriented games, food, drinks, and a relaxed atmosphere.';
  expect(heardFoods(vida).map((f) => f.name)).toContain('Drinks');
  const list = (playbookFoodPlan({ id: 'g', type: 'Game Night', date: '2026-11-07', guestEstimate: 10 }) || {}).list;
  expect(uncoveredFoods(heardFoods(vida), list).map((f) => f.name)).not.toContain('Drinks');
  expect(clausesNotUsed(vida).join(' | ')).not.toMatch(/\bdrinks\b/i);
});
