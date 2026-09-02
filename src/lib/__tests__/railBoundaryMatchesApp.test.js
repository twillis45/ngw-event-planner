// ─── THE E2E RAIL BOUNDARY MUST TRACK THE APP'S OWN ─────────────────────────
//
// Nine browser-test guards skipped at `width < 1280` while explaining
// themselves as "uses the rail". The rail is up from 1024: `isWideBp` counts
// tablet-land as wide and tablet-land starts at 1024. The app said so in
// three places — viewport.js, styles.css, and a unit test — and the e2e guards
// still skipped twenty executions per matrix run on a geometry where the
// surface exists. A skip reads as a pass in a summary line.
//
// This exists so the constant cannot drift back. It is the anti-rot half of
// that fix: the number now lives in one place and this test fails if the app
// moves its breakpoint and the harness does not follow.
import fs from 'fs';
import path from 'path';
import { BREAKPOINTS, isWideBp, bpOf } from '../viewport';

const FIXTURES = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'hostv2', 'e2e', 'fixtures.mjs'), 'utf8',
);

const RAIL_MIN_WIDTH = Number(
  (FIXTURES.match(/export const RAIL_MIN_WIDTH = (\d+)/) || [])[1],
);

describe('the rail boundary', () => {
  test('the e2e harness declares one', () => {
    expect(Number.isFinite(RAIL_MIN_WIDTH)).toBe(true);
  });

  test('it is the width where the app itself starts calling the layout wide', () => {
    // Not a magic number: the first width whose breakpoint isWideBp accepts.
    expect(isWideBp(bpOf(RAIL_MIN_WIDTH))).toBe(true);
    expect(isWideBp(bpOf(RAIL_MIN_WIDTH - 1))).toBe(false);
  });

  test('and it is NOT the desktop breakpoint — that was the bug', () => {
    // The guards read `< 1280`, which is the desktop boundary, on tests whose
    // subject appears a full band earlier.
    expect(RAIL_MIN_WIDTH).toBeLessThan(BREAKPOINTS.desktop);
  });

  // ENUMERATE, do not name. Four guards legitimately use 1280 because the
  // DESKTOP CANVAS really does begin there — that is a different surface from
  // the rail, and the census confirmed each one against the stylesheet. Any
  // OTHER 1280 guard is the rotted kind, so the allowlist is the assertion:
  // a new one has to be argued in here rather than blending in.
  const CANVAS_GATED = new Set([
    'frameCorners.spec.mjs',      // the desktop frame's corners
    'vendorDeskPanel.spec.mjs',   // the "dead third" column
    'rosterDetailPanel.spec.mjs', // the beside-list detail panel
    'wideCanvas.spec.mjs',        // above-1280 overflow behaviour
  ]);

  test('no guard outside the canvas set still skips on the desktop boundary', () => {
    const dir = path.join(__dirname, '..', '..', '..', 'hostv2', 'e2e');
    const offenders = [];
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.spec.mjs'))) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const line of src.split('\n')) {
        if (/test\.skip\(/.test(line) && /width < 1280/.test(line) && !CANVAS_GATED.has(f)) {
          offenders.push(`${f}: ${line.trim().slice(0, 90)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
