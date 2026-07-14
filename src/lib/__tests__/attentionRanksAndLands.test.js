// The three criticals from the attention audit.
//
// 1. THE RANKING FUNCTION DID NOT EXIST. The "urgent decision" tier — the one the engine
//    stamps `critical` — selected via:
//        decisions.find(x => x.urgency === 'URGENT')
//     || decisions.find(x => x.overdue && x.overdueDays >= 14)
//     || decisions[0]
//    ...and NONE of `urgency` / `overdue` / `overdueDays` were ever set on the object.
//    `od` was computed one line above the return and thrown away. Both find()s always
//    missed, so it ALWAYS fell to decisions[0] — and decisions[0] was not "the worst one"
//    either, because the sort was `parseInt(b.dueLabel) - parseInt(a.dueLabel)` over PROSE
//    ("Overdue 3d"). parseInt of that is NaN, every comparison was NaN, and the array kept
//    its original event.timeline insertion order.
//
//    Net: the app's #1 "critical" item was whichever seeded task happened to sit earliest
//    in the array. A task 60 days overdue lost to one 1 day overdue if the seed listed it
//    later. And `overdueDays` being always 0 meant the host was never told how late it was.

import { eventPlan, getEventReadiness } from '../../CommandCenter';
import { classifyLevel, confidenceFor } from '../confidenceGrammar';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Two overdue tasks. The MILDLY late one is listed FIRST — the exact shape that used to
// win by array position.
const evWithDecisions = () => ({
  id: 'rank-1', type: 'Crab Feast', name: 'Feast', date: iso(2),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1200,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  vendors: [], guests: [],
  timeline: [
    { id: 'mild', task: 'Buy the Old Bay', leadDays: -3, done: false },   // due in -1 → 1 day late
    { id: 'bad',  task: 'Pre-order the crabs', leadDays: -60, done: false }, // 58 days late
  ],
});

describe('the urgent-decision tier actually ranks', () => {
  test('THE REGRESSION: the most-overdue task wins, not the first one in the array', () => {
    const top = eventPlan(evWithDecisions()).nextActions[0];
    expect(top).toBeTruthy();
    // Before: 'mild' won purely because it was listed first (NaN sort → insertion order).
    expect(JSON.stringify(top)).toMatch(/crabs/i);
    expect(JSON.stringify(top)).not.toMatch(/Old Bay/i);
  });

  test('the host is told HOW late it is — overdueDays was always 0', () => {
    const top = eventPlan(evWithDecisions()).nextActions[0];
    const blob = JSON.stringify(top);
    // The consequence copy reads `urgent.overdueDays`, which was permanently 0, so it
    // always took the false branch and never named a number.
    expect(blob).toMatch(/\d+\s*day/i);
  });
});

describe('missing data is not a risk', () => {
  test('an empty checklist reads UNKNOWN, not AT_RISK "No tasks"', () => {
    const ev = { id: 'e', type: 'Crab Feast', date: iso(20), guestCount: 10, timeline: [], vendors: [], guests: [] };
    const r = getEventReadiness(ev);
    // Was AT_RISK/'No tasks' — which fed the ladder and produced a red
    // "Catch up on overdue planning tasks. No tasks" about work that does not exist.
    expect(r.timeline.status).toBe('UNKNOWN');
  });
});

describe('the steel tier renders as itself', () => {
  // There was no .p-steel class, so confidenceGrammar's FOURTH tier collapsed into amber:
  // an empty field ("Not set yet") was painted the same colour as a slipping deadline.
  test('an empty dimension is steel — not amber, not red, not green', () => {
    for (const note of ['No vendors yet', 'No budget set', 'No tasks yet']) {
      const c = confidenceFor({ statusLabel: 'AT RISK', note }, 'host');
      expect({ note, tier: c.tier }).toEqual({ note, tier: 'steel' });
    }
  });

  test('a REAL risk — one with data behind it — stays red', () => {
    const c = confidenceFor({ statusLabel: 'AT RISK', note: '3 overdue' }, 'host');
    expect(c.tier).toBe('red');
    expect(classifyLevel({ statusLabel: 'AT RISK', note: '3 overdue' })).toBe('AT_RISK');
  });

  test('on track with data is green', () => {
    expect(confidenceFor({ statusLabel: 'ON TRACK', note: '5 confirmed' }, 'host').tier).toBe('green');
  });
});
