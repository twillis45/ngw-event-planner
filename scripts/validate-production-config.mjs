#!/usr/bin/env node
/**
 * validate-production-config — the public build configuration contract.
 * Deterministic Test & Production Configuration sprint, Slice D3 (2026-07-31).
 *
 * WHY
 * ---
 * Create React App bakes every REACT_APP_* into the PUBLIC bundle at build time.
 * Two failure modes follow, and CI previously guarded neither:
 *
 *   1. SILENT DEGRADATION. Build with no Supabase/API values and the app still
 *      compiles — it just quietly becomes the localStorage-only demo. Published
 *      as a release, that is a site with no sign-in and no backend that looks
 *      completely normal.
 *   2. LEAKED SERVER CREDENTIALS. Anything REACT_APP_*-prefixed is shipped to
 *      every visitor. A service-role key or planner token pasted into that
 *      namespace is public the moment it builds.
 *
 * So a build must say which it is:
 *
 *   --mode=verification   ordinary CI compilation. Public config MAY be blank.
 *                         The result is explicitly NOT production-capable.
 *   --mode=production     a release. Every required public value must be present,
 *                         or the build fails loudly rather than degrading.
 *
 * Both modes reject prohibited browser variables and server-secret shapes.
 *
 * VALUES ARE NEVER PRINTED. Only names, and a fixed reason.
 *
 *   node scripts/validate-production-config.mjs --mode=verification
 *   node scripts/validate-production-config.mjs --mode=production
 */

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='));
const MODE = modeArg ? modeArg.slice('--mode='.length) : null;

// `production` is kept as a deprecated alias for `live`.
const MODES = ['verification', 'demo', 'live', 'production'];
if (!MODE || !MODES.includes(MODE)) {
  console.error('usage: validate-production-config.mjs --mode=verification|demo|live');
  process.exit(2);
}
const PROFILE = MODE === 'production' ? 'live' : MODE;

// ── Required for a PRODUCTION release ────────────────────────────────────────
// All three are public by design (the Supabase key is the anon/publishable one;
// the security boundary is the JWT + per-event ownership + Postgres RLS).
// Without them the app silently becomes the localStorage demo — which is a
// legitimate mode, but never an accidental one.
const REQUIRED_PRODUCTION = [
  'REACT_APP_API_BASE_URL',
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY',
];

// ── Prohibited in ANY browser build ──────────────────────────────────────────
// An explicit list, not a heuristic. Each entry is a name that must never be
// compiled into a public bundle, whatever its value.
const PROHIBITED = {
  REACT_APP_PLANNER_TOKEN:
    'the shared planner write-gate — publishing it hands every visitor planner writes',
  REACT_APP_AUTH_BYPASS:
    'skips sign-in entirely; in a public bundle it ships an unauthenticated app',
  REACT_APP_BYPASS_ROLE:
    'selects the role the auth bypass assumes — development only',
  REACT_APP_SUPABASE_SERVICE_ROLE_KEY: 'service-role key — full database access, bypasses RLS',
  REACT_APP_SUPABASE_SERVICE_KEY: 'service-role key — full database access, bypasses RLS',
  REACT_APP_OPENAI_API_KEY: 'server provider key — belongs only on the backend',
  REACT_APP_ANTHROPIC_API_KEY: 'server provider key — belongs only on the backend',
  REACT_APP_STRIPE_SECRET_KEY: 'Stripe secret key — server only',
  REACT_APP_DATABASE_URL: 'database connection string — server only',
  REACT_APP_RESEND_API_KEY: 'transactional email key — server only',
  REACT_APP_DOCUSIGN_SECRET: 'DocuSign integration secret — server only',
};

// ── Secondary net: shapes that are server credentials by construction ────────
// Deliberately NOT the only control (see PROHIBITED above) — this catches a
// name nobody thought to list, and only supplements the explicit list.
const SUSPICIOUS_NAME = /(SERVICE_ROLE|SECRET|PRIVATE_KEY|_PASSWORD|SESSION_TOKEN|REFRESH_TOKEN)/;
// Value shapes that are unambiguously private credentials. Matched but never echoed.
const SUSPICIOUS_VALUE = [
  { re: /^sk-[A-Za-z0-9_-]{16,}/, what: 'an OpenAI-style secret key' },
  { re: /^sk-ant-[A-Za-z0-9_-]{16,}/, what: 'an Anthropic secret key' },
  { re: /^sk_live_[A-Za-z0-9]{16,}/, what: 'a Stripe live secret key' },
  { re: /^rk_live_[A-Za-z0-9]{16,}/, what: 'a Stripe restricted live key' },
  { re: /^postgres(ql)?:\/\//, what: 'a database connection string' },
  { re: /^ghp_[A-Za-z0-9]{20,}/, what: 'a GitHub personal access token' },
  { re: /^xox[baprs]-/, what: 'a Slack token' },
];

// A Supabase anon JWT is a legitimate public value, so JWT shape alone is not
// disqualifying. But the service_role JWT carries its role in the payload — decode
// (base64, no verification) and reject that one specifically.
function isServiceRoleJwt(value) {
  const parts = String(value).split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload && payload.role === 'service_role';
  } catch {
    return false;
  }
}

const present = (name) => {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() !== '';
};

const errors = [];
const notes = [];

// 1 — prohibited names, both modes
for (const [name, why] of Object.entries(PROHIBITED)) {
  if (present(name)) errors.push(`PROHIBITED  ${name} — ${why}`);
}

// 2 — suspicious names / values across the whole REACT_APP_* namespace
for (const [name, rawValue] of Object.entries(process.env)) {
  if (!name.startsWith('REACT_APP_')) continue;
  if (PROHIBITED[name]) continue;                 // already reported
  const value = String(rawValue ?? '');
  if (!value.trim()) continue;
  if (SUSPICIOUS_NAME.test(name)) {
    errors.push(`PROHIBITED  ${name} — the name marks it a server credential; browser builds are public`);
    continue;
  }
  const hit = SUSPICIOUS_VALUE.find((s) => s.re.test(value));
  if (hit) {
    errors.push(`SECRET-SHAPED  ${name} — its value looks like ${hit.what}; never ship one in a bundle`);
    continue;
  }
  if (isServiceRoleJwt(value)) {
    errors.push(`SECRET-SHAPED  ${name} — a Supabase service_role JWT (bypasses RLS), not the anon key`);
  }
}

// 3a — DEMO RELEASE: the live values must be ABSENT.
//
// Host ruling 2026-07-31: the public site ships as the open, localStorage-only
// demo, and .env.production.local omits these DELIBERATELY. That omission is
// product behaviour, not missing configuration. A demo release that quietly
// acquired live auth would change what the product IS for every visitor, so
// their absence is asserted rather than assumed.
if (PROFILE === 'demo') {
  const present3 = REQUIRED_PRODUCTION.filter(present);
  for (const n of present3) {
    errors.push(`NOT ALLOWED IN A DEMO RELEASE  ${n} — setting it turns the open demo into an authenticated, backend-connected product. Use --mode=live deliberately if that is the intent.`);
  }
  if (!present3.length) {
    notes.push('demo release: live auth/backend configuration is absent, as intended.');
    notes.push('This artifact is the OPEN, localStorage-only demo. It is NOT live-production capable.');
  }
}

// 3b — LIVE RELEASE: every required value present, and coherent.
if (PROFILE === 'live') {
  const missing = REQUIRED_PRODUCTION.filter((n) => !present(n));
  for (const n of missing) {
    errors.push(`MISSING  ${n} — required for a production release; without it the app silently degrades to the localStorage demo`);
  }
  // The anon key must be the publishable one, and must belong to the SAME
  // project as the URL — a mismatched pair fails at runtime in a way that looks
  // like "sign-in is broken" rather than "the config is wrong".
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const url = process.env.REACT_APP_SUPABASE_URL;
  if (key && url) {
    const parts = String(key).split('.');
    if (parts.length !== 3) {
      errors.push('INVALID  REACT_APP_SUPABASE_ANON_KEY — not a JWT; a live release needs the anon/publishable key');
    } else {
      try {
        const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (claims.role === 'service_role') {
          errors.push('PROHIBITED  REACT_APP_SUPABASE_ANON_KEY — this is a service_role key (bypasses RLS), never the anon key');
        } else if (claims.role !== 'anon') {
          errors.push(`INVALID  REACT_APP_SUPABASE_ANON_KEY — role is "${claims.role}", expected "anon"`);
        }
        if (claims.ref && !String(url).includes(claims.ref)) {
          errors.push('MISMATCH  REACT_APP_SUPABASE_ANON_KEY does not belong to the project in REACT_APP_SUPABASE_URL');
        }
      } catch {
        errors.push('INVALID  REACT_APP_SUPABASE_ANON_KEY — claims could not be decoded');
      }
    }
  }
  if (url && !/^https:\/\//.test(String(url))) errors.push('INVALID  REACT_APP_SUPABASE_URL — must be https');
  const api = process.env.REACT_APP_API_BASE_URL;
  if (api) {
    if (!/^https:\/\//.test(String(api))) errors.push('INVALID  REACT_APP_API_BASE_URL — must be https');
    if (/localhost|127\.0\.0\.1/.test(String(api))) errors.push('INVALID  REACT_APP_API_BASE_URL — points at localhost');
    if (/\/api\/?$/.test(String(api))) errors.push('INVALID  REACT_APP_API_BASE_URL — ends in /api; callers append /api and would double it');
  }
} else if (PROFILE === 'verification') {
  const blank = REQUIRED_PRODUCTION.filter((n) => !present(n));
  if (blank.length) {
    notes.push(`This build is NOT production-capable: ${blank.join(', ')} ${blank.length === 1 ? 'is' : 'are'} unset.`);
    notes.push('It compiles and runs as the open, localStorage-only demo — correct for CI verification, never for a release.');
  }
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`config check — mode=${MODE}${MODE === 'production' ? ' (deprecated alias for live)' : ''}`);
if (notes.length) for (const n of notes) console.log(`  note: ${n}`);

if (errors.length) {
  console.error('\n✗ production configuration is invalid:\n');
  for (const e of errors) console.error(`  ${e}`);
  console.error('\n  No values are printed by this check. Fix the NAMES listed above.');
  console.error('  Public production values belong in GitHub repository variables (vars.*),');
  console.error('  never in secrets and never committed. See docs/release/RELEASE_INTEGRITY.md.');
  process.exit(1);
}

const capable = REQUIRED_PRODUCTION.every(present);
if (PROFILE === 'demo') {
  console.log('✓ demo release: open, localStorage-only. NOT live-production capable — by design.');
} else if (PROFILE === 'live') {
  console.log('✓ live release: all required public values present and coherent (anon key, matching project, https API).');
  console.log('  NOTE: a live release changes the product from an open demo to authenticated, backend-connected operation.');
} else {
  console.log(capable
    ? '✓ verification build: config present; no prohibited or secret-shaped variables.'
    : '✓ verification build: public config intentionally blank, no prohibited or secret-shaped variables.');
}
process.exit(0);
