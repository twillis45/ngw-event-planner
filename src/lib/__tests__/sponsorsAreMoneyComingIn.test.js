// ─── SPONSORS ARE MONEY COMING IN (owner pick B + A's ask, 11/21/2026) ───────
// "Money coming in · sponsors" in Your money: business, amount, what their name
// goes on, Mark received, Mark thanked, Draft their report; pledged vs in hand;
// never spending. PTA's ask row drafts the sponsor ask; the thank / banner /
// recognition / prospectus rows open the sponsor list.
// e2e twin: hostv2/e2e/sponsorsAreMoneyComingIn.spec.mjs.
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { taskSatisfied } from '../taskEngine';
import { playbookChecklist } from '../playbooks';
import { sponsorTotals, addSponsor, markSponsor, draftSponsorAsk, draftSponsorReport } from '../sponsors';
import { hostSpending } from '../hostSpending';
import { duplicateEvent } from '../duplicateEvent';

const ev = (type, extra = {}) => ({ id: 'sp', type, name: 'Lincoln Elementary Fall Festival', date: '2027-01-30', guestEstimate: 300,
  guestMode: 'count', guestCountSource: 'host', venue: 'Lincoln Elementary', venueCity: 'Austin, TX', ...extra });
const row = (type, re) => (playbookChecklist(ev(type), '2026-10-01') || []).find((r) => re.test(r.task));
const SPONSORS = [
  { id: 's1', business: 'Main St. Hardware', amount: 500, recognition: 'The banner and the program', received: true, thanked: false },
  { id: 's2', business: 'Rosa’s Taqueria', amount: 250, recognition: 'The banner', received: false, thanked: false },
  { id: 's3', business: 'Lakeside Dental', amount: 1000, recognition: 'The banner, the program, a booth sign', received: true, thanked: true },
];

test('PTA: the ask row drafts the sponsor ask on the draft sheet, and is done once a sponsor is on the list', () => {
  const r = row('PTA / Booster Fundraiser', /^Ask local businesses to sponsor/);
  const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, ev('PTA / Booster Fundraiser'));
  expect(hit.label).toBe('Draft the sponsor ask');
  expect(resolveRoute(hit.route)).toEqual({ kind: 'draft', focus: 'sponsor-ask' });
  expect(taskSatisfied(ev('PTA / Booster Fundraiser'), { task: r.task })).toBe(false);
  expect(taskSatisfied(ev('PTA / Booster Fundraiser', { sponsors: SPONSORS.slice(1, 2) }), { task: r.task })).toBe(true);
});

describe.each([
  ['PTA / Booster Fundraiser', /^Thank the sponsors, the volunteers/],
  ['PTA / Booster Fundraiser', /^Order the sponsor thank-you banner/],
  ['Fundraiser / Gala', /^Thank sponsors, item donors/],
  ['Fundraiser / Gala', /^Collect sponsor logos/],
  ['Fundraiser / Gala', /^Write the sponsorship prospectus/],
  ['Conference', /prospectus/],
])('%s: %s', (type, re) => {
  const r = row(type, re);
  test('opens the sponsor list in Your money', () => {
    expect(r).toBeTruthy();
    const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, ev(type));
    expect(hit.label).toBe('Open your sponsors');
    expect(resolveRoute(hit.route)).toEqual({ kind: 'budget', focus: 'sponsors' });
  });
  test('stays the host’s tick: the rows name people and acts the list cannot prove', () => {
    const all = SPONSORS.map((s) => ({ ...s, received: true, thanked: true }));
    expect(taskSatisfied(ev(type, { sponsors: all }), { task: r.task })).toBe(false);
  });
});

test('pledged vs in hand; adding needs a business; received and thanked toggle', () => {
  expect(sponsorTotals(ev('Conference', { sponsors: SPONSORS }))).toEqual({ pledged: 1750, inHand: 1500, count: 3 });
  expect(addSponsor({}, { business: '  ' })).toBeNull();
  expect(addSponsor({}, { business: 'Main St. Hardware', amount: '250', recognition: 'The banner' }, 's9'))
    .toEqual([{ id: 's9', business: 'Main St. Hardware', amount: 250, recognition: 'The banner', received: false, thanked: false }]);
  const e = ev('Conference', { sponsors: SPONSORS });
  expect(markSponsor(e, 's2', 'received', true).find((s) => s.id === 's2').received).toBe(true);
  expect(markSponsor(e, 's2', 'amount', 9).find((s) => s.id === 's2').amount).toBe(250);
});

test('sponsor money never counts as spending and never lowers a spend total', () => {
  const base = ev('PTA / Booster Fundraiser', { budget: [{ id: 'b', category: 'Decor', budgeted: 300, actual: 120 }] });
  const a = hostSpending(base);
  const b = hostSpending({ ...base, sponsors: SPONSORS });
  expect(b.spent).toBe(a.spent);
  expect(b.expected).toBe(a.expected);
  expect(b.committed).toBe(a.committed);
});

test('the ask states the goal only when the host chose it, and leaves blanks for the rest', () => {
  const plain = draftSponsorAsk(ev('PTA / Booster Fundraiser'), { name: 'Dana' });
  expect(plain.body).toContain('I’m on the committee for Lincoln Elementary Fall Festival on Saturday, January 30.');
  expect(plain.body).toContain('raising [the goal] for [what the money funds]');
  expect(plain.body).toContain('Thank you — Dana');
  const chosen = draftSponsorAsk(ev('PTA / Booster Fundraiser', { foodChoices: { fundraising_goal: '$2,500 to $10,000' } }));
  expect(chosen.body).toContain('raising $2,500 to $10,000 for');
});

test('their report says what they gave and where their name went', () => {
  const r = draftSponsorReport(ev('Conference'), SPONSORS[0], { name: 'Dana' });
  expect(r.body).toContain('Your $500 came in, and your name went on The banner and the program.');
});

test('a duplicated fundraiser does not carry last year’s sponsors', () => {
  expect(duplicateEvent(ev('Conference', { sponsors: SPONSORS }), { id: 'n', now: '2026-11-21T00:00:00Z' }).sponsors).toBeUndefined();
});
