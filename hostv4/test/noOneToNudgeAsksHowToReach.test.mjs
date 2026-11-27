// @vitest-environment jsdom
// The owner, 11/26/2026: "Yes add button". After the invite, when guests haven't
// replied and none of them can be nudged (no phone or email on file), the
// Replies step had no button at all: nothing to do and nothing said. Now the
// bottom button is "Add how to reach them", and it opens the first such guest
// with the cursor in Phone. One source still: guestPath decides it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import GuestsPage from '../src/GuestsPage.jsx';
import { guestPath } from '@app/lib/guestPath';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const base = { qs: [], byName: true, named: 4, sent: true, replyByPassed: false, locked: 0, toNudge: 0, noReach: 0, replied: 1, invited: 4, waiting: 0, deadline: '2099-12-20' };

describe('guestPath: no one to nudge', () => {
  it('waiting guests with no way to reach them: the button asks for one', () => {
    const p = guestPath({ ...base, noReach: 3 });
    expect(p.current).toBe('replies');
    expect(p.action).toEqual({ step: 'replies', kind: 'reach', label: 'Add how to reach them' });
  });
  it('anyone reachable: the nudge still wins', () => {
    expect(guestPath({ ...base, toNudge: 1, noReach: 2 }).action.kind).toBe('nudge');
  });
  it('everyone reachable or answered: no button, as before', () => {
    expect(guestPath(base).action).toBe(null);
  });
  it('after the reply-by date the count is the button, as before', () => {
    expect(guestPath({ ...base, noReach: 3, replyByPassed: true }).action.kind).toBe('lock');
  });
});

const ev = {
  id: 'e1', eventType: 'dinner_party', date: '2099-12-31', guestEstimate: 6, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-20',
  invitesSentAt: '2099-11-01T12:00:00Z',
  guests: [
    { id: 'g0', name: 'Ada Pine', rsvp: 'Yes', invitedAt: '2099-11-01T12:00:00Z' },
    { id: 'g1', name: 'Bo Reed', rsvp: '', invitedAt: '2099-11-01T12:00:00Z' },
    { id: 'g2', name: 'Cy Lane', rsvp: '', invitedAt: '2099-11-01T12:00:00Z' },
  ],
};
let host; let root;
beforeEach(() => { localStorage.clear(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);

describe('on the page', () => {
  it('the button opens the first waiting guest, cursor in Phone', async () => {
    act(() => root.render(createElement(GuestsPage, { ev, save: () => true, sample: false, nav: null, status: null, onInvite: () => {}, onUpdates: () => {}, layout: 'phone' })));
    const btn = q('.action .primary');
    expect(btn && btn.textContent).toBe('Add how to reach them');
    expect(q('[data-step="replies"]').tagName).toBe('BUTTON');
    await act(async () => { btn.click(); await new Promise((r) => setTimeout(r, 0)); });
    const sheet = q('[role="dialog"]');
    expect(sheet && sheet.textContent).toContain('Bo Reed');
    expect(document.activeElement && document.activeElement.getAttribute('aria-label')).toBe('Phone');
  });
});
