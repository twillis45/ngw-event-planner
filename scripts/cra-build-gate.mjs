#!/usr/bin/env node
/**
 * CRA production build gate — Release Integrity Sprint, Slice C2 (2026-07-30).
 *
 * WHY THIS EXISTS
 * ---------------
 * `CI=true npm run build` turns every ESLint warning into an error, and the
 * tree currently emits 250 of them, so the production build has never been a
 * required check. That means a real build break could reach `gh-pages` without
 * any gate noticing.
 *
 * We cannot simply fix all 250: 135 of them (54%) live in `src/App.js`, which
 * CLAUDE.md freezes as donor-only ("Only security/data-loss fixes and shared
 * lib/ engine work belong in App.js"). Deleting 135 unused declarations from a
 * 45k-line frozen file is exactly the sprawling rewrite of frozen donor code
 * that the sprint's Policy B exists for.
 *
 * So this gate implements POLICY B — an explicit, reviewed warning baseline:
 *
 *   • The production build really runs. A genuine build error (syntax, missing
 *     module, failed transform) fails this gate regardless of any baseline —
 *     the baseline can never hide a broken build.
 *   • Every warning is fingerprinted and compared against a committed baseline.
 *   • ANY new warning, ANY increase in an existing warning's count, and ANY
 *     warning in a file not already in the baseline fails the gate.
 *   • Warnings that DISAPPEAR do NOT fail. Fixing a warning is the outcome we
 *     want; a gate that punishes it would pressure people to preserve dead
 *     code or regenerate the baseline reflexively. Resolved entries are
 *     reported so the baseline can be tidied deliberately, never as a failure.
 *
 * Warnings are collected with warnings-as-errors disabled, because a build that
 * aborts on the first warning cannot report the full set. The check applied
 * afterwards is STRICTER than `CI=true` would be for anything new: CI=true only
 * asks "are there warnings?", while this asks "are they exactly the reviewed
 * ones?". This is not `CI=false` used to dodge the gate — the moment the
 * baseline reaches zero entries, the gate flips to plain `CI=true npm run build`
 * (see docs/release/RELEASE_INTEGRITY.md).
 *
 * FINGERPRINT: `rule | file | message` — deliberately WITHOUT line numbers.
 * Line numbers shift on every unrelated edit above a warning, which would make
 * the gate fail constantly for no real change and train people to regenerate
 * the baseline reflexively. Rule + file + message (the message carries the
 * identifier name, e.g. "'foo' is defined but never used") is stable under line
 * shifts while still catching a new warning, a changed category, or a new file.
 *
 *   node scripts/cra-build-gate.mjs            # gate (CI)
 *   node scripts/cra-build-gate.mjs --update   # regenerate the baseline
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = resolve(ROOT, 'ci/cra-warning-baseline.json');
const UPDATE = process.argv.includes('--update');

// ── run the real production build ───────────────────────────────────────────
// CI is emptied ONLY so the build completes and reports every warning instead
// of aborting at the first. Build ERRORS still fail — checked below.
const res = spawnSync('npx', ['react-scripts', 'build'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, CI: '' },
  maxBuffer: 64 * 1024 * 1024,
});
const out = `${res.stdout || ''}\n${res.stderr || ''}`;

if (res.status !== 0) {
  console.error(out);
  console.error('\n✗ CRA production build FAILED to compile.');
  console.error('  This is a real build error, not a lint warning. The warning');
  console.error('  baseline does not apply and cannot suppress it.');
  process.exit(1);
}
if (/Failed to compile/.test(out)) {
  console.error(out);
  console.error('\n✗ CRA build reported "Failed to compile".');
  process.exit(1);
}

// ── parse the ESLint block ──────────────────────────────────────────────────
// Format:
//   src/App.js
//     Line 29:8:  'X' is defined but never used   no-unused-vars
const FILE_RE = /^([A-Za-z0-9_./-]+\.(?:js|jsx|ts|tsx|mjs|cjs))\s*$/;
const WARN_RE = /^\s+Line\s+(\d+):(\d+):\s+(.*?)\s{2,}([a-zA-Z@][a-zA-Z0-9@/_-]*)\s*$/;

const found = new Map();       // fingerprint -> { rule, file, message, count }
let currentFile = null;
for (const raw of out.split('\n')) {
  const line = raw.replace(/\s+$/, '');
  const fm = line.match(FILE_RE);
  if (fm) { currentFile = fm[1]; continue; }
  const wm = line.match(WARN_RE);
  if (!wm) continue;
  const [, , , messageRaw, rule] = wm;
  const message = messageRaw.trim();
  const file = currentFile || '<unknown>';
  const fp = `${rule}|${file}|${message}`;
  const hit = found.get(fp) || { rule, file, message, count: 0 };
  hit.count += 1;
  found.set(fp, hit);
}

const total = [...found.values()].reduce((s, w) => s + w.count, 0);

// ── regenerate ──────────────────────────────────────────────────────────────
if (UPDATE) {
  const byRule = {};
  const byFile = {};
  for (const w of found.values()) {
    byRule[w.rule] = (byRule[w.rule] || 0) + w.count;
    byFile[w.file] = (byFile[w.file] || 0) + w.count;
  }
  // Rules that are REAL DEFECTS, accepted only until the next focused
  // correction. Surfaced in the baseline so they cannot be lost among 250
  // entries, and re-counted on every regeneration.
  const CORRECTNESS_RULES = ['no-dupe-keys', 'no-unreachable', 'no-script-url'];
  const exceptions = [...found.values()]
    .filter((w) => CORRECTNESS_RULES.includes(w.rule))
    .sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file))
    .map(({ rule, file, message, count }) => ({ rule, file, message, count }));

  const payload = {
    _comment: [
      'REVIEWED CRA production-build warning baseline (Policy B).',
      'Regenerate deliberately with: npm run gate:cra:update',
      'Adding an entry here is a review decision, not routine maintenance.',
      'Rationale per category lives in docs/release/RELEASE_INTEGRITY.md.',
      'Resolved warnings do NOT fail the gate — fixing one is the goal.',
    ],
    temporaryCorrectnessExceptions: {
      status: 'TEMPORARY — must be corrected before C4 Pages deployment activation',
      why: [
        'These are real defects, not style noise. A duplicate object key silently',
        'discards a value; unreachable code marks a logic error; a javascript: URL',
        'is an eval-shaped sink. They are baselined ONLY because two of them sit in',
        'src/App.js, which CLAUDE.md freezes as donor-only, and this was a release',
        'sprint rather than a correctness sprint.',
      ],
      rules: CORRECTNESS_RULES,
      count: exceptions.reduce((s, w) => s + w.count, 0),
      blocks: 'Slice C4 (source-built Pages deployment activation)',
      entries: exceptions,
    },
    generatedFrom: 'npx react-scripts build',
    fingerprint: 'rule|file|message (no line numbers — they shift on unrelated edits)',
    totalWarnings: total,
    byRule: Object.fromEntries(Object.entries(byRule).sort((a, b) => b[1] - a[1])),
    byFile: Object.fromEntries(Object.entries(byFile).sort((a, b) => b[1] - a[1])),
    warnings: [...found.values()]
      .sort((a, b) => (a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule) || a.message.localeCompare(b.message)))
      .map(({ rule, file, message, count }) => ({ rule, file, message, count })),
  };
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`✓ baseline regenerated: ${total} warnings across ${Object.keys(byFile).length} files`);
  console.log(`  → ${BASELINE}`);
  process.exit(0);
}

// ── gate ────────────────────────────────────────────────────────────────────
if (!existsSync(BASELINE)) {
  console.error('✗ No warning baseline found. Create one with: npm run gate:cra:update');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const baseMap = new Map(baseline.warnings.map((w) => [`${w.rule}|${w.file}|${w.message}`, w]));
const baseFiles = new Set(baseline.warnings.map((w) => w.file));

const newWarnings = [];
const increased = [];
const newFileWarnings = [];
for (const [fp, w] of found) {
  const b = baseMap.get(fp);
  if (!b) {
    (baseFiles.has(w.file) ? newWarnings : newFileWarnings).push(w);
  } else if (w.count > b.count) {
    increased.push({ ...w, was: b.count });
  }
}
// Resolved warnings are INFORMATIONAL ONLY — never a failure. See header.
const resolved = [];
for (const [fp, b] of baseMap) {
  const f = found.get(fp);
  if (!f) resolved.push(b);
  else if (f.count < b.count) resolved.push({ ...b, now: f.count });
}

const say = (title, rows) => {
  if (!rows.length) return;
  console.error(`\n${title}`);
  for (const w of rows) {
    const c = w.was != null ? ` (was ${w.was}, now ${w.count})` : w.now != null ? ` (was ${w.count}, now ${w.now})` : w.count > 1 ? ` (×${w.count})` : '';
    console.error(`  ${w.rule}  ${w.file}${c}\n      ${w.message}`);
  }
};

if (newFileWarnings.length || newWarnings.length || increased.length) {
  console.error('✗ CRA warning gate FAILED — the build compiled, but it introduced');
  console.error('  warnings that are not in the reviewed baseline.');
  say('NEW warnings in files that had none (never allowed — fix these):', newFileWarnings);
  say('NEW warnings:', newWarnings);
  say('INCREASED warnings:', increased);
  console.error(`\n  baseline: ${baseline.totalWarnings} warnings · this build: ${total}`);
  process.exit(1);
}

if (resolved.length) {
  // Good news, reported not punished. Tidy the baseline when convenient:
  //   npm run gate:cra:update
  const n = resolved.reduce((s, w) => s + (w.now != null ? w.count - w.now : w.count), 0);
  console.log(`✓ ${n} baselined warning${n === 1 ? '' : 's'} no longer occur${n === 1 ? 's' : ''} — nice.`);
  for (const w of resolved) console.log(`    fixed: ${w.rule}  ${w.file}\n           ${w.message}`);
  console.log('  Tidy the baseline when convenient: npm run gate:cra:update');
}

console.log(`✓ CRA production build compiled; no new warnings (${total} of ${baseline.totalWarnings} baselined).`);
process.exit(0);
