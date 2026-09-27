// ─── THE DRIVE THE LAST ATTEMPT FAILED ────────────────────────────────────
//
// The 2026-08-16 offline-shell board upheld the ban on a service worker, and
// its ruling seat gave this reason among four:
//
//   "My implementation failed its own first drive. Three of five tests red —
//    the offline reload never mounted. A service worker that half-works is
//    worse than none: it controls every request and takes the app down with
//    it."
//
// and then, for any revisit: "a build-time precache manifest, a tested update
// path, and a kill switch". This file is the tested part. If it is red, the
// worker does not ship — that is the same standard the previous one was held
// to and failed.
//
// WHY THE BAN WAS LIFTED. The board's strongest argument was that this
// pipeline had a known stale-ship fault, so a cache would make a transient
// failure permanent. Verified 2026-09-27: that fault is gone, and was already
// gone when the board sat. Nothing prebuilt is tracked, the laptop gh-pages
// flow and pages.yml were deleted 2026-08-03, and pages-from-source.yml
// builds in CI and FAILS unless the artifact carries GITHUB_SHA. The fix
// landed 2026-07-30; the board was 2026-08-16.
//
// What did not change is Norman's asymmetry — "no worker: the app fails in
// the aisle… broken worker: the app fails everywhere, for everyone, until
// each person clears site data". That is answered by construction and the
// third test here is the proof: navigation is NETWORK-FIRST, so a cache can
// only ever answer when the network did not.
import { test, expect } from './fixtures.mjs';

// ── WAIT FOR CONTROL, NOT JUST FOR AN ACTIVE WORKER ───────────────────────
// Measured 2026-09-27: after the FIRST load `navigator.serviceWorker.controller`
// is null even though the worker is active — the page that registered it is
// not controlled. It becomes controlled on the next load. So a worker protects
// nothing until the second visit, which is the same "two page loads" fact
// Forsgren's seat asked to be stated honestly, and it belongs in the drive
// rather than only in a comment.
//
// The first version of this helper waited on `registration.active` and then
// went offline immediately. The navigation went straight to the network,
// failed with ERR_INTERNET_DISCONNECTED, and looked exactly like a broken
// worker. It was a test that did not wait for the thing it was testing.
const controlled = async (page) => {
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    if (!r || !r.active) return false;
    const k = (await caches.keys()).find((x) => x.startsWith('ngw-shell-'));
    if (!k) return false;
    return (await (await caches.open(k)).keys()).length > 3;
  }, null, { timeout: 20000 });
  await page.reload();                       // the load that takes control
  await page.waitForFunction(() => !!navigator.serviceWorker.controller,
    null, { timeout: 20000 });
};

const seed = async (page) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-sw') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-sw', name: 'Offline test', type: 'Birthday', date: '2027-06-17',
      venueCity: 'Annapolis', state: 'MD', guestMode: 'count', guestCount: 12,
      totalBudget: 2000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-sw');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
};

test('(premise) the worker installs and precaches the shell', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);
  const state = await page.evaluate(async () => {
    const keys = await caches.keys();
    const shell = keys.find((k) => k.startsWith('ngw-shell-'));
    const c = shell ? await caches.open(shell) : null;
    const urls = c ? (await c.keys()).map((r) => new URL(r.url).pathname) : [];
    return {
      shell,
      count: urls.length,
      // A NAVIGATION requests the directory, so that is the entry the
      // fallback needs. index.html is cached too, for a deep link to the
      // file itself, but it is not the one that matters here.
      hasShell: urls.some((u) => /\/hostv2\/$/.test(u) || u === '/'),
    };
  });
  expect(state.shell, 'a versioned shell cache exists').toBeTruthy();
  expect(state.count).toBeGreaterThan(3);
  expect(state.hasShell, 'the navigation fallback (the DIRECTORY url) is cached').toBe(true);
});

test('THE ONE THAT FAILED LAST TIME: an offline reload still mounts', async ({ page, context }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);

  await context.setOffline(true);
  await page.reload();

  // The APP, not the preboot and not a browser error page. "Getting your
  // plan…" is 18 characters and renders from the inline HTML before any
  // script runs — an earlier version of this test sampled the body too soon,
  // read exactly that, and reported a working offline shell as broken.
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(
    () => !/Getting your plan/.test(document.body.innerText || '')
      && (document.body.innerText || '').length > 200,
    null, { timeout: 20000 },
  );
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(txt).not.toMatch(/ERR_INTERNET_DISCONNECTED|no internet|can.t be reached/i);
  // …and it is HER plan, rendered from her own stored data, not a husk.
  expect(txt).toMatch(/Offline test|Birthday/i);
  await context.setOffline(false);
});

test('THE SAFETY CASE: a poisoned cache cannot beat a live network', async ({ page, context }) => {
  // Norman's asymmetry, tested rather than asserted. The shell entry is
  // replaced with obvious garbage; with the network up the host must still
  // get the real app, because navigation tries the network first.
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);

  const poisonedCount = await page.evaluate(async () => {
    const keys = await caches.keys();
    const shell = keys.find((k) => k.startsWith('ngw-shell-'));
    const c = await caches.open(shell);
    // THE SHELL IS THE DIRECTORY URL, not index.html — the navigation
    // fallback matches the entry a navigation requests. This test poisoned
    // index.html and therefore poisoned nothing the fallback reads: making
    // the worker cache-first STILL passed it. Bach's seat named this exact
    // failure ("a test that cannot fail is not a test") before it happened.
    let poisoned = 0;
    for (const req of await c.keys()) {
      const p = new URL(req.url).pathname;
      if (/\/hostv2\/$/.test(p) || p === '/' || p.endsWith('index.html')) {
        await c.put(req, new Response('<html><body>POISONED</body></html>',
          { headers: { 'content-type': 'text/html' } }));
        poisoned += 1;
      }
    }
    return poisoned;
  });

  // PREMISE: the poison actually landed somewhere the fallback would read.
  expect(poisonedCount).toBeGreaterThan(0);

  await page.reload();
  await page.waitForFunction(
    () => !/Getting your plan/.test(document.body.innerText || ''),
    null, { timeout: 20000 },
  );
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(txt).not.toMatch(/POISONED/);
  await expect(page.locator('.app, .sheet, #root > *').first()).toBeVisible({ timeout: 15000 });
});

test('THE KILL SWITCH: ?nosw=1 removes it and it stays removed', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);

  await page.goto('?nosw=1');
  await page.waitForFunction(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length === 0;
  }, null, { timeout: 15000 });

  const after = await page.evaluate(async () => ({
    regs: (await navigator.serviceWorker.getRegistrations()).length,
    caches: (await caches.keys()).length,
    killed: localStorage.getItem('ngw-sw-killed'),
  }));
  expect(after).toEqual({ regs: 0, caches: 0, killed: '1' });

  // …and a later ordinary visit does not quietly put it back.
  await page.goto('?elegant=1');
  await page.waitForTimeout(2500);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test('NEGATIVE CONTROL: it never caches a plan or a price', async ({ page }) => {
  // The shell, never the data. A cached API answer is a stale number wearing
  // a fresh number's clothes.
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);
  const bad = await page.evaluate(async () => {
    const keys = await caches.keys();
    const out = [];
    for (const k of keys) {
      const c = await caches.open(k);
      for (const r of await c.keys()) {
        const p = new URL(r.url).pathname;
        if (/\/(api|unfurl|results)\//.test(p) || /\.json$/.test(p)) out.push(p);
      }
    }
    return out;
  });
  expect(bad).toEqual([]);
});
