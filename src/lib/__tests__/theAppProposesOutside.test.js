// THE APP PROPOSES "OUTSIDE" (owner, 11/18/2026: "Don't remove how we infer
// that it's outside. Should be part of DIFM"). The inference stays; it is now
// shown as a proposal with its reason, accepted in one tap. Nothing is stored
// until the host taps.
import { outdoorsGuess, OUTDOOR_TYPE } from '../placeIntelligence';

const ev = (extra = {}) => ({ id: 'e', type: 'Birthday', guests: [], vendors: [], ...extra });

test('a park venue: proposes outside, naming the venue', () => {
  const g = outdoorsGuess(ev({ venue: 'Druid Hill Park pavilion', venueKind: 'venue' }));
  expect(g.guess).toBe('outdoor');
  expect(g.because).toMatch(/Druid Hill Park pavilion/);
});

test('an outdoor type at home: proposes outside, naming the type', () => {
  const g = outdoorsGuess(ev({ type: 'The Cookout', venue: 'Home', venueKind: 'home' }));
  expect(g.guess).toBe('outdoor');
  expect(g.because).toMatch(/cookout/i);
});

test('nothing outdoor-sounding: no proposal', () => {
  expect(outdoorsGuess(ev({ type: 'Dinner Party', venue: 'Home', venueKind: 'home' }))).toBeNull();
});

test('once the host has answered, the app stops proposing', () => {
  expect(outdoorsGuess(ev({ venue: 'Patterson Park', indoorOutdoor: 'indoor' }))).toBeNull();
});

test('the outdoor-type list is one list', () => {
  expect(OUTDOOR_TYPE.test('Crab Feast')).toBe(true);
});
