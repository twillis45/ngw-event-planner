// ─── THE TRIP DETAILS, SENT, TICK THEIR ROW (11/21/2026) ─────────────────────
//
// Group Trip's "Send everyone the trip details…" opens the trip-details draft.
// Posting it on everyone's invite, or handing it off (Share, Text it, WhatsApp,
// "Mark it sent"), wrote the send ledger and left the row open, so the
// checklist kept asking for a send the host had made. The ledger entry for
// that draft is now the row's proof. Copying is not a send: the clipboard
// proves a draft exists, not that it left (the invite's rule).
import { taskSatisfied, timelineStepResolved, TRIP_DETAILS_DRAFT } from '../taskEngine';
import { recordHandoff, recordEmailSend, sendStateLine } from '../sendLedger';
import { playbookChecklist } from '../playbooks';

const EV = { id: 'trip-sent', type: 'Group Trip', date: '2026-12-31', endDate: '2027-01-02', guestEstimate: 4, guestMode: 'count', guestCountSource: 'host' };
const row = () => (playbookChecklist(EV, '2026-10-01') || []).find((r) => r.id === `pbt-${EV.id}-t_details`);
const AT = '2026-11-21T12:00:00.000Z';
const withLedger = (channel) => ({ ...EV, sendLedger: recordHandoff({}, TRIP_DETAILS_DRAFT, channel, AT, { kind: 'guests' }) });

test('PREMISE: the row is the draft’s, and nothing sent leaves it open', () => {
  expect(TRIP_DETAILS_DRAFT).toBe('The trip details');
  expect(row().task).toMatch(/^Send everyone the trip details/);
  expect(taskSatisfied(EV, row())).toBe(false);
  expect(timelineStepResolved(EV, row())).toBe(false);
});

test.each(['invite', 'share', 'sms', 'whatsapp', 'other'])('handed off by %s, the row is done', (channel) => {
  const ev = withLedger(channel);
  expect(taskSatisfied(ev, row())).toBe(true);
  expect(timelineStepResolved(ev, row())).toBe(true);
});

test('copied is not sent', () => {
  expect(taskSatisfied(withLedger('copy'), row())).toBe(false);
});

test('another draft’s send does not count', () => {
  const ev = { ...EV, sendLedger: recordHandoff({}, 'Your shopping list', 'sms', AT) };
  expect(taskSatisfied(ev, row())).toBe(false);
});

test('an email that failed, or is still going, does not count', () => {
  expect(taskSatisfied({ ...EV, sendLedger: recordEmailSend({}, TRIP_DETAILS_DRAFT, 'failed', { at: AT }) }, row())).toBe(false);
  expect(taskSatisfied({ ...EV, sendLedger: recordEmailSend({}, TRIP_DETAILS_DRAFT, 'sending', { at: AT }) }, row())).toBe(false);
});

test('a post says it was posted, never "handed off"', () => {
  const e = withLedger('invite').sendLedger[TRIP_DETAILS_DRAFT];
  expect(sendStateLine(e, Date.parse(AT))).toBe('Posted on everyone’s invite · just now');
});
