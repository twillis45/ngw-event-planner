// ─── THE TAP TARGETS ON THE SHOP SHEET, PROBED RATHER THAN COMPUTED ─────────
//
// Owner asked on 2026-09-26 whether the chips and filters needed new heights.
// Measuring answered the opposite question: they were the only ones that did
// NOT. Probed on the live Shop sheet at 390px —
//
//     .mini    (Done, Change, Lock the rest)        44 visual, 44 hit   OK
//     .chip    (Grocery, Seafood market)            44 visual, 44 hit   OK
//     .fmode   (Plan / Shop)                        44 visual, 44 hit   OK
//     .sheet-x (Close)                              28 visual, 43 hit   OK
//     .food-act "Copy the shopping list"            40 visual, 40 hit   UNDER
//     .food-act Instacart / Print / Email           34 visual, 34 hit   UNDER
//
// `.food-act` is absent from the `::after` tap-expander selector list in
// styles.css (~1609) that rescues every other small control, so 34 was the
// WHOLE target — ten pixels under the bar, on three buttons a host reaches for
// on their way out of the door. The primary was under it too.
//
// ── WHY elementFromPoint AND NOT getBoundingClientRect ─────────────────────
//
// This repo has a law about exactly this (styles.css ~361 records it): a 44px
// `::after` expander can be clipped to nothing by an ancestor and STILL report
// height:44px to any geometry assertion written against it. A box measurement
// would have called Instacart's 34px button fine the moment somebody added an
// expander that did not work. So the probe walks outward from each button's
// visual box and asks the document WHO ANSWERS at that point — the same
// question a thumb asks.
//
// RED-PROOFED by `.food-act{min-height:0}`: the four buttons dropped back to
// 40/34/34/34 and this spec went red on all four, then passed again on restore.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EV = 'e2e-tap-44';
const MIN = 44;

const boot = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([id, date]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id, type: 'Crab Feast', name: 'Tap probe', date,
      venueCity: 'Annapolis', venueState: 'MD',
      guestMode: 'count', guestCount: 18, guestCountLocked: true, totalBudget: 1200,
      guests: [], vendors: [], budget: [], timeline: [],
    }]));
  }, [EV, dateIn(21)]);
  await page.goto('./');
  await settled(page);
  await page.getByText('Plan the food', { exact: false }).first().click();
  await settled(page);
  const sheet = page.locator('.sheet').last();
  const shop = sheet.locator('.fmode', { hasText: /^Shop$/ }).first();
  if (await shop.count()) { await shop.click(); await settled(page); }
  return sheet;
};

/** What a thumb would find: walk out from the visual box, asking the document. */
const probe = (page, selector) => page.evaluate((sel) => {
  const owns = (el, x, y) => {
    const h = document.elementFromPoint(x, y);
    return !!h && (h === el || el.contains(h) || h.parentElement === el);
  };
  const sheet = [...document.querySelectorAll('.sheet')].pop() || document;
  return [...sheet.querySelectorAll(sel)].filter((e) => e.offsetParent).map((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    let top = r.y; let bot = r.y + r.height;
    for (let d = 1; d <= 16; d += 1) { if (owns(el, cx, r.y - d)) top = r.y - d; else break; }
    for (let d = 1; d <= 16; d += 1) { if (owns(el, cx, r.y + r.height - 1 + d)) bot = r.y + r.height - 1 + d; else break; }
    return { label: el.textContent.trim().slice(0, 30), hit: Math.round(bot - top) };
  });
}, selector);

test('(premise) the Shop sheet really is showing its actions', async ({ page }) => {
  // Without this, "every action clears 44" passes vacuously over a sheet that
  // rendered no actions at all — the shape of three wrong "absent" findings in
  // this project's history.
  const sheet = await boot(page);
  await expect(sheet.getByRole('button', { name: /Copy the shopping list/i })).toBeVisible();
  const acts = await probe(page, '.food-act');
  expect(acts.length).toBeGreaterThanOrEqual(2);
});

test('EVERY .food-act clears 44 — the family that did not', async ({ page }) => {
  await boot(page);
  const acts = await probe(page, '.food-act');
  const under = acts.filter((a) => a.hit < MIN);
  // Named, not counted: a failure has to say WHICH button shrank and to what.
  expect(under).toEqual([]);
});

test('and the controls that already cleared it still do', async ({ page }) => {
  // The other half. `.mini` and `.chip` were measured correct, and the fix must
  // not have moved them — the owner's question was whether THEY needed new
  // heights, and the measured answer was no.
  await boot(page);
  for (const sel of ['.mini', '.fmode']) {
    const rows = await probe(page, sel);
    if (!rows.length) continue;
    expect({ [sel]: rows.filter((a) => a.hit < MIN) }).toEqual({ [sel]: [] });
  }
});
