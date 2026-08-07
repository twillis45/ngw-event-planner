# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tabletLandscapeSplit.spec.mjs >> the ask has a column it can set in at 1194x834
- Location: e2e/tabletLandscapeSplit.spec.mjs:36:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]: Cannot GET /ngw-event-planner/hostv2/
```

# Test source

```ts
  1  | // ─── THE TWO-COLUMN SPLIT MUST ALSO FIT (2026-08-06, board P0) ─────────────
  2  | //
  3  | // At 1024x768 landscape the ask/answer split fired into a ~680px content column
  4  | // while asking for a FIXED 440px answer column plus an 88px gap — leaving ~152px
  5  | // for a 64px headline. That breaks one word per line and reads as the ask
  6  | // overprinting the card beside it. Measured pre-fix: `.ask` = 152x261 at 64px,
  7  | // at every width in the range.
  8  | //
  9  | // The orientation guard above the media query was right and not sufficient: it
  10 | // added a SHAPE test (landscape) where a SIZE test was also needed. 1024x768 is
  11 | // item 5 in UX_03's own testing protocol; the portrait fix was verified and
  12 | // landscape was never re-driven after it.
  13 | //
  14 | // THE ASSERTION IS DELIBERATELY NOT BOX INTERSECTION. The two boxes sit side by
  15 | // side and never geometrically overlap, so an overlap test passes while the
  16 | // screen is visibly broken — the first version of this spec did exactly that and
  17 | // passed against the unfixed CSS. What fails is the TYPE: a 56px+ headline needs
  18 | // a column it can actually set in.
  19 | //
  20 | // Mutation-verified: restoring the old gate (min-width:1024) with the rigid
  21 | // `flex:0 0 440px` fails all four widths with "64px headline in a 152px column".
  22 | import { test, expect } from '@playwright/test';
  23 | 
  24 | // No guest count — that state renders an ask board with an option card, which is
  25 | // the shape the `:has(> .eanswer .card)` gate requires. A readiness hero has no
  26 | // card and never fires the split, which is why the first fixture proved nothing.
  27 | const EV = {
  28 |   id: 'E2E_TEST_tablet-split', type: 'Birthday', name: 'Split probe', isDestination: true,
  29 |   venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  30 |   totalBudget: 2000, budget: [], guests: [], vendors: [], timeline: [],
  31 | };
  32 | 
  33 | const WIDTHS = [[1024, 768], [1194, 834], [1200, 800], [1279, 800]];
  34 | 
  35 | for (const [w, h] of WIDTHS) {
  36 |   test(`the ask has a column it can set in at ${w}x${h}`, async ({ page }) => {
  37 |     await page.addInitScript((ev) => {
  38 |       localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
  39 |       localStorage.setItem('ngw-hostv2-last-event', ev.id);
  40 |       localStorage.setItem('ngw-v2-splash-seen', '1');
  41 |       localStorage.setItem('ngw-v2-welcomed', '1');
  42 |     }, EV);
  43 |     await page.setViewportSize({ width: w, height: h });
  44 |     await page.goto('./');
  45 |     await page.waitForTimeout(2200);
  46 | 
  47 |     const r = await page.evaluate(() => {
  48 |       const ask = document.querySelector('.ask');
  49 |       if (!ask) return { found: false };
  50 |       const a = ask.getBoundingClientRect();
  51 |       return {
  52 |         found: true,
  53 |         askW: Math.round(a.width),
  54 |         fs: getComputedStyle(ask).fontSize,
  55 |         docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  56 |       };
  57 |     });
  58 | 
> 59 |     expect(r.found).toBe(true);
     |                     ^ Error: expect(received).toBe(expected) // Object.is equality
  60 |     // A big headline in a narrow column is the failure. 340px is the floor the
  61 |     // fixed CSS actually delivers (360 at the split, 648 single-column).
  62 |     if (parseInt(r.fs, 10) >= 56) {
  63 |       expect(r.askW, `${w}x${h}: ${r.fs} headline in a ${r.askW}px column`).toBeGreaterThanOrEqual(340);
  64 |     }
  65 |     expect(r.docOverflow, `${w}x${h}: horizontal overflow`).toBeLessThanOrEqual(1);
  66 |   });
  67 | }
  68 | 
```