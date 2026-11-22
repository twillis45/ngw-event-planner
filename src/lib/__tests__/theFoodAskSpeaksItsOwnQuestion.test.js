// "Decide the menu." headlined food asks that are not about the menu — the
// bartender, the grill master, the Super Bowl (audit 2 lane A P2-1). The food
// cue's headline is the question its panel shows; only the generic cook /
// cater / potluck trio, which has no question of its own, keeps the ladder.
import { foodPanelQuestion, foodDecisionND } from '../decisionND';
import { playbookDecisionBoard } from '../playbooks';

const opts = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];

describe('the food panel names its own question', () => {
  test('a call with an authored ask is asked by it', () => {
    expect(foodPanelQuestion({ id: 'grill_master', options: opts, ask: 'Who runs the grill?' })).toBe('Who runs the grill?');
  });
  test('a call with only a label is asked as its question', () => {
    expect(foodPanelQuestion({ id: 'help', options: opts, label: 'Hire a bartender or cleaner' })).toBe('Hire a bartender or cleaner?');
  });
  test('the generic trio and an answered call have none', () => {
    expect(foodPanelQuestion({ id: 'phase:food', options: opts })).toBeNull();
    expect(foodPanelQuestion({ id: 'help', options: opts, ask: 'Who helps?', selected: 'a' })).toBeNull();
  });
  test('The Cookout’s food panel asks who runs the grill', () => {
    const ev = { id: 'c', type: 'The Cookout', date: '2027-02-01', guestMode: 'count', guestCount: 12, venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX' };
    const b = playbookDecisionBoard(ev, new Date('2026-11-22T12:00:00'));
    const q = foodPanelQuestion(foodDecisionND(ev, 12, [...(b.open || []), ...(b.locked || [])], null));
    expect(q).toBeTruthy();
    expect(q).not.toMatch(/menu/i);
  });
});
