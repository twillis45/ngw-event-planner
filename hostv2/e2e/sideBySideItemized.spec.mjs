// "WE MAY NEED TO ITEMIZE THE WHAT IT HAS TO MAKE EASY COMPARISONS" (host,
// 2026-09-30), then: "let's try C, but prototype how we are doing this with
// the images". C1 is the one that shipped — the photo heads the column.
//
// What the table did before: a row per MUST-HAVE and nothing else. Three
// houses, four rows, silent about the forty other things the listings named.
//
// Two claims no unit test can make, which is why this file exists:
//   · the ROWS reach the rendered grid, with their three states intact
//   · the PHOTO reaches the column head, and the head keeps its height
//     without one so the value rows below stay aligned
//
// The grid is tablet+ by design (UX_03 rule 5 bans dense tables on a phone;
// below 640px the swipe deck IS the comparison), so every test here sets a
// tablet viewport. A mobile run would assert against a hidden element and pass
// for the wrong reason.
import { test, expect, settled } from './fixtures.mjs';

// NOTE on selectors: the wide table grew its own column chooser that reuses
// .lc-p2-chip, and its markup sits in the DOM at phone width even while
// .lc-t-wide hides it. Every chip selector here is scoped to the phone's own
// chooser so a count can never silently measure both surfaces at once —
// these tests pass unscoped today only because three places do not exceed
// the cap, which is luck, not design.

const DEMO = './?demo=lodging';
const IDS = ['31', '32', '33'];
// Deliberately uneven, because an even fixture cannot fail the interesting way:
//   Hot tub       31 says yes, 32 says NO          -> a real split, sorts first
//   Pool          31 says yes, nobody else answers -> partial
//   Kitchen       all three say yes                -> unanimous, sorts last
//   Free wifi/Wifi  worded differently on purpose  -> must merge to ONE row
//
// TWO OF THESE ARE REAL STRINGS, and the fixture is wrong without them. The
// row-height gate below was unfailable while every amenity here was short:
// "Hot tub" and "Kitchen" cannot wrap to three lines in any column width, so
// the test passed with the fix, without the fix, and without either half of
// it. The 63px row that prompted the fix came from live Airbnb data —
// "Exterior security cameras on property" and "65 inch HDTV with premium
// cable, Netflix" are copied from the listings that produced it.
const READ = {
  31: { amenities: ['Hot tub', 'Pool', 'Kitchen', 'Wifi',
    'Exterior security cameras on property'], amenitiesAbsent: [] },
  32: { amenities: ['Kitchen', 'Free wifi', '65 inch HDTV with premium cable, Netflix'],
    amenitiesAbsent: ['Hot tub', 'Exterior security cameras on property'] },
  33: { amenities: ['Kitchen', 'Wifi'], amenitiesAbsent: [] },
};
// Only 31 has a picture: the other two heads must still hold their frame.
//
// A REAL LISTING PHOTO SHAPE, not a data: URI. The first cut used an inline
// gif and rendered zero images, because isListingPhoto filters anything that
// is not a listing photo host — "safe to load" is not "depicts the house", and
// that filter is doing its job. A fixture has to satisfy the product's rules,
// not bypass them.
const SHOT = { 31: 'https://a0.muscache.com/im/pictures/mock-side-by-side.jpg' };
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');

const stage = async (page) => {
  // Serve the fixture photo locally so the test never depends on the network.
  await page.route('**a0.muscache.com/**', (r) => r.fulfill({ contentType: 'image/gif', body: PIXEL }));
  await page.route('**/api/lodging/unfurl**', (r) => {
    const id = (new URL(r.request().url()).searchParams.get('url') || '').match(/rooms\/9000(\d+)/);
    const k = id ? id[1] : '31';
    return r.fulfill({ json: { ok: true, title: `Casa ${k}`, price: 2400 + Number(k),
      image: SHOT[k] || '', facts: { beds: 10, bedrooms: 5 }, sleeps: 10,
      rating: 4.9, ratingCount: 60, ...READ[k] } });
  });
  await page.goto(DEMO); await settled(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill(IDS.map((i) => `https://www.airbnb.com/rooms/9000${i}`).join('\n'));
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  const add = page.getByRole('button', { name: /Add 3 to the shortlist/i });
  await expect(add).toBeVisible({ timeout: 60_000 });
  await add.click();
  // WAIT FOR A SIGNAL THAT HOLDS AT BOTH WIDTHS. This waited for .lc-t-wide to
  // be VISIBLE, which is precisely what a phone hides — so every mobile test
  // failed in the helper before reaching its own assertion. Attachment says
  // the comparison rendered; which half of it is on screen is the thing the
  // tests below are for.
  await expect(page.locator('.lc-t-wide').first()).toBeAttached({ timeout: 60_000 });
};

const rowLabels = (page) => page.locator('.lc-t-row.is-amenity .lc-row-label').allInnerTexts();

test.describe('the side-by-side itemizes what each place has', () => {
  test.use({ viewport: { width: 1024, height: 1366 } });

  test('a listing that says no reads differently from one that never said', async ({ page }) => {
    await stage(page);
    const row = page.locator('.lc-t-row.is-amenity').filter({ hasText: /^Hot tub/ }).first();
    const vals = await row.locator('.lc-t-val').allInnerTexts();
    // 31 yes, 32 the page said NO, 33 never mentioned it. Three facts, three
    // answers — the whole reason amenitiesAbsent was wired through.
    expect(vals).toEqual(['yes', 'no', '—']);

    // And the denial must not be dressed as a fault. UX_02: a house without a
    // hot tub is not an error, and nothing may be stated by colour alone —
    // which the literal word "no" already satisfies.
    const denied = row.locator('.lc-t-val.is-denied');
    await expect(denied).toHaveCount(1);
    const color = await denied.evaluate((n) => getComputedStyle(n).color);
    const danger = await page.evaluate(() => getComputedStyle(document.documentElement)
      .getPropertyValue('--danger').trim());
    expect(color, 'a denial must not render on the danger token').not.toBe(danger);
  });

  test('the rows that decide it come first', async ({ page }) => {
    await stage(page);
    const labels = await rowLabels(page);
    // A real split (both pages answered, differently) outranks a partial
    // (someone said yes, someone never mentioned it) outranks unanimous.
    expect(labels.indexOf('Hot tub')).toBeLessThan(labels.indexOf('Pool'));
    expect(labels.indexOf('Pool')).toBeLessThan(labels.indexOf('Kitchen'));
  });

  test('two spellings of one amenity are one row, not two', async ({ page }) => {
    await stage(page);
    const labels = await rowLabels(page);
    // 32 says "Free wifi", the others say "Wifi". One row, or the table is
    // just the same amenity wall with more whitespace.
    expect(labels.filter((l) => /wifi/i.test(l))).toEqual(['Wifi']);
  });

  test('the photo heads the column, and a column without one keeps its frame', async ({ page }) => {
    await stage(page);
    const heads = page.locator('.lc-col-head');
    await expect(heads).toHaveCount(3);
    // Exactly one fixture carries a picture.
    await expect(page.locator('.lc-col-shot img')).toHaveCount(1);
    await expect(page.locator('.lc-col-shot-none')).toHaveCount(2);

    // THE ALIGNMENT CLAIM, which is the only reason the empty frame exists:
    // every head is the same height, so the value rows line up across columns.
    const hs = await heads.evaluateAll((ns) => ns.map((n) => Math.round(n.getBoundingClientRect().height)));
    expect(new Set(hs).size, `column heads must match in height: ${hs.join(',')}`).toBe(1);

    // And the photo sits ABOVE the name, not beside it.
    const { shotBottom, nameTop } = await heads.first().evaluate((n) => ({
      shotBottom: n.querySelector('.lc-col-shot').getBoundingClientRect().bottom,
      nameTop: n.querySelector('.lc-col').getBoundingClientRect().top,
    }));
    expect(shotBottom).toBeLessThanOrEqual(nameTop + 1);
  });

  test('a phone gets the deck instead, not a dense table', async ({ page }) => {
    // STAGED AT TABLET FIRST, then narrowed. The first cut staged at 390px and
    // swallowed the failure, so it asserted "hidden" against an element that
    // had never rendered — green for a reason it was not about. The table must
    // EXIST and then be hidden by the breakpoint.
    await stage(page);
    await expect(page.locator('.lc-t-wide').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    // UX_03 rule 5: no dense tables on a phone — the swipe deck is the
    // comparison there, and it carries every value this grid does.
    await expect(page.locator('.lc-t-wide').first()).toBeHidden();
    await expect(page.locator('.lc-t-mobile-note').first()).toBeVisible();
  });
});

// ── B2: THE COMPARISON ON A PHONE (host picked it, 2026-10-01) ─────────────
// The flagship viewport used to get one sentence pointing at a wider screen.
// These run at 390px, the width the product is built for first.
test.describe('pick two, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the comparison is on the screen, not a pointer to another one', async ({ page }) => {
    await stage(page);
    // The dense grid is still correctly absent below 640px (UX_03 rule 5)...
    await expect(page.locator('.lc-t-wide').first()).toBeHidden();
    // ...and the thing that replaced the sentence is a real comparison.
    await expect(page.locator('.lc-p2-grid')).toBeVisible();
    await expect(page.locator('.lc-p2-row').first()).toBeVisible();
    await expect(page.getByText(/a wider screen shows it as one table/i)).toHaveCount(0);
  });

  test('exactly two columns, which is the width rule 7 allows', async ({ page }) => {
    await stage(page);
    await expect(page.locator('.lc-p2-col')).toHaveCount(2);
    // Every row carries one value per column and no more.
    const widths = await page.locator('.lc-p2-row').first()
      .evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(' ').length);
    expect(widths, 'label + exactly two value columns').toBe(3);
    const vals = await page.locator('.lc-p2-row').first().locator('.lc-p2-v').count();
    expect(vals).toBe(2);
  });

  test('the phone and the tablet give the same answers for the same pair', async ({ page }) => {
    await stage(page);
    const read = async (sel, rowSel) => page.locator(rowSel).filter({ hasText: /^Hot tub/ }).first()
      .locator(sel).allInnerTexts();
    const phone = await read('.lc-p2-v', '.lc-p2-row');
    await page.setViewportSize({ width: 1024, height: 1366 });
    await expect(page.locator('.lc-t-wide').first()).toBeVisible();
    const tablet = await read('.lc-t-val', '.lc-t-row');
    // The phone shows the first two columns of the same comparison. A phone
    // that disagreed with the tablet about what a listing said would be a
    // second truth, which is the whole reason this calls the same engine.
    expect(phone).toEqual(tablet.slice(0, 2));
  });

  test('tapping a third place swaps it into the pair', async ({ page }) => {
    await stage(page);
    const chips = page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip');
    await expect(chips).toHaveCount(3);
    await expect(page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip.is-on')).toHaveCount(2);
    const before = await page.locator('.lc-p2-name').allInnerTexts();
    await chips.nth(2).click();
    // Still two, and the third is now one of them.
    await expect(page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip.is-on')).toHaveCount(2);
    await expect(chips.nth(2)).toHaveAttribute('aria-pressed', 'true');
    const after = await page.locator('.lc-p2-name').allInnerTexts();
    expect(after).not.toEqual(before);
    await expect(page.locator('.lc-p2-col')).toHaveCount(2);
  });

  test('nothing in it sits under the tap floor, and the screen does not scroll sideways', async ({ page }) => {
    await stage(page);
    const short = await page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip').evaluateAll(
      (ns) => ns.map((n) => Math.round(n.getBoundingClientRect().height)).filter((h) => h < 44));
    expect(short, `chips under the floor: ${short.join(',')}`).toEqual([]);
    const over = await page.evaluate(() => document.documentElement.scrollWidth
      > document.documentElement.clientWidth);
    expect(over, 'the page must never scroll horizontally').toBe(false);
  });
});

// Two faults the live drive found that the first cut of this file did not.
test.describe('what driving it on a phone found', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no two chips read the same, even when the names do', async ({ page }) => {
    await stage(page);
    // The real case: two Santa Fe listings both named "Home in Santa Fe ·
    // ★4.98 · 5 bedrooms · ? beds · 3 baths", differing 30 characters in. Both
    // chips rendered "Home in Santa …" and the host could not tell which one
    // they were about to compare.
    const texts = await page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip').evaluateAll(
      (ns) => ns.map((n) => n.innerText.replace(/\s+/g, ' ').trim()));
    expect(new Set(texts).size, `chips must differ: ${texts.join(' | ')}`).toBe(texts.length);
    // And the half that tells them apart must be present, not truncated away.
    const caps = await page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip-s').allInnerTexts();
    expect(caps).toHaveLength(3);
    for (const c of caps) expect(c).toMatch(/sleeps \d+|\d+ beds|capacity not said/);
  });

  test('a long label cannot grow the row without bound', async ({ page }) => {
    await stage(page);
    // Measured at the first cut: rows came out 32, 36, 47 and 63px — labels
    // wrapping to three lines, the expand-don't-truncate failure UX_05 names.
    // The label is clamped to two lines, so the tallest row is bounded.
    const hs = await page.locator('.lc-p2-row').evaluateAll(
      (ns) => ns.map((n) => Math.round(n.getBoundingClientRect().height)));
    expect(Math.max(...hs), `tallest row ${Math.max(...hs)}px, all: ${[...new Set(hs)].join(',')}`)
      .toBeLessThanOrEqual(50);
    // A value must never wrap — "yes" / "no" / a dash / a number always fit.
    const wrapped = await page.locator('.lc-p2-v').evaluateAll(
      (ns) => ns.filter((n) => n.getBoundingClientRect().height > 22).length);
    expect(wrapped).toBe(0);
  });
});
