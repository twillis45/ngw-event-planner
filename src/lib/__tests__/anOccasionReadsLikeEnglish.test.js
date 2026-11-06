// Gold run (GOLD-05/06, 11/5/2026): the cookout was named "My The Cookout" and
// described as "A the cookout." / "For 25 at a the cookout"; the watch party
// was named "My Watch". Names stripped " Party" from every type and kept a
// leading "The".
import { occasionShortName, occasionNoun, aOccasion } from '../occasionWords';
import { buildAssembleRevealStages } from '../assembleRevealEngines';

test.each([
  ['The Cookout', 'Cookout'], ['Watch Party', 'Watch Party'], ['Card Party', 'Card Party'], ['Day Party', 'Day Party'],
  ['Retirement Party', 'Retirement'], ['Birthday', 'Birthday'], ['Dinner Party', 'Dinner'], ['Juneteenth Cookout', 'Juneteenth Cookout'],
])('name: %s → %s', (t, out) => { expect(occasionShortName(t)).toBe(out); });

test.each([
  ['The Cookout', 'a cookout'], ['Anniversary', 'an anniversary'], ['Watch Party', 'a watch party'], ['Engagement Party', 'an engagement party'],
])('sentence: %s → %s', (t, out) => { expect(aOccasion(t)).toBe(out); });

test('the noun has no article of its own', () => { expect(occasionNoun('The Cookout')).toBe('cookout'); });

test('the reveal says "A cookout.", never "A the cookout."', () => {
  const st = buildAssembleRevealStages({ id: 'x', type: 'The Cookout', guestEstimate: 25 }, { primaryEventType: 'The Cookout' }, null, {});
  const id = st.find((s) => s && s.key === 'identity');
  expect(id.what).toMatch(/^A cookout\./);
  expect(JSON.stringify(id)).not.toMatch(/a the cookout/i);
});
