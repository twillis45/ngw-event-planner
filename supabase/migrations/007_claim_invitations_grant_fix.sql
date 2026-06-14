-- Sprint 55N — fix claim_pending_invitations() firing a 400 on every authenticated
-- session (deferred defect; pollutes the prod error channel the activation evidence
-- loop depends on).
--
-- Root cause (most likely): the RPC exists and its body is correct (it already
-- returns empty when auth.uid() is null), but the EXECUTE grant to `authenticated`
-- is missing and/or the PostgREST schema cache is stale — so PostgREST rejects the
-- call. This migration is BEHAVIOR-PRESERVING: the function body is byte-identical
-- to 004_studio_invitations.sql; it only (re)asserts existence, locks down the
-- grant, and reloads the API schema cache. No table/column/return-shape change.
--
-- Verify after apply with the authenticated production smoke (Sprint 55N): a signed
-- in session must produce ZERO 400 responses for /rest/v1/rpc/claim_pending_invitations.

create or replace function public.claim_pending_invitations()
returns table(studio_id uuid, role text)
language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_rec     record;
begin
  if v_user_id is null then return; end if;
  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email is null then return; end if;

  for v_rec in
    select id, studio_id as sid, role as r
    from public.studio_invitations
    where lower(email) = v_email and used_at is null
  loop
    insert into public.studio_members (studio_id, user_id, role)
      values (v_rec.sid, v_user_id, v_rec.r)
      on conflict (studio_id, user_id) do nothing;
    update public.studio_invitations set used_at = now() where id = v_rec.id;
    studio_id := v_rec.sid;
    role      := v_rec.r;
    return next;
  end loop;
end;
$$;

-- The actual fix: ensure only authenticated callers can execute, and refresh cache.
revoke all   on function public.claim_pending_invitations() from public;
grant  execute on function public.claim_pending_invitations() to authenticated;

notify pgrst, 'reload schema';
