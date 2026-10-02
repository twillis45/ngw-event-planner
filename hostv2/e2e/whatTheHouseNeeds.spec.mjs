// ── CONFIRM THE MUSTS BEFORE THE SEARCH, AND KNOW WHICH ONES FILTER ───────
// Host, 2026-10-02: "how are the musts chosen and shouldn't the host be able
// to confirm or add musts before search?"
//
// They could not. The control lived inline in HostShellV2 and LodgingCockpit
// had ZERO must-have references, while the cockpit's Go look tab is the screen
// carrying the three search doors. Worse, three of these are REAL query
// parameters — hottub -> amenities[]=25, pool -> amenities[]=7, pets -> pets=1
// — baked into the URLs those doors open. A host was having their search
// narrowed by a list they had never been shown.
//
// Nothing covered this control anywhere in e2e before this file, which is how
// ~90 lines of it could be extracted with nothing to catch a mistake.
import { test, expect, settled } from './fixtures.mjs';

const DEMO = './?demo=lodging';

const goLook = async (page) => {
  await page.goto(DEMO); await settled(page);
  const seed = page.getByRole('button', { name: /Load the Santa Fe example/i });
  if (await seed.count()) await seed.click();
  await page.getByRole('button', { name: /^Go look$/ }).click();
  await expect(page.locator('details.lodge-req')).toBeVisible({ timeout: 20_000 });
};

test.describe('what the house needs', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the control is on the screen with the doors, and above them', async ({ page }) => {
    await goLook(page);
    const det = page.locator('details.lodge-req');
    const doors = page.locator('.lc-doors');
    await expect(doors).toBeVisible();
    const order = await page.evaluate(() => {
      const d = document.querySelector('details.lodge-req').getBoundingClientRect();
      const k = document.querySelector('.lc-doors').getBoundingClientRect();
      return { detTop: Math.round(d.top), doorsTop: Math.round(k.top) };
    });
    expect(order.detTop, 'the list that shapes the search comes before the doors')
      .toBeLessThan(order.doorsTop);
    // Shut at rest — it is a confirmation, not a form to fill in.
    expect(await det.evaluate((n) => n.open)).toBe(false);
    await expect(det.locator('summary')).toContainText(/Has to have/i);
  });

  test('the seeded musts do not filter, so nothing claims they do', async ({ page }) => {
    await goLook(page);
    // stepfree / laundry / parking are all search:null — they only rank.
    await expect(page.locator('.lc-filters-note')).toHaveCount(0);
  });

  test('adding a filtering must says so WITH THE FOLD SHUT, and really filters',
    async ({ page }) => {
      await goLook(page);
      const det = page.locator('details.lodge-req');
      await det.locator('summary').click();
      await page.locator('.lodge-req .chips .chip', { hasText: /^\+ Pool/ }).click();

      // ── THE PLACEMENT IS THE POINT ──────────────────────────────────────
      // The first cut put this note INSIDE the <details>, which is shut by
      // default — so the one sentence a host needs before pressing a door was
      // the one sentence they could not see. Shut the fold and it must remain.
      await det.locator('summary').click();
      expect(await det.evaluate((n) => n.open), 'fold is shut').toBe(false);
      const note = page.locator('.lc-filters-note');
      await expect(note).toBeVisible();
      await expect(note).toContainText(/Pool narrows the search itself/i);
      await expect(note).toContainText(/do not hide anything/i);

      const above = await page.evaluate(() => {
        const n = document.querySelector('.lc-filters-note').getBoundingClientRect();
        const k = document.querySelector('.lc-doors').getBoundingClientRect();
        return n.bottom <= k.top + 1;
      });
      expect(above, 'the warning sits above the doors it is about').toBe(true);

      // AND THE CLAIM IS TRUE. Pool is amenities[]=7; if the note says the
      // doors open filtered, the href has to carry it.
      const href = await page.locator('.lc-doors a').first().getAttribute('href');
      expect(href, `door url must carry the filter: ${href}`).toContain('amenities');
    });

  test('setting criteria does not throw the host off the screen', async ({ page }) => {
    // ── THE FIXTURE HAS TO MAKE Go look A PEEK ──────────────────────────
    // The first cut of this test seeded nothing, so the DERIVED stage was
    // already 'looking' — clicking Go look set viewing to null, there was no
    // peek to clear, and the test passed with the fix and without it. Caught
    // by red-proofing: removing keepPeek left it green.
    // Places on the shortlist push the derived stage to weighing, so Go look
    // becomes a real peek and clearing it really does move the host.
    await page.addInitScript(() => {
      try {
        const K = 'ngw-hostv2-custom-events';
        const evs = JSON.parse(localStorage.getItem(K) || '[]');
        const e = evs.find((x) => x && x.id === 'cust-demo-santafe');
        if (e) {
          e.lodgingOptions = [
            { id: 'p1', label: 'Casa Uno', sleeps: 12, beds: 8, totalPrice: 2400 },
            { id: 'p2', label: 'Casa Dos', sleeps: 10, beds: 7, totalPrice: 2200 },
          ];
          localStorage.setItem(K, JSON.stringify(evs));
        }
      } catch (_e) { /* a blocked store just leaves the default fixture */ }
    });
    await goLook(page);
    // patch() clears the step peek on purpose — "finishing a step lands you on
    // the next one". Adjusting criteria is not finishing anything, and before
    // this was fixed every toggle bounced the host from Go look to Weigh them
    // mid-adjustment, with the doors they were about to press left behind.
    const current = () => page.locator('.lc-step.is-on').innerText();
    const before = await current();
    expect(before.trim()).toMatch(/Go look/i);
    await page.locator('details.lodge-req summary').click();
    await page.locator('.lodge-req .chips .chip', { hasText: /^\+ Pool/ }).click();
    await page.waitForTimeout(600);
    expect((await current()).trim(), 'still on Go look after a toggle').toMatch(/Go look/i);
    await expect(page.locator('.lc-doors')).toBeVisible();
  });
});
