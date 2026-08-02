// ─── The responsive surface mapping is pinned (Phase 5G-C1) ──────────────────
//
// THE INVARIANT: exactly two surfaces widen. Every other stage/sheet combination
// keeps the phone stage. This test exists because the failure mode is SILENT — a
// sheet quietly starts widening and nobody notices until a host reports a broken
// screen.
import {
  responsiveSurfaceMode, stagewrapClass, optsOutOfFit, SURFACE_MODES, SURFACE_CLASS,
} from '../responsiveSurface';

describe('exactly two surfaces are responsive in C1', () => {
  test('the orientation command surface', () => {
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: null })).toBe('command');
    expect(responsiveSurfaceMode({ stage: 'plan' })).toBe('command');
    expect(stagewrapClass({ stage: 'plan', sheet: null })).toBe('stagewrap--responsive-command');
  });

  test('the food sheet carrying the ice recommendation', () => {
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: 'food' })).toBe('food-recommendation');
    expect(stagewrapClass({ stage: 'plan', sheet: 'food' })).toBe('stagewrap--responsive-food');
  });

  test('EVERY other plan sheet stays legacy — no silent widening', () => {
    // The whole point of the ruling: Guests/Vendors/Budget are documented debt,
    // not surfaces that get stretched because they happen to share a stage.
    for (const sheet of ['guests', 'vendors', 'budget', 'timeline', 'risks', 'decisions',
      'seating', 'travel', 'ask', 'settings', 'invite', 'unknown-future-sheet']) {
      expect(responsiveSurfaceMode({ stage: 'plan', sheet })).toBe('legacy');
      expect(stagewrapClass({ stage: 'plan', sheet })).toBe('');
    }
  });

  test('every other STAGE stays legacy, sheet or no sheet', () => {
    for (const stage of ['day', 'after', 'create', 'unknown-future-stage']) {
      for (const sheet of [null, 'food', 'guests']) {
        expect(responsiveSurfaceMode({ stage, sheet })).toBe('legacy');
      }
    }
  });

  test('a food sheet OUTSIDE the plan stage does not widen', () => {
    // Guards the pairing rather than the sheet name alone.
    expect(responsiveSurfaceMode({ stage: 'day', sheet: 'food' })).toBe('legacy');
    expect(responsiveSurfaceMode({ stage: 'after', sheet: 'food' })).toBe('legacy');
  });

  test('junk input degrades to legacy rather than throwing', () => {
    for (const bad of [undefined, null, {}, { stage: null }, { sheet: 'food' }]) {
      expect(() => responsiveSurfaceMode(bad)).not.toThrow();
      expect(responsiveSurfaceMode(bad)).toBe('legacy');
    }
  });

  test('only the three declared modes can ever be produced', () => {
    const seen = new Set();
    for (const stage of ['plan', 'day', 'after', 'create', null]) {
      for (const sheet of [null, 'food', 'guests', 'vendors', 'budget']) {
        seen.add(responsiveSurfaceMode({ stage, sheet }));
      }
    }
    for (const m of seen) expect(SURFACE_MODES).toContain(m);
    expect(seen.size).toBe(3);
  });
});

describe('the --fit opt-out follows the mode, nothing else', () => {
  test('both responsive surfaces opt out; legacy keeps the transform', () => {
    expect(optsOutOfFit({ stage: 'plan', sheet: null })).toBe(true);
    expect(optsOutOfFit({ stage: 'plan', sheet: 'food' })).toBe(true);
    expect(optsOutOfFit({ stage: 'plan', sheet: 'guests' })).toBe(false);
    expect(optsOutOfFit({ stage: 'day', sheet: null })).toBe(false);
  });

  test('opt-out and class assignment cannot disagree', () => {
    for (const stage of ['plan', 'day', 'after', 'create']) {
      for (const sheet of [null, 'food', 'guests', 'budget']) {
        const st = { stage, sheet };
        expect(optsOutOfFit(st)).toBe(stagewrapClass(st) !== '');
      }
    }
  });

  test('legacy contributes NO class — the existing stage is untouched', () => {
    expect(SURFACE_CLASS.legacy).toBe('');
  });
});
