// What this browser remembers about how a page was left: view state only,
// never a plan. Plans change through lib/guestEdits and the shell's save.
// Owner, 11/26/2026: "remember the open group across reloads".
const KEY = (eventId) => 'ngw-hostv4-open-group:' + eventId;

/** The group left open for this plan: a group key, null (all closed), or undefined (not yet chosen). */
export function readOpenGroup(eventId) {
  try { const v = localStorage.getItem(KEY(eventId)); return v === 'none' ? null : v || undefined; } catch { return undefined; }
}

export function writeOpenGroup(eventId, group) {
  try { localStorage.setItem(KEY(eventId), group || 'none'); } catch { /* the page still folds */ }
}
