// Issue #100, D-10 (owner acceptance run, 11/5/2026). On an event created two
// days out, every checklist row read "N days past its window" on day 0: the
// host had done nothing wrong, the plan simply started inside the playbook's
// runway. taskIsOverdue already forgave those rows (taskWasReachable); the
// LABEL beside them did not, so the list blamed the host the policy had cleared.
//
// And sharing the invite never credited "Send the invite": taskEngine accepts
// `invitesSentAt` as proof, but nothing in the shipping shell ever wrote it.
import fs from 'fs';
import path from 'path';
import { taskDueLabel, taskIsOverdue, taskWindowClosed } from '../taskLead';
import { effectiveDone } from '../taskEngine';

const DAY = 86400000;
const now = new Date('2026-11-05T12:00:00');
const iso = (d) => d.toISOString().slice(0, 10);
const eventIn = (days, createdDaysAgo) => ({
  date: iso(new Date(now.getTime() + days * DAY)),
  createdAt: new Date(now.getTime() - createdDaysAgo * DAY).toISOString(),
});
const invite = { task: 'Send the invite with date, time, and a one-line "what we are playing"', leadDays: -7 };

describe('a window that closed before the plan existed is not "past its window"', () => {
  test('created 2 days out: the T-7 invite reads as due now, not 5 days late', () => {
    const ev = eventIn(2, 0);
    expect(taskDueLabel(invite, ev, now)).toBe('due now');
    expect(taskIsOverdue(invite, ev, now)).toBe(false);
  });
  test('the window is still closed — the row stays urgent, only the blame goes', () => {
    expect(taskWindowClosed(invite, eventIn(2, 0), now)).toBe(true);
  });
  test('created with time to spare and then missed: still past its window, with the count', () => {
    const ev = eventIn(2, 30);
    expect(taskDueLabel(invite, ev, now)).toBe('5 days past its window');
    expect(taskIsOverdue(invite, ev, now)).toBe(true);
  });
  test('no createdAt (legacy events): unchanged behavior', () => {
    expect(taskDueLabel(invite, { date: eventIn(2, 0).date }, now)).toBe('5 days past its window');
  });
});

describe('sharing the invite credits the invite task', () => {
  test('the task engine accepts invitesSentAt as proof', () => {
    expect(effectiveDone({ guests: [], invitesSentAt: now.toISOString() }, invite)).toBe(true);
  });
  test('the shipping shell writes invitesSentAt when the invite is shared', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    const share = shell.slice(shell.indexOf('const shareInviteLink = async'), shell.indexOf('const toggleTask ='));
    expect(share).toMatch(/invitesSentAt/);
  });
});
