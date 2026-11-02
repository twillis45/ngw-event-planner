// ─── GOLD-10: FAILURE INJECTION ─────────────────────────────────────────────
//
// The GOLD acceptance matrix has carried "no spec for invalid route, producer
// failure, or write failure" at MEDIUM since the gate. Re-measured 2026-11-02:
// the only failure-path specs in 133 files are `theNoSignalBannerTellsTheTruth`,
// `aRateIsNotFree` and `sheKnowsItIsOld`. None of them covers a failed WRITE,
// which is the one that loses the host's work rather than merely misreporting
// it.
//
// WHY THE WRITE IS THE ONE WORTH TESTING FIRST. HostShellV2's own comment at
// the patch effect says it: most bare catches in that file are correct —
// localStorage throws in private mode, speech recognition throws on
// unsupported platforms — but this one "is THE persistence call for the host's
// work, and a patch can carry photos, so quota-exceeded is a realistic failure
// rather than a theoretical one. Swallowed, the host keeps editing an event
// that is no longer being saved and finds out when they reopen it."
//
// A product whose whole thesis is not lying to the host fails hardest by
// silently dropping their work. That contract had no browser guard.
//
// THE CONTRACT, from the source:
//   · a failed patch write TELLS the host, in words that name the remedy
//   · it tells them ONCE per session — "a toast on every keystroke of a full
//     disk would bury the surface it is warning about"
//   · a successful write says nothing at all
//
// HOW THE FAILURE IS INJECTED. `Storage.prototype.setItem` is overridden to
// throw QuotaExceededError for keys starting with `ngw-hostv2-patch-` and ONLY
// those, so every other write still works and the shell boots normally. That
// is a real browser failure mode, not a synthetic one: it is what a full disk
// does, and the patch is where photos land.
//
// THE INSTRUMENT IS A POLLER, DELIBERATELY. The toast auto-dismisses, so
// sampling once at the end finds nothing — measured, that is exactly what
// happened on the first attempt here. A MutationObserver watching addedNodes
// also misses it, because the toast arrives inside a larger re-rendered
// subtree rather than as a direct added node. An 80ms poll over the whole run
// is the thing that actually sees it.
//
// RUN: cd hostv2 && npm run e2e:build && npm run test:e2e
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(5233);

// A SAMPLE event, on purpose. The patch effect returns early for custom ids
// (`if (isCustomEventId(eventId)) return;`) — custom events persist whole
// through saveCustomEvents instead. Pointing this at a `cust-` id would make
// every assertion below vacuous.
const SAMPLE_ID = 'ev-x-birthday';

const STORAGE_TOAST = /didn’t save on this device|didn't save on this device/i;

/**
 * Boot the shell, optionally with patch writes failing, and record every toast
 * that appears at any point during the run.
 */
const boot = async (page, { breakPatchWrites = false } = {}) => {
  await page.addInitScript(([brk, id]) => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');

    window.__toastsSeen = [];
    window.__patchWriteAttempts = 0;

    // COUNTED IN BOTH ARMS, thrown in only one. The first cut only counted
    // when it was also throwing, which made the control assert "nothing
    // happened" instead of "writes happened and the shell stayed quiet" — a
    // control that cannot tell a silent success from a shell that never wrote
    // at all is not a control.
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k).startsWith('ngw-hostv2-patch-')) {
        window.__patchWriteAttempts += 1;
        if (brk) {
          const e = new Error('QuotaExceededError');
          e.name = 'QuotaExceededError';
          throw e;                     // a full disk, which is what this is
        }
      }
      return real.call(this, k, v);    // everything else still persists
    };

    // See the header: the toast auto-dismisses and arrives inside a re-rendered
    // subtree, so neither a late sample nor an addedNodes observer sees it.
    setInterval(() => {
      const n = document.querySelector('div.toast');
      if (!n) return;
      const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
      if (t && !window.__toastsSeen.includes(t)) window.__toastsSeen.push(t);
    }, 80);
  }, [breakPatchWrites, SAMPLE_ID]);

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(9000);   // past boot, the patch effect, and dismissal
};

const readRun = (page) => page.evaluate(() => ({
  toasts: window.__toastsSeen,
  attempts: window.__patchWriteAttempts,
}));

test.describe('GOLD-10 — a failure the host cannot see is the worst kind', () => {
  // ── 1 · THE HOST IS TOLD ─────────────────────────────────────────────────
  test('a failed save tells the host, and names the remedy', async ({ page }) => {
    await boot(page, { breakPatchWrites: true });
    const { toasts, attempts } = await readRun(page);

    expect(attempts, 'the patch write never ran — this fixture is not exercising the path')
      .toBeGreaterThan(0);

    const told = toasts.filter((t) => STORAGE_TOAST.test(t));
    expect(told.length, `no save-failure notice. Toasts seen: ${JSON.stringify(toasts)}`).toBe(1);
    // Not just "an error happened" — the sentence has to name the cause and
    // what the host can do, which is the difference between a warning and a
    // dead end.
    expect(told[0]).toMatch(/storage is full/i);
    expect(told[0]).toMatch(/free some space/i);
  });

  // ── 2 · TOLD ONCE, NOT ONCE PER KEYSTROKE ────────────────────────────────
  // `saveFailedRef` is the dedupe, and it is the regression-prone half: the
  // obvious "fix" to a silent failure is a toast in the catch, which on a full
  // disk fires on every patch change and buries the surface it is warning
  // about. Measured on a real boot: 2 failed write attempts, 1 notice.
  test('it says so ONCE, however many writes fail', async ({ page }) => {
    await boot(page, { breakPatchWrites: true });
    const { toasts, attempts } = await readRun(page);

    expect(attempts, 'need repeated failures for this to mean anything').toBeGreaterThanOrEqual(2);
    const told = toasts.filter((t) => STORAGE_TOAST.test(t));
    expect(told.length, 'the dedupe is gone — a full disk would bury the UI in notices').toBe(1);
  });

  // ── 3 · THE CONTROL ──────────────────────────────────────────────────────
  // Without this the two tests above would pass against a shell that shouted
  // about storage unconditionally, which is its own failure.
  test('a save that works says nothing at all', async ({ page }) => {
    await boot(page, { breakPatchWrites: false });
    const { toasts, attempts } = await readRun(page);
    // The write really did happen — otherwise the silence below would prove
    // nothing. This is the half the first draft of this spec was missing.
    expect(attempts, 'no patch write at all — silence here would be meaningless')
      .toBeGreaterThan(0);
    expect(toasts.filter((t) => STORAGE_TOAST.test(t)),
      'a working save must never claim storage trouble').toHaveLength(0);
  });

  // ── 4 · INVALID ROUTE ────────────────────────────────────────────────────
  // The other half of GOLD-10's open row. A pointer to an event that does not
  // exist is reachable in the wild — a stale `ngw-hostv2-last-event` from a
  // deleted event, or a link to an id this device never had. It must not
  // white-screen: the host lands on something they can use.
  test('a pointer to an event that does not exist still lands somewhere usable', async ({ page }) => {
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
    await page.addInitScript(() => {
      localStorage.setItem('ngw-hostv2-last-event', 'ev-x-does-not-exist-at-all');
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    const text = await page.evaluate(() => (document.body.innerText || '').trim());
    expect(errs, `the shell threw on an unknown event id: ${JSON.stringify(errs)}`).toHaveLength(0);
    expect(text.length, 'blank screen on an unknown event id').toBeGreaterThan(80);
    // Something to act on, not just pixels.
    const buttons = await page.evaluate(() =>
      [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).length);
    expect(buttons, 'nothing actionable on screen').toBeGreaterThan(0);
  });
});
