const path = require('path');
const { auditDefiners, migrationSources } = require('../../../scripts/check-security-definers');

const root = path.join(__dirname, '../../..');
const create = 'create function public.sample() returns void language plpgsql security definer as $$ begin null; end $$;';

test('every public SECURITY DEFINER function has an explicit anonymous boundary and safe search path', () => {
  const result = auditDefiners(migrationSources(root));
  expect(result.functions.length).toBeGreaterThanOrEqual(6);
  expect(result.anonymous).toEqual([]);
  expect(result.unsafePath).toEqual([]);
});

test('the sweep catches an anonymous EXECUTE grant even after PUBLIC was revoked', () => {
  const result = auditDefiners([{ name: 'fixture', sql: create + 'revoke all on function public.sample() from public; grant execute on function public.sample() to anon;' }]);
  expect(result.anonymous).toEqual(['sample()']);
});

test('comments, strings, and function bodies cannot masquerade as privilege controls', () => {
  const sql = create.replace('begin null;', 'begin perform \'revoke all on function public.sample() from public;\';')
    + '-- revoke all on function public.sample() from public;\n'
    + "select 'revoke all on function public.sample() from public;';";
  expect(auditDefiners([{ name: 'fixture', sql }]).anonymous).toEqual(['sample()']);
});

test('CREATE OR REPLACE preserves revokes and explicit authenticated callers', () => {
  const sql = create + 'revoke all on function public.sample() from public, anon; grant execute on function public.sample() to authenticated;'
    + create.replace('create function', 'create or replace function')
    + 'alter function public.sample() set search_path = pg_catalog, public, pg_temp;';
  const result = auditDefiners([{ name: 'fixture', sql }]);
  expect(result.anonymous).toEqual([]);
  expect(result.unsafePath).toEqual([]);
  expect(result.functions[0].grants.has('authenticated')).toBe(true);
});

test('RSVP writes and retention are server-only after the final migration', () => {
  const result = auditDefiners(migrationSources(root));
  const purge = result.functions.find(f => f.key === 'purge_old_rsvp_submissions(integer)');
  expect(purge).toBeTruthy();
  expect([...purge.grants].filter(r => ['public', 'anon', 'authenticated'].includes(r))).toEqual([]);
  expect(result.rsvpClientPolicies).toEqual([]);
});

test('a renamed or default-PUBLIC RSVP policy cannot bypass the server-only guard', () => {
  const sql = 'create policy replacement on public.rsvp_submissions for insert with check (true);'
    + 'create policy other_name on public.rsvp_submissions for all to authenticated using (true);';
  expect(auditDefiners([{ name: 'fixture', sql }]).rsvpClientPolicies).toEqual(['replacement', 'other_name']);
});
