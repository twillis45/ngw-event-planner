// "I'M USING A RESULTS LINK IN PROD AND NOT GETTING THE LIST OF PROPERTIES
// THAT MATCH" (host, 2026-09-30).
//
// Measured against the live endpoint rather than assumed: a real Airbnb search
// returns TWENTY links. The paste handler only looked listings up when there
// were UNFURL_MAX (8) or fewer, so twenty skipped the read entirely and every
// row rendered "Airbnb listing / sleeps —" — no name, no price, nothing to
// match against. The host was looking at the failure state of a feature that
// had never been exercised at real size.
//
// Raising the cap is the wrong fix: twenty sequential reads at ~3s each is a
// sixty-second wait. The right one was already written down in
// lodgingResults' own docstring — the host "unticks what they were not really
// considering, and only the places they KEEP are ever read individually".
// Staging twenty is cheap. Reading the four that survive is the point.
import { test, expect, settled } from './fixtures.mjs';

const DEMO = './?demo=lodging';
const SEARCH = 'https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2027-06-17&adults=10';
const LINKS = Array.from({ length: 20 }, (_, i) => `https://www.airbnb.com/rooms/90000000${i}`);

const wire = async (page) => {
  let reads = 0;
  await page.route('**/api/lodging/results**', (r) => r.fulfill({ json: { ok: true, links: LINKS } }));
  await page.route('**/api/lodging/unfurl**', (r) => {
    reads += 1;
    const id = (new URL(r.request().url()).searchParams.get('url') || '').match(/rooms\/(\d+)/);
    return r.fulfill({ json: { ok: true, title: `Casa ${id ? id[1].slice(-1) : '?'} — read on commit`,
      price: 2400, image: '', facts: { beds: 12, bedrooms: 6 }, sleeps: 12,
      rating: 4.9, ratingCount: 50, amenities: ['Kitchen', 'Washer', 'Free parking on premises'] } });
  });
  return () => reads;
};

test('a whole search is read, so the rows can be told apart', async ({ page }) => {
  const reads = await wire(page);
  await page.goto(DEMO); await settled(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill(SEARCH);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();

  // The search link offers to pull its places in.
  //
  // NAMED EXACTLY, 2026-10-03. This was /pull|read|places/i with .first(),
  // and it broke the day the must-have fold opened at rest: the requirement
  // chip "Real beds, not pull-outs" contains "pull", sits ABOVE the doors in
  // DOM order, and was hidden from the accessibility tree only because the
  // fold was shut. So .first() started clicking a requirement chip, the
  // search was never pulled, and the failure surfaced thirty seconds later
  // as "Add N to the shortlist" never appearing — nowhere near the cause.
  //
  // A three-alternative regex plus .first() is a selector that matches
  // whatever the page happens to put first. The button has a name.
  const pull = page.getByRole('button', { name: /^Pull the places in$/i });
  if (await pull.count()) await pull.click().catch(() => {});

  const add = page.getByRole('button', { name: /Add \d+ to the shortlist/i });
  await expect(add).toBeVisible({ timeout: 30_000 });

  // ── A LIST WITH NOTHING TO CHOOSE BETWEEN IS NOT A CHOICE ──────────────
  // Host, 2026-10-02: "if the host will choose which to add to shortlist but
  // there are no distinguishing characteristics then there really is no
  // choice being made."
  //
  // WHAT THIS TEST USED TO ASSERT, and why it was half right. It held that a
  // search must not trigger twenty reads up front — true, twenty sequential
  // reads at ~3s is a minute of spinner — and concluded that the right answer
  // was to stage all twenty and read NONE. That produced twenty rows reading
  // "Airbnb listing / sleeps —", and asked the host to untick twelve of them
  // on no information at all. The wait was avoided by making the screen
  // useless.
  //
  // The other intake path never had this problem: pasting eight listing links
  // reads all eight BEFORE staging, so the host unticks against real names and
  // sizes. The two paths had simply drifted. The list is now cut to the number
  // we can actually read, and the same enrichment runs.
  //
  // Not a crawl, and the distinction is the host's hand: they pressed "Pull
  // the places in". The never-build rule in the backend is about walking
  // results nobody asked for.
  // TWENTY, READ. The cap moved from 8 to 20 once the reads were pooled: a
  // measured read is 1.7-2.1s, and two at a time with jitter lands twenty in
  // about the time eight used to take sequentially. Nothing is dropped here,
  // so there is nothing to apologise for either.
  const rows = page.locator('.lc-staged');
  expect(await rows.count(), 'the whole search is staged').toBe(20);
  expect(reads(), 'and every staged row was read').toBe(20);

  // Every row can now be told apart — which is the whole point.
  const names = await page.locator('.lc-staged-name').allInnerTexts();
  expect(names).toHaveLength(20);
  for (const n of names) expect(n).toMatch(/read on commit/i);
  expect(new Set(names).size, `rows must be distinguishable: ${names.slice(0, 4).join(' | ')}`)
    .toBeGreaterThan(1);

  // Nothing was left behind, so the surface must NOT claim anything was. The
  // truncation notice is for a search bigger than the cap, and apologising
  // when there is nothing to apologise for is its own small dishonesty.
  await expect(page.getByText(/copy the results page itself/i)).toHaveCount(0);

  // And the over-cap notice is gone: it exists to tell a host to untick down to
  // what can be read, and there is nothing left to untick down to.
  await expect(page.getByText(/untick down to 8 or fewer/i)).toHaveCount(0);
  // Nothing says "nothing read from this link" either, because something was.
  await expect(page.getByText(/nothing read from this link/i)).toHaveCount(0);

  // Untick down to a handful, the way the surface asks the host to.
  const ticks = await rows.count();
  for (let i = 3; i < ticks; i += 1) await rows.nth(i).click();
  await expect(page.getByRole('button', { name: /Add 3 to the shortlist/i })).toBeVisible();
  await page.getByRole('button', { name: /Add 3 to the shortlist/i }).click();

  // ...and THOSE are read. This is the whole fix: the facts arrive for the
  // places the host actually kept.
  // WAIT FOR THE END STATE, not the first frame of it. commitStaged is async
  // now — it reads the kept listings sequentially — so counting the moment the
  // headline appears caught 1 of 3 still in flight. The rendered name is the
  // signal that the read actually landed.
  await expect(page.locator('.lc-card-name').first())
    .toContainText(/read on commit/i, { timeout: 30_000 });
  // NO FURTHER READS. The staged eight were already read, so committing three
  // of them re-fetches nothing — lookupTargets finds no row needing a record.
  // Before the cap fix this would have re-read the whole kept set.
  expect(reads(), 'committing already-read rows must not re-read them').toBe(20);
});

// ── THE READS REALLY OVERLAP, AND THEY REALLY DO NOT STAMPEDE ─────────────
// The cap moved from 8 to 20 on the strength of pooling. If the pool silently
// degraded to a sequential loop, every claim behind that move would be false
// and nothing else in this file would notice — the mocked reads elsewhere
// return instantly, so timing never enters into it.
//
// This one gives each read a real delay and measures two things at once:
// that the wall clock beats sequential (so there IS concurrency) and that no
// more than a handful are ever in flight (so it is not a stampede at a host
// that blocks datacenter traffic).
test('the reads overlap, but only a couple at a time', async ({ page }) => {
  // 900ms, NOT 300. The first cut used 300 and failed at 6046ms against a
  // 6000ms sequential baseline — which looked like "the pool does not work"
  // and was not. peak came back >1, so two reads really were in flight; what
  // swamped the gain was this file's own jitter (READ_GAP_MS 240, so 144-384ms
  // before each read). Against a 300ms mock that nearly doubles every read and
  // erases the benefit. Against the 1.7-2.1s a real listing takes it is ~13%,
  // which is the price of not looking like machinery and is worth paying.
  // A mock that cheap was measuring the jitter, not the concurrency.
  const DELAY = 900;
  let inFlight = 0, peak = 0, started = 0;
  await page.route('**/api/lodging/results**', (r) => r.fulfill({ json: { ok: true, links: LINKS } }));
  await page.route('**/api/lodging/unfurl**', async (r) => {
    inFlight += 1; started += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((res) => { setTimeout(res, DELAY); });
    inFlight -= 1;
    return r.fulfill({ json: { ok: true, title: 'Casa — read on commit', price: 2400,
      image: '', facts: { beds: 12, bedrooms: 6 }, sleeps: 12, rating: 4.9, ratingCount: 50,
      amenities: ['Kitchen'] } });
  });

  await page.goto(DEMO); await settled(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill(SEARCH);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  const pull = page.getByRole('button', { name: /Pull the places in/i });
  await expect(pull).toBeVisible({ timeout: 20_000 });

  const t0 = Date.now();
  await pull.click();
  await expect(page.getByRole('button', { name: /Add \d+ to the shortlist/i }))
    .toBeVisible({ timeout: 60_000 });
  const elapsed = Date.now() - t0;

  expect(started, 'all twenty were read').toBe(20);
  expect(peak, `peak concurrent reads was ${peak}`).toBeGreaterThan(1);
  // Sequential is 20 x 900ms = 18s before jitter, and jitter adds ~260ms a
  // read on top of that whichever way they run. Two at a time should land
  // near half. The bar is loose on purpose — CI machines are slower and the
  // claim under test is "these overlap", not a stopwatch figure.
  expect(elapsed, `twenty reads took ${elapsed}ms; sequential is ~${20 * DELAY}ms`)
    .toBeLessThan(20 * DELAY * 0.75);
  // AND NOT A STAMPEDE. This is the half that protects the reader: the backend
  // fetches from one datacenter IP that Airbnb already blocks a share of.
  expect(peak, `peak concurrent reads was ${peak}`).toBeLessThanOrEqual(3);
});

// ── ANY TWO OF TWENTY, NOT TWO OF THREE ───────────────────────────────────
// Found by driving prod with a real search: 21 places on the shortlist and the
// phone comparison offered exactly 3 chips, because it read cmp.columns and
// lodgingCompare slices to three columns. The host could not weigh the 4th
// against the 9th. Invisible while a shortlist was three places; one search
// now adds twenty.
test('every place on the shortlist can be compared, not just the top three',
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/lodging/results**', (r) => r.fulfill({ json: { ok: true, links: LINKS } }));
    await page.route('**/api/lodging/unfurl**', (r) => {
      const id = (new URL(r.request().url()).searchParams.get('url') || '').match(/rooms\/(\d+)/);
      const n = id ? Number(id[1].slice(-2)) : 0;
      return r.fulfill({ json: { ok: true, title: `Casa ${n} — read on commit`, price: 2000 + n,
        image: '', facts: { beds: 6 + (n % 7), bedrooms: 3 }, sleeps: 8 + (n % 9),
        rating: 4.8, ratingCount: 40, amenities: ['Kitchen', n % 2 ? 'Hot tub' : 'Pool'] } });
    });
    await page.goto(DEMO); await settled(page);
    await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
    await page.locator('textarea').fill(SEARCH);
    await page.getByRole('button', { name: /Read what I pasted/i }).click();
    const pull = page.getByRole('button', { name: /Pull the places in/i });
    await expect(pull).toBeVisible({ timeout: 20_000 });
    await pull.click();
    const add = page.getByRole('button', { name: /Add 20 to the shortlist/i });
    await expect(add).toBeVisible({ timeout: 90_000 });
    await add.click();

    // SCOPED TO THE PHONE'S OWN CHOOSER. The wide table grew a chooser that
    // reuses these chips, and its markup is in the DOM at phone width even
    // though .lc-t-wide hides it — so a bare .lc-p2-chip now matches 40, not
    // 20, and the count assertion was measuring both surfaces at once.
    const chips = page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip');
    await expect(chips).toHaveCount(20, { timeout: 30_000 });
    await expect(page.locator('.lc-p2-pick:not(.lc-t-pick) .lc-p2-chip.is-on')).toHaveCount(2);

    // The lane really scrolls rather than crushing twenty chips into one row.
    const lane = page.locator('.lc-p2-pick:not(.lc-t-pick)');
    const geo = await lane.evaluate((n) => ({
      overflows: n.scrollWidth > n.clientWidth + 2,
      snap: getComputedStyle(n).scrollSnapType,
      chipW: Math.round(n.firstElementChild.getBoundingClientRect().width),
    }));
    expect(geo.overflows, 'the chip row must scroll, not squash').toBe(true);
    expect(geo.snap).toMatch(/x mandatory/);
    expect(geo.chipW, `chips must stay legible: ${geo.chipW}px`).toBeGreaterThan(100);

    // THE ACTUAL CLAIM: a place outside the top three can be compared. Pick the
    // tenth and confirm it becomes one of the two columns.
    const tenth = (await chips.nth(9).innerText()).split('\n')[0].trim();
    await chips.nth(9).click();
    await expect(chips.nth(9)).toHaveAttribute('aria-pressed', 'true');
    const cols = await page.locator('.lc-p2-name').allInnerTexts();
    expect(cols).toHaveLength(2);
    expect(cols.some((c) => c.trim() === tenth), `${tenth} must be a column; got ${cols.join(' | ')}`).toBe(true);

    // And still two, never three, at 390px.
    await expect(page.locator('.lc-p2-col')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth
      > document.documentElement.clientWidth)).toBe(false);
  });

// ── THE SEARCH CARDS CARRY MONEY (2026-10-02) ─────────────────────────────
// Host: "ive been operating under false pretenses. how are we going to get
// prices into the app" — after I had told them this path structurally could
// not carry money. A LISTING page genuinely has none; the RESULTS page does,
// and the backend now reads it off each card. Verified against prod from
// Render's datacenter IP: 18 of 18 priced.
//
// These gate the CLIENT half: that a priced `places` payload reaches the
// staged rows as money, that a stay total is never mistaken for a nightly
// rate, and that an unpriced payload still behaves exactly as it used to.
const PRICED = Array.from({ length: 18 }, (_, i) => ({
  url: `https://www.airbnb.com/rooms/90000000${i}`,
  name: `Casa ${i}`,
  totalPrice: 2000 + i * 100,
  nights: 4,
}));

test('a search pull arrives with prices on it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/lodging/results**', (r) => r.fulfill({
    json: { ok: true, links: PRICED.map((p) => p.url), places: PRICED, priced: PRICED.length, linksOnly: false },
  }));
  await page.route('**/api/lodging/unfurl**', (r) => r.fulfill({
    json: { ok: true, title: '', price: null, image: '', facts: { beds: 8, bedrooms: 4 },
      sleeps: 10, rating: 4.9, ratingCount: 30, amenities: ['Kitchen'] },
  }));
  await page.goto(DEMO); await settled(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill(SEARCH);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  await page.getByRole('button', { name: /Pull the places in/i }).click();
  await expect(page.getByRole('button', { name: /Add 18 to the shortlist/i }))
    .toBeVisible({ timeout: 60_000 });

  // EVERY row has money on it before the host unticks anything — which is
  // the whole complaint this answers.
  const prices = await page.locator('.lc-staged-price').allInnerTexts();
  expect(prices).toHaveLength(18);
  for (const p of prices) expect(p).toMatch(/\$\d/);

  // Per head LEADS, the stay total follows on the meta line. 10 guests, so
  // $2,000 -> $200 each. If the total were ever read as a NIGHTLY rate this
  // number would be four times too big — that is the crab-money class and
  // this is the arithmetic that catches it.
  expect(prices.some((p) => /\$200 each/.test(p)),
    `per-head must divide the stay total: ${prices.slice(0, 3).join(' | ')}`).toBe(true);
  const metas = await page.locator('.lc-staged-meta').allInnerTexts();
  expect(metas, 'the stay total stays reachable').toContain('$2,000 total');
});

test('an unpriced search still behaves exactly as it did', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // An older backend, or a page served without card objects. `places` absent,
  // `links` present — the path this had before prices existed.
  await page.route('**/api/lodging/results**', (r) => r.fulfill({
    json: { ok: true, links: LINKS, linksOnly: true },
  }));
  await page.route('**/api/lodging/unfurl**', (r) => r.fulfill({
    json: { ok: true, title: 'Casa — read on commit', price: null, image: '',
      facts: { beds: 9, bedrooms: 5 }, sleeps: 11, rating: 4.9, ratingCount: 20,
      amenities: ['Kitchen'] },
  }));
  await page.goto(DEMO); await settled(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill(SEARCH);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  await page.getByRole('button', { name: /Pull the places in/i }).click();
  await expect(page.getByRole('button', { name: /Add 20 to the shortlist/i }))
    .toBeVisible({ timeout: 60_000 });
  // No money claimed, and nothing invented in its place.
  await expect(page.locator('.lc-staged-price')).toHaveCount(0);
  expect(await page.locator('.lc-staged').count()).toBe(20);
});
