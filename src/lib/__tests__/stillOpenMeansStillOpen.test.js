// STILL OPEN MEANS STILL OPEN (owner, Thanksgiving morning 11/26/2026: "App is
// lying somewhere", two screenshots of his own plan). The Day said "4 things
// still open"; the checklist said "19 still open · 4 already handled by your
// plan" with "Early November · 7 left" and "Assign every dish — Thu, Nov 12 · due
// now". Measured: the banner counted taskIsOverdue, which (rightly, for blame)
// drops a step that was already due when the plan was made — so "Assign every
// dish", still undone, vanished from "still open". And the checklist's 19
// included the 4 the plan already handles.
//   - The banner now counts every step past its window that is not done, not
//     handled by the plan and not snoozed (taskIsOpenPastWindow), reachable or
//     not. taskIsOverdue is that plus "was reachable", unchanged.
//   - The checklist's "still open" no longer counts what the plan handles.
import { playbookChecklist } from '../playbooks';
import { computeDayAlerts } from '../dayAlerts';
import { taskIsOverdue, taskIsOpenPastWindow, taskDueInDays } from '../taskLead';

const iso = new Date().toISOString().slice(0, 10);
const plan = (createdAt) => {
  const ev = { id: 'cust-tg', type: 'Thanksgiving Hosting', name: 'Thanksgiving', date: iso, startTime: '14:00', guestEstimate: 7, guestMode: 'list', guests: [], createdAt };
  ev.timeline = (playbookChecklist(ev) || []).map((r) => ({ ...r }));
  ev.timeline.slice(0, 7).forEach((t) => { t.done = true; });
  return ev;
};
const banner = (ev) => { const a = (computeDayAlerts(ev) || []).find((x) => x.id === 'overdue-tasks'); return a ? Number(/(\d+)/.exec(a.headline)[1]) : 0; };
const pastWindowOpen = (ev) => ev.timeline.filter((t) => taskIsOpenPastWindow(t, ev)).length;

describe('the day’s "still open" counts every unfinished step past its window', () => {
  it('a plan made late still shows the steps it never had time for', () => {
    const late = new Date(Date.now() - 6 * 864e5).toISOString();
    const ev = plan(late);
    const blame = ev.timeline.filter((t) => taskIsOverdue(t, ev)).length;
    expect(pastWindowOpen(ev)).toBeGreaterThan(blame);   // the gap the owner saw
    expect(banner(ev)).toBe(pastWindowOpen(ev));
  });
  it('a plan made in time: open past window and overdue are the same steps', () => {
    const ev = plan(new Date(Date.now() - 60 * 864e5).toISOString());
    expect(pastWindowOpen(ev)).toBe(ev.timeline.filter((t) => taskIsOverdue(t, ev)).length);
  });
  it('overdue is open-past-window AND reachable, nothing else', () => {
    const ev = plan(new Date(Date.now() - 6 * 864e5).toISOString());
    for (const t of ev.timeline) {
      if (taskIsOverdue(t, ev)) expect(taskIsOpenPastWindow(t, ev)).toBe(true);
    }
  });
  it('a snoozed step stays out of both', () => {
    const ev = plan(undefined);
    const t = ev.timeline.find((x) => !x.done && taskDueInDays(x, ev) < 0);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    t.snoozedUntil = tomorrow;
    expect(taskIsOpenPastWindow(t, ev)).toBe(false);
  });
});

// The checklist wording half lives in hostv2/test/stillOpenMeansStillOpen.test.mjs
// (hostv2 source is read from hostv2's own tests; textGateRatchet).
