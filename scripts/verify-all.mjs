#!/usr/bin/env node
/**
 * verify:all — ONE entry point that runs every local verification suite.
 *
 * WHY THIS EXISTS. There were nine verification scripts and no way to run them
 * together, so the full set had never once run as a set. Worse, two of the
 * things a naive chain would include cannot be chained at all:
 *
 *   gate:hostv2  exits 1 UNCONDITIONALLY. It compares public/hostv2/ against a
 *                fresh build, and CI retired it on 2026-08-01 because vite is
 *                not reproducible across machines. The npm script was never
 *                removed. In an && chain it silently deletes every step after
 *                it. It is deliberately NOT in this runner; the replacement is
 *                the hostv2 build itself, which IS here.
 *
 *   gate:cra     is a real gate that can legitimately go red. In an && chain a
 *                red gate:cra means the suites after it never run, and you get
 *                one failure hiding an unknown number of others.
 *
 * SO THIS COLLECTS RATHER THAN CHAINS. Every step runs, each records its own
 * exit code, and the runner exits non-zero if any failed. That also sidesteps
 * the two traps that have already produced false greens in this repo: a
 * `cmd | tail` returning tail's status, and a trailing echo stealing $?.
 *
 * BACKEND PYTEST IS INCLUDED, and it is the single largest coverage win here:
 * 353 tests that NO local script reached. They ran only in CI, which means the
 * person about to push had no way to run them and the push found out for them.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── THE NODE BINARY'S ARCHITECTURE DECIDES WHAT ITS CHILDREN CAN IMPORT ─────
// Node 20 here is /usr/local/opt/node@20 — the INTEL Homebrew prefix — so on
// Apple Silicon it runs under Rosetta as x86_64 and every child inherits that.
// `python3` then launches x86_64 and cannot dlopen pydantic_core's arm64 .so,
// so the backend suite fails to COLLECT while the identical command in an
// interactive (arm64) shell passes 353 tests. Same interpreter, same cwd,
// opposite result — the variable is the parent's architecture, which nothing
// prints unless you ask.
const ROSETTA = process.platform === 'darwin' && process.arch === 'x64'
  && spawnSync('sysctl', ['-n', 'hw.optional.arm64'], { encoding: 'utf8' }).stdout.trim() === '1';
const native = (cmd) => (ROSETTA ? `arch -arm64 ${cmd}` : cmd);
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const fast = process.argv.includes('--fast');   // skip the 14-minute matrix

// Ordered cheapest-first so a broken snapshot reports as itself rather than as
// a confusing failure three suites downstream.
const STEPS = [
  // FIRST because it is the cheapest and because a stale handoff invalidates
  // every number reported after it. Stage 7's gate is "reflects measured
  // reality, not intentions", and the spine's Step 7a — written the same day
  // the SHA was found five commits stale — went stale again that afternoon
  // with the rule already in the file. Prose is advice; this is not.
  { id: 'handoff',    label: 'HANDOFF freshness',   cmd: 'npm', args: ['run', 'handoff:check'] },
  { id: 'knowledge',  label: 'knowledge snapshot',  cmd: 'npm', args: ['run', 'gate:knowledge'] },
  { id: 'migrations', label: 'shared-table migrations', cmd: 'npm', args: ['run', 'check:migrations'] },
  { id: 'design',     label: 'design lib + d.ts',   cmd: 'npm', args: ['run', 'design:build'] },
  { id: 'parity',     label: 'hostv2 parity kit',   cmd: 'node', args: ['hostv2/src/parity/check-parity.mjs'] },
  { id: 'unit',       label: 'jest (CRA runner)',   cmd: 'npx',  args: ['react-scripts', 'test', '--watchAll=false'], env: { CI: '1' } },
  // Through a bare spawn this interpreter cannot import fastapi, while the
  // SAME interpreter at the SAME cwd imports it fine from a login shell —
  // user site-packages resolution differs, and chasing that is not this
  // script's job. Invoke it the way a person and CI both do.
  { id: 'backend',    label: 'backend pytest',      cmd: 'bash', args: ['-lc', native('python3 -m pytest tests/ --strict-markers -q')], cwd: resolve(ROOT, 'backend'), skipIf: () => !existsSync(resolve(ROOT, 'backend/tests')) },
  // The vitest seam. Runs BEFORE the hostv2 build for the same reason it runs
  // before playwright install in CI: it is seconds, and it is the only step
  // here that EXECUTES the hostv2 tree. jest cannot — react-scripts pins its
  // roots to demo/src — which is why 36 suites reach that shell by reading it
  // as text and why a syntax error there once passed a green 5,451-test run.
  { id: 'seam',       label: 'hostv2 vitest seam',  cmd: 'npm', args: ['run', 'test:unit'], cwd: resolve(ROOT, 'hostv2') },
  { id: 'hostv2build',label: 'hostv2 production build', cmd: 'npm', args: ['run', 'build'], cwd: resolve(ROOT, 'hostv2') },
  { id: 'cra',        label: 'CRA build + warning baseline', cmd: 'npm', args: ['run', 'gate:cra'] },
  { id: 'e2e',        label: 'playwright matrix (7 viewports)', cmd: 'npm', args: ['run', 'matrix'], slow: true },
];

const chosen = STEPS.filter((s) => (only.length ? only.includes(s.id) : true))
                    .filter((s) => !(fast && s.slow));

const results = [];
for (const s of chosen) {
  if (s.skipIf && s.skipIf()) { results.push({ ...s, code: null, note: 'absent' }); continue; }
  process.stdout.write(`\n─── ${s.label} ───\n`);
  const t0 = Date.now();
  // stdio inherit: the step's own output is the evidence. A summary that
  // swallows it is how "the check passed" and "the check never ran" start
  // looking identical.
  const r = spawnSync(s.cmd, s.args, {
    cwd: s.cwd || ROOT, stdio: 'inherit', shell: false,
    env: { ...process.env, ...(s.env || {}) },
  });
  results.push({ ...s, code: r.status == null ? 1 : r.status, ms: Date.now() - t0 });
}

const pad = (v, n) => String(v).padEnd(n);
console.log(`\n${'═'.repeat(64)}\nverify:all\n${'═'.repeat(64)}`);
for (const r of results) {
  const state = r.code === null ? 'SKIP' : r.code === 0 ? 'pass' : `FAIL(${r.code})`;
  console.log(`  ${pad(state, 9)} ${pad(r.label, 34)} ${r.ms ? `${(r.ms / 1000).toFixed(1)}s` : r.note || ''}`);
}
const failed = results.filter((r) => r.code !== null && r.code !== 0);
const skipped = results.filter((r) => r.code === null);
if (skipped.length) console.log(`\n  NOT RUN: ${skipped.map((s) => s.label).join(', ')}`);
console.log(failed.length ? `\n✗ ${failed.length} of ${results.length} failed\n` : `\n✓ all ${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
