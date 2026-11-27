// ─── THE GUEST PATH IS SHARED (owner, 11/27/2026: "Guests design approved,
// build it") ──────────────────────────────────────────────────────────────────
// The step-by-step Guests flow designed in hostv4 continues in hostv2. Its rules
// (the questions still to ask, the five steps, the one bottom button, the line
// that sums up the answers) live in one place both shells read, never two.
//
// And the answers line no longer says "about —" (the approved render, a plan by
// name for 14): the count comes from the host's estimate, else the planned count,
// and with neither the clause is left out rather than printed as a dash.
import { guestPath, guestQuestions, answersLine, guestPathState } from '../guestPath';

const BASE = {
  id: 'p1', name: 'Thanksgiving at ours', type: 'Thanksgiving', date: '2099-12-17',
  guestMode: 'list', guestCount: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Rosa Lane' }, { id: 'g2', name: 'Marcus Bell' }],
};

describe('the answers line says what was answered, never a dash', () => {
  test('a plan by name for 14 with no estimate reads "about 14"', () => {
    const line = answersLine({ ...BASE, plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2099-12-07' });
    expect(line).toMatch(/^about 14 · by name · \+1s welcome · kids welcome · replies by Dec 7$/);
    expect(line).not.toContain('—');
  });
  test('the host’s estimate wins over the planned count', () => {
    expect(answersLine({ ...BASE, guestEstimate: 20 })).toMatch(/^about 20 · /);
  });
  test('with no number at all, the count clause is left out', () => {
    const line = answersLine({ ...BASE, guestCount: undefined, guestCountSource: undefined });
    expect(line).not.toMatch(/about/);
    expect(line).not.toContain('—');
    expect(line).toMatch(/^by name · /);
  });
});

describe('the questions and the path come from one place', () => {
  test('a new plan by name asks the rules, then the reply-by date', () => {
    expect(guestQuestions(BASE)).toEqual(['plus', 'kids', 'replyBy']);
  });
  test('guestPathState reads the plan the way the path needs it', () => {
    const s = guestPathState({ ...BASE, plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-07' }, { now: new Date('2099-11-26T12:00:00') });
    expect(s).toMatchObject({ qs: [], byName: true, named: 2, sent: false, replyByPassed: false, locked: 0, deadline: '2099-12-07' });
    const p = guestPath(s);
    expect(p.current).toBe('invite');
    expect(p.action).toMatchObject({ kind: 'invite', label: 'Review your invite' });
    expect(p.steps.map((x) => x.state)).toEqual(['done', 'done', 'now', 'later', 'later']);
  });
  test('the reply-by date passes in the phone’s own day', () => {
    const ev = { ...BASE, plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-07', invitesSentAt: '2099-11-20T10:00:00Z' };
    expect(guestPathState(ev, { now: new Date('2099-12-07T23:00:00') }).replyByPassed).toBe(false);
    expect(guestPathState(ev, { now: new Date('2099-12-08T00:30:00') }).replyByPassed).toBe(true);
  });
});
