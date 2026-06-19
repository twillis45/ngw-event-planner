import { weatherLogistics } from '../weather';

const wx = (over = {}) => ({
  risk: 'high', kind: 'heat', summary: '', precipitation: 0,
  temp: { min: 70, max: 75, unit: '°F' }, ...over,
});

describe('weatherLogistics — board #2: forecast → concrete day-of adjustments', () => {
  test('null/empty forecast yields nothing', () => {
    expect(weatherLogistics(null)).toEqual([]);
    expect(weatherLogistics(undefined, { guests: 30 })).toEqual([]);
  });

  test('a mild, dry day produces no adjustments', () => {
    expect(weatherLogistics(wx({ temp: { min: 60, max: 78 }, precipitation: 10 }), { guests: 30 })).toEqual([]);
  });

  test('a hot day (95°F) bumps ice + promotes shade + water', () => {
    const out = weatherLogistics(wx({ temp: { min: 78, max: 95 } }), { guests: 30 });
    const keys = out.map((a) => a.key);
    expect(keys).toContain('ice');
    expect(keys).toContain('shade');
    expect(keys).toContain('water');
    // 30 guests × 2.5 lb/guest = 75 lbs
    expect(out.find((a) => a.key === 'ice').text).toMatch(/75 lbs/);
  });

  test('a warm day (90°F) uses the lower ice rate (2 lb/guest)', () => {
    const out = weatherLogistics(wx({ temp: { min: 72, max: 91 } }), { guests: 40 });
    // 40 × 2 = 80 lbs
    expect(out.find((a) => a.key === 'ice').text).toMatch(/80 lbs/);
  });

  test('no guest count → ice guidance is per-guest, not a total', () => {
    const out = weatherLogistics(wx({ temp: { min: 78, max: 96 } }), {});
    expect(out.find((a) => a.key === 'ice').text).toMatch(/lb\/guest/);
  });

  test('70%+ rain promotes the tent', () => {
    const out = weatherLogistics(wx({ kind: 'rain', temp: { min: 60, max: 72 }, precipitation: 80 }), { guests: 30 });
    expect(out.map((a) => a.key)).toEqual(['tent']);
    expect(out[0].text).toMatch(/not a maybe/);
  });

  test('50–69% rain offers a ready-canopy, softer than 70%+', () => {
    const out = weatherLogistics(wx({ kind: 'rain', temp: { min: 60, max: 72 }, precipitation: 55 }), { guests: 30 });
    expect(out[0].text).toMatch(/ready to raise/);
  });

  test('hot AND rainy stacks both heat and rain adjustments', () => {
    const out = weatherLogistics(wx({ temp: { min: 78, max: 97 }, precipitation: 75 }), { guests: 30 });
    const keys = out.map((a) => a.key);
    expect(keys).toContain('ice');
    expect(keys).toContain('tent');
  });
});
