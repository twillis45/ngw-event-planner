-- ─── NGW Event Boss — Studio provisioning ───────────────────────────────────
-- Every user must belong to a studio (multi-tenant scope). This adds:
--   1. a trigger that auto-creates a studio + owner membership for new sign-ups
--   2. a one-time backfill so existing users (created before the trigger) get one
-- Without a studio_members row, the frontend's currentStudioId() returns null and
-- events/clients never sync to the cloud. Mirrors backend/migrations/0003 (idempotent).

-- 1. Auto-provision on new sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare new_studio uuid;
begin
  insert into public.studios (name, created_by)
    values (coalesce(nullif(new.email, ''), 'My') || '''s Studio', new.id)
    returning id into new_studio;
  insert into public.studio_members (studio_id, user_id, role)
    values (new_studio, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Backfill existing users that don't yet have a studio
do $$
declare r record; sid uuid;
begin
  for r in
    select u.id, u.email from auth.users u
    where not exists (select 1 from public.studio_members m where m.user_id = u.id)
  loop
    insert into public.studios (name, created_by)
      values (coalesce(nullif(r.email, ''), 'My') || '''s Studio', r.id)
      returning id into sid;
    insert into public.studio_members (studio_id, user_id, role)
      values (sid, r.id, 'owner');
  end loop;
end $$;
