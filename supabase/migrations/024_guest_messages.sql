-- ─── NGW Event Boss — Guest questions (owner ruling 11/16/2026, free) ────────
-- Canonical, integration-watched migration (see this folder's README). SHARED
-- tables (read/written by the FastAPI service), so they live here.
--
-- WHY THESE TABLES EXIST
--   "Questions & updates", narrowed by the owner: a guest asks the host a
--   question from their invite link, and the host replies to that thread. No
--   guest-to-guest, no host-initiated messages, no attachments, plain text.
--   Routes: backend/app/routers/guest_messages.py.
--
--   "Opened your invite" (owner scope addition, same day), the truthful
--   version: the invite is ONE shared code per event, so a guest is
--   identifiable only by her device key, and only after she has replied or
--   asked. invite_opens keeps her last_opened_at (written at most once an
--   hour). Everyone else is a number: invite_open_days counts opens and
--   distinct devices per event per day, and invite_open_devices holds only a
--   salted SHA-256 of a random per-device id, for that day's distinct count.
--   No IP address and no raw device id is stored. "Opened", never "read".
--
-- THE GUEST CREDENTIAL is (rsvp_code, guest_key): the invite code plus the
-- random key minted in the guest's browser, the same pair a guest's own RSVP
-- uses (rsvp.py /mine, /withdraw). event_id is TEXT with no hard FK, as in
-- 013 and 023: the code lookup is the integrity boundary, and a public client
-- never supplies a trusted event_id.
--
-- LEFT FOR THE NEXT PR (announcements, email notices, and a host starting a
-- thread with an opted-in guest: nothing here requires a thread's first
-- message to be the guest's, so author='host' can come first). guest_token is a
-- second, unguessable credential for an emailed link that opens the thread on
-- another device; it is minted now and returned to nobody yet. guest_email and
-- email_opt_in are what the guest typed and ticked; opt-in is false unless
-- ticked. An announcements table and an email log / suppression table join
-- these later without changing them.
--
-- Account deletion: cleanup_deleted_account() (023) is replaced below with the
-- SAME body plus deletes for these five tables. Nothing it already did changes.
--
-- Retention: purge_old_guest_activity() deletes threads, messages and opens
-- 90 days after the event (below). SECURITY DEFINER, so it is revoked from
-- anon and authenticated in this file: the S9-1 lesson (019).

create extension if not exists pgcrypto;

create table if not exists public.guest_threads (
  id             uuid primary key default gen_random_uuid(),
  event_id       text not null,                         -- resolved server-side from rsvp_code
  rsvp_code      text not null,                         -- the invite code the guest holds
  guest_key      text not null,                         -- the guest's device key (never shown to anyone)
  guest_token    text not null unique
                   check (char_length(guest_token) >= 22),  -- future emailed-link credential
  guest_name     text not null check (char_length(guest_name) between 1 and 120),
  guest_email    text null check (guest_email is null or char_length(guest_email) <= 160),
  email_opt_in   boolean not null default false,        -- explicit tick only
  created_at     timestamptz not null default now(),
  last_guest_at  timestamptz null,
  last_host_at   timestamptz null,
  blocked_at     timestamptz null,                      -- host blocked: the guest can no longer post
  unique (rsvp_code, guest_key),
  check (not email_opt_in or guest_email is not null)
);

-- Host inbox: every thread on an event.
create index if not exists guest_threads_event
  on public.guest_threads (event_id);

create table if not exists public.guest_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.guest_threads (id) on delete cascade,
  event_id    text not null,                            -- copied from the thread, for deletion and purge
  author      text not null check (author in ('guest', 'host')),
  body        text not null check (char_length(body) between 1 and 1000),  -- plain text only
  created_at  timestamptz not null default now()
);

-- The thread view, and the per-thread caps (5 an hour, 30 ever).
create index if not exists guest_messages_thread
  on public.guest_messages (thread_id, created_at);
create index if not exists guest_messages_event
  on public.guest_messages (event_id);

-- Same posture as 013/014/023: RLS on, NO anon or authenticated policy — only
-- the FastAPI service role (which bypasses RLS) reads or writes these.
-- ── Invite opens ───────────────────────────────────────────────────────────
-- One row per IDENTIFIED device (a live RSVP or a thread on that key).
create table if not exists public.invite_opens (
  rsvp_code       text not null,
  guest_key       text not null,
  event_id        text not null,                        -- resolved server-side from rsvp_code
  last_opened_at  timestamptz not null default now(),
  primary key (rsvp_code, guest_key)
);
create index if not exists invite_opens_event
  on public.invite_opens (event_id);

-- Every open, counted: one row per event per day.
create table if not exists public.invite_open_days (
  event_id          text not null,
  day               date not null,
  opens             int not null default 0,
  distinct_devices  int not null default 0,
  primary key (event_id, day)
);

-- For the distinct count only: a salted hash per device per event per day.
create table if not exists public.invite_open_devices (
  event_id     text not null,
  day          date not null,
  device_hash  text not null check (char_length(device_hash) = 64),
  last_at      timestamptz not null default now(),
  primary key (event_id, day, device_hash)
);

alter table public.guest_threads enable row level security;
alter table public.guest_messages enable row level security;
alter table public.invite_opens enable row level security;
alter table public.invite_open_days enable row level security;
alter table public.invite_open_devices enable row level security;
revoke all on table public.guest_threads from anon, authenticated;
revoke all on table public.guest_messages from anon, authenticated;
revoke all on table public.invite_opens from anon, authenticated;
revoke all on table public.invite_open_days from anon, authenticated;
revoke all on table public.invite_open_devices from anon, authenticated;

-- ── Retention: 90 days after the event ─────────────────────────────────────
-- A thread goes 90 days after its event's last day (endDate, else date, used
-- only when it looks like YYYY-MM-DD, and built by arithmetic so even
-- "2026-02-30" cannot make the cast throw and stop the purge). With no usable date, or no event row, it goes 90 days after the
-- thread's last activity. Messages go with their thread (on delete cascade).
-- Opens follow the same rule (last open / the day, when there is no date).
-- Device hashes are needed only for the same day's distinct count, so any
-- older than yesterday go every night.
create or replace function public.purge_old_guest_activity(older_than_days int default 90)
returns int language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  removed int;
  extra int;
begin
  with doomed as (
    select t.id
    from public.guest_threads t
    left join public.events e on e.id = t.event_id
    cross join lateral (
      select coalesce(nullif(e.data->>'endDate', ''), nullif(e.data->>'date', '')) as d
    ) ev
    where coalesce(
            case when ev.d ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])' then ((left(ev.d, 7) || '-01')::date + (substr(ev.d, 9, 2)::int - 1))::timestamptz end,
            greatest(t.created_at, t.last_guest_at, t.last_host_at)
          ) < now() - make_interval(days => older_than_days)
  )
  delete from public.guest_threads t using doomed d
  where t.id = d.id;
  get diagnostics removed = row_count;

  delete from public.invite_opens o
  where coalesce(
          (select case when ev.d ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])' then ((left(ev.d, 7) || '-01')::date + (substr(ev.d, 9, 2)::int - 1))::timestamptz end
             from public.events e
             cross join lateral (
               select coalesce(nullif(e.data->>'endDate', ''), nullif(e.data->>'date', '')) as d) ev
            where e.id = o.event_id),
          o.last_opened_at
        ) < now() - make_interval(days => older_than_days);
  get diagnostics extra = row_count;
  removed := removed + extra;

  delete from public.invite_open_days od
  where coalesce(
          (select case when ev.d ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])' then ((left(ev.d, 7) || '-01')::date + (substr(ev.d, 9, 2)::int - 1))::timestamptz end
             from public.events e
             cross join lateral (
               select coalesce(nullif(e.data->>'endDate', ''), nullif(e.data->>'date', '')) as d) ev
            where e.id = od.event_id),
          od.day::timestamptz
        ) < now() - make_interval(days => older_than_days);
  get diagnostics extra = row_count;
  removed := removed + extra;

  delete from public.invite_open_devices where day < current_date - 1;
  return removed;
end;
$$;
revoke all on function public.purge_old_guest_activity(integer) from public, anon, authenticated;
grant execute on function public.purge_old_guest_activity(integer) to service_role;

-- Scheduled the way 009 schedules the RSVP purge: nightly, only where pg_cron
-- is installed. Where it is not, this only prints a notice and the owner runs
--   select public.purge_old_guest_activity(90);
-- from a nightly job. cron.schedule() upserts by job name, so a re-run is safe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-guest-activity',
      '15 4 * * *',
      $cron$ select public.purge_old_guest_activity(90); $cron$
    );
  else
    raise notice 'pg_cron not installed — guest question and invite-open retention NOT scheduled. Enable pg_cron and re-run, or run purge_old_guest_activity(90) from a nightly job.';
  end if;
end
$$;

-- ── Account deletion covers the new tables ─────────────────────────────────
-- 023's function, verbatim, with ONE addition: the deletes for this file's five
-- tables, placed beside the helper_* deletes they mirror. Diff this against 023 before
-- changing it; every other line must stay identical.
create or replace function public.cleanup_deleted_account()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  solo_studios uuid[];
  personal_events text[];
begin
  -- Serialize membership/ownership changes, including concurrent invitations.
  lock table public.studios, public.studio_members in share row exclusive mode;
  if exists (
    select 1 from public.studio_members mine
    where mine.user_id=old.id and mine.role='owner'
      and exists (select 1 from public.studio_members other where other.studio_id=mine.studio_id and other.user_id<>old.id)
      and not exists (select 1 from public.studio_members other where other.studio_id=mine.studio_id and other.user_id<>old.id and other.role='owner')
  ) then
    raise exception 'ownership_transfer_required';
  end if;
  if exists (select 1 from storage.objects where owner_id=old.id::text or owner=old.id) then
    raise exception 'storage_transfer_required';
  end if;

  select coalesce(array_agg(s.id), '{}'::uuid[]) into solo_studios
  from public.studios s
  where (s.created_by=old.id or exists (select 1 from public.studio_members m where m.studio_id=s.id and m.user_id=old.id))
    and not exists (select 1 from public.studio_members m where m.studio_id=s.id and m.user_id<>old.id);
  select coalesce(array_agg(e.id), '{}'::text[]) into personal_events
  from public.events e where e.studio_id=any(solo_studios);
  if to_regclass('public.event_owners') is not null then
    select coalesce(array_agg(distinct id), '{}'::text[]) into personal_events from (
      select unnest(personal_events) as id
      union select eo.event_id from public.event_owners eo
      where (eo.studio_id=any(solo_studios) or (eo.owner_id=old.id::text and eo.studio_id is null))
        and not exists (select 1 from public.events e where e.id=eo.event_id and not (e.studio_id=any(solo_studios)))
    ) owned;
  end if;

  if to_regclass('public.event_channels') is not null then
    delete from public.event_channels where event_id=any(personal_events);
  end if;
  if to_regclass('public.rsvp_submissions') is not null then
    delete from public.rsvp_submissions where event_id=any(personal_events);
  end if;
  if to_regclass('public.vendor_brief_confirmations') is not null then
    delete from public.vendor_brief_confirmations where event_id=any(personal_events);
  end if;
  if to_regclass('public.vendor_brief_links') is not null then
    delete from public.vendor_brief_links where event_id=any(personal_events);
  end if;
  if to_regclass('public.helper_confirmations') is not null then
    delete from public.helper_confirmations where event_id=any(personal_events);
  end if;
  if to_regclass('public.helper_links') is not null then
    delete from public.helper_links where event_id=any(personal_events);
  end if;
  if to_regclass('public.guest_messages') is not null then
    delete from public.guest_messages where event_id=any(personal_events);
  end if;
  if to_regclass('public.guest_threads') is not null then
    delete from public.guest_threads where event_id=any(personal_events);
  end if;
  if to_regclass('public.invite_opens') is not null then
    delete from public.invite_opens where event_id=any(personal_events);
  end if;
  if to_regclass('public.invite_open_days') is not null then
    delete from public.invite_open_days where event_id=any(personal_events);
  end if;
  if to_regclass('public.invite_open_devices') is not null then
    delete from public.invite_open_devices where event_id=any(personal_events);
  end if;
  if to_regclass('public.event_owners') is not null then
    delete from public.event_owners where event_id=any(personal_events);
    update public.event_owners set owner_id='deleted-account', owner_email=null where owner_id=old.id::text;
  end if;
  if to_regclass('public.channel_read_state') is not null then
    delete from public.channel_read_state where reader_key=old.id::text;
  end if;
  if to_regclass('public.event_messages') is not null then
    update public.event_messages set pinned_by=null where pinned_by=old.id::text;
  end if;
  if to_regclass('public.pinned_decisions') is not null then
    update public.pinned_decisions set pinned_by=null where pinned_by=old.id::text;
  end if;
  -- Financial receipts and immutable admin/security records survive, as their
  -- existing schema requires. Remove the optional purchaser attribution only.
  if to_regclass('public.event_passes') is not null then
    update public.event_passes set purchased_by=null where purchased_by=old.id::text;
  end if;
  delete from public.studio_invitations where invited_by=old.id or lower(email)=lower(old.email);
  update public.studios set created_by=null where created_by=old.id and not (id=any(solo_studios));
  delete from public.studio_members where user_id=old.id;
  delete from public.studios where id=any(solo_studios);
  return old;
end;
$$;
-- CREATE OR REPLACE keeps 023's privileges and trigger; restated so this file
-- is safe on its own.
revoke all on function public.cleanup_deleted_account() from public, anon, authenticated;
