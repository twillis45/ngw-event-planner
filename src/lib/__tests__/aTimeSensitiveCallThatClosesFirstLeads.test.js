// ─── A TIME-SENSITIVE CALL THAT CLOSES FIRST LEADS (owner ruling 11/23/2026) ─
//
// Thanksgiving walkthrough P1-7: "Is anyone staying overnight?" and "Sit-down or
// buffet?" wore "time-sensitive" in Calls to make while the hero moved on to
// shopping. The queue only ever raised a call once it was overdue, so a
// time-sensitive call reached the Calls list and never the hero.
//
// Ruling: a time-sensitive call is raised into the hero queue ONLY when its
// window closes strictly BEFORE the current top item's deadline. Ties and
// everything else keep the existing rulings (budget first, the closing shop,
// the menu panel, the calm brand-new event).
//
// One reader (lib/urgency) decides both the Calls list's tag and this raise.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { playbookDecisionBoard, ALL_PLAYBOOKS } from '../playbooks';
import { urgencyOf, actionDeadline, timeSensitiveCallToRaise } from '../urgency';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const ev = (type, days, extra) => ({
  id: `ts-${type}-${days}`, name: 'N', type, date: daysFromNow(days),
  guestMode: 'count', guestCount: 14, guestCountSource: 'host',
  venue: 'Our place', venueKind: 'home', venueAddress: '12 Oak St, Fort Washington, MD', venueCity: 'Fort Washington, MD',
  startTime: '15:00', startTimeSource: 'host', totalBudget: 400,
  budget: [], vendors: [], timeline: [], guests: [], foodChoices: {},
  // Created today: a window that closed before today was never reachable, so
  // the board files it ready (and time-sensitive on a short runway), not overdue.
  createdAt: new Date().toISOString(),
  ...(extra || {}),
});
const plan = (e) => eventPlan(e, buildExperienceContext(e, null, 1));

describe('the reader', () => {
  const head = { id: 'phase:shopping', dueInDays: 3 };
  test('(a) a time-sensitive call whose window closes strictly earlier is raised', () => {
    const rows = [{ id: 'x', status: 'ready', timeCritical: true, daysOut: 2 }];
    expect(timeSensitiveCallToRaise(rows, head, 9)).toBe(rows[0]);
  });
  test('(b) a tie or a later window is not', () => {
    expect(timeSensitiveCallToRaise([{ id: 'x', status: 'ready', timeCritical: true, daysOut: 3 }], head, 9)).toBe(null);
    expect(timeSensitiveCallToRaise([{ id: 'x', status: 'ready', timeCritical: true, daysOut: 4 }], head, 9)).toBe(null);
  });
  test('only time-sensitive calls count, and the earliest-closing one is chosen', () => {
    const rows = [
      { id: 'plain', status: 'ready', daysOut: -9 },
      { id: 'late', status: 'overdue', timeCritical: true, daysOut: -9 },
      { id: 'b', status: 'ready', timeCritical: true, daysOut: 1 },
      { id: 'a', status: 'ready', timeCritical: true, daysOut: -2 },
    ];
    expect(timeSensitiveCallToRaise(rows, head, 9).id).toBe('a');
    expect(urgencyOf(rows[1]).timeSensitive).toBe(false);   // overdue has its own raise
  });
  test('an undated head is due by the event day', () => {
    expect(actionDeadline({ dueInDays: null }, 9)).toBe(9);
    expect(actionDeadline({ dueInDays: 2 }, 9)).toBe(2);
  });
});

describe('across every playbook', () => {
  const RULED = new Set(['budget', 'date', 'guests', 'day']);
  const cases = [];
  for (const pb of ALL_PLAYBOOKS) for (const d of [3, 6, 9, 12]) cases.push(ev(pb.type, d));

  test('the head is a raised call only when it closes strictly before what it displaced; otherwise no time-sensitive call closes before the head', () => {
    const bad = [];
    let raisedSome = 0;
    for (const e of cases) {
      const acts = plan(e).nextActions;
      const head = acts[0];
      if (!head) continue;
      const rows = (playbookDecisionBoard(e) || {}).open || [];
      const dOut = Math.round((new Date(e.date) - Date.now()) / 864e5);
      if (head.timeSensitive) {
        raisedSome++;
        const id = String(head.id).replace(/^decision:/, '');
        const row = rows.find((r) => r.id === id) || rows.find((r) => Array.isArray(head.records) && head.records.includes(r.id));
        const u = urgencyOf(row);
        const displaced = acts[1];
        if (!u.timeSensitive) bad.push(`${e.id}: raised ${head.id} is not time-sensitive`);
        if (displaced && !(u.closesInDays < actionDeadline(displaced, dOut))) bad.push(`${e.id}: ${id} (${u.closesInDays}) does not close before ${displaced.id} (${actionDeadline(displaced, dOut)})`);
        continue;
      }
      if (head.level === 'critical' || RULED.has(head.domain) || head.closingWindow === true) continue;
      const deadline = actionDeadline(head, dOut);
      const earlier = rows.filter((r) => {
        const u = urgencyOf(r);
        const isHead = head.id === 'decision:' + r.id || (Array.isArray(head.records) && head.records.includes(r.id));
        return u.timeSensitive && !isHead && u.closesInDays < deadline;
      });
      if (earlier.length) bad.push(`${e.id}: ${earlier.map((r) => r.id).join(', ')} close before the head ${head.id} (${deadline}) and were not raised`);
    }
    expect(bad).toEqual([]);
    expect(raisedSome).toBeGreaterThan(0);
  });

  test('a raised call appears once in the queue', () => {
    const bad = [];
    for (const e of cases) {
      const acts = plan(e).nextActions;
      const ids = acts.map((a) => a.id);
      if (new Set(ids).size !== ids.length) bad.push(`${e.id}: ${ids.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('Thanksgiving, 9 to 12 days out (the walkthrough)', () => {
  // The menu is chosen, so the hero has moved on to the food and the shop.
  const picked = { hosting_model: 'Host cooks the whole meal', turkey_method: 'Roast it whole' };
  test.each([9, 10, 11, 12])('"Is anyone staying overnight?" surfaces in the hero at %i days out', (d) => {
    const e = ev('Thanksgiving Hosting', d, { foodChoices: picked });
    const row = ((playbookDecisionBoard(e) || {}).open || []).find((r) => r.id === 'overnight_guests');
    expect(urgencyOf(row).timeSensitive).toBe(true);
    const head = plan(e).nextActions[0];
    expect(head.id).toBe('decision:overnight_guests');
    expect(head.route).toEqual({ tab: 'Decisions', decisionId: 'overnight_guests' });
    expect(head.ask).toBe('Is anyone staying overnight?');
  });
  test('answered, it leaves the hero', () => {
    const e = ev('Thanksgiving Hosting', 10, { foodChoices: { ...picked, overnight_guests: 'No — everyone is local' } });
    expect(plan(e).nextActions.map((a) => a.id)).not.toContain('decision:overnight_guests');
  });
});
// The Calls list's tag reads urgencyOf too: pinned in oneNumberOneReader's
// shell check (a hostv2 file read, kept to the existing gate).
