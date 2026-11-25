// ─── AFTER: ONE LIT ACTION, NOTHING OUT IN ONE TAP, AND SHE LANDS THERE ──────
//
// Cohesion batch E (audit 11/24/2026 #11, #12, #29, #30, #34; owner E1–E4
// "yes to all" 11/24/2026; renders/cohesion-e on renders/cohesion-defg).
//   1. The After stage has exactly one lit button: "Write the thank-yous",
//      the one door to the thank-you run (E1). "Draft the thank-you",
//      "Start the thank-you run" and "Write the recap" are gone as doors.
//   2. A guest row says "Mark thanked" (E3), a record that sends nothing; set,
//      it reads "✓ Thanked" and the toast offers Undo. No "thank them".
//   3. The recap never reaches the invite link in one tap (E2): "Preview what
//      guests see" shows it marked "nothing is published yet", and only
//      "Put it on the invite link" writes it.
//   4. The order is check, act, share, follow up (E4): How many came?, then
//      Thank-yous & gifts, then The recap for guests, then For next time.
//   5. Her own plan, after its day, opens on After (owner, 11/24/2026:
//      indefinitely); "foundation facts" and "wrap-up meter" are gone.
import { test, expect, settled, goToStage, dateIn } from './fixtures.mjs';

const litOnStage = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return [...document.querySelectorAll('.app button, .app a')].filter((e) => {
    if (e.closest('.sheet') || !e.getClientRects().length || e.closest('[inert], [aria-hidden="true"]')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => e.innerText.trim());
};

const PAST = {
  id: 'e2e-after-own', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', createdAt: '2026-10-01',
  date: dateIn(-2), startTime: '18:00', startTimeSource: 'host', venue: 'Elm Court Hall', venueAddress: '42 Elm Ct, Springfield, VA 22150',
  guestMode: 'list', guestEstimate: 3, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Jordan Hale', rsvp: 'Yes' },
    { id: 'g2', name: 'Dee Park', rsvp: 'Yes' },
    { id: 'g3', name: 'Sam Ortiz', rsvp: 'No' },
  ],
  vendors: [], budget: [], timeline: [],
};

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('her own plan, after its day, opens on After', async ({ page }) => {
  await boot(page, PAST);
  await expect(page.locator('[data-gift-log]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('How it landed.')).toBeVisible();
});

test('After has one lit button, the thank-yous, and one door to them', async ({ page }) => {
  await boot(page, PAST);
  await goToStage(page, 'After');
  await expect(page.locator('[data-gift-log]')).toBeVisible();
  expect(await page.evaluate(litOnStage)).toEqual(['Write the thank-yous']);
  for (const gone of ['Draft the thank-you', 'Start the thank-you run', 'Write the recap', 'thank them', 'Publish the recap']) {
    await expect(page.locator('.app').getByRole('button', { name: gone, exact: true })).toHaveCount(0);
  }
  const text = await page.locator('.app').innerText();
  expect(text).not.toMatch(/foundation fact|wrap-up meter/i);
  // check, act, share, follow up
  const order = ['How many came?', 'Thank-yous & gifts', 'The recap for guests', 'For next time'].map((h) => text.indexOf(h));
  expect(order.every((n) => n >= 0), JSON.stringify(order)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  // the one door opens the run
  await page.getByRole('button', { name: 'Write the thank-yous' }).click();
  await expect(page.locator('#sheet-title')).toHaveText('The thank-you run');
});

test('"Mark thanked" is a record: it sends nothing and can be undone', async ({ page }) => {
  await boot(page, PAST);
  await goToStage(page, 'After');
  const row = page.locator('[data-gift-row="g1"]');
  await row.getByRole('button', { name: 'Mark thanked' }).click();
  await expect(row.getByRole('button', { name: '✓ Thanked' })).toBeVisible();
  const toast = page.locator('.toast').first();
  await expect(toast).toContainText('Marked Jordan Hale thanked');
  await expect.poll(async () => (await stored(page)).guests[0].thankYouSent).toBe(true);
  await toast.getByRole('button', { name: /undo/i }).click();
  await expect.poll(async () => (await stored(page)).guests[0].thankYouSent || false).toBe(false);
  await expect(page.locator('.app')).toContainText('it sends nothing');
});

test('the recap is previewed before it goes on the invite link', async ({ page }) => {
  await boot(page, PAST);
  await goToStage(page, 'After');
  await page.getByLabel('A note to everyone').fill('What a night. Thank you all.');
  await page.getByRole('button', { name: 'Preview what guests see' }).click();
  const preview = page.locator('[data-recap-preview]');
  await expect(preview).toContainText('nothing is published yet');
  await expect(preview).toContainText('What a night. Thank you all.');
  expect((await stored(page)).recapNote || '').toBe('');
  await page.getByRole('button', { name: 'Put it on the invite link' }).click();
  await expect.poll(async () => (await stored(page)).recapNote).toBe('What a night. Thank you all.');
});
