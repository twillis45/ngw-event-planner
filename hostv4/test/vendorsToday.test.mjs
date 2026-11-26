// @vitest-environment jsdom
// VENDORS TODAY (B9, 11/26/2026). On the day, The Day lists the booked vendors
// with an arrival time (lib/dayOfEdits vendorsToday), each with their own answer
// through the brief link (lib/api/vendorBrief, faked here):
//   · the tick marks them here (vendorArrivalEdit, the field the alerts read);
//   · the name opens their sheet: Here, Running late, Call, and Send the details
//     (in the current app, where the brief and its pass live);
//   · a "hasn't arrived" alert takes her to this list.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

const api = vi.hoisted(() => ({ rows: [] }));
vi.mock('@app/lib/api/vendorBrief', async (orig) => ({ ...(await orig()), isVendorBriefApiConfigured: () => true, fetchVendorConfirmations: async () => api.rows }));
const { default: DayPage } = await import('../src/DayPage.jsx');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const NOW = new Date('2026-11-26T10:00:00');
const TG = {
  id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], budget: [], timeline: [],
  vendors: [
    { id: 'v1', name: 'Bay Catering', category: 'Catering', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '09:30', phone: '(240) 555-0199' },
    { id: 'v2', name: 'Rocco’s Rentals', category: 'Rentals', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '13:00' },
  ],
};
let host; let root; let saved;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); saved = []; api.rows = [{ vendor_id: 'v2', state: 'confirmed' }]; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const mount = async (ev) => { act(() => root.render(createElement(DayPage, { ev, save, status: null, onRun: () => {}, onCounter: () => {}, now: NOW, forecast: null }))); await flush(); };

describe('vendors today', () => {
  it('earliest first, each with their time and own answer, and a call button', async () => {
    await mount(TG);
    const rows = qa('[data-vendor-row]');
    expect(rows.map((r) => r.getAttribute('data-vendor-row'))).toEqual(['v1', 'v2']);
    expect(rows[0].textContent).toMatch(/Bay Catering.*9:30 AM/);
    expect(rows[1].textContent).toMatch(/Confirmed/);
    expect(q('[data-vendor-row="v1"] [data-vendor-call]').getAttribute('href')).toBe('tel:2405550199');
  });
  it('the tick marks them here through the shared edit', async () => {
    await mount(TG);
    act(() => q('[data-vendor-row="v1"] [data-tick]').click());
    expect(saved[0].patch.vendors.find((v) => v.id === 'v1').arrivalStatus).toBe('arrived');
    expect(saved[0].msg).toBe('Bay Catering is here.');
  });
  it('the name opens their sheet: running late, and send the details in the current app', async () => {
    await mount(TG);
    act(() => q('[data-vendor-row="v2"] [data-vendor-open]').click());
    act(() => q('[data-vendor-late]').click());
    expect(saved[0].patch.vendors.find((v) => v.id === 'v2').arrivalStatus).toBe('delayed');
    act(() => q('[data-vendor-row="v2"] [data-vendor-open]').click());
    expect(q('[data-vendor-brief]').getAttribute('href')).toBe('../hostv2/');
  });
  it('a "hasn’t arrived" alert takes her to the list', async () => {
    await mount(TG);
    act(() => q('[data-alert]').click());
    const go = q('[data-alert-row="ov-v1"] [data-alert-go]');
    expect(go.tagName).toBe('BUTTON');
    act(() => go.click());
    expect(q('[role="dialog"]')).toBe(null);
  });
  it('no vendors with a time: no section', async () => {
    await mount({ ...TG, vendors: [] });
    expect(q('[data-vendors-today]')).toBe(null);
  });
});
