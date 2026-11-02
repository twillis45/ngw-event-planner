// ─── attendanceStatement — the host-facing answer to "who is coming?" ───────
//
// PEOPLE/ATTENDANCE REDESIGN, step 3. Pure, injected nothing, no render.
//
// WHY THIS IS A MODULE AND NOT JSX. `sectionDirectory.js` records the reason in
// its own header: *"Layout and nav policy scattered through a 16k-line JSX file
// cannot be pinned by a test, and the failure mode is silent."* The same is true
// of word choice, and word choice is where this surface can lie.
//
// ── THE DEFECT THIS EXISTS TO PREVENT ──────────────────────────────────────
//
// `attendanceBand().confirmed` HAS TWO MEANINGS and only one of them is "people
// replied" (measured 2026-10-20, `playbooks/index.js`):
//
//   basis 'rsvp'      confirmed = real yes-rows, +1 for a filled plusOne, plus
//                     only a confirmed row's kids           → PEOPLE SAID YES
//   basis 'count'     confirmed = n, the host's own number, WITH NOBODY HAVING
//                     REPLIED AT ALL (:708-711)             → THE NUMBER IS FIRM
//   basis 'estimate'  confirmed = 0 (:723)                  → nothing is confirmed
//
// So a surface that renders `band.confirmed` under the words "N have confirmed
// they're coming" is truthful on a roster and lying on a headcount — one field,
// two meanings, which is this repository's named recurring defect. This module
// branches on `basis` BEFORE choosing the word, once, where a test can see it.
//
// ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
//
// No new authority. It reads `attendanceBand` (which the shell calls "the
// canonical reader" and which "owns the question"), `attendanceBandLabel` for
// the number-as-string, `sizingGuests` for what the plan prepares for, and
// `guestCountFor`/`guestCountNotice` for provenance. It derives no headcount of
// its own and it never writes.
//
// No developer vocabulary leaves here: `basis`, `countSource`, `countFromHost`,
// `planning` and `applicable` are inputs, never output strings.
import { attendanceBand, attendanceBandLabel, sizingGuests } from './playbooks';
import { guestCountFor, guestCountNotice } from './guestCountFor';

/** Nothing to say — an event with no headcount signal at all. */
const SILENT = Object.freeze({ known: false });

/**
 * attendanceStatement(event) → the one thing People leads with.
 *
 *   known       is there anything truthful to say
 *   figure      the number as the host should read it ("12", "9–14")
 *   unit        'guest' | 'guests' — agrees with the figure, not with a count
 *   standing    'replied' | 'firm' | 'expected' — WHICH KIND OF TRUTH this is
 *   headline    the short host-language sentence for that standing
 *   because     the engine's own reason, verbatim (it already carries the
 *               substitution disclosure when the number is not hers)
 *   fromHost    may this be said outward / treated as hers
 *   notice      what to tell her when the app supplied the number, else null
 *   stillOut    replies not yet in — 0 unless she is tracking replies
 *   preparingFor  the number the plan actually buys for, when it DIFFERS from
 *                 the figure; null when they agree (usually they do)
 */
export function attendanceStatement(event) {
  const band = (() => {
    try { return attendanceBand(event); } catch (_e) { return null; }
  })();
  if (!band || !band.applicable) return SILENT;

  const figure = attendanceBandLabel(band);
  if (!figure) return SILENT;

  const prov = (() => {
    try { return guestCountFor(event); } catch (_e) { return { fromHost: true }; }
  })();

  // THE BRANCH THAT KEEPS THE WORD HONEST. 'rsvp' is the only basis where a
  // reply has happened, so it is the only basis whose language may mention one.
  const standing = band.basis === 'rsvp' ? 'replied'
    : band.basis === 'count' ? 'firm'
      : 'expected';

  // A flat roster band (everyone has answered) is not "still waiting".
  const stillOut = standing === 'replied'
    ? Math.max(0, (Number(band.maybe) || 0) + (Number(band.pending) || 0))
    : 0;

  const headline = (() => {
    if (standing === 'replied') {
      const yes = Number(band.confirmed) || 0;
      if (!stillOut) return yes === 1 ? '1 person said yes' : `${yes} people said yes`;
      return `${yes} said yes, ${stillOut} still to answer`;
    }
    if (standing === 'firm') return 'The number you settled on';
    return 'What this many usually turns into';
  })();

  // WHAT THE PLAN BUYS FOR, and only when it is not the number above.
  // `sizingGuests` is "the ONE headcount everything prepares for" and an
  // explicit estimate that EXCEEDS a roster still wins there — so the two can
  // legitimately disagree, and a host who is never shown that would not know
  // why the food is sized past her yeses.
  const preparingFor = (() => {
    try {
      const n = Number(sizingGuests(event)) || 0;
      if (!n) return null;
      return n !== Number(band.high) ? n : null;
    } catch (_e) { return null; }
  })();

  return {
    known: true,
    figure,
    unit: figure === '1' ? 'guest' : 'guests',
    standing,
    headline,
    because: band.because || null,
    fromHost: prov.fromHost !== false,
    notice: (() => {
      try { return guestCountNotice(event); } catch (_e) { return null; }
    })(),
    stillOut,
    preparingFor,
    // THE NUMBER SHE WOULD BE ADOPTING, and only when it is not already hers.
    // Deliberately narrow: the surface gets no general-purpose count from here,
    // because a general-purpose count is how a second derivation starts. This
    // exists so "make it mine" can be a real action rather than advice.
    confirmable: prov.fromHost === false && Number(prov.count) > 0 ? Number(prov.count) : null,
  };
}

/**
 * Words this surface may NEVER put on screen, per the product contract.
 * Exported so the gate test reads the same list the module is written against
 * rather than a second copy of it.
 */
export const FORBIDDEN_ON_SCREEN = Object.freeze([
  'basis', 'countSource', 'countFromHost', 'applicable', 'guestMode',
]);
