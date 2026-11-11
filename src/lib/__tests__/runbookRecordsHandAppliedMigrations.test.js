// Production had 017–021 applied by hand (SQL editor, 11/7), and
// supabase_migrations.schema_migrations still ends at 016. docs/RUNBOOK.md
// (Rollback, layer 4) gives the owner a snippet that records them. That SQL
// runs once, against production, by hand: a typo in a version or name records
// a migration the CLI will not recognize and leaves the real one to be re-run
// (021's `add constraint` is not re-runnable). This ties every row in the
// snippet to a file in supabase/migrations, the folder the CLI reads.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const runbook = fs.readFileSync(path.join(ROOT, 'docs/RUNBOOK.md'), 'utf8');
const files = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));

const section = runbook.slice(runbook.indexOf('## Rollback'), runbook.indexOf('## Owner attestations'));
const recordSql = (section.split('Record the hand-applied migrations')[1] || '')
  .split('```').find((block) => block.includes('insert into supabase_migrations.schema_migrations')) || '';
const rows = [...recordSql.matchAll(/\('(\d+)',\s*'([a-z0-9_]+)'\)/g)].map((m) => `${m[1]}_${m[2]}.sql`);

test('the record snippet is in the Rollback section, after a read-only check', () => {
  expect(recordSql).not.toBe('');
  const block = section.split('Record the hand-applied migrations')[1];
  expect(block.indexOf('select version, name from supabase_migrations.schema_migrations'))
    .toBeLessThan(block.indexOf('insert into supabase_migrations.schema_migrations'));
});

test('it records exactly 017–021, each matching a migration file by version and name', () => {
  expect(rows).toEqual(files.filter((f) => /^0(1[7-9]|2[01])_/.test(f)).sort());
});

test('it is safe to run twice', () => {
  expect(recordSql).toMatch(/on conflict \(version\) do nothing/);
});
