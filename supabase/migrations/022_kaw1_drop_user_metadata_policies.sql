-- ─── 022: Drop the kaw1 policies that trust user_metadata ─────────────────────
--
-- src/lib/knowledge/kaw1-migration.sql (hand-applied, never auto-run) created
-- seven tables in `public` and gave each one
--
--   create policy "admin-only" on <t> for all using (
--     auth.role() = 'service_role'
--     or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
--
-- `user_metadata` is written by the signed-in user themselves:
-- `supabase.auth.updateUser({ data: { role: 'admin' } })` puts role=admin into
-- their next JWT. So wherever kaw1 was applied, any signed-in account can read
-- and write all seven tables through PostgREST at /rest/v1/<table>. The rest
-- of the app authorizes on `app_metadata.role`, which only the server can set
-- (backend `require_admin`; backend/migrations 0005–0008).
--
-- Fix: the server-only posture 018 uses — RLS ENABLED, no policy for
-- anon/authenticated. Nothing client-side reads these tables (grep of src/,
-- hostv2/src and backend/ for all seven names: zero hits outside kaw1 itself),
-- so no app_metadata replacement policy is needed. The `service_role` clause
-- was never load-bearing: service_role has BYPASSRLS, and the FastAPI service
-- connects as the table-owning role, which non-forced RLS does not apply to.
--
-- Guards:
--   * to_regclass — kaw1 was hand-applied, so any of the seven may be absent
--     in a given project; a missing table is skipped, not an error.
--   * The named "admin-only" policy is dropped, AND any other policy on these
--     seven tables whose USING / WITH CHECK reads user_metadata, in case it was
--     applied under a different name.
-- Idempotent: drop-if-exists and enable-RLS-twice are both no-ops.
--
-- Pinned by src/lib/__tests__/noPolicyTrustsUserMetadata.test.js (no .sql file
-- in the repo may create or alter a policy that reads user_metadata) and by the
-- `policy_trusts_user_metadata` row in docs/attestation/PRODUCTION_ATTESTATION.sql.

begin;

do $$
declare
  t   text;
  pol record;
begin
  foreach t in array array[
    'worker_instances', 'worker_runs', 'provider_check_log', 'change_records',
    'research_pipeline_manifests', 'scheduler_jobs', 'research_metrics'
  ] loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', 'admin-only', t);

    for pol in
      select p.policyname
      from pg_catalog.pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t
        and (coalesce(p.qual, '') ilike '%user_metadata%'
             or coalesce(p.with_check, '') ilike '%user_metadata%')
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

commit;
