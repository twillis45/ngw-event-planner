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
    // FOUR STATES since the 2026-11-02 retrofit (Step 6e): a recorded pass is
    // a box that is CHECKED and DISABLED; unreached is disabled and unchecked;
    // owed is a live box; a note (.mark.skip) is never a box. Before that,
    // a recorded pass was static `.mark.ok` text and these selectors read it.
    notRunTotal:   li.filter((x) => x.querySelector('.mark.skip')).length,
    notRunVisible: li.filter((x) => x.querySelector('.mark.skip') && vis(x)).length,
    lockedTotal:   li.filter((x) => x.querySelector('input:disabled:not(:checked)')).length,
    lockedVisible: li.filter((x) => x.querySelector('input:disabled:not(:checked)') && vis(x)).length,
    recordedTotal:   li.filter((x) => x.querySelector('input:disabled:checked')).length,
    recordedVisible: li.filter((x) => x.querySelector('input:disabled:checked') && vis(x)).length,
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

    expect(s.recordedTotal).toBeGreaterThan(0);          // recorded passes ARE boxes now
    expect(s.lockedVisible).toBe(s.lockedTotal);         // unreached, not done
    expect(s.untickedVisible).toBe(s.untickedTotal);     // open work stays put
    expect(s.recordedVisible).toBe(0);                   // recorded passes go
    expect(s.tickedVisible).toBe(0);                     // ticked items go
    expect(s.emptyCards).toBe(0);                        // never an empty card
    expect(s.count).toMatch(/\d+ completed items? hidden/);
  });

  // ── STEP 6e: A PASSED STAGE NEVER READS AS UNTOUCHED ON A FIRST LOAD ──────
  // The failure path-artifact rule 5 was written about: localStorage starts
  // empty, so a first-time viewer saw a PASSED chip over a column of unticked
  // boxes. With nothing stored, every card whose chip says passed must show at
  // least one CHECKED box, and every stage card must carry its ratio line.
  test('with storage empty, every passed card shows handled boxes and a ratio', async ({ page }) => {
    const cards = await page.evaluate(() => [...document.querySelectorAll('.ladder:not(.mktg) .stage')].map((c) => ({
      n: c.querySelector('.sn').textContent.trim(),
      chip: (c.querySelector('.chip') || {}).textContent || '',
      handled: c.querySelectorAll('.items input:disabled:checked').length,
      ratio: ((c.querySelector('[data-ratio]') || {}).textContent || '').trim(),
    })));
    expect(cards).toHaveLength(11);                       // stages 0 through 10
    for (const c of cards) {
      expect(c.ratio, `stage ${c.n} has no ratio line`).not.toBe('');
      if (/passed/i.test(c.chip)) expect(c.handled, `stage ${c.n} says ${c.chip} with nothing handled`).toBeGreaterThan(0);
    }
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
