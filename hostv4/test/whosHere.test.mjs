// @vitest-environment jsdom
// WHO'S HERE AND AT THE TABLE (B6, 11/26/2026; the Thanksgiving mockup, 3:20 and
// 4:30 PM). Once guests are due, The Day shows:
//   · Who's here · N of M: tap people in (lib/guestEdits checkInEdit); anyone not
//     here yet with a phone is one tap to text; who's here folds into "N here";
//     the count says "confirmed" only for real replies (coversWithWord);
//   · At the table: who needs what (lib/dietRows tableNeeds).
// Not before the doors open, and not for a headcount-only plan with no names.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import DayPage from '../src/DayPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = {
  id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host',
  venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [
    { id: 'g1', name: 'Bo Reed', rsvp: 'Yes', needs: 'Tree nut allergy', checkedIn: '2026-11-26T20:05:00.000Z' },
    { id: 'g2', name: 'Cy Lane', rsvp: 'Yes', diets: ['Vegetarian'], phone: '(240) 555-0102' },
    { id: 'g3', name: 'Di Moss', rsvp: 'Yes', meal: 'vegetarian' },
    { id: 'g4', name: 'Jo Fenn', rsvp: 'Maybe' },
    { id: 'g5', name: 'Ed Wu', rsvp: 'No' },
  ],
};
const at = (hm) => new Date('2026-11-26T' + hm + ':00');
let host; let root; let saved;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => { saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const mount = (ev, now) => act(() => root.render(createElement(DayPage, { ev, save, status: null, onRun: () => {}, onCounter: () => {}, now, forecast: null })));

describe('who’s here, 3:20 PM', () => {
  it('the count, who’s not here yet, and a text for anyone with a phone', () => {
    mount(TG, at('15:20'));
    expect(q('[data-whos-here] h3').textContent).toBe('Who’s here · 1 of 3');
    const rows = qa('[data-here-row]').map((r) => r.getAttribute('data-here-row'));
    expect(rows).toEqual(['g2', 'g3']);
    expect(q('[data-here-row="g2"] [data-here-text]').getAttribute('href')).toBe('sms:2405550102');
    expect(q('[data-here-row="g3"] [data-here-text]')).toBe(null);
    expect(q('[data-here-done]').textContent).toMatch(/1 here/);
    expect(q('[data-whos-here]').textContent).toMatch(/Maybe: Jo Fenn/);
  });
  it('a tap checks them in through the shared edit', () => {
    mount(TG, at('15:20'));
    act(() => q('[data-here-row="g2"] [data-tick]').click());
    expect(saved[0].patch.guests.find((g) => g.id === 'g2').checkedIn).toBeTruthy();
    expect(saved[0].msg).toBe('Cy is here.');
  });
  it('at the table: who needs what', () => {
    mount(TG, at('16:30'));
    const t = qa('[data-table-need]').map((r) => r.textContent);
    expect(t).toEqual(['Tree nut allergyBo Reed', 'VegetarianCy Lane, Di Moss']);
  });
  it('not before the doors open', () => {
    mount(TG, at('10:00'));
    expect(q('[data-whos-here]')).toBe(null);
  });
  it('a headcount plan with no names: no check-in list', () => {
    mount({ ...TG, guestMode: 'count', guestCount: 12, guests: [] }, at('15:20'));
    expect(q('[data-whos-here]')).toBe(null);
  });
});
