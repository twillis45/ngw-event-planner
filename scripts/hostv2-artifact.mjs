#!/usr/bin/env node
/**
 * hostv2 deployment artifact — sync + drift gate.
 * Release Integrity Sprint, Slice C3 (2026-07-30).
 *
 * THE PROBLEM
 * -----------
 * hostv2 ships as a static subdirectory of the CRA site. The build output
 * (`hostv2/dist/`) is gitignored, but the DEPLOYED copy (`public/hostv2/`) is
 * tracked — CRA copies `public/` verbatim into `build/`, and `npm run deploy`
 * pushes `build/` to the `gh-pages` branch.
 *
 * Nothing kept those two in step. The only documented refresh was a manual
 * rsync buried in a handoff note:
 *
 *     cd demo/hostv2 && npx vite build && rsync -a --delete dist/ ../public/hostv2/
 *
 * Relying on a person remembering that is how the tracked artifact went stale.
 * Measured at 04ed31ed, building from committed source produced
 * `HostShellV2-f5b498f9.js` while the tracked copy still shipped
 * `HostShellV2-d2c51e67.js` — 5 assets missing, 5 stale leftovers, and a
 * different index.html. A green Pages run was shipping a hostv2 bundle that
 * did not correspond to the source it was built from.
 *
 * THE MODEL — Model B (tracked artifact + hard drift gate)
 * -------------------------------------------------------
 * Model A (stop tracking `public/hostv2/`) is the better end state and is the
 * documented next step, but it requires Pages to build from source. Today Pages
 * publishes a laptop-built `gh-pages` branch, so untracking the artifact would
 * mean any `npm run build` that skipped the hostv2 step would silently ship a
 * site with NO hostv2 at all. Until the Pages migration lands (Slice C4), the
 * artifact stays tracked and this gate makes staleness impossible to merge.
 *
 * Vite's output is deterministic here — two consecutive builds from identical
 * source produced byte-identical trees — so an exact file-by-file comparison is
 * a sound gate rather than a flaky one.
 *
 *   node scripts/hostv2-artifact.mjs --sync    # canonical regeneration
 *   node scripts/hostv2-artifact.mjs --check   # drift gate (CI)
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOSTV2 = join(ROOT, 'hostv2');
const DEPLOYED = join(ROOT, 'public/hostv2');

const MODE = process.argv.includes('--sync') ? 'sync'
  : process.argv.includes('--check') ? 'check'
    : null;
if (!MODE) {
  console.error('usage: hostv2-artifact.mjs --sync | --check');
  process.exit(2);
}

const walk = (dir, base = dir) => {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) out.push(relative(base, full));
  }
  return out.sort();
};
const digest = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

// ── build hostv2 from source ────────────────────────────────────────────────
// `npm run build` in hostv2 runs the parity check first, then vite build. We
// call it so the gate exercises the SAME command a release does.
console.log('· building hostv2 from source …');
const build = spawnSync('npm', ['run', 'build'], { cwd: HOSTV2, encoding: 'utf8', stdio: 'pipe' });
if (build.status !== 0) {
  console.error(build.stdout || '');
  console.error(build.stderr || '');
  console.error('✗ hostv2 build failed — cannot sync or verify the deployment artifact.');
  process.exit(1);
}
const DIST = join(HOSTV2, 'dist');
if (!existsSync(DIST)) {
  console.error('✗ hostv2 build produced no dist/.');
  process.exit(1);
}

// ── sync ────────────────────────────────────────────────────────────────────
if (MODE === 'sync') {
  // Equivalent to `rsync -a --delete dist/ public/hostv2/`: the deployed tree is
  // REPLACED, so obsolete hashed assets cannot linger and get shipped forever.
  rmSync(DEPLOYED, { recursive: true, force: true });
  cpSync(DIST, DEPLOYED, { recursive: true });
  const files = walk(DEPLOYED);
  console.log(`✓ synced ${files.length} files → public/hostv2/`);
  const shell = files.find((f) => /HostShellV2-.*\.js$/.test(f));
  if (shell) console.log(`  host shell bundle: ${shell}`);
  process.exit(0);
}

// ── check ───────────────────────────────────────────────────────────────────
// Compare into a temp copy so a check can never mutate the tracked artifact.
const tmp = mkdtempSync(join(tmpdir(), 'hostv2-drift-'));
try {
  cpSync(DIST, tmp, { recursive: true });
  const built = walk(tmp);
  const deployed = walk(DEPLOYED);

  const builtSet = new Set(built);
  const deployedSet = new Set(deployed);
  const missing = built.filter((f) => !deployedSet.has(f));       // built but not shipped
  const extra = deployed.filter((f) => !builtSet.has(f));         // shipped but not built
  const changed = built
    .filter((f) => deployedSet.has(f))
    .filter((f) => digest(join(tmp, f)) !== digest(join(DEPLOYED, f)));

  // The deployed index.html must reference files that actually exist beside it.
  const idx = join(DEPLOYED, 'index.html');
  const dangling = [];
  if (existsSync(idx)) {
    const html = readFileSync(idx, 'utf8');
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const ref = m[1];
      if (!ref.includes('/hostv2/')) continue;
      const rel = ref.split('/hostv2/')[1];
      if (!rel) continue;
      if (!existsSync(join(DEPLOYED, rel))) dangling.push(ref);
    }
  }

  if (missing.length || extra.length || changed.length || dangling.length) {
    console.error('\n✗ hostv2 DRIFT — public/hostv2/ does not match a build of the current source.');
    const list = (t, xs) => { if (xs.length) { console.error(`\n  ${t}`); xs.forEach((f) => console.error(`    ${f}`)); } };
    list('built from source but MISSING from the deployed artifact:', missing);
    list('present in the deployed artifact but NOT produced by the build (stale):', extra);
    list('present in both but with DIFFERENT content:', changed);
    list('index.html references a file that does not exist:', dangling);
    console.error('\n  The deployed hostv2 bundle would not correspond to this commit.');
    console.error('  Regenerate deliberately:  npm run sync:hostv2');
    process.exit(1);
  }

  console.log(`✓ hostv2 artifact matches source (${built.length} files, no drift).`);
  process.exit(0);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
