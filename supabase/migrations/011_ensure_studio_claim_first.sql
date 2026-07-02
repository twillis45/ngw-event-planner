-- ─── NGW Event Boss — ensure_studio v2: claim pending invites BEFORE provisioning ──
-- Fixes a race introduced by 010_ensure_studio. On session resume the client fires
-- claimPendingInvitations() and currentStudio()→ensure_studio() ~concurrently
-- (App.js effects at ~43518 and ~43533). An INVITED planner has no studio_members
-- row until the claim lands — so ensure_studio() could provision a fresh SOLO studio
-- out from under the invite, stranding the planner in the wrong studio (plus a stray
-- empty one) instead of the studio they were invited to.
--
-- Making ensure_studio claim-first makes provisioning DETERMINISTIC regardless of
-- client effect ordering: claim any pending invitations, re-check membership, and
-- only provision a solo studio for a user with NEITHER a membership NOR an invite.
-- The claim logic mirrors claim_pending_invitations() (008); running both is safe
-- (idempotent on conflict + used_at guard). create-or-replace, safe to re-apply.

create or replace function public.ensure_studio()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_studio uuid;
begin
  if v_uid is null then
    raise exception 'ensure_studio: no authenticated user';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;

  -- 1. Claim any pending invitations FIRST (mirrors claim_pending_invitations) so an
  --    invited planner joins the inviting studio instead of racing a solo one.
  if v_email is not null then
    insert into public.studio_members (studio_id, user_id, role)
    select si.studio_id, v_uid, si.role
      from public.studio_invitations si
     where lower(si.email) = v_email and si.used_at is null
    on conflict (studio_id, user_id) do nothing;
    update public.studio_invitations si
       set used_at = now()
     where lower(si.email) = v_email and si.used_at is null;
  end if;

  -- 2. Existing (or just-claimed) membership wins — prefer owner, then oldest.
  select sm.studio_id into v_studio
    from public.studio_members sm
   where sm.user_id = v_uid
   order by (sm.role = 'owner') desc, sm.created_at asc nulls last
   limit 1;
  if v_studio is not null then
    return v_studio;
  end if;

  -- 3. No membership and no invite → provision a solo studio (mirror handle_new_user).
  insert into public.studios (name, created_by)
    values (coalesce(nullif(v_email, ''), 'My') || '''s Studio', v_uid)
    returning id into v_studio;
  insert into public.studio_members (studio_id, user_id, role)
    values (v_studio, v_uid, 'owner');
  return v_studio;
end;
$$;

revoke all on function public.ensure_studio() from public, anon;
grant execute on function public.ensure_studio() to authenticated;
