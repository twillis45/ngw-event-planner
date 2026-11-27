// @vitest-environment jsdom
// REMINDERS IN YOUR CALENDAR (owner, 11/26/2026: "As rendered is fine"). The Day
// has one row beside the run that opens a sheet: 10 minutes before (default) or
// at the time, the first reminders in time order, and "Add N reminders", which
// hands the phone one calendar file (lib/planCalendar dayRemindersIcs) with an
// alarm on each. Nothing is saved to the plan.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage from '../src/DayPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = {
  id: 'tg', name: 'Thanksgiving at ours', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], timeline: [],
  vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '09:30' }],
};
const at = (hm) => new Date('2026-11-26T' + hm + ':00');
let host; let root; let saved; let blobs;
beforeEach(() => {
  saved = []; blobs = [];
  globalThis.URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:x'; });
  globalThis.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); // jsdom has no download
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const read = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(b); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const mount = (now) => act(() => root.render(createElement(DayPage, { ev: TG, save: (ed) => { saved.push(ed); return true; }, status: null, onRun: () => {}, onCounter: () => {}, now, forecast: null })));

describe('reminders in your calendar', () => {
  it('a row beside the run, on the morning of the day', () => {
    mount(at('08:00'));
    expect(q('[data-open-remind]').textContent).toMatch(/Reminders in your calendar/);
  });
  it('the sheet: 10 minutes before by default, reminders in time order, the count on the button', () => {
    mount(at('08:00'));
    act(() => q('[data-open-remind]').click());
    expect(q('[data-remind-lead][aria-pressed="true"]').textContent).toBe('10 minutes before');
    const rows = qa('[data-remind-row]').map((r) => r.textContent);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((t) => /9:30 AM.*Bay Catering due/.test(t))).toBe(true);
    expect(q('[data-remind-add]').textContent).toMatch(/^Add \d+ reminders?$/);
  });
  it('"Add" hands over one calendar file with an alarm per reminder, and saves nothing', async () => {
    mount(at('08:00'));
    act(() => q('[data-open-remind]').click());
    act(() => qa('[data-remind-lead]').find((b) => b.textContent === 'At the time').click());
    act(() => q('[data-remind-add]').click());
    expect(blobs.length).toBe(1);
    const text = await read(blobs[0]);
    const n = Number(q('[data-remind-add]').textContent.match(/\d+/)[0]);
    expect((text.match(/BEGIN:VALARM/g) || []).length).toBe(n);
    expect(text).toContain('TRIGGER:PT0M');
    expect(saved).toEqual([]);
  });
  it('what has already passed is left out (owner, 11/27/2026), on the sheet and in the file', async () => {
    mount(at('10:00'));
    act(() => q('[data-open-remind]').click());
    const rows = qa('[data-remind-row]').map((r) => r.textContent);
    expect(rows.some((t) => /Bay Catering due/.test(t))).toBe(false);
    act(() => q('[data-remind-add]').click());
    const text = await read(blobs[0]);
    expect(text).not.toContain('Bay Catering due');
    const n = Number(q('[data-remind-add]').textContent.match(/\d+/)[0]);
    expect((text.match(/BEGIN:VEVENT/g) || []).length).toBe(n);
  });
});
