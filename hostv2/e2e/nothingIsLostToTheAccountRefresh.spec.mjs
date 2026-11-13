// ─── NOTHING IS LOST TO THE ACCOUNT REFRESH (G15–G18, 11/12/2026) ────────────
//
// The shell refreshes from the account at load, at sign-in and at every token
// refresh (about hourly). When the account copy of an event differs from the
// one here, and this device has nothing queued for it, the refresh replaces the
// local copy with the account's ("Updated with a newer version from your
// account"). That is right for an edit made on another device. It was also what
// happened to every change that never went through the account save:
//
//   G15  an edit made signed out (or after the session expired),
//   G16  "Put this back" (restore a saved copy),
//   G17  import with "Replace matching events",
//   G18  account events this device cached in an earlier session, whose edits
//        went to a separate local layer that was never cleared — masking newer
//        edits from other devices, and uploading a stale copy on the next edit.
//
// Each test first reproduces the loss, then states the outcome the fix owes.
// The safety half of G15 is here too: a queued edit is sent through the
// conditional write, so it is REFUSED (not written) when the account copy has
// moved on, or when a different person signs in on this device.
//
// THE HARNESS is lodgingReachesTheAccount's: the synctest bundle (a fake
// Supabase project), a fabricated session in localStorage, every REST call
// answered here. The account is STATEFUL and multi-studio: a write lands only
// where the real database would let it — the right studio, and a conditional
// UPDATE only when the row is still at the version the device wrote against.
//
// RUN: cd hostv2 && npm run e2e:build
//      npx playwright test e2e/nothingIsLostToTheAccountRefresh.spec.mjs --retries=0
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';
const ID = 'ev-refresh-probe';

const USER_A = { id: '99999999-8888-7777-6666-555555555555', email: 'host-a@example.invalid', studio: '11111111-2222-3333-4444-555555555555' };
const USER_B = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', email: 'host-b@example.invalid', studio: '22222222-3333-4444-5555-666666666666' };

const T1 = '2026-11-12T10:00:00.000Z';   // the version this device last saw
const T2 = '2026-11-12T11:00:00.000Z';   // a newer write from another device

const sessionFor = (u) => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated' },
});

// It has been opened before, so it already carries the start time the shell
// derives on first open — otherwise that derived write, made at load before the
// pull answers, would be the first thing this device sends.
const gameNight = (guestEstimate, extra = {}) => ({
  id: ID, name: 'My Game Night', type: 'Game Night', date: '2027-03-06',
  createdAt: '2026-11-07T10:00:00.000Z', guestMode: 'count', guestEstimate, guestCountSource: 'host',
  startTime: '15:00', startTimeSource: 'derived', startTimeBasis: 'rule-of-thumb',
  startTimeWhy: 'Most game nights are afternoon gatherings, so we set a 3:00 PM start to plan around — this is a starting point, not your plan. Change it to whatever is true.',
  budget: [], vendors: [], guests: [], ...extra,
});

/**
 * The fake project. `cloud` maps id → { data, updated_at, studio }.
 * `local` is what this device holds before the first load:
 *   custom  — the shell's own store (an event it already adopted)
 *   cache   — `ngw-events`, the account cache read at module load (REAL_EVENTS)
 *   overlay — `ngw-hostv2-patch-<id>`, the old per-event edit layer
 *   stamped — the device has confirmed this event in the account before
 */
const install = async (page, { cloud: rows = {}, local = {}, user = USER_A } = {}) => {
  const cloud = new Map(Object.entries(rows));
  const writes = [];
  let n = 0;
  const param = (url, key) => {
    const m = decodeURIComponent(url).match(new RegExp(`[?&]${key}=([^&]+)`));
    return m ? m[1] : null;
  };
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) {
      const uid = (param(url, 'user_id') || '').replace(/^eq\./, '');
      const u = [USER_A, USER_B].find((x) => x.id === uid);
      return json(u ? [{ studio_id: u.studio, role: 'owner' }] : []);
    }
    if (url.includes('/rest/v1/studio_settings')) return json([]);
    if (url.includes('/auth/v1/')) return json({});
    if (url.includes('/rest/v1/events')) {
      const studio = (param(url, 'studio_id') || '').replace(/^eq\./, '');
      const idEq = (param(url, 'id') || '').replace(/^eq\./, '');
      if (req.method() === 'GET') {
        if (/select=updated_at(&|$)/.test(url)) {
          const r = cloud.get(idEq);
          return json(r && r.studio === studio ? { updated_at: r.updated_at } : null);
        }
        return json([...cloud].filter(([, r]) => r.studio === studio).map(([id, r]) => ({ id, data: r.data, updated_at: r.updated_at })));
      }
      let body = null;
      try { body = req.postDataJSON(); } catch { body = null; }
      const row = Array.isArray(body) ? body[0] : body;
      const id = idEq || (row && row.id);
      const lte = (param(url, 'updated_at') || '').replace(/^lte\./, '') || null;
      const cur = cloud.get(id);
      writes.push({ method: req.method(), id, studio, lte, data: row && row.data });
      const stamp = `2026-11-12T12:00:${String(++n).padStart(2, '0')}.000Z`;
      if (req.method() === 'PATCH') {
        // A conditional UPDATE: only this studio's row, only at that version.
        if (!cur || cur.studio !== studio || (lte && Date.parse(cur.updated_at) > Date.parse(lte))) return json([]);
        cloud.set(id, { data: row && row.data, updated_at: stamp, studio });
        return json([{ id, updated_at: stamp }]);
      }
      // A blind upsert onto another studio's row is refused by row-level security.
      const sid = row && row.studio_id;
      if (cur && cur.studio !== sid) return json({ code: '42501', message: 'new row violates row-level security policy' }, 403);
      cloud.set(id, { data: row && row.data, updated_at: stamp, studio: sid });
      return json([{ id, updated_at: stamp }]);
    }
    return json([]);
  });

  await page.addInitScript(([sess, loc, evId, t1]) => {
    // Seed ONCE: an init script re-runs on every navigation, and re-seeding
    // would put the original copy back over what the test is measuring.
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    if (sess) localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    if (loc.custom) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([loc.custom]));
    if (loc.cache) localStorage.setItem('ngw-events', JSON.stringify([loc.cache]));
    if (loc.overlay) localStorage.setItem('ngw-hostv2-patch-' + evId, JSON.stringify(loc.overlay));
    if (loc.stamped) {
      localStorage.setItem('ngw-hostv2-sync-stamps', JSON.stringify({ [evId]: t1 }));
      localStorage.setItem('ngw-cache-stamps', JSON.stringify({ [evId]: t1 }));
    }
    localStorage.setItem('ngw-hostv2-last-event', evId);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [user ? sessionFor(user) : null, local, ID, T1]);
  await page.addInitScript(() => {
    window.__toastsSeen = [];
    setInterval(() => {
      const t = ((document.querySelector('div.toast') || {}).innerText || '').replace(/\s+/g, ' ').trim();
      if (t && !window.__toastsSeen.includes(t)) window.__toastsSeen.push(t);
    }, 80);
  });
  return { writes, cloud };
};

const settle = async (page) => {
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);   // past the account pull and the queue flush
};
const boot = async (page) => { await page.goto(BASE + '?elegant=1'); await settle(page); };
const reload = async (page) => { await page.reload(); await settle(page); };

// Sign-in and sign-out as the shell meets them at load: the session is in
// storage or it is not. hydrate() is the same function at boot, at sign-in
// and at token refresh.
const signOut = async (page) => { await page.evaluate(() => localStorage.removeItem('sb-synctest-auth-token')); await reload(page); };
const signIn = async (page, user) => {
  await page.evaluate((s) => localStorage.setItem('sb-synctest-auth-token', JSON.stringify(s)), sessionFor(user));
  await reload(page);
};

const openGuests = async (page) => {
  await page.locator('button', { hasText: 'planned around' }).first().click();
  await expect(page.locator('#sheet-title')).toBeVisible();
};
const closeSheet = (page) => page.getByRole('button', { name: /^(Close|Back)$/ }).first().click();
const shownGuests = async (page) => {
  await openGuests(page);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const m = text.match(/Your people (\d+)/);
  if (!m) throw new Error('guest count not found in: ' + text.slice(0, 300));
  await closeSheet(page);
  return Number(m[1]);
};
const oneMoreGuest = async (page) => {
  await openGuests(page);
  await page.getByRole('button', { name: 'More guests' }).first().click();
  await page.waitForTimeout(1500);   // the write, and the refusal probe if any
  await closeSheet(page);
};

const localState = (page) => page.evaluate((id) => {
  const custom = (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]') || []).find((e) => e && e.id === id) || null;
  const attempts = JSON.parse(localStorage.getItem('ngw-hostv2-sync-attempts') || '{}') || {};
  return {
    custom,
    overlay: localStorage.getItem('ngw-hostv2-patch-' + id),
    conflict: !!(attempts[id] && attempts[id].error === 'conflict'),
    toasts: window.__toastsSeen || [],
  };
}, ID);
const adoptedOver = (s) => s.toasts.filter((t) => /newer version from your account/i.test(t));

const openSettings = async (page) => {
  const rail = page.locator('.srail-row', { hasText: 'You & settings' });
  if (await rail.count()) await rail.first().click();
  else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('You & settings', { exact: false }).first().click();
  }
  await expect(page.getByRole('button', { name: 'Restore from a file', exact: true })).toBeVisible();
};

// ─── G15 ─────────────────────────────────────────────────────────────────────
test.describe('G15: an edit made signed out', () => {
  const synced = () => ({
    cloud: { [ID]: { data: gameNight(6), updated_at: T1, studio: USER_A.studio } },
    local: { custom: { ...gameNight(6), _cloudUpdatedAt: T1 } },
  });

  test('waits for sign-in and reaches the account, instead of being replaced by it', async ({ page }) => {
    const { writes, cloud } = await install(page, synced());
    await boot(page);
    await signOut(page);
    await oneMoreGuest(page);
    expect((await localState(page)).custom.guestEstimate, 'premise: the edit is on this device').toBe(7);

    await signIn(page, USER_A);
    const s = await localState(page);
    expect(s.custom.guestEstimate, 'the sign-in refresh replaced the signed-out edit with the account copy').toBe(7);
    expect(adoptedOver(s)).toHaveLength(0);
    expect(cloud.get(ID).data.guestEstimate, 'the signed-out edit never reached the account').toBe(7);
    const sent = writes.filter((w) => w.id === ID && w.data && w.data.guestEstimate === 7);
    expect(sent[0].method, 'the queued edit must go through the conditional write').toBe('PATCH');
    expect(sent[0].lte).toBe(T1);
  });

  test('is refused, not written, when the account copy moved on meanwhile', async ({ page }) => {
    const { cloud } = await install(page, synced());
    await boot(page);
    await signOut(page);
    await oneMoreGuest(page);
    // Another device sets 9 while this one is signed out.
    cloud.set(ID, { data: gameNight(9), updated_at: T2, studio: USER_A.studio });

    await signIn(page, USER_A);
    expect(cloud.get(ID).data.guestEstimate, 'the queued edit overwrote a newer copy it had never seen').toBe(9);
    const s = await localState(page);
    expect(s.custom.guestEstimate, 'the signed-out edit was lost').toBe(7);
    expect(s.conflict, 'the refusal must be on record so the host can choose').toBe(true);
  });

  test('is refused, not written, when a different person signs in on this device', async ({ page }) => {
    const { writes, cloud } = await install(page, synced());
    await boot(page);
    await signOut(page);
    await oneMoreGuest(page);

    await signIn(page, USER_B);
    expect(cloud.get(ID).data.guestEstimate, "A's account was changed by B's session").toBe(6);
    expect(cloud.get(ID).studio).toBe(USER_A.studio);
    expect(writes.filter((w) => w.id === ID && w.studio === USER_B.studio && w.method === 'PATCH').length,
      'premise: the queued edit was attempted under B').toBeGreaterThan(0);
    expect((await localState(page)).custom.guestEstimate, 'the edit left this device').toBe(7);

    // A signs back in: the edit is still here, and still not written blind.
    await signIn(page, USER_A);
    const s = await localState(page);
    expect(s.custom.guestEstimate, 'the edit was lost when its owner came back').toBe(7);
    expect(cloud.get(ID).data.guestEstimate).toBe(6);
  });
});

// ─── G16 / G17 ───────────────────────────────────────────────────────────────
test.describe('G16/G17: a copy put back on this device reaches the account', () => {
  const synced = () => ({
    cloud: { [ID]: { data: gameNight(6), updated_at: T1, studio: USER_A.studio } },
    local: { custom: { ...gameNight(6), _cloudUpdatedAt: T1 } },
  });

  test('"Put this back" is saved to the account and survives the next refresh', async ({ page }) => {
    const { cloud } = await install(page, synced());
    await boot(page);
    await oneMoreGuest(page);
    expect(cloud.get(ID).data.guestEstimate, 'premise: the edit reached the account').toBe(7);

    await openSettings(page);
    // The newest listed copy that still holds 6.
    const idx = await page.evaluate((id) => {
      const keys = (JSON.parse(localStorage.getItem('ngw-hostv2-store-backups') || '[]') || []).slice().reverse().slice(0, 5);
      return keys.findIndex((k) => {
        const ev = (JSON.parse(localStorage.getItem(k) || '[]') || []).find((e) => e && e.id === id);
        return ev && ev.guestEstimate === 6;
      });
    }, ID);
    expect(idx, 'premise: a saved copy at 6 is listed').toBeGreaterThanOrEqual(0);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Put this back', exact: true }).nth(idx).click();
    await expect(page.locator('.toast')).toContainText('That copy is back');
    await page.waitForTimeout(1500);

    expect(cloud.get(ID).data.guestEstimate, 'the restored copy never reached the account').toBe(6);
    await reload(page);
    const s = await localState(page);
    expect(s.custom.guestEstimate, 'the refresh put the account copy back over the restore').toBe(6);
    expect(adoptedOver(s)).toHaveLength(0);
  });

  test('import with "Replace matching events" is saved to the account and survives the next refresh', async ({ page }) => {
    const { cloud } = await install(page, synced());
    await boot(page);
    await openSettings(page);
    const restored = gameNight(4, { name: 'Game Night From The File' });
    await page.locator('input[type=file][accept="application/json,.json"]').setInputFiles({
      name: 'my-events.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ kind: 'ngw-event-export', version: 1, events: [restored] })),
    });
    await expect(page.locator('.toast')).toContainText('1 kept');
    await page.getByRole('button', { name: 'Replace matching events', exact: true }).click();
    await expect(page.locator('.toast')).toContainText('1 updated');
    await page.waitForTimeout(1500);

    expect(cloud.get(ID).data.name, 'the imported copy never reached the account').toBe('Game Night From The File');
    await reload(page);
    const s = await localState(page);
    expect(s.custom.name, 'the refresh put the account copy back over the import').toBe('Game Night From The File');
    expect(adoptedOver(s)).toHaveLength(0);
  });
});
