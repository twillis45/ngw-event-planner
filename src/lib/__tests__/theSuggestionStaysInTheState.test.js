// Owner acceptance run (11/5/2026, Checkpoint 1): saving the home address
// worked, but the address suggestion offered the wrong town. Reproduced with
// the geocoder itself: "Pasadena" returns California, then Texas, then
// Maryland — and the venue sheet sent no hint, though the event already said
// MD. A suggestion in the state the host is planning in goes first; nothing
// is dropped (the host may be planning elsewhere), only ordered.
import { preferState, knownStateCode } from '../addressSuggest';

const sugs = [
  { label: 'Pasadena, Los Angeles County, California', stateCode: 'CA' },
  { label: 'Pasadena, Harris County, Texas', stateCode: 'TX' },
  { label: 'Pasadena, Anne Arundel County, Maryland', stateCode: 'MD' },
];

test('the host’s state leads; the rest keep their order and nothing is dropped', () => {
  expect(preferState(sugs, 'MD').map((s) => s.stateCode)).toEqual(['MD', 'CA', 'TX']);
});
test('no known state: the provider’s order stands', () => {
  expect(preferState(sugs, '')).toEqual(sugs);
});
test('the event’s state is read from what it already holds', () => {
  expect(knownStateCode({ venueState: 'MD' })).toBe('MD');
  expect(knownStateCode({ state: 'md' })).toBe('MD');
  expect(knownStateCode({ venue: 'Pasadena, MD' })).toBe('MD');   // resolved by venueFor, the one reader
  expect(knownStateCode({ venueCity: 'Pasadena' })).toBe('');
  expect(knownStateCode(null)).toBe('');
});
