import { vendorPricingBasis, vendorPricingHint, vendorExpectedRange } from './vendorPricing';

describe('vendorPricingBasis — category → charging model', () => {
  test('catering bills per head', () => {
    expect(vendorPricingBasis('Catering').basis).toBe('per_head');
    expect(vendorPricingBasis('Buffet dinner service').basis).toBe('per_head');
  });
  test('bar bills per head', () => {
    expect(vendorPricingBasis('Open Bar').basis).toBe('per_head');
    expect(vendorPricingBasis('Bar').slug).toBe('bar');
  });
  test('"DJ + Dance Floor" reads as a DJ (flat), not rentals', () => {
    const p = vendorPricingBasis('DJ + Dance Floor');
    expect(p.slug).toBe('dj');
    expect(p.basis).toBe('flat');
  });
  test('photobooth is flat and is NOT caught by the generic photo matcher', () => {
    expect(vendorPricingBasis('Photobooth').slug).toBe('photobooth');
    expect(vendorPricingBasis('Event Photography').slug).toBe('photography');
  });
  test('videography is flat', () => {
    expect(vendorPricingBasis('Videography').basis).toBe('flat');
    expect(vendorPricingBasis('Northlight Tribute Films').slug).toBe('video');
  });
  test('rentals bill per item', () => {
    expect(vendorPricingBasis('Tables & Chairs').basis).toBe('per_item');
    expect(vendorPricingBasis('Tent rental').basis).toBe('per_item');
  });
  test('an unknown category returns null (no guess)', () => {
    expect(vendorPricingBasis('Something Random')).toBeNull();
    expect(vendorPricingBasis('')).toBeNull();
  });
});

describe('vendorPricingHint — how the money reads', () => {
  test('a per-head vendor with a cost shows the derived unit price', () => {
    expect(vendorPricingHint({ category: 'Catering', cost: 1500 }, 75)).toBe('$20/head');
  });
  test('a flat vendor with a cost shows "flat rate"', () => {
    expect(vendorPricingHint({ category: 'DJ', cost: 550 }, 75)).toBe('flat rate');
  });
  test('rentals show "per item"', () => {
    expect(vendorPricingHint({ category: 'Tent rental', cost: 300 }, 75)).toBe('per item');
  });
  test('no agreed cost → the typical band in the right unit', () => {
    expect(vendorPricingHint({ category: 'Catering', cost: 0 }, 75)).toBe('~$15–75/head');
    expect(vendorPricingHint({ category: 'DJ' }, 75)).toBe('~$400–1,500');
  });
  test('unknown category → null (plain total only)', () => {
    expect(vendorPricingHint({ category: 'Mystery', cost: 100 }, 75)).toBeNull();
  });
});

describe('vendorExpectedRange — for budget/decision reasoning', () => {
  test('per-head scales with the guest count', () => {
    expect(vendorExpectedRange('Catering', 75)).toEqual({ low: 15 * 75, high: 75 * 75, basis: 'per_head', tier: 'consensus' });
  });
  test('flat is the raw band regardless of guests', () => {
    const r = vendorExpectedRange('DJ', 75);
    expect(r.low).toBe(400);
    expect(r.high).toBe(1500);
    expect(r.basis).toBe('flat');
  });
});
