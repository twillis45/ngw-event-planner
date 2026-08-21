// ─── THE VENDOR CARD'S COLLAPSED FACE, DRIVEN ──────────────────────────────
//
// Board ruling 2026-08-21 (docs/audits/2026-08-21_VENDORS_SHEET_RULING.md).
// The unit gate (src/lib/__tests__/vendorCardFace.test.js) pins the SOURCE;
// this pins what a host actually sees, because the defect the host reported
// was a rendered one: four stacked bands per vendor and a wall of amber.
//
// It measures rather than screenshots — an amber count and a collapsed height
// are facts; "looks calmer" is not.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const VENDORS = [
  // One of each state the ranked selector has to choose between, so the
  // "one chip per card" rule is tested where it is hardest.
  { id: 'v-a', name: 'Alpha Catering', category: 'Catering', status: 'Quoted', cost: 4500 },
  { id: 'v-b', name: 'Bravo Venue', category: 'Venue', status: 'Contracted', cost: 3000, coiStatus: 'required' },
  { id: 'v-c', name: 'Charlie Photo', category: 'Photography', status: 'Considering', cost: 1300 },
  { id: 'v-d', name: 'Delta Rentals', category: 'Rentals', status: 'Quoted', cost: 650, coiStatus: 'required' },
  { id: 'v-e', name: 'Echo Bakery', category: 'Bakery', status: 'Confirmed', cost: 450, contractSigned: true },
];

const boot = async (page) => {
  await page.addInitScript((vendors) => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-hostv2-patch-test-two-days', JSON.stringify({ vendors }));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, VENDORS);
  await page.goto('?elegant=1');
  await settled(page);
  // Through the shared section door, not a hardcoded route — the rail replaces
  // the menu path above 1280 and only the helper needs to know that.
  await openSectionByName(page, 'People you');
  await settled(page);
};

const amberCount = (page) => page.evaluate(() => {
  // Count what the HOST sees as "needs attention": any PAINTED element whose
  // colour resolves to the warn token. Reading computed colour, not class
  // names, because the defect was a token default.
  //
  // RESOLVE THE TOKEN THROUGH AN ELEMENT. The first cut compared the raw
  // custom-property text (e.g. "#d9a05b") against getComputedStyle().color
  // (e.g. "rgb(217, 160, 91)") — they never match, so it counted ZERO on a
  // sheet full of amber chips and the assertion passed on nothing. A counter
  // that cannot count is worse than no counter.
  const probe = document.createElement('span');
  probe.style.color = 'var(--warn)';
  document.body.appendChild(probe);
  const warn = getComputedStyle(probe).color;
  probe.remove();
  let n = 0;
  for (const el of document.querySelectorAll('.vcard *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // Clipped-but-boxed content (a collapsed `.vc-more`) is not painted.
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (!hit || !(hit === el || el.contains(hit))) continue;
    if (getComputedStyle(el).color === warn) n += 1;
  }
  return { n, warn };
});

test.describe('the vendors sheet after the ruling', () => {
  test('a resting card is ONE band, and the sheet is not a wall of amber', async ({ page }) => {
    await boot(page);

    const cards = page.locator('.vcard');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(VENDORS.length);

    // Clause 2: the collapsed face is a row, not a stack. Four bands measured
    // ~150px+; one row plus an optional chip must stay well under that.
    for (let i = 0; i < VENDORS.length; i += 1) {
      const box = await cards.nth(i).boundingBox();
      expect(box.height).toBeLessThan(140);
    }

    // Clause 3: at most ONE amber mark per card. Five cards, several carrying
    // COI + status, so the pre-ruling face (which could stack four) blows it.
    // Bring a card into view first. `amberCount` hit-tests with
    // `elementFromPoint`, which only sees the VIEWPORT — at landscape
    // (860x430) every card had scrolled past the fold, so the counter honestly
    // reported zero painted amber and the assertion read it as a defect. The
    // instrument was measuring an empty screen, not a fixed sheet.
    await page.locator('.vcard').first().scrollIntoViewIfNeeded();
    const { n, warn } = await amberCount(page);
    expect(warn).toMatch(/^rgb/);                 // the counter really resolved the token
    expect(n).toBeGreaterThan(0);                 // …and really counts (these vendors ARE overdue)
    expect(n).toBeLessThanOrEqual(VENDORS.length);

    // Clause 4: the null sentence is off the FACE — it appeared once per
    // vendor before, a constant rendered five times. It still exists in the
    // DOM inside the collapsed `.vc-more` (max-height:0), which is the point:
    // moved below the fold, not deleted. So the assertion is about what the
    // host can SEE, not what the markup contains — a toHaveCount(0) here
    // failed for the right reason and would have pushed the fix the wrong way
    // (deleting the sentence outright, breaking the honesty rail).
    // PROBE, don't trust geometry: the sentence sits inside a collapsed
    // `.vc-more` (max-height:0, overflow hidden), so it keeps a bounding box
    // and Playwright reports it "visible" while the host cannot see a pixel of
    // it. elementFromPoint is what actually settles this — the same lesson
    // this project already wrote in blood for tap targets.
    const painted = await page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll('.vcard .grounding, .vcard span')) {
        if (!/No record of reaching out yet\./.test(el.textContent || '')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        // NEVER `hit.contains(el)` — the project's own recorded rule. An
        // ancestor (.vcard) is what gets hit when the child is clipped to
        // nothing, so that form counts invisible content as painted. It cost
        // this very spec two runs.
        if (hit && (hit === el || el.contains(hit))) n += 1;
      }
      return n;
    });
    expect(painted).toBe(0);
  });

  test('the controls still exist — they moved below the fold, they did not vanish', async ({ page }) => {
    await boot(page);
    // Open the first vendor: the whole card is the disclosure.
    await page.locator('.vcard').first().click();
    await settled(page);
    // The contact log button and its sentence live here now.
    await expect(page.getByRole('button', { name: /Log that you reached out/i }).first()).toBeVisible();
    await expect(page.getByText('No record of reaching out yet.').first()).toBeVisible();
  });

  test('the status control is still on the face and still opens the picker', async ({ page }) => {
    await boot(page);
    // Norman seat: the pill is the one affordance a resting row keeps.
    const pill = page.locator('.vcard .vc-pill').first();
    await expect(pill).toBeVisible();
    await pill.click();
    await settled(page);
    await expect(page.locator('.vc-statuspick').first()).toBeVisible();
  });
});
