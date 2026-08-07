# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lodgingCockpit.spec.mjs >> Where everyone stays — the Santa Fe birthday >> nothing overflows the phone, and no console errors
- Location: e2e/lodgingCockpit.spec.mjs:201:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Load the Santa Fe example/i })

```

# Page snapshot

```yaml
- generic [ref=e2]: Cannot GET /ngw-event-planner/hostv2/
```

# Test source

```ts
  1   | // ─── THE LODGING SLICE, DRIVEN (2026-08-04) ────────────────────────────────
  2   | //
  3   | // The cockpit had no e2e at all. Every defect found in it this week was found
  4   | // by hand, and the two that mattered most — a pick that claimed a booking, and
  5   | // a shortlist that could not grow past one — sat behind PASSING unit gates that
  6   | // hand-built their events instead of walking the surface.
  7   | //
  8   | // This walks the real path with real gestures: seed -> doors -> paste -> weigh
  9   | // -> correct -> pick. It runs at the project viewports, so the phone tier
  10  | // (<=430px) is exercised for the first time.
  11  | //
  12  | // MOCKED, NOT LIVE (host, 2026-08-06: "mock the unfurl call in these 2 e2e
  13  | // tests"). This used to talk to the REAL unfurl backend, and said so here —
  14  | // but the e2e job's own build has never set REACT_APP_API_BASE_URL (the same
  15  | // config-free build hostv2-build and the demo release profile use), so
  16  | // isUnfurlConfigured() was false and the two specs that depend on it could
  17  | // never pass. The CI workflow now bakes a fake, reserved-TLD host
  18  | // (e2e-mock.invalid, RFC 2606 — guaranteed to never resolve) into the build
  19  | // JUST so isUnfurlConfigured() reads true; every request to it is intercepted
  20  | // below and answered with a fixed response. This tests the CODE PATH
  21  | // deterministically — the same discipline the backend suite already uses
  22  | // ("stubs every outbound client and asserts the real ones are never called")
  23  | // — rather than depending on a live external service being up during CI.
  24  | import { test, expect } from './fixtures.mjs';
  25  | 
  26  | const DEMO = './?demo=lodging';
  27  | const LISTING = 'https://www.airbnb.com/rooms/20421338';
  28  | 
  29  | // Shapes match the real backend's response, confirmed live 2026-08-05
  30  | // against https://ngw-events-api.onrender.com/api/lodging/unfurl.
  31  | const UNFURL_MOCK = {
  32  |   ok: true,
  33  |   title: 'Home in Santa Fe · ★4.86 · 4 bedrooms · 6 beds · 3 baths',
  34  |   price: 2180,
  35  |   image: 'https://a0.muscache.com/im/pictures/mock-e2e-fixture.jpg',
  36  |   facts: { beds: 6, bedrooms: 4 },
  37  |   sleeps: 10,
  38  |   rating: 4.86,
  39  |   ratingCount: 214,
  40  | };
  41  | const RESULTS_MOCK = {
  42  |   ok: true,
  43  |   links: Array.from({ length: 6 }, (_, i) => `https://www.airbnb.com/rooms/300000000${i}`),
  44  | };
  45  | const mockUnfurl = (page) => page.route('**/api/lodging/unfurl**',
  46  |   (route) => route.fulfill({ json: UNFURL_MOCK }));
  47  | const mockResults = (page) => page.route('**/api/lodging/results**',
  48  |   (route) => route.fulfill({ json: RESULTS_MOCK }));
  49  | 
  50  | // Playwright gives every test its own context, so storage already starts empty.
  51  | // An addInitScript clear() here was WRONG: it re-runs on every navigation, so it
  52  | // wiped the seed during seedExample()'s own reload and the cockpit bounced back
  53  | // to the empty state. Caught on the first run of this file.
  54  | const fresh = async (page) => { await page.goto(DEMO); };
  55  | 
  56  | // The seeded example is the ONLY fixture — no hand-built event objects, which
  57  | // is precisely how the unit gates missed the pick-claims-a-booking defect.
  58  | const seed = async (page) => {
  59  |   await fresh(page);
> 60  |   await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
      |                                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  61  |   await expect(page.locator('.lc-h1')).toBeVisible();
  62  | };
  63  | 
  64  | const paste = async (page, text) => {
  65  |   await page.locator('textarea').fill(text);
  66  |   await page.getByRole('button', { name: /Read what I pasted/i }).click();
  67  | };
  68  | 
  69  | test.describe('Where everyone stays — the Santa Fe birthday', () => {
  70  |   test('a fresh device offers the example rather than a dead end', async ({ page }) => {
  71  |     await fresh(page);
  72  |     await expect(page.locator('.lc-h1')).toHaveText(/Nothing to plan yet/i);
  73  |     // The defect this replaced named an act and offered nothing.
  74  |     await expect(page.getByRole('button', { name: /Load the Santa Fe example/i })).toBeVisible();
  75  |     await expect(page.getByRole('link', { name: /Open the planner/i })).toBeVisible();
  76  |     // The description is DERIVED — it said "five nights" while spanNights said four.
  77  |     await expect(page.locator('.lc-note').first()).toContainText('4 nights');
  78  |     await expect(page.locator('.lc-note').first()).toContainText('10 guests');
  79  |   });
  80  | 
  81  |   test('the three doors carry the answers the host already gave', async ({ page }) => {
  82  |     await seed(page);
  83  |     await expect(page.locator('.lc-h1')).toHaveText(/Go find some places/i);
  84  |     for (const door of ['Airbnb', 'Vrbo', 'Hotels']) {
  85  |       await expect(page.getByRole('link', { name: new RegExp(door, 'i') })).toBeVisible();
  86  |     }
  87  |     // ── AMENDED 2026-08-06 ───────────────────────────────────────────────
  88  |     // The line used to open "Opens with your own answers already in it" for
  89  |     // all three doors unconditionally, and rendered links[0].applied — AIRBNB'S
  90  |     // list — which put its budget and must-have filters into a sentence
  91  |     // covering two doors that never took them. It is now derived twice over:
  92  |     // the SUBJECT depends on whether every door truly carries the dates (the
  93  |     // Hotels door only started to once googleTravelTs shipped), and the LIST is
  94  |     // appliedByEveryDoor() — the intersection, never the union.
  95  |     //
  96  |     // Matching the tail rather than the whole sentence keeps this test honest
  97  |     // about the part that must always be true, while letting the subject vary
  98  |     // with what the doors actually carry.
  99  |     const line = page.getByText(/with your own answers already in it/i);
  100 |     await expect(line).toContainText('Santa Fe');
  101 |     await expect(line).toContainText('10 guests');
  102 |     // Host language, never ISO — this shipped as "2028-06-17" once.
  103 |     await expect(line).not.toHaveText(/\d{4}-\d{2}-\d{2}/);
  104 |     // The budget is Airbnb's alone; the shared line must not claim it.
  105 |     await expect(line).not.toContainText('under $');
  106 |     // This event's stay is in the future, so the Hotels door carries the dates
  107 |     // too and the caveat below must NOT be showing.
  108 |     await expect(line).toContainText('These open');
  109 |     await expect(page.getByText(/Hotels open at the town only/i)).toHaveCount(0);
  110 |   });
  111 | 
  112 |   test('a pasted listing comes back with its own facts', async ({ page }) => {
  113 |     await mockUnfurl(page);
  114 |     await seed(page);
  115 |     await paste(page, LISTING);
  116 |     // Bounded: unfurlListing aborts at 12s, so this can never hang the suite.
  117 |     await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });
  118 |     const row = page.locator('.lc-opt-name').first();
  119 |     // The name is READ, not "Airbnb listing" — that fallback means the read failed.
  120 |     await expect(row).toContainText(/Santa Fe/i);
  121 |     await expect(row).not.toHaveText(/^Airbnb listing$/);
  122 |     // `sleeps` is the field the whole comparison is blocked on; it only exists
  123 |     // because the unfurl reads the listing's structured record.
  124 |     const stored = await page.evaluate(() => {
  125 |       const ev = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0];
  126 |       return (ev.lodgingOptions || [])[0] || {};
  127 |     });
  128 |     expect(stored.sleeps, 'sleeps must come off the listing, not be typed').toBeGreaterThan(0);
  129 |     expect(String(stored.photoUrl || '')).toMatch(/^https:\/\//);
  130 |     expect(stored.sources.sleeps).toBe('read');
  131 |   });
  132 | 
  133 |   test('the kitchen claim says where it came from, and the host can overrule it', async ({ page }) => {
  134 |     await mockUnfurl(page);
  135 |     await seed(page);
  136 |     await paste(page, LISTING);
  137 |     await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });
  138 | 
  139 |     await expect(page.getByText(/There is a kitchen/i)).toBeVisible();
  140 |     // An inference must name its basis — it used to speak like a typed fact.
  141 |     await expect(page.getByText(/Taken from the Airbnb link/i)).toBeVisible();
  142 | 
  143 |     // ...and the correction must actually take. It used to persist and be ignored.
  144 |     await page.getByRole('button', { name: /A hotel or room block/i }).click();
  145 |     await expect(page.getByText(/There is no kitchen/i)).toBeVisible();
  146 |     await expect(page.getByText(/You said:/i)).toBeVisible();
  147 |   });
  148 | 
  149 |   test('the shortlist can grow, and picking is not booking', async ({ page }) => {
  150 |     await mockUnfurl(page);
  151 |     await seed(page);
  152 |     await paste(page, LISTING);
  153 |     await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });
  154 | 
  155 |     // The only route to a second place used to vanish at this stage.
  156 |     await expect(page.getByRole('button', { name: /Add another place/i })).toBeVisible();
  157 | 
  158 |     await page.getByRole('button', { name: /Make .* the pick/i }).first().click();
  159 |     // CHOOSING IS NOT BOOKING — one press used to jump straight to "on the books".
  160 |     await expect(page.getByText(/Choosing is not booking/i)).toBeVisible();
```