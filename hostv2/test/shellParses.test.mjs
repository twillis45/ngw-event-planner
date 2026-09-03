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
