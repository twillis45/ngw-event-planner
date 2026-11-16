// ─── THE VFW DEMO READS ITS OWN DATA (owner's live demo, 11/15/2026) ─────────
//
// The owner drove the seeded "30-Year United States Army Retirement Celebration
// at the VFW" and found the engines answering questions the event's own records
// had already answered: a venue-type call on a booked VFW, a food call beside a
// contracted caterer, "National average" prices for a venue in Alexandria, VA,
// "catering $3,300 vendor record" when no vendor has a price. Each case below
// runs on `buildDemoEvent()` and carries a synthetic negative control, so a fix
// that simply deletes the row fails here.
import { buildDemoEvent } from '../demoSeed';
import { venueFor } from '../venueFor';
import { splitTrailingPlace } from '../cityText';
import { vendorDisplayName } from '../vendorDisplayName';
import { summarizeWhoIsConfirmed, whoIsConfirmedLines } from '../whoIsConfirmed';
import { moneyCategories } from '../vendorMoney';
import { hostSpending } from '../hostSpending';

const NOW = Date.UTC(2026, 10, 15, 17);
const demo = () => buildDemoEvent(NOW);

describe('item 11 — the state rides in the venue string', () => {
  test('"VFW Post 3150 — Alexandria, VA" yields Alexandria, VA', () => {
    const v = venueFor(demo());
    expect(v.state).toBe('VA');
    expect(v.city).toBe('Alexandria');
    // The name keeps its town (briefs and rain plans print it); the display line
    // does not repeat it.
    expect(v.name).toBe('VFW Post 3150 — Alexandria, VA');
    expect(v.displayLine).toBe('VFW Post 3150 — Alexandria, VA');
    expect(v.mapsQuery).toBe('VFW Post 3150 — Alexandria, VA');
  });
  test('control: a dash inside a name with no state is left alone', () => {
    const v = venueFor({ venueKind: 'venue', venue: 'Smith — Jones Hall' });
    expect(v.state).toBe('');
    expect(v.name).toBe('Smith — Jones Hall');
  });
  test('splitTrailingPlace reads both separators and refuses a non-state', () => {
    expect(splitTrailingPlace('Capital Rotisserie Catering — Silver Spring, MD')).toEqual({ name: 'Capital Rotisserie Catering', city: 'Silver Spring', state: 'MD' });
    expect(splitTrailingPlace('Casa Alegria, Santa Fe, NM')).toEqual({ name: 'Casa Alegria', city: 'Santa Fe', state: 'NM' });
    expect(splitTrailingPlace('Smith — Jones, Inc')).toBeNull();
    expect(splitTrailingPlace('Alexandria, VA')).toBeNull(); // a bare place has no name to keep
  });
});

describe('item 22 — host-facing vendor names drop the trailing town', () => {
  test('vendorDisplayName strips " — City, ST"', () => {
    expect(vendorDisplayName({ name: 'Beltway Sound Collective — Arlington, VA' })).toBe('Beltway Sound Collective');
    expect(vendorDisplayName({ name: 'Marco’s Kitchen' })).toBe('Marco’s Kitchen');
    expect(vendorDisplayName({ category: 'DJ' })).toBe('DJ');
  });
  test('"Still waiting:" lists names without ", City, ST"', () => {
    const lines = whoIsConfirmedLines(summarizeWhoIsConfirmed(demo(), {}));
    expect(lines.waiting).toMatch(/^Still waiting: /);
    expect(lines.waiting).not.toMatch(/—|, [A-Z]{2}\b/);
    expect(lines.waiting).toContain('Beltway Sound Collective');
  });
});

describe('item 7 — an estimate is never labeled a vendor record', () => {
  test('the contracted, unpriced caterer does not turn the food estimate into a vendor record', () => {
    const cats = hostSpending(demo(), 1).categories;
    const food = cats.find((c) => /cater/i.test(c.label));
    expect(food).toBeTruthy();
    expect(food.expected).toBeGreaterThan(0);
    expect(food.source).toBe('estimate');
    expect(food.label).toBe('Catering');
    expect(food.vendorIds.length).toBe(1);   // the caterer still rides on the row
  });
  test('control: a priced, contracted caterer is the vendor record', () => {
    const ev = demo();
    ev.vendors = ev.vendors.map((v) => (v.category === 'Catering' ? { ...v, cost: 4200 } : v));
    const food = hostSpending(ev, 1).categories.find((c) => /cater/i.test(c.label));
    expect(food.source).toBe('vendor');
    expect(food.expected).toBe(4200);
  });
  test('control: a booked, unpriced vendor with no estimate keeps the vendor source', () => {
    const cats = moneyCategories({ budget: [], vendors: [{ id: 'p', category: 'Photography', status: 'Contracted', depositPaid: true, depositAmt: 200 }] });
    expect(cats[0].source).toBe('vendor');
  });
});

describe('item 5 — booked vendors with no price are reported, not read as "nothing to settle"', () => {
  test('hostSpending names the booked vendors that carry no price', () => {
    const s = hostSpending(demo(), 1);
    expect(s.unpricedBooked.map((v) => v.name).sort()).toEqual(['Anacostia Frame & Film Co.', 'Capital Rotisserie Catering', 'VFW Post 3150']);
  });
  test('control: priced bookings are not unpriced', () => {
    const ev = demo();
    ev.vendors = ev.vendors.map((v) => ({ ...v, cost: 500 }));
    expect(hostSpending(ev, 1).unpricedBooked).toEqual([]);
  });
});
