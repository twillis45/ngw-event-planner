// @vitest-environment jsdom
// The owner, 11/26/2026 (relayed by the live-check session): "Previous version
// of guest for hostv4 flowed from beginning to end showing next step. I think
// we may have sacrificed too much for the condensing." He chose "Bring the path
// back": a short start-to-finish list on the page, every step with its state;
// the current one lit and the SAME as the bottom button (one source: guestPath);
// done steps quiet with a check; later steps dimmed, not hidden. The folded
// groups, headcount bar, swipe, + and find stay. ⋯ keeps only the utilities.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import GuestsPage from '@app/guestsKit/GuestsPage.jsx';
import { guestPath } from '@app/lib/guestPath';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const base = { qs: [], byName: true, named: 10, sent: false, replyByPassed: false, locked: 0, toNudge: 0, replied: 0, invited: 0, waiting: 0, deadline: '2099-12-20' };
const STATES = {
  'a question is open': [{ ...base, qs: ['count'] }, 'answers', 'Plan for'],
  'no names yet': [{ ...base, named: 0 }, 'names', 'Add names'],
  'invite not sent': [base, 'invite', 'Review your invite'],
  'sent, replies out': [{ ...base, sent: true, invited: 10, replied: 6, toNudge: 4 }, 'replies', 'Nudge the 4 who haven’t replied'],
  'after the reply-by date': [{ ...base, sent: true, invited: 10, replied: 6, toNudge: 4, replyByPassed: true }, 'count', 'Lock the count'],
  'locked, everyone answered': [{ ...base, sent: true, invited: 10, replied: 10, replyByPassed: true, locked: 12 }, null, null],
};

describe('the path: the lit step is the bottom button', () => {
  for (const [name, [s, step, label]] of Object.entries(STATES)) {
    it(name, () => {
      const p = guestPath(s, 'Plan for 12');
      expect(p.current).toBe(step);
      expect(p.steps.filter((x) => x.state === 'now').map((x) => x.k)).toEqual(step ? [step] : []);
      expect(p.action ? p.action.label : null).toBe(label === 'Plan for' ? 'Plan for 12' : label);
      if (p.action) expect(p.action.step).toBe(p.current);
    });
  }
  it('every step is always listed, in order; earlier ones done, later ones waiting', () => {
    const p = guestPath(STATES['invite not sent'][0]);
    expect(p.steps.map((x) => x.k)).toEqual(['answers', 'names', 'invite', 'replies', 'count']);
    expect(p.steps.map((x) => x.state)).toEqual(['done', 'done', 'now', 'later', 'later']);
  });
  it('a locked count reads done even while a nudge is the next thing', () => {
    const p = guestPath({ ...base, sent: true, invited: 10, replied: 6, toNudge: 4, locked: 12 });
    expect(p.current).toBe('replies');
    expect(p.steps.find((x) => x.k === 'count').state).toBe('done');
  });
});

const NAMES = ['Ada Pine', 'Bo Reed', 'Cy Lane', 'Di Moss', 'Ed Park', 'Flo Hart', 'Gus Webb', 'Hal Ruiz', 'Ivy Cole', 'Jo Fenn'];
const ten = { id: 'e1', eventType: 'dinner_party', date: '2099-12-31', guestEstimate: 12, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-20',
  guests: NAMES.map((name, k) => ({ id: 'g' + k, name, rsvp: k < 4 ? 'Yes' : '' })) };
let host; let root;
const mount = (ev) => act(() => root.render(createElement(GuestsPage, { ev, save: () => true, sample: false, nav: null, status: null, onInvite: () => {}, onUpdates: () => {}, layout: 'phone' })));
beforeEach(() => { localStorage.clear(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];

describe('the path on the page', () => {
  it('lists the steps above the groups, the lit one matching the bottom button', () => {
    mount(ten);
    const steps = qa('[data-step]');
    expect(steps.map((e) => e.dataset.step)).toEqual(['answers', 'names', 'invite', 'replies', 'count', 'updates']);
    expect(q('[data-step][aria-current="step"]').dataset.step).toBe('invite');
    expect(q('.action .primary').textContent).toBe('Review your invite');
    const all = [...host.querySelectorAll('[data-step], [data-groups]')];
    expect(all.indexOf(q('[data-groups]'))).toBe(all.length - 1);
  });
  it('the answers row carries the one-line summary and opens the answers', () => {
    mount(ten);
    act(() => q('[data-step="answers"]').click());
    expect(q('[role="dialog"]')).not.toBeNull();
  });
  it('⋯ keeps only the utilities', () => {
    mount(ten);
    act(() => q('[aria-label="More"]').click());
    const sheet = q('[role="dialog"]');
    for (const s of ['data-share-link', 'data-download', 'data-alerts']) expect(sheet.querySelector('[' + s + ']'), s).not.toBeNull();
    for (const s of ['data-answers', 'data-open-invite', 'data-replied', 'data-count-row', 'data-open-updates']) expect(sheet.querySelector('[' + s + ']'), s).toBeNull();
  });
});
