# Demo account runbook (D-2 precondition 2)

Everything below except step 1 is one-tap inside the app. The tooling shipped
2026-08-19 (`9cbd48ea`) — hostv2 now has the same seed/reset bar the legacy
CRA shell had, riding the shared `src/lib/demoSeed.js` builder.

**Gated since 2026-10-07.** `hostv2/e2e/theDemoResetsToTheSamePlace.spec.mjs`
drives steps 3–5 below in a real browser: arm, seed, reseed, remove, disarm.
Until then nothing had checked this path since the day it was written —
`demoSeed.test.js` gates the pure builder and cannot see the bar, the click, or
the screen the host lands on. Both load-bearing promises are red-proven: the
"Set your budget" beat fails the spec when the hero stops asking for it, and
the fresh-id contract fails it when ids stop moving.

## Step 1 is NOT a blocker — measured 2026-10-07

The line below used to read "the only manual step", which made the whole
precondition look like it was waiting on Todd. **It is not.** `demoSeed` writes
through `saveCustomEvents` to localStorage and only touches the cloud
`if (isSupabaseConfigured() && session)`. Driven signed out, with no account at
all: `?demo=1` → **Seed / reset** → lands on the VFW event on the "Set your
budget" beat; a second tap mints fresh ids; **Remove** clears and tombstones.
Every test in the spec runs that way.

So a **single-device demo owes nothing to step 1.** What the account buys is the
cross-device half — the plan following you to another phone, and the cloud
delete that backs up the tombstone. That half is NOT covered by the spec (it
needs real credentials) and remains unverified.

## One-time setup (only for a cross-device demo — Todd does this)

1. Create the demo account in Supabase: any dedicated email (e.g.
   `demo@…`) + password, via the app's own sign-up flow on production.
   Nothing else to configure — the account is just a normal host account.
   Skip this entirely if you are demoing from one device.

## Before each demo

2. Sign in as the demo account on the demo device — or don't, if this is a
   single-device demo (see above).
3. Open the app with `?demo=1` appended to the URL. A small "Demo" bar
   appears bottom-left (it stays armed on that device until disarmed).
4. Tap **Seed / reset**. This deletes any previous demo event and seeds a
   fresh copy of the flagship demo event (the VFW Army retirement
   celebration) with **fresh ids — which means fresh vendor-brief codes**,
   so back-to-back demos never collide on a stale shared link. The app
   lands directly on it, opening on the "Set your budget" beat (the demo
   event ships with budget deliberately unset).

## After a demo

- Tap **Seed / reset** again — same one tap covers cleanup and re-prep.
- Or tap **Remove** to clear demo data entirely.
- To hide the bar (e.g. before screen-sharing something else): open the
  app once with `?demo=0`.

## Design notes

- Demo event ids are `demoqa-*` — neither `cust-` nor `ev-copy-`, so
  `passGate` treats them as samples: they never consume the free first
  event and are never gated. Safe to demo with billing live.
- Removal rides the same tombstone + cloud-delete path as real event
  deletion, so a queued cloud delete can't resurrect the old demo event
  on the next hydrate.
- The bar is deliberately un-styled QA chrome (never Studio Matte), so it
  can't be mistaken for product UI.

## If the app opens an OLD plan (offline shell)

Added 2026-09-27 with the offline shell. Full decision:
`docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md`.

hostv2 installs a service worker that caches the app shell, so the app opens
with no signal. It shows a line at the top when it does:

> No signal — showing your saved plan. · Last updated 3 hours ago.

**That line is the whole contract.** If a host reports a stale or wrong screen
and that line is NOT showing, the cache is not the cause — look elsewhere.

**Turn it off on one device:** open `<site>/hostv2/?nosw=1`. This unregisters
the worker and clears its caches BEFORE any registration runs, so it works even
when the cached shell is the thing that is broken. The host stays signed in and
keeps their plan; only the offline copy goes.

**Turn it off for everyone:** publish `sw-kill.txt` containing the word `kill`
at the site root. Every installed worker removes itself on its next activation,
with no action from any host.

**A fix reaches a host on their SECOND page load, not their first.** There is no
`skipWaiting`: a new worker installs on one load and takes over on the next. A
host who opens the app once a week is a week behind. Say "close it and open it
again" when walking someone through a fix, and use the kill file rather than
waiting when a bad shell is already out.
