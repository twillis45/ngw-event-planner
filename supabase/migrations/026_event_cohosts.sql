-- ─── NGW Event Boss — Per-event co-hosts (owner ruling 11/16/2026) ──────────
-- Canonical, integration-watched migration (see this folder's README).
--
-- WHY THIS EXISTS
--   "Per-event co-host." A host invites someone by email to ONE event; once
--   they sign in with that email they can see and change that event, and
--   nothing else of the host's. Before this, the only way to share was a studio
--   membership, which opens EVERY event the host has, and the money.
--
-- WHO WRITES WHAT
--   · event_cohosts is written only by the FastAPI service (service role):
--     the host's invite (studio members of the event's own studio only), the
--     invitee's claim on sign-in (matched to their verified sign-in email), and
--     removal. A signed-in user may READ only their own rows.
--   · A claimed co-host gets SELECT and UPDATE on that one events row through
--     is_event_cohost(). No INSERT and no DELETE: a co-host can never create an
--     event in the host's studio or delete it.
--   · events_studio_locked: nobody outside an event's studio can move it to
--     another studio, whatever a client sends. The service role (no auth.uid())
--     is not a browser and is exempt.
--
-- DELETION
--   Deleting the event deletes its co-host rows (FK cascade). Deleting the
--   co-host's account deletes theirs (FK cascade on user_id). The host's
--   account deletion removes the host's events, and so their co-host rows.

create extension if not exists pgcrypto;

create table if not exists public.event_cohosts (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null references public.events(id) on delete cascade,
  email        text not null check (email = lower(email) and char_length(email) between 3 and 254),
  user_id      uuid null references auth.users(id) on delete cascade,   -- set when they claim it
  invited_by   uuid not null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz null,
  unique (event_id, email)
);

create index if not exists event_cohosts_user on public.event_cohosts (user_id) where user_id is not null;
create index if not exists event_cohosts_email on public.event_cohosts (email) where user_id is null;

alter table public.event_cohosts enable row level security;
revoke all on table public.event_cohosts from anon;
revoke insert, update, delete on table public.event_cohosts from authenticated;
grant select on table public.event_cohosts to authenticated;

drop policy if exists "event_cohosts: own rows" on public.event_cohosts;
create policy "event_cohosts: own rows" on public.event_cohosts for select
  using (user_id = auth.uid());

-- ── The one question every rule below asks ───────────────────────────────────
create or replace function public.is_event_cohost(p_event text)
returns boolean language sql security definer stable
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (select 1 from public.event_cohosts c
                 where c.event_id = p_event and c.user_id = auth.uid() and c.accepted_at is not null);
$$;
revoke all on function public.is_event_cohost(text) from public, anon;
grant execute on function public.is_event_cohost(text) to authenticated;

-- ── A co-host reads and changes that one event ───────────────────────────────
drop policy if exists "events: cohost select" on public.events;
create policy "events: cohost select" on public.events for select
  using (public.is_event_cohost(id));

drop policy if exists "events: cohost update" on public.events;
create policy "events: cohost update" on public.events for update
  using (public.is_event_cohost(id))
  with check (public.is_event_cohost(id));

-- ── Nobody outside the studio moves an event out of it ──────────────────────
create or replace function public.events_studio_locked()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.studio_id is distinct from old.studio_id
     and auth.uid() is not null
     and not public.is_studio_member(old.studio_id) then
    raise exception 'event_studio_locked';
  end if;
  return new;
end;
$$;
revoke all on function public.events_studio_locked() from public, anon, authenticated;

drop trigger if exists events_studio_locked on public.events;
create trigger events_studio_locked before update on public.events
  for each row execute function public.events_studio_locked();
