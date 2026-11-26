// @vitest-environment jsdom
// The owner, 11/26/2026: "Make sure we are auto formatting contact info. Phone
// and email in both versions. Also add verification for those values." hostv4's
// guest phone formatted only on leaving the field, never flagged a short
// number, and saved a malformed email before warning. Now (lib/contactFormat):
// the phone formats as it's typed; leaving the field saves it; a short or long
// number and a bad email each say what's wrong in one line; an email is saved
// trimmed.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { GuestDetail } from '../src/GuestsPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ev = { id: 'e1', guests: [{ id: 'g1', name: 'Ana Pine', rsvp: 'Yes' }] };
let host; let root; let saved;
beforeEach(() => { saved = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(createElement(GuestDetail, { ev, g: ev.guests[0], i: 0, save: (ed) => { saved.push(ed); return true; }, onDone: () => {} }))); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const input = (label) => host.querySelector('input[aria-label="' + label + '"]');
const type = (el, v) => act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); });
const leave = (el) => act(() => { el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
const lastGuest = () => saved[saved.length - 1].patch.guests[0];

describe('contact formats as it is typed and says what is wrong', () => {
  it('the phone formats while typing and saves on leaving', () => {
    const p = input('Phone');
    type(p, '4105551234');
    expect(p.value).toBe('(410) 555-1234');
    expect(saved).toEqual([]);
    leave(p);
    expect(lastGuest().phone).toBe('(410) 555-1234');
    expect(host.querySelector('[data-contact-problem="phone"]')).toBeNull();
  });
  it('a short number says it is missing digits, after leaving the field', () => {
    const p = input('Phone');
    type(p, '41055');
    expect(host.querySelector('[data-contact-problem="phone"]')).toBeNull();
    leave(p);
    expect(host.querySelector('[data-contact-problem="phone"]').textContent).toMatch(/missing digits/);
    expect(p.getAttribute('aria-invalid')).toBe('true');
  });
  it('a bad email says so; a good one is saved trimmed', () => {
    const e = input('Email');
    type(e, 'ana@example');
    leave(e);
    expect(host.querySelector('[data-contact-problem="email"]').textContent).toMatch(/doesn’t look right/);
    type(e, '  ana@example.com ');
    leave(e);
    expect(lastGuest().email).toBe('ana@example.com');
    expect(host.querySelector('[data-contact-problem="email"]')).toBeNull();
  });
});
