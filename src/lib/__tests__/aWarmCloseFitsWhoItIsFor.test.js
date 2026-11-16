// ─── "WARMER" FITS WHO THE NOTE IS FOR (11/16/2026) ──────────────────────────
// The draft's "Warmer" tone appended "So glad you’ll be part of it." to every
// note: right for a guest or a booked vendor, wrong for a caterer you are
// still asking for a quote, and odd on a payment reminder. Deterministic, like
// every tone: one closing line chosen from who the note is for.
import { warmClosing } from '../warmClosing';

test('a guest or helper note keeps the original line', () => {
  expect(warmClosing({ title: 'Confirm with Renee Carter' })).toBe('So glad you’ll be part of it.');
});
test.each(['Considering', 'Quoted', '', undefined])('a vendor still being asked (%s) is thanked, not told they are in', (status) => {
  const line = warmClosing({ title: 'Note to Capital Rotisserie', vendor: { status } });
  expect(line).not.toMatch(/part of it|working with you/);
  expect(line).toMatch(/Thank you/);
});
test.each(['Booked', 'Confirmed', 'Deposit Paid', 'Paid'])('a booked vendor (%s) hears they are part of it', (status) => {
  expect(warmClosing({ title: 'Note to Capital Rotisserie', vendor: { status } })).toBe('So glad to be working with you on this.');
});
test('a payment reminder thanks them, whatever the status', () => {
  expect(warmClosing({ title: 'Payment reminder', vendor: { status: 'Booked' } })).toBe('Thank you again for everything you’re doing for us.');
});
