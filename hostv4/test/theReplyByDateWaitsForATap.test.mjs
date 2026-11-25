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
import { QuestionCard } from '../src/GuestsPage.jsx';
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
