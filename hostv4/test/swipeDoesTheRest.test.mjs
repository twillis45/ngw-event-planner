// @vitest-environment jsdom
// The owner, 11/26/2026 (relayed by the live-check session; the full-swipe-left
// choice asked and answered here): "Swipe should perform the rest of the
// options", the iOS Mail way. Swipe right reveals Coming and Maybe, a full
// swipe right does Coming (as before). Swipe left reveals Can't make it, No
// reply and Remove; a full swipe left does Can't make it, so Remove always
// takes a deliberate tap (with Undo). One row open at a time; a vertical drag
// reveals nothing. Every action saves through lib/guestEdits.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import GuestsPage from '../src/GuestsPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ev = { id: 'sw', eventType: 'dinner_party', date: '2099-12-31', guestEstimate: 12, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-20',
  guests: [{ id: 'a', name: 'Ada Pine', rsvp: '' }, { id: 'b', name: 'Bo Reed', rsvp: '' }] };

let host; let root; let saved;
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('ngw-hostv4-open-group:sw', 'pending');
  saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(createElement(GuestsPage, { ev, save: (ed) => { saved.push(ed); return true; }, sample: false, nav: null, status: null, onInvite: () => {}, onUpdates: () => {} })));
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const row = (id) => host.querySelector('[data-guest="' + id + '"]');
const fire = (el, type, x, y = 0) => act(() => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })); });
const drag = (id, dx, dy = 0) => { const el = row(id); fire(el, 'pointerdown', 200, 300); fire(el, 'pointermove', 200 + dx / 2, 300 + dy / 2); fire(el, 'pointermove', 200 + dx, 300 + dy); fire(el, 'pointerup', 200 + dx, 300 + dy); };
const btn = (label) => host.querySelector('[aria-label="' + label + '"]');
const shown = (label) => { const b = btn(label); return !!b && b.closest('[aria-hidden="true"]') === null && b.tabIndex !== -1; };
const patchOf = (id) => saved[saved.length - 1].patch.guests.find((g) => g.id === id);

describe('swipe does the rest', () => {
  it('a partial swipe right reveals Coming and Maybe, and Maybe saves', () => {
    expect(shown('Mark Ada Pine maybe')).toBe(false);
    drag('a', 90);
    expect(shown('Mark Ada Pine coming')).toBe(true);
    // The row says which way it went; the stylesheet hides the other side's
    // buttons from that, so they never show through (the first render).
    expect(row('a').parentNode.dataset.dir).toBe('right');
    expect(shown('Mark Ada Pine maybe')).toBe(true);
    expect(saved).toEqual([]);
    act(() => btn('Mark Ada Pine maybe').click());
    expect(patchOf('a').rsvp).toBe('Maybe');
  });
  it('a partial swipe left reveals Can’t make it, No reply and Remove', () => {
    drag('a', -90);
    for (const l of ['Mark Ada Pine can’t make it', 'Mark Ada Pine no reply', 'Remove Ada Pine']) expect(shown(l), l).toBe(true);
    act(() => btn('Mark Ada Pine can’t make it').click());
    expect(patchOf('a').rsvp).toBe('No');
  });
  it('No reply and Remove save through the shared edits', () => {
    drag('a', -90); act(() => btn('Mark Ada Pine no reply').click());
    expect(patchOf('a').rsvp).toBe('');
    drag('b', -90); act(() => btn('Remove Bo Reed').click());
    expect(saved[saved.length - 1].patch.guests.map((g) => g.id)).toEqual(['a']);
  });
  it('a full swipe right does Coming; a full swipe left does Can’t make it, never Remove', () => {
    drag('a', 260);
    expect(patchOf('a').rsvp).toBe('Yes');
    drag('b', -260);
    expect(patchOf('b').rsvp).toBe('No');
    expect(saved.every((e) => e.patch.guests.length === 2)).toBe(true);
  });
  it('a vertical drag reveals nothing and saves nothing', () => {
    drag('a', 6, 120);
    expect(shown('Mark Ada Pine maybe')).toBe(false);
    expect(shown('Remove Ada Pine')).toBe(false);
    expect(saved).toEqual([]);
  });
  it('one row open at a time, and a tap closes it without opening the sheet', () => {
    drag('a', 90);
    drag('b', -90);
    expect(shown('Mark Ada Pine maybe')).toBe(false);
    expect(shown('Remove Bo Reed')).toBe(true);
    fire(row('b'), 'pointerdown', 150); fire(row('b'), 'pointerup', 150);
    expect(shown('Remove Bo Reed')).toBe(false);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
