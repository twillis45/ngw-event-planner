// ─── A VENDOR NOTE FITS WHERE THEY STAND (#138, owner's demo 11/15/2026) ─────
// "Draft note" on the contracted caterer opened "Hi Capital Rotisserie Catering
// — Silver Spring, MD, … are you available that date, and could you share your
// pricing?" — an inquiry to a vendor already under contract, greeting the
// business with its town while Dana Whitfield is the contact on file.
import { buildDemoEvent } from '../demoSeed';
import { draftVendorOutreach } from '../doItForMe';

const NOW = Date.UTC(2026, 10, 15, 17);
const demo = () => buildDemoEvent(NOW);
const vendor = (ev, cat) => ev.vendors.find((v) => v.category === cat);

describe('a contracted vendor gets a confirm-the-details note', () => {
  const ev = demo();
  const d = draftVendorOutreach(ev, vendor(ev, 'Catering'), { name: 'Todd' });
  test('greets the contact by first name', () => {
    expect(d.body.split('\n')[0]).toBe('Hi Dana,');
  });
  test('confirms rather than asks for pricing', () => {
    expect(d.body).not.toMatch(/available that date|share your pricing/i);
    expect(d.body).toMatch(/confirm/i);
    expect(d.body).toContain('Guests: about 120');
    expect(d.body).toContain('2:30 PM');             // the arrival the host set
    expect(d.body).toMatch(/final guest count/i);     // an open item for a food vendor
    expect(d.subject).toMatch(/confirming the details/i);
    expect(d.subject).not.toMatch(/inquiry/i);
  });
});

test('the booked venue greets its role contact whole and names the insurance item', () => {
  const ev = demo();
  const d = draftVendorOutreach(ev, vendor(ev, 'Venue'), { name: 'Todd' });
  expect(d.body.split('\n')[0]).toBe('Hi Post Quartermaster,');
  expect(d.body).toMatch(/certificate of insurance/i);
  expect(d.body).not.toMatch(/final guest count/i);  // a venue does not plate the food
});

describe('control: a vendor still being quoted gets the inquiry', () => {
  const ev = demo();
  const d = draftVendorOutreach(ev, vendor(ev, 'DJ'), { name: 'Todd' });
  test('greets the business without its town', () => {
    expect(d.body.split('\n')[0]).toBe('Hi Beltway Sound Collective,');
  });
  test('asks availability and pricing', () => {
    expect(d.body).toMatch(/available that date/i);
    expect(d.subject).toMatch(/dj inquiry/i);
  });
});
