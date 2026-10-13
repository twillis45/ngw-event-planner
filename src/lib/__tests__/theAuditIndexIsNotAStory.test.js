// ─── "EVERY AUDIT, AND WHERE IT ACTUALLY LIVES" ──────────────────────────────
//
// That is the first line of `docs/audits/INDEX.md`. On 2026-10-13 it named 23
// of 87 audits.
//
// The file is not incidental documentation — it exists because of a measured
// failure, in its own words:
//
//   "Most of the recent audits were authored as published Claude artifacts and
//    never landed in the repo. A repo search could not find them, so they were
//    invisible to any file-based review — including one done in this repo on
//    2026-07-14, which listed 'the last 20 audits' and structurally could not
//    see the most recent and most important ones."
//
// The artifacts were then ported. What nobody noticed is that the index stopped
// being extended: audits authored in-repo from 2026-08-14 onward are in the
// tree, tracked by git, and absent from the index — so the 2026-07-14 failure
// has been quietly reproducing by a different road. An index that covers a
// quarter of its subject sends the next reader exactly where the original
// failure sent them.
//
// WHY A RATCHET AND NOT A FULL FIX. The 64 missing rows are summaries of other
// people's findings across five months, and writing them from file titles would
// put invented headlines into the one document whose job is to be trustworthy.
// Their authors' own one-line verdicts belong there. So this is the instrument,
// not the backfill: it holds the number down, names every file, and fails the
// moment the 65th arrives.
//
// SAME SHAPE AS `textGateRatchet`, deliberately — a measured ceiling that can
// only be lowered, with the reason written above the constant.
import fs from 'fs';
import path from 'path';

const DIR = path.join(__dirname, '..', '..', '..', 'docs', 'audits');
const INDEX = path.join(DIR, 'INDEX.md');

// Measured 2026-10-13: 87 audits, 24 named in the index, 63 not.
//
// It was 64 until the Stripe checkout-readiness audit was indexed in the same
// commit as this file — and the tightness test below caught that the ceiling
// had been left at 64, on its very first run, which is the clearest evidence
// that the second test earns its place.
//
// LOWER THIS WHENEVER YOU INDEX ONE. The test prints every unindexed file, so
// the list is always in front of whoever is holding the file open. Raising it
// is the one move that is never correct: a new audit gets an index row in the
// same commit, which costs one line.
const MAX_UNINDEXED_AUDITS = 63;

const auditFiles = () => fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => f !== 'INDEX.md')
  .sort();

// A file counts as indexed when the index LINKS to it. Matching the bare
// filename would also match a mention in prose, and "is talked about" is not
// the claim this file makes — `(file.md)` is markdown link syntax.
const indexed = (src, f) => src.includes(`(${f})`);

describe('the audit index covers the audits', () => {
  test('(premise) the index and the audits are both really there', () => {
    // A guard whose subject has moved should fail loudly, not pass over an
    // empty directory — the failure mode that makes an instrument worthless.
    expect(fs.existsSync(INDEX)).toBe(true);
    expect(auditFiles().length).toBeGreaterThan(50);
    expect(fs.readFileSync(INDEX, 'utf8')).toContain('Every audit, and where it actually lives');
  });

  test('THE RATCHET: the number of unindexed audits never grows', () => {
    const src = fs.readFileSync(INDEX, 'utf8');
    const missing = auditFiles().filter((f) => !indexed(src, f));
    if (missing.length > MAX_UNINDEXED_AUDITS) {
      // Named, not counted. A number tells you a rule broke; the list tells
      // you which line to write.
      throw new Error(
        `${missing.length} audits are not in docs/audits/INDEX.md, ceiling ${MAX_UNINDEXED_AUDITS}.\n`
        + 'Add a row for the new one — one line, in the "Authored in-repo" table,\n'
        + 'newest first, with the author\'s own verdict as the headline.\n\n'
        + missing.map((f) => `    ${f}`).join('\n'),
      );
    }
    expect(missing.length).toBeLessThanOrEqual(MAX_UNINDEXED_AUDITS);
  });

  test('…and the ceiling is not left above the real number', () => {
    // The other way a ratchet rots: someone indexes twenty files, nobody lowers
    // the constant, and the guard stops catching the next twenty.
    const src = fs.readFileSync(INDEX, 'utf8');
    const missing = auditFiles().filter((f) => !indexed(src, f));
    expect({ unindexed: missing.length, ceiling: MAX_UNINDEXED_AUDITS })
      .toEqual({ unindexed: MAX_UNINDEXED_AUDITS, ceiling: MAX_UNINDEXED_AUDITS });
  });

  test('every audit the index LINKS to actually exists', () => {
    // The opposite rot, and the worse one to read: a link that 404s is a reader
    // concluding the finding was deleted. Zero on 2026-10-13 — this keeps it
    // there rather than discovering it later.
    const src = fs.readFileSync(INDEX, 'utf8');
    const named = [...new Set(
      (src.match(/\(([0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Z0-9_]+\.md)\)/g) || [])
        .map((m) => m.slice(1, -1)),
    )].sort();
    expect(named.length).toBeGreaterThan(15);                 // premise
    expect(named.filter((f) => !fs.existsSync(path.join(DIR, f)))).toEqual([]);
  });

  test('the audit this session re-measured is indexed, with its re-measurement', () => {
    // Specific, because it is the one that drove three slices of work today and
    // its Recommendation is now spent. An index row pointing at a stale verdict
    // is the failure this whole file is about, one level up.
    const src = fs.readFileSync(INDEX, 'utf8');
    const f = '2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md';
    expect(indexed(src, f)).toBe(true);
    expect(fs.readFileSync(path.join(DIR, f), 'utf8')).toContain('RE-MEASURED 2026-10-13');
  });
});
