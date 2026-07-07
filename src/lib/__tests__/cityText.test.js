// CITY-LEAK-1 regression — venueCity pollution. A live session found a freshly
// seeded event's venueCity stamped with the Army Retirement flagship's venue
// string ("VFW Post 3150 — Alexandria, VA") after opening Where & when via the
// rain-plan deep link: the localStorage host-city seed fired for a
// venueKind==='venue' event, and eventGeoQuery then built a garbage geocode
// query ("VFW Post 3150 — Alexandria, VA, MD, US") so the WeatherAlert
// silently never rendered. isPlausibleCityText is the shared gate at every
// seam (localStorage seed, ngw-host-city writeback, eventGeoQuery city read).
import { isPlausibleCityText } from '../cityText';

describe('isPlausibleCityText', () => {
  test('accepts real city names', () => {
    expect(isPlausibleCityText('Alexandria')).toBe(true);
    expect(isPlausibleCityText('St. Louis')).toBe(true);
    expect(isPlausibleCityText('Winston-Salem')).toBe(true);
    expect(isPlausibleCityText('Washington, DC')).toBe(true);
    expect(isPlausibleCityText('  Atlanta  ')).toBe(true);
  });

  test('rejects the exact string from the live pollution incident', () => {
    expect(isPlausibleCityText('VFW Post 3150 — Alexandria, VA')).toBe(false);
  });

  test('rejects venue/address-shaped strings (digits, em/en dashes)', () => {
    expect(isPlausibleCityText('123 Main St')).toBe(false);
    expect(isPlausibleCityText('Post 3150')).toBe(false);
    expect(isPlausibleCityText('The Grand Ballroom — Nashville')).toBe(false);
    expect(isPlausibleCityText('Pavilion – East Lawn')).toBe(false);
  });

  test('rejects empty, whitespace, and implausibly long values', () => {
    expect(isPlausibleCityText('')).toBe(false);
    expect(isPlausibleCityText('   ')).toBe(false);
    expect(isPlausibleCityText(null)).toBe(false);
    expect(isPlausibleCityText(undefined)).toBe(false);
    expect(isPlausibleCityText('A venue description that is far too long to be a bare city name')).toBe(false);
  });
});
