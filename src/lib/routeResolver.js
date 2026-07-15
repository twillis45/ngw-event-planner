// ─── routeResolver — THE ROUTE→LANDING AUTHORITY ─────────────────────────────
//
// ENFORCEMENT-GAP-1 (2026-07-15). The surface registry (lib/surfaceRegistry.js)
// killed hand-wired attention with a raise() contract: a surface declares what
// it can raise, and every raise carries a `route`. But the ENFORCEMENT of that
// route — turning it into an actual sheet/stage landing — lived as a long
// if-ladder INSIDE the HostShellV2 component (routeSheet, ~2342). Nothing could
// execute that ladder outside the running React tree, so the CTA source-of-truth
// test validated routes against a HAND-SYNCED HOST_TABS/STATIC_ANCHORS mirror
// instead of against the code that actually routes. A mirror can drift from the
// code it mirrors — the exact bug-factory pattern the registry was built to kill,
// re-appearing one layer up. A registry route with a valid tab but a focusField
// routeSheet doesn't branch on (the wave-6 helpers 'space' bug) passed every test
// yet mis-landed live on a catch-all sheet.
//
// The fix: the decision half of routeSheet is now a PURE function here. routeSheet
// is a thin executor — it calls resolveRoute() and performs the side effects
// (setSheet / setStage / DOM focus) the descriptor names. The test imports the
// SAME resolveRoute and drives it with every route raiseAll() can emit. The gate
// is now executed, not mirrored: if a route stops landing row-level, a test that
// runs the real resolver fails — it cannot silently drift.
//
// ── The descriptor ───────────────────────────────────────────────────────────
// resolveRoute(route) → { kind, focus, vendorSection?, anchor? } | null
//
//   kind         a sheet kind ('vendors','seating','budget','guests','food',
//                'rain','crabs','ground','air','lodging','space','tasks',
//                'risks','decisions') OR a stage landing ('stage:plan',
//                'stage:day') — the surfaces whose target is a full-screen stage,
//                not a sheet (the plan editor, the day-of run of show).
//   focus        the row/section the sheet opens on (a vendorId, guestId,
//                riskId, decisionId, taskId, a food row id, or a named section
//                like 'deadline' / 'riders' / 'diet'), or null when the sheet
//                itself IS the target (a single-purpose sheet: rain, crabs,
//                space) or the surface has no row concept (budget, guests).
//   vendorSection 'payment' | 'documents' | null — the sub-section of an open
//                vendor card a money/insurance route lands on.
//   anchor       for stage landings, the aria-label of the input to scroll to
//                and focus ('Event date' / 'Venue').
//
//   null         no branch matched — an unroutable route. routeSheet returns
//                false and the caller falls back honestly (a truthful toast,
//                never a pretend landing). A raiseAll route resolving to null is
//                the dead-CTA failure this module exists to make impossible to
//                ship silently.
//
// EVERY branch below is a verbatim port of a routeSheet branch, in the SAME
// ORDER (order is load-bearing — /^air/ must beat the tab:'Travel' lodging catch,
// 'event-date' must beat the tab:'Event Details' venue catch, 'space' must beat
// tab:'Planning'). Behavior for every correct route is unchanged.

export function resolveRoute(route) {
  // Accept focusField-only routes (rain-plan, crab-plan, ground/air/lodging,
  // caprow, fp-diet, space all resolve on focusField alone). No tab AND no
  // focusField is not a route.
  if (!route || (!route.tab && !route.focusField)) return null;
  const ff = String(route.focusField || '');
  const gid = route.guestId != null ? route.guestId : null;

  // Vendors — the card opens on the vendor row; a money/insurance route also
  // names the sub-section it lands on (payment / documents).
  if (route.tab === 'Vendors') {
    return { kind: 'vendors', focus: route.vendorId || null, vendorSection: route.vendorSection || null };
  }
  // Seating — the exact guest row when the route names one.
  if (route.tab === 'Seating' || /^seat/.test(ff)) {
    return { kind: 'seating', focus: gid };
  }
  // Budget / Guests — whole-surface sheets, no row concept.
  if (route.tab === 'Budget' || ff === 'budget') return { kind: 'budget', focus: null };
  if (route.tab === 'Guests') return { kind: 'guests', focus: null };
  // Food — a foodFocus id or a foodrow- focusField lands on the exact line.
  if (route.tab === 'Planning' && (route.foodFocus || /food/i.test(ff))) {
    const rowId = /^foodrow-(.+)$/.exec(ff);
    return { kind: 'food', focus: route.foodFocus || (rowId ? rowId[1] : null) };
  }
  if (ff === 'rain-plan') return { kind: 'rain', focus: null };
  if (ff === 'crab-plan') return { kind: 'crabs', focus: null };
  // Ground rides — a guest's ride-board row, or the riders who still need a way.
  if (/^ground/.test(ff)) {
    return { kind: 'ground', focus: gid != null ? gid : (ff === 'ground-riders' ? 'riders' : null) };
  }
  // Air — a guest's arrivals-board row, or the airports card itself.
  if (/^air/.test(ff)) {
    return { kind: 'air', focus: gid };
  }
  // Lodging — a guest's roster row, the deadline card, or the stay card itself.
  if (route.tab === 'Travel' || /^lodging/.test(ff)) {
    return { kind: 'lodging', focus: gid != null ? gid : (ff === 'lodging-deadline' ? 'deadline' : null) };
  }
  if (/^fp-diet/.test(ff)) return { kind: 'food', focus: 'diet' };
  // Capacity / helper-supply rows both render on the space sheet. /^space MUST
  // branch before tab:'Planning' below (the wave-6 helpers 'space' bug: it fell
  // through to the Planning checklist catch-all — the wrong sheet entirely).
  if (/^caprow-/.test(ff)) return { kind: 'space', focus: null };
  if (/^space/.test(ff)) return { kind: 'space', focus: null };
  // Set-the-date foundation MUST branch before the tab:'Event Details' venue
  // catch-all below, else the #1 onboarding foundation scrolls to Venue instead
  // of the date (host-reported wrong-field routing).
  if (ff === 'event-date' || ff === 'event-start') {
    // event-start (day + hour) shares the date editor with event-date — the
    // date editor holds the start time too (parity with wiredHostv2's wiredKind).
    return { kind: 'stage:plan', focus: null, anchor: 'Event date' };
  }
  if (ff === 'event-venue' || route.tab === 'Event Details') {
    return { kind: 'stage:plan', focus: null, anchor: 'Venue' };
  }
  if (route.tab === 'Planning Tasks' || route.tab === 'Timeline' || route.tab === 'Planning') {
    return { kind: 'tasks', focus: route.taskId || null };
  }
  if (route.tab === 'Risks') return { kind: 'risks', focus: route.riskId || null };
  if (route.tab === 'Decisions') return { kind: 'decisions', focus: route.decisionId || route.taskId || null };
  // The day-of run of show lives on the Day stage, not a sheet.
  if (route.tab === 'Event Day Schedule' || /^ros-/.test(ff)) {
    return { kind: 'stage:day', focus: null };
  }
  // NB: 'Communication' is deliberately unroutable — V2 has no messages surface,
  // so there is nowhere honest to land. Falls to null → a truthful toast.
  return null;
}

// The tabs resolveRoute branches on. Consumed by ctaSourceOfTruth so its tab
// allow-list for the routeSheet-owned surfaces is DERIVED from the resolver, not
// hand-mirrored. routeExecution.test.js asserts every tab here actually resolves
// (binding this constant to the function — neither can drift from the other).
export const ROUTESHEET_TABS = Object.freeze([
  'Vendors', 'Seating', 'Budget', 'Guests', 'Planning', 'Travel',
  'Event Details', 'Planning Tasks', 'Timeline', 'Risks', 'Decisions',
  'Event Day Schedule',
]);
