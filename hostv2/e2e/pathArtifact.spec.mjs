// ─── THE PATH ARTIFACT'S "HIDE COMPLETED" TOGGLE ────────────────────────────
//
// The path-artifact skill requires this control on every path artifact, and
// names one assertion as the one that matters:
//
//   "A NOT RUN item is never hidden. It renders as a recorded marker, so the
//    naive selector catches it — and hiding it buries exactly the finding the
//    artifact exists to surface. This is the one thing to test."
//
// A path artifact grows monotonically: passed gates never leave the page. So
// the toggle is what keeps a long record readable — and the failure mode it
// invites is hiding the findings along with the wins.
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const PAGE = pathToFileURL(
  path.resolve(process.cwd(), '../docs/artifact/the-first-recorded-gate.html'),
).href;

const state = (page) => page.evaluate(() => {
  const vis = (e) => !e.hidden && e.offsetParent !== null;
  const li = [...document.querySelectorAll('.items li')];
  const box = (x) => x.querySelector('input[type=checkbox][data-k]');
  return {
    notRunTotal:   li.filter((x) => x.querySelector('.mark.skip')).length,
    notRunVisible: li.filter((x) => x.querySelector('.mark.skip') && vis(x)).length,
    lockedTotal:   li.filter((x) => x.querySelector('input[disabled]')).length,
    lockedVisible: li.filter((x) => x.querySelector('input[disabled]') && vis(x)).length,
    recordedVisible: li.filter((x) => x.querySelector('.mark.ok') && vis(x)).length,
    tickedVisible:   li.filter((x) => box(x)?.checked && vis(x)).length,
    untickedTotal:   li.filter((x) => box(x) && !box(x).checked).length,
    untickedVisible: li.filter((x) => box(x) && !box(x).checked && vis(x)).length,
    emptyCards: [...document.querySelectorAll('.stage')].filter((c) =>
      !c.hidden
      && c.querySelectorAll('.items li').length > 0
      && [...c.querySelectorAll('.items li')].every((l) => l.hidden)).length,
    count: document.getElementById('hideCount').textContent.trim(),
  };
});

test.describe('path artifact — hide completed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('defaults to OFF, hiding nothing', async ({ page }) => {
    // Default-on would mean a first-time reader lands on a page that looks
    // emptier than the record actually is.
    await expect(page.locator('#hideDone')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.locator('.items li[hidden]').count()).toBe(0);
  });

  test('hides completed work and NOTHING else', async ({ page }) => {
    const boxes = page.locator('input[type=checkbox][data-k]');
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await page.locator('#hideDone').click();

    const s = await state(page);

    // THE assertion the skill names.
    expect(s.notRunTotal).toBeGreaterThan(0);            // the probe is real
    expect(s.notRunVisible).toBe(s.notRunTotal);

    expect(s.lockedVisible).toBe(s.lockedTotal);         // unreached, not done
    expect(s.untickedVisible).toBe(s.untickedTotal);     // open work stays put
    expect(s.recordedVisible).toBe(0);                   // recorded passes go
    expect(s.tickedVisible).toBe(0);                     // ticked items go
    expect(s.emptyCards).toBe(0);                        // never an empty card
    expect(s.count).toMatch(/\d+ completed items? hidden/);
  });

  test('survives a reload, and toggling off restores every row', async ({ page }) => {
    await page.locator('input[type=checkbox][data-k]').first().check();
    await page.locator('#hideDone').click();
    await page.reload();

    await expect(page.locator('#hideDone')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('input[type=checkbox][data-k]').first()).toBeChecked();

    await page.locator('#hideDone').click();
    expect(await page.locator('.items li[hidden]').count()).toBe(0);
  });
});
