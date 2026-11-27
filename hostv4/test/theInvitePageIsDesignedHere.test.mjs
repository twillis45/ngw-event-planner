// @vitest-environment jsdom
// The owner, 11/26/2026: "merge #283 and start the card design". hostv4's Your
// invite now shows the page guests open; "Design this page" opens its design,
// the same fields hostv2's InviteDesignSheet saves, through the same rule
// (lib/inviteDesign): the layout, her message (Start over), Hosted by, how
// guests reach her (a phone or an email, or nothing), the colors and their
// arrangement. Each change saves as it's made and the preview above follows.
// The photo stays in the current app (its upload needs hostv2's sign-in).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import InviteDesignPage from '@app/guestsKit/InviteDesignPage.jsx';
import InvitePage from '@app/guestsKit/InvitePage.jsx';
import { suggestedInviteLine } from '@app/lib/inviteDeck';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ev = { id: 'cust-d1', name: 'Harvest Supper', type: 'Dinner Party', date: '2099-12-31', startTime: '18:30', startTimeSource: 'host', venue: 'Home', address: '1 Main St', guests: [] };
let host; let root; let saved;
const mount = (C, props) => act(() => root.render(createElement(C, { ev, save: (ed) => { saved.push(ed); return true; }, nav: null, status: null, ...props })));
beforeEach(() => { saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const type = (el, v) => act(() => { const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); });
const leave = (el) => act(() => { el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
const btn = (t) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === t || b.textContent.trim().endsWith(t));

describe('Your invite opens the page’s design', () => {
  it('a "Design this page" row under the preview', () => {
    let opened = false;
    mount(InvitePage, { onDesign: () => { opened = true; } });
    act(() => q('[data-open-design]').click());
    expect(opened).toBe(true);
  });
});

describe('the design page', () => {
  it('shows the preview first', () => {
    mount(InviteDesignPage);
    expect(q('iframe[data-invite-preview]').getAttribute('src')).toBe('../hostv2/?invite-preview=cust-d1');
  });
  it('layout saves as tapped', () => {
    mount(InviteDesignPage);
    act(() => btn('At a glance').click());
    expect(saved[0].patch).toEqual({ inviteLayout: 'glance' });
  });
  it('the message saves on leaving; the suggestion stays stored empty; Start over', () => {
    mount(InviteDesignPage);
    const m = q('textarea[aria-label="Your message"]');
    expect(m.value).toBe(suggestedInviteLine(ev));
    type(m, 'Come hungry.'); leave(m);
    expect(saved[0].patch).toEqual({ deckLine: 'Come hungry.' });
    act(() => btn('Start over').click());
    expect(saved[1].patch).toEqual({ deckLine: '' });
  });
  it('how guests reach her: a bad value says so and saves nothing', () => {
    mount(InviteDesignPage);
    const c = q('input[aria-label="How guests reach you"]');
    type(c, 'call me'); leave(c);
    expect(saved).toEqual([]);
    expect(q('[data-design-problem]').textContent).toMatch(/phone number or an email/);
    type(c, 'pat@example.com'); leave(c);
    expect(saved[0].patch).toEqual({ hostContact: 'pat@example.com' });
  });
  it('colors: Match my event and the palettes, saved as tapped', () => {
    mount(InviteDesignPage);
    const pals = [...host.querySelectorAll('[data-palette]')];
    expect(pals.length).toBeGreaterThan(3);
    act(() => pals[0].click());
    expect(saved[0].patch.inviteStyle).toMatch(/\S/);
    act(() => btn('Match my event').click());
    expect(saved[1].patch).toEqual({ inviteStyle: 'auto' });
  });
  it('the photo says where it is, never a dead end', () => {
    mount(InviteDesignPage);
    expect(host.textContent).toMatch(/photo/i);
    expect(q('a[href="../hostv2/"]')).not.toBeNull();
  });
});
