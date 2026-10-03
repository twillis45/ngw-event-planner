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
    // WHERE THE NAME LANDS MOVED (2026-09-29, host: "big photo deck for all").
    // A single listing used to render as a compact row and now renders as the
    // deck card, so this asserted a selector that no longer exists on this
    // screen. The FACT is unchanged — the name is read, not the fallback — so
    // the locator covers both surfaces rather than pinning the test to one.
    const row = page.locator('.lc-card-name, .lc-opt-name').first();
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
    // 'looked-up', not 'read' (2026-09-29). This asserted 'read' because that
    // was the only word the provenance vocabulary had — and this test's own
    // comment two lines up says what it actually meant: OFF THE LISTING. Once
    // a results-page paste also gets unfurled, "read" stopped distinguishing
    // the page the host pasted from the listing behind it, and the card was
    // crediting the wrong one. The stronger claim is the one that was intended.
    expect(stored.sources.sleeps).toBe('looked-up');
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

  test('every link in one paste is read, not just the first', async ({ page }) => {
    // Host, 2026-09-29: "do a paste of airbnb properties that DO fit the
    // requirements." Five real Santa Fe listings sleeping 10-16, against a
    // party of 10, pasted together — and the screen said "0 known to fit".
    //
    // The listings were right. `cands.length === 1` gated the unfurl, so two
    // or more links were read ZERO times, `sleeps` never arrived, and `sleeps`
    // is what `fits` is computed from. The comparison the whole surface exists
    // for was blocked on a number sitting one fetch away.
    //
    // Counting the CALLS, not just the rendered names: a row can be named from
    // the paste itself, so names alone would pass on a build that still read
    // only the first link.
    let calls = 0;
    await page.route('**/api/lodging/unfurl**', (route) => { calls += 1; return route.fulfill({ json: UNFURL_MOCK }); });
    await seed(page);
    await paste(page, [
      'https://www.airbnb.com/rooms/20421338',
      'https://www.airbnb.com/rooms/20421339',
      'https://www.airbnb.com/rooms/20421340',
    ].join('\n'));

    // A MULTI-CANDIDATE PASTE STAGES; it does not auto-commit. Only a single
    // listing skips this step, which is why the older test above lands
    // straight on the headline and these two do not.
    await expect(page.getByRole('button', { name: /Add 3 to the shortlist/i }))
      .toBeVisible({ timeout: 30_000 });
    expect(calls, 'one unfurl per pasted link').toBe(3);
    await page.getByRole('button', { name: /Add 3 to the shortlist/i }).click();

    await expect(page.locator('.lc-h1')).toHaveText(/3 places/i, { timeout: 30_000 });

    // sleeps 10 against the example's 10 guests, so all three FIT — the count
    // the host was shown as zero.
    await expect(page.locator('.lc-h1')).toHaveText(/3 that fit/i);
  });

  test('what we read is ordered by fit, and each row says what fit meant', async ({ page }) => {
    // Host, 2026-09-30: "sort what we read by matter of importance or priority."
    //
    // It DID rank — once, before the lookup ran. At that moment a link paste
    // had beds null, price null and no amenities on every candidate, so every
    // score was identical and the sort was a no-op: the host read them back in
    // the order they happened to paste. The lookup is what turns a bare URL
    // into a place that sleeps twelve, and it landed after the only sort.
    //
    // Three links, deliberately pasted WORST FIRST, with the backend giving
    // each a different bed count against the example's party of ten:
    //   ...338  4 beds — short for ten, someone is on a sofa
    //   ...340  8 beds
    //   ...339  12 beds — the one that actually fits
    // A build that ranks only before the lookup renders them 338, 340, 339.
    const BEDS = { 20421338: 4, 20421340: 8, 20421339: 12 };
    await page.route('**/api/lodging/unfurl**', (route) => {
      const id = (new URL(route.request().url()).searchParams.get('url') || '').match(/rooms\/(\d+)/);
      const beds = (id && BEDS[id[1]]) || 6;
      return route.fulfill({ json: { ...UNFURL_MOCK,
        title: `Home in Santa Fe · ${beds} beds`, facts: { beds, bedrooms: 4 } } });
    });
    await seed(page);
    await paste(page, [
      'https://www.airbnb.com/rooms/20421338',
      'https://www.airbnb.com/rooms/20421340',
      'https://www.airbnb.com/rooms/20421339',
    ].join('\n'));
    await expect(page.getByRole('button', { name: /Add 3 to the shortlist/i }))
      .toBeVisible({ timeout: 30_000 });

    // BEST FIT FIRST — the paste order reversed, which is the whole claim.
    // The bed count rides in the NAME here (the lookup's own title); the sub
    // line carries bedrooms/price/rating, which these mocks share.
    const names = await page.locator('.lc-staged-name').allInnerTexts();
    expect(names.length).toBe(3);
    expect(names.map((t) => (t.match(/(\d+) beds/) || [])[1])).toEqual(['12', '8', '4']);

    // AND THE ORDER SAYS WHY IT IS THE ORDER. A sort the host cannot read is
    // an assertion; the row that sank names the reason it sank.
    const fits = await page.locator('.lc-staged-fit').allInnerTexts();
    expect(fits[fits.length - 1]).toMatch(/4 beds for 10/i);
    // ...and the rows that clear show the capacity the lookup supplied. This
    // slot read "sleeps —" unconditionally until today, throwing away the one
    // number the lookup exists to fetch.
    expect(fits[0]).toMatch(/sleeps 10/i);
  });

  test('a results page keeps its price AND gains the listing\'s sleeps', async ({ page }) => {
    // Host, 2026-09-29: "pull from a path that will give us what we need ...
    // combine the best of both."
    //
    // Each paste path carried half the record, and neither half was the one
    // the surface needs:
    //   results page   names + a DATED price off the cards, never `sleeps`
    //   listing URLs   `sleeps`, amenities, rating, photo, never a price
    // So a results paste could not compute `fits` and a link paste could not
    // compute per-head. The unfurl was gated on `found.linksOnly` — precisely
    // "only when the paste told us nothing", the one case where the two could
    // never be combined.
    //
    // The merge rule is that the unfurl FILLS GAPS and never overwrites a
    // value the paste already read. This test is that rule: the mock returns a
    // DIFFERENT price from the card, and the card's must win.
    let calls = 0;
    await page.route('**/api/lodging/unfurl**', (route) => {
      calls += 1;
      return route.fulfill({ json: { ...UNFURL_MOCK, price: 99 } });
    });
    await seed(page);
    // Two cards with real hrefs and real prices, in the shape the extractor
    // reads — the same shape as the captured fixture, cut to two.
    await paste(page, [
      '<div><a href="/rooms/20421338"></a><span>Home in Santa Fe</span>',
      '<span>4 bedrooms</span><span>$2,400 total</span></div>',
      '<div><a href="/rooms/20421339"></a><span>Casita in Santa Fe</span>',
      '<span>3 bedrooms</span><span>$1,800 total</span></div>',
    ].join(''));

    await expect(page.getByRole('button', { name: /Add \d+ to the shortlist/i }))
      .toBeVisible({ timeout: 30_000 });
    expect(calls, 'a results paste must unfurl its listings too').toBeGreaterThan(0);
    await page.getByRole('button', { name: /Add \d+ to the shortlist/i }).click();

    await expect(page.locator('.lc-h1')).toHaveText(/2 places/i, { timeout: 30_000 });

    // sleeps came from the listing — the card never carries it.
    await expect(page.locator('.lc-h1')).toHaveText(/2 that fit|2 known to fit/i);

    // ...and the CARD's price survived the merge. 99 would mean the unfurl
    // overwrote a value the host had already seen on the page they copied.
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/\$99\b/);
  });

  test('the group\'s number leads the card, and fitment reads as a state', async ({ page }) => {
    // Host, 2026-09-29: "per head is a major thrust and needs more prominent
    // attention", then "the fitment should be prominent as well".
    //
    // The card led with the stay TOTAL and put per-head third, in page tokens
    // (--ink/--muted) over a photograph — which is why the tail was invisible
    // on a bright listing. Fitment was one clause in that same grey sentence.
    //
    // This asserts the RANKING, not the wording: per-head occupies the lead
    // slot, the total is still present but demoted, and the fit chip carries
    // the engine's own reason rather than a bare tick. UX_01 allows one loud
    // thing, so a test that only checked "per-head is big" would pass on a
    // card with two competing headline numbers.
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    const lead = page.locator('.lc-card-lead-each').first();
    await expect(lead).toBeVisible();
    await expect(lead).toHaveText(/\$\d[\d,]* each/);

    // The total is ranked BELOW, not deleted.
    await expect(page.locator('.lc-card-sub').first()).toHaveText(/in total/);

    // One loud thing: the lead and the name share a size; nothing else on the
    // card competes with them.
    const sizes = await page.evaluate(() => {
      const card = document.querySelector('.lc-card');
      const n = (s) => parseFloat(getComputedStyle(card.querySelector(s)).fontSize);
      return { lead: n('.lc-card-lead-each'), name: n('.lc-card-name'), sub: n('.lc-card-sub') };
    });
    expect(sizes.lead).toBe(sizes.name);
    expect(sizes.sub).toBeLessThan(sizes.lead);

    // Fitment is a state with a REASON, never a bare tick — UX_02: never
    // communicate state by colour alone.
    const chip = page.locator('.lc-fitchip').first();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText(/sleeps/i);

    // And it is legible where it actually sits: over a photo, on its own pill,
    // not in page tokens. 4.5:1 is the floor for both the chip and the hedge.
    const contrast = await page.evaluate(() => {
      const px = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      // ALPHA COUNTS. This used px() on the text colour and threw the alpha
      // away, so rgba(255,255,255,.06) — invisible — measured as pure white
      // and sailed past 4.5. Caught by red-proofing: I made the tail
      // effectively transparent and all sixteen tests still passed. A
      // translucent colour is composited over its ground first, which is what
      // the eye does.
      const alpha = (c) => { const m = String(c).match(/[\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1; };
      const over = (fg, a, bg) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
      const L = (r) => { const f = r.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const ratio = (fgCss, bgCss) => {
        const bg = px(bgCss);
        const eff = over(px(fgCss), alpha(fgCss), bg);
        const [x, y] = [L(eff), L(bg)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };
      // THE GROUND EACH ONE ACTUALLY SITS ON, read from the DOM. This was
      // hardcoded to rgb(0,0,0) back when the copy sat on a dark pill over a
      // photo. The photo is inset now and the ground is --card, so a fixed
      // black would keep passing while saying nothing about what a host sees.
      const paint = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const m = String(bg).match(/[\d.]+/g);
          if (m && (m.length < 4 || Number(m[3]) > 0.85)) return bg;
          n = n.parentElement;
        }
        return getComputedStyle(document.body).backgroundColor;
      };
      const c = document.querySelector('.lc-fitchip');
      const t = document.querySelector('.lc-card-each');
      return {
        chip: ratio(getComputedStyle(c).color, paint(c)),
        tail: t ? ratio(getComputedStyle(t).color, paint(t)) : 99,
      };
    });
    expect(contrast.chip).toBeGreaterThan(4.5);
    expect(contrast.tail).toBeGreaterThan(4.5);
  });

  test('the deck opens on what the plan would pick, and says so', async ({ page }) => {
    // Host, 2026-09-29: "default to most recommended based on needs for the
    // event." The deck opened on whichever place was added first, so the card
    // a host saw — on a phone, often the only card they saw — was an accident
    // of paste order. The ranking that answers "which of these suits this
    // event" already existed and was used only for a sentence BELOW the deck.
    //
    // The real assertion is AGREEMENT: the first card and the "what the plan
    // would pick" panel must name the same place. Two surfaces disagreeing
    // about the recommendation is worse than neither offering one, and a test
    // that only checked "the deck is sorted" would not catch it.
    let n = 0;
    await page.route('**/api/lodging/unfurl**', (route) => {
      n += 1;
      // Two places, both fitting: the SECOND is the better one on price, so a
      // deck that simply kept insertion order would lead with the wrong card.
      return route.fulfill({ json: { ...UNFURL_MOCK, price: n === 1 ? 9000 : 2000, sleeps: 12 } });
    });
    await seed(page);
    await paste(page, [
      '<div><a href="/rooms/20421338"></a><span>Pricey place</span><span>4 bedrooms</span></div>',
      '<div><a href="/rooms/20421339"></a><span>Better value place</span><span>4 bedrooms</span></div>',
    ].join(''));
    await page.getByRole('button', { name: /Add \d+ to the shortlist/i }).click({ timeout: 30_000 });
    await expect(page.locator('.lc-h1')).toHaveText(/2 places/i, { timeout: 30_000 });

    const first = (await page.locator('.lc-card .lc-card-name').allInnerTexts())[0];
    // Read the panel BY ITS LABEL, not by hunting for an em-dash in any
    // .lc-body — that worked only while the panel was one "Label — reason."
    // sentence, and broke the moment the reasons became their own list.
    const panel = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('*')].filter(
        (n) => n.children.length && /WHAT THE PLAN WOULD PICK/.test(n.innerText || ''),
      );
      const host = nodes[nodes.length - 1];
      const body = host && host.querySelector('.lc-body');
      return body ? body.innerText.trim() : '';
    });
    // Whatever the engine picked, the deck leads with it and the panel names it.
    expect(panel.startsWith(first.split(' · ')[0])).toBe(true);

    // And the leading card says WHY it leads, so the order is a proposal.
    const chips = await page.locator('.lc-card').first().locator('.lc-fitchip').allInnerTexts();
    expect(chips.join(' | ')).toMatch(/Best match for this event/);
  });

  test('the plan says WHY it picked, drawbacks included', async ({ page }) => {
    // Host, 2026-09-29: "plan should tell why its recommended in what the plan
    // would pick." The panel printed rec.why[0] and stopped — one clause out
    // of a list the ranking had already built. A host reading a single clause
    // cannot tell whether the pick won on price or on fit, and cannot
    // disagree with a reason they were never shown.
    //
    // The assertion that matters is the AGAINST. reasons carries "doesn't
    // mention X" and "$N over your budget" beside the wins, and a panel that
    // showed only the wins would be an advertisement. So this asserts both a
    // for and an against are present and that they are told apart.
    let n = 0;
    await page.route('**/api/lodging/unfurl**', (route) => {
      n += 1;
      return route.fulfill({ json: { ...UNFURL_MOCK, price: n === 1 ? 9000 : 2000, sleeps: 12 } });
    });
    await seed(page);
    await paste(page, [
      '<div><a href="/rooms/20421338"></a><span>Pricey place</span><span>4 bedrooms</span></div>',
      '<div><a href="/rooms/20421339"></a><span>Better value place</span><span>4 bedrooms</span></div>',
    ].join(''));
    await page.getByRole('button', { name: /Add \d+ to the shortlist/i }).click({ timeout: 30_000 });
    await expect(page.locator('.lc-h1')).toHaveText(/2 places/i, { timeout: 30_000 });

    const why = page.locator('.lc-pickwhy').first();
    await expect(why).toBeVisible();
    const items = await why.locator('li').allInnerTexts();
    // More than the one clause this used to print.
    expect(items.length).toBeGreaterThan(1);
    expect(items.join(' | ')).toMatch(/sleeps/i);

    // At least one reason is marked as a drawback, and it is not the same
    // element as the wins — colour alone would not survive a grayscale read,
    // so the class is the claim.
    const against = await why.locator('li.lc-pickwhy-against').count();
    const forCount = items.length - against;
    expect(against).toBeGreaterThan(0);
    expect(forCount).toBeGreaterThan(0);
  });

  test('the photo opens the listing, and only when there is one to open', async ({ page }) => {
    // Host, 2026-09-30: "click on image should take host to listing." Tapping
    // a property photo to open the property is what every listing app on a
    // phone does; this one made the host find the text link underneath.
    //
    // The second half is the part worth gating: a hotel candidate carries no
    // url (extractHotelCandidates refuses Google's ad redirects), and a
    // picture that looks tappable and is not is worse than one that never
    // offered. So this asserts the link EXISTS with a url and is ABSENT
    // without one.
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    const shot = page.locator('.lc-card-shot').first();
    const link = shot.locator('a.lc-shot-link');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', /airbnb\.com\/rooms\//);
    // A new tab, and no window.opener handed to a third-party page.
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // The picture itself is the target, not a sliver of it.
    const covers = await page.evaluate(() => {
      const s = document.querySelector('.lc-card-shot');
      const a = s && s.querySelector('a.lc-shot-link');
      if (!a) return 0;
      const sr = s.getBoundingClientRect(); const ar = a.getBoundingClientRect();
      return (ar.width * ar.height) / (sr.width * sr.height);
    });
    expect(covers).toBeGreaterThan(0.8);

    // And it is a real anchor, so it survives long-press, middle-click and a
    // screen reader's link list — a div with an onClick would not.
    await expect(link).toHaveJSProperty('tagName', 'A');
  });

  test('an Airbnb badge never becomes the property photo', async ({ page }) => {
    // Found by driving the real captured results page: two of six cards showed
    // Airbnb's "Guest favourite" trophy as the house, because Airbnb serves
    // its badge art from the same CDN as listing photography. It passed every
    // check — it IS a real image on an allowed host.
    //
    // The unit test covers the predicate. THIS covers the wiring, which is the
    // part that was actually wrong: isAllowedMedia was being asked a question
    // it does not answer, in three different places.
    await page.route('**/api/lodging/unfurl**', (route) => route.fulfill({
      json: { ...UNFURL_MOCK, image: 'https://a0.muscache.com/im/pictures/miso/Hosting-9/original/real.jpeg' },
    }));
    await seed(page);
    // A card whose only image is the badge.
    await paste(page,
      '<div><a href="/rooms/20421338"></a>'
      + '<img src="https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-GuestFavorite"/>'
      + '<span>Badge place</span><span>4 bedrooms</span></div>');
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    const src = await page.evaluate(() => {
      const img = document.querySelector('.lc-card-shot img');
      return img ? img.src : '';
    });
    // The trophy is gone...
    expect(src).not.toMatch(/airbnb-platform-assets/);
    // ...and because the merge fills gaps, the LISTING's own photo takes the
    // slot the badge was occupying. Blanking it would have been acceptable;
    // this is better, and it only happens because rejecting the badge leaves
    // a gap for the unfurl to fill.
    expect(src).toMatch(/Hosting-9\/original\/real\.jpeg/);
  });

  test('the shortlist can grow, and picking is not booking', async ({ page }) => {
    await mockUnfurl(page);
    await seed(page);
    await paste(page, LISTING);
    await expect(page.locator('.lc-h1')).toHaveText(/One place so far/i, { timeout: 20_000 });

    // The only route to a second place used to vanish at this stage.
    await expect(page.getByRole('button', { name: /Add another place/i })).toBeVisible();

    await // The deck card's button is labelled by aria-label ("Pick <the place>"), not
    // by its visible "Pick this place" — getByRole matches the ACCESSIBLE name,
    // so the alternation has to be the label, not the text.
    page.getByRole('button', { name: /Make .* the pick|^Pick\s/i }).first().click();
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
    // THE READS ARE PART OF THE PROMISE NOW. This test mocked only /results,
    // which was right when accepting the offer staged bare links and fetched
    // nothing. It now reads each place, so leaving /unfurl unmocked tested the
    // failure path while claiming to test the happy one — the rows came back
    // "sleeps —" because the reads were hitting a network that is not there.
    await mockUnfurl(page);
    await seed(page);
    await paste(page, 'https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&checkout=2028-06-21&adults=10');

    const offer = page.getByText(/I can read the places on it/i);
    await expect(offer).toBeVisible({ timeout: 20_000 });
    // IT MUST PRICE THE WAIT, up front. This used to assert the opposite —
    // "links, not names or prices" — which was true when accepting the offer
    // staged bare URLs. It now reads each place, so the promise inverted: the
    // facts DO come back, and what the host needs warning about is the twenty
    // seconds it costs, not a limit that no longer applies.
    // PRICES ARE BACK, and the history is worth keeping because the copy
    // moved twice in one day. A LISTING page carries no price (verified), so
    // the morning's cut removed the promise. The RESULTS page does carry
    // them, the backend now reads them off the cards, and prod returns 18 of
    // 18 priced from Render's datacenter IP — so the offer says so again.
    await expect(offer).toContainText(/what the whole stay costs/i);
    await expect(offer).toContainText(/sleeps and what it has/i);
    // NO DURATION. An earlier cut asserted "about twenty seconds" — a figure
    // measured once, warm, with nothing refused. The offer now says a moment
    // and points at the counter, which cannot be wrong about itself.
    await expect(offer).toContainText(/count them off as they come in/i);
    // The "not prices — copy the whole results page" note is gone: it told
    // the host to do by hand the thing the pull now does for them.
    await expect(page.getByText(/a listing page doesn.t carry one/i)).toHaveCount(0);
    await expect(offer).not.toContainText(/twenty seconds/i);
    // And declining must still leave the host a route.
    await expect(page.getByRole('button', { name: /No, I’ll pick one/i })).toBeVisible();

    await page.getByRole('button', { name: /Pull the places in/i }).click();

    // The staged review is the existing surface — the host unticks what they
    // were not really considering before anything joins the shortlist.
    await expect(page.getByText(/FROM THE PAGE YOU PASTED/i)).toBeVisible({ timeout: 25_000 });
    const rows = page.locator('.lc-staged');
    expect(await rows.count(), 'a Santa Fe search carries a page of places').toBeGreaterThan(3);
    // AND THE ROWS CARRY FACTS. The two assertions here used to require
    // "sleeps —" and "I got the links but not the details" to be on screen,
    // which is exactly the state the host called out: a list with nothing to
    // choose between is not a choice. Both must now be ABSENT.
    await expect(page.getByText(/sleeps —/)).toHaveCount(0);
    await expect(page.getByText(/I got the links but not the details/i)).toHaveCount(0);
    const named = await page.locator('.lc-staged-name').allInnerTexts();
    expect(named.length, 'every staged row is named').toBe(await rows.count());
    // The commit CTA counts what will actually be added.
    await expect(page.getByRole('button', { name: /Add \d+ to the shortlist/i })).toBeVisible();
  });

  // ── WHEN THE SITE DECLINES, STOP AND SAY SO ───────────────────────────────
  // Found by accident: the test above mocked /results but not /unfurl, so every
  // read failed and the rows stayed bare. That is the correct behaviour under a
  // refusing host, and it had no gate — so it gets one. The backend's own note
  // is why this matters: "Airbnb and Vrbo actively block datacenter traffic …
  // a meaningful share of requests will come back 403/429." Continuing past a
  // refusal is how one blocked read becomes a blocked IP.
  test('a refusing site stops the run and is named, not hidden', async ({ page }) => {
    await mockResults(page);
    let reads = 0;
    await page.route('**/api/lodging/unfurl**', (route) => {
      reads += 1;
      return route.fulfill({ status: 502, json: { detail: 'The site declined an automated read (this is common).' } });
    });
    await seed(page);
    await paste(page, 'https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&checkout=2028-06-21&adults=10');
    await page.getByRole('button', { name: /Pull the places in/i }).click();
    await expect(page.getByText(/FROM THE PAGE YOU PASTED/i)).toBeVisible({ timeout: 25_000 });

    // THE BREAKER HELD. Six links, and it must not have tried all six: two
    // consecutive refusals stop it. The pool is two wide, so at most one more
    // can already be in flight when the second failure lands.
    expect(reads, `stopped after ${reads} refusals of 6 links`).toBeLessThanOrEqual(3);

    // And the host is told which thing happened, because "paste the page" is
    // the fix for this one and a different sentence is the fix for a truncation.
    await expect(page.getByText(/stopped answering partway/i)).toBeVisible();
    await expect(page.getByText(/copy the results page itself/i)).toBeVisible();
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
    await // The deck card's button is labelled by aria-label ("Pick <the place>"), not
    // by its visible "Pick this place" — getByRole matches the ACCESSIBLE name,
    // so the alternation has to be the label, not the text.
    page.getByRole('button', { name: /Make .* the pick|^Pick\s/i }).first().click();
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
