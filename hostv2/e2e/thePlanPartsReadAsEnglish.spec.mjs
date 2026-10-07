// ─── "location  handled" ──────────────────────────────────────────────────
//
// C3 of the 2026-10-06 audit. The plan-parts list rendered `{c.id}` — the
// engine's own key — as the host-visible label, so a host read "location
// handled" and "headcount handled" on the surface that is supposed to be the
// plan in their own words.
//
// TWO THINGS THE BOARD CORRECTED ABOUT THE ORIGINAL FINDING, both of which
// change the fix:
//
// 1. The dossier said "swap c.id for the already-present cueLabel". That is
//    wrong for 12 of 12 ids. Nine would print a contradictory imperative —
//    "Add the location — handled" — and `vendors`, `budget` and `moment` have
//    a NULL cueLabel in their handled state, so they would print blank cells.
//    A builder following the audit would have shipped three empty rows.
//
// 2. A correct map already exists IN THIS FILE: `areaLabel`, used 300 lines
//    above on the chip row. It was scoped inside another block, which is the
//    whole reason the raw id survived here.
//
// AND THE UNHANDLED BRANCH HAS THE SAME HOLE FROM THE OTHER SIDE: it renders
// `{c.cueLabel}` unconditionally behind a `›` navigation chevron, and that
// field can legitimately be null — so a row could appear as an empty 44px
// button that toasts `undefined`.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard';

// Every id `phaseProgress` can emit. Named rather than pattern-matched: a
// regex over "looks like an id" would pass the day someone adds a thirteenth.
const ENGINE_IDS = ['datetime', 'location', 'venueaddress', 'headcount', 'food',
  'shopping', 'lodging', 'vendors', 'rain', 'crabs', 'budget', 'moment'];

test('THE PLAN PARTS READ AS ENGLISH, not as engine keys', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });

  const rows = await page.evaluate(() => {
    const head = [...document.querySelectorAll('*')].find((el) => !el.children.length
      && /parts of your plan this count reads/i.test(el.textContent || ''));
    if (!head) return null;
    const box = head.parentElement;
    return [...box.querySelectorAll('.line, .frow')]
      .map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  });
  expect(rows, 'the plan-parts list is on screen').toBeTruthy();
  expect(rows.length).toBeGreaterThan(0);

  for (const row of rows) {
    const first = row.split(/\s|·/)[0].toLowerCase();
    // No row may LEAD with a bare engine key.
    expect(ENGINE_IDS).not.toContain(first);
    // …and no row may be empty, which is what a null cueLabel produced behind
    // a navigation chevron.
    expect(row.replace(/[›\s]/g, '').length).toBeGreaterThan(0);
  }
});
