// ─── THE NUMBER AND THE BAR ARE ONE FACT ────────────────────────────────────
//
// Motion audit finding 10: the bar interpolates its fill over 700ms while the
// number beside it swaps instantly, so two drawings of the same value disagree
// for most of a second every time it changes. The audit's word for how that
// reads is "a bug", and it is the right one.
//
// So the assertions here are about AGREEMENT, not about smoothness. A tween
// that looks lovely and lands on the wrong figure, or lands at a different
// moment than the bar, has not fixed anything.
import { frameValues, tweenNumber } from '../tweenNumber';

describe('the values a change passes through', () => {
  test('it starts where it was and ENDS EXACTLY where it is going', () => {
    // The destination is asserted exactly, not approximately. An eased tween
    // that stops at 7.98 renders "8" only because of rounding luck.
    const f = frameValues(0, 8, 700);
    expect(f[f.length - 1]).toBe(8);
    expect(f[0]).toBeLessThan(8);
    expect(f[0]).toBeGreaterThanOrEqual(0);
  });

  test('every frame is a whole number', () => {
    // These are counts and currency. "4.3 of 8" is not a state this app is
    // ever allowed to show, however briefly.
    for (const v of frameValues(3, 11, 700)) expect(Number.isInteger(v)).toBe(true);
  });

  test('it never overshoots or reverses', () => {
    // Rules out a spring or a bounce arriving here by accident — UX_01 forbids
    // both, and a readiness figure that overshoots to 9 before settling on 8
    // is briefly a lie about the plan.
    const f = frameValues(2, 9, 700);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThanOrEqual(f[i - 1]);
    expect(Math.max(...f)).toBe(9);
  });

  test('downward changes work the same way', () => {
    const f = frameValues(9, 2, 700);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeLessThanOrEqual(f[i - 1]);
    expect(f[f.length - 1]).toBe(2);
    expect(Math.min(...f)).toBe(2);
  });

  test('no change produces no travel', () => {
    expect(frameValues(5, 5, 700)).toEqual([5]);
  });

  test('nonsense in, the destination out — never NaN on screen', () => {
    expect(frameValues(undefined, 4, 700)).toEqual([4]);
    expect(frameValues(null, 0, 700)).toEqual([0]);
    for (const v of frameValues('x', 6, 700)) expect(Number.isNaN(v)).toBe(false);
  });
});

describe('driving it', () => {
  const withRaf = (fn) => {
    const origR = global.requestAnimationFrame;
    const origC = global.cancelAnimationFrame;
    let t = 0; const queue = [];
    global.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    global.cancelAnimationFrame = () => {};
    const advance = (ms) => { t += ms; const q = queue.splice(0); for (const cb of q) cb(t); };
    try { return fn(advance); } finally {
      global.requestAnimationFrame = origR; global.cancelAnimationFrame = origC;
    }
  };

  test('it lands on the destination and stops', () => {
    withRaf((advance) => {
      const seen = [];
      tweenNumber(0, 10, 700, (v) => seen.push(v));
      for (let i = 0; i < 60; i++) advance(16);
      expect(seen[seen.length - 1]).toBe(10);
      const before = seen.length;
      advance(500);
      expect(seen.length).toBe(before);          // finished means finished
    });
  });

  test('cancelling stops it where it is', () => {
    // Load-bearing: two tweens racing on one element is how a number settles on
    // a STALE figure, which is worse than the cut this replaces.
    withRaf((advance) => {
      const seen = [];
      const cancel = tweenNumber(0, 100, 700, (v) => seen.push(v));
      advance(16); advance(16);
      const at = seen.length;
      cancel();
      advance(400);
      expect(seen.length).toBe(at);
      expect(seen[seen.length - 1]).toBeLessThan(100);
    });
  });

  test('an equal value calls back once with the value, and never animates', () => {
    withRaf((advance) => {
      const seen = [];
      tweenNumber(7, 7, 700, (v) => seen.push(v));
      advance(700);
      expect(seen).toEqual([7]);
    });
  });
});

describe('reduced motion', () => {
  const withMedia = (matches, fn) => {
    global.window = global.window || {};
    const orig = global.window.matchMedia;
    global.window.matchMedia = () => ({ matches });
    try { return fn(); } finally { global.window.matchMedia = orig; }
  };

  test('the number arrives immediately, with no frames in between', () => {
    // The number IS the information; the travel exists only to agree with the
    // bar, and the bar's own animation is off under this preference. There is
    // nothing left to agree with.
    withMedia(true, () => {
      const seen = [];
      tweenNumber(0, 42, 700, (v) => seen.push(v));
      expect(seen).toEqual([42]);
    });
  });

  test('and it DOES animate when the preference is off', () => {
    // Red-proofs the guard: an implementation that always jumped would pass the
    // test above and be indistinguishable from a working one.
    withMedia(false, () => {
      const origR = global.requestAnimationFrame;
      let queued = 0;
      global.requestAnimationFrame = () => { queued += 1; return 1; };
      try {
        tweenNumber(0, 42, 700, () => {});
        expect(queued).toBe(1);
      } finally { global.requestAnimationFrame = origR; }
    });
  });
});
