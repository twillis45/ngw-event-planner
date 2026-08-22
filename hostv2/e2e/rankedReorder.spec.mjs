// ─── THE RANKING MOVES, IT DOES NOT CUT ─────────────────────────────────────
//
// The 'Then, in order' list is the product's claim in one control: the app says it
// knows what to do next, and it says it by ORDER. The unit tests pin the FLIP
// mechanics against a DOM stub; they cannot tell you whether a real row on a
// real screen actually travels, because jsdom does not lay anything out.
//
// This is also the assertion that would be easiest to fake. Asserting "the
// order changed" proves the ranking works and says nothing about motion.
// Asserting a transform exists at a moment of your choosing races the
// animation. So this pins the mechanism at the only place it is unambiguous:
// a row that moved carries a transform TRANSITION it did not have at rest.
import { test, expect, settled } from './fixtures.mjs';

test('a row that changes rank travels to its new place', async ({ page }) => {
  test.skip(!page.viewportSize() || page.viewportSize().width < 1280, 'uses the rail to change state');
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'my-crab-feast');
  });
  await page.goto('?elegant=1');
  await settled(page);

  const idx = page.locator('.ef-list');
  await expect(idx).toBeVisible();
  const rows = idx.locator('.ef-row');
  const before = await rows.evaluateAll((ns) => ns.map((n) => n.getAttribute('data-flip')));
  expect(before.length, 'the ranked list is empty, so nothing here proves anything')
    .toBeGreaterThan(2);

  // Every row carries its stable key — without this the FLIP has nothing to
  // match rows by and silently animates nothing.
  expect(before.every(Boolean)).toBe(true);

  // Instrument the rows, then change state that the ranking reads. Recording
  // the transition as it is applied avoids racing the 260ms it then runs for.
  await idx.evaluate((el) => {
    window.__flipped = new Set();
    for (const row of el.querySelectorAll('[data-flip]')) {
      const id = row.getAttribute('data-flip');
      let v = '';
      Object.defineProperty(row.style, 'transition', {
        get: () => v,
        set: (nv) => { v = nv; if (/transform/.test(nv)) window.__flipped.add(id); },
        configurable: true,
      });
    }
  });

  // Confirm a decision — this moves work out of one bucket and reorders.
  await page.locator('.srail-row', { hasText: 'Calls to make' }).first().click();
  await settled(page);
  const board = page.locator('.sheet').last();
  await board.locator('button', { hasText: 'Other ways' }).first().click();
  await settled(page);
  await board.locator('button', { hasText: 'Steam them myself' }).first().click();
  await settled(page);
  await page.keyboard.press('Escape');
  await settled(page);

  const after = await rows.evaluateAll((ns) => ns.map((n) => n.getAttribute('data-flip')));
  const flipped = await page.evaluate(() => [...(window.__flipped || [])]);

  // Either the order changed and rows travelled, or the ranking legitimately
  // did not move — in which case nothing should have been animated either.
  // Asserting one without the other is how this test would pass on a broken
  // FLIP (order changed, nothing moved) or on a jittery one (nothing changed,
  // rows animated anyway).
  const orderChanged = JSON.stringify(before) !== JSON.stringify(after);
  if (orderChanged) {
    expect(flipped.length, 'the ranking changed and no row travelled').toBeGreaterThan(0);
  } else {
    expect(flipped.length, 'nothing was reranked, but rows animated anyway').toBe(0);
  }
});


test('the decisions queue travels too, and its rows are not nested', async ({ page }) => {
  // The SECOND ranked list, and the one where reorder means the most: settling
  // a decision moves the rest up, which is the app showing the host their own
  // progress. It was cutting.
  //
  // The nesting assertion is the one that would be easy to skip and expensive
  // to miss. `data-flip` had to go on four alternative row shapes in the same
  // map; if any two of them nested, the outer transform would compound with the
  // inner one and a row would travel twice as far as it should. Cheap to check,
  // invisible by eye at 260ms.
  test.skip(!page.viewportSize() || page.viewportSize().width < 1280, 'reaches the sheet via the rail');
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await page.locator('.srail-row', { hasText: 'Calls to make' }).first().click();
  await settled(page);

  const shape = await page.locator('.dec-list').evaluate((list) => {
    const flips = [...list.querySelectorAll('[data-flip]')];
    return {
      rows: list.children.length,
      flips: flips.length,
      ids: flips.map((f) => f.getAttribute('data-flip')),
      nested: flips.filter((f) => flips.some((g) => g !== f && g.contains(f))).length,
    };
  });

  // EVERY row is measurable — a row without an id is silently excluded from
  // FLIP and simply cuts while its neighbours travel, which reads worse than
  // nothing moving at all.
  expect(shape.rows).toBeGreaterThan(2);
  expect(shape.flips).toBe(shape.rows);
  expect(shape.nested, 'a flip row nests inside another — transforms would compound').toBe(0);
  expect(new Set(shape.ids).size, 'two rows share a flip id').toBe(shape.ids.length);
});
