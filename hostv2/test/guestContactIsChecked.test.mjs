// @vitest-environment jsdom
// The owner, 11/26/2026: "Make sure we are auto formatting contact info. Phone
// and email in both versions. Also add verification for those values." hostv2's
// guest editor formatted the phone but never said a number was short, and
// marked a bad email only for screen readers (aria-invalid, nothing on screen).
// ContactInput uses lib/contactFormat's rules, the same as hostv4: phone formats
// as typed; after leaving the field, what's wrong shows in one line; an email
// is saved trimmed. The guest editor's Phone and Email use it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ContactInput from '../src/ContactInput.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host; let root; let writes;
function Harness({ kind }) {
  const [v, setV] = useState('');
  return createElement(ContactInput, { kind, label: kind === 'phone' ? 'Phone' : 'Email', className: 'field', value: v, onWrite: (x) => { writes.push(x); setV(x); } });
}
const mount = (kind) => act(() => root.render(createElement(Harness, { kind })));
beforeEach(() => { writes = []; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const input = () => host.querySelector('input');
const type = (v) => act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input(), v); input().dispatchEvent(new Event('input', { bubbles: true })); });
const leave = () => act(() => { input().dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
const problem = (k) => host.querySelector('[data-contact-problem="' + k + '"]');

describe('hostv2 guest contact', () => {
  it('the phone formats as typed; a short one says so once she leaves', () => {
    mount('phone');
    type('41055');
    expect(input().value).toBe('(410) 55');
    expect(problem('phone')).toBeNull();
    leave();
    expect(problem('phone').textContent).toMatch(/missing digits/);
    expect(input().getAttribute('aria-invalid')).toBe('true');
    type('4105551234');
    expect(input().value).toBe('(410) 555-1234');
    leave();
    expect(problem('phone')).toBeNull();
  });
  it('a bad email shows a line; a good one is written trimmed', () => {
    mount('email');
    type('ana@example'); leave();
    expect(problem('email').textContent).toMatch(/doesn’t look right/);
    type('  ana@example.com '); leave();
    expect(writes[writes.length - 1]).toBe('ana@example.com');
    expect(problem('email')).toBeNull();
  });
  it('the guest editor uses it for Phone and Email', () => {
    const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/HostShellV2.jsx'), 'utf8');
    expect(src).toMatch(/<ContactInput kind="phone"[^>]*aria-label|<ContactInput kind="phone" label="Phone"/);
    expect(src).toMatch(/<ContactInput kind="email" label="Email"/);
  });
});
