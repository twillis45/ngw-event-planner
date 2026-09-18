// ─── NOTHING REACHES A GUEST WITH OUR BLANKS STILL IN IT ─────────────────────
//
// THE LIVE DEFECT THIS WAS BUILT FOR (2026-09-18). Several drafts deliberately
// BRACKET what the app does not know rather than invent it — that is the
// Unknown Rule working, and it is the right call. `draftParkingInstructions`
// produces:
//
//   Guests can park [street / driveway / nearby lot — pick what fits].
//   Come to [front door / side gate / backyard — pick one].
//
// The frozen CRA shell writes that straight into `event.parkingNotes`
// (App.js ~41406, a one-tap "Draft parking note" with no review step), and
// `InviteV2.jsx:1320` — the invite GUESTS ACTUALLY READ — prints it verbatim:
//
//   Parking: Guests can park [street / driveway / nearby lot — pick what fits].
//
// Two more readers carry the same text outward: draftGuestUpdate (doItForMe
// ~899) and guestRainMessage (weather ~476). And placeIntelligence ~94 marks
// Parking HANDLED on the strength of it, so the host is told the gap is closed.
//
// WHY A BRACKET RULE RATHER THAN A PROVENANCE FIELD. The spec's `guestFacing`
// flag would gate DECISIONS, and doItForMe reads no decisions at all — that
// flag would today be a gate with nothing to gate. The actual leak is a
// TEMPLATE in a text field, and the property that makes it unsafe is visible in
// the text itself: an unfilled blank is our handwriting, not the host's. That
// is checkable everywhere, needs no field retrofitted onto anything, and cannot
// be forgotten by a new writer.
//
// It is also strictly honest: this never invents content and never guesses what
// the blank should say. It withholds. A guest getting no parking line is
// strictly better than a guest getting our placeholder, and the host is the one
// who can fix it.
//
// PURE: no I/O, no clock, no storage.

// A blank the app authored, in the house style: square brackets around a
// choice or an instruction. Deliberately narrow — it must not fire on ordinary
// prose a host might type.
//
//   [street / driveway / nearby lot — pick what fits]   ← ours
//   [main entrance / event entrance]                    ← ours
//   [confirm with the venue]                            ← ours
//
// A bare "[1]" or "[note]" is too short to be one of ours and is left alone;
// two characters is the floor, and the cap keeps a runaway match from
// swallowing a paragraph.
const BLANK = /\[[^\]\n]{2,80}\]/g;

/** Every unfilled blank in this text, in order. Empty when it is clean. */
export function unfilledBlanks(text) {
  const s = String(text || '');
  if (!s) return [];
  BLANK.lastIndex = 0;                       // /g carries lastIndex between calls
  return s.match(BLANK) || [];
}

/** Does this text still carry one of our blanks? */
export const hasUnfilledBlanks = (text) => unfilledBlanks(text).length > 0;

/**
 * The text, but only if it is safe to put in front of a guest.
 *
 * Returns '' — never a partial string, never a cleaned-up one. Stripping the
 * brackets would leave "Guests can park ." and silently change the meaning;
 * withholding says nothing, which is the honest failure.
 */
export function guestSafeText(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  return hasUnfilledBlanks(s) ? '' : s;
}

/**
 * What to tell the HOST about a field that is not guest-safe yet. Null when
 * there is nothing to say, so a caller can render it or not without a branch.
 *
 * This is the other half of withholding: silently dropping the line would leave
 * the host believing their guests were told. The app owes them the reason.
 */
export function blanksNotice(text, label) {
  const blanks = unfilledBlanks(text);
  if (!blanks.length) return null;
  const what = label ? `Your ${label}` : 'This note';
  return blanks.length === 1
    ? `${what} still has a blank we left for you — ${blanks[0]} — so guests are not being shown it yet.`
    : `${what} still has ${blanks.length} blanks we left for you, starting with ${blanks[0]} — so guests are not being shown it yet.`;
}
