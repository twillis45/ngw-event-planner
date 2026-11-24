// ─── A ZIP ANSWERS THE TOWN ASK (11/24/2026) ────────────────────────────────
// Every town field takes "City, ST or a ZIP", and a bare ZIP is stored in
// venueCity (setVenue, townFieldsToPersist). venueFor's city gate refuses
// digits, so that ZIP was published as `zip` and ignored by
// needsCityForWeather: "at my house in 22150", or 22150 typed in the town chip,
// was saved and then asked "Add your city." The ZIP is enough to find the
// weather and the stores; only no city AND no ZIP asks.
import { parseSmartEventText } from '../smartParseEvent';
import { townFieldsToPersist } from '../townFieldsToPersist';
import { venueFor } from '../venueFor';

const home = (fields) => ({ recordKind: 'host_event', venueKind: 'home', venue: 'Home', ...fields });

test('a ZIP said in the sentence does not ask for the city', () => {
  const p = parseSmartEventText('Thanksgiving dinner for 14 at my house in 22150 on Thursday 11/26 at 3pm, budget $400');
  const v = venueFor(home(townFieldsToPersist('', p)));
  expect(v.zip).toBe('22150');
  expect(v.needsCityForWeather).toBe(false);
});
test('a ZIP typed in the town field does not ask for the city', () => {
  expect(venueFor(home(townFieldsToPersist('22150', {}))).needsCityForWeather).toBe(false);
});
test('a ZIP in its own field does not ask for the city', () => {
  expect(venueFor(home({ venueZip: '22150' })).needsCityForWeather).toBe(false);
});
test('no city and no ZIP still asks', () => {
  expect(venueFor(home({ venueCity: '' })).needsCityForWeather).toBe(true);
  expect(venueFor(home({ venueAddress: '123 Maple St' })).needsCityForWeather).toBe(true);
});
