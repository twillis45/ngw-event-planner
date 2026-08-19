# Demo account runbook (D-2 precondition 2)

Everything below except step 1 is one-tap inside the app. The tooling shipped
2026-08-19 (`9cbd48ea`) — hostv2 now has the same seed/reset bar the legacy
CRA shell had, riding the shared `src/lib/demoSeed.js` builder.

## One-time setup (the only manual step — Todd does this)

1. Create the demo account in Supabase: any dedicated email (e.g.
   `demo@…`) + password, via the app's own sign-up flow on production.
   Nothing else to configure — the account is just a normal host account.

## Before each demo

2. Sign in as the demo account on the demo device.
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
