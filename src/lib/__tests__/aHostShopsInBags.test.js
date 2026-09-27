import { bagsForPounds, shoppingHint, ICE_BAG_LB } from '../shoppableUnit';

describe('a host shops in bags, not in pounds', () => {
  test('the bag size is the one the corpus PRICED, not the one the web sells most', () => {
    // 20lb is what ice-retail-2026 / ice-warehouse-2026 observed at Sams,
    // Costco, BJs, 7-Eleven and Giant. The largest US packager's top seller is
    // a 7lb bag — true, and about a different channel. Using it would put the
    // hint out of step with the per-pound range it sits beside.
    expect(ICE_BAG_LB).toBe(20);
  });

  test('it rounds UP, because you cannot buy 2.3 bags', () => {
    expect(bagsForPounds(46)).toEqual({ bags: 3, bagLb: 20 });
    expect(bagsForPounds(40)).toEqual({ bags: 2, bagLb: 20 });
    expect(bagsForPounds(41)).toEqual({ bags: 3, bagLb: 20 });
    expect(bagsForPounds(1)).toEqual({ bags: 1, bagLb: 20 });
  });

  test('no hint is better than a wrong one', () => {
    expect(bagsForPounds(0)).toBeNull();
    expect(bagsForPounds(-5)).toBeNull();
    expect(bagsForPounds(null)).toBeNull();
    expect(bagsForPounds('nonsense')).toBeNull();
    expect(bagsForPounds(46, 0)).toBeNull();
  });

  test('NARROW: it fires for the ice line and for nothing else', () => {
    // THE FIXTURE IS THE REAL SHAPE, MEASURED. The first version of this test
    // used { item: 'Ice' } and passed while the feature rendered nothing at
    // all in the app, because the authored item is
    // "Ice (coolers + drinks + red drink)" and only the row's short label
    // reads "Ice". An invented fixture is a test of the invention.
    const realIce = { id: 'p_ice', item: 'Ice (coolers + drinks + red drink)', unit: 'lbs' };
    expect(shoppingHint(realIce, 46)).toBe('about 3 × 20 lb bags');
    expect(shoppingHint({ ...realIce, unit: 'lb' }, 20)).toBe('about 1 × 20 lb bag');
    // Everything else priced in pounds is left exactly alone — ribs are sold
    // by weight at a counter and a "bag" would be nonsense.
    expect(shoppingHint({ id: 'p_ribs', item: 'Ribs (racks)', unit: 'lbs' }, 46)).toBeNull();
    expect(shoppingHint({ id: 'p_brisket', item: 'Brisket', unit: 'lb' }, 12)).toBeNull();
    // …and ice in a unit that is already shoppable is not second-guessed.
    expect(shoppingHint({ ...realIce, unit: 'bag' }, 3)).toBeNull();
    // A line that merely SAYS ice is not the ice line.
    expect(shoppingHint({ id: 'p_cooler', item: 'Cooler for the ice', unit: 'lb' }, 46)).toBeNull();
    expect(shoppingHint(null, 46)).toBeNull();
  });

  test('singular reads like English', () => {
    expect(shoppingHint({ id: 'p_ice', item: 'Ice', unit: 'lb' }, 15)).toMatch(/1 × 20 lb bag$/);
  });
});
