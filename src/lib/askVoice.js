// ─── THE FINAL ASK BOUNDARY — one place where an ask becomes host-facing ──────
//
// Every ask the host reads passes through here on its way to the screen. It
// exists because the punctuation defect was not a typo: three surfaces each
// appended their own '?' to a string whose terminal punctuation they had not
// looked at, and one of them appended it to a label whose '?' had been hidden
// behind a trailing parenthetical. "Alcohol? (adult parties)" reached the host
// as "Alcohol??".
//
// A boundary, not a patch: fixing the six authored labels would have left the
// next authored label to rediscover the same bug. Nothing downstream of this
// file may concatenate punctuation onto an ask.
//
// PURE: no React, no event mutation, no I/O.

// A stem that cannot carry a question — the render must print nothing rather
// than a bare '?' floating where a sentence belongs.
const isEmptyStem = (s) => !s || !/[A-Za-z0-9]/.test(s);

/**
 * Normalize a finished ask for display.
 *
 * Collapses runs of terminal punctuation to a single mark, keeps an imperative's
 * period, and returns null for a stem with no words in it — callers render
 * nothing instead of punctuation with no sentence.
 */
export function normalizeAsk(raw) {
  let s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if (isEmptyStem(s)) return null;
  // Collapse any mixed run of terminal marks ("??", "?.", ". ?") to the FIRST
  // one authored — the author's choice of mood survives, the duplication does not.
  const m = s.match(/[.?!]+(?:\s*[.?!]+)*\s*$/);
  if (m) {
    const first = m[0].replace(/[^.?!]/g, '')[0];
    s = s.slice(0, m.index).trim() + first;
  }
  if (isEmptyStem(s)) return null;
  return s;
}

/**
 * Render an authored decision label as the question the host is being asked.
 *
 * The label may already be a question ("Alcohol?"), may have carried a trailing
 * parenthetical that hid its mark, or may be a declarative stem ("Lock the
 * menu") that becomes a question only by adding one. All three land on exactly
 * one terminal '?'.
 */
export function questionFrom(label) {
  let s = String(label == null ? '' : label)
    // Parenthetical guide voice is never ask material — strip it BEFORE looking
    // at terminal punctuation, or a hidden '?' survives to be doubled.
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/["“”'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Drop every terminal mark, then add exactly one. Idempotent by construction:
  // questionFrom(questionFrom(x)) === questionFrom(x).
  s = s.replace(/[.?!\s]+$/, '').trim();
  if (isEmptyStem(s)) return null;
  return s + '?';
}

/**
 * The authored question, or null when the label was not authored as one.
 *
 * The distinction matters. "Alcohol? (adult parties)" IS a host-facing question
 * its author wrote; "A gentle headcount estimate" is a decision NAME. Appending
 * '?' to the second produces "A gentle headcount estimate?" — grammatical noise
 * that reads like the app is unsure what it just said. Only a label authored as
 * a question is promoted to an ask; everything else returns null and falls
 * through to the builder ladder, which knows how to phrase an instruction.
 *
 * The '?' is looked for AFTER peeling the trailing parenthetical, because that
 * is exactly where the authored mark hides.
 */
export function authoredQuestion(label) {
  const peeled = String(label == null ? '' : label).replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!/\?\s*$/.test(peeled)) return null;
  return questionFrom(peeled);
}

/**
 * Does `ask` merely restate `title`? The circular-ask predicate.
 *
 * Content words only: "Decide the menu." against a decision titled "Decide the
 * menu" adds nothing a host can act on, and that is what shipped. Compared as
 * sets so word order and inflection noise do not hide a restatement, and so a
 * genuinely narrower ask ("Who is providing the food?" on the same decision)
 * still reads as new information.
 */
const STOP = new Set(['a', 'an', 'the', 'your', 'you', 'their', 'our', 'is', 'are', 'be', 'to', 'for', 'of', 'on', 'in', 'and', 'or', 'it', 'this', 'that']);
const content = (s) => new Set(
  String(s || '').toLowerCase().replace(/[^a-z\s’']/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
);
export function isCircularAsk(ask, title) {
  const a = content(ask);
  const t = content(title);
  if (a.size === 0 || t.size === 0) return false;
  // Circular when the ask introduces NO content word the title did not already
  // carry — it is the title again, in the imperative.
  for (const w of a) if (!t.has(w)) return false;
  return true;
}
