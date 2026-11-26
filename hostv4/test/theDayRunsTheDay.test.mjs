// @vitest-environment jsdom
// THE DAY, BUILT (owner, 11/26/2026: "Start building the day-of screens", from
// the Thanksgiving mockups). One screen that changes with the hour, one button:
//   morning: what's up first, then the short day-of list; the button checks the
//            first open check;
//   under way: "Now" and what's next; the button finishes the step;
//   evening: steps the day moved past fold into "Earlier today · N" with "Mark
//            them done"; the sober-ride check comes back; help is at the top.
// Plus Today's run (every step, one line each) and counter mode. Every write is
// a lib/dayOfEdits edit, the fields hostv2's day view writes.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage, { RunPage, CounterMode } from '../src/DayPage.jsx';
import { todaysRos } from '@app/lib/dayOfEdits';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = { id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], vendors: [], timeline: [] };
const at = (d, hm) => new Date(d + 'T' + hm + ':00');
let host; let root; let saved;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => { saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const mount = (C, props) => act(() => root.render(createElement(C, { ev: TG, save, status: null, onRun: () => {}, onCounter: () => {}, ...props })));
const text = () => host.textContent.replace(/\s+/g, ' ');

describe('the morning of (7:30 AM)', () => {
  it('up first, then the short list; the button checks the first open check', () => {
    mount(DayPage, { now: at('2026-11-26', '07:30') });
    expect(q('[data-now]').textContent).toMatch(/Up first · 9:00 AM/);
    expect(q('[data-dayof] h3').textContent).toBe('Before guests arrive · 0 of 10');
    expect(qa('[data-dayof] [data-check]').length).toBe(3);
    expect(q('[data-dayof-more]').textContent).toMatch(/7 more/);
    const btn = q('.action .primary');
    expect(btn.textContent).toBe('Check off: the turkey is fully thawed');
    act(() => btn.click());
    expect(saved[0].patch).toEqual({ safetyChecked: { thaw: true } });
  });
  it('a check’s detail is one tap down', () => {
    mount(DayPage, { now: at('2026-11-26', '07:30') });
    act(() => q('[data-check="thaw"] [data-detail]').click());
    expect(q('[role="dialog"]').textContent).toMatch(/No ice in the cavity/);
  });
});

describe('under way (10:40 AM)', () => {
  it('now and next; the button finishes the step on rosDone', () => {
    mount(DayPage, { now: at('2026-11-26', '10:40') });
    expect(q('[data-now]').textContent).toMatch(/Now · since 10:30 AM/);
    expect(q('[data-now]').textContent).toMatch(/Next at 12:00 PM/);
    const btn = q('.action .primary');
    expect(btn.textContent).toBe('Done, what’s next');
    act(() => btn.click());
    const id = todaysRos(TG, at('2026-11-26', '10:40'))[1].id;
    expect(saved[0].patch.rosDone).toEqual({ [id]: true });
  });
  it('the list stays until guests are due, folded to its count', () => {
    mount(DayPage, { now: at('2026-11-26', '10:40') });
    expect(q('[data-dayof-row]').textContent).toMatch(/Before guests arrive/);
    expect(q('[data-dayof-row]').textContent).toMatch(/10 to go/);
  });
});

describe('the evening (8:10 PM, nothing ticked all day)', () => {
  it('earlier steps fold away and can be marked done at once', () => {
    mount(DayPage, { now: at('2026-11-26', '20:10') });
    const row = q('[data-earlier]');
    expect(row.textContent).toMatch(/Earlier today · 12 steps/);
    act(() => row.querySelector('button').click());
    expect(Object.keys(saved[0].patch.rosDone).length).toBe(12);
    expect(text()).not.toMatch(/Behind/i);
  });
  it('the sober-ride check comes back; help is the first row; the morning list is gone', () => {
    mount(DayPage, { now: at('2026-11-26', '20:10') });
    expect(q('[data-rides]').textContent).toMatch(/Everyone has a sober way home/);
    const rows = qa('main [data-help], main [data-now]');
    expect(rows[0].hasAttribute('data-help')).toBe(true);
    expect(q('[data-dayof]')).toBeNull();
  });
  it('If something goes wrong opens the guide', () => {
    mount(DayPage, { now: at('2026-11-26', '20:10') });
    act(() => q('[data-help]').click());
    expect(q('[role="dialog"]').textContent).toMatch(/Grease or grill fire/);
  });
});

describe('before and after the day', () => {
  it('the day before: the run and the list, no button pressing on a step', () => {
    mount(DayPage, { now: at('2026-11-25', '16:00') });
    expect(text()).toMatch(/The day’s run/);
    expect(q('[data-dayof] h3').textContent).toMatch(/Before guests arrive/);
    expect(q('.action .primary')).toBeNull();
  });
  it('the day after: says so, and where Afterward is for now', () => {
    mount(DayPage, { now: at('2026-11-27', '10:00') });
    expect(text()).toMatch(/That day is done/);
    expect(q('a[href="../hostv2/"]')).not.toBeNull();
  });
});

describe('Today’s run', () => {
  it('every step, one line each: done, now, later', () => {
    mount(RunPage, { now: at('2026-11-26', '10:40'), ev: { ...TG, rosDone: { [todaysRos(TG, at('2026-11-26', '10:40'))[0].id]: true } }, nav: null });
    const r = qa('[data-run] [data-step]');
    expect(r.length).toBe(14);
    expect(r[0].dataset.state).toBe('done');
    expect(r[1].dataset.state).toBe('now');
    expect(r[2].dataset.state).toBe('later');
    expect(r[1].textContent).toMatch(/10:30 AM/);
  });
  it('a step the day moved past without a tick is quiet “past”, never “Behind”', () => {
    mount(RunPage, { now: at('2026-11-26', '10:40'), nav: null });
    const r = qa('[data-run] [data-step]');
    expect(r[0].dataset.state).toBe('past');
    expect(host.textContent).not.toMatch(/Behind/i);
  });
});

describe('counter mode', () => {
  it('the step in large type, the time to the next, one big Done', () => {
    mount(CounterMode, { now: at('2026-11-26', '10:40'), onLeave: () => {} });
    expect(q('[data-counter] [data-big]').textContent).toMatch(/Baste and rotate the bird/);
    expect(q('[data-counter] [data-in]').textContent).toBe('In 1 hr 20 min');
    const done = q('[data-counter] .primary');
    expect(done.textContent).toBe('Done, what’s next');
    act(() => done.click());
    expect(saved[0].patch.rosDone).toBeTruthy();
  });
});

// THE DAY'S WEATHER (owner, 11/26/2026: "Yes build the weather line and rain
// actions"). The same lib/weather dayWeather hostv2's day view reads.
describe('the day’s weather', () => {
  const rain = { date: '2026-11-26', conditions: 'moderate rain', icon: '10d', precipitation: 100, temp: { min: 48, max: 54 } };
  const clear = { date: '2026-11-26', conditions: 'few clouds', icon: '02d', precipitation: 0, temp: { min: 34, max: 62 } };
  it('rain: the line, the wet-coats check, and a note to guests', () => {
    mount(DayPage, { now: at('2026-11-26', '10:40'), forecast: rain });
    const card = q('[data-day-weather="rain"]');
    expect(card.textContent).toMatch(/Moderate rain · 48°–54°F · 100% chance of rain or snow/);
    act(() => card.querySelector('[data-check="wx-coats"] .tickbtn').click());
    expect(saved[0].patch).toEqual({ safetyChecked: { 'wx-coats': true } });
    act(() => card.querySelector('[data-wx-note]').click());
    expect(q('[role="dialog"]').textContent).toMatch(/the forecast shows rain\. Leave a little extra time to get here, and bring an umbrella\./);
  });
  it('a clear day: the line alone', () => {
    mount(DayPage, { now: at('2026-11-26', '07:30'), forecast: clear });
    expect(q('[data-day-weather="clear"]').textContent).toMatch(/Few clouds · 34°–62°F/);
    expect(q('[data-day-weather] [data-check]')).toBeNull();
  });
  it('no forecast, no weather card', () => {
    mount(DayPage, { now: at('2026-11-26', '07:30'), forecast: null });
    expect(q('[data-day-weather]')).toBeNull();
  });
});
