// ─── WHICH PRODUCT A DEPLOY PUBLISHES ────────────────────────────────────────
//
// `validate-production-config.mjs` decides what the public site IS, and until
// today nothing tested it. It is 270 lines of release governance guarded by
// nobody — the exact shape this session has been closing everywhere else.
//
// ── THE CHANGE IT NOW COVERS (2026-09-23) ──────────────────────────────────
// There were two profiles, `demo` and `live`, and they bundled two different
// decisions into one:
//
//   REACT_APP_API_BASE_URL   a FastAPI proxy that holds server keys and returns
//                            PUBLIC data — BLS food prices, the forecast,
//                            Kroger shelf prices. No account, nothing stored.
//   REACT_APP_SUPABASE_*     sign-in: accounts, cloud sync, ownership.
//
// The 2026-07-31 host ruling is that the public site ships OPEN and
// localStorage-only. Sign-in ends that. A price proxy does not. Bundled, the
// only way to give a host a real shelf price was to also give every visitor a
// login screen — so the store layer shipped correct, tested, driven at seven
// viewports, and INVISIBLE.
//
// `services` is the missing middle, and the test that matters most below is not
// that it turns the backend on. It is that it CANNOT turn sign-in on.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'validate-production-config.mjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'pages-from-source.yml');

// Run the REAL validator in a child process with a clean REACT_APP_* namespace,
// so a variable in this machine's own environment cannot change the verdict.
const run = (mode, env = {}) => {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('REACT_APP_')),
  );
  try {
    const out = execFileSync('node', [SCRIPT, `--mode=${mode}`], {
      env: { ...clean, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
};

const API = 'https://api.example.test';
const SUPA = 'https://proj.supabase.co';
// A syntactically real anon JWT (role: anon) — the live profile decodes it.
const ANON = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'anon', ref: 'proj' })).toString('base64url')}.sig`;

describe('(premise) the validator is real and reachable', () => {
  test('it exists, and it rejects a mode it does not know', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
    expect(run('nonsense').code).toBe(2);
  });
});

describe('demo — the open, localStorage-only public site', () => {
  test('blank config passes, and says what it published', () => {
    const r = run('demo');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/NOT live-production capable/);
  });

  test('AN API BASE IS REFUSED — a demo cannot quietly become something else', () => {
    // The host ruling asserted rather than assumed: a repository variable set
    // for an unrelated reason must not change what a push publishes.
    const r = run('demo', { REACT_APP_API_BASE_URL: API });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/NOT ALLOWED IN A DEMO RELEASE/);
    // …and it names the two deliberate ways forward rather than just refusing.
    expect(r.out).toMatch(/--mode=services/);
    expect(r.out).toMatch(/--mode=live/);
  });
});

describe('services — backend on, sign-in off', () => {
  test('the API base alone is a complete, valid release', () => {
    const r = run('services', { REACT_APP_API_BASE_URL: API });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/backend proxy on, sign-in off/);
  });

  test('WITHOUT it the build FAILS rather than degrading in silence', () => {
    // The whole reason this file exists: a missing value compiles perfectly and
    // publishes a site where the prices are simply gone, looking entirely normal.
    const r = run('services');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/MISSING {2}REACT_APP_API_BASE_URL/);
    expect(r.out).toMatch(/store\/weather\/price layers stay dark/);
  });

  test('IT CANNOT ACQUIRE SIGN-IN. This is the test that matters.', () => {
    // A profile that merely ADDED the API base would drift into a live release
    // the first time someone set a Supabase variable for an unrelated reason.
    // The absence is asserted, exactly as the demo profile asserts it.
    for (const [k, v] of [['REACT_APP_SUPABASE_URL', SUPA], ['REACT_APP_SUPABASE_ANON_KEY', ANON]]) {
      const r = run('services', { REACT_APP_API_BASE_URL: API, [k]: v });
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/NOT ALLOWED IN A SERVICES RELEASE/);
      expect(r.out).toContain(k);
    }
  });

  test('the prohibited list still applies — a new profile is not a new loophole', () => {
    const r = run('services', {
      REACT_APP_API_BASE_URL: API,
      REACT_APP_PLANNER_TOKEN: 'anything',
    });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/PROHIBITED {2}REACT_APP_PLANNER_TOKEN/);
  });

  test('NO VALUE IS EVER PRINTED, on any branch', () => {
    // The script's own standing promise. A validator that echoed the thing it
    // refused would publish it into a CI log.
    const r = run('services', { REACT_APP_API_BASE_URL: API, REACT_APP_SUPABASE_URL: SUPA });
    expect(r.out).not.toContain(SUPA);
    expect(r.out).not.toContain(API);
  });
});

describe('live — unchanged by any of this', () => {
  test('still demands all three, and still says what it changes', () => {
    expect(run('live', { REACT_APP_API_BASE_URL: API }).code).toBe(1);
    const r = run('live', {
      REACT_APP_API_BASE_URL: API, REACT_APP_SUPABASE_URL: SUPA, REACT_APP_SUPABASE_ANON_KEY: ANON,
    });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/changes the product from an open demo to authenticated/);
  });
});

describe('the deploy workflow agrees with the validator', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');

  test('every profile the validator accepts is offered by the workflow', () => {
    expect(yml).toMatch(/options: \[demo, services, live\]/);
  });

  test('the API base is passed for services AND live — and nothing else is', () => {
    // The precise bundling fix. If `services` ever stopped receiving the API
    // base, the profile would validate and publish a site with no prices.
    const apiLine = yml.split('\n').find((l) => l.includes('REACT_APP_API_BASE_URL:'));
    expect(apiLine).toMatch(/== 'live'/);
    expect(apiLine).toMatch(/== 'services'/);
    // The auth values must NOT follow services.
    for (const k of ['REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_ANON_KEY']) {
      const line = yml.split('\n').find((l) => l.includes(`${k}:`));
      expect(line).toMatch(/== 'live'/);
      expect(line).not.toMatch(/services/);
    }
  });

  test('THE UNIT SUITE RUNS WITH NO RELEASE CONFIGURATION', () => {
    // The failure that took run 410 down, and the reason it is worth a guard
    // rather than a fix: five suites assert the UNCONFIGURED path, and three of
    // them do not merely fail with a real base present — they TIME OUT, because
    // the unit suite starts making live HTTP calls to the production backend
    // from a CI runner.
    //
    // Latent since the profiles were written; a `live` dispatch would have hit
    // it identically. `services` is only what made a backend-configured release
    // something anyone would run.
    const step = yml.slice(yml.indexOf('- name: Unit suite'), yml.indexOf('- name: Validate release'));
    expect(step).toMatch(/unset "\$v"/);
    // The whole NAMESPACE, not a named list — a list rots the first time a
    // variable is added to the job env above it.
    expect(step).toMatch(/\^REACT_APP_\[A-Z0-9_\]\*/);
  });

  test('CONFIGURATION PARITY IS CHECKED FOR SERVICES, not only live', () => {
    // Both profiles bake the API base into BOTH bundles, and the failure the
    // check catches — CRA and hostv2 disagreeing about which backend they talk
    // to — is identical on either. Gated to `live` alone, a services release
    // would ship with the check silently skipped, which is the same shape as
    // the gap that started this whole session.
    const gate = yml.split('\n').find((l) => l.includes("RELEASE_PROFILE == 'live'") && l.includes('if:'));
    expect(gate).toMatch(/services/);
  });

  test('a push still defaults to demo when nothing has been set', () => {
    // The floor became a repository variable so a manual services release is
    // not reverted by the next merge — but `demo` is still what you get if you
    // have not deliberately chosen otherwise.
    expect(yml).toMatch(/RELEASE_PROFILE: \$\{\{ inputs\.release_profile \|\| vars\.DEFAULT_RELEASE_PROFILE \|\| 'demo' \}\}/);
  });
});
