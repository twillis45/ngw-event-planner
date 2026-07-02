-- ─── NGW Event Boss — Studio self-heal (ensure_studio) ──────────────────────
-- The signup trigger (003_studio_provisioning) provisions a studio ONCE, at
-- auth.users insert. It never re-fires. So a user whose studio gets orphaned or
-- re-created (studio switch, a deleted studio, a partial migration) ends up with
-- NO studio_members row → currentStudioId() returns null → the account is
-- STRANDED (events/clients can't sync; a full-studio delete "nukes" them).
--
-- ensure_studio() closes that gap: called by the client when membership is empty,
-- it returns the caller's existing studio if they have one, otherwise provisions a
-- fresh studio + owner membership (mirroring handle_new_user) and returns its id.
--
-- SECURITY DEFINER because there is deliberately NO client INSERT policy on
-- studios / studio_members (see 002_rls_policies) — provisioning is server-owned.
-- Idempotent + safe to re-run. Acts only on the authenticated caller (auth.uid()).

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

  -- Already a member? Prefer an 'owner' membership, else any. Return it, no insert.
  select studio_id into v_studio
  from public.studio_members
  where user_id = v_uid
  order by (role = 'owner') desc, created_at asc nulls last
  limit 1;
  if v_studio is not null then
    return v_studio;
  end if;

  -- No membership → provision one (mirror handle_new_user).
  select email into v_email from auth.users where id = v_uid;
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
