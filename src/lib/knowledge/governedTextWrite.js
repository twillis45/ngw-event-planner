// ─── GOVERNED TEXT WRITE INTEGRITY (Phase 5F.11) ─────────────────────────────
//
// THE DEFECT. Composing a claim note through the browser, `Input.dispatchKeyEvent`
// timed out and the extension disconnected. The typed text PARTIALLY LANDED and no
// error surfaced. The retry appended to the surviving fragment, producing a note with
// a truncated opening, a spliced middle and a duplicated caveat:
//
//   "...sits at that figure; value NOT changed.mmercially interested in a higher
//    multiplier; other disposables retailers publish materially the same figures...
//    CAVEAT: vendor-published and commercially interested in a higher multiplier..."
//
// It was caught only by looking at the screen before submitting. Every automated check
// would have passed: the record had evidence, a resolvable source, a researched tier and
// a non-empty note. `canReachCited` would be true. The suite would be green.
//
// THE CLAIM NOTE IS HOST-FACING GOVERNED TEXT. It is the sentence a host reads under
// "Sourced -". A silent partial write to it is the exact defect class this program
// exists to prevent: correct at every machine checkpoint, wrong in the thing a person
// reads.
//
// THE CONTRACT this enforces:
//
//   intended text == input value before submit == stored record == host-rendered text
//
// This module is the comparator. It does not write anything - it decides whether a
// write succeeded, and NAMES THE FAILURE MODE, because "not equal" is not actionable
// and "the retry appended to a fragment" is.
//
// PURE: no I/O, no DOM, no UI.

/** Failure modes, in the order they are tested. */
export const WRITE_FAILURES = Object.freeze([
  'empty',        // nothing landed
  'truncated',    // a prefix of the intended text
  'appended',     // intended text plus trailing junk — the retry-on-fragment shape
  'duplicated',   // a sentence appears more than once
  'spliced',      // contains the intended text's tail but not its head
  'mismatched',   // differs in some other way
]);

/** Sentences long enough that a repeat is a defect rather than a coincidence. */
const MIN_SENTENCE = 25;

const sentences = (s) => String(s || '')
  .split(/(?<=[.!?])\s+/)
  .map((x) => x.trim())
  .filter((x) => x.length >= MIN_SENTENCE);

/**
 * verifyGovernedText(expected, actual) -> { ok, kind, detail }
 *
 * `ok` only when the two are byte-for-byte identical. Anything else is named.
 */
export function verifyGovernedText(expected, actual) {
  const want = String(expected == null ? '' : expected);
  const got = String(actual == null ? '' : actual);

  if (got === want) return { ok: true, kind: 'exact', detail: 'byte-for-byte identical' };

  if (!got.length) {
    return { ok: false, kind: 'empty', detail: 'Nothing landed in the field. The write did not take effect.' };
  }

  if (want.startsWith(got)) {
    return {
      ok: false,
      kind: 'truncated',
      detail: `Only ${got.length} of ${want.length} characters landed. The write was cut short — `
        + 'do NOT retry by typing again, which appends to the fragment. Clear the field first.',
    };
  }

  if (got.startsWith(want)) {
    return {
      ok: false,
      kind: 'appended',
      detail: `The intended text is present but followed by ${got.length - want.length} extra `
        + `characters: ${JSON.stringify(got.slice(want.length, want.length + 80))}. This is the `
        + 'retry-on-a-fragment shape — the field was not cleared before rewriting.',
    };
  }

  const dupes = [];
  const seen = new Set();
  for (const s of sentences(got)) {
    if (seen.has(s)) dupes.push(s);
    seen.add(s);
  }
  if (dupes.length) {
    return {
      ok: false,
      kind: 'duplicated',
      detail: `A sentence appears more than once: ${JSON.stringify(dupes[0].slice(0, 80))}. `
        + 'A governed note that repeats itself was assembled from two writes.',
    };
  }

  // The head is missing but a meaningful tail survives — the fragment-splice shape.
  const tail = want.slice(-Math.min(60, want.length));
  if (!got.startsWith(want.slice(0, 20)) && got.includes(tail)) {
    return {
      ok: false,
      kind: 'spliced',
      detail: 'The opening of the intended text is missing while its ending is present. '
        + 'The field held a fragment that a later write was joined onto.',
    };
  }

  return {
    ok: false,
    kind: 'mismatched',
    detail: `Expected ${want.length} characters, got ${got.length}. First difference at index `
      + `${firstDiff(want, got)}.`,
  };
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return n;
}

/**
 * assertGovernedText(expected, actual, where) -> void | throws
 *
 * The gate a caller uses before submitting. Throws with the named failure so the
 * message tells an operator what happened, not merely that something did.
 */
export function assertGovernedText(expected, actual, where = 'governed text') {
  const r = verifyGovernedText(expected, actual);
  if (!r.ok) throw new Error(`${where}: ${r.kind} — ${r.detail}`);
}
