// @vitest-environment jsdom
// B4 TELL YOUR GUESTS (11/26/2026). From The Day (the day before's "Before
// tomorrow", and the morning of), one sheet with hostv2's own guest drafts:
//   · Send the details: draftGuestBrief, with the reply link; nothing goes out
//     without that link (sendKit useSendReady, the invite's own check);
//   · Parking note: draftParkingInstructions, when there is a place;
//   · Post it to everyone's invite: Updates.
// And (live check of 31b2dd20, 834 wide): every sheet closes on Escape.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

const ready = vi.hoisted(() => ({ v: { acct: { state: 'out', email: '' }, link: { state: 'idle', url: '' }, ready: false, check: () => {} } }));
vi.mock('../src/sendKit.jsx', async (orig) => ({ ...(await orig()), useSendReady: () => ready.v }));
const { default: DayPage } = await import('../src/DayPage.jsx');
const { draftGuestBrief, draftParkingInstructions } = await import('@app/lib/doItForMe');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = { id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venue: '12 Elm Street', venueCity: 'Bethesda', venueState: 'MD', venueKind: 'home', guests: [], vendors: [], budget: [], timeline: [] };
const at = (hm) => new Date('2026-11-26T' + hm + ':00');
let host; let root; let updates;
beforeEach(() => { updates = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const mount = (ev, now) => act(() => root.render(createElement(DayPage, { ev, save: () => true, status: null, onRun: () => {}, onCounter: () => {}, onUpdates: () => { updates += 1; }, now, forecast: null })));
const open = () => { act(() => q('[data-tell]').click()); act(() => q('[data-tell-brief]').click()); };

describe('tell your guests', () => {
  it('the morning of: one row opens the sheet', () => {
    mount(TG, at('07:30'));
    act(() => q('[data-tell]').click());
    expect(q('[role="dialog"] h2').textContent).toBe('Tell your guests');
  });
  it('the day before: it is a row of Before tomorrow', () => {
    mount(TG, new Date('2026-11-25T16:00:00'));
    expect(q('[data-before-tomorrow] [data-tell]')).not.toBe(null);
  });
  it('signed out: says how to get the link, and offers no copy', () => {
    ready.v = { acct: { state: 'out', email: '' }, link: { state: 'idle', url: '' }, ready: false, check: () => {} };
    mount(TG, at('07:30'));
    open();
    expect(q('[role="dialog"]').textContent).toMatch(/Sign in once in the current app/);
    expect(q('[data-tell-copy]')).toBe(null);
  });
  it('with the reply link: hostv2’s details, link included, to copy', () => {
    ready.v = { acct: { state: 'in', email: 'host@example.com' }, link: { state: 'ready', url: 'https://x.test/r/abc' }, ready: true, check: () => {} };
    mount(TG, at('07:30'));
    open();
    const want = draftGuestBrief(TG, null, { rsvpUrl: 'https://x.test/r/abc' }).body;
    expect(q('[data-tell-text]').value).toBe(want);
    expect(want).toContain('https://x.test/r/abc');
    expect(q('[data-tell-copy]')).not.toBe(null);
  });
  it('the parking note: hostv2’s draft', () => {
    mount(TG, at('07:30'));
    act(() => q('[data-tell]').click());
    act(() => q('[data-tell-parking]').click());
    expect(q('[data-tell-text]').value).toBe(draftParkingInstructions(TG)); // a plain string, as hostv2's openDraft takes it
  });
  it('a draft with blanks to fill: editable, and Copy waits until they are filled', () => {
    mount(TG, at('07:30'));
    act(() => q('[data-tell]').click());
    act(() => q('[data-tell-parking]').click());
    expect(q('[data-tell-text]').tagName).toBe('TEXTAREA');
    expect(q('[data-tell-copy]').disabled).toBe(true);
    expect(q('[role="dialog"]').textContent).toMatch(/Fill in the \[ \] parts first/);
    const ta = q('[data-tell-text]');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    act(() => { set.call(ta, 'Guests can park on the street. Come to the front door.'); ta.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(q('[data-tell-copy]').disabled).toBe(false);
  });
  it('post it to everyone’s invite: Updates', () => {
    mount(TG, at('07:30'));
    act(() => q('[data-tell]').click());
    act(() => q('[data-tell-updates]').click());
    expect(updates).toBe(1);
  });
  it('Escape closes a sheet', () => {
    mount(TG, at('07:30'));
    act(() => q('[data-tell]').click());
    expect(q('[role="dialog"]')).not.toBe(null);
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(q('[role="dialog"]')).toBe(null);
  });
});
