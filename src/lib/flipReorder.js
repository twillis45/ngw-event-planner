// ─── WHEN A RANKED LIST REORDERS, THE ROWS MOVE ─────────────────────────────
//
// The motion audit of 2026-08-21 found one axis where this app is genuinely
// behind the category, and it is continuity: nothing connected a before-state
// to an after-state. Sheet origin closed half of it. This is the other half,
// and it is the half that matters most for THIS product, because ranking is
// the whole thesis — the app's claim is that it knows what to do next, and it
// expresses that claim by ORDER.
//
// When the order changes and the rows cut, the host has to re-read the list to
// find out what happened. When the rows travel, they have already been told:
// that one dropped, this one rose, nothing else moved. Same information, no
// re-reading. That is not decoration; it is the difference between a list that
// reports a ranking and a list that shows a ranking changing.
//
// ── WHY FLIP AND NOT A TRANSITION ───────────────────────────────────────────
//
// Rows are laid out by the document flow, and flow position is not animatable.
// FLIP (First, Last, Invert, Play) sidesteps that: measure where each row was,
// let the browser lay out where it now is, apply a transform that puts it back
// where it started, then release the transform. The browser animates the
// release on the compositor. Nothing about layout is animated at any point.
//
// ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
//
// It does not animate rows that ARRIVE or LEAVE. An entering row has no
// previous position to travel from, and inventing one means picking a
// direction the data does not have. Entrances are the existing `cardin`
// stagger's job, and that is gated to a surface's arrival for its own reasons.
// This moves rows that persisted across a reorder, and nothing else.

/** Rows moved less than this are not moved at all. Sub-pixel and hairline
 *  shifts come from font metrics and subpixel layout, not from a ranking
 *  change, and animating them is visible as a shimmer on an idle screen. */
const MIN_TRAVEL = 4;

/** Above this many rows the cost of measuring every child each commit stops
 *  being worth the cue, and a long list reordering is a scroll problem rather
 *  than a continuity one. */
const MAX_ROWS = 40;

const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_e) { return false; }
};

/**
 * measureRows(container, attr) -> Map<id, top>
 *
 * Vertical position only. These are full-width stacked rows; a horizontal
 * component would only ever be layout noise here, and carrying it would make
 * the "did it move" test fire on width changes that are not reorders.
 */
export function measureRows(container, attr = 'data-flip') {
  const out = new Map();
  if (!container || typeof container.querySelectorAll !== 'function') return out;
  const nodes = container.querySelectorAll(`[${attr}]`);
  if (!nodes.length || nodes.length > MAX_ROWS) return out;
  for (const el of nodes) {
    const id = el.getAttribute(attr);
    if (!id) continue;
    out.set(id, el.getBoundingClientRect().top);
  }
  return out;
}

/**
 * playReorder(container, before, opts) -> number  (rows actually moved)
 *
 * Call in a LAYOUT effect, after the commit that changed the order, passing
 * the map captured before it. Returns the count so a caller (or a test) can
 * tell "nothing moved" from "it did not run".
 */
export function playReorder(container, before, opts) {
  const o = opts || {};
  const attr = o.attr || 'data-flip';
  const ms = o.ms || 260;
  const easing = o.easing || 'cubic-bezier(.2,0,0,1)';
  if (!container || !before || !before.size) return 0;
  // Reduced motion gets the new order instantly. This is a pure cue with no
  // information that is not already in the final position, so removing it
  // costs nothing — unlike the landing ring, which had to stay in a static
  // form because it is the only thing saying WHERE you landed.
  if (!o.force && prefersReducedMotion()) return 0;

  const nodes = container.querySelectorAll(`[${attr}]`);
  if (!nodes.length || nodes.length > MAX_ROWS) return 0;

  const moved = [];
  for (const el of nodes) {
    const id = el.getAttribute(attr);
    if (!id || !before.has(id)) continue;             // arrived: not our job
    const delta = before.get(id) - el.getBoundingClientRect().top;
    if (Math.abs(delta) < MIN_TRAVEL) continue;
    moved.push([el, delta]);
  }
  if (!moved.length) return 0;

  for (const [el, delta] of moved) {
    // INVERT: put it back where it was, with no transition, so this frame is
    // visually identical to the one before the reorder.
    el.style.transition = 'none';
    el.style.transform = `translateY(${delta}px)`;
  }
  // Force layout so the inverted position is committed before the transition
  // is attached. Without this the browser coalesces both writes and the row
  // arrives with no animation at all — the failure that makes FLIP look like
  // it "sometimes works".
  void container.offsetHeight;
  for (const [el] of moved) {
    // PLAY.
    el.style.transition = `transform ${ms}ms ${easing}`;
    el.style.transform = '';
  }
  return moved.length;
}

export const __test__ = { MIN_TRAVEL, MAX_ROWS };
