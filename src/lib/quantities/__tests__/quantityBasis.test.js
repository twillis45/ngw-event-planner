import { quantityBasis } from '../quantityBasis';

describe('quantityBasis — formats the authored factor, never invents one', () => {
  test('per-guest weight rate keeps the (singular) unit, renders common fractions', () => {
    expect(quantityBasis({ qtyPerGuest: 0.5, unit: 'lb' })).toBe('½ lb/guest');
    expect(quantityBasis({ qtyPerGuest: 0.25, unit: 'lb' })).toBe('¼ lb/guest');
    expect(quantityBasis({ qtyPerGuest: 0.4, unit: 'lb' })).toBe('0.4 lb/guest');
    expect(quantityBasis({ qtyPerGuest: 1.5, unit: 'lb' })).toBe('1.5 lb/guest');
  });
  test('count-ish units are dropped (the line already names them)', () => {
    expect(quantityBasis({ qtyPerGuest: 2, unit: 'drinks' })).toBe('2/guest');
    expect(quantityBasis({ qtyPerGuest: 1.5, unit: 'napkins' })).toBe('1.5/guest');
    expect(quantityBasis({ qtyPerGuest: 1, unit: 'piece' })).toBe('1/guest');
  });
  test('per-N items read "1 cake per 13 guests"', () => {
    expect(quantityBasis({ qtyPer: 13, qtyFlat: 1, unit: 'cake' })).toBe('1 cake per 13 guests');
    expect(quantityBasis({ qtyPer: 6, qtyFlat: 1, unit: 'pitcher' })).toBe('1 pitcher per 6 guests');
  });
  test('flat-only buys and empty input get no basis — never a fabricated rate', () => {
    expect(quantityBasis({ qtyFlat: 6, unit: 'candles' })).toBe('');
    expect(quantityBasis({ qtyFlat: 1, unit: 'kit' })).toBe('');
    expect(quantityBasis({})).toBe('');
    expect(quantityBasis(null)).toBe('');
    expect(quantityBasis({ qtyPerGuest: 0, unit: 'lb' })).toBe('');
  });
  test('strips the parenthetical rule-of-thumb from authored units', () => {
    expect(quantityBasis({ qtyPerGuest: 0.5, unit: 'bottle (½ bottle/guest rule)' })).toBe('½ bottle/guest');
  });
});
