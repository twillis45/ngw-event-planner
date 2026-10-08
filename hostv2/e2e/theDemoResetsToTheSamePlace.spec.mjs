// ─── THE DEMO NOBODY HAD EVER DRIVEN TWICE ──────────────────────────────────
//
// D-2 precondition: a seedable, resettable demo account. The tooling shipped
// 2026-08-19 (`9cbd48ea`) and `docs/DEMO_ACCOUNT_RUNBOOK.md` has promised ever
// since that "everything below except step 1 is one-tap inside the app."
//
// Nothing has checked that since the day it was written. `demoSeed.test.js`
// gates the pure builder — the staged before-states, the fresh-id contract —
// and gates it well. It cannot see the bar, the click, the switch, or the
// screen the host lands on, and those are the parts a buyer watches. Seven
// weeks of engine work landed on top of this path with no guard over it: the
// budget estimator's repast gating, the BLS food factor, the regional ruling,
// the lodging intake rewrite.
//
// What makes it worth a spec rather than another manual pass is the FAILURE
// MODE. This path runs in front of a buyer, once, with no second take, and its
// two most load-bearing promises are both invisible when they break:
//
//   · the demo lands on the "Set your budget" beat — the demo script's opening
//     move. If the beat moved, the demo opens on the wrong sentence and the
//     operator finds out mid-sentence.
//   · every seed mints FRESH ids, so the vendor-brief link is a new server
//     code with zero confirmation rows. If ids ever stopped being fresh,
//     back-to-back demos would collide on a stale shared link — and the
//     second demo would show the first demo's confirmations. A stale id looks
//     exactly like a fresh one until somebody opens the brief.
//
// SIGNED OUT, ON PURPOSE, and this is the finding worth carrying: the runbook
// calls the Supabase account "the only manual step", which reads as a
// BLOCKER on the whole precondition. It is not one. `demoSeed` writes through
// `saveCustomEvents` to localStorage and only touches the cloud
// `if (isSupabaseConfigured() && session)`. Every test here runs with no
// account at all, which is what proves the single-device demo owes nothing to
// that step. The account buys cross-device persistence, not the demo.
import { test, expect, settled } from './fixtures.mjs';

const LS_CUSTOMS = 'ngw-hostv2-custom-events';
const LS_DELETED = 'ngw-hostv2-deleted-events';
const DEMO_PREFIX = 'demoqa-';

// Past the splash and the welcome, so the bar and the hero are what is on
// screen. Nothing here seeds an event: the seed under test has to come from
// the button, or this spec would be grading its own fixture.
const boot = async (page, query) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto(query);
  await settled(page);
};

const stored = (page, key) => page.evaluate((k) => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}, key);

const demoIds = async (page) =>
  (await stored(page, LS_CUSTOMS))
    .map((e) => String(e && e.id))
    .filter((id) => id.startsWith(DEMO_PREFIX));

const bar = (page) => page.locator('button', { hasText: /^Seed \/ reset$/ });
const heroText = (page) => page.evaluate(() => {
  const h = document.querySelector('.hero-card, .hero');
  return (h && h.innerText) || '';
});

test.describe('the demo account the runbook describes', () => {
  // ── STEP 3 OF THE RUNBOOK ────────────────────────────────────────────────
  test('?demo=1 arms the bar, and it is QA chrome rather than product UI', async ({ page }) => {
    await boot(page, '?demo=1&elegant=1');
    await expect(bar(page)).toBeVisible();
    await expect(page.locator('button', { hasText: /^Remove$/ })).toBeVisible();
    // The bar is deliberately un-styled inline chrome so it can never be
    // mistaken for the product. If it ever acquires a Studio Matte class it has
    // drifted into the design system and this is the place to argue about it.
    const cls = await bar(page).getAttribute('class');
    expect(cls).toBeFalsy();
  });

  test('the bar stays armed on the device without the query param', async ({ page }) => {
    // The runbook says "it stays armed on that device until disarmed", which is
    // what lets an operator arm once and then navigate normally for the rest of
    // the demo. Module-scope arming + localStorage is what makes that true.
    await boot(page, '?demo=1&elegant=1');
    await expect(bar(page)).toBeVisible();
    await boot(page, '?elegant=1');
    await expect(bar(page)).toBeVisible();
  });

  test('?demo=0 disarms it — the before-screen-sharing step', async ({ page }) => {
    await boot(page, '?demo=1&elegant=1');
    await expect(bar(page)).toBeVisible();
    await boot(page, '?demo=0&elegant=1');
    await expect(bar(page)).toHaveCount(0);
    // And it stays off, or "hide the bar" would last one navigation.
    await boot(page, '?elegant=1');
    await expect(bar(page)).toHaveCount(0);
  });

  // ── STEP 4: THE ONE TAP THE WHOLE PRECONDITION RESTS ON ──────────────────
  test('Seed / reset lands on the flagship event, on the "Set your budget" beat', async ({ page }) => {
    await boot(page, '?demo=1&elegant=1');
    // PREMISE: nothing demo-shaped exists yet, so the assertions below are
    // measuring the button rather than a leftover fixture.
    expect(await demoIds(page)).toEqual([]);

    await bar(page).click();

    // The event is stored, and it is exactly one — reset is delete+reseed, not
    // accumulate. A second demo row is how a demo opens on the wrong plan.
    await expect.poll(() => demoIds(page)).toHaveLength(1);

    // The flagship identity, read off the stored row rather than the builder,
    // so a seed that wrote a different shape than demoSeed.js builds fails here.
    const [ev] = (await stored(page, LS_CUSTOMS)).filter((e) => String(e.id).startsWith(DEMO_PREFIX));
    expect(ev.name).toMatch(/Army Retirement Celebration at the VFW/);
    expect(ev.type).toBe('Retirement Party');
    expect(ev.budget).toEqual([]);

    // THE BEAT. The demo script opens here, and this is the assertion the
    // engine-side test cannot make: that the screen the operator shows a buyer
    // actually asks for the budget.
    await expect.poll(() => heroText(page), { timeout: 20_000 }).toMatch(/set your budget/i);
  });

  // ── THE FRESH-ID CONTRACT, DRIVEN RATHER THAN UNIT-TESTED ────────────────
  test('a second tap mints a fresh id — the brief-code promise, end to end', async ({ page }) => {
    await boot(page, '?demo=1&elegant=1');

    await bar(page).click();
    await expect.poll(() => demoIds(page)).toHaveLength(1);
    const [first] = await demoIds(page);

    await bar(page).click();
    // Still exactly one, and NOT the same one. Both halves matter: the count
    // proves the old row was deleted, the inequality proves the new row is a
    // new identity — which is what makes the vendor-brief code fresh and the
    // previous demo's confirmations unreachable.
    await expect.poll(() => demoIds(page)).toHaveLength(1);
    const [second] = await demoIds(page);
    expect(second).not.toBe(first);

    // Vendor ids are derived from the event id, so they moved too. This is the
    // id that actually becomes the shared brief code.
    const [ev] = (await stored(page, LS_CUSTOMS)).filter((e) => String(e.id).startsWith(DEMO_PREFIX));
    expect(ev.vendors.length).toBeGreaterThan(0);
    for (const v of ev.vendors) expect(String(v.id).startsWith(second)).toBe(true);
  });

  // ── AFTER A DEMO ─────────────────────────────────────────────────────────
  test('Remove clears the demo data and tombstones it against a hydrate', async ({ page }) => {
    await boot(page, '?demo=1&elegant=1');
    await bar(page).click();
    await expect.poll(() => demoIds(page)).toHaveLength(1);
    const [id] = await demoIds(page);

    await page.locator('button', { hasText: /^Remove$/ }).click();
    await expect.poll(() => demoIds(page)).toEqual([]);

    // The tombstone is the half that is invisible when it breaks: without it a
    // queued cloud delete can lose the race and the next hydrate resurrects the
    // removed demo event on top of whatever the operator opened.
    await expect.poll(() => stored(page, LS_DELETED)).toContain(id);
  });

  test('Remove with nothing to remove says so instead of acting', async ({ page }) => {
    await boot(page, '?demo=1&elegant=1');
    expect(await demoIds(page)).toEqual([]);
    await page.locator('button', { hasText: /^Remove$/ }).click();
    await expect(page.locator('.toast')).toContainText(/no demo data/i);
  });

  // ── WHY THE DEMO IS SAFE TO RUN WITH BILLING LIVE ────────────────────────
  test('the seeded id is a sample to passGate — never a user event', async ({ page }) => {
    // 'demoqa-' is neither 'cust-' nor 'ev-copy-', so passGate treats the demo
    // as a sample: it never consumes the free first event and is never gated.
    // Asserted on the shape rather than through the gate, because what actually
    // has to hold is that the PREFIX does not drift — the gate reads the id.
    await boot(page, '?demo=1&elegant=1');
    await bar(page).click();
    await expect.poll(() => demoIds(page)).toHaveLength(1);
    const [id] = await demoIds(page);
    expect(id.startsWith('demoqa-')).toBe(true);
    expect(id.startsWith('cust-')).toBe(false);
    expect(id.startsWith('ev-copy-')).toBe(false);
  });
});
