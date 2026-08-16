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
// THE FINDING THIS FILE PINS. `hydrate()` filters the cloud pull to events NOT
// already known to this device:
//
//     const fresh = evs.filter(e => e && e.id && !known.has(e.id) && …)
//
// and `base` prefers the local copy over anything hydrated:
//
//     const base = activeCustom || ALL_SAMPLES.find(…) || hydratedEvents.find(…)
//
// So a cloud edit to an event the device already has is dropped twice over. New
// events cross between devices; EDITS DO NOT. `loadEvents` even selects
// `updated_at` and orders by it, then discards it in the row map — the raw
// material for last-write-wins is fetched and thrown away.
//
// These tests are written to describe REALITY, not the wish. The one that pins
// the defect is named for what it is and will fail the moment someone fixes it,
// which is the point: it is a tripwire, and its comment says what to do then.
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5244/ngw-event-planner/hostv2/';
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

// This file needs its OWN build (a fake Supabase project configured, and the
// dev auth-bypass forced off) and its own server, so it cannot ride the default
// matrix. Rather than fail for everyone, it skips when that server is absent —
// and says exactly how to start it, because a skip nobody can act on is just a
// test that quietly never runs.
//
//   cd demo/hostv2
//   REACT_APP_AUTH_BYPASS=false npx vite build --mode synctest --outDir dist-synctest
//   E2E_BASE=1 npx vite preview --outDir dist-synctest --port 5244
//   npx playwright test e2e/crossDeviceSync.spec.mjs --project=desktop
//
// AUTH_BYPASS must be passed INLINE: .env.local sets it true for dev and
// outranks .env.[mode] in Vite's precedence. With the bypass on, currentStudioId()
// returns the non-uuid 'dev-studio', loadEvents() bails to readLocal() before any
// cloud call, and every test here passes while measuring NOTHING. That is not
// hypothetical -- it is what happened on the first run, and the PREMISE test is
// what caught it.
let harnessUp = false;
test.beforeAll(async () => {
  try {
    const res = await fetch(BASE, { method: 'GET' });
    harnessUp = res.ok;
  } catch { harnessUp = false; }
});

test.describe('cross-device sync, against a fake cloud', () => {
  test.beforeEach(() => {
    test.skip(!harnessUp, `synctest server not on :5244 — see the header of ${'crossDeviceSync.spec.mjs'} for the two commands that start it`);
  });

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

  test('DEFECT — an EDIT made on another device never reaches this one', async ({ page }) => {
    // TRIPWIRE. This test asserts the CURRENT behavior, which is wrong, so that
    // the defect is recorded in something executable rather than in prose.
    //
    // Device A changed the venue to "The New Terrace" and the count to 44, and
    // the cloud says so. Device B holds the older copy and keeps showing it.
    //
    // WHEN SOMEONE FIXES THIS, THIS TEST WILL FAIL. That is intended. Delete it
    // and keep `the fix, once it lands` below, which states the wanted behavior.
    await install(page, { cloudEvents: [cloudCopy()] });
    await boot(page);
    await page.waitForTimeout(2500);
    const shown = await page.evaluate(() => {
      const raw = localStorage.getItem('ngw-hostv2-custom-events');
      try { const e = (JSON.parse(raw) || [])[0]; return { venue: e && e.venue, guestCount: e && e.guestCount }; }
      catch { return null; }
    });
    expect(shown).toEqual({ venue: 'The Old Room', guestCount: 20 });
  });

  test.fixme('the fix, once it lands — the newer cloud copy wins', async ({ page }) => {
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
