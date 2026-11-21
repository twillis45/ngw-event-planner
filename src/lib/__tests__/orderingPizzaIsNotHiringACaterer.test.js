// ─── ORDERING PIZZA IS NOT HIRING A CATERER (50-host sweep, 11/20/2026) ──────
// Driven on the built app: a birthday host settled "Cook it yourself, order
// trays, cater it, or potluck?" with the plan's own pick, "Order pizza/trays".
// Every part of the plan read handled — "Nothing is waiting on you" — and the
// hero said "Book your catering / food. You chose “Order pizza/trays” for the
// food; a caterer is not booked yet." The choice the host made was NOT to hire
// one. foodApproach counts a meal that arrives made (pizza, trays, takeout) as
// "uses a caterer" so the grocery list drops those lines — right for the list —
// and the vendor plan borrowed that flag to make a caterer REQUIRED. Only a
// pick that names hiring one (catering, a chef, drop-off) obliges a booking.
import { buildVendorPlan } from '../vendorPlan';
import { raiseAll } from '../surfaceRegistry';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const party = (food_style) => ({
  id: 'hc-pizza', type: 'Birthday', name: 'Maya’s 40th', date: inDays(30), guestEstimate: 20,
  venue: 'Lakeside Hall', vendors: [], timeline: [], guests: [], foodChoices: { food_style },
});
const cateringRow = (ev) => (buildVendorPlan(ev).categories || []).find((c) => /cater/i.test(c.category || ''));
const asksToBookCatering = (ev) => (raiseAll(ev) || []).some((r) => /book your cater/i.test(String(r.ask || r.title || '')) || /for the food; a caterer/i.test(String(r.why || '')));

test('ordering pizza or trays does not oblige a caterer booking', () => {
  const ev = party('Order pizza/trays');
  const row = cateringRow(ev);
  expect(row ? row.requiredByChoice : null).toBeFalsy();
  expect(asksToBookCatering(ev)).toBe(false);
});
test('control: choosing drop-off catering does', () => {
  const ev = party('Drop-off catering');
  expect(cateringRow(ev).requiredByChoice).toBe('Drop-off catering');
  expect(asksToBookCatering(ev)).toBe(true);
});
