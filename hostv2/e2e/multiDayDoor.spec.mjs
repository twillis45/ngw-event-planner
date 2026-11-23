// ─── THE MULTI-DAY DOOR HAS AN EVENT TO OPEN ON ─────────────────────────────
//
// The multi-day programme engine was built, wired and shipped, and then NOT
// ONE of the 26 seeded samples carried a span — so `spanNights(ev) >= 1` was
// false everywhere and the span-gated "Your days" door never rendered on any
// event in the app. Found while shooting marketing frames, which is a bad way
// to find out that a shipped capability is unreachable.
//
// This is the third instance of that pattern today (three engines with zero
// hostv2 imports were the others), so the seed gets a gate rather than a note.
import { test, expect, settled, RAIL_MIN_WIDTH, openSectionByName } from './fixtures.mjs';

const boot = async (page, id) => {
  await page.addInitScript((eid) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', eid);
  }, id);
  await page.goto('?elegant=1');
  await settled(page);
};

// The rail's rows, or on a tall iPad (11/22/2026) the bar's index tiles.
const doors = async (page) => {
  if (await page.locator('[data-tt-bar]').count()) {
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click();
    await settled(page);
    return page.locator('.sheet').last().locator('[data-door]')
      .evaluateAll((ns) => ns.map((n) => (n.innerText || '').trim()));
  }
  return page.locator('.srail-row, .sec-row')
    .evaluateAll((ns) => ns.map((n) => (n.getAttribute('aria-label') || n.innerText || '').trim()));
};

test('a spanning event opens the "Your days" door', async ({ page }) => {
  test.skip(!page.viewportSize() || page.viewportSize().width < RAIL_MIN_WIDTH, 'reads the section doors (rail, or the tall iPad index)');
  await boot(page, 'test-multi-day');
  const names = await doors(page);
  expect(names.some((n) => /Your days/i.test(n)), `no "Your days" door among: ${names.join(' | ')}`).toBe(true);
});

test('a single-day event still does NOT', async ({ page }) => {
  // Red-proofs the gate. If the door rendered unconditionally the test above
  // would pass and the span would be doing no work at all — which, given the
  // door was invisible for months, is exactly the failure worth pinning.
  test.skip(!page.viewportSize() || page.viewportSize().width < RAIL_MIN_WIDTH, 'reads the section doors (rail, or the tall iPad index)');
  await boot(page, 'my-crab-feast');
  const names = await doors(page);
  expect(names.some((n) => /Your days/i.test(n))).toBe(false);
});

test('the door lands on the per-day programme, not a dead tap', async ({ page }) => {
  test.skip(!page.viewportSize() || page.viewportSize().width < RAIL_MIN_WIDTH, 'reads the section doors (rail, or the tall iPad index)');
  await boot(page, 'test-multi-day');
  await openSectionByName(page, 'Your days', { settle: 0 });
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toBeVisible();
  // Its own sheet (owner, 11/21/2026: "Its own sheet"), not a block in Space.
  await expect(page.locator('#sheet-title')).toHaveText('Your days');
  await expect(sheet.locator('#days-plan')).toBeVisible();
  // It has to actually carry day structure — a sheet that opens on a heading
  // and nothing else is a dead tap wearing a door's clothes.
  const text = await sheet.innerText();
  expect(text.length).toBeGreaterThan(80);
});
