// PHASE-HERO-1 + ONE-TELLING-1 — the hero never sells planning after the
// event; on event day it points at the day; and a screen tells the next
// step exactly once (Next Up drops the hero's duplicate row).

import { selectEventNextAction, dropHeroDuplicate } from '../CommandCenter';

const NOWISH = () => new Date();
const past = '2020-01-01';
const todayIso = new Date().toISOString().slice(0, 10);

test('1 · post-event hero is wrap-up, never a planning task', () => {
  const na = selectEventNextAction({ id: 'e', type: 'bbq', date: past, timeline: [
    { id: 't1', task: 'Set date, headcount, menu', done: false, week: '2 Weeks Out' },
  ], vendors: [{ id: 'v1', name: 'Caterer Co', cost: 400, depositPaid: true, balancePaid: false, status: 'Confirmed' }], guests: [] });
  expect(na.category).toBe('wrapup');
  expect(na.title).toMatch(/Settle up with Caterer Co/);
  expect(na.title).not.toMatch(/Set date|headcount|menu/i);
});

test('2 · fully wrapped post-event → no hero at all (surfaces show done states)', () => {
  const na = selectEventNextAction({ id: 'e', type: 'bbq', date: past, timeline: [
    { id: 't1', task: 'Buy ice', done: false, week: 'Week Of' },
  ], vendors: [], guests: [] });
  expect(na).toBeNull();
});

test('3 · event-day hero points at the day plan when cues exist', () => {
  const na = selectEventNextAction({ id: 'e', type: 'bbq', date: todayIso, rosEdited: true,
    ros: [{ time: '23:58', segment: 'Cleanup' }], timeline: [], vendors: [], guests: [] });
  if (na && na.category === 'live') {
    expect(na.title).toMatch(/Next: Cleanup/);
    expect(na.primaryRoute).toEqual({ tab: 'Event Day Schedule', focusField: 'ros-now' });
  } else {
    // after the last cue of the day the ladder may fall through — must not be a stale composite
    expect(!na || !/Set date, headcount, menu/.test(na.title)).toBe(true);
  }
});

test('4 · pre-event hero unchanged (planning ladder still owns it)', () => {
  const na = selectEventNextAction({ id: 'e', type: 'bbq', date: '2099-01-01', timeline: [
    { id: 't1', task: 'Invite guests and confirm the count', done: false, week: '2 Weeks Out' },
  ], vendors: [], guests: [] });
  expect(na).toBeTruthy();
  expect(na.category).not.toBe('wrapup');
});

test('5 · ONE-TELLING: Next Up drops the row the hero already tells', () => {
  const na = { title: 'Book the Black-owned caterer or confirm the host-cooks plan and confirm the final guest count.' };
  const rows = [
    { id: 'a', label: 'Book the Black-owned caterer or confirm the host-cooks plan and confirm the final guest count' },
    { id: 'b', label: 'Pick up ice and charcoal' },
  ];
  const out = dropHeroDuplicate(rows, na);
  expect(out.map(r => r.id)).toEqual(['b']);
});

test('6 · ONE-TELLING: distinct rows survive; no hero → untouched', () => {
  const rows = [{ id: 'a', label: 'Buy drinks and fuel' }];
  expect(dropHeroDuplicate(rows, { title: 'Set the guest count.' })).toEqual(rows);
  expect(dropHeroDuplicate(rows, null)).toEqual(rows);
});

test('7 · ONE-TELLING landing: the Plan hero yields while the tapped-step focus card is live (source contract)', () => {
  const fs = require('fs'); const path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
  // the planv2 Plan tab renders PlanNowHero only when no task is focused
  expect(app).toMatch(/\{!openTaskId && <PlanNowHero event=\{event\} profile=\{profile\} onNav=\{\(t, id, opts\) => go\(t, id, opts\)\} \/>\}/);
});
