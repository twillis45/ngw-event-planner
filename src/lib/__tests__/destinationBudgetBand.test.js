// DESTINATION-3 (budget) — the silent band override fix. An explicit per-type
// per-head band (Birthday $60–250) used to win outright over the travel_led
// family band ($200–600), so a DESTINATION birthday's estimate reflected none
// of its real cost drivers (lodging, flights, multi-day scope). The fix blends
// the band toward travel_led by element-wise max when event.isDestination is
// set and the base type is not natively travel_led — reusing ONLY numbers that
// already exist in the tables (no invented figures) — and itemizes the travel
// exclusions the way travel_led types already do.
import {
  estimateTotalRange,
  PER_HEAD_BY_TYPE,
  PER_HEAD_BY_FAMILY,
} from '../budgetEstimator/totalEstimate';
import {
  notIncludedFor,
  NOT_INCLUDED_BY_FAMILY,
  TRAVEL_LOGISTICS_NOT_INCLUDED,
} from '../budgetEstimator/confidence';

// Neutral factors: no date (multiplier 1) + 'afternoon' (multiplier 1) so the
// per-head band is the only thing under test.
const neutral = { date: null, timeOfDay: 'afternoon' };

describe('estimateTotalRange — destination blend toward the travel_led band', () => {
  test('non-destination Birthday keeps its own explicit band (no behavior change)', () => {
    const r = estimateTotalRange({ type: 'Birthday', guestCount: 100, ...neutral });
    expect(r.lowTotal).toBe(100 * PER_HEAD_BY_TYPE.Birthday.low);   // $6,000
    expect(r.highTotal).toBe(100 * PER_HEAD_BY_TYPE.Birthday.high); // $25,000
    expect(r.destinationAdjusted).toBe(false);
  });

  test('destination Birthday blends up to the travel_led band (the fixed override)', () => {
    const r = estimateTotalRange({ type: 'Birthday', guestCount: 100, isDestination: true, ...neutral });
    const tl = PER_HEAD_BY_FAMILY.travel_led;
    // Element-wise max of Birthday {60,250} vs travel_led {200,600} = {200,600}.
    expect(r.lowTotal).toBe(100 * tl.low);   // $20,000 — was $6,000 pre-fix
    expect(r.highTotal).toBe(100 * tl.high); // $60,000 — was $25,000 pre-fix
    expect(r.destinationAdjusted).toBe(true);
  });

  test('every blended endpoint is a number that already exists in the tables (nothing invented)', () => {
    const r = estimateTotalRange({ type: 'Baby Shower', guestCount: 1, isDestination: true, ...neutral });
    const known = new Set([
      ...Object.values(PER_HEAD_BY_TYPE).flatMap((b) => [b.low, b.high]),
      ...Object.values(PER_HEAD_BY_FAMILY).flatMap((b) => [b.low, b.high]),
    ]);
    expect(known.has(r.lowTotal)).toBe(true);
    expect(known.has(r.highTotal)).toBe(true);
  });

  test('destination Gala is left alone — its band already meets the travel_led floor and ceiling', () => {
    const plain = estimateTotalRange({ type: 'Gala', guestCount: 100, ...neutral });
    const dest = estimateTotalRange({ type: 'Gala', guestCount: 100, isDestination: true, ...neutral });
    expect(dest.lowTotal).toBe(plain.lowTotal);   // $25,000 (250/head)
    expect(dest.highTotal).toBe(plain.highTotal); // $60,000 (600/head)
    expect(dest.destinationAdjusted).toBe(false);
  });

  test('destination Wedding moves only the endpoint below travel_led (high 500 → 600, low stays 200)', () => {
    const r = estimateTotalRange({ type: 'Wedding', guestCount: 100, isDestination: true, ...neutral });
    expect(r.lowTotal).toBe(100 * PER_HEAD_BY_TYPE.Wedding.low);        // floor unchanged
    expect(r.highTotal).toBe(100 * PER_HEAD_BY_FAMILY.travel_led.high); // ceiling lifted
    expect(r.destinationAdjusted).toBe(true);
  });

  test('a natively travel_led type (Wellness Retreat) is unchanged by the flag — no double-count', () => {
    const plain = estimateTotalRange({ type: 'Wellness Retreat', guestCount: 10, ...neutral });
    const dest = estimateTotalRange({ type: 'Wellness Retreat', guestCount: 10, isDestination: true, ...neutral });
    expect(dest.lowTotal).toBe(plain.lowTotal);
    expect(dest.highTotal).toBe(plain.highTotal);
    expect(dest.destinationAdjusted).toBe(false);
  });

  test('the blend never lowers an estimate', () => {
    for (const type of Object.keys(PER_HEAD_BY_TYPE)) {
      const plain = estimateTotalRange({ type, guestCount: 50, ...neutral });
      const dest = estimateTotalRange({ type, guestCount: 50, isDestination: true, ...neutral });
      expect(dest.lowTotal).toBeGreaterThanOrEqual(plain.lowTotal);
      expect(dest.highTotal).toBeGreaterThanOrEqual(plain.highTotal);
    }
  });

  test('still returns null without type or guests — destination flag cannot conjure an estimate', () => {
    expect(estimateTotalRange({ type: null, guestCount: 100, isDestination: true, ...neutral })).toBeNull();
    expect(estimateTotalRange({ type: 'Birthday', guestCount: 0, isDestination: true, ...neutral })).toBeNull();
  });
});

describe('notIncludedFor — destination itemizes travel the way travel_led already does', () => {
  test('non-destination Birthday list is untouched (no travel lines)', () => {
    const list = notIncludedFor('Birthday');
    expect(list).toEqual(NOT_INCLUDED_BY_FAMILY.host_driven);
    for (const line of TRAVEL_LOGISTICS_NOT_INCLUDED) expect(list).not.toContain(line);
  });

  test('destination Birthday prepends the existing travel-logistics copy and keeps its own family lines', () => {
    const list = notIncludedFor('Birthday', { isDestination: true });
    expect(list.slice(0, TRAVEL_LOGISTICS_NOT_INCLUDED.length)).toEqual(TRAVEL_LOGISTICS_NOT_INCLUDED);
    for (const line of NOT_INCLUDED_BY_FAMILY.host_driven) expect(list).toContain(line);
    expect(new Set(list).size).toBe(list.length); // no duplicate lines
  });

  test('destination on an explicit family key works the same as on a type', () => {
    const list = notIncludedFor('host_driven', { isDestination: true });
    expect(list).toEqual(notIncludedFor('Birthday', { isDestination: true }));
  });

  test('a natively travel_led type keeps its exact existing list — never doubled', () => {
    expect(notIncludedFor('Wellness Retreat', { isDestination: true }))
      .toEqual(NOT_INCLUDED_BY_FAMILY.travel_led);
    expect(notIncludedFor('travel_led', { isDestination: true }))
      .toEqual(NOT_INCLUDED_BY_FAMILY.travel_led);
  });

  test('travel-logistics lines are the same strings travel_led has always shown (reused copy, not new)', () => {
    for (const line of TRAVEL_LOGISTICS_NOT_INCLUDED) {
      expect(NOT_INCLUDED_BY_FAMILY.travel_led).toContain(line);
    }
  });
});
