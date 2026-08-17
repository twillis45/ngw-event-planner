// ─── ONE OVERDUE POLICY, AND A GATE THAT SPANS BOTH TREES ───────────────────
//
// W8 refuted its own POLICY-FORK gate and said exactly why:
//
//   "a 7th overdue reader survives in hostv2 (`taskTimeStatus` via dates.js) …
//    It survives because the scanner's SRC_ROOT is `demo/src` and never walks
//    hostv2/backend, and its regex only catches `getToday()` idioms."
//
// The reader was then fixed by hand. **The gate never was.** Re-derived
// 2026-08-17: `policyForkEnforcement` exists nowhere in the tree — only in an
// archive doc and in a `dates.js` comment that references it as though it runs.
// Seven readers were reconciled by hand and nothing stops an eighth.
//
// W8's own lesson was that "shipping a gate is not closing a class — the gate has
// to span every tree and every idiom, or the class relocates to where the gate
// can't see". That is this file: it walks `src/` AND `hostv2/src/`.
//
// WHAT IT ENFORCES, and deliberately not more. `taskTimeStatus` is a DISPLAY
// bucket — `dates.js:172` says so itself: "this 'overdue' is a LABEL, not an
// authoritative state. It folds in no snooze and no reachability … no consumer
// may read THIS bucket to drive a red/past-due state". The one policy is
// `taskLead.taskIsOverdue`, which folds snooze suppression AND the reachability
// guard (an event created too late to ever reach a step's lead was never "late").
//
// So the rule is narrow and checkable: a file may CALL taskTimeStatus for copy,
// but a file that derives an overdue STATE from its result is the fork returning.
// Anything broader would flag the decision board's legitimate `status: 'overdue'`
// and become noise — the failure mode that makes a gate get deleted.
import fs from 'fs';
import path from 'path';

const ROOTS = ['src', 'hostv2/src'];          // BOTH trees — the W8 blind spot
const REPO = path.resolve(__dirname, '..', '..');

const walk = (dir, out = []) => {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|__tests__|dist|build|coverage|e2e/.test(e.name)) continue;
      walk(p, out);
    } else if (/\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name)) {
      out.push(p);
    }
  }
  return out;
};

const sourceFiles = () => ROOTS.flatMap((r) => walk(path.join(REPO, r)));

// An overdue STATE derived from the display bucket. Matches the assignment forms
// a fork actually takes, not every mention of the word.
const FORK = [
  /(?:const|let|var)\s+\w*[Oo]verdue\w*\s*=\s*[^;\n]*taskTimeStatus/,   // overdue = …taskTimeStatus…
  /taskTimeStatus\([^)]*\)\s*===\s*['"]overdue['"]/,                     // taskTimeStatus(...) === 'overdue'
  /['"]overdue['"]\s*===\s*taskTimeStatus\(/,                            // reversed
];

describe('the overdue policy does not fork, in either tree', () => {
  test('PREMISE — the scanner really reaches both trees and real files', () => {
    // W8's gate passed while walking one tree. If this ever stops seeing hostv2,
    // it stops being the gate it claims to be and silently reports clean.
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.includes(`hostv2${path.sep}src`))).toBe(true);
    expect(files.some((f) => f.endsWith('HostShellV2.jsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('CommandCenter.jsx'))).toBe(true);
  });

  test('canary — the scanner bites a planted fork and spares the sanctioned form', () => {
    // Without this the file could pass because the patterns match nothing at all,
    // which is how a gate quietly stops gating.
    const bites = (s) => FORK.some((re) => re.test(s));
    expect(bites("const overdue = taskTimeStatus(-lead, dte) === 'overdue';")).toBe(true);
    expect(bites("if (taskTimeStatus(a, b) === 'overdue') return true;")).toBe(true);
    // The sanctioned shapes — a display bucket, and the real policy — are spared.
    expect(bites('const timeBucket = taskTimeStatus(-lead, dte);')).toBe(false);
    expect(bites('const overdue = taskIsOverdue(t, event);')).toBe(false);
  });

  test('no file derives an overdue STATE from the display bucket', () => {
    const offenders = [];
    for (const file of sourceFiles()) {
      let src = '';
      try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
      if (!src.includes('taskTimeStatus')) continue;
      src.split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;                // comments are prose, not policy
        if (FORK.some((re) => re.test(line))) {
          offenders.push(`${path.relative(REPO, file)}:${i + 1} — ${line.trim().slice(0, 90)}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  test('and hostv2 still takes its overdue STATE from the one policy', () => {
    // The positive half. The negative scan above passes trivially if hostv2 ever
    // stops computing overdue at all — this asserts the sanctioned reader is
    // still the one in use on the surface W8 found the fork on.
    const shell = fs.readFileSync(path.join(REPO, 'hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(shell).toMatch(/overdue\s*=\s*\(\(\)\s*=>\s*\{\s*try\s*\{\s*return taskIsOverdue\(/);
  });
});
