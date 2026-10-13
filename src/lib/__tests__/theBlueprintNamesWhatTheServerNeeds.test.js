// ─── THE MONEY KEYS WERE THE ONLY SECRETS THE BLUEPRINT DID NOT NAME ─────────
//
// `render.yaml` is the Render Blueprint: deploying from it prompts for every
// `sync: false` env var. Its own header says so — "Render will prompt you to
// fill the secret env vars (sync:false) — never commit secrets."
//
// On 2026-10-13, `backend/app/config.py` read 16 environment variables and the
// blueprint named 8 of them. Among the missing: **STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET**. So a fresh Blueprint deploy was never asked for
// either, and Stripe came up silently unconfigured — while the 2026-10-03 audit
// recorded production as `{"configured":true}`, achieved by a dashboard value
// no file in the repo recorded.
//
// WHY THAT STOPPED BEING COSMETIC. The webhook now writes
// `public.event_passes`. With `STRIPE_WEBHOOK_SECRET` unset the signature
// cannot be verified and the grant is refused by design — so a deployment with
// the secret key set and the signing secret missing can TAKE money and record
// nothing. The audit logged "unattested" against exactly this, because no file
// could answer it. A blueprint that does not name the variable is how it stayed
// unanswerable.
//
// The guard is the cheap half: every variable the server reads is either named
// in the blueprint or carries a written reason for being absent. A reason, not
// a silence — the `CALLED_FROM_OUTSIDE` idiom from
// `everyBackendRouteHasACaller.test.js`, for the same purpose: a list of
// decisions rather than a place for an omission to hide.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const CONFIG = path.join(ROOT, 'backend', 'app', 'config.py');
const BLUEPRINT = path.join(ROOT, 'render.yaml');

// Every `os.environ[...]` / `os.environ.get(...)` name in config.py.
const envVarsRead = () => {
  const src = fs.readFileSync(CONFIG, 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/os\.environ(?:\.get)?\(?\[?["']([A-Z_0-9]+)["']/g)) out.add(m[1]);
  return [...out].sort();
};

// Declared means an ACTIVE key line. A commented-out example (the blueprint has
// one, for ALLOWED_ORIGIN_REGEX) is not a declaration, and counting it would
// make this guard congratulate itself on a comment.
const declared = (name) => {
  const src = fs.readFileSync(BLUEPRINT, 'utf8');
  return new RegExp(`^\\s*-\\s*key:\\s*${name}\\b`, 'm').test(src);
};

// ── NAMED ABSENCES ─────────────────────────────────────────────────────────
// Each is a decision someone made, written down. Not a number to grow.
const NOT_IN_BLUEPRINT = {
  ALLOW_DEV_TOKEN:
    'DELIBERATE SECURITY OMISSION, and render.yaml says so in capitals: it must '
    + 'remain unset in every deployed environment so the X-Planner-Token bypass '
    + 'cannot be used in production. Declaring it would put the bypass one '
    + 'dashboard field away from being switched on.',
  SUPABASE_DB_URL:
    'An ALTERNATIVE spelling, not a second variable: config.py reads '
    + '`DATABASE_URL or SUPABASE_DB_URL`. DATABASE_URL is declared, and naming '
    + 'both would prompt an operator twice for one connection string — the kind '
    + 'of duplicate that gets half-filled.',
  RESEND_FROM_NAME:
    'Non-secret display string with a working default ("NGW Events"). Nothing '
    + 'breaks unset, and a Blueprint prompt for a brand word is noise in a list '
    + 'whose job is to collect credentials.',
  POSTHOG_QUERY_API_KEY:
    'Admin-console analytics read path (the server-side HogQL proxy). NOBODY '
    + 'HAS RECORDED whether this deployment uses it, and this entry exists to '
    + 'make that an open decision rather than a silence. If the admin funnel is '
    + 'meant to work in production, these three belong in the blueprint.',
  POSTHOG_PROJECT_ID:
    'Same open decision as POSTHOG_QUERY_API_KEY — the project id that key is '
    + 'scoped to. Undeclared because the question of whether production reads '
    + 'PostHog has not been answered, not because it was judged unnecessary.',
  POSTHOG_QUERY_HOST:
    'Same open decision, and the only one of the three with a default '
    + '(https://us.posthog.com), so it is the least urgent of them.',
};

describe('the blueprint names what the server needs', () => {
  test('(premise) both files are being read, and really parsed', () => {
    // A guard over an empty list is the failure that matters most here: if
    // config.py moves, this must fail loudly rather than pass on nothing.
    expect(envVarsRead().length).toBeGreaterThan(10);
    expect(envVarsRead()).toContain('DATABASE_URL');
    expect(declared('DATABASE_URL')).toBe(true);
    expect(declared('DEFINITELY_NOT_A_REAL_KEY')).toBe(false);
  });

  test('(premise) a COMMENTED-OUT example is not a declaration', () => {
    // render.yaml carries `# - key: ALLOWED_ORIGIN_REGEX` as an example. A
    // matcher that counted it would accept a commented-out secret as declared.
    expect(declared('ALLOWED_ORIGIN_REGEX')).toBe(false);
  });

  test('THE GUARD: every variable is declared, or its absence is explained', () => {
    const unexplained = envVarsRead()
      .filter((n) => !declared(n))
      .filter((n) => !NOT_IN_BLUEPRINT[n])
      .sort();
    expect(unexplained).toEqual([]);
  });

  test('…and nothing is explained away that is actually declared', () => {
    // The list rots the other way too: a variable that gets added to the
    // blueprint must leave this file, or the reasons above start describing a
    // state that no longer exists.
    expect(Object.keys(NOT_IN_BLUEPRINT).filter(declared)) .toEqual([]);
  });

  test('every named absence gives a REASON, not a shrug', () => {
    for (const [k, why] of Object.entries(NOT_IN_BLUEPRINT)) {
      expect(why.length).toBeGreaterThan(60);
      expect(k).toMatch(/^[A-Z_0-9]+$/);
    }
  });

  test('THE MONEY KEYS SPECIFICALLY — both, by name', () => {
    // Specific because this is the omission that mattered, and because a
    // general guard can be satisfied by adding a reason instead of a key.
    // There is no acceptable reason for either of these to be absent.
    expect(declared('STRIPE_SECRET_KEY')).toBe(true);
    expect(declared('STRIPE_WEBHOOK_SECRET')).toBe(true);
    expect(NOT_IN_BLUEPRINT).not.toHaveProperty('STRIPE_SECRET_KEY');
    expect(NOT_IN_BLUEPRINT).not.toHaveProperty('STRIPE_WEBHOOK_SECRET');
    // And they must be prompted for, never committed.
    const src = fs.readFileSync(BLUEPRINT, 'utf8');
    for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) {
      const at = src.search(new RegExp(`^\\s*-\\s*key:\\s*${k}\\b`, 'm'));
      expect(src.slice(at, at + 300)).toMatch(/sync:\s*false/);
    }
  });

  test('no secret VALUE is ever committed in the blueprint', () => {
    // The header promises "never commit secrets". This checks it rather than
    // trusting it — live key prefixes, not a vague entropy heuristic.
    const src = fs.readFileSync(BLUEPRINT, 'utf8');
    const lines = src.split('\n').filter((l) => /^\s*value:/.test(l));
    for (const l of lines) {
      expect(l).not.toMatch(/\b(sk_live_|sk_test_|whsec_|phx_|re_[A-Za-z0-9]{10,}|postgres:\/\/|postgresql:\/\/)/);
    }
  });
});
