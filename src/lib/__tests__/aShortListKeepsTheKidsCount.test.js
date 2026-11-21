// ─── A SHORT LIST KEEPS THE KIDS COUNT (owner, 11/21/2026) ───────────────────
// Item 10 of the single-source audit: "including 8 kids" was dropped at
// creation, and the stepper's number was overwritten by the guest list's total
// the moment the first named guest was added. lib/kidsCountAfterRoster.js.
import { kidsCountAfterRoster } from '../kidsCountAfterRoster';

const ev = { guestMode: 'count', guestEstimate: 60, kidsCount: 8 };
test('her first named guest does not zero the 8 kids she set', () => {
  expect(kidsCountAfterRoster(ev, [{ name: 'Rosa', kids: 0 }])).toBe(8);
});
test('a short list holding more kids than the stepper raises it', () => {
  expect(kidsCountAfterRoster(ev, [{ name: 'Rosa', kids: 10 }])).toBe(10);
});
test('control: once the list covers the party, the list is the count', () => {
  const full = Array.from({ length: 60 }, (_, i) => ({ name: 'G' + i, kids: i < 3 ? 1 : 0 }));
  expect(kidsCountAfterRoster(ev, full)).toBe(3);
  expect(kidsCountAfterRoster({}, [{ name: 'A', kids: 2 }])).toBe(2);
});
