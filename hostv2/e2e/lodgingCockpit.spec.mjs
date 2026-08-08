// ─── THE LODGING SLICE, DRIVEN (2026-08-04) ────────────────────────────────
//
// The cockpit had no e2e at all. Every defect found in it this week was found
// by hand, and the two that mattered most — a pick that claimed a booking, and
// a shortlist that could not grow past one — sat behind PASSING unit gates that
// hand-built their events instead of walking the surface.
//
// This walks the real path with real gestures: seed -> doors -> paste -> weigh
// -> correct -> pick. It runs at the project viewports, so the phone tier
// (<=430px) is exercised for the first time.
//
// MOCKED, NOT LIVE (host, 2026-08-06: "mock the unfurl call in these 2 e2e
// tests"). This used to talk to the REAL unfurl backend, and said so here —
// but the e2e job's own build has never set REACT_APP_API_BASE_URL (the same
// config-free build hostv2-build and the demo release profile use), so
// isUnfurlConfigured() was false and the two specs that depend on it could
// never pass. The CI workflow now bakes a fake, reserved-TLD host
// (e2e-mock.invalid, RFC 2606 — guaranteed to never resolve) into the build
// JUST so isUnfurlConfigured() reads true; every request to it is intercepted
// below and answered with a fixed response. This tests the CODE PATH
// deterministically — the same discipline the backend suite already uses
// ("stubs every outbound client and asserts the real ones are never called")
// — rather than depending on a live external service being up during CI.
import { test, expect } from './fixtures.mjs';

const DEMO = './?demo=lodging';
const LISTING = 'https://www.airbnb.com/rooms/20421338';

// Shapes match the real backend's response, confirmed live 2026-08-05
// against https://ngw-events-api.onrender.com/api/lodging/unfurl.
const UNFURL_MOCK = {
  ok: true,
  title: 'Home in Santa Fe · ★4.86 · 4 bedrooms · 6 beds · 3 baths',
  price: 2180,
  image: 'https://a0.muscache.com/im/pictures/mock-e2e-fixture.jpg',
  facts: { beds: 6, bedrooms: 4 },
  sleeps: 10,
  rating: 4.86,
  ratingCount: 214,
};
const RESULTS_MOCK = {
  ok: true,
  links: Array.from({ length: 6 }, (_, i) => `https://www.airbnb.com/rooms/300000000${i}`),
};
const mockUnfurl = (page) => page.route('**/api/lodging/unfurl**',
  (route) => route.fulfill({ json: UNFURL_MOCK }));
const mockResults = (page) => page.route('**/api/lodging/results**',
  (route) => route.fulfill({ json: RESULTS_MOCK }));

// Playwright gives every test its own context, so storage already starts empty.
// An addInitScript clear() here was WRONG: it re-runs on every navigation, so it
// wiped the seed during seedExample()'s own reload and the cockpit bounced back
// to the empty state. Caught on the first run of this file.
const fresh = async (page) => { await page.goto(DEMO); };

// The seeded example is the ONLY fixture — no hand-built event objects, which
// is precisely how the unit gates missed the pick-claims-a-booking defect.
const seed = async (page) => {
  await fresh(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await expect(page.locator('.lc-h1')).toBeVisible();
};

const paste = async (page, text) => {
  await page.locator('textarea').fill(text);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
};

test.describe('Where everyone stays — the Santa Fe birthday', () => {
  test('a fresh device offers the example rather than a dead end', async ({ page }) => {
    await fresh(page);
    await expect(page.locator('.lc-h1')).toHaveText(/Nothing to plan yet/i);
    // The defect this replaced named an act and offered nothing.
    await expect(page.getByRole('button', { name: /Load the Santa Fe example/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open the planner/i })).toBeVisible();
    // The description is DERIVED — it said "five nights" while spanNights said four.
    await expect(page.locator('.lc-note').first()).toContainText('4 nights');
    await expect(page.locator('.lc-note').first()).toContainText('10 guests');
  });

  test('the three doors carry the answers the host already gave', async ({ page }) => {
    await seed(page);
    await expect(page.locator('.lc-h1')).toHaveText(/Go find some places/i);
    for (const door of ['Airbnb', 'Vrbo', 'Hotels']) {
      await expect(page.getByRole('link', { name: new RegExp(door, 'i') })).toBeVisible();
    }
    // ── AMENDED 2026-08-06 ───────────────────────────────────────────────
    // The line used to open "Opens with your own answers already in it" for
    // all three doors unconditionally, and rendered links[0].applied — AIRBNB'S
    // list — which put its budget and must-have filters into a sentence
    // covering two doors that never took them. It is now derived twice over:
    // the SUBJECT depends on whether every door truly carries the dates (the
    // Hotels door only started to once googleTravelTs shipped), and the LIST is
    // appliedByEveryDoor() — the intersection, never the union.
    //
    // Matching the tail rather than the whole sentence keeps this test honest
    // about the part that must always be true, while letting the subject vary
    // with what the doors actually carry.
    const line = page.getByText(/with your own answers already in it/i);
    await expect(line).toContainText('Santa Fe');
    await expect(line).toContainText('10 guests');
    // Host language, never ISO — this shipped as "2028-06-17" once.
    await expect(line).not.toHaveText(/\d{4}-\d{2}-\d{2}/);
    // The budget is Airbnb's alone; the shared line must not claim it.
    await expect(line).not.toContainText('under $');
    // This event's stay is in the future, so the Hotels door carries the dates
    // too and the caveat below must NOT be showing.
    await expect(line).toContainText('These open');
    await expect(page.getByText(/Hotels open at the town only/i)).toHaveCount(0);
  });

  test('a pasted listing comes back with its own facts', async ({ page }) => {
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    // Bounded: unfurlListing aborts at 12s, so this can never hang the suite.
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });
    const row = page.locator('.lc-opt-name').first();
    // The name is READ, not "Airbnb listing" — that fallback means the read failed.
    await expect(row).toContainText(/Santa Fe/i);
    await expect(row).not.toHaveText(/^Airbnb listing$/);
    // `sleeps` is the field the whole comparison is blocked on; it only exists
    // because the unfurl reads the listing's structured record.
    const stored = await page.evaluate(() => {
      const ev = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0];
      return (ev.lodgingOptions || [])[0] || {};
    });
    expect(stored.sleeps, 'sleeps must come off the listing, not be typed').toBeGreaterThan(0);
    expect(String(stored.photoUrl || '')).toMatch(/^https:\/\//);
    expect(stored.sources.sleeps).toBe('read');
  });

  test('the kitchen claim says where it came from, and the host can overrule it', async ({ page }) => {
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    await expect(page.getByText(/There is a kitchen/i)).toBeVisible();
    // An inference must name its basis — it used to speak like a typed fact.
    await expect(page.getByText(/Taken from the Airbnb link/i)).toBeVisible();

    // ...and the correction must actually take. It used to persist and be ignored.
    await page.getByRole('button', { name: /A hotel or room block/i }).click();
    await expect(page.getByText(/There is no kitchen/i)).toBeVisible();
    await expect(page.getByText(/You said:/i)).toBeVisible();
  });

  test('the shortlist can grow, and picking is not booking', async ({ page }) => {
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    // The only route to a second place used to vanish at this stage.
    await expect(page.getByRole('button', { name: /Add another place/i })).toBeVisible();

    await page.getByRole('button', { name: /Make .* the pick/i }).first().click();
    // CHOOSING IS NOT BOOKING — one press used to jump straight to "on the books".
    await expect(page.getByText(/Choosing is not booking/i)).toBeVisible();
    await expect(page.locator('.lc-step.is-on')).toHaveText(/The pick/i);
    await expect(page.locator('.lc-h1')).not.toHaveText(/on the books/i);
    // It names the act AND offers it. Matched on the ACCESSIBLE name, which
    // carries the house — an aria-label overrides the visible text, and that is
    // deliberate here: with two places on screen "Open it to book" alone would
    // be announced twice with nothing to tell them apart.
    await expect(page.getByRole('link', { name: /Open .* to book it/i })).toBeVisible();
  });

  // ── A SEARCH LINK USED TO BE A DEAD END ─────────────────────────────────
  // It answered "that's the search link, not a house" and sent the host back to
  // do it by hand. The page does carry its listing ids, so we offer to read
  // them — links only, because names and prices are not reliably pairable to
  // the ids, and only the places the host KEEPS are ever read individually.
  test('a search link offers to pull its places in, and says what it cannot give', async ({ page }) => {
    await mockResults(page);
    await seed(page);
    await paste(page, 'https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&checkout=2028-06-21&adults=10');

    const offer = page.getByText(/I can read the places on it/i);
    await expect(offer).toBeVisible({ timeout: 20_000 });
    // It must say what it will NOT give, up front.
    await expect(offer).toContainText(/links, not names or prices/i);
    // And declining must still leave the host a route.
    await expect(page.getByRole('button', { name: /No, I’ll pick one/i })).toBeVisible();

    await page.getByRole('button', { name: /Pull the places in/i }).click();

    // The staged review is the existing surface — the host unticks what they
    // were not really considering before anything joins the shortlist.
    await expect(page.getByText(/FROM THE PAGE YOU PASTED/i)).toBeVisible({ timeout: 25_000 });
    const rows = page.locator('.lc-staged');
    expect(await rows.count(), 'a Santa Fe search carries a page of places').toBeGreaterThan(3);
    // Honest about what a results page never carries.
    await expect(page.getByText(/sleeps —/).first()).toBeVisible();
    await expect(page.getByText(/I got the links but not the details/i)).toBeVisible();
    // The commit CTA counts what will actually be added.
    await expect(page.getByRole('button', { name: /Add \d+ to the shortlist/i })).toBeVisible();
  });

  test('nothing overflows the phone, and no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));

    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'the page must never scroll sideways').toBeLessThanOrEqual(0);
    expect(await page.locator('body').innerText()).not.toMatch(/undefined|NaN|\[object/);
    expect(errors).toEqual([]);
  });
});

// ── THE FIX THAT CLOSED THE HOTEL PATH (2026-08-06, review board) ──────────
// Hotel photos are refused because Google's CDN never cleared the media
// allowlist — correct, and guest-privacy-load-bearing. But it made EVERY hotel
// card photo-less, and the photo-less branch carried `height:100%` on its
// placeholder: it consumed the whole card and pushed name / price / "Pick this
// place" past `overflow:hidden` on .lc-card. Measured before the fix: card
// 372→731, placeholder 359px, the button at 822 — 91px below the card's bottom
// edge, and elementFromPoint returned .lc-why-sum. Not visible, not clickable.
//
// An all-hotel shortlist could not reach `picked` at all, and the whole suite
// stayed green: nothing asserted that the primary act was REACHABLE. A photo is
// not a precondition for choosing a place, so this drives the no-photo card.
test.describe('a place with no photo can still be picked', () => {
  test('the Pick button is inside its card and hit-testable', async ({ page }) => {
    await seed(page);
    // A Google Hotels results page: real card shape, no per-hotel url, and —
    // the point of this test — an image host the allowlist refuses.
    await paste(page, [
      '<div>https://www.google.com/travel/search?q=hotels</div>',
      '<a href="/aclk?adurl=x"><img src="https://lh3.googleusercontent.com/a"/>',
      '<span>Inn of the Turquoise Bear</span><span>$212</span><span>4.9/5</span>',
      '<span>(242)</span><span>4-star hotel</span></a>',
      // TWO places: the swipe deck (.lc-card) only renders with more than one
      // live option; a single option takes the list layout instead.
      '<a href="/aclk?adurl=y"><img src="https://lh3.googleusercontent.com/b"/>',
      '<span>La Fonda on the Plaza</span><span>$257</span><span>4.5/5</span>',
      '<span>(2.9K)</span><span>4-star hotel</span></a>',
    ].join(''));
    const add = page.getByRole('button', { name: /Add \d+ to the shortlist|Add it/i });
    if (await add.count()) await add.first().click();

    const card = page.locator('.lc-card').first();
    await expect(card).toBeVisible();
    // The placeholder must not have eaten the card.
    await expect(card.locator('.lc-card-nophoto')).toBeVisible();

    const pick = card.getByRole('button', { name: /Pick/i }).first();
    await expect(pick).toBeVisible();

    // Geometry, not just visibility: Playwright's actionability would catch a
    // clipped button, but this states the actual invariant that broke.
    const inside = await card.evaluate((el) => {
      const btn = [...el.querySelectorAll('button')].find((b) => /Pick this place/i.test(b.innerText || ''));
      if (!btn) return { found: false };
      const c = el.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + 30, b.top + 8);
      return { found: true, insideCard: b.bottom <= c.bottom, hitTestable: hit === btn || btn.contains(hit) };
    });
    expect(inside.found).toBe(true);
    expect(inside.insideCard).toBe(true);
    expect(inside.hitTestable).toBe(true);

    // And it actually works — the whole point.
    await pick.click();
    await expect(page.locator('.lc-step.is-on')).toHaveText(/The pick/i);
  });

  test('a hotel row shows the rate it knows, labelled as one room', async ({ page }) => {
    await seed(page);
    await paste(page, [
      '<div>https://www.google.com/travel/search?q=hotels</div>',
      '<a href="/aclk?adurl=x"><img src="https://lh3.googleusercontent.com/a"/>',
      '<span>Inn of the Turquoise Bear</span><span>$212</span><span>4-star hotel</span></a>',
      '<a href="/aclk?adurl=y"><img src="https://lh3.googleusercontent.com/b"/>',
      '<span>La Fonda on the Plaza</span><span>$257</span><span>4-star hotel</span></a>',
    ].join(''));
    const add = page.getByRole('button', { name: /Add \d+ to the shortlist|Add it/i });
    if (await add.count()) await add.first().click();
    const card = page.locator('.lc-card').first();
    // $212 x 4 nights = one room, not the stay. The total is withheld; the rate
    // is shown and says what it buys.
    await expect(card).toContainText(/\$212 a night · one room/);
    await expect(card).not.toContainText(/\$848/);
    await expect(card).not.toContainText(/a person/);
  });

  // ── THE DEEP LINK THAT ARRIVES (2026-08-08) ─────────────────────────────
  // The cockpit is a PAGE LOAD, not a sheet, so `focus` cannot ride in state
  // the way it does for every other sheet kind — it has to cross in the URL.
  // It did not: the shared dispatcher called goToLodgingCockpit() with no
  // argument, one line above the generic path that preserves focus for
  // everything else. The group-rate obligation ("Group rate ends — N of M have
  // no room yet") therefore landed on whatever stage the cockpit derived, with
  // no anchor. The unit gate holds the seam; this holds the LANDING, which is
  // the only thing the host actually experiences.
  test('a deadline deep link lands on the rate field, not just the surface', async ({ page }) => {
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });
    await page.getByRole('button', { name: /Make .* the pick/i }).first().click();
    await expect(page.locator('.lc-step.is-on')).toHaveText(/The pick/i);

    // A SHORT VIEWPORT, DELIBERATELY. The first cut of this test asserted
    // toBeInViewport() at the desktop size and PASSED WITH THE LANDING
    // DISABLED — the rate field sits above the fold on a tall window, so the
    // assertion was free and the test proved nothing. Mutation-checked, not
    // assumed. The field has to start below the fold for "it scrolled to it"
    // to mean anything.
    await page.setViewportSize({ width: 420, height: 520 });
    // Arrive the way the raise sends them.
    await page.goto('./?demo=lodging&focus=deadline');
    const rate = page.locator('#lc-rate-ends');
    await expect(rate).toBeVisible();
    // IN VIEW, not merely present. `toBeVisible` passes on a field sitting
    // below the fold, which is exactly the failure being fixed — the host
    // arrived at the right screen and still could not see the thing.
    await expect(rate).toBeInViewport();
  });

  // The other half of the contract, and the easier one to get wrong: a link
  // may point at a row, but it may not claim the host is further along than
  // they are. On a seeded example with nothing weighed, `picked` is a screen
  // that says "Nothing picked yet" — landing a deadline link there would
  // invent a stage.
  test('a deadline deep link does not invent a stage the host has not reached', async ({ page }) => {
    await seed(page);
    await page.goto('./?demo=lodging&focus=deadline');
    await expect(page.locator('#lc-rate-ends')).toHaveCount(0);
    await expect(page.locator('.lc-step.is-on')).not.toHaveText(/The pick/i);
  });
});
