// @vitest-environment jsdom
// RUNNING LATE (B8, 11/26/2026; the Thanksgiving mockup, 1:05 PM). From The Day
// once it is under way, and from counter mode: move the rest of today 15, 30
// or 45 minutes later, once. The sheet shows what moves and what stays (the
// arrival time: guests already have it) before anything is saved; the save is
// lib/dayOfEdits runningLate. After it, telling guests is one tap (Updates).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage, { CounterMode } from '../src/DayPage.jsx';
import { runningLate } from '@app/lib/dayOfEdits';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = { id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], vendors: [], timeline: [] };
const at = (hm) => new Date('2026-11-26T' + hm + ':00');
let host; let root; let saved; let updates;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => { saved = []; updates = 0; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const mountDay = (now) => act(() => root.render(createElement(DayPage, { ev: TG, save, status: null, onRun: () => {}, onCounter: () => {}, onUpdates: () => { updates += 1; }, now })));

describe('running late, 1:05 PM', () => {
  it('The Day offers it once the day is under way, not before', () => {
    mountDay(at('07:30'));
    expect(q('[data-late]')).toBe(null);
    mountDay(at('13:05'));
    expect(q('[data-late]').textContent).toMatch(/Running late\?/);
  });

  it('the sheet shows what moves and what stays before anything is saved; 30 is the default', () => {
    mountDay(at('13:05'));
    act(() => q('[data-late]').click());
    expect(q('[data-late-by][aria-pressed="true"]').textContent).toBe('30 min');
    expect(q('[data-late-preview]').textContent).toMatch(/3:00 PM.*Arrivals stay at 3:00 PM/);
    expect(saved).toEqual([]);
    act(() => qa('[data-late-by]').find((b) => b.textContent === '45 min').click());
    expect(q('[data-late-go]').textContent).toBe('Move the rest 45 minutes');
  });

  it('moving saves the shared edit, then offers to tell guests in Updates', () => {
    mountDay(at('13:05'));
    act(() => q('[data-late]').click());
    act(() => q('[data-late-go]').click());
    const want = runningLate(TG, 30, at('13:05')).edit;
    expect(saved[0].patch).toEqual(want.patch);
    expect(saved[0].msg).toBe(want.msg);
    act(() => q('[data-late-tell]').click());
    expect(updates).toBe(1);
  });

  it('counter mode has it too', () => {
    act(() => root.render(createElement(CounterMode, { ev: TG, save, now: at('13:05'), onLeave: () => {} })));
    act(() => q('[data-late]').click());
    expect(q('[data-late-go]')).not.toBe(null);
  });

  it('with nothing left after now, it says so and moves nothing', () => {
    mountDay(at('20:45'));
    const late = q('[data-late]');
    if (late) {
      act(() => late.click());
      expect(q('[data-late-go]')).toBe(null);
      expect(q('[role="dialog"]').textContent).toMatch(/Nothing left today to move/);
    }
    expect(saved).toEqual([]);
  });
});
