// ─── FAMILY SEES THE PLAN, READ-ONLY (owner, 11/16/2026) ────────────────────
// ?family=CODE shows when/where, replies, the day, the checklist and who's
// hired — with nothing to change, and never a guest's name or any money (the
// server never sends them; backend/tests/test_family_view.py pins that). A
// link that was turned off says so. A signed-out host is told to keep the plan
// first, and gets no link.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'fam-' + 'b'.repeat(28);
const PLAN = {
  name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2026-11-21', startTime: '16:00', hostNames: 'Vida Ramos',
  venue: 'Pine Street Commons', venueCity: 'Alexandria', venueState: 'VA', hashtag: '#VidasFriendsgiving2026',
  replies: { yes: 12, no: 2, maybe: 1, waiting: 3 }, dressCode: 'Fall colors, comfy shoes',
  ros: [{ time: '16:00', label: 'Doors open' }, { time: '17:30', label: 'Dinner' }], rosEdited: true,
  checklist: [{ task: 'Order the turkey', done: true }, { task: 'Borrow 8 chairs', done: false }],
  vendors: [{ name: 'Harvest Table Catering', category: 'Catering', status: 'Booked' }, { name: 'Pie Shop', category: 'Bakery', status: 'Considering' }],
};

// The server's REAL family view of the fictional Wanda sample (audit lane E,
// P0-2): backend/tests/test_family_view_privacy.py pins that this file equals
// family_projection() of that sample, so the page is tested on what it gets.
const WANDA = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'wandaFamilyPlan.json'), 'utf8'));

const open = async (page, status = 200, plan = PLAN) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/api/public/family/${CODE}`, (r) => r.fulfill(status === 200 ? { status, json: { ok: true, plan } } : { status, json: { detail: 'not found' } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?family=' + CODE);
};

test('family sees the plan, and there is nothing to change', async ({ page }) => {
  await open(page);
  const page_ = page.locator('[data-surface="family-view-v2"]');
  await expect(page_).toBeVisible();
  await expect(page_.locator('h1')).toHaveText('Vida’s Friendsgiving');
  await expect(page_.locator('[data-family="where"]')).toContainText('Pine Street Commons');
  // Replies, not people (audit 2 E P2-1, 11/22/2026): a reply that brings a
  // plus-one is still one reply, so the line says who said yes, not "12 coming".
  await expect(page_.locator('[data-family="replies"]')).toHaveText('12 said yes · 1 maybe · 2 can’t make it · 3 haven’t replied');
  // The dress code the invite shows is on the family page too (E P2-7).
  await expect(page_.locator('[data-family="dress"]')).toHaveText('Dress: Fall colors, comfy shoes');
  await expect(page_.locator('[data-family="day"] li')).toHaveText(['4:00 PMDoors open', '5:30 PMDinner']);
  await expect(page_).toContainText('The checklist · 1 of 2 ticked off');
  await expect(page_.locator('[data-family="vendors"] li')).toHaveText([/Harvest Table Catering.*Booked/, /Pie Shop.*Not booked yet/]);
  await expect(page_.locator('[data-family="note"]')).toContainText('View only');
  // Read-only: no buttons, no fields, nothing to submit.
  await expect(page_.locator('button, input, textarea, select, form')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/\$\d/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('the Wanda plan keeps the footer’s promise: no money, no guest names, no helper among the hires', async ({ page }) => {
  await open(page, 200, WANDA);
  const page_ = page.locator('[data-surface="family-view-v2"]');
  await expect(page_.locator('[data-family="note"]')).toContainText('Guest names, contact details and money aren’t shared here.');
  // The plan is still there to read, minus its private clauses.
  await expect(page_.locator('[data-family="day"]')).toContainText('Army retirement presentation');
  await expect(page_.locator('[data-family="checklist"]')).toContainText('Lock catering');
  await expect(page_).toContainText('The checklist · 1 of 4 ticked off');
  await expect(page_.locator('[data-family="vendors"] li')).toHaveText([/VFW Post 1847.*Booked/, /Semper Catering.*Not booked yet/, /DJ Marcus Kane.*Booked/]);
  const words = await page_.innerText();
  expect(words).not.toMatch(/\$|budget|4604|Grazin/i);
  // Every guest or helper by first name; the DJ's business name is not a guest.
  for (const name of ['Cory', 'Gloria', 'Nia', 'Diane', 'Vida', 'Haynes']) expect(words).not.toContain(name);
  expect(words.replace('DJ Marcus Kane', '')).not.toContain('Marcus');
});

// Audit 2, lane E (P1-1, P0-4, D-13): every day of a multi-day plan, the host
// by hostNameFor's rule (the server sends hostName), and a private home by its
// town, the way family_view.py sends it (no street parts).
test('a weekend at home reads every day, its host, and the town only', async ({ page }) => {
  await open(page, 200, {
    name: 'Reed Cookout Weekend', type: 'Family Reunion', date: '2027-06-11', endDate: '2027-06-13', startTime: '17:00',
    hostName: 'Dana Reed', venue: 'Our place', venueKind: 'home', venueCity: 'Bowie', venueState: 'MD',
    checklist: [{ task: 'Borrow chairs', done: false }],
  });
  const page_ = page.locator('[data-surface="family-view-v2"]');
  await expect(page_.locator('[data-family="when"]')).toHaveText('Friday, June 11 – Sunday, June 13 · 5:00 PM');
  await expect(page_.locator('[data-family="where"]')).toHaveText('Our place · Bowie, MD');
  await expect(page_.locator('[data-family="note"]')).toContainText('Dana Reed keeps the plan');
  await expect(page_).toContainText('The checklist · 0 of 1 ticked off');
});

test('a link that was turned off says so', async ({ page }) => {
  await open(page, 404);
  await expect(page.getByRole('heading', { name: 'This link isn’t live anymore' })).toBeVisible();
});

test('a signed-out host is told to keep the plan first, and gets no link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ id: 'cust-fam', name: 'Fam test', type: 'Friendsgiving', date: '2027-11-20', guests: [], vendors: [], budget: [], timeline: [] }]));
    localStorage.setItem('ngw-hostv2-last-event', 'cust-fam');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Share with family');
  const sheet = page.locator('[data-family-link]');
  await expect(sheet).toContainText('Guest names or contact details, any money, or your notes.');
  await expect(sheet.locator('[data-family-signed-out]')).toBeVisible();
  await expect(sheet.locator('[data-family-on], [data-family-url]')).toHaveCount(0);
});
