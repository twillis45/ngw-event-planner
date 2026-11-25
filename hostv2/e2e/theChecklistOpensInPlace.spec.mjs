// ─── THE CHECKLIST: ONE NEXT STEP, GROUPED BY WHEN, OPENED IN PLACE ──────────
//
// Cohesion batch D (audit 11/24/2026 #10 P1 and #33 P2; owner D1–D5 approved
// 11/24/2026, renders/cohesion-d on renders/cohesion-defg). The Wanda sample's
// checklist was 41 steps in one unlabeled list with ~126 buttons and no lit
// next step; the host was asked to tell and confirm herself.
//
// On the Wanda sample (116 days out), at 390, 834, 1024 and 1440:
//   1. exactly one lit action, on the "Up next" card;
//   2. the steps sit in groups by when, in date order, each group's dates
//      said once (no two group labels share a date);
//   3. only the current group is open, the rest are one folded row each;
//   4. a tap on a row opens that step in place, directly under it, and does
//      not check it off;
//   5. the check is its own target, at least 44×44;
//   6. a step the host holds reads "Yours", and nothing asks her to tell or
//      confirm herself ("Mark Wanda confirmed", "Wanda — not told yet").
//
// SELF-PINNED (playwright.config.mjs): it walks its own four widths.
import { test, expect, settled, sheetSettled, openSectionByName } from './fixtures.mjs';

const WIDTHS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1440, 900, false]];

const litButtons = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  const sh = [...document.querySelectorAll('.sheet')].pop();
  return [...sh.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('[inert], [aria-hidden="true"]')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => e.innerText.trim());
};

for (const [w, h, touch] of WIDTHS)
test(`the checklist has one next step, groups by when and opens in place — ${w}x${h}`, async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 500 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-24T10:00:00'));
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist', { settle: 600 });
  await sheetSettled(page);
  const sheet = page.locator('.sheet').last();

  // 1. One lit action, and it is on the Up next card.
  expect(await page.evaluate(litButtons)).toHaveLength(1);
  await expect(sheet.locator('[data-up-next] .cta')).toHaveCount(1);

  // 2. Groups in date order; each group's dates said once.
  const phases = await sheet.locator('[data-phase]').evaluateAll((els) => els.map((e) => ({
    key: e.getAttribute('data-phase'), start: e.getAttribute('data-phase-start') || '', open: e.getAttribute('data-open') === 'true',
    label: (e.querySelector('[data-phase-label]') || e).innerText.split('\n')[0].trim(),
  })));
  expect(phases.length, 'premise: the steps are grouped').toBeGreaterThan(2);
  const dated = phases.filter((p) => p.start);
  expect(dated.map((p) => p.start)).toEqual([...dated.map((p) => p.start)].sort());
  const dates = phases.flatMap((p) => p.label.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}\b/g) || []);
  expect(new Set(dates).size, `each date once: ${dates.join(', ')}`).toBe(dates.length);

  // 3. Only the current (first) group is open.
  expect(phases.filter((p) => p.open).map((p) => p.key)).toEqual([phases[0].key]);

  // 4 and 5. The row opens in place under itself; the check is its own 44px box.
  const row = sheet.locator('[data-phase][data-open="true"] [data-step-row]').first();
  const check = row.locator('[data-step-check]');
  const box = await check.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const checkedOff = async () => ((await sheet.innerText()).match(/\b(\d+) of (\d+)\b/) || [''])[0];
  const heroBefore = await checkedOff();
  expect(heroBefore, 'premise: the hero counts checked-off steps').toMatch(/of 41/);
  await row.locator('[data-step-body]').click();
  await expect(row.locator('[data-step-body]')).toHaveAttribute('aria-expanded', 'true');
  const opened = row.locator('[data-step-open]');
  await expect(opened).toBeVisible();
  expect(await row.evaluate((r) => {
    const body = r.querySelector('[data-step-body]').getBoundingClientRect();
    const open = r.querySelector('[data-step-open]').getBoundingClientRect();
    return open.top >= body.bottom - 1 && open.top - body.bottom < 40;
  }), 'the step opens directly under its row').toBe(true);
  const heroAfter = await checkedOff();
  expect(heroAfter, 'opening a step does not check it off').toBe(heroBefore);

  // 6. The host's own steps read "Yours"; she is never asked to tell or confirm
  // herself. Every folded group is opened first, so every row is on screen.
  for (let n = await sheet.locator('[data-phase][data-open="false"] [data-phase-toggle]').count(); n > 0; n -= 1) {
    await sheet.locator('[data-phase][data-open="false"] [data-phase-toggle]').first().click();
  }
  await expect(sheet.locator('[data-phase][data-open="false"]')).toHaveCount(0);
  const text = await sheet.innerText();
  expect(text).toMatch(/\bYours\b/);
  expect(text).not.toMatch(/Mark Wanda confirmed/);
  expect(text).not.toMatch(/Wanda — not told yet/);
  await ctx.close();
});
