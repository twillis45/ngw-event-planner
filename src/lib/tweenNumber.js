// ─── A NUMBER THAT MOVES WITH ITS BAR ───────────────────────────────────────
//
// The motion audit's finding 10: `.bar i` interpolates its fill over 700ms, and
// the number printed beside it is a plain text swap. So a readiness or budget
// figure changing shows a bar gliding to its new length next to digits that
// have already arrived — and the audit's word for how that reads is the right
// one: a bug. Two representations of one value, disagreeing for most of a
// second, every time the value changes.
//
// The fix is not "animate the number because motion is nice". It is that these
// are the SAME fact drawn twice, and two drawings of one fact must not
// contradict each other on screen. Everything below follows from that:
//
//  - The duration is the BAR's, passed in, never chosen here. A digit that
//    finishes early or late is the same disagreement in a new costume.
//  - Reduced motion returns the destination immediately. The number is the
//    information; the travel is only there to agree with the bar, and with the
//    bar's own animation off there is nothing left to agree with.
//  - A first render does not tween. Counting up from zero on arrival is an
//    entrance, not a change, and this is not the entrance system.

/** Same curve family as `--ease-standard`, evaluated directly: this runs on
 *  rAF rather than CSS, so it cannot read the token. Fast out, settled in. */
const easeStandard = (t) => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_e) { return false; }
};

/**
 * frameValues(from, to, ms, step) -> number[]
 *
 * The values a tween would emit at `step` ms intervals. Pure, so the behavior
 * can be tested without a clock or a DOM: the animation below is this list
 * played back on rAF.
 *
 * Rounded to integers because these are counts and currency, not physics —
 * "4.3 of 8" is not a state this app is ever allowed to show.
 */
export function frameValues(from, to, ms, step = 16) {
  const a = Number(from); const b = Number(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [Math.round(Number(to) || 0)];
  if (a === b || !ms || ms <= 0) return [Math.round(b)];
  const out = [];
  for (let t = step; t < ms; t += step) out.push(Math.round(a + (b - a) * easeStandard(t / ms)));
  out.push(Math.round(b));                       // the destination is exact, always
  return out;
}

/**
 * tweenNumber(from, to, ms, onFrame) -> cancel
 *
 * Drives `onFrame` with integers from `from` to `to`. Returns a cancel function;
 * calling it stops the tween where it is. ALWAYS call it on unmount or on a new
 * value — two tweens racing on one element is how a number ends up settling on
 * a stale figure, which is worse than the cut this replaces.
 */
export function tweenNumber(from, to, ms, onFrame) {
  const a = Number(from); const b = Number(to);
  const land = () => { try { onFrame(Math.round(Number.isFinite(b) ? b : 0)); } catch (_e) { /* detached */ } };
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) { land(); return () => {}; }
  if (prefersReducedMotion() || !ms || ms <= 0) { land(); return () => {}; }
  if (typeof requestAnimationFrame !== 'function') { land(); return () => {}; }

  let raf = 0; let start = 0; let done = false;
  const tick = (now) => {
    if (done) return;
    if (!start) start = now;
    const t = Math.min(1, (now - start) / ms);
    try { onFrame(Math.round(a + (b - a) * easeStandard(t))); } catch (_e) { done = true; return; }
    if (t < 1) raf = requestAnimationFrame(tick); else done = true;
  };
  raf = requestAnimationFrame(tick);
  return () => {
    if (done) return;
    done = true;
    if (raf) cancelAnimationFrame(raf);
  };
}

export const __test__ = { easeStandard };
