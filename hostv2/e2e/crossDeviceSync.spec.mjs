// ─── CROSS-DEVICE SYNC, VERIFIED WITHOUT EVER SIGNING IN ────────────────────
//
// The review board ranked cross-device sync its #1 production-readiness item and
// I first reported it as blocked, because confirming it by hand means signing
// into a real account on two real devices and I will not type a password.
//
// That was too broad a refusal. What needs a credential is the MANUAL
// confirmation. The MECHANISM is verifiable with no account at all: build
// against a fake Supabase project, fabricate a session token in localStorage
// (supabase-js is configured `persistSession` + `storage: localStorage`, so
// getSession() reads it without a network round-trip), and intercept every REST
// call. Nothing real is contacted. `synctest.supabase.co` does not resolve, and
// every request to it is answered by the mock below.
//
// WHAT "DEVICE B" MEANS HERE. A device is a browser profile holding its own
// localStorage. Device A's edit is represented by what the CLOUD returns; this
// browser is device B, holding an older local copy of the same event. That is
// exactly the state two phones are in a second after one of them saves.
//
// WHAT IT FOUND, and now guards (both fixed in 8fc29d4d).
//
// 1. EDITS NEVER CROSSED. `hydrate()` filtered every already-known id out of the
//    cloud pull, so sync carried NEW events between devices and dropped EDITS.
//    Change the venue on the phone, open the laptop, see the old venue under a
//    badge reading "synced".
//
// 2. WORSE, AND LIVE: an offline edit was silently discarded. `markEventSynced`
//    ran on every pulled event and also DROPS that event's queued upsert. That is
//    right when the returned row is ours and wrong when another device wrote it.
//    Measured: `ngw-cache-pending` emptied, ZERO upload attempts, event stamped
//    SYNCED. The host's edit could never leave the phone, under a badge saying it
//    was in their account.
//
// The merge rule these now pin is the QUEUE, not a clock — dirty wins locally,
// clean-and-stamped yields to the cloud. See the board ruling in
// docs/audits/2026-08-16_CROSS_DEVICE_SYNC_BOARD.md for why a timestamp merge was
// rejected outright.
import { test, expect } from '@playwright/test';

// 127.0.0.1, not localhost: under Node >=17 'localhost' resolves IPv6-first,
// so the preview binds ::1 and an IPv4 probe refuses forever. The main webServer
// in playwright.config.mjs carries the same note; I rediscovered it the slow way.
const BASE = 'http://127.0.0.1:5244/ngw-event-planner/hostv2/';
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-sync-probe';

// A fabricated token for a project that does not exist. Far-future expiry so
// supabase-js never tries to refresh it over the network.
const fakeSession = () => ({
  access_token: 'fake.access.token',
  refresh_token: 'fake-refresh',
  token_type: 'bearer',
  expires_in: 999999,
  expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

/** The event as DEVICE B has it locally: the older copy. */
const localCopy = () => ({
  id: EVENT_ID, name: 'Sunset Dinner', type: 'Dinner Party',
  date: '2027-05-01', guestMode: 'count', guestCount: 20,
  venue: 'The Old Room', createdAt: '2026-08-01T10:00:00.000Z',
});

/** The same event as DEVICE A saved it: newer, with two fields changed. */
const cloudCopy = () => ({
  ...localCopy(), name: 'Sunset Dinner', venue: 'The New Terrace', guestCount: 44,
});

const install = async (page, { cloudEvents }) => {
  // Every call to the fake project is answered here; nothing leaves the machine.
  await page.route(`${PROJECT}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/rest/v1/studio_members')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([{ studio_id: STUDIO, role: 'owner' }]) });
    }
    if (url.includes('/rest/v1/events')) {
      if (route.request().method() !== 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(cloudEvents.map((e) => ({ id: e.id, data: e, updated_at: '2026-08-16T12:00:00.000Z' }))) });
    }
    if (url.includes('/rest/v1/studio_settings')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.includes('/auth/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.addInitScript(([sess, local, evId]) => {
    localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([local]));
    localStorage.setItem('ngw-hostv2-last-event', evId);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [fakeSession(), localCopy(), EVENT_ID]);
};

const boot = async (page) => {
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

// ITS SERVER IS WIRED INTO playwright.config.mjs (webServer[1]), which builds
// dist-synctest and serves it on 5244 before any test runs. So this file needs
// no special invocation — a plain `npx playwright test` covers it.
//
// IT NO LONGER SELF-SKIPS, and that is the point of wiring the server. It used
// to skip when 5244 was absent, which felt safe and was not: the matrix reported
// 24 skips that read exactly like 24 passes in the summary line, and a gate that
// can vanish unnoticed is not a gate. Now an absent server is a LOUD failure with
// the reason attached, because the only thing worse than a red gate is one that
// quietly stopped measuring.
//
// To run it alone:  npx playwright test e2e/crossDeviceSync.spec.mjs --project=desktop
// Runs under `desktop` only (VIEWPORT_INDEPENDENT in the config) — it asserts
// data and sync behavior, never layout, so six geometries would buy six
// identical results.
test.describe('cross-device sync, against a fake cloud', () => {
  test('PREMISE — the harness really is signed in and really did reach the cloud', async ({ page }) => {
    // Without this the whole file could pass while Supabase sat unconfigured and
    // hydrate() returned at its first line. Every claim below depends on the
    // events endpoint actually having been called.
    const hits = [];
    await install(page, { cloudEvents: [cloudCopy()] });
    page.on('request', (r) => { if (r.url().includes('/rest/v1/')) hits.push(r.url()); });
    await boot(page);
    await page.waitForTimeout(2500);
    expect(hits.some((u) => u.includes('studio_members')), 'studio lookup never happened').toBe(true);
    expect(hits.some((u) => u.includes('/rest/v1/events')), 'cloud events were never fetched').toBe(true);
  });

  test('a NEW event from another device does arrive', async ({ page }) => {
    // The half that works, and the control for the failing half below: without
    // this, "the edit did not arrive" could just mean hydration is dead
    // entirely, which is a different bug with a different fix.
    await install(page, { cloudEvents: [cloudCopy(), {
      id: 'ev-from-device-a', name: 'Harvest Lunch', type: 'Dinner Party',
      date: '2027-09-12', guestMode: 'count', guestCount: 12, venue: 'Elsewhere',
    }] });
    await boot(page);
    await page.waitForTimeout(2500);
    const seen = await page.evaluate(() => {
      const raw = localStorage.getItem('ngw-events');
      try { return (JSON.parse(raw) || []).map((e) => e && e.name); } catch { return []; }
    });
    expect(seen, 'a brand-new cloud event should reach this device').toContain('Harvest Lunch');
  });

  test('AN OFFLINE EDIT SURVIVES A DIFFERING CLOUD COPY', async ({ page }) => {
    // THE TEST THE WHOLE FIX STANDS ON. The board made this the bar for done and
    // Mindy Weiss set its direction: "I would rather see a stale screen than lose
    // the change I typed." A merge that adopts the cloud copy over an edit this
    // device has not yet pushed turns a stale-read bug into a data-loss bug,
    // which is strictly worse than what we started with.
    //
    // State: this device edited the venue offline, so the write is sitting in
    // the pending queue ('ngw-cache-pending'). The cloud meanwhile holds a
    // DIFFERENT copy. The queued edit must win, and must still be uploaded.
    // ASSERTS THE UPLOAD, NOT JUST THE SCREEN. The first version of this test
    // only checked the local value and passed against genuinely broken code:
    // `markEventSynced` was clearing the queued write for every pulled event, so
    // the edit stayed visible on THIS device, was never uploaded, and got stamped
    // SYNCED. The host would have been told their change was in their account
    // while it could never leave the phone. Measured before the fix:
    // `ngw-cache-pending` emptied, ZERO upload attempts. Checking the rendered
    // value alone cannot see that, which is why the queue and the wire are
    // asserted here too.
    const uploads = [];
    await install(page, { cloudEvents: [cloudCopy()] });
    page.on('request', (req) => {
      if (req.url().includes('/rest/v1/events') && req.method() !== 'GET') uploads.push(req.method());
    });
    await page.addInitScript((ev) => {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
      localStorage.setItem('ngw-cache-pending', JSON.stringify([{ type: 'upsert', id: ev.id, data: ev }]));
    }, { ...localCopy(), venue: 'The Edit I Typed Offline' });
    await boot(page);
    await page.waitForTimeout(3000);

    const after = await page.evaluate(() => {
      const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
      const customs = read('ngw-hostv2-custom-events') || [];
      return { venue: customs[0] && customs[0].venue };
    });
    expect(after.venue, 'the offline edit was overwritten by the cloud copy').toBe('The Edit I Typed Offline');
    expect(uploads.length, 'the queued offline edit was never uploaded — it can never leave this device').toBeGreaterThan(0);
  });

  test('the newer cloud copy wins for a clean event', async ({ page }) => {
    // The behavior a host expects and does not get. Marked fixme so it does not
    // fail the matrix while the defect stands; unmark it in the change that
    // fixes hydrate(), and delete the tripwire above in the same commit.
    //
    // "Newer" has to mean the row's `updated_at`, which loadEvents already
    // selects and orders by and then discards in its row map. Whatever the fix
    // is, it cannot be "cloud always wins" -- that would throw away an offline
    // edit this device has not pushed yet, turning a stale-read bug into a
    // data-loss bug.
    await install(page, { cloudEvents: [cloudCopy()] });
    await boot(page);
    await page.waitForTimeout(2500);
    const shown = await page.evaluate(() => {
      const raw = localStorage.getItem('ngw-hostv2-custom-events');
      try { const e = (JSON.parse(raw) || [])[0]; return { venue: e && e.venue, guestCount: e && e.guestCount }; }
      catch { return null; }
    });
    expect(shown).toEqual({ venue: 'The New Terrace', guestCount: 44 });
  });
});
