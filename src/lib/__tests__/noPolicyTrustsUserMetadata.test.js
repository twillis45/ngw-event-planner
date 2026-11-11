// ─── NO POLICY TRUSTS user_metadata ──────────────────────────────────────────
//
// Found 2026-11-11: src/lib/knowledge/kaw1-migration.sql gave seven `public`
// tables an "admin-only" policy on `(auth.jwt() -> 'user_metadata' ->> 'role')
// = 'admin'`. user_metadata is user-writable
// (`supabase.auth.updateUser({ data: { role: 'admin' } })`) and lands in the
// caller's JWT, so that policy let any signed-in account read and write those
// tables over PostgREST. supabase/migrations/022 drops them in the database;
// this gate stops the next .sql file from writing one.
//
// Rule: after comments are stripped, no `create policy` / `alter policy`
// statement in any .sql file in the repo may reference user_metadata (JWT
// claim) or raw_user_meta_data (the auth.users column behind it). Authorize on
// app_metadata, which only the server can set.
//
// SOURCE gate only — it cannot see the live project. That is the
// `policy_trusts_user_metadata` row in docs/attestation/PRODUCTION_ATTESTATION.sql.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'dist', 'coverage', 'test-results', 'playwright-report']);

const allSql = (dir = ROOT, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) allSql(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.sql')) out.push(path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join('/'));
  }
  return out;
};

const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// A policy statement runs from `create|alter policy` to the next `;`.
const POLICY_STMT = /\b(?:create|alter)\s+policy\b[^;]*/gi;
const TRUSTS_USER_METADATA = /user_metadata|raw_user_meta_data/i;

const offendingPolicies = (sql) =>
  [...stripComments(sql).matchAll(POLICY_STMT)]
    .map((m) => m[0])
    .filter((stmt) => TRUSTS_USER_METADATA.test(stmt))
    .map((stmt) => stmt.replace(/\s+/g, ' ').trim().slice(0, 160));

describe('no SQL policy authorizes on user_metadata', () => {
  const files = allSql();

  test('the scan found SQL files and policies at all (no vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(0);
    const policyCount = files
      .map((f) => [...stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8')).matchAll(POLICY_STMT)].length)
      .reduce((a, b) => a + b, 0);
    expect(policyCount).toBeGreaterThan(0);
  });

  test('no create/alter policy in any .sql file references user_metadata', () => {
    const hits = files.flatMap((f) =>
      offendingPolicies(fs.readFileSync(path.join(ROOT, f), 'utf8')).map((stmt) => `${f}: ${stmt}`));
    // The list IS the failure message: file and statement, not a count.
    expect(hits).toEqual([]);
  });

  test('022 drops the kaw1 policies behind to_regclass guards for all seven tables', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/022_kaw1_drop_user_metadata_policies.sql'), 'utf8');
    const clean = stripComments(sql);
    expect(clean).toMatch(/to_regclass\s*\(/i);
    expect(clean).toMatch(/drop\s+policy\s+if\s+exists/i);
    expect(clean).not.toMatch(/\bcreate\s+policy\b/i);
    for (const t of ['worker_instances', 'worker_runs', 'provider_check_log', 'change_records',
      'research_pipeline_manifests', 'scheduler_jobs', 'research_metrics']) {
      expect(clean).toContain(`'${t}'`);
    }
  });
});

describe('the detector itself', () => {
  // Red-proof: these are the exact shapes the gate must catch and must not.
  test.each([
    [`CREATE POLICY "admin-only" ON worker_runs FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`],
    [`create policy p on t for select\n  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');`],
    [`alter policy p on t with check ((select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin');`],
  ])('flags %s', (sql) => {
    expect(offendingPolicies(sql)).toHaveLength(1);
  });

  test.each([
    [`create policy p on t for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin');`],
    [`-- create policy p on t using ((auth.jwt()->'user_metadata'->>'role') = 'admin');`],
    [`drop policy if exists "admin-only" on public.worker_runs;`],
  ])('does not flag %s', (sql) => {
    expect(offendingPolicies(sql)).toEqual([]);
  });
});
