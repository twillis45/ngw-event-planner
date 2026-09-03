# Evaluating Vite 8 for hostv2 — a trial, not a landing

Date: 2026-09-03. **Nothing in this evaluation was committed.** The working
tree was restored afterward; this file is the record so the decision can be
made on evidence instead of re-run from scratch.

## Why it came up at all

Not tidiness. Three separate things converge on the same change:

1. **A HIGH advisory on `vite@4.5.14`** — "Vite middleware may serve files
   starting with the same name with the public directory" and "`server.fs`
   settings were not applied to HTML files" (range `<=6.4.2`), plus a moderate
   on `esbuild <=0.24.2` (the dev server answers any site's requests).
   **`npm audit --omit=dev` in hostv2 is 0 vulnerabilities** — these are
   dev-server issues and reach no user. `fixAvailable: vite@8.2.2`.
2. **Two Vite majors in one tree, which I introduced today.** Adding vitest
   put `vite@8.2.2` under `node_modules/vitest/` beside the app's
   `vite@4.5.14`, because vitest 4 declares `vite: ^6 || ^7 || ^8`. So the
   runner and the bundler transform the same files differently.
3. **The deprecation warnings** in the CI log come from #2, not from the app's
   build — Vite 4 has no `configLoader` and no `oxc` and cannot emit them.

## What was measured

| | Vite 4.5.14 | Vite 8.2.2 |
|---|---|---|
| `npm run build` | ✓ 4.65s | ✓ **482ms** |
| HostShellV2 chunk | 938.72 kB / 292.99 gz | 957.78 kB / **288.72 gz** |
| eventPool chunk | 2,345.63 kB / 693.60 gz | 2,394.45 kB / 706.44 gz |
| vitest seam | 14/14 | **14/14** |
| nested second Vite | yes | **none — one Vite** |
| parity check (in build) | ✓ | ✓ |
| e2e, full desktop project | ✓ (CI, matrix) | **✓ 208 passed / 4 skipped / 0 failed, 6.2m** |

Raw size up ~2%, gzip roughly neutral (shell smaller, pool slightly larger).
Build ~9.6× faster; Vite 8 uses rolldown.

## What it would still need — NOT done in this trial

- **`esbuild:` config is silently ignored.** Vite 8 says so out loud: *"Both
  esbuild and oxc options were set. oxc options will be used and esbuild
  options will be ignored"* — naming `{ loader: 'jsx', include: /\.(js|jsx)$/ }`.
  That block exists so `../src` modules with JSX in `.js` files compile. The
  build passes anyway (plugin-react's oxc covers it), but the config now
  carries a dead block that *looks* load-bearing. It must become `oxc` or be
  removed deliberately.
- **`optimizeDeps.esbuildOptions.loader`** — same question, unexamined.
- **`__dirname` × 6**, one of which is the `@app` alias. Works today; breaks
  when `configLoader: 'native'` becomes the default, and will surface as
  "cannot find @app/*" while naming nothing about `__dirname`.
- **The deploy path is partly tested — the risky half PASSES.**
  `pages-from-source.yml` runs `npm run release` (build hostv2 → sync into
  `public/hostv2` → CRA build) and then greps the BUILT hostv2 assets for the
  baked API base in its "Verify CRA and hostv2 configuration parity" step. The
  concern was that different minification drops or mangles that literal.

  **Checked against the Vite 8 output with the same `grep -rqF` the workflow
  uses:** the baked value survives, in three chunks (`inviteShared`, `index`,
  `lodgingIntel`). That step would pass.

  Still untested: `npm run release` end to end — the sync into `public/hostv2`
  and the CRA build wrapping it. A file copy plus an unchanged toolchain, so
  the residual risk is low, but it is not zero and it was not run.

## Recommendation

The trial is **clean on every gate that was run** — build, the vitest seam, the
full desktop e2e project (208 passed), and the deploy's parity grep.

**Land it, but as its own scoped change with the remaining items above closed
first** — not as a tail on an unrelated session. It is a four-major bundler
swap on the shipping app, and the deploy parity grep is exactly the kind of
thing that goes green in CI and red on release.

Nothing forces the timing: the advisory is dev-only, so there is no user
exposure and no countdown.
