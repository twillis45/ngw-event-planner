// ─── THE DEAD THIRD, AND THE HUNT ───────────────────────────────────────────
//
// Two vendors-ruling items. Clause 6: at desktop a third of the sheet's width
// did nothing while an opened vendor pushed every card below it down the page.
// Sequence item 5: past about a dozen vendors a host stops reading the list and
// starts hunting through identical cards.
//
// Both are geometry and behavior claims, the class this repo has been burned on
// by reading CSS instead of measuring: a rule can be present and beaten, scoped
// to the wrong ancestor, or overridden a thousand lines later. All measured on
// a live drive.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('?elegant=1');
  await settled(page);
  const rail = page.locator('.srail-row', { hasText: /People you/ });
  if (await rail.count()) { await rail.first().click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText(/People you/).first().click();
  }
  await settled(page);
};

test.describe('the desktop detail panel', () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'the dead third only exists at desktop');

  test('an opened card puts its detail BESIDE its face, not below it', async ({ page }) => {
    await boot(page);
    const cards = page.locator('.vcard');
    expect(await cards.count()).toBeGreaterThan(1);

    await cards.first().click();
    await settled(page);
    await page.waitForTimeout(500);

    const box = await page.locator('.vcard.open').first().evaluate((card) => {
      const head = card.querySelector('.vc-head');
      const more = card.querySelector('.vc-more');
      if (!head || !more) return null;
      const h = head.getBoundingClientRect();
      const m = more.getBoundingClientRect();
      return { headRight: h.right, moreLeft: m.left, moreTop: m.top, headTop: h.top, moreW: m.width };
    });
    expect(box, 'the open card has no detail region').not.toBeNull();
    // BESIDE: the detail starts right of where the face ends, and its top is
    // level with the face rather than stacked under it.
    expect(box.moreLeft).toBeGreaterThanOrEqual(box.headRight - 1);
    expect(Math.abs(box.moreTop - box.headTop)).toBeLessThan(60);
    expect(box.moreW).toBeGreaterThan(240);
  });

  test('it is ON-DEMAND — a closed list is a single column', async ({ page }) => {
    // The ruling was explicit that this must never become a permanent third
    // pane. Without this, a rule that widened every card would pass the test
    // above and quietly change the resting sheet.
    await boot(page);
    // HEIGHT, not width. A `max-height:0; overflow:hidden` element still has
    // its full layout WIDTH -- only its height is clipped -- so the first
    // version of this asserted zero width on a perfectly closed panel and
    // failed. What "closed" means here is that it occupies no vertical space
    // and no column is reserved for it.
    const box = await page.locator('.vcard').first().evaluate((c) => {
      const m = c.querySelector('.vc-more');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      return { h: r.height, cols: getComputedStyle(c).gridTemplateColumns };
    });
    expect(box.h).toBe(0);
    // ...and the card is not a two-column grid while it is shut.
    expect(box.cols === 'none' || box.cols === '' || !box.cols.includes(' ')).toBe(true);
  });
});

test.describe('the vendor toolbar', () => {
  test('a lens narrows the list and states its own count', async ({ page }) => {
    await boot(page);
    const bar = page.locator('.rtoolbar').last();
    if (!(await bar.count())) test.skip(true, 'fewer than 6 vendors — the toolbar is deliberately absent');

    const before = await page.locator('.vcard').count();
    const chip = bar.locator('.chip', { hasText: /Settled/ }).first();
    const claimed = parseInt(((await chip.innerText()).match(/(\d+)\s*$/) || [])[1], 10);
    await chip.click();
    await settled(page);
    const after = await page.locator('.vcard').count();

    // THE CHIP'S NUMBER IS A PROMISE. A lens that says 3 and shows 5 is worse
    // than no lens, because the host stops trusting every other count too.
    expect(after).toBe(claimed);
    expect(after).toBeLessThanOrEqual(before);
  });

  test('search narrows by name, and clearing restores', async ({ page }) => {
    await boot(page);
    const bar = page.locator('.rtoolbar').last();
    if (!(await bar.count())) test.skip(true, 'fewer than 6 vendors');

    const all = await page.locator('.vcard').count();
    const firstName = (await page.locator('.vcard .vc-name').first().innerText()).trim().split(/\s+/)[0];
    await bar.locator('.rtool-q').fill(firstName);
    await settled(page);
    const narrowed = await page.locator('.vcard').count();
    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThanOrEqual(all);

    await bar.locator('.rtool-q').fill('');
    await settled(page);
    expect(await page.locator('.vcard').count()).toBe(all);
  });
});
