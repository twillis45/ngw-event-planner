// ─── WANDA'S OWN NIGHT (audit of ev-x-wanda, 11/22/2026) ─────────────────────
//
// Driven on the sample itself, at the phone width the audit used. Engine proof
// for each finding: src/lib/__tests__/wandaScheduleVenueInvite.test.js; the
// family link's surprise filter: backend/tests/test_family_view.py.
//   P0-4  her run of show wins; playbook beats are suggestions she adds
//   P0-5  "Travel & where everyone stays" opens her stays, not an empty demo
//   P0-14 Space does not ask for the address the board calls settled
//   P1-2  the Venue sheet does not re-ask "home or venue" for a booked hall
//   P1-9  Make it yours opens on her story and meaning
//   P1-15 no risk asks for the dress code she set
//   Ceremony: asked once (owner, "Ask once"); Surprise: marked rows (owner)
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().slice(0, 50);
}, src);

const openWanda = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

const openAgenda = async (page) => {
  await openWanda(page);
  await tapText(page, '^The Day$');
  await page.waitForTimeout(1200);
  await settled(page);
  await tapText(page, '^Full agenda$');
  await page.waitForTimeout(800);
  await settled(page);
};

test('P0-4: her rows stand as written, with no presumed ceremony and no "Host" stamp', async ({ page }) => {
  await openAgenda(page);
  const agenda = (await page.locator('.agenda').innerText()).replace(/\s+/g, ' ');
  expect(agenda).toMatch(/Army retirement presentation — Marcus \(brother\)/);
  expect(agenda).toMatch(/Wardrobe change — Wanda returns in the gold dress/);
  expect(agenda).toMatch(/6:30 PM/);
  expect(agenda).not.toMatch(/Colors/);
  expect(agenda).not.toMatch(/· Host\b/);
  expect(agenda).not.toMatch(/2:30 PM/);
});

test('P0-4: the playbook suggests, and one tap adds a beat to her night', async ({ page }) => {
  await openAgenda(page);
  const box = page.locator('[data-ros-suggestions]');
  await expect(box).toContainText('Add to your night?');
  const first = box.locator('[data-ros-suggestion]').first();
  const label = (await first.locator('span').nth(1).innerText()).trim();
  const before = await page.locator('.agenda [data-ros-id]').count();
  await first.getByRole('button', { name: /^Add to your night/ }).click();
  await settled(page);
  await expect(page.locator('.agenda [data-ros-id]')).toHaveCount(before + 1);
  await expect(page.locator('.agenda')).toContainText(label.slice(0, 30));
});

test('Surprise: the singer is marked, and a row can be marked', async ({ page }) => {
  await openAgenda(page);
  const singer = page.locator('.agenda [data-ros-id]', { hasText: 'church singer' });
  await expect(singer.locator('[data-ros-surprise]')).toHaveAttribute('aria-pressed', 'true');
  const dinner = page.locator('.agenda [data-ros-id]', { hasText: 'Buffet dinner' });
  await dinner.locator('[data-ros-surprise]').click();
  await settled(page);
  await expect(page.locator('.agenda [data-ros-id]', { hasText: 'Buffet dinner' }).locator('[data-ros-surprise]'))
    .toHaveAttribute('aria-pressed', 'true');
});

test('Ceremony: one question, in her event’s words; no generic timing ask', async ({ page }) => {
  // The audit's own steps: settle the food, then the allergy ask; the next
  // ask was "Ceremony Timing". Rendering a blocker's options on the hero is
  // the hero lane's fix (wt-w1); this holds the question itself.
  await openWanda(page);
  for (const label of [/^Drop-off catering/, /That’s everyone — noted/]) {
    const b = page.locator('button').filter({ hasText: label }).first();
    if (await b.count()) { await b.click(); await settled(page); await page.waitForTimeout(600); }
  }
  const t = await bodyText(page);
  expect(t).toMatch(/Is the official Army retirement ceremony part of this party, or held separately\?/);
  expect(t).not.toMatch(/Ceremony Timing/);
  expect(t).not.toMatch(/When does the ceremony happen\?/);
});

test('P0-5: Travel & where everyone stays opens her stays', async ({ page }) => {
  await openWanda(page);
  await openSectionByName(page, 'Travel & where everyone stays');
  await settled(page);
  expect(page.url()).not.toMatch(/demo=lodging/);
  const stays = page.locator('[data-lodging-stays]');
  await expect(stays).toContainText('4604 Grazin Way, Upper Marlboro, MD');
  await expect(stays).toContainText('Wanda’s Mom (Gloria)');
  expect(await bodyText(page)).not.toMatch(/Santa Fe example/);
});

test('P0-14: Space does not ask for an address the board calls handled', async ({ page }) => {
  await openWanda(page);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  const t = await bodyText(page);
  expect(t).not.toMatch(/Add the address so guest directions are exact/);
  expect(t).toMatch(/Guests are sent to Freedom Hall at VFW Post 1847/);
});

test('P1-2: the Venue sheet does not re-ask about a booked hall, and Save is not lit', async ({ page }) => {
  await openWanda(page);
  await openSectionByName(page, 'Venue');
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('Freedom Hall at VFW Post 1847 · Upper Marlboro, MD');
  await expect(sheet).not.toContainText('Is this a private home, or a venue?');
  await expect(sheet.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
});

test('P1-9: Make it yours opens on her story and meaning', async ({ page }) => {
  await openWanda(page);
  await openSectionByName(page, 'Make it yours');
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet.getByLabel('Their story, in a line or two')).toHaveValue('30 years in the Army, turning 50');
  await expect(sheet.getByLabel('Why this matters')).toHaveValue(/^Thirty years of Army service/);
  await expect(sheet.getByRole('button', { name: 'Save it' })).toBeDisabled();
  await expect(sheet).toContainText('If the official ceremony is part of this party, it runs roughly:');
  await expect(sheet).not.toContainText('32 years at the library');
});

test('P1-15: no risk asks for the dress code she set', async ({ page }) => {
  await openWanda(page);
  await openSectionByName(page, 'What could go wrong');
  await settled(page);
  expect(await bodyText(page)).not.toMatch(/Clarity on dress code/);
});
