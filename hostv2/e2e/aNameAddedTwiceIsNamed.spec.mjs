// ─── A NAME ADDED TWICE IS NAMED ─────────────────────────────────────────────
//
// Gold run (11/5/2026): "Ana Rivera" pasted twice went onto the list silently,
// and a reply later landed on the first Ana. Two guests can share a name, so
// the add is never refused — the receipt says so and leaves the call to her.
//
// Scoped to the rail viewports for the same reason as
// theCouplesSheSaidReachTheList: "Guests" is one click there, and what is under
// test is the receipt, not the phone's navigation.
import { test, expect } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;
const EV = {
  id: 'E2E_twice', type: 'Get-Together', name: 'Book club', date: '2027-03-12',
  guestMode: 'list', guestEstimate: 6, budget: [], vendors: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ana Rivera', rsvp: '' }],
};

const addNames = async (page, lines) => {
  await page.addInitScript((e) => {
    window.__t = [];
    new MutationObserver(() => document.querySelectorAll('[role=status]').forEach((n) => {
      const x = (n.innerText || '').trim(); if (x && window.__t[window.__t.length - 1] !== x) window.__t.push(x);
    })).observe(document, { subtree: true, childList: true, characterData: true });
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./');
  const row = page.getByRole('button', { name: /^Guests$/ }).first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  await page.getByLabel(/Add guest names/i).fill(lines.join('\n'));
  await page.getByRole('button', { name: 'Add them' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guests.length))
    .toBe(1 + lines.length);
  return page.evaluate(() => window.__t);
};

test('a name already on the list is added AND named in the receipt', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const toasts = await addNames(page, ['Bea Chen', 'Ana Rivera']);
  expect(toasts.some((t) => /Ana Rivera is on the list twice/.test(t)), JSON.stringify(toasts)).toBe(true);
});

test('CONTROL — distinct names say nothing about twice', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const toasts = await addNames(page, ['Bea Chen', 'Jo Lane']);
  expect(toasts.some((t) => /twice/.test(t)), JSON.stringify(toasts)).toBe(false);
});
