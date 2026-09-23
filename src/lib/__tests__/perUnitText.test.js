// ─── A RATE THAT ROUNDS TO NOTHING IS NOT A CHEAP RATE ───────────────────────
//
// hostv2's food sheet formatted the per-unit band with its generic whole-dollar
// `fmt`, so ice — authored at $0.20–$0.40/lb, stored to the cent — rendered as
// "$0–$0/lb". Not a rounding blemish: the sheet told a host a line was free.
//
// The corpus sweep at the bottom is the test that matters. The unit tests above
// it prove the rule; the sweep proves the rule covers the REAL POPULATION, which
// is the failure this programme keeps finding — a right detector pointed at the
// wrong set.
import { perUnitRate, perUnitBand } from '../perUnitText';
import { playbookFoodPlan, ALL_PLAYBOOKS } from '../playbooks';

describe('one rate, written as it actually is', () => {
  test('under $10 keeps its cents — this is the whole fix', () => {
    expect(perUnitRate(0.2)).toBe('$0.20');
    expect(perUnitRate(0.03)).toBe('$0.03');
    expect(perUnitRate(3.75)).toBe('$3.75');
    expect(perUnitRate(9.99)).toBe('$9.99');
  });

  test('a whole number under $10 stays whole — "$4.00" is noise', () => {
    expect(perUnitRate(4)).toBe('$4');
    expect(perUnitRate(1)).toBe('$1');
  });

  test('$10 and up rounds, because there the cents ARE noise', () => {
    expect(perUnitRate(10)).toBe('$10');
    expect(perUnitRate(18.49)).toBe('$18');
    expect(perUnitRate(1250.4)).toBe('$1,250');
  });

  test('BELOW A CENT SAYS SO rather than printing $0.00', () => {
    // Two decimals would be the same lie in a longer form.
    expect(perUnitRate(0.004)).toBe('<$0.01');
  });

  test('a non-rate is null, and null is an answer', () => {
    for (const bad of [0, -1, null, undefined, '', 'lots', NaN, Infinity]) {
      expect(perUnitRate(bad)).toBe(null);
    }
  });
});

describe('the band, and the unit it is a rate OF', () => {
  test('two bounds', () => {
    expect(perUnitBand(0.2, 0.4, 'lb')).toBe('$0.20–$0.40/lb');
    expect(perUnitBand(4, 7, 'lb')).toBe('$4–$7/lb');
    expect(perUnitBand(1.88, 3.75, 'drinks')).toBe('$1.88–$3.75/drinks');
  });

  test('equal bounds are written ONCE — "$4–$4" is not a range', () => {
    expect(perUnitBand(4, 4, 'lb')).toBe('$4/lb');
    // …including when only the low bound is usable.
    expect(perUnitBand(4, 0, 'lb')).toBe('$4/lb');
    expect(perUnitBand(4, null, 'lb')).toBe('$4/lb');
  });

  test('NO UNIT, NO BAND. "$0.20–$0.40" alone is read as the line’s cost', () => {
    // For 30 lb of ice that misreading is off by thirty times.
    expect(perUnitBand(0.2, 0.4, '')).toBe(null);
    expect(perUnitBand(0.2, 0.4, null)).toBe(null);
    expect(perUnitBand(0.2, 0.4, '  ')).toBe(null);
  });

  test('an unusable low bound means no band at all', () => {
    expect(perUnitBand(0, 4, 'lb')).toBe(null);
    expect(perUnitBand(null, 4, 'lb')).toBe(null);
  });
});

// ── THE POPULATION, NOT A SAMPLE ────────────────────────────────────────────
describe('THE REAL CORPUS', () => {
  const lines = (() => {
    const seen = new Map();
    for (const pb of ALL_PLAYBOOKS) {
      const fp = playbookFoodPlan({
        id: 'x', type: pb.type, date: '2026-08-20',
        guestMode: 'count', guestCount: 20, guests: [],
      });
      if (!fp) continue;
      for (const l of (fp.list || [])) {
        if (l.unitBase && l.perUnitLow) seen.set(`${l.id}\u0000${l.item}`, l);
      }
    }
    return [...seen.values()];
  })();

  test('(premise) the corpus really does carry sub-dollar per-unit rates', () => {
    // Without this, every assertion below could pass against an empty set or a
    // corpus whose rates all happen to sit above a dollar.
    expect(lines.length).toBeGreaterThan(400);
    const sub = lines.filter((l) => Number(l.perUnitLow) < 1);
    expect(sub.length).toBeGreaterThan(50);
    // And the old formatter really did lose them — every sub-dollar rate came
    // out as either "$0" (below 50¢, which reads as free) or "$1" (above it,
    // which reads as a price the plan never authored). Both bounds, so the
    // BAND collapsed, not just one end of it.
    const wholeDollar = (n) => '$' + Math.round(n).toLocaleString('en-US');
    const zeroed = sub.filter((l) => wholeDollar(l.perUnitLow) === '$0'
      && wholeDollar(l.perUnitHigh) === '$0');
    expect(zeroed.length).toBeGreaterThan(20);
    expect(sub.every((l) => ['$0', '$1'].includes(wholeDollar(l.perUnitLow)))).toBe(true);
  });

  test('NOT ONE LINE IN THE CORPUS RENDERS AS $0', () => {
    const broken = lines
      .map((l) => ({ l, s: perUnitBand(l.perUnitLow, l.perUnitHigh, l.unitBase) }))
      .filter(({ s }) => s && /\$0(?![.\d])/.test(s));
    expect(broken.map(({ l, s }) => `${l.id} ${l.item} → ${s}`)).toEqual([]);
  });

  test('every line that HAS a rate gets a band — none is dropped by the rewrite', () => {
    const dropped = lines.filter((l) => !perUnitBand(l.perUnitLow, l.perUnitHigh, l.unitBase));
    expect(dropped.map((l) => `${l.id} ${l.item}`)).toEqual([]);
  });

  test('every band names its unit and holds a real number', () => {
    for (const l of lines) {
      const s = perUnitBand(l.perUnitLow, l.perUnitHigh, l.unitBase);
      expect(s.endsWith(`/${String(l.unitBase).trim()}`)).toBe(true);
      expect(s).toMatch(/^(\$[\d,]+(\.\d{2})?|<\$0\.01)(–(\$[\d,]+(\.\d{2})?|<\$0\.01))?\//);
    }
  });
});
