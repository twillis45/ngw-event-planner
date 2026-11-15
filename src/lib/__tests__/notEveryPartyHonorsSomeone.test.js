// ─── NOT EVERY PARTY HONORS SOMEONE (11/15/2026) ────────────────────────────
// The owner's live Friendsgiving asked "Who's it for?" and its reveal read
// "Honoree not named" — for a dinner with friends that honors nobody. A
// Friendsgiving, a game night or a board meeting has no honoree to name.
// Typing one still works ("game night for Ana's birthday" keeps "For Ana");
// the app only stops asking for one where none belongs.
import { honoreeApplies } from '../eventIdentity';
import { buildIdentityStage } from '../assembleRevealEngines';

test.each(['Friendsgiving', 'Thanksgiving Hosting', 'Halloween Party', "New Year's Eve Party", 'Game Night', 'Watch Party', 'Board Meeting'])('%s does not ask for an honoree', (type) => {
  expect(honoreeApplies(type)).toBe(false);
});
test.each(['Birthday', 'Retirement Party', 'Baby Shower', 'Anniversary', 'Graduation', 'Repast'])('%s still does', (type) => {
  expect(honoreeApplies(type)).toBe(true);
});
test('a Friendsgiving reveal never says "Honoree not named"', () => {
  const st = buildIdentityStage({ type: 'Friendsgiving', name: 'Friendsgiving', honoree: '' }, { primaryEventType: 'Friendsgiving' });
  expect(st.confidenceLabel).not.toMatch(/honoree/i);
});
test('a birthday with no name still says so', () => {
  const st = buildIdentityStage({ type: 'Birthday', name: 'Birthday', honoree: '' }, { primaryEventType: 'Birthday' });
  expect(st.confidenceLabel).toBe('Honoree not named');
});
