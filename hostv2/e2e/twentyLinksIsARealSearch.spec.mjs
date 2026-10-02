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
  const pull = page.getByRole('button', { name: /pull|read|places/i }).first();
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
