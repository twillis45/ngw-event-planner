// ─── A PROVENANCE ROW THAT OMITS THE VALUE IS A CITATION WITH NO QUOTE ────
//
// Host, 2026-09-28: "when included the rows under image doesn't carry
// values." The card under a listing's photo rendered the field and where it
// came from — "Total · read from the page you pasted" — and never the total.
// The rows vouched for facts they did not show.
import { lodgingProvenance } from '../lodgingIntel';

const OPT = {
  id: 'o1', label: 'The house on Rose Ave', sleeps: 10, beds: 4,
  totalPrice: 4200, pricePerNight: 840, fees: 310,
  amenities: ['kitchen', 'pool'], photoUrl: 'https://x.test/a.jpg',
  sources: { label: 'read', totalPrice: 'read', sleeps: 'typed' },
};

const row = (o, f) => lodgingProvenance(o).rows.find((r) => r.field === f);

describe('every row shows what it is vouching for', () => {
  test('the value is there at all', () => {
    for (const r of lodgingProvenance(OPT).rows) {
      expect(r.value == null || r.value === '').toBe(false);
    }
  });

  test('money reads as money, not a bare integer', () => {
    expect(row(OPT, 'totalPrice').value).toBe('$4,200');
    expect(row(OPT, 'pricePerNight').value).toBe('$840');
    expect(row(OPT, 'fees').value).toBe('$310');
  });

  test('a list reads as a list', () => {
    expect(row(OPT, 'amenities').value).toBe('kitchen, pool');
  });

  test('the photo says it is on the card — a URL is not a fact a host reads', () => {
    expect(row(OPT, 'photoUrl').value).toBe('on the card');
    expect(row(OPT, 'photoUrl').value).not.toMatch(/http/);
  });

  test('the source still travels with it — the value does not replace it', () => {
    expect(row(OPT, 'totalPrice').source).toBe('read');
    expect(row(OPT, 'sleeps').source).toBe('typed');
    expect(row(OPT, 'beds').source).toBe('unknown');
  });

  test('empty fields still produce no row at all', () => {
    const thin = { id: 'o2', label: 'Just a link', sources: {} };
    const fields = lodgingProvenance(thin).rows.map((r) => r.field);
    expect(fields).toEqual(['label']);
  });
});
