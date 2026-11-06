import { addGame, removeGame, isGameLibrary, GAME_NAME_MAX } from '../gameLineup';

test('she adds the games she has, in her words', () => {
  let r = addGame([], '  Codenames ', 'a');
  expect(r.added).toBe(true);
  r = addGame(r.list, 'Catan', 'b');
  expect(r.list.map((g) => g.name)).toEqual(['Codenames', 'Catan']);
});
test('blank, duplicate and over-long names are refused, with the reason', () => {
  const list = [{ id: 'a', name: 'Codenames' }];
  expect(addGame(list, '   ').reason).toBe('empty');
  expect(addGame(list, 'codenames').reason).toBe('duplicate');
  expect(addGame(list, 'x'.repeat(GAME_NAME_MAX + 1)).reason).toBe('long');
});
test('she removes one', () => {
  expect(removeGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 'a').map((g) => g.id)).toEqual(['b']);
});
test('the game library item is recognized', () => {
  expect(isGameLibrary({ item: 'Game library (3-4 games + one short filler)' })).toBe(true);
  expect(isGameLibrary({ item: 'Table big enough for the chosen game' })).toBe(false);
});
