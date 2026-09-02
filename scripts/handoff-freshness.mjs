#!/usr/bin/env node
/**
 * Is HANDOFF.md's measured state actually measured, or just written down once?
 *
 * WHY THIS IS A SCRIPT AND NOT A PARAGRAPH. The spine's Step 7a says the
 * HANDOFF SHA is a claim and nothing checks it. That amendment was written on
 * 2026-09-02 after the SHA was found five commits stale — and it went stale
 * again the same afternoon, five commits on, with the rule already in the file.
 *
 * That is the spine's own finding about itself: a rule that has never been
 * pressured does not bind, and prose is advice. So this is not advice.
 *
 * THE CHICKEN AND EGG, and why the rule is "recent ancestor" not "equals HEAD".
 * Writing the SHA into HANDOFF changes HEAD, so a hand-written SHA can never
 * equal the commit it ships in — demanding equality would make the check
 * unsatisfiable and it would be deleted within a day. What IS checkable:
 *   · the recorded SHA must be a real commit, and an ANCESTOR of HEAD
 *     (a SHA from another branch, or a typo, is not a measurement)
 *   · HEAD must be within DRIFT commits of it (default 3)
 * That catches the failure this exists for — a state table describing a tree
 * that moved on — without inventing an impossible standard.
 *
 * Fix with:  npm run handoff:stamp
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'HANDOFF.md');
const DRIFT = Number(process.env.HANDOFF_DRIFT || 3);
const STAMP = process.argv.includes('--stamp');

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const head = git('rev-parse', '--short=8', 'HEAD');

const src = readFileSync(FILE, 'utf8');
// The State table's HEAD row is the claim. Matched by its label, not by
// position, so re-ordering the table does not silently disable the check.
const ROW = /^(\|\s*Branch \/ HEAD\s*\|[^|]*?`)([0-9a-f]{7,40})(`)([^|]*)\|/m;
const m = src.match(ROW);

if (!m) {
  console.error('✗ HANDOFF.md has no "Branch / HEAD" row carrying a SHA.');
  console.error('  The measured-state table is the stage-7 gate; without that row there is nothing to check.');
  process.exit(2);
}
const claimed = m[2];

// THE CLAIM BESIDE THE CLAIM. The first cut of this script checked the SHA and
// left the prose next to it alone -- and stamped a row reading "pushed, 0
// unpushed" while two commits sat unpushed. A check that verifies one claim
// while a false one shares its cell is the same shape this repo keeps finding:
// a check built from one list cannot see what is missing from that list.
const unpushed = (() => {
  try { return Number(git('rev-list', '--count', 'origin/main..HEAD')); }
  catch { return null; }               // no upstream -- unknowable, not zero
})();
// The stamp writes the SHA and NOTHING ELSE. A push-state claim inside a
// committed document is self-invalidating: stamping "0 unpushed" makes it
// false the moment you commit the stamp. The count belongs in the check's
// OUTPUT, where it is re-measured every run, not in prose that ages.
if (STAMP) {
  writeFileSync(FILE, src.replace(ROW, `$1${head}$3 |`));
  console.log(`✓ HANDOFF.md stamped: ${claimed} -> ${head}`);
  if (unpushed) console.log(`  note: ${unpushed} commit(s) unpushed right now (Step 6c) — not written into the file, by design.`);
  process.exit(0);
}

// Does the row's own prose agree with git?
const tail = m[4] || '';
if (unpushed !== null) {
  // Parse the CLAIMED count rather than pattern-matching for a word. The first
  // version excluded the bold marker with /UNPUSHED/i -- case-INSENSITIVE, so
  // it also matched the lowercase "unpushed" in the clean phrasing and the
  // check silently disarmed itself. A negative test that matches the string it
  // is meant to permit is a guard that permits everything.
  const bold = tail.match(/(\d+)\s*UNPUSHED/);          // case-sensitive marker
  const claimed = bold ? Number(bold[1])
    : /\b0\s+unpushed\b/i.test(tail) ? 0
      : null;                                            // no claim to check
  if (claimed !== null && claimed !== unpushed) {
    console.error(`✗ HANDOFF.md's HEAD row claims ${claimed} unpushed; git says ${unpushed}.`);
    console.error('  Step 6c: committing is not shipping. Fix: npm run handoff:stamp');
    process.exit(1);
  }
}

// Is it even a commit?
let full;
try { full = git('rev-parse', '--verify', `${claimed}^{commit}`); }
catch {
  console.error(`✗ HANDOFF.md claims HEAD is ${claimed}, which is not a commit in this repo.`);
  process.exit(1);
}

// An ancestor, not a cousin. A SHA from a branch that never merged describes
// a tree nobody has.
try { git('merge-base', '--is-ancestor', full, 'HEAD'); }
catch {
  console.error(`✗ HANDOFF.md claims ${claimed}, which is NOT an ancestor of HEAD (${head}).`);
  console.error('  That SHA describes a tree this branch does not have.');
  process.exit(1);
}

const behind = Number(git('rev-list', '--count', `${full}..HEAD`));
if (behind > DRIFT) {
  console.error(`✗ HANDOFF.md is ${behind} commits stale — claims ${claimed}, HEAD is ${head}.`);
  console.error('  Stage 7\'s gate is "reflects measured reality, not intentions".');
  console.error('  A SHA written by hand has a shelf life measured in commits.');
  console.error('  Fix:  npm run handoff:stamp    (then re-check the counts beside it)');
  process.exit(1);
}
console.log(`✓ HANDOFF.md is current — claims ${claimed}, HEAD ${head}, ${behind} commit(s) behind (limit ${DRIFT}).`);
