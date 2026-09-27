// ─── REGISTERING IT, AND BEING ABLE TO TAKE IT BACK ────────────────────────
//
// READ THIS FIRST: docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md — two boards
// banned a service worker here and a third lifted the ban on 2026-09-27 with
// named conditions. The whole decision, including what is still owed, lives
// there. This file is one of its three conditions.
//
// TO TURN IT OFF ON A DEVICE:  <site>/hostv2/?nosw=1
// TO TURN IT OFF FOR EVERYONE: publish `sw-kill.txt` containing "kill" at the
//                              site root. Every installed worker removes
//                              itself on its next activation, with no action
//                              from any host.
//
// RECOVERY TAKES TWO PAGE LOADS, not one, and that is by design. There is no
// skipWaiting, so a new worker installs on one load and activates on the
// next — a host who opens the app once a week is a week behind. The kill
// file is therefore the PATCH path, not an emergency-only lever.
//
// The second and third of the 2026-08-16 board's conditions live here: a
// tested update path, and a kill switch that works from OUTSIDE the worker.
//
// A kill switch inside the worker is not enough on its own. If the worker
// itself is broken the code that would disable it may never run. So there
// are two, and they are independent:
//
//   1. IN THE PAGE, before anything is registered. `?nosw=1` unregisters
//      every worker and clears every cache, on a URL a host can be given
//      over the phone. It runs from the network-loaded page, so it works
//      even if the worker is serving a broken shell — because navigation is
//      network-first, a host with signal always gets the live page.
//   2. IN THE WORKER, on activate, against sw-kill.txt at the site root.
//      That one needs no host action at all: publish one file and every
//      installed worker removes itself on its next activation.
//
// AND IT DOES NOT REGISTER AT ALL unless the page was served over https or
// from localhost, because a worker cannot install anywhere else and the
// attempt only produces console noise in dev.
import { markSignal } from './lastSignal';

const KILLED_KEY = 'ngw-sw-killed';

/** Tear down every worker and cache this origin has. Safe to call twice. */
export async function disableOfflineShell() {
  try { localStorage.setItem(KILLED_KEY, '1'); } catch (_) { /* no storage */ }
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (_) { /* nothing registered */ }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (_) { /* no cache api */ }
}

/** Has a host (or we) disabled it on this device? */
export function offlineShellKilled() {
  try { return localStorage.getItem(KILLED_KEY) === '1'; } catch (_) { return false; }
}

/**
 * Tell the page when a new worker is INSTALLED BUT NOT YET IN CHARGE.
 *
 * This exists because recovery takes two page loads and a host cannot be
 * expected to know that. Without it the only honest host-facing statement
 * would be a permanent "updates arrive eventually", which is not a statement
 * at all. With it the app can say "close this and open it again" exactly when
 * that sentence is true and never when it is not.
 *
 * It fires only when a controller ALREADY EXISTS. On a first install the new
 * worker is not replacing anything a host is looking at, so there is nothing
 * to tell them.
 */
function watchForWaitingWorker(reg, onUpdateWaiting) {
  if (typeof onUpdateWaiting !== 'function') return;
  const announce = () => {
    // No controller = first install = nothing is being replaced.
    if (!navigator.serviceWorker.controller) return;
    onUpdateWaiting();
  };
  if (reg.waiting) announce();
  reg.addEventListener('updatefound', () => {
    const next = reg.installing;
    if (!next) return;
    next.addEventListener('statechange', () => {
      if (next.state === 'installed') announce();
    });
  });
}

/**
 * @param {string} swUrl  where the built worker lives
 * @param {Location} loc
 * @param {() => void} [onUpdateWaiting]  called when a newer shell is installed
 *                                        and waiting for the next page load
 * @returns {Promise<'registered'|'killed'|'unsupported'|'skipped'>}
 */
export async function registerOfflineShell(swUrl, loc = window.location, onUpdateWaiting) {
  // This load reached the page over the network, which is the only thing
  // "last signal" ever means. Recorded BEFORE any early return so a host who
  // has killed the worker still gets an honest timestamp.
  markSignal();

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';

  // THE PAGE-SIDE KILL SWITCH, and it runs before registration on purpose.
  if (/[?&]nosw=1\b/.test(loc.search || '')) {
    await disableOfflineShell();
    return 'killed';
  }
  if (offlineShellKilled()) {
    await disableOfflineShell();     // idempotent; also cleans a later install
    return 'killed';
  }

  const secure = loc.protocol === 'https:' || loc.hostname === 'localhost' || loc.hostname === '127.0.0.1';
  if (!secure) return 'skipped';

  try {
    const reg = await navigator.serviceWorker.register(swUrl);
    watchForWaitingWorker(reg, onUpdateWaiting);
    return 'registered';
  } catch (_) {
    // A failed registration is not an error a host should ever see. They get
    // the app they already had.
    return 'skipped';
  }
}
