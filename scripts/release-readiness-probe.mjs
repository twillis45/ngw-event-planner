#!/usr/bin/env node
// ─── RELEASE-READINESS PROBE: C9 + native Track B, checked from the tree ─────
//
// Written 11/5/2026 by the verification lane (Claude) while implementation
// (Codex) works in branches this session cannot see. It encodes the
// acceptance criteria of docs/audits/2026-11-05_THREE_PLATFORM_EXECUTION_PLAN.md
// (C9, B1-B10) as checks that read the repository, so any pushed branch can be
// measured the moment it lands:
//
//   git fetch origin <branch> && git worktree add /tmp/x origin/<branch>
//   node scripts/release-readiness-probe.mjs /tmp/x
//
// It is a STATUS PROBE, not a gate: it is deliberately not wired into CI. A
// static PASS here is necessary, never sufficient. Each PASS still needs its
// behavioral test, red-proofed, and Claude's re-run before anyone writes
// "verified". Exit code = number of FAILs (0 = every static criterion met).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] || '.');
const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return ''; } };
const walk = (dir, exts, out = []) => {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name.startsWith('.') || name === 'build' || name.startsWith('dist')) continue;
    const rel = join(dir, name);
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(rel);
  }
  return out;
};
const grepFiles = (files, re) => files.filter((f) => re.test(read(f)));

const migrations = walk('supabase/migrations', ['.sql']);
const migText = migrations.map(read).join('\n');
const stripe = read('backend/app/routers/stripe_payments.py');
const sweep = read('backend/tests/test_protected_routes_sweep.py');
const backendPy = walk('backend/app', ['.py']);
const hostSrc = walk('hostv2/src', ['.js', '.jsx', '.ts', '.tsx']);
// native/hostv2/ added 11/5: Codex's native branch puts the shell there, and the
// first version of this probe looked only at the root and hostv2/ — a FAIL that
// was the probe's blindness, not missing work.
const capConfig = ['', 'hostv2/', 'native/hostv2/'].flatMap((d) => ['ts', 'json', 'js'].map((x) => `${d}capacitor.config.${x}`))
  .find((p) => existsSync(join(ROOT, p)));
const capText = capConfig ? read(capConfig) : '';
const capDir = capConfig ? (capConfig.split('/capacitor.config')[0].includes('capacitor.config') ? '.' : capConfig.replace(/\/?capacitor\.config\.\w+$/, '') || '.') : '.';
const gradleFiles = walk(join(capDir, 'android'), ['.gradle', '.gradle.kts', '.toml']);
const manifests = walk(join(capDir, 'android'), ['AndroidManifest.xml']);

const checks = [
  // ── C9: paid-path security ────────────────────────────────────────────────
  ['C9 S9-1', 'a migration revokes EXECUTE on purge_old_rsvp_submissions from anon',
    /revoke[\s\S]{0,200}purge_old_rsvp_submissions[\s\S]{0,200}\banon\b/i.test(migText)],
  ['C9 S9-2', 'a later migration drops or narrows rsvp_anon_insert (no `with check (true)` left standing)',
    // 009 itself drops-then-creates the permissive policy, so only LATER files count.
    (() => { const later = migrations.filter((m) => !/\/009_/.test(m)).map(read).join('\n');
      return /drop policy[\s\S]{0,40}rsvp_anon_insert/i.test(later)
        && !/create policy rsvp_anon_insert[\s\S]{0,200}with check \(true\)/i.test(later); })()],
  ['C9 S9-3', 'create-checkout-session is removed or gated by more than sign-in',
    !/create-checkout-session/.test(stripe) || /create-checkout-session[\s\S]{0,1500}(require_admin|require_role|require_fee_planner|PLANNER_ROLE|RELEASE_PROFILE|404|403)/.test(stripe)],
  ['C9 S9-4', 'the webhook handles refunds and disputes (charge.refunded / charge.dispute.created)',
    /charge\.refunded/.test(stripe) && /charge\.dispute/.test(stripe)],
  ['C9 S9-4', 'the pass grant checks its rowcount (duplicate charge not logged as granted)',
    // 'already' appears in an existing comment, so only an actual rowcount read counts.
    // asyncpg reports the INSERT status string; asserting on it is a rowcount check.
    /\browcount\b|\brow_count\b|INSERT 0 [01]/.test(stripe)],
  ['C9 RP-1', 'the route sweep no longer matches gate names in raw source text (docstrings count today)',
    // Today: `src = inspect.getsource(...)` then `any(g in src for g in GATES)` — a
    // docstring naming the gate passes. Fixed means the source is PARSED (ast /
    // tokenize), not substring-matched.
    !!sweep && (!/inspect\.getsource\(/.test(sweep) || /\bast\.(parse|walk)\b|\btokenize\b/.test(sweep))],
  // ── Track B ───────────────────────────────────────────────────────────────
  ['B1', 'a Capacitor config exists', !!capConfig],
  ['B1', 'the config bundles the build (no server.url pointing at a website)',
    !!capConfig && !/server\s*[:=]\s*\{[\s\S]{0,300}\burl\s*:/.test(capText)],
  ['B1', 'ios/ and android/ native projects exist',
    existsSync(join(ROOT, capDir, 'ios')) && existsSync(join(ROOT, capDir, 'android'))],
  ['B10', 'Android targetSdk / targetSdkVersion is 36',
    gradleFiles.some((f) => /targetSdk(Version)?\s*=?\s*36\b/.test(read(f)))],
  ['B10', 'no location permission in any Android manifest',
    manifests.length > 0 && !manifests.some((f) => /ACCESS_(FINE|COARSE)_LOCATION/.test(read(f)))],
  ['B2', 'a NATIVE_PASS_MODE switch exists in hostv2',
    grepFiles(hostSrc, /NATIVE_PASS_MODE|nativePassMode/).length > 0],
  ['B2', 'the pass checkout no longer assigns the Stripe URL to the app window unconditionally',
    !/if \(out && out\.url\) \{ window\.location\.assign\(out\.url\); return; \}/.test(read('hostv2/src/HostShellV2.jsx'))],
  ['B3', 'a backend account-deletion route exists',
    grepFiles(backendPy, /@router\.(delete|post)\([^)]*(account|me)\b[^)]*\)/i).length > 0
      && grepFiles(backendPy, /def\s+\w*delete\w*account|delete_account|delete_me/i).length > 0],
  ['B3', 'hostv2 offers account deletion in the app',
    grepFiles(hostSrc, /[Dd]elete (my |your )?account/).length > 0],
  ['B4', 'the app handles a deep-link auth return (appUrlOpen)',
    grepFiles(hostSrc, /appUrlOpen/).length > 0],
  ['B5', 'backend CORS allows the shell origins',
    /capacitor:\/\/localhost/.test(read('backend/app/config.py'))],
  ['B9', 'a reviewer-only sign-in path exists and is limited to one account',
    grepFiles(backendPy, /REVIEWER_|reviewer_account|review_login/i).length > 0],
];

let fails = 0;
console.log(`release-readiness probe — ${ROOT}\n`);
for (const [id, what, ok] of checks) {
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(8)} ${what}`);
}
console.log(`\n${checks.length - fails} of ${checks.length} static criteria met. A PASS here is necessary, not sufficient.`);
process.exit(fails);
