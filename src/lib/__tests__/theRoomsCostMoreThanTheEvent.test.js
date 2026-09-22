// ─── THE STAY ALONE AGAINST THE WHOLE-EVENT BAND ─────────────────────────────
//
// The travel_led per-head band is $200–600, and `confidence.js` says it is meant
// to cover airfare, lodging and travel insurance as well as the party. MEASURED
// on the Santa Fe 80th (10 guests, 4 nights) against the six REAL listings in
// `__fixtures__/airbnbSantaFeResults.js` — captured for this host's own search,
// and shown to her by this app:
//
//   Private backyard   $2,180   $218/head   already past the $200 low
//   5-acre villa       $4,371   $437
//   Secluded estate    $5,400   $540
//   Mountain views     $6,211   $621        ABOVE the $600 high
//   3-unit compound    $6,984   $698        ABOVE
//   Rooftop jacuzzi    $9,040   $904        ABOVE
//
// The cheapest place on the page consumes the entire low end, leaving nothing
// for flights or the event. Nothing cross-checked the two numbers, so the host
// saw a $2,000–6,000 estimate beside a $6,211 house with no comment.
//
// REPORTED, NEVER APPLIED — the same treatment as `requiredVendorFloor`, and for
// the same reason: re-authoring a host-facing band is a product call with a
// basis this code does not have. Naming the contradiction needs none.
//
// A CORRECTION THIS FILE EXISTS TO PREVENT REPEATING. The first measurement of
// this area reported "destinationAdjusted: false — the adjustment never fires".
// That was wrong: the probe called `estimateTotalRange({type, guestCount, date})`
// and never passed `isDestination` or `nights`, so the flags were correctly
// false. The shipping caller passes both, and the real figure is $2,000–6,000
// with `destinationAdjusted: true`. Hence the premise test below, which asserts
// the REAL call shape before anything else is claimed about it.
import { estimateTotalRange } from '../budgetEstimator/totalEstimate';
import { lodgingFloorFor } from '../lodgingFloor';

const opt = (name, priceShown, url) => ({ name, priceShown, url: url || `https://www.airbnb.com/rooms/${name.length}` });
// The six real listings, at their captured prices.
const SANTA_FE = [
  opt('Private backyard with BBQ near the Plaza', 2180),
  opt('Spectacular views from a 5-acre estate', 4371),
  opt('Secluded estate with hot tub and views', 5400),
  opt('Mountain views from 6 secluded acres', 6211),
  opt('3-unit compound 2 blocks from the Plaza', 6984),
  opt('Rooftop jacuzzi with panoramic mountain views', 9040),
];
const EV = (over = {}) => ({
  id: 'ev-80', type: 'Birthday', date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, guestCount: 10, lodgingOptions: SANTA_FE, ...over,
});
const est = (over = {}) => estimateTotalRange({
  type: 'Birthday', guestCount: 10, date: '2027-06-17', isDestination: true, nights: 4, ...over,
});

describe('the rooms against the whole-event estimate', () => {
  test('(premise) the REAL call shape — the destination blend does fire', () => {
    // The assertion the first probe of this area skipped, which is why it
    // reported a working adjustment as a dead one.
    const r = est();
    expect(r.destinationAdjusted).toBe(true);
    expect(r.lowTotal).toBe(2000);
    expect(r.highTotal).toBe(6000);
    // …and omitting the inputs really does produce the wrong, smaller figure,
    // so the difference is the caller's, not the estimator's.
    const blind = estimateTotalRange({ type: 'Birthday', guestCount: 10, date: '2027-06-17' });
    expect(blind.destinationAdjusted).toBe(false);
    expect(blind.highTotal).toBe(2500);
  });

  test('THE FACT: the cheapest shortlisted stay is reported, not the priciest', () => {
    // A flag built on the cheapest candidate only fires when even the most
    // favourable option breaches — the only version worth showing a host.
    const f = lodgingFloorFor(EV(), 10);
    expect(f.total).toBe(2180);
    expect(f.perHead).toBe(218);
    expect(f.basis).toBe('cheapest');
    expect(f.name).toMatch(/Private backyard/);
  });

  test('the estimate carries the floor, and the cheapest stay does NOT trip it', () => {
    const r = est({ lodgingFloor: 2180 });
    expect(r.lodgingFloor).toBe(2180);
    expect(r.belowLodgingFloor).toBe(false);   // 6000 > 2180 — the band still covers it
  });

  test('THE CONTRADICTION: a stay the host is actually looking at exceeds the whole band', () => {
    for (const total of [6211, 6984, 9040]) {
      const r = est({ lodgingFloor: total });
      expect(r.lodgingFloor).toBe(total);
      expect(r.belowLodgingFloor).toBe(true);
    }
  });

  test('a PICKED stay outranks the cheapest — her choice, not the bargain', () => {
    const picked = EV({ lodging: { hotelName: 'Rooftop jacuzzi with panoramic mountain views' } });
    const f = lodgingFloorFor(picked, 10);
    expect(f.total).toBe(9040);
    expect(f.basis).toBe('picked');
    expect(est({ lodgingFloor: f.total }).belowLodgingFloor).toBe(true);
  });

  test('NEGATIVE CONTROL: no shortlist, no number — never a zero', () => {
    // The whole point of the accessor. A missing stay must read as unknown, and
    // a zero floor would make `belowLodgingFloor` false for a reason that has
    // nothing to do with the estimate being sound.
    expect(lodgingFloorFor(EV({ lodgingOptions: [] }), 10)).toBe(null);
    expect(lodgingFloorFor(EV({ lodgingOptions: undefined }), 10)).toBe(null);
    expect(lodgingFloorFor(null, 10)).toBe(null);
    // …and options with no price at all are the same as no options.
    expect(lodgingFloorFor(EV({ lodgingOptions: [{ name: 'A place', priceShown: null }] }), 10)).toBe(null);
    const r = est();
    expect(r.lodgingFloor).toBe(null);
    expect(r.belowLodgingFloor).toBe(false);
  });

  test('NEGATIVE CONTROL: junk prices never become a floor', () => {
    for (const bad of [0, -100, NaN, Infinity, 'free', null, undefined]) {
      expect(est({ lodgingFloor: bad }).lodgingFloor).toBe(null);
      expect(est({ lodgingFloor: bad }).belowLodgingFloor).toBe(false);
    }
  });

  test('NEGATIVE CONTROL: no dollar moved — the estimate is what it was', () => {
    // This file reports a contradiction; it must never be where a band quietly
    // changed. Both ends, with and without a floor present.
    const withFloor = est({ lodgingFloor: 9040 });
    const without = est();
    expect([withFloor.lowTotal, withFloor.highTotal]).toEqual([2000, 6000]);
    expect([without.lowTotal, without.highTotal]).toEqual([2000, 6000]);
    // …and a LOCAL event is untouched by any of it.
    const local = estimateTotalRange({ type: 'Birthday', guestCount: 10, date: '2027-06-17' });
    expect(local.lodgingFloor).toBe(null);
    expect(local.belowLodgingFloor).toBe(false);
  });
});
