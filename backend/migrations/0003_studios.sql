-- ============================================================================
-- NGW Events — Studios (multi-tenant workspaces) — Phase 0
-- Run in Supabase → SQL Editor after 0002_event_owners.sql.
--
-- Introduces studios + membership/roles, the RLS helpers used by every
-- studio-scoped table, a trigger that auto-provisions a studio for each new
-- user, a backfill for existing users, and a studio_id on event_owners so the
-- comms service can scope ownership to the studio (any member can access).
-- ============================================================================

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists studios (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  plan       text not null default 'free',
  created_by uuid,                       -- auth.users id
  created_at timestamptz default now()
);

create table if not exists studio_members (
  studio_id  uuid not null references studios(id) on delete cascade,
  user_id    uuid not null,              -- auth.users id
  role       text not null default 'planner' check (role in ('owner','planner','assistant')),
  created_at timestamptz default now(),
  primary key (studio_id, user_id)
);
create index if not exists idx_studio_members_user on studio_members (user_id);

-- ── RLS helpers (security definer → bypass RLS, prevent policy recursion) ─────
create or replace function is_studio_member(p_studio uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from studio_members m
    where m.studio_id = p_studio and m.user_id = auth.uid()
  );
$$;

create or replace function is_studio_owner(p_studio uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from studio_members m
    where m.studio_id = p_studio and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ── RLS policies (frontend supabase-js path) ─────────────────────────────────
alter table studios        enable row level security;
alter table studio_members enable row level security;

drop policy if exists studios_select on studios;
create policy studios_select on studios for select using (is_studio_member(id));

drop policy if exists studios_update on studios;
create policy studios_update on studios for update using (is_studio_owner(id)) with check (is_studio_owner(id));

drop policy if exists studios_insert on studios;
create policy studios_insert on studios for insert with check (created_by = auth.uid());

drop policy if exists members_select on studio_members;
create policy members_select on studio_members for select using (is_studio_member(studio_id));

drop policy if exists members_manage on studio_members;
create policy members_manage on studio_members for all
  using (is_studio_owner(studio_id)) with check (is_studio_owner(studio_id));

-- ── Auto-provision a studio for each new user ────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare new_studio uuid;
begin
  insert into studios (name, created_by)
    values (coalesce(nullif(new.email,''), 'My') || '''s Studio', new.id)
    returning id into new_studio;
  insert into studio_members (studio_id, user_id, role)
    values (new_studio, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Backfill existing users into their own studio ────────────────────────────
do $$
declare r record; sid uuid;
begin
  for r in
    select u.id, u.email from auth.users u
    where not exists (select 1 from studio_members m where m.user_id = u.id)
  loop
    insert into studios (name, created_by)
      values (coalesce(nullif(r.email,''), 'My') || '''s Studio', r.id)
      returning id into sid;
    insert into studio_members (studio_id, user_id, role)
      values (sid, r.id, 'owner');
  end loop;
end $$;

-- ── Comms ownership → studio-scoped ──────────────────────────────────────────
alter table event_owners add column if not exists studio_id uuid;
create index if not exists idx_event_owners_studio on event_owners (studio_id);
-- Backfill: map each owned event's owner to that owner's studio.
-- event_owners.owner_id is TEXT (uuid-as-text); studio_members.user_id is UUID —
-- so the join must cast, or Postgres errors "operator does not exist: uuid = text"
-- (that failure previously rolled back the ALTER above in the same transaction,
-- which is why studio_id silently never landed in prod).
update event_owners eo
   set studio_id = m.studio_id
  from studio_members m
 where eo.studio_id is null and m.user_id::text = eo.owner_id and m.role = 'owner';
