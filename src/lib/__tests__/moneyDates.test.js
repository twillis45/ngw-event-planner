// Money-Safe Date Chain — MVP #1 of the Destination + Multi-Day program.
// Locks: transcription-only sequencing, the exposure line's honesty bounds,
// the synthesized collect-by cushion, and the settle-up draft's real-facts rule.

import { moneyDatesFor, settleUpDraft } from '../moneyDates';

const NOW = new Date('2026-07-27T12:00:00');
const d = (n) => { const x = new Date(NOW); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

describe('moneyDatesFor', () => {
  test('irrelevant with nothing entered', () => {
    expect(moneyDatesFor({}, NOW).relevant).toBe(false);
  });

  test('rows sort soonest-first with honest passed flags', () => {
    const m = moneyDatesFor({ moneyDates: { refundDeadline: d(9), headcountDue: d(2), installmentDue: d(-1) } }, NOW);
    expect(m.rows.map((r) => r.key)).toEqual(['installment', 'headcount', 'refund']);
    expect(m.rows[0].passed).toBe(true);
    expect(m.refund.daysLeft).toBe(9);
  });

  test('exposure line: fronted + live refund clock', () => {
    const m = moneyDatesFor({ frontedAmount: 2400, moneyDates: { refundDeadline: d(9) } }, NOW);
    expect(m.exposureLine).toBe('You’re out of pocket $2,400 until the group settles up — refundable for 9 more days.');
  });

  test('exposure line: window closed = the honest bad news', () => {
    const m = moneyDatesFor({ frontedAmount: 900, moneyDates: { refundDeadline: d(-2) } }, NOW);
    expect(m.exposureLine).toMatch(/refund window has closed/);
  });

  test('fronted without a deadline asks for the real date, never invents one', () => {
    const m = moneyDatesFor({ frontedAmount: 500 }, NOW);
    expect(m.exposureLine).toMatch(/add the refund deadline from your booking/);
    expect(m.refund).toBe(null);
    expect(m.collectBy).toBe(null);
  });

  test('collect-by = refund minus 3 days, never in the past', () => {
    expect(moneyDatesFor({ moneyDates: { refundDeadline: d(10) } }, NOW).collectBy).toBe(d(7));
    expect(moneyDatesFor({ moneyDates: { refundDeadline: d(2) } }, NOW).collectBy).toBe(null);
  });

  test('garbage dates are dropped, not sequenced', () => {
    const m = moneyDatesFor({ moneyDates: { refundDeadline: 'soon-ish', headcountDue: d(5) } }, NOW);
    expect(m.rows.map((r) => r.key)).toEqual(['headcount']);
  });
});

describe('settleUpDraft', () => {
  test('writes the ask from real facts (date + fronted amount)', () => {
    const t = settleUpDraft({ frontedAmount: 2400, moneyDates: { refundDeadline: '2026-08-14' } }, NOW);
    expect(t).toMatch(/stops being refundable on August 14/);
    expect(t).toMatch(/\$2,400 up front/);
  });
  test('no refund date (or passed) → no draft, never a fabricated urgency', () => {
    expect(settleUpDraft({ frontedAmount: 100 }, NOW)).toBe(null);
    expect(settleUpDraft({ moneyDates: { refundDeadline: d(-1) } }, NOW)).toBe(null);
  });
});
