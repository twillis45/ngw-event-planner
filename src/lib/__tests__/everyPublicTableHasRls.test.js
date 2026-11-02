// ─── EVERY PUBLIC TABLE HAS ROW LEVEL SECURITY ───────────────────────────────
//
// Found 2026-11-02 while writing the owner's RLS attestation runbook: six
// tables created by supabase/migrations/012_research_execution.sql carried no
// `enable row level security`, on the comment that the app only reaches them
// through FastAPI. PostgREST is the second door that comment does not see —
// every `public` table is served at /rest/v1/<table>, and Supabase's default
// privileges let the publishable anon key (which ships in the live bundle on
// purpose) read and write a table with RLS off. 018 closes it.
//
// This is a SOURCE gate, and it reads the folder the Supabase GitHub
// integration applies. It cannot see the live project — that is the owner's
// attestation in docs/RUNBOOK.md — but it can make sure the next migration
// that creates a table without RLS fails here, by name, before it is pushed.
//
// The rule: a table created in supabase/migrations (the canonical folder) must
// have RLS enabled in supabase/migrations too. backend/migrations is frozen
// legacy and is checked the same way for its own tables, so the two folders
// cannot cover for each other.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const FOLDERS = ['supabase/migrations', 'backend/migrations'];

const readFolder = (rel) => {
  const dir = path.join(ROOT, rel);
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ file: `${rel}/${f}`, sql: fs.readFileSync(path.join(dir, f), 'utf8') }));
};

// Strip SQL comments first: a commented-out `create table` or `enable row
// level security` must count for nothing either way.
const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

const CREATE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
const ENABLE = /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi;

const scan = (rel) => {
  const created = new Map();   // table → file that creates it
  const enabled = new Set();
  for (const { file, sql } of readFolder(rel)) {
    const clean = stripComments(sql);
    for (const m of clean.matchAll(CREATE)) if (!created.has(m[1])) created.set(m[1], file);
    for (const m of clean.matchAll(ENABLE)) enabled.add(m[1]);
  }
  return { created, enabled };
};

describe.each(FOLDERS)('%s — every table it creates has RLS enabled in the same folder', (rel) => {
  const { created, enabled } = scan(rel);

  test('the scan found tables at all (a regex that matches nothing passes vacuously)', () => {
    expect(created.size).toBeGreaterThan(0);
  });

  test('no table is created without `enable row level security`', () => {
    const missing = [...created.entries()]
      .filter(([table]) => !enabled.has(table))
      .map(([table, file]) => `${table} (created in ${file})`);
    // The list IS the failure message: the next person sees the table and the
    // file, not just a count.
    expect(missing).toEqual([]);
  });
});

describe('the six research tables specifically', () => {
  // The case that produced this gate, pinned by name so a rename of 018 or a
  // regex regression cannot pass it silently.
  const { enabled } = scan('supabase/migrations');
  test.each([
    'research_campaign_runs', 'research_queue_jobs', 'research_findings',
    'research_evidence', 'research_observations', 'provider_run_logs',
  ])('%s has RLS enabled', (t) => {
    expect(enabled.has(t)).toBe(true);
  });
});
