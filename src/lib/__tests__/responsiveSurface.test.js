// ─── The responsive surface mapping is pinned (Phase 5G-C1) ──────────────────
//
// THE INVARIANT: exactly two surfaces widen. Every other stage/sheet combination
// keeps the phone stage. This test exists because the failure mode is SILENT — a
// sheet quietly starts widening and nobody notices until a host reports a broken
// screen.
import {
  responsiveSurfaceMode, stagewrapClass, optsOutOfFit, SURFACE_MODES, SURFACE_CLASS,
  phoneStageForced,
} from '../responsiveSurface';

describe('the responsive surface set is pinned by explicit identity', () => {
  test('the orientation command surface', () => {
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: null })).toBe('command');
    expect(responsiveSurfaceMode({ stage: 'plan' })).toBe('command');
    expect(stagewrapClass({ stage: 'plan', sheet: null })).toBe('stagewrap--responsive-command');
  });

  test('the food sheet carrying the ice recommendation', () => {
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: 'food' })).toBe('food-recommendation');
    expect(stagewrapClass({ stage: 'plan', sheet: 'food' })).toBe('stagewrap--responsive-food');
  });

  // SCOPE CHANGE 2026-08-07: budget and guests moved OUT of the legacy list into
  // the `data` mode. They are UX_03's named `data` tier ("dense tables & boards
  // that should USE width"), and desktop was measured at 2 responsive surfaces
  // out of 45. Everything below them stays legacy — the invariant is unchanged in
  // kind, only its membership moved, and it moved by explicit identity.
  test('every dense-data sheet widens', () => {
    for (const sheet of ['budget', 'guests', 'vendors', 'tasks', 'risks',
      'decisions', 'seating', 'supplies']) {
      expect(responsiveSurfaceMode({ stage: 'plan', sheet })).toBe('data');
    }
  });

  test('a form or single-decision sheet never widens — width costs it measure', () => {
    for (const sheet of ['ask', 'date', 'settings', 'qr', 'pass', 'help']) {
      expect(responsiveSurfaceMode({ stage: 'plan', sheet })).toBe('legacy');
    }
  });

  test('the data mode resolves to its own stagewrap class', () => {
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: 'budget' })).toBe('data');
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: 'guests' })).toBe('data');
    expect(stagewrapClass({ stage: 'plan', sheet: 'budget' })).toBe('stagewrap--responsive-data');
    expect(optsOutOfFit({ stage: 'plan', sheet: 'guests' })).toBe(true);
  });

  test('a data sheet outside the plan stage does NOT widen', () => {
    // Identity is stage AND sheet. A budget sheet reached from the day stage is a
    // different surface and keeps the phone stage until it is ruled on.
    expect(responsiveSurfaceMode({ stage: 'day', sheet: 'budget' })).toBe('legacy');
    expect(responsiveSurfaceMode({ stage: 'after', sheet: 'guests' })).toBe('legacy');
  });

  test('EVERY other plan sheet stays legacy — no silent widening', () => {
    // The whole point of the ruling: Vendors and the rest are documented debt,
    // not surfaces that get stretched because they happen to share a stage.
    for (const sheet of ['timeline', 'travel', 'ask', 'settings', 'invite',
      'date', 'qr', 'pass', 'help', 'meaning', 'thanks', 'unknown-future-sheet']) {
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

  test('only the declared modes can ever be produced', () => {
    const seen = new Set();
    for (const stage of ['plan', 'day', 'after', 'create', null]) {
      for (const sheet of [null, 'food', 'guests', 'vendors', 'budget']) {
        seen.add(responsiveSurfaceMode({ stage, sheet }));
      }
    }
    for (const m of seen) expect(SURFACE_MODES).toContain(m);
    // 4 since 2026-08-07: command · food-recommendation · data · legacy.
    expect(seen.size).toBe(4);
  });
});

describe('the --fit opt-out follows the mode, nothing else', () => {
  test('every responsive surface opts out; legacy keeps the transform', () => {
    expect(optsOutOfFit({ stage: 'plan', sheet: null })).toBe(true);
    expect(optsOutOfFit({ stage: 'plan', sheet: 'food' })).toBe(true);
    // guests is a `data` surface now, so it opts out like the other responsive
    // modes. `ask` is a FORM — it stays legacy and is what still proves the
    // transform is kept. (vendors was the exemplar here until it became a data
    // sheet itself; an exemplar has to be chosen from the side it demonstrates.)
    expect(optsOutOfFit({ stage: 'plan', sheet: 'guests' })).toBe(true);
    expect(optsOutOfFit({ stage: 'plan', sheet: 'ask' })).toBe(false);
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

// ?stage=phone — a LOCAL demo affordance. The shell picks its shape from the window,
// so a laptop tab could never show the phone composition; this forces it. It must be
// impossible to trigger in production.
describe('?stage=phone forces the silhouette, and only on localhost', () => {
  const loc = (hostname, search) => ({ hostname, search });

  test('it fires on localhost with the flag', () => {
    expect(phoneStageForced(loc('localhost', '?stage=phone'))).toBe(true);
    expect(phoneStageForced(loc('127.0.0.1', '?stage=phone'))).toBe(true);
  });

  test('it is INERT on a deployed host — production cannot be changed by a URL', () => {
    expect(phoneStageForced(loc('twillis45.github.io', '?stage=phone'))).toBe(false);
    expect(phoneStageForced(loc('ngw.example.com', '?stage=phone'))).toBe(false);
  });

  test('localhost without the flag changes nothing', () => {
    expect(phoneStageForced(loc('localhost', ''))).toBe(false);
    expect(phoneStageForced(loc('localhost', '?other=1'))).toBe(false);
  });

  test('it does not match a look-alike param', () => {
    expect(phoneStageForced(loc('localhost', '?stage=phoney'))).toBe(false);
    expect(phoneStageForced(loc('localhost', '?mystage=phone'))).toBe(false);
  });

  test('it reads the flag anywhere in the query string', () => {
    expect(phoneStageForced(loc('localhost', '?a=1&stage=phone'))).toBe(true);
    expect(phoneStageForced(loc('localhost', '?stage=phone&b=2'))).toBe(true);
  });

  test('it degrades safely with no location at all', () => {
    expect(phoneStageForced(null)).toBe(false);
  });

  test('the default mapping is UNCHANGED when the flag is absent', () => {
    // jsdom is localhost with an empty search — the existing invariants must hold.
    expect(responsiveSurfaceMode({ stage: 'plan', sheet: null })).toBe('command');
    expect(optsOutOfFit({ stage: 'plan', sheet: null })).toBe(true);
  });
});
