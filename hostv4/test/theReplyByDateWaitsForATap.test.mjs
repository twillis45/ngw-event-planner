// @vitest-environment jsdom
// The owner, 11/25/2026, on an iPad: "Reply by date undo not working". Undo
// worked; the date came back. iPad's date picker changes the field as soon as
// it is touched, and the card saved on every change, so a touch set a date
// (that day, Nov 25) and the question vanished again. The picked date now waits
// for a tap on "Use <date>", and a date that has passed, or is not before the
// party, is refused with a line instead of saved.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QuestionCard, guestQuestions, answersLine } from '../src/GuestsPage.jsx';
import { replyByProblem } from '@app/lib/guestEdits';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ev = { id: 'e1', eventType: 'birthday', date: '2099-12-31', guestEstimate: 12, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome' };

let host; let root; let saved;
beforeEach(() => {
  saved = [];
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(QuestionCard, { k: 'replyBy', ev, save: (ed) => { saved.push(ed); return true; } })));
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

function pick(iso) {
  const input = host.querySelector('input[type="date"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  act(() => { set.call(input, iso); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
}
const useButton = () => [...host.querySelectorAll('button')].find((b) => /^Use /.test(b.textContent));

describe('the reply-by date waits for a tap', () => {
  it('picking a date in the field saves nothing', () => {
    pick('2099-12-10');
    expect(saved).toEqual([]);
  });
  it('a tap on "Use <date>" saves that date', () => {
    pick('2099-12-10');
    const b = useButton();
    expect(b && b.textContent).toMatch(/December 10/);
    act(() => b.click());
    expect(saved.map((e) => e.patch)).toEqual([{ rsvpDeadline: '2099-12-10' }]);
  });
  it('a date that has passed is refused with a line, and nothing is saved', () => {
    pick('2000-01-03');
    expect(useButton()).toBeUndefined();
    expect(host.textContent).toMatch(/already passed/);
    expect(saved).toEqual([]);
  });
  it('a date on or after the party is refused', () => {
    pick('2099-12-31');
    expect(useButton()).toBeUndefined();
    expect(host.textContent).toMatch(/before the party/);
  });
});

// The owner's Thanksgiving plan, 11/25/2026, for the next day: no reply-by
// date can be honest (today has passed, tomorrow is the party), so asking left
// a question nothing could answer. Too close, it is not asked.
describe('a party too close for a reply-by date', () => {
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };
  const answered = { guestEstimate: 12, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome' };
  it('is not asked when the party is tomorrow', () => {
    expect(guestQuestions({ id: 't', eventType: 'thanksgiving', date: tomorrow(), ...answered })).toEqual([]);
  });
  it('is still asked when there is time', () => {
    expect(guestQuestions({ id: 't', eventType: 'birthday', date: '2099-12-31', ...answered })).toEqual(['replyBy']);
  });
  it('the answers line says so instead of an invalid date', () => {
    expect(answersLine({ ...answered })).toMatch(/no reply-by date/);
    expect(answersLine({ ...answered })).not.toMatch(/Invalid/);
  });
});

describe('a saved reply-by date can be cleared', () => {
  it('shows "No reply-by date" when one is set, and it clears the date', () => {
    act(() => root.render(createElement(QuestionCard, { k: 'replyBy', ev: { ...ev, rsvpDeadline: '2099-11-25' }, save: (ed) => { saved.push(ed); return true; } })));
    const clear = [...host.querySelectorAll('button')].find((b) => b.textContent === 'No reply-by date');
    expect(clear).toBeTruthy();
    act(() => clear.click());
    expect(saved.map((e) => e.patch)).toEqual([{ rsvpDeadline: null }]);
  });
  it('is not offered when no date is set', () => {
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'No reply-by date')).toBe(false);
  });
});

describe('replyByProblem', () => {
  const today = '2026-11-25';
  it('today and earlier have passed', () => {
    expect(replyByProblem({ date: '2026-12-31' }, '2026-11-25', today)).toMatch(/already passed/);
    expect(replyByProblem({ date: '2026-12-31' }, '2026-11-01', today)).toMatch(/already passed/);
  });
  it('the party day and later are not before the party', () => {
    expect(replyByProblem({ date: '2026-12-31' }, '2026-12-31', today)).toMatch(/before the party/);
  });
  it('a day between is fine, and so is any later day when the party has no date', () => {
    expect(replyByProblem({ date: '2026-12-31' }, '2026-12-20', today)).toBeNull();
    expect(replyByProblem({}, '2027-01-20', today)).toBeNull();
  });
});
