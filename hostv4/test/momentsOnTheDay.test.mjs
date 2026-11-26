// @vitest-environment jsdom
// MOMENTS (B7, 11/26/2026). The Day offers the type's next moment not yet on the
// run (lib/momentLibrary suggestableMoments, the list hostv2 offers), one row
// under Now. Its sheet says who it's for, and she picks the time (the next
// step's by default) before it joins the run (lib/dayOfEdits addMomentEdit).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage from '../src/DayPage.jsx';
import { suggestableMoments } from '@app/lib/momentLibrary';
import { effectiveRos } from '@app/lib/playbooks';
import { addMomentEdit } from '@app/lib/dayOfEdits';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = { id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], vendors: [], timeline: [] };
const at = (hm) => new Date('2026-11-26T' + hm + ':00');
let host; let root; let saved;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => { saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const mount = (ev, now) => act(() => root.render(createElement(DayPage, { ev, save, status: null, onRun: () => {}, onCounter: () => {}, now, forecast: null })));
const first = suggestableMoments(TG.type, effectiveRos(TG))[0];

describe('a moment worth a spot', () => {
  it('one row under Now, naming the moment', () => {
    mount(TG, at('10:40'));
    const row = q('[data-moment]');
    expect(row.textContent).toMatch(new RegExp('Worth a spot: ' + first.label));
    expect(q('[data-now]').compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('the sheet: who it’s for, the time (the next step’s by default), then it joins the run', () => {
    mount(TG, at('10:40'));
    act(() => q('[data-moment]').click());
    expect(q('[role="dialog"]').textContent).toMatch(first.owner);
    const t = q('[data-moment-time]');
    expect(t.value).toBe('12:00');
    act(() => q('[data-moment-add]').click());
    const want = addMomentEdit(TG, first, '12:00');
    expect(saved[0]).toEqual(want);
  });
  it('once every moment is on the run, nothing is offered', () => {
    let ev = TG;
    for (const m of suggestableMoments(TG.type, effectiveRos(TG))) ev = { ...ev, ...addMomentEdit(ev, m, '12:00').patch };
    mount(ev, at('10:40'));
    expect(q('[data-moment]')).toBe(null);
  });
  it('the day after: nothing offered', () => {
    mount(TG, new Date('2026-11-27T10:00:00'));
    expect(q('[data-moment]')).toBe(null);
  });
});
