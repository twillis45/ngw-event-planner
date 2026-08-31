// ─── THE SHIPPING APP REPORTS ITS OWN ACTIVATION FUNNEL ─────────────────────
//
// Stage 7's public gate is "instrumentation wired". It was wired in the sense
// that the transport worked and both keys shipped in the bundle — and wired in
// no other sense: 55 events were defined, hostv2 fired 7, and every activation
// event fired ONLY from the frozen CRA. The app that actually ships reported
// nothing about whether a host arrived, created, shared, or got a reply.
//
// This repo already named that shape, in untrackedIsNotPassing: a check that
// never RAN was being scored as a check that PASSED.
//
// HOW THIS ASSERTS WITHOUT WRITING ANYWHERE. lib/analytics disables PostHog on
// localhost (IS_LOCAL) and pushes every event to `window.__NGW_TRACK__`
// instead. So this drives the real UI down the real code path and reads what
// the app actually emitted — no stub standing in for the thing under test, and
// not one event reaching the production funnel.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page, query = '?elegant=1') => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
  });
  await page.goto(query);
  await settled(page);
};

const fired = (page) => page.evaluate(() => window.__NGW_TRACK__ || []);
const only = (log, name) => log.filter((e) => e.event === name);

test.describe('activation funnel — hostv2 emits it, not just the frozen CRA', () => {
  test('the tap itself is real, not a test-only fiction', async ({ page }) => {
    // If this ever goes quiet the rest of the file passes vacuously, which is
    // the failure mode a stubbed transport invites.
    await boot(page);
    const log = await fired(page);
    expect(Array.isArray(log)).toBe(true);
    expect(log.length).toBeGreaterThan(0);
  });

  test('a host arriving reports host_home_viewed exactly once', async ({ page }) => {
    await boot(page);
    const hits = only(await fired(page), 'host_home_viewed');
    expect(hits).toHaveLength(1);                       // not zero, and not twice
    expect(hits[0].page).toBe('host_shell_v2');
  });

  test('and it is not double-counted by a generic page_view', async ({ page }) => {
    // Two events for one arrival inflates the number every downstream rate
    // divides by, so the pairing is asserted as absent on purpose.
    await boot(page);
    expect(only(await fired(page), 'page_view')).toHaveLength(0);
  });

  test('sharing an invite reports the reach, and whether it can convert', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await boot(page);
    // 'Guests' is the rail's own label, read off the running app rather than
    // guessed — the previous guess made this spec fail on navigation and say
    // nothing about instrumentation.
    await openSectionByName(page, 'Guests');
    await settled(page);

    const share = page.getByRole('button', { name: /Share the RSVP link/i }).first();
    // Asserted, not skipped, for the reason above: a missing control must fail
    // this spec rather than excuse it.
    await expect(share).toBeVisible();
    await share.click();

    // Same async race the RSVP spec hit: shareInviteLink AWAITS navigator.share
    // or the clipboard write before it tracks, so `settled` can return with the
    // event still pending. Reading the log once made this flaky across
    // viewports — a different project failed on each run, which reads like a
    // layout bug and is really a timing one.
    await expect.poll(async () => only(await fired(page), 'invite_shared').length,
      { timeout: 8000 }).toBeGreaterThan(0);

    const hits = only(await fired(page), 'invite_shared');
    expect(hits.length).toBeGreaterThan(0);
    // rsvp_live is the difference between a link a guest can reply to and one
    // that reaches a dead end. A share that cannot convert must not read as one
    // that could.
    expect(hits[0]).toHaveProperty('method');
    expect(typeof hits[0].rsvp_live === 'boolean' || hits[0].method === 'native_share').toBe(true);
  });

  test('a guest opening a real invite reports invite_viewed, once', async ({ page }) => {
    await boot(page, '?rsvp=test-two-days');
    await settled(page);
    // NO SELF-SKIP ON ZERO. The first cut skipped when nothing fired, which
    // meant disabling the instrumentation turned this test GREEN by vanishing
    // — 7 tests became 6 and the summary line still said passed. A gate that
    // can quietly excuse itself is not a gate; this repo's own harness carries
    // the same warning about 24 silent skips reading as 24 passes.
    // Guard on the surface resolving instead, which is the real precondition.
    await expect(page.locator('.inv2-ask, [class*=inv2]').first()).toBeVisible();
    const hits = only(await fired(page), 'invite_viewed');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toHaveProperty('event_type');
  });

  test('a guest replying reports the conversion, and whether it reached the host', async ({ page }) => {
    await boot(page, '?rsvp=test-two-days');
    await settled(page);
    const name = page.getByLabel(/Your name/i).first();
    test.skip(!(await name.count()), 'invite did not resolve in this environment');
    // ORDER MATTERS, and not for a cosmetic reason: a value typed into the name
    // field before the invite finishes resolving is wiped by the re-render that
    // follows, so filling first and picking second submits an empty name and
    // the form refuses with "Add your name to send."
    //
    // The attendance chips are RADIOS in a radiogroup, not buttons, and picking
    // one only sets the answer — "Send my reply" appears afterwards and is what
    // actually submits. Asserting against the wrong role made this spec time out
    // on an empty locator while looking like a broken control.
    await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
    await settled(page);
    await name.fill('E2E Guest');
    await expect(name).toHaveValue('E2E Guest');
    await page.getByRole('button', { name: /Send my reply/i }).first().click();

    // Submitting is async — it writes an outbox entry and may attempt the RSVP
    // API before the event is emitted, so `settled` can return while the reply
    // is still in flight. Poll for the event rather than reading the log once
    // and concluding the instrumentation is dead.
    await expect.poll(async () => only(await fired(page), 'invite_rsvp_submitted').length,
      { timeout: 8000 }).toBe(1);

    const hits = only(await fired(page), 'invite_rsvp_submitted');
    expect(hits).toHaveLength(1);
    expect(hits[0].rsvp).toBeTruthy();
    // `delivered` separates a reply the host can act on from one parked in this
    // browser's outbox. Collapsing them would overstate the conversion — on the
    // demo profile the RSVP API is off, so this is the common case, not an edge.
    expect(typeof hits[0].delivered).toBe('boolean');
    // The guest typed a real name into this form one line ago. It must not be
    // anywhere in what we emitted.
    expect(JSON.stringify(hits[0])).not.toMatch(/E2E Guest/);
  });

  // NOT GATED HERE, AND SAYING SO RATHER THAN LEAVING IT IMPLIED: event_created
  // is wired at the creation site in HostShellV2 but has no spec, because
  // hostv2 has no create door reachable from a seeded boot — creation starts in
  // the intake flow, and driving that end to end is its own piece of work. A
  // silent omission would read as coverage; this comment is the cap, declared.

  test('no funnel event ever carries PII', async ({ page }) => {
    // The module strips email/name/phone at capture, but a property named
    // something else carrying a person is the leak that survives that guard.
    await boot(page);
    for (const e of await fired(page)) {
      for (const k of Object.keys(e)) {
        expect(k).not.toMatch(/^(email|name|phone|guest|address)$/i);
      }
    }
  });
});
