-- Sprint 55N (follow-up) — the REAL fix for the claim_pending_invitations 400.
--
-- Authenticated verification (2026-06-14) showed migration 007's hypothesis (missing
-- EXECUTE grant) was WRONG. The actual error is a PL/pgSQL ambiguity at runtime:
--   HTTP 400 · {"code":"42702","message":"column reference \"studio_id\" is ambiguous"}
-- The function `returns table(studio_id uuid, role text)`, so `studio_id` / `role`
-- are OUT parameters that collide with the same-named columns in the INSERT
-- `on conflict (studio_id, ...)` target — Postgres cannot tell variable from column.
-- This made the RPC 400 on EVERY authenticated call since 004 (it never worked).
--
-- Fix: a set-based rewrite with table-qualified columns + `#variable_conflict
-- use_column` so every ambiguous reference resolves to the COLUMN. The return
-- signature (studio_id, role) and the behavior (claim pending invites, mark used,
-- return them) are preserved. Re-assert the authenticated grant + reload the cache.
--
-- Verify after apply: POST /rest/v1/rpc/claim_pending_invitations with an
-- authenticated bearer token must return HTTP 200 (was 400).

create or replace function public.claim_pending_invitations()
returns table(studio_id uuid, role text)
language plpgsql security definer as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_email   text;
begin
  if v_user_id is null then return; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_user_id;
  if v_email is null then return; end if;

  -- Idempotent: a membership row per pending invite for this user's email.
  insert into public.studio_members (studio_id, user_id, role)
  select si.studio_id, v_user_id, si.role
    from public.studio_invitations si
   where lower(si.email) = v_email
     and si.used_at is null
  on conflict (studio_id, user_id) do nothing;

  -- Mark them used and return what was claimed (qualified → no 42702 ambiguity).
  return query
    update public.studio_invitations si
       set used_at = now()
     where lower(si.email) = v_email
       and si.used_at is null
   returning si.studio_id, si.role;
end;
$$;

revoke all    on function public.claim_pending_invitations() from public;
grant  execute on function public.claim_pending_invitations() to authenticated;

notify pgrst, 'reload schema';
