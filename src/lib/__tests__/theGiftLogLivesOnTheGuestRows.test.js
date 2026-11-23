// ─── THE GIFT LOG LIVES ON THE GUEST ROWS (owner pick A, 11/21/2026) ─────────
// Birthday's three gift rows open After › Thank-yous & gifts. A received gift
// takes What it was + $ cash/card; "Couldn't come, sent a gift" draws from the
// No/Maybe guests; the cash is totaled; the thank-you names the gift.
// e2e twin: hostv2/e2e/theGiftLogLivesOnTheGuestRows.spec.mjs.
import { routeByWords } from '../__fixtures__/stepByWords';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { taskSatisfied } from '../taskEngine';
import { playbookChecklist } from '../playbooks';
import { giftCashTotal, thankYouGiftLine } from '../giftLog';
import { duplicateEvent } from '../duplicateEvent';

const ev = (extra = {}) => ({ id: 'gl', type: 'Birthday', date: '2026-11-19', guestMode: 'list', venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', ...extra });
const rows = playbookChecklist(ev(), '2026-10-01') || [];
const row = (re) => rows.find((r) => re.test(r.task));
const CASH = row(/^Record the cash and gift cards/);
const ABSENT = row(/^Add the gifts that arrived by mail/);
const GOTHRU = row(/^Go through the gifts with the guest list/);

test('premise: the three Birthday gift rows are in the playbook', () => {
  expect([CASH, ABSENT, GOTHRU].every(Boolean)).toBe(true);
});

test.each([['cash', () => CASH], ['mailed', () => ABSENT], ['go through', () => GOTHRU]])('the %s row opens After on Thank-yous & gifts', (_n, get) => {
  const r = get();
  const hit = routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, ev());
  expect(hit && hit.label).toBe('Log gifts and cash');
  expect(resolveRoute(hit.route)).toEqual({ kind: 'stage:after', focus: 'gifts' });
});

test('the cash row is done once a cash or card amount is on the log, not before', () => {
  const t = { task: CASH.task };
  expect(taskSatisfied(ev({ guests: [{ name: 'Jordan Hale', rsvp: 'Yes', giftReceived: true, giftWhat: 'Card' }] }), t)).toBe(false);
  expect(taskSatisfied(ev({ guests: [{ name: 'Jordan Hale', rsvp: 'Yes', giftReceived: true, giftCash: 100 }] }), t)).toBe(true);
  // An amount on a row the host un-marked as a gift is not on the log.
  expect(taskSatisfied(ev({ guests: [{ name: 'Jordan Hale', rsvp: 'Yes', giftReceived: false, giftCash: 100 }] }), t)).toBe(false);
});

test('the mailed-gifts row is done once someone who did not come is on the log', () => {
  const t = { task: ABSENT.task };
  expect(taskSatisfied(ev({ guests: [{ name: 'Lena', rsvp: 'Yes', giftReceived: true }] }), t)).toBe(false);
  expect(taskSatisfied(ev({ guests: [{ name: 'Uncle Ray', rsvp: 'No', giftReceived: true, giftWhat: 'Check in a card' }] }), t)).toBe(true);
});

test('"Go through the gifts" asks for every giver, which no record proves: the host ticks it', () => {
  expect(taskSatisfied(ev({ guests: [{ name: 'Lena', rsvp: 'Yes', giftReceived: true, giftWhat: 'Spa day voucher', giftCash: 50 }] }), { task: GOTHRU.task })).toBe(false);
});

test('the cash total counts received gifts only', () => {
  expect(giftCashTotal(ev({ guests: [
    { name: 'Jordan', rsvp: 'Yes', giftReceived: true, giftCash: 100 },
    { name: 'Ray', rsvp: 'No', giftReceived: true, giftCash: '50' },
    { name: 'Sam', rsvp: 'Yes', giftReceived: false, giftCash: 999 },
    { name: 'Priya', rsvp: 'Yes', giftReceived: true },
  ] }))).toEqual({ total: 150, from: 2 });
});

test('the thank-you names the gift when it is written down', () => {
  expect(thankYouGiftLine({ giftReceived: true, giftWhat: 'Spa day voucher' })).toBe(' And thank you for the Spa day voucher — it meant a lot.');
  expect(thankYouGiftLine({ giftReceived: true, giftCash: 100 })).toBe(' And thank you for your generous gift — it meant a lot.');
  expect(thankYouGiftLine({ giftReceived: true })).toBe(' And thank you for the gift — it meant a lot.');
  expect(thankYouGiftLine({ giftReceived: false, giftWhat: 'x' })).toBe('');
});

test('a duplicated birthday does not carry last year’s gifts', () => {
  const copy = duplicateEvent(ev({ guests: [{ id: 'a', name: 'Lena', giftReceived: true, giftWhat: 'Voucher', giftCash: 20, thankYouSent: true }] }), { id: 'n', now: '2026-11-21T00:00:00Z' });
  expect(copy.guests[0]).toEqual({ id: 'a', name: 'Lena' });
});
