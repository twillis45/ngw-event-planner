// Sprint 61B — Vendor Bank id stamp. Proves the two pure identity helpers that
// give event vendors a STABLE bankId so cross-event history stops fragmenting on
// normalized names: bankKey (the dedupe key) and resolveBankId (find-existing-id).

import { bankKey, resolveBankId } from '../api/vendors';

describe('61B bankKey — case/space-insensitive dedupe key', () => {
  test('lowercases + trims name and category', () => {
    expect(bankKey('  Bloom & Stem ', '  Florals ')).toBe('bloom & stem|florals');
    expect(bankKey('BLOOM & STEM', 'FLORALS')).toBe(bankKey('bloom & stem', 'florals'));
  });
  test('empty name AND category ⇒ the empty sentinel "|"', () => {
    expect(bankKey('', '')).toBe('|');
    expect(bankKey(null, undefined)).toBe('|');
    expect(bankKey('  ', '  ')).toBe('|');
  });
});

describe('61B resolveBankId — stable id across calls, distinct on real change', () => {
  const bank = [
    { id: 'pv-1', name: 'Bloom & Stem', category: 'Florals' },
    { id: 'pv-2', name: 'Ace Catering', category: 'Catering' },
  ];

  test('same name+category (any case/space) ⇒ the SAME id every call', () => {
    const a = resolveBankId(bank, 'Bloom & Stem', 'Florals');
    const b = resolveBankId(bank, '  bloom & stem ', ' FLORALS ');
    expect(a).toBe('pv-1');
    expect(b).toBe('pv-1');
    expect(a).toBe(b);
  });

  test('different name OR different category ⇒ no match (null)', () => {
    expect(resolveBankId(bank, 'Bloom & Stem', 'Catering')).toBeNull();   // same name, diff category
    expect(resolveBankId(bank, 'Other Florist', 'Florals')).toBeNull();   // diff name, same category
    expect(resolveBankId(bank, 'Nobody', 'Nothing')).toBeNull();
  });

  test('empty key ⇒ null (never matches a junk entry)', () => {
    expect(resolveBankId(bank, '', '')).toBeNull();
    expect(resolveBankId([{ id: 'junk', name: '', category: '' }], '', '')).toBeNull();
  });

  test('empty/undefined bank ⇒ null, no throw', () => {
    expect(resolveBankId([], 'Bloom & Stem', 'Florals')).toBeNull();
    expect(resolveBankId(undefined, 'Bloom & Stem', 'Florals')).toBeNull();
  });
});
