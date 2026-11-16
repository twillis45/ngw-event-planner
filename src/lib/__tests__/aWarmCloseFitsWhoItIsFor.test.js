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

// ── Never two thank-yous in a row (live check, 11/16/2026, 1:50 PM EST) ──────
// The live Warmer note to a caterer read "Thanks so much!" and then "Thank you
// for your time — …". The warm closing now takes the bare thanks line's place.
import { warmerBody } from '../warmClosing';

const QUOTING = { vendor: { status: 'Considering' } };
const THANKS = 'Thank you for your time — I’d love to work with you on this.';

test('a bare "Thanks so much!" is replaced, not followed', () => {
  const out = warmerBody('Hi Dana,\n\nAre you free Nov 21?\n\nThanks so much!', QUOTING);
  expect(out).toBe(`Hi Dana,\n\nAre you free Nov 21?\n\n${THANKS}`);
  expect(out).not.toMatch(/Thanks so much/);
});

test('the signature after the thanks line stays', () => {
  expect(warmerBody('Are you free?\n\nThank you!\n\n— Vida', QUOTING)).toBe(`Are you free?\n\n${THANKS}\n\n— Vida`);
});

test('no thanks line: the closing is added at the end; twice changes nothing', () => {
  const once = warmerBody('Are you free?\n\n— Vida', QUOTING);
  expect(once).toBe(`Are you free?\n\n— Vida\n\n${THANKS}`);
  expect(warmerBody(once, QUOTING)).toBe(once);
});

test('a sentence that only mentions thanks is not a sign-off', () => {
  const b = 'Thanks for the quote — could you add delivery?';
  expect(warmerBody(b, QUOTING)).toBe(`${b}\n\n${THANKS}`);
});
