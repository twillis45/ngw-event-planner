// ─── THE PRODUCTION ATTESTATION SQL IS READ-ONLY, AND COVERS WHAT IT CLAIMS ──
//
// docs/attestation/PRODUCTION_ATTESTATION.sql is pasted by the owner into the
// Supabase SQL editor on PRODUCTION, which runs as a role that can do anything.
// So two things must hold before he ever pastes it:
//   1. it cannot change anything — one SELECT, no write or DDL keyword, no
//      dollar-quoted block, no second statement hidden in a string;
//   2. it names every table the RLS gate knows about and every SECURITY
//      DEFINER the definer audit knows about, with the same expectations —
//      so a new table or function cannot reach production unattested.
const fs = require('fs');
const path = require('path');
const { auditDefiners, migrationSources } = require('../../../scripts/check-security-definers');

const ROOT = path.resolve(__dirname, '../../..');
const FILE = 'docs/attestation/PRODUCTION_ATTESTATION.sql';
const raw = fs.readFileSync(path.join(ROOT, FILE), 'utf8');

const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const LITERAL = /'(?:''|[^'])*'/g;
const sql = stripComments(raw);
const code = sql.replace(LITERAL, "''");             // keywords outside string literals
const literals = sql.match(LITERAL) || [];

// The same sources and regex as everyPublicTableHasRls.test.js (not exported:
// requiring a test file would re-register its tests here).
const TABLE_SOURCES = ['supabase/migrations', 'backend/migrations', 'src/lib/knowledge/kaw1-migration.sql'];
const CREATE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
const tablesFrom = (rel) => {
  const target = path.join(ROOT, rel);
  const files = rel.endsWith('.sql') ? [target]
    : fs.readdirSync(target).filter((f) => f.endsWith('.sql')).map((f) => path.join(target, f));
  return files.flatMap((f) => [...stripComments(fs.readFileSync(f, 'utf8')).matchAll(CREATE)].map((m) => m[1]));
};
const knownTables = [...new Set(TABLE_SOURCES.flatMap(tablesFrom))].sort();

describe('read-only', () => {
  test('it is exactly one statement', () => {
    expect(code.split(';').filter((s) => s.trim())).toHaveLength(1);
    expect(code.trim().endsWith(';')).toBe(true);
  });

  test('no dollar-quoted body (the only way to smuggle a DO block or function)', () => {
    expect(code).not.toMatch(/\$[a-z_]*\$/i);
  });

  test('no write, DDL, privilege, or session keyword outside comments', () => {
    const banned = /\b(insert|update|delete|merge|drop|alter|grant|revoke|create|truncate|copy|do|set|reset|call|execute|prepare|lock|vacuum|analyze|cluster|reindex|refresh|comment|notify|listen|security)\b/gi;
    expect(code.match(banned) || []).toEqual([]);
  });

  test('no side-effecting function is called', () => {
    const banned = /\b(dblink\w*|set_config|nextval|setval|lo_\w+|pg_read_\w+|pg_ls_dir|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_advisory\w*|pg_notify|txid_current|pg_switch_wal)\b/gi;
    expect(code.match(banned) || []).toEqual([]);
  });

  test('no string literal holds a statement (dynamic SQL stays a lone SELECT)', () => {
    const shaped = /;|\b(insert\s+into|update\s+\S+\s+set|delete\s+from|drop\s+\w|alter\s+\w|grant\s+\w|revoke\s+\w|create\s+\w|truncate\b|copy\s+\w|do\s+\$|set\s+role|set\s+session)/i;
    expect(literals.filter((l) => shaped.test(l))).toEqual([]);
    const dynamic = [...sql.matchAll(/query_to_xml\s*\(\s*('(?:''|[^'])*')/gi)].map((m) => m[1]);
    expect(dynamic.length).toBeGreaterThan(0);
    for (const q of dynamic) expect(q).toMatch(/^'\s*select\b/i);
  });
});

describe('coverage', () => {
  test('the table scan found tables (a regex that matches nothing passes vacuously)', () => {
    expect(knownTables.length).toBeGreaterThan(30);
  });

  test('every table the RLS gate knows about is attested', () => {
    expect(knownTables.filter((t) => !sql.includes(`'${t}'`))).toEqual([]);
  });

  test('every SECURITY DEFINER the audit knows about is attested with the same caller', () => {
    const { functions } = auditDefiners(migrationSources(ROOT));
    expect(functions.length).toBeGreaterThanOrEqual(8);
    const rows = new Map([...sql.matchAll(/\('([a-z_]+\([a-z, ]*\))',\s*(true|false)\)/g)].map((m) => [m[1], m[2] === 'true']));
    const want = new Map(functions.map((f) => [f.key, f.grants.has('authenticated')]));
    expect(Object.fromEntries(rows)).toEqual(Object.fromEntries(want));
  });

  test('it names the RSVP boundary, the 017–021 evidence, and the migration record', () => {
    for (const name of [
      "to_regprocedure('public.purge_old_rsvp_submissions(integer)')",
      "'rsvp_anon_insert'", "'public.event_passes'", "'public.pass_payment_blocks'",
      "'studio_members_auth_user_fk'", "'studios_auth_creator_fk'", "'cleanup_deleted_account'",
      "to_regclass('supabase_migrations.schema_migrations')", 'current_database()', 'now()',
    ]) expect(sql).toContain(name);
  });
});
