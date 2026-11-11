// ─── N1: FORTY PLANNED, SIX NAMED, ONE SIZE ──────────────────────────────────
//
// Stage-4 P1 finding N1 (11/11/2026, 390px). A ROSTER event with 40 planned
// guests and 6 named (mixed replies) read 40 on the Board, "likely 2–5 on the
// day" on Guests, "sized for 2–5 guests" on Money, and "Sized for 40 guests"
// in Ask. Headcount mode agreed everywhere. Engine proof:
// src/lib/__tests__/aPlannedCountOutranksAShortRoster.test.js — sizingRange is
// the one "sized for" label, and the planned count outranks a short roster
// (sizingGuests' own rule). The reply band stays a reply status.
import { test, expect } from './fixtures.mjs';

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const SIX = [
  { id: 'g1', name: 'Ana Cole', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Diaz', rsvp: 'Yes' },
  { id: 'g3', name: 'Cy Evans', rsvp: 'No' }, { id: 'g4', name: 'Di Fox', rsvp: 'Maybe' },
  { id: 'g5', name: 'Ed Gray', rsvp: '' }, { id: 'g6', name: 'Flo Hart', rsvp: 'Pending' },
];
const EV = (extra) => ({
  id: 'E2E_n1', type: 'Birthday', name: 'Forty for Ana', date: day(30), createdAt: new Date().toISOString(),
  guestCount: 40, totalBudget: 3000, budget: [], timeline: [], vendors: [], guests: SIX, ...extra,
});

const seed = async (page, ev) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, ev);
  await page.goto('./');
};
const openSection = async (page, label) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByRole('button', { name: 'All sections of your plan' }).first().click();
  const row = page.getByRole('button', { name: new RegExp('^' + label) }).last();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  await page.waitForTimeout(800);
};
const sheetText = (page) => page.evaluate(() => (([...document.querySelectorAll('[role=dialog], .sheet')].pop() || document.body).innerText || '').replace(/\s+/g, ' '));
const ask = async (page, q) => {
  await page.getByLabel('Ask a question about your plan').fill(q);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.waitForTimeout(1200);
  return sheetText(page);
};

test('roster, 40 planned, 6 named: Board, Money, Guests, and Ask all size for 40', async ({ page }) => {
  await seed(page, EV({}));
  // Board — the Guests tile's number.
  await expect.poll(() => page.locator('.tile-b .t-num').first().innerText(), { timeout: 20000 }).toBe('40');

  await openSection(page, 'Your money');
  const money = await sheetText(page);
  expect(money).toMatch(/sized for 40 guests/);
  expect(money).not.toMatch(/sized for 2–5/);

  await openSection(page, 'Guests');
  const guests = await sheetText(page);
  expect(guests).toMatch(/planning for 40/);
  expect(guests).not.toMatch(/likely 2–5 on the day/);

  await openSection(page, 'Ask');
  expect(await ask(page, 'How much food do I need?')).toMatch(/Sized for 40 guests/);
  const howMany = await ask(page, 'How many guests are coming?');
  expect(howMany).toMatch(/planning around 40/);
  expect(howMany).not.toMatch(/2–5/);
});

test('NEGATIVE CONTROL: headcount mode keeps its shift band, the same on Money and Guests', async ({ page }) => {
  await seed(page, EV({ guestMode: 'count' }));
  await openSection(page, 'Your money');
  const m = (await sheetText(page)).match(/sized for (\d+–\d+) guests/);
  expect(m).not.toBeNull();
  await openSection(page, 'Guests');
  expect(await sheetText(page)).toContain(`sized for ${m[1]} on the day`);
});
