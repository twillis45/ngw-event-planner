// ─── THE STATUS LINE AGREES WITH THE CATERER ASK (design batch 4, 11/21/2026) ─
// With drop-off catering chosen and no vendor rows, the hero rightly asks the
// host to book a caterer (surfaceRegistry, from vendorPlan's requiredByChoice),
// while the status line under it read "Every part of the plan is handled.
// Nothing is waiting on you." The phase ledger counted vendors only when vendor
// ROWS existed, so a caterer the host chose to hire and never booked was
// invisible to it. Both now read the same obligation.
import { buildVendorPlan } from '../vendorPlan';
import { raiseAll } from '../surfaceRegistry';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { orientation } from '../eventOrientation';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
// Every other part of the plan settled, so the vendor part is the only thing
// left for the status line to name (measured: date & time, place, venue
// address, guests, food and budget all handled).
const party = (food_style, vendors = []) => ({
  id: 'hc-cater', type: 'Birthday', name: 'Maya’s 40th', date: inDays(30),
  startTime: '6:00 PM', startTimeSource: 'host', guestEstimate: 20, guestCountSource: 'host',
  venue: 'Lakeside Hall', venueAddress: '1 Main St, Annapolis, MD', indoorOutdoor: 'indoors', totalBudget: 2000,
  vendors, timeline: [], guests: [], foodChoices: { food_style, alcohol: 'No alcohol' },
});
const asksToBookCatering = (ev) => (raiseAll(ev) || []).some((r) => /book your cater/i.test(String(r.ask || r.title || '')));
const summaryFor = (ev) => (orientation(deriveEventPhaseProgress(ev), []) || {}).summary || '';
const vendorItem = (ev) => (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'vendors');

test('drop-off catering, no vendor rows: the hero asks, and the status line does not say nothing is waiting', () => {
  const ev = party('Drop-off catering');
  expect(asksToBookCatering(ev)).toBe(true); // premise: the hero's ask
  expect(summaryFor(ev)).not.toMatch(/Nothing is waiting on you/);
  expect(summaryFor(ev)).toMatch(/vendors/i);
  // the ledger counts the caterer the host chose to hire
  const v = vendorItem(ev);
  expect(v).toBeTruthy();
  expect(v.handled).toBe(false);
});

test('control: ordering pizza obliges no caterer, and the ledger adds no vendor part', () => {
  const ev = party('Order pizza/trays');
  expect(asksToBookCatering(ev)).toBe(false);
  expect(vendorItem(ev)).toBeFalsy();
});

test('control: a booked caterer clears both the ask and the ledger part', () => {
  const booked = { id: 'v1', name: 'Harvest Table', category: 'Catering', status: 'Booked' };
  const ev = party('Drop-off catering', [booked]);
  const row = (buildVendorPlan(ev).categories || []).find((c) => /cater/i.test(c.category || ''));
  expect(row.vendorId).toBe('v1'); // premise: the row matched the vendor
  expect(asksToBookCatering(ev)).toBe(false);
  expect(vendorItem(ev).handled).toBe(true);
});
