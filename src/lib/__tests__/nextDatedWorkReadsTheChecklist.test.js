// "next dated work" reads the checklist's own dates (batch 11; audit 2 lane C
// P1-2). At 300 days out the birthday's progress line said "next dated work:
// Jun 5" (the day the shopping list opens) while its checklist had "Send
// invites…" due May 25; the wedding said "Oct 9" with a booking step due that
// very day. The line now takes the earliest of the plan's dated rows, the
// ledger's next change AND the open checklist steps, so it names a date the
// checklist itself shows.
import { nextPlanAttentionDate } from '../phaseProgress';
import { playbookChecklist } from '../playbooks';
import { taskDueInDays } from '../taskLead';

const at = (date, d) => { const x = new Date(date + 'T08:00:00'); x.setDate(x.getDate() + d); return x; };
const birthday = {
  id: 'aud-bday', type: 'Birthday', honoree: 'Dana', date: '2027-06-12', startTime: '15:00', startTimeSource: 'host',
  venue: 'Our backyard', venueCity: 'Silver Spring, MD', state: 'MD', venueKind: 'home', guestMode: 'count', guestCount: 30,
  totalBudget: 600, foodChoices: { food_style: 'Potluck' }, budget: [], vendors: [], guests: [], createdAt: '2026-08-16T14:00:00.000Z',
};
const SHOPPING = { date: '2027-06-05', id: 'shopping', what: 'the shopping list opens' };

test('the earliest open checklist step wins over a later ledger change', () => {
  const now = at(birthday.date, -300);
  const ev = { ...birthday, timeline: playbookChecklist(birthday, now).map((r) => ({ ...r, done: false })) };
  const first = Math.min(...ev.timeline.map((t) => taskDueInDays(t, ev, now)).filter((n) => n != null && n >= 0));
  const hz = nextPlanAttentionDate({ nextActions: [] }, SHOPPING, now, ev);
  expect(hz.days).toBe(first);
  expect(hz.date < SHOPPING.date).toBe(true);
  expect(hz.what).toMatch(/invite/i);
});

test('a ticked or handled step is not the next dated work', () => {
  const now = at(birthday.date, -300);
  const ev = { ...birthday, timeline: playbookChecklist(birthday, now).map((r) => ({ ...r, done: true })) };
  expect(nextPlanAttentionDate({ nextActions: [] }, SHOPPING, now, ev).id).toBe('shopping');
});

test('without the event it reads as before (plan rows and the ledger only)', () => {
  const now = at(birthday.date, -300);
  expect(nextPlanAttentionDate({ nextActions: [] }, SHOPPING, now).id).toBe('shopping');
});
