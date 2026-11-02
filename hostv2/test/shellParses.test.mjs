// ─── THE SEAM. THIS IS THE TEST THAT COULD NOT EXIST BEFORE. ────────────────
//
// src/lib/customEventStore.js records the fault that motivated this file:
//
//   "jest does not compile the hostv2 tree. A guard nothing tests is not a
//    guard — and this file was written the same day a syntax error in
//    hostv2/src sailed through a fully green 5,451-test run."
//
// react-scripts pins jest's roots to <rootDir>/src, and hostv2 is a separate
// Vite tree outside it. So 35 jest suites reach the shell only by reading it
// as TEXT. A text gate cannot fail on a syntax error — the file still contains
// all the right strings.
//
// Board ruling 2026-09-03 (docs/audits/2026-09-03_SOURCE_TEXT_SUITE_CENSUS.md):
// vitest is ADDITIVE here. It reuses vite.config.js — the same @app alias and
// react plugin the app builds with — so no eject, no CRA change, and it is the
// runner that survives the CRA deletion when react-scripts (and jest) leave.
//
// This test IMPORTS the shell. That is the whole point: a parse error, a bad
// import specifier, or a module-level throw fails here in seconds.
import { describe, it, expect } from 'vitest';

// EVERY module, not just the shell. HostShellV2.jsx is the one that gets
// edited most, but a syntax error in InviteV2, LodgingCockpit, eventPool or
// sectionIcons was equally invisible to jest — and `main.jsx` imports only
// some of them, so a broken sibling can sit unreferenced by any entry point
// the build happens to reach.
//
// import.meta.glob is vite's own, resolved at transform time, so this list
// cannot drift from the tree the way a hand-written array would. eager:false
// keeps them as thunks so each import is its own assertion with its own name.
const ALL = import.meta.glob('../src/**/*.{js,jsx}');

// main.jsx is EXCLUDED, and the reason is not "it failed":
//
// it is the DOM entry point — it calls createRoot() against a real element, so
// importing it in a node environment throws `window is not defined`. Reaching
// for jsdom to satisfy it would also mount the entire app on every unit run,
// which is a browser test wearing a unit test's clothes; that job belongs to
// the 50 Playwright specs.
//
// It also does not NEED this gate: as the build's entry, a syntax error in it
// fails `vite build` outright.
//
// ── AND SO, TODAY, DOES EVERY OTHER MODULE. Checked, after writing the
// opposite. ──────────────────────────────────────────────────────────────
// The first draft of this comment claimed the parse guard covers "a module the
// build does not happen to reach." Then the red-proof put a syntax error in
// PhotoStrip.jsx and BOTH vitest and `vite build` caught it, so the claim was
// tested and failed. Resolving every relative import in the tree: all 11
// modules are reachable from main.jsx. Nothing here is orphaned.
//
// So what the PARSE half of this file actually buys, stated honestly:
//   • speed and precision — 4ms, and it names the failing file, versus a build
//     step; it is wired ahead of `playwright install` so a broken tree costs
//     seconds instead of fourteen minutes of runner time;
//   • durability — it keeps holding if a module later becomes unreferenced, or
//     is reached only through a dynamic import behind a flag, which is when
//     the build silently stops covering it.
//
// The parse guard is NOT the reason vitest is here. That is the tests below,
// which IMPORT modules and assert on what they return — the thing neither a
// build nor a text gate can do at all.
const MODULES = Object.fromEntries(
  Object.entries(ALL).filter(([n]) => !n.endsWith('/main.jsx')));

describe('every hostv2 module parses and evaluates', () => {
  const names = Object.keys(MODULES);

  it('the glob actually found the tree — the probe is real', () => {
    // Without this, an empty glob makes every test below pass vacuously.
    expect(names.length).toBeGreaterThan(8);
  });

  // ── THE CEILING WAS UNDER THE MEASURED COST (2026-11-02) ─────────────────
  // This ran on vitest's 5000ms default and failed roughly half the time on
  // `../src/HostShellV2.jsx imports cleanly` — always a TIMEOUT, never an
  // assertion. It was not a flake. Measured with the ceiling lifted
  // (`--testTimeout=60000`), that one import costs **6101ms / 6088ms /
  // 5691ms** across three runs: the test was systematically over budget and
  // passed only when the machine happened to squeeze under 5s. Confirmed
  // pre-existing by stashing the unrelated change in flight and reproducing
  // 2-of-3 red on a clean tree.
  //
  // A gate that fails half the time is worse than no gate, because it teaches
  // whoever hits it to re-run until green — which is the habit that lets a
  // real failure through. Same reasoning, and the same remedy, as the e2e
  // poll ceiling that went 8s -> 30s in the forty-third entry.
  //
  // 20s is ~3.3x the measured worst case. It is still a HANG detector: a
  // module that genuinely fails to import throws in milliseconds, and nothing
  // here legitimately takes twenty seconds. Raise it again only against a new
  // measurement, never to make a red run go away.
  const IMPORT_TIMEOUT_MS = 20000;

  it.each(names)('%s imports cleanly', async (name) => {
    await MODULES[name]();
  }, IMPORT_TIMEOUT_MS);
});

describe('the hostv2 tree is executable, not merely readable', () => {
  it('HostShellV2.jsx parses and its module evaluates', async () => {
    const mod = await import('../src/HostShellV2.jsx');
    // A default export that is a function is what App mounts.
    expect(typeof mod.default).toBe('function');
  });

  it('the @app alias resolves from inside the hostv2 tree', async () => {
    // The alias crosses into demo/src/lib. If vite.config.js's resolve.alias
    // ever breaks, the build breaks — and until now nothing failed first.
    const mod = await import('@app/lib/playbooks/index.js');
    expect(typeof mod.playbookDecisionBoard).toBe('function');
  });

  it('the shared engine agrees with the shell about parked reasons', async () => {
    // The defect fixed earlier today lived in the COMPOSITION of two files:
    // the engine returned the same sentence the shell printed as its heading.
    // Neither file was wrong alone. This is the first place both can be
    // loaded at once and compared.
    const { playbookDecisionBoard } = await import('@app/lib/playbooks/index.js');
    const asOf = '2026-06-01';
    const d = new Date(asOf + 'T00:00:00');
    d.setDate(d.getDate() + 120);
    const date = d.toISOString().slice(0, 10);
    const board = playbookDecisionBoard(
      { id: 'e', type: 'Crab Feast', date, guestMode: 'count', guestCount: 20 }, asOf);
    expect(board.deferred.length).toBeGreaterThan(0);
    // The shelf heading HostShellV2 renders above these rows.
    for (const r of board.deferred) {
      expect(r.rankReason.toLowerCase()).not.toBe('comes up closer to the date.');
    }
  });
});
