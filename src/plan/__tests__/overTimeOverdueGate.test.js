// ─── The last two dead overdue gates are alive ────────────────────────────────
//
// 2026-07-15 wave-5 over-time fix. ChecklistGenerator and TimelineBuilder were the
// final two surfaces still running the ORIGINAL never-overdue bug: private TitleCase
// PHASE_OFFSET tables ('Week Of', '2 Weeks Out') membership-checked against playbook
// tasks' sentence-case prose ('Week of') — never a member, so the checklist's OVERDUE
// pill / "N need a look" count and the timeline's DUE UPCOMING badge could never fire.
// Both now delegate to lib/taskLead (same conversion as DecisionApprovalCenter in
// 9a92d90). These tests drive the exact derivations the surfaces render:
// ChecklistGenerator's overdue count (line ~260) and row pill, TimelineBuilder's
// taskStatus badge — seeded from a REAL playbook (crab feast, authored T-5d pre-order).

import { isOverdue } from '../ChecklistGenerator';
import { taskStatus } from '../TimelineBuilder';
import { playbookChecklist } from '../../lib/playbooks';
import { taskDueInDays } from '../../lib/taskLead';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };

// A crab feast tomorrow, planned for two months — the T-5d "Pre-order the crabs"
// task is 4 days past its window, and the host had every chance to do it.
const staleEvent = () => ({
  id: 'e1', type: 'Crab Feast', date: inDays(1), createdAt: inDays(-60) + 'T12:00:00.000Z',
  guestCount: 18, guestMode: 'count',
});

const preorderOf = (ev) =>
  (playbookChecklist(ev) || []).find((t) => /pre-?order the crabs/i.test(t.task || ''));

describe('playbook-seeded fixture: a T-5d task, 4 days past its window', () => {
  test('the fixture is what it claims: T-5d, 4 days past', () => {
    const ev = staleEvent();
    const preorder = preorderOf(ev);
    expect(preorder).toBeTruthy();
    expect(taskDueInDays(preorder, ev)).toBe(-4);
  });

  test('ChecklistGenerator counts it — the overdue derivation the stats row renders', () => {
    const ev = staleEvent();
    const tasks = playbookChecklist(ev) || [];
    expect(isOverdue(preorderOf(ev), ev)).toBe(true);
    // Exactly the surface's own count expression (ChecklistGenerator line ~260).
    const overdue = tasks.filter((t) => !t.done && isOverdue(t, ev)).length;
    expect(overdue).toBeGreaterThanOrEqual(1);
  });

  test('TimelineBuilder badges it — DUE UPCOMING, not the eternal PENDING', () => {
    const ev = staleEvent();
    const s = taskStatus(preorderOf(ev), ev);
    expect(s.label).toBe('DUE UPCOMING');
  });

  test('done wins: a completed task never wears the badge or the count', () => {
    const ev = staleEvent();
    const doneTask = { ...preorderOf(ev), done: true };
    expect(isOverdue(doneTask, ev)).toBe(false);
    expect(taskStatus(doneTask, ev).label).toBe('DONE');
  });
});

describe('legacy TitleCase tasks — the vocabulary the old tables DID hold still works', () => {
  const legacy = { id: 'x1', task: 'Book the hall', week: '2 Weeks Out', done: false };

  test('past its window on a 5-days-out event → overdue + badged', () => {
    const ev = { id: 'e2', type: 'Reunion', date: inDays(5), createdAt: inDays(-90) };
    expect(isOverdue(legacy, ev)).toBe(true);
    expect(taskStatus(legacy, ev).label).toBe('DUE UPCOMING');
  });

  test('still upcoming on a 30-days-out event → calm PENDING', () => {
    const ev = { id: 'e3', type: 'Reunion', date: inDays(30), createdAt: inDays(-90) };
    expect(isOverdue(legacy, ev)).toBe(false);
    expect(taskStatus(legacy, ev).label).toBe('PENDING');
  });
});

// Wave-6: the STORED timeline schema (playbookTimelineEntries — TitleCase near-term
// labels + positive offsetDays, NO leadDays) must clear the same gates. Wave-5 taught
// the surfaces to read leadDays/prose; these rows carried neither and stayed
// permanently PENDING. Full parity coverage lives in storedSchemaParity.test.js —
// this describe pins the surface exports on the raw vocabulary.
describe('stored-schema rows (TitleCase crunch-band labels + offsetDays) resolve', () => {
  const ev = () => ({ id: 'e4', type: 'Crab Feast', date: inDays(1), createdAt: inDays(-60) + 'T12:00:00.000Z' });

  test('offsetDays row: T-5d stored as { week: "5 Days Out", offsetDays: 5 } → overdue + badged', () => {
    const row = { id: 's1', task: 'Pre-order the crabs', week: '5 Days Out', offsetDays: 5, done: false };
    expect(isOverdue(row, ev())).toBe(true);
    expect(taskStatus(row, ev()).label).toBe('DUE UPCOMING');
  });

  test('label-only crunch-band rows (no offsetDays) resolve too', () => {
    for (const week of ['5 Days Out', '3 Weeks Out', '10 Days Out', '3 Days Out', 'Event Day']) {
      const row = { id: `s-${week}`, task: 'x', week, done: false };
      // On an event tomorrow with two months of runway, every one of these windows
      // (leads -21 … -3) has closed; 'Event Day' (lead 0) is still ahead.
      const expected = week !== 'Event Day';
      expect({ week, overdue: isOverdue(row, ev()) }).toEqual({ week, overdue: expected });
    }
  });

  test('a stored row still ahead of its window stays calm', () => {
    const future = { id: 's2', task: 'Lock headcount', week: '3 Days Out', offsetDays: 3, done: false };
    const ei = { id: 'e5', type: 'Crab Feast', date: inDays(10), createdAt: inDays(-60) };
    expect(isOverdue(future, ei)).toBe(false);
    expect(taskStatus(future, ei).label).toBe('PENDING');
  });
});

describe('the guards travel with the conversion', () => {
  test('createdAt reachability: an event created yesterday for tomorrow is a tight timeline, not a late host', () => {
    const ev = { ...staleEvent(), createdAt: inDays(-1) + 'T12:00:00.000Z' }; // never had 5 days of runway
    const preorder = preorderOf(ev);
    expect(isOverdue(preorder, ev)).toBe(false);
    expect(taskStatus(preorder, ev).label).toBe('PENDING');
  });

  test('an Extended (snoozed) decision does not flash OVERDUE in the checklist while hidden from the board', () => {
    const ev = staleEvent();
    const preorder = preorderOf(ev);
    expect(isOverdue({ ...preorder, snoozedUntil: inDays(2) }, ev)).toBe(false);
    // …and a lapsed snooze stops suppressing.
    expect(isOverdue({ ...preorder, snoozedUntil: inDays(-1) }, ev)).toBe(true);
  });
});
