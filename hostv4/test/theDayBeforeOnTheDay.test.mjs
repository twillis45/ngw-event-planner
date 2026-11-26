// @vitest-environment jsdom
// THE DAY BEFORE (B2, 11/26/2026; the Thanksgiving workflow mockup, "Wednesday,
// November 25"). The evening before, The Day says "Tomorrow" and shows:
//   Tonight: the plan steps due today, ticked through lib/stepToggle (the same
//            tick as hostv2's checklist), the first as the main button;
//   Before tomorrow: what buildDayBeforePlan (hostv2's day-before plan) still
//            has open, one row each: the final count opens Guests here; the
//            store run, vendors to reconfirm, helpers and the rain backup open
//            in the current app until those pages are rebuilt.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage from '../src/DayPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = {
  id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host',
  createdAt: '2026-11-01T12:00:00Z', guestMode: 'count', guestCount: 12, venueKind: 'home', guests: [], budget: [],
  vendors: [{ id: 'v1', name: 'Rocco’s Rentals', category: 'Rentals', status: 'Booked', bookingStatus: 'Booked' }],
  timeline: [
    { id: 'a', task: 'Cook the make-ahead dishes', leadDays: -1, done: false },
    { id: 'b', task: 'Set the table', leadDays: -1, done: false },
    { id: 'c', task: 'Order the turkey', leadDays: -14, done: true },
  ],
};
const at = (d, hm) => new Date(d + 'T' + hm + ':00');
let host; let root; let saved; let opened;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => { saved = []; opened = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const mount = (ev, now) => act(() => root.render(createElement(DayPage, { ev, save, status: null, onRun: () => {}, onCounter: () => {}, onGuests: () => opened.push('guests'), now, date: 'Thursday, November 26' })));

describe('the evening before (4:00 PM, November 25)', () => {
  it('says Tomorrow, with tonight’s steps; the button ticks the first through the shared tick', () => {
    mount(TG, at('2026-11-25', '16:00'));
    expect(q('.sub').textContent).toBe('Tomorrow · guests at 3:00 PM');
    expect(qa('[data-tonight] [data-check]').map((r) => r.textContent)).toEqual(['Cook the make-ahead dishes', 'Set the table']);
    const btn = q('.action .primary');
    expect(btn.textContent).toBe('Done: cook the make-ahead dishes');
    act(() => btn.click());
    expect(saved[0].patch.timeline[0].done).toBe(true);
    expect(saved[0].msg).toMatch(/^Done: Cook the make-ahead dishes… — \d+ still open\./);
  });
  it('a long step names its title on the button, not the whole paragraph', () => {
    const long = { ...TG, timeline: [{ id: 'a', task: 'Cook the make-ahead dishes: pies, cranberry sauce, casseroles to ready-to-bake', leadDays: -1, done: false }] };
    mount(long, at('2026-11-25', '16:00'));
    expect(q('.action .primary').textContent).toBe('Done: cook the make-ahead dishes');
  });
  it('before tomorrow: the open parts of the day-before plan, one row each', () => {
    mount(TG, at('2026-11-25', '16:00'));
    const rows = qa('[data-before-tomorrow] [data-db-row]').map((r) => r.getAttribute('data-db-row'));
    expect(rows).toContain('shopping');
    expect(rows).toContain('vendors');
    // A vendor booked but not confirmed: reconfirm, in the current app for now.
    const v = q('[data-db-row="vendors"]');
    expect(v.textContent).toMatch(/Reconfirm your vendors/);
    expect(v.getAttribute('href')).toBe('../hostv2/');
  });
  it('an unsettled count opens Guests here', () => {
    mount({ ...TG, guestMode: 'list', guestCount: undefined, guests: [{ id: 'g1', name: 'Ann', rsvp: 'Pending' }] }, at('2026-11-25', '16:00'));
    const c = q('[data-db-row="count"]');
    expect(c.textContent).toMatch(/Final guest count/);
    act(() => c.click());
    expect(opened).toEqual(['guests']);
  });
  it('with tonight done, the button is gone and the steps say so', () => {
    mount({ ...TG, timeline: TG.timeline.map((t) => ({ ...t, done: true })) }, at('2026-11-25', '16:00'));
    expect(q('[data-tonight]')).toBe(null);
    expect(q('.action .primary')).toBe(null);
  });
  it('a week out it is not the day before: no Tonight, no Before tomorrow', () => {
    mount(TG, at('2026-11-19', '16:00'));
    expect(q('[data-tonight]')).toBe(null);
    expect(q('[data-before-tomorrow]')).toBe(null);
  });
});
