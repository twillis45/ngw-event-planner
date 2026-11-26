// @vitest-environment jsdom
// The owner, 11/25/2026: "Guests looks out of control again." Measured at 390
// wide with 10 names: 2.3 screens and 25 controls (Your answers, the add box,
// find, five filters, every name, the invite, More, a note). Asked to "minimize
// lists and collapse where we can, hide", he chose option E from measured
// renders: a headcount bar; "N guest questions waiting" only when there are
// some; Coming / Maybe / No reply folded, opening in place one at a time; + to
// add names and ⋯ for the rest; the bottom button by the plan. No names yet:
// the add box alone.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import GuestsPage from '../src/GuestsPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const NAMES = ['Ada Pine', 'Bo Reed', 'Cy Lane', 'Di Moss', 'Ed Park', 'Flo Hart', 'Gus Webb', 'Hal Ruiz', 'Ivy Cole', 'Jo Fenn'];
const RSVP = ['Yes', 'Yes', 'Yes', 'Yes', 'Maybe', 'Maybe', '', '', '', ''];
const answered = { id: 'e1', eventType: 'dinner_party', date: '2099-12-31', guestEstimate: 12, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-20' };
const ten = { ...answered, guests: NAMES.map((name, k) => ({ id: 'g' + k, name, rsvp: RSVP[k] })) };

let host; let root; let saved;
const mount = (ev, layout = 'phone') => act(() => root.render(createElement(GuestsPage, { ev, save: (ed) => { saved.push(ed); return true; }, sample: false, nav: null, status: null, onInvite: () => {}, onUpdates: () => {}, layout })));
beforeEach(() => { saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const click = (el) => act(() => el.click());
const shownNames = () => NAMES.filter((n) => host.textContent.includes(n));

describe('Guests folds away', () => {
  it('shows a headcount bar and three folded groups, no names, with 10 guests', () => {
    mount(ten);
    expect(q('[data-headcount]').getAttribute('aria-label')).toMatch(/4 coming, 2 maybe, 4 no reply/);
    expect(qa('[data-group]').map((b) => b.getAttribute('data-group') + ':' + b.querySelector('.val').textContent)).toEqual(['yes:4', 'maybe:2', 'pending:4']);
    expect(shownNames()).toEqual([]);
  });
  it('keeps the page to 8 controls or fewer, and one bottom button', () => {
    mount(ten);
    expect(qa('button, input, textarea, select, a').length).toBeLessThanOrEqual(8);
    expect(qa('.primary').length).toBe(1);
  });
  it('opens one group at a time, in place', () => {
    mount(ten);
    click(q('[data-group="pending"]'));
    expect(shownNames()).toEqual(['Gus Webb', 'Hal Ruiz', 'Ivy Cole', 'Jo Fenn']);
    click(q('[data-group="yes"]'));
    expect(shownNames()).toEqual(['Ada Pine', 'Bo Reed', 'Cy Lane', 'Di Moss']);
    click(q('[data-group="yes"]'));
    expect(shownNames()).toEqual([]);
  });
  it('hides the rest behind ⋯: answers, invite, updates, share, download, alerts', () => {
    mount(ten);
    for (const s of ['data-answers', 'data-open-invite', 'data-open-updates', 'data-share-link', 'data-download', 'data-alerts']) expect(q('[' + s + ']')).toBeNull();
    click(q('[aria-label="More"]'));
    for (const s of ['data-answers', 'data-open-invite', 'data-open-updates', 'data-share-link', 'data-download', 'data-alerts']) expect(q('[' + s + ']'), s).not.toBeNull();
  });
  it('adds names from +', () => {
    mount(ten);
    expect(q('#addname')).toBeNull();
    click(q('[aria-label="Add names"]'));
    const box = q('#addname');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    act(() => { set.call(box, 'Kai Ross'); box.dispatchEvent(new Event('input', { bubbles: true })); });
    click(qa('button').find((b) => b.textContent === 'Add'));
    expect(saved[0].patch.guests.map((g) => g.name)).toContain('Kai Ross');
  });
  it('with no names yet, the page is the add box', () => {
    mount({ ...answered, guests: [] });
    expect(q('#addname')).not.toBeNull();
    expect(q('[data-group]')).toBeNull();
    expect(q('.primary').textContent).toBe('Add names');
  });
  it('offers find only past 20 names', () => {
    mount(ten);
    expect(q('#findguest')).toBeNull();
    const many = { ...answered, guests: Array.from({ length: 21 }, (_, k) => ({ id: 'm' + k, name: 'Guest ' + k, rsvp: '' })) };
    mount(many);
    expect(q('#findguest')).not.toBeNull();
  });
  it('on an iPad, the first name still fills the detail pane', () => {
    mount(ten, 'split');
    expect(q('.gdetail .dhead').textContent).toBe('Ada Pine');
  });
});
