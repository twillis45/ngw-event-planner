// GUESTS ASK ONE THING AT A TIME (UX_12 §1; owner 11/25/2026, "start the guests
// flow in hostv4"). Measured on the rendered page, not judged:
//   - the questions come in the prototype's order and each leaves once answered;
//   - every question screen carries 40 words or fewer, counted with the back
//     button, the title and the tab bar (6 words);
//   - the page changes a plan only through lib/guestEdits, the builders hostv2
//     saves, never a hand-built guests patch.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import GuestsPage, { guestQuestions } from '../src/GuestsPage.jsx';

const base = { id: 'e1', name: 'Rosa’s 40th Birthday', type: 'Birthday', date: '2027-01-04', guests: [] };
const ANSWERS = [['count', { guestEstimate: 25 }], ['mode', { guestMode: 'list' }], ['plus', { plusOnePolicy: 'plus_one_ok' }], ['kids', { kidsPolicy: 'adults_only' }], ['replyBy', { rsvpDeadline: '2026-12-20' }]];
const TABBAR_WORDS = 6; // Next step · Your plan · The Day
const nav = createElement('div', null, createElement('button', null, 'Your plan'), createElement('h1', null, 'Guests'));
const render = (ev) => renderToStaticMarkup(createElement(GuestsPage, { ev, save: () => true, sample: false, nav, status: null }));
const text = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, "'");
const words = (h) => text(h).split(/\s+/).filter((w) => /[A-Za-z0-9$—]/.test(w));
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'GuestsPage.jsx'), 'utf8');

describe('guests ask one thing at a time', () => {
  it('asks in the prototype’s order, and each answer takes its question away', () => {
    let ev = { ...base };
    for (const [k, patch] of ANSWERS) {
      expect(guestQuestions(ev)[0]).toBe(k);
      ev = { ...ev, ...patch };
    }
    expect(guestQuestions(ev)).toEqual([]);
  });

  it('a rule cleared by Undo is asked again', () => {
    expect(guestQuestions({ ...base, guestEstimate: 25, guestMode: 'list', plusOnePolicy: null })[0]).toBe('plus');
  });

  it('every question screen is 40 words or fewer, with its button and tab bar', () => {
    let ev = { ...base };
    for (const [k, patch] of ANSWERS) {
      const html = render(ev);
      expect(html).toContain('data-question="' + k + '"');
      const n = words(html).length + TABBAR_WORDS;
      expect(n, k + ': ' + words(html).join(' ')).toBeLessThanOrEqual(40);
      ev = { ...ev, ...patch };
    }
  });

  it('once answered, the page shows the names, Your answers and one bottom button', () => {
    const html = render({ ...base, guestEstimate: 25, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2026-12-20' });
    expect(html).not.toContain('data-question');
    expect(html).toContain('data-answers');
    expect((html.match(/class="primary"/g) || []).length).toBe(1);
    expect(text(html)).toContain('Add names');
  });

  it('the guest sheet edits one guest through the shared builders hostv2 uses', () => {
    for (const fn of ['guestFieldEdit(', 'mealEdit(', 'toldEdit(', 'rsvpEdit(', 'removeGuestEdit(']) expect(src).toContain(fn);
    expect(src).not.toMatch(/kidsCount:|guestTold:/);
    // Nothing on the sheet sends: "I told them myself" is a record only.
    expect(src).not.toMatch(/sms:|mailto:|tel:/);
  });

  it('changes a plan only through lib/guestEdits', () => {
    expect(src).toMatch(/from '@app\/lib\/guestEdits'/);
    expect(src).not.toMatch(/\{\s*guests:/);
    expect(src).not.toMatch(/patchSavedEvent|saveCustomEvents|localStorage/);
  });
});
