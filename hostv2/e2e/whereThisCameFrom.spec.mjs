// "WHAT WE READ, WHAT YOU TYPED NEEDS A REDESIGN. THIS WONT BE EASY FOR HOST
// TO DIGEST." (host, 2026-09-30) — and, minutes later: "need badges for where
// the listing came from. host may combine the source of listings: Google,
// airbnb, vrbo, etc."
//
// What the old block did, measured off the live card: printed the five words
// "read from the listing itself" five times down the right column at the same
// weight as the data; spelled out all nine amenities under "What it has"; and
// then printed those same nine again under "Notes", because notesFor() joins
// amenities into its string. The block was taller than the card it described.
//
// Three prototypes went to the host; this gates the one that combined them:
// the CLAIM leads, the GAPS are the only thing open by default (read facts are
// reassurance, missing facts are work), and the RECEIPTS fold away grouped by
// source so the source is stated once per group.
import { test, expect } from '@playwright/test';

const DEMO = './?demo=lodging';
const AMENITIES = ['Desert view', 'Mountain view', 'Kitchen', 'Wifi', 'Dedicated workspace',
  'Free parking on premises', 'Private hot tub', '65 inch HDTV', 'Washer'];

const seedOne = async (page, theme) => {
  await page.route('**/api/lodging/unfurl**', (r) => r.fulfill({ json: { ok: true,
    title: 'Casa De Camino — 6-Bedroom Santa Fe Retreat', image: '',
    facts: { beds: 9, bedrooms: 6, baths: 5.5 }, sleeps: 14, rating: 4.93,
    ratingCount: 123, amenities: AMENITIES } }));
  await page.goto(theme === 'light' ? `${DEMO}&theme=light` : DEMO);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill('https://www.airbnb.com/rooms/742220082744554592');
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  await expect(page.locator('.lc-card-eyebrow', { hasText: /WHERE THIS CAME FROM/i }).first())
    .toBeVisible({ timeout: 30_000 });
};

test.describe('where this came from', () => {
  test('the claim leads, and it counts what is actually shown', async ({ page }) => {
    await seedOne(page);
    // Name, Beds, Sleeps, What it has, Notes — five. Notes COUNTS, because it
    // is kept: only the amenity tail it repeats is stripped. The first cut
    // dropped the whole row and this asserted four, which is how the bedrooms
    // and the rating went missing from the card without a gate noticing.
    await expect(page.locator('.lc-pv-claim').first())
      .toHaveText(/All 5 of these facts were read off the listing\./i);
  });

  test('the five repetitions are gone — the source is said once per group',
    async ({ page }) => {
      await seedOne(page);
      const card = page.locator('.lc-card').first();
      await card.getByText(/Field by field/i).click();
      const said = await card.locator('.lc-pv-grp-h b').allInnerTexts();
      expect(said).toEqual(['Read from the listing itself']);
      // The old block printed that sentence once per row. Once, now, total.
      const all = await card.innerText();
      expect((all.match(/Read from the listing itself/gi) || []).length).toBe(1);
    });

  test('Notes keeps what is its own and drops only the repeat', async ({ page }) => {
    await seedOne(page);
    const card = page.locator('.lc-card').first();
    await card.getByText(/Field by field/i).click();
    const keys = await card.locator('.lc-pv-k').allInnerTexts();
    // Notes STAYS. notesFor() builds "6 bedrooms · 4.93/5 (123) · <amenities>"
    // and only the tail is a duplicate; dropping the row took the bedrooms and
    // the rating with it, which the host noticed the same day.
    expect(keys).toContain('Notes');
    const notes = await card.locator('.lc-pv-row', { hasText: 'Notes' }).locator('.lc-pv-v').innerText();
    expect(notes).toMatch(/bedrooms/i);
    for (const a of AMENITIES) expect(notes).not.toContain(a);
    // ...and the amenities are a COUNT, not nine spelled-out lines.
    const txt = await card.innerText();
    expect(txt).toContain('9 things');
    expect(txt).not.toContain('Dedicated workspace');
  });

  test('the gaps are open by default, name an act, and ask for the price ONCE',
    async ({ page }) => {
      await seedOne(page);
      const card = page.locator('.lc-card').first();
      // Visible without opening anything — this is the part a host can act on.
      await expect(card.locator('.lc-pv-gaps')).toBeVisible();
      const keys = await card.locator('.lc-pv-gap-k').allInnerTexts();
      // Total and per-night are ONE question. The first cut listed both when
      // neither was set, and derived an act reading "Add the a night".
      expect(keys).toEqual(['Price', 'Fees', 'Cancellation']);
      const acts = await card.locator('.lc-pv-gap-a').allInnerTexts();
      expect(acts).toEqual(['Add the price', 'Add the fees', 'Add the terms']);
      for (const a of acts) expect(a).not.toMatch(/the a /i);
    });

  test('a gap CTA actually fills the field — it is an act, not a label',
    async ({ page }) => {
      await seedOne(page);
      const card = page.locator('.lc-card').first();
      page.once('dialog', (d) => d.accept('850'));
      await card.locator('.lc-pv-gap-a', { hasText: /Add the fees/i }).click();
      // Gone from the gaps, and now a fact the host typed.
      await expect(card.locator('.lc-pv-gap-k', { hasText: /^Fees$/ })).toHaveCount(0);
      await card.getByText(/Field by field/i).click();
      await expect(card.locator('.lc-pv-grp-h b', { hasText: /^You typed$/ })).toBeVisible();
      await expect(card.locator('.lc-pv-v', { hasText: /\$850/ })).toBeVisible();
    });

  for (const theme of ['dark', 'light']) {
    test(`every word of this block clears AA — ${theme}`, async ({ page }) => {
      await seedOne(page, theme);
      const card = page.locator('.lc-card').first();
      await card.getByText(/Field by field/i).click();
      const bad = await page.evaluate(() => {
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        // COMPOSITE THE ALPHA. .lc-card's background is rgba(111,135,148,0.1);
        // stopping at the first non-transparent color and treating it as
        // opaque reported 1.04:1 for text that is plainly legible. Same
        // mistake a contrast gate in this repo already made once — walk every
        // layer and blend it over the one beneath.
        const rgba = (s) => { const n = (s.match(/[\d.]+/g) || []).map(Number);
          return n.length >= 4 ? n.slice(0, 4) : [...n.slice(0, 3), 1]; };
        const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
        const groundOf = (el) => {
          const stack = [];
          let p = el;
          while (p) { const c = rgba(getComputedStyle(p).backgroundColor);
            if (c[3] > 0) { stack.push(c); if (c[3] === 1) break; } p = p.parentElement; }
          let g = rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3);
          for (let i = stack.length - 1; i >= 0; i -= 1) g = over(stack[i], g);
          return g;
        };
        const px = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const out = [];
        const sels = ['.lc-pv-claim', '.lc-pv-claim b', '.lc-pv-gaps-h b', '.lc-pv-gaps-h span',
          '.lc-pv-gap-k', '.lc-pv-gap-a', '.lc-pv-sum', '.lc-pv-grp-h b', '.lc-pv-grp-h span',
          '.lc-pv-badge', '.lc-pv-k', '.lc-pv-v', '.lc-card-door'];
        for (const sel of sels) {
          for (const n of document.querySelectorAll(sel)) {
            const t = (n.innerText || '').trim();
            if (!t) continue;
            const a = lum(px(getComputedStyle(n).color)), b = lum(groundOf(n));
            const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (r < 4.5) out.push(`${sel} "${t.slice(0, 22)}" ${r.toFixed(2)}`);
          }
        }
        return out;
      });
      expect(bad, bad.join(' | ')).toEqual([]);
    });
  }

  test('the per-head figure LEADS the card, on the title line', async ({ page }) => {
    // Host, 2026-09-30: "with the redesign we've lost all the pricing per
    // head". Not lost — demoted, which on this card is nearly the same thing.
    //
    // The door badge had been put on the title row, making three items
    // compete for 318px. The row was set to wrap so the name could not be
    // crushed again, and wrapping is what did it: the per-head figure dropped
    // to a second line beside the badge, no longer paired with the name.
    //
    // The host had already ruled on this row once — "per head is a major
    // thrust and needs more prominent attention" — so the badge is what
    // moves, down to the money line where a door actually changes the
    // meaning of the number beside it.
    //
    // Geometry, not presence: the old assertion a bug like this walks past is
    // "the price is visible". It was visible. It was in the wrong place.
    await page.route('**/api/lodging/unfurl**', (r) => r.fulfill({ json: { ok: true,
      title: 'Private backyard with BBQ near the Plaza', price: 2180, image: '',
      facts: { beds: 9, bedrooms: 6 }, sleeps: 12, rating: 4.93, ratingCount: 123,
      amenities: AMENITIES } }));
    await page.goto(DEMO);
    await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
    await page.locator('textarea').fill('https://www.airbnb.com/rooms/742220082744554592');
    await page.getByRole('button', { name: /Read what I pasted/i }).click();
    const card = page.locator('.lc-card').first();
    await expect(card).toBeVisible({ timeout: 30_000 });

    const row = await card.evaluate((el) => {
      const n = el.querySelector('.lc-card-name').getBoundingClientRect();
      const p = el.querySelector('.lc-card-price');
      if (!p) return { priced: false };
      const r = p.getBoundingClientRect();
      return { priced: true, text: p.innerText.trim(),
        sameLine: Math.abs(n.top - r.top) < 6, toTheRight: r.left > n.right - 1,
        nameW: Math.round(n.width) };
    });
    expect(row.priced, 'the card must show a price at all').toBe(true);
    expect(row.text).toMatch(/each/i);
    expect(row.sameLine, `per-head must sit on the title line, not below it`).toBe(true);
    expect(row.toTheRight).toBe(true);
    // ...and the name still has room to be a name. This is the other half of
    // the same row: it collapsed to 8px once, across five lines.
    expect(row.nameW).toBeGreaterThan(120);

    // The door is still shown — moved, not dropped — and now sits with the money.
    await expect(card.locator('.lc-card-sub .lc-card-door')).toHaveText('Airbnb');
  });

  test('the card says which door the place came through', async ({ page }) => {
    await seedOne(page);
    await expect(page.locator('.lc-card-door').first()).toHaveText('Airbnb');
  });
});
