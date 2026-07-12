// DESTINATION-1 — proposedVendorCategories layers destination categories on
// top of the base type's roster additively, gated only on opts.isDestination.
// Backward-compat: every pre-existing call site passes just eventType, so the
// default (no opts) must be byte-identical to before.
import { proposedVendorCategories } from '../vendorCategoriesByType';

describe('proposedVendorCategories — destination modifier', () => {
  test('no opts (existing call sites) → unchanged base roster, no destination categories', () => {
    const cats = proposedVendorCategories('Birthday');
    expect(cats).not.toContain('Lodging / Concierge');
    expect(cats).not.toContain('Childcare / Kids’ Program');
  });

  test('isDestination: true adds the 3 destination categories on top of Birthday\'s own', () => {
    const base = proposedVendorCategories('Birthday');
    const withDest = proposedVendorCategories('Birthday', { isDestination: true });
    expect(withDest).toEqual(expect.arrayContaining(base));
    expect(withDest).toContain('Lodging / Concierge');
    expect(withDest).toContain('Transport');
    expect(withDest).toContain('Childcare / Kids’ Program');
  });

  test('never adds Flights/Air Travel — guests self-pay by default, not a host vendor line', () => {
    const withDest = proposedVendorCategories('Birthday', { isDestination: true });
    expect(withDest.some((c) => /flight|air travel/i.test(c))).toBe(false);
  });

  test('does not duplicate a category the base roster already has (e.g. Team Retreat already has Transport/Lodging)', () => {
    const withDest = proposedVendorCategories('Team Retreat', { isDestination: true });
    const transportCount = withDest.filter((c) => c === 'Transport').length;
    const lodgingCount = withDest.filter((c) => c === 'Lodging / Concierge').length;
    expect(transportCount).toBe(1);
    expect(lodgingCount).toBe(1);
  });

  test('works for any type, not hardcoded to one', () => {
    const withDest = proposedVendorCategories('Reunion', { isDestination: true });
    expect(withDest).toContain('Lodging / Concierge');
  });
});
