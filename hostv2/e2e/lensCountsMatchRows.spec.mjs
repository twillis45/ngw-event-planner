// ─── A COUNT ON A CHIP IS A PROMISE ABOUT THE ROWS UNDER IT ──────────────────
//
// The ninth re-score left Design at 9 on this: the vendor toolbar's
// "Everyone N" counted every matching vendor while the DEFAULT lens partitions
// settled vendors into a collapsed fold, so the number sat above fewer cards
// the moment anything was settled. The re-score also named the red-proof that
// had never been run -- seed a settled vendor first -- because ev-x-wanda has
// none, which is the only reason the fault was invisible.
//
// The leaders settle the shape: Linear, Plane, ClickUp and Asana all put a
// count on a GROUP and none on "all". So "Everyone" now carries no number, and
// every remaining chip must equal the rows its lens actually renders.
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
};

const openVendors = async (page) => {
  const rail = page.locator('.srail-row', { hasText: /People you/ });
  if (await rail.count()) { await rail.first().click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText(/People you/).first().click();
  }
  await settled(page);
};

test.describe('lens chips state the truth about their rows', () => {
  test('"Everyone" carries no count, because it is not a group', async ({ page }) => {
    await boot(page);
    await openVendors(page);
    const chips = page.locator('.rtool-lens .chip');
    if (!(await chips.count())) test.skip(true, 'toolbar renders only past six vendors');

    const everyone = chips.filter({ hasText: 'Everyone' }).first();
    await expect(everyone).toHaveCount(1);
    const label = ((await everyone.textContent()) || '').trim();
    // The precise fault: a bare trailing number on the all-lens chip.
    expect(label, `"Everyone" still carries a count: ${JSON.stringify(label)}`).toBe('Everyone');
  });

  test('every OTHER chip equals the rows its own lens renders', async ({ page }) => {
    await boot(page);
    await openVendors(page);
    const chips = page.locator('.rtool-lens .chip');
    if (!(await chips.count())) test.skip(true, 'toolbar renders only past six vendors');

    const labels = await chips.allTextContents();
    let checked = 0;
    for (const raw of labels) {
      const text = raw.trim();
      const m = /(\d+)$/.exec(text);
      if (!m) continue;                       // "Everyone" — covered above
      const claimed = Number(m[1]);
      await chips.filter({ hasText: text.replace(/\s+\d+$/, '') }).first().click();
      await settled(page);
      await page.waitForTimeout(250);
      // Rows the host can actually reach in this lens: the cards on screen,
      // plus any the settled fold is holding (the fold states its own count).
      const cards = await page.locator('.vcard').count();
      const foldText = (await page.locator('.fold-btn').first().textContent().catch(() => '')) || '';
      const folded = Number((/^\s*(\d+)\s+settled/.exec(foldText) || [])[1] || 0);
      expect(cards + folded,
        `chip "${text}" claims ${claimed} but its lens reaches ${cards} card(s) + ${folded} folded`)
        .toBe(claimed);
      checked += 1;
    }
    expect(checked, 'no counted chip was exercised — this test proved nothing').toBeGreaterThan(0);
  });

  // THE SAME FAULT, ONE SCREEN OVER, AND UNGATED. The vendor toolbar counts
  // after the search; the guest roster counted the raw array while its rows
  // were search-filtered, so typing a name left "Coming 24" above two people.
  // Reintroducing that fault and running the existing roster spec passed --
  // nothing covered it -- which is why this lives here.
  test('guest chips count what the search left, not the whole list', async ({ page }) => {
    await boot(page);
    const rail = page.locator('.srail-row', { hasText: /Guest|People coming/i });
    if (await rail.count()) { await rail.first().click(); await settled(page); }
    const bar = page.locator('.rtoolbar').last();
    if (!(await bar.count())) test.skip(true, 'roster toolbar renders only past eight guests');

    const q = bar.locator('.rtool-q');
    if (!(await q.count())) test.skip(true, 'no search field on this roster');
    // COUNT FIRST -- `.innerText()` on a locator matching nothing waits out the
    // whole timeout rather than throwing, so a `.catch()` never runs and the
    // test dies at 30s. This spec hit that on its first run; the vendor spec
    // already carries the same warning.
    const nameLoc = page.locator('.rrow-name, .vc-name');
    if (!(await nameLoc.count())) test.skip(true, 'no guest row to read a name from');
    const firstName = ((await nameLoc.first().innerText()) || '').trim().split(/\s+/)[0];
    if (!firstName) test.skip(true, 'guest row has no readable name');

    await q.fill(firstName);
    await settled(page);
    await page.waitForTimeout(200);

    const rows = await page.locator('.rrow, .vcard').count();
    const nums = [];
    for (const t of await bar.locator('.chip').allTextContents()) {
      const m = /(\d+)\s*$/.exec(t.trim());
      if (m) nums.push(Number(m[1]));
    }
    expect(nums.length, 'no counted chip on the roster — nothing was proved').toBeGreaterThan(0);
    const total = nums.reduce((a, b) => a + b, 0);
    expect(total,
      `roster chips total ${total} while the search left ${rows} row(s) — the chips are quoting the unfiltered list`)
      .toBe(rows);
  });
});
