-- ─── NGW Event Boss — Helper links (owner-approved 11/15/2026, free) ─────────
-- Canonical, integration-watched migration (see this folder's README). SHARED
-- tables (read/written by the FastAPI service), so they live here.
--
-- WHY THESE TABLES EXIST
--   A host gives party jobs to people by name ("Jordan brings the stuffing").
--   Until now the host tapped "Confirm with Jordan" by hand. Each helper now
--   gets a link, built exactly like the vendor brief (013 + 014): one short
--   unguessable code per (event, helper), resolved SERVER-SIDE from the latest
--   public.events.data blob through a strict whitelist
--   (backend/app/routers/helper_link.py), and the helper's own answer
--   ("I've got it" / "I can't" + an optional note), read back by the host
--   through an authenticated, studio-scoped endpoint.
--
-- helper_key is the client helper engine's own id for a person: the guest id
-- the typed name resolves to, else `helper-<slug of the name>`. TEXT, no hard
-- FK, for the same reason as 013: the code lookup is the integrity boundary,
-- and a public client never supplies a trusted event_id or helper_key.
--
-- Account deletion: cleanup_deleted_account() (021) is replaced below with the
-- SAME body plus two deletes for these tables. Nothing it already did changes.

create extension if not exists pgcrypto;

create table if not exists public.helper_links (
  code        text primary key,                          -- long random token (the only public credential)
  event_id    text not null,
  helper_key  text not null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz null                           -- honored on read; nothing writes it yet
);

-- Mint-or-reuse: one ACTIVE link per (event, helper). Partial, as in 013, so a
-- future revoke + re-mint never collides with a revoked row.
create unique index if not exists helper_links_active_one
  on public.helper_links (event_id, helper_key)
  where revoked_at is null;

create table if not exists public.helper_confirmations (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,                    -- the helper code used (the only public credential)
  event_id         text not null,                    -- resolved server-side from code
  helper_key       text not null,                    -- resolved server-side from code
  idempotency_key  text not null,                    -- client-generated, stable per code
  state            text not null check (state in ('confirmed','declined')),
  note             text,                             -- helper-entered free text (render as plain text only)
  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz,
  unique (code, idempotency_key)
);

-- Host read-back path: all answers for an event, newest first.
create index if not exists helper_confirmations_event
  on public.helper_confirmations (event_id, submitted_at desc);

-- Same posture as 013/014: RLS on, NO anon or authenticated policy — only the
-- FastAPI service role (which bypasses RLS) reads or writes these.
alter table public.helper_links enable row level security;
alter table public.helper_confirmations enable row level security;

-- ── Account deletion covers the new tables ─────────────────────────────────
-- 021's function, verbatim, with ONE addition: the two helper_* deletes, placed
-- beside the vendor_brief_* deletes they mirror. Diff this against 021 before
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
-- CREATE OR REPLACE keeps 021's privileges and trigger; restated so this file
-- is safe on its own.
revoke all on function public.cleanup_deleted_account() from public, anon, authenticated;
