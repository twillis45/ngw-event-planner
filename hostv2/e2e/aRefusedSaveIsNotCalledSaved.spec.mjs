// ─── A REFUSED SAVE IS NOT CALLED SAVED ─────────────────────────────────────
//
// LIVE_MODE_CENSUS §5 (2026-08-08): every cloud write was last-write-wins on
// the whole event blob, and "it silently discards the losing side's concurrent
// edits and nothing surfaces that." Closed in the lib on 2026-11-02 (`34d2931`):
// a save carries the version this device knows, the UPDATE is conditional on
// it, and a row that moved on answers `reason:'conflict'` — not written, not
// queued, the edit kept locally. Eleven jest tests pin the lib.
//
// What they structurally cannot see is the SHELL: whether the guard is really
// on the wire when a host taps, whether the refusal reaches `noteSaveResult`,
// whether the host is TOLD, and whether the settings sheet says where the edit
// is. The handoff recorded exactly that gap: "never driven in a browser." This
// is that browser.
//
// THE HARNESS is crossDeviceSync's: the synctest bundle on 5244, a fake
// Supabase project nothing can reach, a fabricated session in localStorage,
// every REST call answered by Playwright. "Another device wrote first" is
// represented the way it looks from here: the conditional UPDATE matches zero
// rows and the follow-up read reports a newer `updated_at`. That is exactly the
// pair of answers a real project gives a second after another phone saved.
//
// THE EDIT IS A REAL TAP. The guest-count ask is open (count unset), the host
// picks a number and locks it in — `patchEvent`, the one write path every edit
// funnels through, which is the only place the conflict cue lives.
//
// RUN: cd hostv2 && npm run e2e:build && npm run test:e2e
// Alone: npx playwright test e2e/aRefusedSaveIsNotCalledSaved.spec.mjs --project=desktop
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(5244);
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-conflict-probe';

// Z-format on purpose: Postgres's `+00:00` form URL-encodes to %2B inside the
// `updated_at=lte.` filter and the assertion below reads the raw URL.
const T1 = '2026-11-02T10:00:00.000Z';   // the version this device loaded
const T2 = '2026-11-02T11:00:00.000Z';   // the newer write from elsewhere
const T3 = '2026-11-02T12:00:00.000Z';   // the stamp a landed write gets

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

// Count UNSET so the guest ask is open and its "Lock N in" CTA exists — the
// tap-floor sweep records that a settled count hides the stepper entirely.
const localCopy = () => ({
  id: EVENT_ID, name: 'Sunset Dinner', type: 'Dinner Party',
  date: '2027-05-01', guestMode: 'count', venue: 'The Old Room',
  createdAt: '2026-08-01T10:00:00.000Z',
});

/**
 * Answer the fake project. `mode` is what the cloud does to the host's write:
 *   'conflict' — the conditional UPDATE matches nothing; the probe says T2
 *   'ok'       — the UPDATE lands and comes back stamped T3
 * Every write is recorded with its method and URL so the guard can be read
 * off the wire rather than inferred from the outcome.
 */
const install = async (page, { mode }) => {
  const writes = [];
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json(mode === 'nostudio' ? [] : [{ studio_id: STUDIO, role: 'owner' }]);
    // No membership AND no ensure_studio RPC to provision one: the account is
    // genuinely not set up, so saveEvent answers 'no-studio' (queued).
    if (mode === 'nostudio' && url.includes('/rest/v1/rpc/')) return json({ message: 'not found' }, 404);
    if (url.includes('/rest/v1/studio_settings')) return json([]);
    if (url.includes('/auth/v1/')) return json({});
    if (url.includes('/rest/v1/events')) {
      if (req.method() === 'GET') {
        // The post-refusal probe: `.select('updated_at')…maybeSingle()`.
        if (/select=updated_at(&|$)/.test(url)) return json(mode === 'conflict' ? { updated_at: T2 } : null);
        // Hydrate: the same content this device holds, at version T1.
        return json([{ id: EVENT_ID, data: localCopy(), updated_at: T1 }]);
      }
      writes.push({ method: req.method(), url });
      if (mode === 'offline') return route.abort('internetdisconnected');
      if (req.method() === 'PATCH') return json(mode === 'conflict' ? [] : [{ id: EVENT_ID, updated_at: T3 }]);
      return json([{ updated_at: T3 }]);   // a blind upsert, which must not happen here
    }
    return json([]);
  });

  await page.addInitScript(([sess, local, evId]) => {
    localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    // Seed ONCE. An init script re-runs on every navigation, and re-seeding on
    // reload would put the original copy back and hide exactly what test 3
    // measures: what the shell itself does to a refused edit across a reload.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([local]));
    }
    localStorage.setItem('ngw-hostv2-last-event', evId);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    // The toast auto-dismisses and lands inside a re-rendered subtree; an end
    // sample and an addedNodes observer both miss it (GOLD-10 measured both).
    window.__toastsSeen = [];
    setInterval(() => {
      const n = document.querySelector('div.toast');
      if (!n) return;
      const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
      if (t && !window.__toastsSeen.includes(t)) window.__toastsSeen.push(t);
    }, 80);
  }, [fakeSession(), localCopy(), EVENT_ID]);
  return writes;
};

const boot = async (page) => {
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(2000);   // let hydrate finish and record the T1 stamp
};

/**
 * One real edit through `patchEvent`: open the Guest list sheet and switch
 * counting from "By headcount" to "By list". A single-field patch with no
 * draft state in front of it, which is what makes it the cleanest tap in the
 * shell for this purpose. (The first cut reached for the plan card's "Lock N
 * in" CTA and timed out: tapping the Guests tile opens a sheet ON TOP of that
 * card, and the chips it matched were behind the dialog.)
 */
const EDIT = { guestMode: 'list' };
const makeAnEdit = async (page) => {
  const reached = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a,.frow,.tab,.tile')]
      .find((x) => /guest/i.test((x.innerText || '').trim()));
    if (!el) return false;
    el.click();
    return true;
  });
  expect(reached, 'a guest surface is reachable from the plan').toBe(true);
  const sheet = page.locator('.sheet[role="dialog"]').last();
  await sheet.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(600);
  const byList = sheet.getByRole('button', { name: /^By list$/ }).first();
  await byList.waitFor({ state: 'visible', timeout: 10_000 });
  await byList.click();
  await page.waitForTimeout(2500);   // the write, the refusal probe, the toast
  // Leave the sheet so the settings opener below is not blocked by it.
  const close = sheet.getByRole('button', { name: /^Close$/ }).first();
  if (await close.count()) { await close.click(); await page.waitForTimeout(500); }
};

const openSettings = async (page) => {
  const header = page.locator('[aria-label="You and settings"]').first();
  if (await header.count() && await header.isVisible()) await header.click();
  else {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('.navrow', { hasText: 'You & settings' }).first().click();
  }
  await page.waitForTimeout(800);
};

const readState = (page) => page.evaluate(() => {
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
  const ev = (read('ngw-hostv2-custom-events') || [])[0] || {};
  return { toasts: window.__toastsSeen, guestMode: ev.guestMode, stamp: ev._cloudUpdatedAt, pending: read('ngw-cache-pending') || [] };
});

const CONFLICT_TOAST = /changed somewhere else/i;
const CONFLICT_ROW   = /Changed somewhere else — your edit is on this device only/;

test.describe('a refused save is not called saved — the shell half', () => {
  // ── 1 · THE GUARD IS ON THE WIRE, AND THE HOST IS TOLD ───────────────────
  test('another device wrote first: the write is conditional, refused, kept here, and said so', async ({ page }) => {
    const writes = await install(page, { mode: 'conflict' });
    await boot(page);
    await makeAnEdit(page);

    // PREMISE. Without the conditional filter on the wire, "refused" below
    // could only mean the stub refused — which proves nothing about the shell.
    const patches = writes.filter((w) => w.method === 'PATCH');
    expect(patches.length, `no conditional UPDATE went out — writes seen: ${JSON.stringify(writes)}`).toBeGreaterThan(0);
    expect(patches[0].url, 'the UPDATE did not carry the version it loaded').toMatch(/updated_at=lte\./);
    expect(writes.filter((w) => w.method === 'POST'), 'a blind upsert went out although the version was known').toHaveLength(0);

    const s = await readState(page);
    // Told, in host language that names where the edit is.
    const told = s.toasts.filter((t) => CONFLICT_TOAST.test(t));
    expect(told.length, `no conflict notice. Toasts seen: ${JSON.stringify(s.toasts)}`).toBeGreaterThanOrEqual(1);
    expect(told[0]).toMatch(/this device only/i);
    // Kept here: the tap landed locally, and nothing was queued to retry a
    // refusal that would refuse again.
    expect(s.guestMode, 'the host\'s own edit was lost from this device').toBe(EDIT.guestMode);
    expect(s.pending.filter((op) => op && op.id === 'ev-conflict-probe'), 'a refused write was queued for retry').toHaveLength(0);

    // The settings sheet says the same thing, and keeps saying it.
    await openSettings(page);
    const row = page.locator('.later-row').filter({ hasText: CONFLICT_ROW }).first();
    await expect(row, 'the settings sheet does not show the conflict state').toBeVisible({ timeout: 5000 });
  });

  // ── 3 · AND IT IS STILL HERE AFTER A RELOAD ──────────────────────────────
  // Nielsen re-run N2 (2026-11-02, P1/P0): hydrate stamped every unqueued event
  // SYNCED — a refused save is never queued — which also erased the conflict
  // record; the adopt loop then saw "synced", found the account's copy
  // different, and replaced the host's edit with it. The only message was
  // "Updated with a newer version from your account." Test 1 never reloaded,
  // so it could not see it. Red-proofed by removing the conflict exemption at
  // the hydrate stamp.
  test('a refused edit survives a reload: not overwritten, still flagged', async ({ page }) => {
    await install(page, { mode: 'conflict' });
    await boot(page);
    await makeAnEdit(page);
    expect((await readState(page)).guestMode, 'premise: the edit landed locally').toBe(EDIT.guestMode);

    await page.reload();
    await boot(page);
    const s = await readState(page);
    expect(s.guestMode, 'the refused edit was overwritten by the account copy on reload').toBe(EDIT.guestMode);
    expect(s.toasts.filter((t) => /newer version from your account/i.test(t)),
      'the host was told the account copy replaced theirs').toHaveLength(0);
    await openSettings(page);
    await expect(page.locator('.later-row').filter({ hasText: CONFLICT_ROW }).first(),
      'the conflict state was erased by the reload').toBeVisible({ timeout: 5000 });
  });

  // ── 4 · OFFLINE: THE WARNING DOES NOT TAKE THE EDIT'S UNDO AWAY ───────────
  // Nielsen re-run N4 (2026-11-02, P2): there is one toast slot. The edit's
  // "… Undo" toast was replaced a moment later by the "waiting for the
  // connection" notice, which had no action — so the first offline edit lost
  // its Undo. Red-proofed by dropping the carried action from the notice.
  test('offline: the save notice keeps the edit\'s Undo', async ({ page }) => {
    await install(page, { mode: 'offline' });
    await boot(page);
    await makeAnEdit(page);
    const s = await readState(page);
    const notice = s.toasts.filter((t) => /connection is back/i.test(t));
    expect(notice.length, `premise: no offline notice. Toasts seen: ${JSON.stringify(s.toasts)}`).toBeGreaterThanOrEqual(1);
    expect(notice[notice.length - 1], `the offline notice dropped the edit's Undo. Toasts seen: ${JSON.stringify(s.toasts)}`).toMatch(/Undo/);
  });

  // ── 5 · WAITING ON THE ACCOUNT IS NOT WAITING ON THE CONNECTION ─────────
  // Nielsen re-run N9 (2026-11-02, P3): a save queued because the account has
  // no studio yet ('no-studio') was blamed on the connection, telling a host
  // with a working network to wait for one. Red-proofed against the old copy.
  test('no account yet: the notice names the account, not the connection', async ({ page }) => {
    await install(page, { mode: 'nostudio' });
    await boot(page);
    await makeAnEdit(page);
    const s = await readState(page);
    const saved = s.toasts.filter((t) => /Saved on this device/i.test(t));
    expect(saved.length, `premise: no save notice. Toasts seen: ${JSON.stringify(s.toasts)}`).toBeGreaterThanOrEqual(1);
    expect(saved.filter((t) => /connection/i.test(t)), 'a no-account wait was blamed on the connection').toHaveLength(0);
    expect(saved[saved.length - 1]).toMatch(/account/i);
  });

  // ── 2 · THE CONTROL: A SAVE THAT LANDS SAYS NOTHING, AND ADOPTS ITS STAMP ─
  // Without this, test 1 would pass against a shell that cried "conflict" on
  // every save — and the adoption half is what keeps this device from being
  // refused against its own previous write on the next tap.
  test('the same tap, when the row has not moved: lands, silent, and the new version is kept', async ({ page }) => {
    const writes = await install(page, { mode: 'ok' });
    await boot(page);
    await makeAnEdit(page);

    expect(writes.filter((w) => w.method === 'PATCH').length).toBeGreaterThan(0);
    const s = await readState(page);
    expect(s.toasts.filter((t) => CONFLICT_TOAST.test(t)), 'a landed save was announced as a conflict').toHaveLength(0);
    expect(s.guestMode).toBe(EDIT.guestMode);
    expect(s.stamp, 'the landed write\'s new version was not adopted into the local copy').toBe(T3);

    await openSettings(page);
    await expect(page.locator('.later-row').filter({ hasText: CONFLICT_ROW })).toHaveCount(0);
    await expect(page.locator('.later-row').filter({ hasText: /^Synced/ }).first()).toBeVisible({ timeout: 5000 });
  });
});
