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

test('twenty links stage, and only the kept ones are read', async ({ page }) => {
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

  // NOTHING has been read yet — twenty reads up front is the sixty-second wait.
  //
  // RED-PROOFED AGAINST THE RIGHT FAULT, which took two goes. Loosening the
  // paste handler's UNFURL_MAX gate does NOT break this and is not what it
  // guards: a SEARCH link never reaches that handler. lodgingResults' own
  // branch builds candidates from r.links and stages them directly, so the
  // fault that turns this red is adding a read to THAT branch — confirmed by
  // doing it. A perturbation that leaves a test green has not proved the
  // test; it has only proved the perturbation was in the wrong place.
  expect(reads(), 'twenty links must not trigger twenty reads on paste').toBe(0);
  const rows = page.locator('.lc-staged');
  expect(await rows.count()).toBeGreaterThan(8);

  // ── WHAT THE PROD DRIVE FOUND, 2026-09-30 ────────────────────────────
  // Two things this test did not cover until a real search was driven on the
  // live site with eighteen links staged.
  //
  // The rows said "no amenities listed" — the wrong sentence, and a worse
  // one: nothing had been read, so there was no amenity list to be absent
  // from. `unread` is stamped by rankCandidates, which this branch never
  // calls, so it is stamped at the source now.
  await expect(page.locator('.lc-staged-more').first())
    .toHaveText(/nothing read from this link/i);

  // And keeping more than UNFURL_MAX reads NONE of them — correct (eighteen
  // sequential reads is a minute of spinner) but silent, which reproduces the
  // empty result this whole fix exists to prevent, by a different door. The
  // host is told the number while unticking is still the obvious move.
  await expect(page.getByText(/untick down to 8 or fewer/i)).toBeVisible();

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
  expect(reads(), 'the kept rows must be read on commit').toBe(3);
});
