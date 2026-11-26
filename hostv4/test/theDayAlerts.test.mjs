// @vitest-environment jsdom
// B5 WEATHER AND ALERTS (11/26/2026). hostv4's The Day gets hostv2's two engines,
// unchanged:
//   · alerts (lib/dayAlerts computeDayAlerts), any day of the event: one line
//     above Now, the most urgent first, the tier in a word ("Can’t wait",
//     "Watch"), "N more" when there are others; a tap opens them all, each
//     with its move and where to act (Guests here; the rest in the current app).
//     The "next up" heads-up is not repeated: the Now card already says it.
//   · outdoor weather (lib/weather weatherImpactByEventPhase): the impact line
//     in the weather card, said with the rain plan in mind (rainAwareSummary),
//     and a way to set the rain plan when there is none.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage from '../src/DayPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const NOW = new Date('2026-11-26T10:00:00');
const TG = {
  id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host',
  createdAt: '2026-11-20T12:00:00Z', guestEstimate: 14, venueKind: 'home', vendors: [], budget: [],
  guests: [{ id: 'g1', name: 'Ann Lee', rsvp: 'Pending' }, { id: 'g2', name: 'Bo Reed', rsvp: 'Yes', needs: 'Tree nut allergy' }],
  guestMode: 'list',
  timeline: [{ id: 'a', task: 'Order the turkey', leadDays: -14, done: false }, { id: 'b', task: 'Confirm the count', leadDays: -3, done: false }],
};
const RAIN = { date: '2026-11-26', conditions: 'moderate rain', icon: '10d', precipitation: 80, risk: 'high', summary: 'Rain likely on your event day', temp: { min: 48, max: 54 } };
let host; let root; let opened;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  opened = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const mount = (ev, extra = {}) => act(() => root.render(createElement(DayPage, { ev, save: () => true, status: null, onRun: () => {}, onCounter: () => {}, onGuests: () => opened.push('guests'), now: NOW, forecast: null, ...extra })));

describe('alerts on the day', () => {
  it('one line above Now: the most urgent, its tier in a word, and how many more', () => {
    mount(TG);
    const line = q('[data-alert]');
    expect(line).not.toBe(null);
    expect(line.compareDocumentPosition(q('[data-now]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.textContent).toMatch(/^Watch/);
    expect(line.textContent).toMatch(/\d+ more/);
    expect(line.textContent).not.toMatch(/Next up at/);
  });

  it('a tap opens them all with their moves; a guest alert opens Guests here', () => {
    mount(TG);
    act(() => q('[data-alert]').click());
    const rows = qa('[data-alert-row]');
    expect(rows.length).toBeGreaterThan(1);
    const rsvp = rows.find((r) => r.getAttribute('data-alert-row') === 'rsvp-pending');
    expect(rsvp.textContent).toMatch(/haven’t replied|not replied|hasn’t replied/i);
    act(() => rsvp.querySelector('[data-alert-go]').click());
    expect(opened).toEqual(['guests']);
    const steps = rows.find((r) => r.getAttribute('data-alert-row') === 'overdue-tasks');
    expect(steps.querySelector('[data-alert-go]').getAttribute('href')).toBe('../hostv2/');
  });

  it('not on a day before the event', () => {
    mount({ ...TG, date: '2026-11-28' });
    expect(q('[data-alert]')).toBe(null);
  });
});

describe('outdoor weather', () => {
  it('an outdoor event with rain and no plan: the impact line, and a way to set the plan', () => {
    mount({ ...TG, indoorOutdoor: 'outdoor' }, { forecast: RAIN });
    const w = q('[data-day-weather]');
    expect(w.querySelector('[data-wx-impact]').textContent).toMatch(/rain/i);
    expect(w.querySelector('[data-wx-rainplan]').getAttribute('href')).toBe('../hostv2/');
  });
  it('with a rain plan saved, no prompt to set one', () => {
    mount({ ...TG, indoorOutdoor: 'outdoor', rainPlan: 'Into the garage' }, { forecast: RAIN });
    expect(q('[data-wx-impact]')).not.toBe(null);
    expect(q('[data-wx-rainplan]')).toBe(null);
  });
  it('an indoor event keeps the arrivals card only', () => {
    mount(TG, { forecast: RAIN });
    expect(q('[data-wx-impact]')).toBe(null);
  });
});
