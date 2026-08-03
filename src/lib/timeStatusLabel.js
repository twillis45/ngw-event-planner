// ─── TIME STATUS LABEL — one owner for four strings ──────────────────────────
//
// WHY THIS EXISTS (2026-07-31). `past its window` / `due today` / `due tomorrow`
// / `due in N days` were generated in two places, character-for-character
// identical, from the same input (a whole-day offset):
//
//   src/lib/actionReason.js       the queue row's time reason
//   hostv2/src/HostShellV2.jsx    the card-top due chip
//
// Two implementations of one vocabulary is how a product ends up saying the same
// thing in two slightly different ways: either copy can be edited without the
// other, and nothing fails when they drift. Consolidating does NOT change what
// renders today — it makes the next edit land once.
//
// SCOPE, deliberately narrow. This owns the four labels keyed on a DAY COUNT and
// nothing else. It is not the owner of:
//   * `N days past its window`  (taskLead.js, playbooks/index.js) — carries a
//     count, a different string.
//   * `past due` / `due soon` / `by <date>` (HostShellV2 unlock rows) — keyed on
//     a bucket enum, not a number, and a different set.
//   * `past its window` vs `overdue` (HostShellV2 lateChip) — keyed on a status
//     plus whose pick is running; a two-way badge, not a day count.
// Folding those in would mean changing strings or inputs, which this slice does
// not do.
//
// HORIZON IS THE CALLER'S. This labels any finite offset. `actionReason` applies
// its own <=7 day ceiling before calling, because "is this time PRESSURE" is a
// ladder policy; the chip has no ceiling and labels whatever it is handed.
//
// PURE: no React, no I/O, no imports.

// The overdue phrase as a value. The vendor/status late-chip needs THIS STRING
// without having a day count to derive it from — it keys on `r.status ===
// 'overdue'`, not on a number — so exporting the literal is what gives that
// surface the same single owner. Without it the chip keeps its own copy, which
// is the exact duplication this module exists to end.
export const PAST_WINDOW = 'past its window';

/**
 * timeStatusLabel(daysOut) -> string | null
 *
 * daysOut is a whole-day offset: negative = past, 0 = today, 1 = tomorrow.
 * Returns null for anything non-finite, so a missing date can never render as
 * "due in undefined days".
 */
export function timeStatusLabel(daysOut) {
  if (!Number.isFinite(daysOut)) return null;
  if (daysOut < 0) return PAST_WINDOW;
  if (daysOut === 0) return 'due today';
  if (daysOut === 1) return 'due tomorrow';
  return `due in ${daysOut} days`;
}

export default timeStatusLabel;
