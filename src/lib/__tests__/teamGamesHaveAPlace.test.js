// Run 2 (11/6/2026, R2-15): "team-oriented games" had no option and no help.
import { heardGameStyle } from '../heardGameStyle';
import { clausesNotUsed } from '../heardClauses';
import { getPlaybook, playbookChecklist } from '../playbooks';

const VIDA = 'Vida is hosting a girls’ game night this Saturday, November 7, at 12 Sample Rd in Pasadena, Maryland. Ten girlfriends are coming. We want fun, team-oriented games, food, drinks, and a relaxed atmosphere.';

test('the request is heard', () => {
  expect(heardGameStyle(VIDA)).toBe('Team games');
  expect(heardGameStyle('game night, we like to play in teams')).toBe('Team games');
  expect(heardGameStyle('game night for 8, no team games please')).toBeNull();
  expect(heardGameStyle('game night for 8 with snacks')).toBeNull();
});

test('it is no longer reported as dropped', () => {
  expect(clausesNotUsed(VIDA).join(' | ')).not.toMatch(/team/i);
});

test('the playbook has the option, with labeled suggestions', () => {
  const d = getPlaybook('Game Night').decisions.find((x) => x.id === 'game_type');
  expect(d.options).toContain('Team games');
  expect(d.optionNotes['Team games']).toMatch(/Suggestions/);
  expect(d.optionNotes['Team games']).toMatch(/Not a ranking/);
});

test('choosing team games adds the team-split task; other choices do not', () => {
  const base = { id: 'g', type: 'Game Night', date: '2027-03-12', guestEstimate: 10 };
  const ids = (ev) => (playbookChecklist(ev) || []).map((r) => String(r.id).replace(/^pbt-[^-]+-/, ''));
  expect(ids({ ...base, foodChoices: { game_type: 'Team games' } })).toContain('t_split_teams');
  expect(ids({ ...base, foodChoices: { game_type: 'Board games' } })).not.toContain('t_split_teams');
});
