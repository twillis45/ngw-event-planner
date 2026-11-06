// Run 2 (11/6/2026, R2-11): an event created a day out had every vendor promise
// "overdue" — "Final guest count overdue (2026-10-31)" — for deadlines that had
// passed before the vendor existed, and in ISO.
import { deriveVendorExpectedPromises, deriveVendorAccountability } from '../vendorAccountability/derive';
import { usShortDate, localISO } from '../dates';

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localISO(d); };
const vendor = { id: 'v1', category: 'Catering', status: 'Considering' };

test('a promise whose usual lead time is gone is due the day planning began, not overdue', () => {
  const ev = { id: 'e1', date: day(1), createdAt: new Date().toISOString() };
  const ps = deriveVendorExpectedPromises(vendor, ev);
  expect(ps.length).toBeGreaterThan(0);
  for (const p of ps) expect(p.dueDate >= day(0)).toBe(true);
  const acc = deriveVendorAccountability(vendor, ev, ps);
  expect(acc.overdue).toBe(0);
  expect(acc.reasons.join(' ')).not.toMatch(/overdue/);
});

test('CONTROL — an event planned long ago still shows a real miss as overdue', () => {
  const ev = { id: 'e2', date: day(1), createdAt: new Date(Date.now() - 90 * 86400000).toISOString() };
  const ps = deriveVendorExpectedPromises(vendor, ev);
  const acc = deriveVendorAccountability(vendor, ev, ps);
  expect(acc.overdue).toBeGreaterThan(0);
  expect(acc.reasons.join(' ')).not.toMatch(/\d{4}-\d{2}-\d{2}/);   // US dates, never ISO
});

test('usShortDate reads as a host reads it', () => {
  const y = new Date().getFullYear();
  expect(usShortDate(`${y}-10-31`)).toBe('Oct 31');
  expect(usShortDate(`${y + 1}-01-05`)).toBe(`Jan 5, ${y + 1}`);
  expect(usShortDate('not a date')).toBe('not a date');
});
