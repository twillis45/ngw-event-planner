// ─── THE DEMO SHOWS WHAT IT SAYS (owner's iOS Simulator demo, 11/16/2026) ────
//
// The owner ran ?demo=1 → Seed / reset on an iPhone 17 Pro simulator against
// the live site and listed what went wrong. This drives the same seeded event
// at the same width (402px) and pins each finding:
//   · "Send Dana the details" seemed to do nothing — the result rendered off
//     screen while the page jumped to the empty phone/email fields;
//   · home said "Vendors 1 of 6 confirmed" while hiring said "Booked 3 of 6";
//   · the seed had no helper, so the helper link could not be shown;
//   · the VFW card asked about insurance twice, the copy repeating its label;
//   · a "Take me there →" button; "Send Post the details" (a title, greeted by
//     its first word); "wedding party names" on a retirement party's DJ;
//   · the demo bar covered the "Next" bar and real buttons.
// The pure rules are pinned in src/lib/__tests__/theDemoReadsTrue.test.js;
// this proves the shell. Synthetic data only (the demo seed).
import { test, expect, settled, openSectionByName, revealChecklistStep } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'abcdefghij1234567890xy';

const seeded = async (page) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.route(`${API}/api/events/*/vendor-brief-links`, (route) => route.fulfill({ status: 200, json: { ok: true, code: CODE } }));
  await page.goto('?demo=1&elegant=1');
  await settled(page);
  await page.locator('button', { hasText: /^Seed \/ reset$/ }).click();
  await settled(page);
};

const card = (page, name) => page.locator('.vcard', { hasText: name }).first();
const openCard = async (page, name) => {
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  await card(page, name).evaluate((c) => c.click());
  await page.waitForTimeout(400);
};

test('the demo bar closes to a tab after Seed, and covers nothing', async ({ page }) => {
  await seeded(page);
  await expect(page.locator('button', { hasText: /^Seed \/ reset$/ })).toHaveCount(0);
  const tab = page.locator('[data-demo-bar="closed"]');
  await expect(tab).toBeVisible();
  const box = await tab.boundingBox();
  expect(box.x).toBe(0);
  expect(box.width).toBeLessThanOrEqual(14);
  // A reload keeps it closed (live shots, 11/16/2026: it reopened over the
  // page's own buttons after every reload).
  await page.reload();
  await settled(page);
  await expect(page.locator('[data-demo-bar="closed"]')).toBeVisible();
  await expect(page.locator('button', { hasText: /^Seed \/ reset$/ })).toHaveCount(0);
  // and it opens again on tap
  await page.locator('[data-demo-bar="closed"]').click();
  await expect(page.locator('button', { hasText: /^Seed \/ reset$/ })).toBeVisible();
});

test('home counts vendors the way the hiring screen does', async ({ page }) => {
  await seeded(page);
  await expect(page.locator('[data-who-part="vendors"]')).toHaveText('Vendors 1 of 6 confirmed · 3 booked');
});

test('the seeded checklist has a helper with a job to confirm', async ({ page }) => {
  await seeded(page);
  await openSectionByName(page, 'Your checklist');
  await settled(page);
  // The step's controls live inside it, opened in place, or on Up next
  // (cohesion batch D, 11/24/2026).
  await revealChecklistStep(page, 'Bring the shadow box and flag case');
  await expect(page.getByText('Bring the shadow box and flag case').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Mark Renee Carter confirmed/ })).toBeVisible();
});

test('"Send Dana the details" brings the message into view', async ({ page }) => {
  await seeded(page);
  await openCard(page, 'Capital Rotisserie');
  await card(page, 'Capital Rotisserie').getByRole('button', { name: 'Send Dana the details', exact: true }).click();
  const panel = page.locator('[data-vbrief-panel]');
  await expect(panel.locator('[data-send-details-body]')).toContainText('Hi Dana');
  await expect(panel).toBeInViewport({ ratio: 0.5 });
});

test('the VFW card: one insurance row, said once, and buttons that say where they go', async ({ page }) => {
  await seeded(page);
  await openCard(page, 'VFW Post 3150');
  const vfw = card(page, 'VFW Post 3150');
  await expect(vfw.locator('[id^="v-coi-"]')).toHaveCount(1);
  const text = await vfw.innerText();
  expect(text).not.toMatch(/Ask about insurance — Ask about insurance/);
  expect(text).not.toMatch(/Take me there/);
  await expect(vfw.getByRole('button', { name: 'Send Post Quartermaster the details', exact: true })).toBeVisible();
  expect(text).not.toMatch(/Send Post the details/);
});

test('no wedding words on a retirement party’s DJ', async ({ page }) => {
  await seeded(page);
  await openCard(page, 'Beltway Sound');
  expect(await card(page, 'Beltway Sound').innerText()).not.toMatch(/wedding|first dance/i);
});

// Live hunt item 8: the card face read the stored 24-hour clock, "arrives 14:30".
test('arrival times read as a clock a host uses: "arrives 2:30 PM"', async ({ page }) => {
  await seeded(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const cat = card(page, 'Capital Rotisserie');
  await expect(cat.locator('.vc-cat')).toContainText('arrives 2:30 PM');
  expect(await page.locator('.sheet').innerText()).not.toMatch(/arrives 1\d:\d\d\b/);
});

// #130: the insurance ask once, with exactly one "Mark asked" on the card.
test('the caterer card asks about insurance once, with one "Mark asked"', async ({ page }) => {
  await seeded(page);
  await openCard(page, 'Capital Rotisserie');
  const cat = card(page, 'Capital Rotisserie');
  await expect(cat.getByRole('button', { name: /^Mark asked$/ })).toHaveCount(1);
  const t = await cat.innerText();
  expect((t.match(/Ask about insurance/g) || []).length).toBeLessThanOrEqual(1);
});
