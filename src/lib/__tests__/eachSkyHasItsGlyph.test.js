// Owner, 11/18/2026: "Need beautiful glyphs for weather made for the studio
// matte." Each forecast day draws the glyph for its own sky.
import { skyKind } from '../weather';

test.each([
  [{ icon: '01d', conditions: 'clear sky' }, 'clear'],
  [{ icon: '02d', conditions: 'few clouds' }, 'partly'],
  [{ icon: '03d', conditions: 'scattered clouds' }, 'cloudy'],
  [{ icon: '04d', conditions: 'overcast clouds' }, 'cloudy'],
  [{ icon: '09d', conditions: 'light intensity drizzle' }, 'drizzle'],
  [{ icon: '09d', conditions: 'heavy shower rain' }, 'rain'],
  [{ icon: '10d', conditions: 'moderate rain' }, 'rain'],
  [{ icon: '11d', conditions: 'thunderstorm with rain' }, 'storm'],
  [{ icon: '13d', conditions: 'light snow' }, 'snow'],
  [{ icon: '13d', conditions: 'sleet' }, 'sleet'],
  [{ icon: '13d', conditions: 'freezing rain' }, 'sleet'],
  [{ icon: '50d', conditions: 'mist' }, 'fog'],
  [{ icon: '50d', conditions: 'squalls' }, 'wind'],
])('%o draws %s', (row, kind) => { expect(skyKind(row)).toBe(kind); });

test('with no icon code the words decide; nothing readable draws the plain cloud', () => {
  expect(skyKind({ conditions: 'Rain' })).toBe('rain');        // the sample row
  expect(skyKind({ conditions: 'Thunderstorm' })).toBe('storm');
  expect(skyKind({ conditions: 'Clear' })).toBe('clear');
  expect(skyKind({})).toBe('cloudy');
  expect(skyKind(null)).toBe('cloudy');
});
