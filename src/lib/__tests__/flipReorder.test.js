// ─── THE RANKED LIST SHOWS ITS RANKING CHANGE ───────────────────────────────
//
// FLIP is easy to ship broken in a way that looks like "it sometimes works":
// forget the forced reflow between INVERT and PLAY and the browser coalesces
// both style writes, so the row arrives with no animation. Nothing errors,
// nothing is red, and the feature silently does not exist half the time. Most
// of this file exists to pin the parts that fail quietly.
import { measureRows, playReorder, __test__ } from '../flipReorder';

// A DOM stub rather than jsdom's layout: jsdom does not lay out, so every
// getBoundingClientRect would return zeros and every assertion here would pass
// on rows that never moved. Positions are stated explicitly instead, which is
// also the only way to test a reorder deterministically.
const makeRow = (id, top) => {
  const style = {};
  return {
    _id: id, _top: top, style,
    getAttribute: (k) => (k === 'data-flip' ? id : null),
    getBoundingClientRect: () => ({ top: this ? top : top }),
  };
};
const makeContainer = (rows) => ({
  offsetHeight: 0,
  querySelectorAll: () => rows,
});

describe('measuring', () => {
  test('captures one entry per identified row', () => {
    const c = makeContainer([makeRow('a', 0), makeRow('b', 40), makeRow('c', 80)]);
    const m = measureRows(c);
    expect([...m.keys()]).toEqual(['a', 'b', 'c']);
    expect(m.get('b')).toBe(40);
  });

  test('a very long list is left alone', () => {
    // Past the cap the cost of measuring every child each commit stops being
    // worth the cue, and a long list reordering is a scroll problem.
    const many = Array.from({ length: __test__.MAX_ROWS + 1 }, (_, i) => makeRow('r' + i, i * 10));
    expect(measureRows(makeContainer(many)).size).toBe(0);
  });

  test('it never throws on a missing or odd container', () => {
    for (const c of [null, undefined, {}, { querySelectorAll: 'not a function' }]) {
      expect(measureRows(c).size).toBe(0);
    }
  });
});

describe('playing the reorder', () => {
  test('a row that moved is inverted to where it was, then released', () => {
    const rows = [makeRow('a', 100), makeRow('b', 0)];       // they swapped
    const before = new Map([['a', 0], ['b', 100]]);
    const n = playReorder(makeContainer(rows), before, { force: true });
    expect(n).toBe(2);
    // PLAY leaves the transform empty and a transition attached — that pair is
    // what actually animates. Asserting only the transform would pass on a row
    // that simply snapped.
    for (const r of rows) {
      expect(r.style.transform).toBe('');
      expect(r.style.transition).toMatch(/^transform 260ms/);
    }
  });

  test('a row that did not move is not touched at all', () => {
    // Sub-pixel drift from font metrics is not a ranking change. Animating it
    // is a visible shimmer on an idle screen.
    const rows = [makeRow('a', 0), makeRow('b', 41)];
    const before = new Map([['a', 0], ['b', 40]]);          // 1px of noise
    expect(playReorder(makeContainer(rows), before, { force: true })).toBe(0);
    expect(rows[1].style.transition).toBeUndefined();
  });

  test('a row that ARRIVED is not animated', () => {
    // An entering row has no previous position, so any travel would be a
    // direction the data does not have. Entrances belong to the stagger.
    const rows = [makeRow('new', 0), makeRow('a', 40)];
    const before = new Map([['a', 0]]);
    const n = playReorder(makeContainer(rows), before, { force: true });
    expect(n).toBe(1);
    expect(rows[0].style.transform).toBeUndefined();
  });

  test('it does nothing without a prior measurement', () => {
    const rows = [makeRow('a', 0)];
    expect(playReorder(makeContainer(rows), new Map(), { force: true })).toBe(0);
    expect(playReorder(makeContainer(rows), null, { force: true })).toBe(0);
  });
});

describe('reduced motion', () => {
  const withMedia = (matches, fn) => {
    const orig = global.window && global.window.matchMedia;
    global.window = global.window || {};
    global.window.matchMedia = () => ({ matches });
    try { return fn(); } finally { global.window.matchMedia = orig; }
  };

  test('the reorder is not animated', () => {
    // Safe to drop entirely, unlike the landing ring: the cue carries no
    // information that is not already in the final position.
    const rows = [makeRow('a', 100), makeRow('b', 0)];
    const before = new Map([['a', 0], ['b', 100]]);
    withMedia(true, () => {
      expect(playReorder(makeContainer(rows), before)).toBe(0);
      expect(rows[0].style.transform).toBeUndefined();
    });
  });

  test('and IS animated when the preference is off', () => {
    // Red-proofs the guard: an always-off implementation would pass the test
    // above and be indistinguishable from a working one.
    const rows = [makeRow('a', 100), makeRow('b', 0)];
    const before = new Map([['a', 0], ['b', 100]]);
    withMedia(false, () => {
      expect(playReorder(makeContainer(rows), before)).toBe(2);
    });
  });
});

describe('the quiet failure', () => {
  test('layout is forced between INVERT and PLAY', () => {
    // THE ONE THAT SHIPS BROKEN. Without a forced reflow the browser coalesces
    // the invert and the release into one style recalculation, the row jumps to
    // its final position, and nothing errors. Reading `offsetHeight` is the
    // reflow; this asserts it was read, in between.
    let readAt = -1;
    let writes = 0;
    const rows = [makeRow('a', 100), makeRow('b', 0)];
    for (const r of rows) {
      let t;
      Object.defineProperty(r.style, 'transform', {
        get: () => t,
        set: (v) => { t = v; writes += 1; },
        configurable: true,
      });
    }
    const container = {
      querySelectorAll: () => rows,
      get offsetHeight() { readAt = writes; return 0; },
    };
    playReorder(container, new Map([['a', 0], ['b', 100]]), { force: true });
    // Two inverts happened before the read, two releases after it.
    expect(readAt).toBe(2);
    expect(writes).toBe(4);
  });
});
