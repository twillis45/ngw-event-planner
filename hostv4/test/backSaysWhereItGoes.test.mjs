// @vitest-environment jsdom
// The back link names the page it goes back to. Found rendering "Design this
// page" (11/26/2026): three pages deep it read "‹ Guests" while it went back to
// Your invite — the shell named every page past the first "Guests". One table
// of page titles now names both the page and the link back to it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import HostShellV4 from '../src/HostShellV4.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ev = { id: 'cust-bk', name: 'Harvest Supper', type: 'Dinner Party', eventType: 'dinner_party', date: '2099-12-31', startTime: '18:30', startTimeSource: 'host', venue: 'Home', address: '1 Main St', guestEstimate: 12, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2099-12-20', guests: [{ id: 'g1', name: 'Ana Pine', rsvp: 'Yes' }] };
let host; let root;
beforeEach(() => { localStorage.clear(); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev])); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(createElement(HostShellV4))); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const back = () => host.querySelector('.backbtn').getAttribute('aria-label');
const click = (el) => act(() => el.click());

describe('the back link says where it goes', () => {
  it('Guests → Your invite → Design this page', () => {
    click([...host.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes('Your plan')));
    click(host.querySelector('[data-plan-row="guests"]'));
    expect(back()).toBe('Back to Your plan');
    click(host.querySelector('[data-step="invite"]'));
    expect(back()).toBe('Back to Guests');
    click(host.querySelector('[data-open-design]'));
    expect(back()).toBe('Back to Your invite');
  });
});
