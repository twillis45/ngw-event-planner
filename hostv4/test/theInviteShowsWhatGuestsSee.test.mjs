// @vitest-environment jsdom
// The owner, 11/26/2026: "In hostv4 where are all of the rsvp options, creation
// previews ..." then "start the invite preview". hostv4's Your invite page had
// the message and the rules but never showed the page a guest opens. It now
// frames the guest's own invite page (hostv2's InviteV2 in preview mode, at
// ../hostv2/?invite-preview=<plan id>): the same component the guest gets,
// nothing copied, nothing sent. "See the full invite" opens it full height in
// place; a saved change reloads it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import InvitePage from '../src/InvitePage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ev = { id: 'cust-abc 1', name: 'Harvest Supper', type: 'Dinner Party', date: '2099-12-31', startTime: '18:30', startTimeSource: 'host', venue: 'Home', address: '1 Main St', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', guests: [] };
let host; let root;
const mount = (e) => act(() => root.render(createElement(InvitePage, { ev: e, save: () => true, nav: null, status: null })));
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const frame = () => host.querySelector('iframe[data-invite-preview]');

describe('the invite shows what guests see', () => {
  it('frames the guest’s own page for this plan, in preview mode', () => {
    mount(ev);
    expect(frame()).not.toBeNull();
    expect(frame().getAttribute('src')).toBe('../hostv2/?invite-preview=' + encodeURIComponent('cust-abc 1'));
    expect(frame().getAttribute('title')).toBe('The page guests open');
  });
  it('sits after the message and before the rules', () => {
    mount(ev);
    const heads = [...host.querySelectorAll('h3.sh')].map((h) => h.textContent);
    expect(heads.indexOf('The page they open')).toBe(heads.indexOf('The message they get') + 1);
    expect(heads.indexOf('Rules')).toBeGreaterThan(heads.indexOf('The page they open'));
  });
  it('"See the full invite" opens it full height in place, and back', () => {
    mount(ev);
    const b = [...host.querySelectorAll('button')].find((x) => x.textContent === 'See the full invite');
    act(() => b.click());
    expect(frame().closest('[data-preview-frame]').getAttribute('data-full')).toBe('1');
    act(() => [...host.querySelectorAll('button')].find((x) => x.textContent === 'Show less').click());
    expect(frame().closest('[data-preview-frame]').getAttribute('data-full')).toBe('0');
  });
  it('a saved change reloads the frame', () => {
    mount(ev);
    const a = frame();
    mount({ ...ev, kidsPolicy: 'kids_welcome' });
    expect(frame()).not.toBe(a);
  });
});
