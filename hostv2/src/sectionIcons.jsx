// ─── Section rail icons ──────────────────────────────────────────────────────
//
// Host directive 2026-08-07: "for desktop, tablet widescreen, I like the
// blink.global icons for the menu options. good for collapse."
//
// The collapse point is the reason these exist rather than decoration: a rail
// that can drop to icons-only needs a mark per door that survives losing its
// label. That is the shape every leader in the viewport ruling uses.
//
// RULES THIS OBEYS:
//  - NO EMOJI. Standing rule; product copy and chrome carry none. These are
//    inline strokes on `currentColor`, so a row's icon inherits its own state
//    (muted / ink / active) and no icon needs its own palette entry — UX_02's
//    colour budget is spent on state, never on ornament.
//  - Geometry over illustration. 16px box, 1.5 stroke, round caps, no fills.
//    At 16px a detailed glyph turns to mud; these read as one family because
//    they are drawn on the same grid, not because they share a style.
//  - EVERY door in sectionDirectory has one. A rail that collapses to icons
//    cannot have a hole in it, so `icon()` falls back to a neutral dot rather
//    than rendering nothing and leaving an unlabelled, unhittable gap.
//
// Not artwork: the "Artwork Glyphs" rule governs EVENT glyphs (the real PD
// artwork that identifies an event and must be the same image at every size).
// These are UI affordances for navigation, a different job entirely.

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const P = {
  // Your plan
  guests:    <><circle cx="6" cy="6.5" r="2.5" /><path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M11 4.6a2.4 2.4 0 0 1 0 4.3" /><path d="M12.4 13.9c0-2 .6-3.2-.6-4.2" /></>,
  food:      <><path d="M3 1.5v5.2a1.8 1.8 0 0 0 3.6 0V1.5" /><path d="M4.8 6.7V14.5" /><path d="M12 1.5c-1.4 1-2 2.6-2 4.4 0 1.3.7 2.1 2 2.3v6.3" /></>,
  budget:    <><path d="M8 1.6v12.8" /><path d="M10.9 4H6.6a2.1 2.1 0 0 0 0 4.2h2.8a2.1 2.1 0 0 1 0 4.2H4.8" /></>,
  vendors:   <><rect x="1.8" y="4.8" width="12.4" height="8.6" rx="1.4" /><path d="M5.6 4.8V3.4A1.4 1.4 0 0 1 7 2h2a1.4 1.4 0 0 1 1.4 1.4v1.4" /><path d="M1.8 8.6h12.4" /></>,
  space:     <><rect x="1.8" y="2.4" width="12.4" height="11.2" rx="1.3" /><path d="M1.8 6.4h12.4" /><path d="M6.2 6.4v7.2" /></>,
  // The three non-section doors folded into the rail (2026-08-21): switching
  // events, search, help. Marks, not the dot fallback — ICON_KINDS pins that.
  events:    <><rect x="2" y="3.2" width="12" height="9.6" rx="1.4" /><path d="M2 6.4h12" /><path d="M5.6 9.4h4.8" /></>,
  search:    <><circle cx="7.2" cy="7.2" r="4.2" /><path d="M10.4 10.4l3.1 3.1" /></>,
  help:      <><circle cx="8" cy="8" r="6.2" /><path d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.8.6-.8 1.1v.4" /><path d="M8 12.1h.01" /></>,
  // "Your days" (span-gated door, 2026-08-21): calendar with day ticks —
  // distinct from `space`'s floor-plan grid at 16px.
  days:      <><rect x="1.8" y="3" width="12.4" height="10.6" rx="1.3" /><path d="M1.8 6.2h12.4" /><path d="M4.6 1.6v2.6" /><path d="M11.4 1.6v2.6" /><path d="M4.4 9h2" /><path d="M9.6 9h2" /><path d="M4.4 11.4h2" /></>,
  seating:   <><path d="M3.4 6.6V3.9a1.5 1.5 0 0 1 1.5-1.5h6.2a1.5 1.5 0 0 1 1.5 1.5v2.7" /><path d="M2.2 6.6h11.6v3.9H2.2z" /><path d="M3.6 10.5v3.1" /><path d="M12.4 10.5v3.1" /></>,
  tasks:     <><path d="M2 4.4l1.6 1.6L6.4 3" /><path d="M2 11.1l1.6 1.6 2.8-3" /><path d="M8.6 4.6h5.4" /><path d="M8.6 11.4h5.4" /></>,
  decisions: <><path d="M8 1.8v3.1" /><circle cx="8" cy="6.6" r="1.7" /><path d="M6.5 7.9L3.2 13.9" /><path d="M9.5 7.9l3.3 6" /></>,

  // Keep it on track
  risks:     <><path d="M8 2.2l6 10.4H2z" /><path d="M8 6.4v3" /><path d="M8 11.4h.01" /></>,
  rain:      <><path d="M4.6 9.4a3.1 3.1 0 0 1 .4-6.1 4 4 0 0 1 7.5 1.3 2.6 2.6 0 0 1-.6 4.8" /><path d="M5.6 11.6l-.8 2.2" /><path d="M8.3 11.6l-.8 2.2" /><path d="M11 11.6l-.8 2.2" /></>,
  lodging:   <><path d="M1.9 13.6V7.2L8 2.4l6.1 4.8v6.4" /><path d="M6.1 13.6V9.4h3.8v4.2" /></>,
  air:       <><path d="M1.8 8.6l12.4-4.2-2.1 4.2 2.1 4.2z" /><path d="M5.2 9.6l1.1 3.1" /></>,
  ground:    <><rect x="1.8" y="5.6" width="12.4" height="5.4" rx="1.5" /><path d="M4.6 11v1.7" /><path d="M11.4 11v1.7" /><path d="M1.8 8.2h12.4" /></>,
  crabs:     <><circle cx="8" cy="8.4" r="3.1" /><path d="M4.9 6.6L2.2 4.8" /><path d="M11.1 6.6l2.7-1.8" /><path d="M4.9 10.2l-2.7 1.8" /><path d="M11.1 10.2l2.7 1.8" /></>,
  costshare: <><circle cx="4.9" cy="5.2" r="2.4" /><circle cx="11.1" cy="10.8" r="2.4" /><path d="M13.4 3.2L2.6 12.8" /></>,

  // More
  meaning:   <><path d="M8 13.4S2.2 10 2.2 5.9A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 5.8 1.6c0 4.1-5.8 7.5-5.8 7.5z" /></>,
  ask:       <><circle cx="8" cy="8" r="6.1" /><path d="M6.2 6.3a1.85 1.85 0 0 1 3.6.6c0 1.2-1.8 1.5-1.8 2.7" /><path d="M8 11.7h.01" /></>,
  pass:      <><rect x="1.8" y="3.6" width="12.4" height="8.8" rx="1.4" /><path d="M1.8 6.8h12.4" /><path d="M4.4 9.9h2.4" /></>,
  settings:  <><circle cx="8" cy="8" r="2.2" /><path d="M8 1.9v1.6M8 12.5v1.6M14.1 8h-1.6M3.5 8H1.9M12.3 3.7l-1.1 1.1M4.8 11.2l-1.1 1.1M12.3 12.3l-1.1-1.1M4.8 4.8L3.7 3.7" /></>,
};

/** icon(kind) -> an <svg> for a section door. Never returns null: a collapsed,
 *  icons-only rail with a missing mark would be an unlabelled dead target. */
export function sectionIcon(kind) {
  const d = P[kind];
  return (
    <svg className="srail-i" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" {...S}>
      {d || <circle cx="8" cy="8" r="2.2" />}
    </svg>
  );
}

/** Exported for the test that proves every door has a real mark, not the dot. */
export const ICON_KINDS = Object.freeze(Object.keys(P));
