// ─── The viewport system — one source of truth for BOTH shells ───────────────
//
// WHY THIS FILE EXISTS (2026-08-07)
// hostv2 was built as a phone shell and never received the breakpoint system.
// Measured: `useBreakpoint` / `bp === '…'` / `isWide` appear 117 times in
// src/App.js and ZERO times in hostv2/src/HostShellV2.jsx, which has no
// window.innerWidth, no ResizeObserver, and no sidebar. Its only matchMedia
// calls are prefers-reduced-motion and pointer:coarse. 39 of 1299 stylesheet
// rules (3%) respond to width, and NOT ONE targets 640–1023 — so tablet has
// never had a layout at all.
//
// The thresholds and the reasoning below are NOT new. They are the board-ratified
// system already living inside App.js, lifted here verbatim so hostv2 can import
// it. App.js is frozen (donor-only), so it keeps its own copy rather than being
// refactored to import this; the duplication ends when the CRA is deleted.
// Shared-engine work in lib/ is the one thing the freeze permits.
//
// The purpose, stated in App.js's own comment and worth repeating because it is
// exactly the defect this closes:
//     "turn extra real-estate into the WORK laid out in columns,
//      not a stretched single column."

import { useState, useEffect } from 'react';

// mobile < 640 · tablet 640–1023 (portrait iPad included) · tablet-land 1024–1279 · desktop ≥ 1280
export const BREAKPOINTS = { tablet: 640, tabletLand: 1024, desktop: 1280 };

// ≥1536 is a refinement WITHIN 'desktop', deliberately NOT a new bp enum value —
// adding one would break every `bp === 'desktop'` check. Threshold board-revised
// 1680→1536: 1680 stranded the 1440/1536 laptops planners actually triage on.
export const WIDESCREEN = 1536;

export function bpOf(w) {
  return w < BREAKPOINTS.tablet ? 'mobile'
    : w < BREAKPOINTS.tabletLand ? 'tablet'
    : w < BREAKPOINTS.desktop ? 'tablet-land'
    : 'desktop';
}

// isWide === "the sidebar is visible". Below it, navigation collapses. This is the
// single flag UX_03 hangs the whole rail/hamburger decision on.
export const isWideBp = (bp) => bp === 'desktop' || bp === 'tablet-land';

const readWidth = () => (typeof window === 'undefined' ? BREAKPOINTS.desktop : window.innerWidth);

// ── THE BAND IS READ FROM THE STYLESHEET'S OWN QUESTION (#236, 11/22/2026) ──
// This used to be bpOf(window.innerWidth). On iOS those are two different
// widths: innerWidth follows the VISIBLE area, while media queries and every
// block width follow the LAYOUT viewport. The owner's iPad, turned mid-session,
// kept the old layout width while innerWidth reported the new one, so the
// markup raised the rail (innerWidth 1210) inside a stylesheet still laying out
// 834 (body on --bg-band, the <1024 ground; pixel-sampled from her screenshot).
// matchMedia asks the engine the same question the stylesheet asks, so data-bp
// cannot disagree with the CSS it drives. It also stops a pinch zoom, which
// shrinks innerWidth on iOS, from dropping the rail. innerWidth stays as the
// fallback where matchMedia does not exist (jsdom, very old engines).
const mq = (px) => {
  try { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(`(min-width:${px}px)`) : null; }
  catch { return null; }
};
// The width bpOf/WIDESCREEN tests need, answered at each threshold by the
// engine: the smallest threshold not met, minus one, or the largest met.
export function readLayoutWidth() {
  const steps = [BREAKPOINTS.tablet, BREAKPOINTS.tabletLand, BREAKPOINTS.desktop, WIDESCREEN];
  const lists = steps.map(mq);
  if (lists.some((l) => !l)) return readWidth();
  for (let i = 0; i < steps.length; i += 1) if (!lists[i].matches) return steps[i] - 1;
  return WIDESCREEN;
}

// One resize listener shared by every hook instance. The donor registered a
// listener per call site; hostv2 renders far more subscribers per screen, and N
// listeners each calling setState on the same resize is N renders for one event.
// The media lists' own `change` events are listened to as well: they fire when
// the engine's layout width crosses a threshold, which is the moment the CSS
// flips, whether or not a `resize` arrived with a current width.
const subs = new Set();
let bound = false;
function subscribe(fn) {
  subs.add(fn);
  if (!bound && typeof window !== 'undefined') {
    bound = true;
    const fire = () => { const w = readLayoutWidth(); subs.forEach((f) => f(w)); };
    window.addEventListener('resize', fire);
    window.addEventListener('orientationchange', fire);
    [BREAKPOINTS.tablet, BREAKPOINTS.tabletLand, BREAKPOINTS.desktop, WIDESCREEN].forEach((px) => {
      const l = mq(px);
      if (l && typeof l.addEventListener === 'function') l.addEventListener('change', fire);
      else if (l && typeof l.addListener === 'function') l.addListener(fire);
    });
  }
  return () => { subs.delete(fn); };
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() => bpOf(readLayoutWidth()));
  useEffect(() => subscribe((w) => setBp((prev) => {
    const next = bpOf(w);
    return next === prev ? prev : next;   // never re-render on a width change that stays in-band
  })), []);
  return bp;
}

export function useWideScreen() {
  const [wide, setWide] = useState(() => readLayoutWidth() >= WIDESCREEN);
  useEffect(() => subscribe((w) => setWide((prev) => {
    const next = w >= WIDESCREEN;
    return next === prev ? prev : next;
  })), []);
  return wide;
}

// ─── Width / measure system ──────────────────────────────────────────────────
// Content width is chosen by content TYPE, not per-tab, so every screen lines up.
// Board ruling 2026-06-11: TWO tiers, not four, so the app stops reading as five
// different widths. The tiers sit only ~80–200px apart so they read as one app.
// Legacy names alias on for back-compat (a form's narrowness is a property of its
// fields, not its page — so `reading` maps to `standard`).
//
// Each measure binds only when the screen exceeds it and goes fluid below, so
// mobile and tablet are consistent BY CONSTRUCTION — the same measure governs
// every device, it simply doesn't bind until the viewport is wide enough. That is
// why this is not a per-breakpoint fork.
export const CONTENT_MEASURE = {
  standard: { base: 1200, wide: 1280 },
  wide:     { base: 1360, wide: 1480 },
  content:  { base: 1200, wide: 1280 },
  data:     { base: 1360, wide: 1480 },
  reading:  { base: 1200, wide: 1280 },
};

export const measureFor = (tier, wide) =>
  tier === 'full' ? 'none'
    : (CONTENT_MEASURE[tier] || CONTENT_MEASURE.standard)[wide ? 'wide' : 'base'];
