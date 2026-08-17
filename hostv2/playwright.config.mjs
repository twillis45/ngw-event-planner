// ─── LAYER-2 HARNESS — the scripted browser matrix (process ask, 2026-07-22) ──
// Runs the BUILT bundle under vite preview on its own port (never the dev
// server), one fresh browser context per test — the user's real browser and
// localStorage are never touched. Requires Node ≥ 18 on PATH (the repo default
// shell resolves v16 first):  PATH="$(brew --prefix node)/bin:$PATH" npm run test:e2e
import { defineConfig } from '@playwright/test';

// Specs whose every test calls setViewportSize (or a boot() helper that does).
// See the note above `projects` for why this is per-test, not per-file.
const SELF_PINNED = [
  '**/heroVoid.spec.mjs',
  // Drives its own four geometries below 1280; the >=1280 command layout composes
  // a different fold and this rule does not govern it.
  '**/foldAtTheFoot.spec.mjs',
  '**/statColumnChips.spec.mjs',
  '**/lodgingSpendGuard.spec.mjs',
  '**/regimeBoundary.spec.mjs',
  '**/responsiveBaseline.spec.mjs',
  '**/tabletLandscapeSplit.spec.mjs',
  '**/tapTargets.spec.mjs',
  '**/mobileTapFloor.spec.mjs',
  '**/spreadLinkTapFloor.spec.mjs',
  '**/driftCapture.spec.mjs',
  '**/_boardCapture.spec.mjs',
  '**/_riskLaneCapture.spec.mjs',
  '**/_venueReaderCapture.spec.mjs',
];

// VIEWPORT-INDEPENDENT specs — deliberately a separate list from SELF_PINNED,
// which they are not. Nothing here asserts layout; they exercise the data and
// sync layers, so running them across six geometries buys six identical results
// for six times the wall-clock. They run under `desktop` only, alongside the
// self-pinned ones, because a test has to run SOMEWHERE.
const VIEWPORT_INDEPENDENT = [
  '**/crossDeviceSync.spec.mjs',
  '**/a11yFloor.spec.mjs',
];

const NON_RESPONSIVE = [...SELF_PINNED, ...VIEWPORT_INDEPENDENT];

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // ── THE GATE WAS A COIN FLIP (2026-08-06, board, production seat) ─────────
  // Two full runs at the same SHA on the same machine produced DISJOINT failure
  // sets — five failures then three, with not one individual case repeating.
  // tabletLandscapeSplit and decisionIdentity each failed once and passed once.
  // That is flake, not a broken build, and it matters more than it sounds:
  // pages-from-source.yml auto-publishes every push to main, so a green run was
  // proving the dice landed rather than that the UI was intact. It also means
  // every "e2e green" claimed today carried an unknown amount of luck.
  //
  // Two changes, both narrow. `retries: 1` distinguishes a flake from a real
  // failure instead of hiding it — a test that passes on retry is still
  // REPORTED as flaky, so the signal survives. `workers: 2` cuts the contention
  // between four browsers driving geometry-sensitive layout assertions on one
  // machine; the specs measure rendered boxes, which is exactly what starves
  // under parallel load. Slower, and honest.
  //
  // The real fix is upstream: several specs wait on page.waitForTimeout(2200)
  // rather than on a state. That is the actual flake source and it is named in
  // the path-to-9, not fixed here.
  retries: 1,
  workers: 2,
  reporter: [['list']],
  use: {
    // vite preview serves dist under the build base.
    baseURL: 'http://127.0.0.1:5233/ngw-event-planner/hostv2/',
  },
  // Two real geometries (Up-Next #3): portrait phone + the wide-but-short
  // landscape that the min-height guards exist for. Every probe runs in both.
  // ── SPECS THAT PIN THEIR OWN GEOMETRY RUN ONCE, NOT SIX TIMES ──────────────
  // Measured 2026-08-15 on an 18.6-minute run: 440 executed tests over 6
  // projects, and a large share of them were the SAME test repeated at six
  // viewports it discards on its first line. `statColumnChips` is named
  // "1440x900" and ran in mobile, landscape, tablet, tablet-land, desktop AND
  // wide; `heroVoid` is named "768x1024" and does the same. Six identical runs
  // differing only in a viewport the test overrides before it asserts anything.
  //
  // THE TEST FOR INCLUSION IS PER-TEST, NOT PER-FILE, and that distinction is
  // the whole safety of this change. A file merely CONTAINING `setViewportSize`
  // does not qualify — `lodgingCockpit.spec.mjs` has 11 tests and pins in
  // exactly one of them (:319), so its other ten inherit the project viewport
  // and genuinely need the matrix. It is deliberately NOT in this list.
  //
  // Every file below sets the viewport in every test, or in a `boot()` helper
  // that every test calls (mobileTapFloor). Running them once therefore loses
  // no coverage at all: the five dropped executions were doing identical work.
  // The three `_*Capture` specs are env-guarded render tools that skip unless
  // their flag is set; they have no business running six times either.
  //
  // If you add a spec that pins its own geometry, add it here. If you add one
  // that does not, leave it out — the default is the full matrix, which is the
  // safe direction to be wrong in.
  projects: [
    { name: 'mobile',    use: { viewport: { width: 430, height: 860 } }, testIgnore: NON_RESPONSIVE },
    { name: 'landscape', use: { viewport: { width: 860, height: 430 } }, testIgnore: NON_RESPONSIVE },
    // Tablet joined the matrix with the first ported tablet ruling (T1,
    // 2026-07-22) — every probe now guards the full-bleed tablet layouts.
    { name: 'tablet',      use: { viewport: { width: 768,  height: 1024 } }, testIgnore: NON_RESPONSIVE },
    { name: 'tablet-land', use: { viewport: { width: 1024, height: 768 } }, testIgnore: NON_RESPONSIVE },
    // A 13-inch iPad in PORTRAIT is 1024 wide, so it resolves to tablet-land —
    // whose project above is 1024x768, short and wide. Tall-and-narrow was tested
    // at no size, and that is the geometry the fold defect lived in (host-reported
    // 2026-08-17: the handle sat 49% up a 1366px screen).
    { name: 'tablet-tall',  use: { viewport: { width: 1024, height: 1366 } }, testIgnore: NON_RESPONSIVE },
    // ── THE MATRIX STOPPED BELOW THE FEATURE IT SHOULD GUARD (2026-08-06) ───
    // Every project above is under 1280, and 1280 is exactly where the shell
    // stops being a phone silhouette and the responsive command / food / data
    // canvases switch on. So the largest CSS feature in the repo — the two-column
    // command grid, the data-tier reflow, the widescreen step — was structurally
    // unreachable by CI, and a design audit found real breakage there that no
    // test could have caught: 3- and 4-column nav rules laying out inside a
    // 393px phone, guests and vendors collapsing into one column with text
    // overlapping, panels refusing 340px of window height.
    // Adding the two geometries the rules are actually written for.
    // `desktop` is the one project that RUNS the self-pinning specs — they have
    // to run somewhere, and this is the geometry closest to what most of them
    // set for themselves, so a spec that ever loses its own setViewportSize
    // degrades to something sane rather than to a phone.
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'wide',    use: { viewport: { width: 1920, height: 1080 } }, testIgnore: NON_RESPONSIVE },
  ],
  webServer: [
    {
      // Serves the EXISTING dist — run `npm run build` first (the deploy dance
      // already does; CI chains them). Keeping the build out of here makes the
      // readiness probe deterministic.
      // --host 127.0.0.1: under Node ≥17 'localhost' resolves IPv6-first, so a
      // bare preview binds ::1 and the IPv4 readiness probe refuses forever.
      command: 'E2E_BASE=1 npx vite preview --port 5233 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:5233/ngw-event-planner/hostv2/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // ── THE CROSS-DEVICE SYNC HARNESS ────────────────────────────────────
      // Its own bundle, because it needs a Supabase project configured (a fake
      // one) and the dev auth-bypass forced off. Wired here so it cannot quietly
      // stop running: it used to self-skip when this server was absent, and 24
      // silent skips are indistinguishable from 24 passes in a summary line.
      // A gate that can vanish without anyone noticing is not a gate.
      //
      // BUILDS FIRST, unlike the server above, and that difference is load-
      // bearing: dist-synctest is gitignored and is not produced by any other
      // command, so without the build this either serves a stale bundle (testing
      // code nobody has) or nothing at all. The main dist is built by the deploy
      // path; this one has no other author.
      //
      // AUTH_BYPASS must be inline — .env.local sets it true for dev and outranks
      // .env.[mode]. With the bypass on, currentStudioId() returns the non-uuid
      // 'dev-studio', loadEvents() bails before any cloud call, and every test in
      // that spec passes while measuring NOTHING. That is not hypothetical; it is
      // what happened on the first run.
      command: 'REACT_APP_AUTH_BYPASS=false npx vite build --mode synctest --outDir dist-synctest && E2E_BASE=1 npx vite preview --outDir dist-synctest --port 5244 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:5244/ngw-event-planner/hostv2/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
