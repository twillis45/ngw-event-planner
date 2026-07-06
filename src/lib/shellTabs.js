// ─── shellTabs — THE navigation contract (CTA-REPAIR-1) ───────────────────────
// Every CTA route resolves through here. Two guarantees, both testable:
//   1. Legacy/alias tabs normalize to real render branches.
//   2. A route naming a tab a shell doesn't render lands on Command — a CTA
//      may be broad, but it may NEVER produce a blank content area.

export const normalizeEventTabRoute = (rawTab, itemId) => {
  if (rawTab === 'Overview')        return { tab: 'Command',  planningView: null,        openId: null };
  // Legacy/dead alias: 'Details' has no render branch — the tab's real id is
  // 'Event Details' (host label "Where & when"). Routes emitting 'Details'
  // (e.g. older CommandCenter foundation routes) resolve instead of dead-ending.
  if (rawTab === 'Details')         return { tab: 'Event Details', planningView: null, openId: null };
  // Legacy alias: the day-of tab's route key was renamed 'Run of Show' →
  // 'Event Day Schedule' to match the UI. Persisted sessions / deep links / old
  // initialNav may still emit 'Run of Show' — resolve it to the new key.
  if (rawTab === 'Run of Show')     return { tab: 'Event Day Schedule', planningView: null, openId: itemId || null };
  if (rawTab === 'Planning Tasks')  return { tab: 'Planning', planningView: 'list',      openId: itemId || null };
  if (rawTab === 'Timeline')        return { tab: 'Planning', planningView: 'timeline',  openId: itemId || null };
  if (rawTab === 'Checklist')       return { tab: 'Planning', planningView: 'checklist', openId: itemId || null };
  return { tab: rawTab, planningView: null, openId: itemId || null };
};

// The EXACT tab sets each shell renders. Adding a render branch? Add it here
// or its routes fall back to Command (safe, but broad).
export const HOST_TABS = new Set(['Command', 'Guests', 'Budget', 'Planning', 'Vendors', 'Event Details', 'Documents', 'Event Day Schedule']);
export const PLANNER_TABS = new Set(['Command', 'Guests', 'Budget', 'Planning', 'Vendors', 'Event Details', 'Documents', 'Event Day Schedule', 'Communication', 'Decisions', 'Now', 'Seating', 'Agenda', 'Arrivals', 'Calendar', 'Client Intake', 'Crew']);

// Host-specific remaps BEFORE normalization: the host shell has no Timeline
// (the run-of-show is its timeline), no Decisions tab (decisions live on
// Plan's "What to settle"), and no Communication surface at all.
export const hostResolveTab = (rawTab) => {
  if (rawTab === 'Timeline') return 'Event Day Schedule';
  if (rawTab === 'Decisions') return 'Planning';
  if (rawTab === 'Communication') return 'Command';
  return rawTab;
};

// Full per-shell resolution: remap (host) → normalize → clamp to the shell's
// real tab set. Returns { tab, planningView, openId } like the normalizer.
export function resolveShellTab(shell, rawTab, itemId) {
  const pre = shell === 'host' ? hostResolveTab(rawTab) : rawTab;
  const norm = normalizeEventTabRoute(pre, itemId);
  const known = shell === 'host' ? HOST_TABS : PLANNER_TABS;
  if (!known.has(norm.tab)) return { ...norm, tab: 'Command' };
  return norm;
}
