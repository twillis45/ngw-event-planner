-- S9-1/S9-2: browsers must not bypass the RSVP API or run retention.
-- Existing authenticated studio helpers retain their callers. Trigger execution
-- and the owner-created pg_cron job do not require browser EXECUTE grants.
begin;

revoke all on function public.is_studio_member(uuid) from public, anon;
grant execute on function public.is_studio_member(uuid) to authenticated;
alter function public.is_studio_member(uuid) set search_path = pg_catalog, public, pg_temp;

revoke all on function public.is_studio_owner(uuid) from public, anon;
grant execute on function public.is_studio_owner(uuid) to authenticated;
alter function public.is_studio_owner(uuid) set search_path = pg_catalog, public, pg_temp;

revoke all on function public.list_studio_members(uuid) from public, anon;
grant execute on function public.list_studio_members(uuid) to authenticated;
alter function public.list_studio_members(uuid) set search_path = pg_catalog, public, pg_temp;

revoke all on function public.claim_pending_invitations() from public, anon;
grant execute on function public.claim_pending_invitations() to authenticated;
alter function public.claim_pending_invitations() set search_path = pg_catalog, public, pg_temp;

revoke all on function public.ensure_studio() from public, anon;
grant execute on function public.ensure_studio() to authenticated;
alter function public.ensure_studio() set search_path = pg_catalog, public, pg_temp;

revoke all on function public.handle_new_user() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = pg_catalog, public, pg_temp;

revoke all on function public.purge_old_rsvp_submissions(integer) from public, anon, authenticated;
grant execute on function public.purge_old_rsvp_submissions(integer) to service_role;
alter function public.purge_old_rsvp_submissions(integer) set search_path = pg_catalog, public, pg_temp;

-- The FastAPI service is the only submission writer: code resolution, validation,
-- rate limits, and idempotency must all run before an RSVP reaches this table.
drop policy if exists rsvp_anon_insert on public.rsvp_submissions;

commit;
