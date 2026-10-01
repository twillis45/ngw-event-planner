// "WHAT WE READ COULD USE A WORKING AND BETTER LAYOUT" (host, 2026-09-30),
// and, the same morning: "the notes contain amenities we may or may not need."
//
// What the screen was doing, measured from a real three-link paste:
//
//   Casa Cielo · 12 beds
//   6 bedrooms · $2,660 · 4.86/5 (214) · Kitchen, Hot tub, Free
//   washer – In unit, Wifi, Free parking on premises, Pool     sleeps 12
//
// Three faults in one row. The PRICE — one of the two things a host actually
// compares — sat third inside a run-on at 11px --faint, at the same weight as
// "Wifi". The FIT sentence floated right and collided with the name, so a row
// rendered "Casa Pequena · 4 ..." truncated while the sentence beside it ran
// full width. And the AMENITIES were dumped verbatim, all six, because nothing
// had decided which ones this event asked for — though rankCandidates computes
// exactly that, and as of today reads the amenity list to do it.
//
// UX_05: "all rows in a list must be the same height ... if content varies in
// length, truncate — don't expand." They were 2, 3 and 3 lines.
// UX_02: "maximum 3 chips per row ... if a list row has 4+ chips it becomes
// unreadable chip soup."
//
// This holds the layout that replaced it: three fixed lines, price in its own
// column, fit on its own line, and amenities filtered to what was asked for
// with the remainder as a count.
import { test, expect } from '@playwright/test';

const DEMO = './?demo=lodging';
// Six amenities. The Santa Fe example's own must-haves are what decides which
// of them are chips — this fixture does not get to choose, which is the point.
// Six amenities, chosen to hit all THREE of the example's must-haves
// (stepfree, laundry, parking) — so the chips are provably coming from the
// amenity list and not from the title.
const AMENITIES = ['Kitchen', 'Elevator', 'Free washer – In unit', 'Wifi',
  'Free parking on premises', 'Pool'];
// DELIBERATELY LONG. A short title fits beside the price whatever the CSS
// does, which makes a "price has its own column" assertion unfailable. This is
// the real case the host hit: "Casa Pequena · 4 ..." truncated on the phone.
const LONG = 'Secluded adobe compound with mountain views and a walled garden';
const BEDS = { 20421338: 4, 20421340: 8, 20421339: 12 };
// A fourth link whose lookup returns nothing — the real case from the phone.
const DEAD = '20421337';

const stage = async (page, { theme } = {}) => {
  await page.route('**/api/lodging/unfurl**', (route) => {
    const id = (new URL(route.request().url()).searchParams.get('url') || '').match(/rooms\/(\d+)/);
    // ONE LOOKUP COMES BACK EMPTY, because one did on the phone. The first cut
    // of this file gave every row identical content, so the equal-height
    // assertion could not fail — a green subset, not a green suite.
    if (id && id[1] === DEAD) return route.fulfill({ json: { ok: false, reason: 'nothing there' } });
    const beds = (id && BEDS[id[1]]) || 6;
    return route.fulfill({ json: { ok: true,
      title: `${LONG} ${beds === 12 ? 'Cielo' : beds === 8 ? 'Verde' : 'Pequena'} · ${beds} beds`,
      price: 2180 + beds * 40, image: '', facts: { beds, bedrooms: Math.ceil(beds / 2) },
      sleeps: beds, rating: 4.86, ratingCount: 214, amenities: AMENITIES } });
  });
  await page.goto(theme === 'light' ? `${DEMO}&theme=light` : DEMO);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill([...Object.keys(BEDS), DEAD]
    .map((id) => `https://www.airbnb.com/rooms/${id}`).join('\n'));
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  await expect(page.getByRole('button', { name: /Add 4 to the shortlist/i }))
    .toBeVisible({ timeout: 30_000 });
};

test.describe('what we read, laid out', () => {
  test('every row is the same height — no ragged list', async ({ page }) => {
    await stage(page);
    const boxes = await page.locator('.lc-staged').evaluateAll(
      (ns) => ns.map((n) => Math.round(n.getBoundingClientRect().height)));
    expect(boxes.length).toBe(4);
    // Identical, and one of these four is an UNREAD row with no chips and no
    // facts — which is exactly the case the first version of this test could
    // not see. On the phone it stood 64px against 111px.
    expect(new Set(boxes).size, `row heights: ${boxes.join(', ')}`).toBe(1);
  });

  test('a link we learned nothing from sorts LAST, not first', async ({ page }) => {
    // Driven on a phone against the real backend, 2026-09-30: three real Santa
    // Fe listings, one lookup came back empty, and that row — "Airbnb listing
    // / sleeps —" — sat ABOVE the two we had read, under a header promising
    // "best fit for this party first".
    //
    // The scoring did it honestly and got the wrong answer. Unknown scores 0;
    // a place known to sleep six against a party of ten scores
    // 2*10 + 6 - 100 = -74. Knowing NOTHING beat knowing it was too small, and
    // the row carrying the least information landed in the slot the host reads
    // as the recommendation.
    //
    // Note what this does NOT assert: that the unread row is excluded, or
    // unticked, or called a failure. It was pasted on purpose and it stays,
    // with its own honest line. It simply stops outranking evidence.
    await stage(page);
    const names = await page.locator('.lc-staged-name').allInnerTexts();
    expect(names[names.length - 1]).toMatch(/^Airbnb listing$/i);
    // ...and it still says, in its own words, why it has nothing to show.
    const last = page.locator('.lc-staged').last();
    await expect(last.locator('.lc-staged-more')).toHaveText(/nothing read from this link/i);
    // It is still ticked. Losing a link the host chose is worse than mis-ranking it.
    await expect(page.getByRole('button', { name: /Add 4 to the shortlist/i })).toBeVisible();
  });

  test('the price has its own column and never wraps into the facts', async ({ page }) => {
    await stage(page);
    // Three priced rows; the unread one has no price and renders no column.
    const prices = await page.locator('.lc-staged-price').allInnerTexts();
    expect(prices).toEqual(['$2,660', '$2,500', '$2,340']);
    // It must sit on the NAME line, right of it — not below, not inside the
    // metadata run-on it was rescued from.
    const { nameRight, priceLeft, sameLine } = await page.locator('.lc-staged').first()
      .evaluate((row) => {
        const n = row.querySelector('.lc-staged-name').getBoundingClientRect();
        const p = row.querySelector('.lc-staged-price').getBoundingClientRect();
        return { nameRight: n.right, priceLeft: p.left, sameLine: Math.abs(n.bottom - p.bottom) < 6 };
      });
    expect(sameLine).toBe(true);
    expect(priceLeft).toBeGreaterThanOrEqual(nameRight - 1);
    // ...and the NAME is what gives way. A name allowed to wrap pushes the
    // price onto a second line (or off the row), which is the layout this
    // replaced.
    //
    // ASSERTED WITHOUT MEASURING GLYPHS, and that is the whole point of this
    // comment. The first version read `scrollWidth > clientWidth`, which asks
    // "is this particular string, in this particular font, wider than its
    // box". It passed on a Mac and failed on all three CI shards, because the
    // Linux runners resolve a different fallback face and the same sentence
    // simply is not as wide there. A gate that depends on which fonts the
    // machine happens to have is not testing the product.
    //
    // The invariant has nothing to do with glyph widths: the name is SET to
    // truncate, and it occupies ONE line. Both hold in any font.
    const nm = await page.locator('.lc-staged-name').first().evaluate((n) => {
      const cs = getComputedStyle(n);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      return {
        nowrap: cs.whiteSpace === 'nowrap',
        ellipsis: cs.textOverflow === 'ellipsis',
        clipped: cs.overflow === 'hidden' || cs.overflowX === 'hidden',
        lines: Math.round(n.getBoundingClientRect().height / lh),
      };
    });
    expect(nm.nowrap && nm.ellipsis && nm.clipped,
      `the name must be set to truncate: ${JSON.stringify(nm)}`).toBe(true);
    expect(nm.lines, 'the name must stay on one line').toBe(1);
  });

  test('only the amenities this event asked for become chips; the rest are a count',
    async ({ page }) => {
      await stage(page);
      const row = page.locator('.lc-staged').first();
      const chips = await row.locator('.lc-staged-chip').allInnerTexts();

      // NOT the verbatim list. Each chip is a must-have LABEL the event
      // carries, which is a different vocabulary from the listing's wording —
      // "Free washer – In unit" becomes "Washer & dryer" because that is what
      // the host asked for. A build that still printed the raw list would fail
      // here on the wording alone.
      expect(chips.length).toBeGreaterThan(0);
      for (const c of chips) expect(AMENITIES).not.toContain(c);

      // All three of this event's must-haves are met by the amenity list, so
      // the row sits exactly AT UX_02's ceiling of three.
      expect(chips.length).toBe(3);
      // NOTE, and this is a limit of this gate rather than a claim: the
      // Santa Fe example carries three must-haves, so `.slice(0, 3)` in the
      // row cannot be exercised here — removing the cap changes nothing on
      // this fixture, measured 2026-09-30. The cap is defense for an event
      // that asks for more, and it is honest to say no test holds it than to
      // leave an assertion that can never go red.

      // And everything not asked for is COUNTED, never listed. Six amenities,
      // so whatever is not a chip has to be accounted for in the tail.
      const more = (await row.locator('.lc-staged-more').innerText()).match(/\d+/);
      expect(Number(more[0])).toBe(AMENITIES.length - chips.length);
    });

  test('the amenity list is what the match is made against, not the name',
    async ({ page }) => {
      // The regexes are amenity vocabulary (/washer|laundry|dryer/,
      // /parking|driveway|garage/) and the haystack used to be name + kind +
      // town. None of these titles contain any of those words, so a chip
      // appearing at all proves the amenity list is being read.
      await stage(page);
      const names = await page.locator('.lc-staged-name').allInnerTexts();
      for (const n of names) expect(n).not.toMatch(/washer|dryer|parking|laundry|garage/i);
      expect(await page.locator('.lc-staged-chip').count()).toBeGreaterThan(0);
    });

  for (const theme of ['dark', 'light']) {
    test(`every new element clears AA — ${theme}`, async ({ page }) => {
      await stage(page, { theme });
      const bad = await page.evaluate(() => {
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const px = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const out = [];
        for (const sel of ['.lc-staged-chip', '.lc-staged-more', '.lc-staged-price',
          '.lc-staged-fit', '.lc-staged-meta', '.lc-staged-name']) {
          for (const n of document.querySelectorAll(sel)) {
            if (!n.innerText.trim()) continue;
            let p = n, bg = null;
            while (p) { const c = getComputedStyle(p).backgroundColor;
              if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = px(c); break; }
              p = p.parentElement; }
            if (!bg) continue;
            const a = lum(px(getComputedStyle(n).color)), b = lum(bg);
            const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (r < 4.5) out.push(`${sel} "${n.innerText.trim().slice(0, 24)}" ${r.toFixed(2)}`);
          }
        }
        return out;
      });
      expect(bad, bad.join(' | ')).toEqual([]);
    });
  }
});
