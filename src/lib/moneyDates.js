// ─── Money-Safe Date Chain — the deadlines that decide whose money is at risk ─
// (Destination + Multi-Day program, board-blessed MVP #1, 2026-07-27.)
//
// The grounded finding (research dossier d19242e2): a group booking's danger
// isn't the price — it's the SEQUENCE. The organizer fronts the deposit; the
// refund window closes on a fixed date; a missed installment can cancel the
// booking (Vrbo installments are MANUAL — a missed email kills a confirmed
// stay); the vendor's final-headcount date locks what gets paid for. Money
// collected from the group AFTER the refund deadline is the organizer's loss.
//
// LIABILITY RULING (red team, 2026-07-26): every date here is TRANSCRIBED by
// the host from their actual booking confirmation — the app never derives a
// deadline from a platform policy table, because platforms change terms
// without notice and a confidently wrong last-safe-cancel date on a $6,000
// booking is worse than none. This module only sequences what the host typed.
//
// event.moneyDates = { refundDeadline, installmentDue, headcountDue }  (ISO)
// event.frontedAmount = number — the host's own out-of-pocket note (their one
// number, same class as totalBudget; never per-guest money).

import { daysUntil } from './dates';

const iso = (v) => {
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

export function moneyDatesFor(event, now) {
  const md = (event && event.moneyDates && typeof event.moneyDates === 'object') ? event.moneyDates : {};
  const row = (key, label, dateIso, note) => {
    const d = iso(dateIso);
    if (!d) return null;
    const daysLeft = daysUntil(d, now);
    if (daysLeft == null) return null;
    return { key, label, date: d, daysLeft, passed: daysLeft < 0, note };
  };
  const rows = [
    row('refund', 'Refund window closes', md.refundDeadline,
      'after this, money you cancel doesn’t come back'),
    row('installment', 'Next payment due', md.installmentDue,
      'some platforms don’t auto-charge — a missed payment can cancel the booking'),
    row('headcount', 'Final headcount due', md.headcountDue,
      'the number the vendor preps and charges for'),
  ].filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft);

  const fronted = Number(event && event.frontedAmount) > 0 ? Number(event.frontedAmount) : null;
  const refund = rows.find((r) => r.key === 'refund') || null;

  // Collect-by proposal: three days of cushion before the refund window closes.
  // SYNTHESIZED buffer (propose-don't-ask): the 3-day figure is our margin, not
  // a researched norm — the UI says so and the host can ignore it. The RULE it
  // serves is grounded: collect before the window closes, or a drop-out's cost
  // lands on the person who fronted the booking.
  let collectBy = null;
  if (refund && !refund.passed) {
    const d = new Date(refund.date + 'T12:00:00');
    d.setDate(d.getDate() - 3);
    const c = d.toISOString().slice(0, 10);
    if ((daysUntil(c, now) ?? -1) >= 0) collectBy = c;
  }

  // The organizer-exposure line (the trench organizer's hero number). Honest
  // bounds: it only knows what the host typed — fronted amount vs the refund
  // clock. Collected-per-guest tracking is Phase-4-gated (server ledger).
  let exposureLine = null;
  if (fronted != null && refund) {
    exposureLine = refund.passed
      ? `You’re out of pocket $${fronted.toLocaleString()} — the refund window has closed, so what the group hasn’t paid back is yours.`
      : `You’re out of pocket $${fronted.toLocaleString()} until the group settles up — refundable for ${refund.daysLeft} more ${refund.daysLeft === 1 ? 'day' : 'days'}.`;
  } else if (fronted != null) {
    exposureLine = `You’re out of pocket $${fronted.toLocaleString()} — add the refund deadline from your booking so the clock is real.`;
  }

  return {
    relevant: rows.length > 0 || fronted != null,
    rows, fronted, refund, collectBy, exposureLine,
  };
}

/** The settle-up ask, written from real facts only — for the copy composer. */
export function settleUpDraft(event, now) {
  const m = moneyDatesFor(event, now);
  if (!m.relevant || !m.refund || m.refund.passed) return null;
  const when = new Date(m.refund.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const amount = m.fronted != null ? ` I’ve covered $${m.fronted.toLocaleString()} up front.` : '';
  return `Quick money note for the trip: the booking stops being refundable on ${when}.${amount} If you can send your share before then, nobody ends up stuck if plans change. Thank you!`;
}
