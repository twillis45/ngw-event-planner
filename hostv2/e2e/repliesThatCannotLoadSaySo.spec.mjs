// ─── REPLIES THAT CANNOT LOAD SAY SO ────────────────────────────────────────
//
// Gold run (GOLD-10, failure injection, 11/5/2026): with the backend down the
// replies read failed and every guest simply read "No reply" — a failure shown
// as data. D-8 covered a dead session; a service that is down said nothing.
//
// On the gold07 bundle (port 5255): the one build with an RSVP API configured
// and planner auth, so the host's read-back is actually attempted.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn } from './fixtures.mjs';

const BASE = previewUrl(5255);
const API = 'https://gold07-mock.invalid';
const EVENT_ID = 'e2e-replies-down';

const boot = async (page, rsvpsStatus) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/api/events/${EVENT_ID}/rsvps`, (r) => r.fulfill({ status: rsvpsStatus, contentType: 'application/json', body: rsvpsStatus === 200 ? '[]' : '{"detail":"down"}' }));
  await page.addInitScript(([id, date]) => {
    window.__t = [];
    new MutationObserver(() => document.querySelectorAll('[role=status]').forEach((n) => {
      const x = (n.innerText || '').trim(); if (x && window.__t[window.__t.length - 1] !== x) window.__t.push(x);
    })).observe(document, { subtree: true, childList: true, characterData: true });
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id, name: 'Book club', type: 'Get-Together', date, guestMode: 'list', guestEstimate: 3,
      budget: [], vendors: [], guests: [{ id: 'g1', name: 'Nia Test', rsvp: '' }],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [EVENT_ID, dateIn(10)]);
  await page.goto(`${BASE}?elegant=1`);
  await page.waitForTimeout(5000);
  return page.evaluate(() => window.__t);
};

test('a replies read the service refuses tells the host, once', async ({ page }) => {
  const toasts = await boot(page, 503);
  expect(toasts.some((t) => /Couldn’t load your guests’ replies/.test(t)), JSON.stringify(toasts)).toBe(true);
});

test('CONTROL — an empty list that loaded says nothing', async ({ page }) => {
  const toasts = await boot(page, 200);
  expect(toasts.some((t) => /Couldn’t load your guests’ replies/.test(t)), JSON.stringify(toasts)).toBe(false);
});
