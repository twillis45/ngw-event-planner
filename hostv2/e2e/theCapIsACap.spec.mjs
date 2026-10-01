// THE CAP HAS TO BOUND THE READS, NOT JUST THE COUNT (2026-10-01).
//
// commitStaged counted one set and read another:
//
//   const unread = keep.filter((c) => c.sleeps == null && !c.amenities.length);
//   if (unread.length && unread.length <= UNFURL_MAX) enrichByLookup(keep);
//
// `unread` was checked against the cap; `keep` was handed to the reader. The
// moment any kept row already carried its facts the two sets diverged, and the
// cap stopped bounding anything.
//
// The reachable door is not the exotic one. Paste eight listing links — the
// paste handler reads all eight, because eight is within the cap — and let ONE
// come back empty. At commit `unread` is 1, the gate waves it through, and all
// eight are read AGAIN: seven re-fetches of records already in hand, ~3s each.
//
// Nothing was corrupted, because the merge is gaps-only. What broke was the
// promise the surface makes out loud: "I read up to 8 of them."
//
// WHY THIS IS AN E2E AND NOT A GREP. The decision is unit-tested in
// src/lib/__tests__/theCapIsACap.test.js. That file cannot prove the COMPONENT
// asks — a source-grep asserting `enrichByLookup(targets)` is a text gate on a
// behavior claim, which textGateRatchet.test.js refuses on the grounds that
// jest cannot execute hostv2. Counting the requests that really fire is the
// only form of this claim that can fail for the right reason.
import { test, expect, settled } from './fixtures.mjs';

const DEMO = './?demo=lodging';
// Eight is the cap exactly: the paste handler reads all of them up front.
const IDS = ['11', '22', '33', '44', '55', '66', '77', '88'];
const DEAD = '55'; // the one whose lookup comes back empty
const LINKS = IDS.map((i) => `https://www.airbnb.com/rooms/900000${i}`).join('\n');

const wire = async (page) => {
  const seen = [];
  await page.route('**/api/lodging/unfurl**', (r) => {
    const url = new URL(r.request().url()).searchParams.get('url') || '';
    const id = (url.match(/rooms\/900000(\d+)/) || [])[1] || '?';
    seen.push(id);
    // A link we learned nothing from — the ordinary case, not a contrived one.
    if (id === DEAD) return r.fulfill({ json: { ok: false, reason: 'nothing readable there' } });
    return r.fulfill({ json: { ok: true, title: `Casa ${id}`, price: 2400, image: '',
      facts: { beds: 12, bedrooms: 6 }, sleeps: 12, rating: 4.9, ratingCount: 50,
      amenities: ['Kitchen', 'Washer', 'Private hot tub'] } });
  });
  return () => seen;
};

test('a kept row that already has its facts is not read again', async ({ page }) => {
  const seen = await wire(page);
  await page.goto(DEMO); await settled(page);
  await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
  await page.locator('textarea').fill(LINKS);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();

  const add = page.getByRole('button', { name: /Add 8 to the shortlist/i });
  await expect(add).toBeVisible({ timeout: 60_000 });

  // PREMISE: the paste read all eight. If this is not 8 the test is measuring
  // something else and its real assertion below proves nothing.
  expect(seen().length, 'the paste handler reads a within-cap paste up front').toBe(8);

  // Seven arrived with a name, sleeps and amenities. One did not, and it is the
  // only row with anything left to look up.
  await expect(page.getByText(/untick down to 8 or fewer/i)).toHaveCount(0);

  await add.click();
  await expect(page.locator('.lc-card-name').first()).toBeVisible({ timeout: 60_000 });

  // ── THE ASSERTION ──────────────────────────────────────────────────────
  // One row needed reading, so exactly one more read may fire. The old code
  // fired eight here, for sixteen total.
  const after = seen().slice(8);
  expect(after.length, `only the row needing a record may be re-read; got ${after.join(',')}`).toBeLessThanOrEqual(1);
  // And if anything was read, it was the dead one — never a row already in hand.
  for (const id of after) expect(id).toBe(DEAD);
});
