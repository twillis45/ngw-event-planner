-- ─── NGW Event Boss — Guest photos (owner request 11/16/2026) ────────────────
-- Canonical, integration-watched migration (see this folder's README). A SHARED
-- table (read/written by the FastAPI service) and a private Storage bucket.
--
-- WHY THIS EXISTS
--   After the event, a guest shares photos from the invite's recap page. Every
--   photo is PRIVATE until the host approves it; approved photos are visible to
--   guests holding that invite code. The host can approve, hide or delete; the
--   guest can delete her own. Routes: backend/app/routers/guest_photos.py, where
--   the owner's defaults live as constants (10 per guest, 300 per event, 10 MB,
--   uploads only after the event's last day, 90-day retention).
--
-- THE GUEST CREDENTIAL is (rsvp_code, guest_key): the invite code plus the
-- random key minted in the guest's browser, the same pair a guest's own RSVP
-- uses (rsvp.py /mine, /withdraw). event_id is TEXT with no hard FK, as in 013,
-- 023 and 024: the code lookup is the integrity boundary, and a public client
-- never supplies a trusted event_id.
--
-- WHAT IS STORED. The server decodes each upload and stores a NEW JPEG built
-- from the pixels alone: no EXIF (GPS, camera, time), XMP, ICC profile,
-- comment or PNG text survives. The original file is never stored.
--
-- STORAGE. The `guest-photos` bucket is PRIVATE and this file creates NO
-- policy on storage.objects for it, so anon and authenticated can neither list,
-- read, write nor delete its files. Only the server's service role key (which
-- bypasses RLS) touches them, and a client sees a photo only through a signed
-- URL the server mints for a few minutes (SIGNED_URL_TTL_SECONDS).
--
-- RETENTION AND DELETION OF FILES. SQL cannot delete a Storage file (deleting a
-- storage.objects row leaves the file behind, and account.py's rule is "never
-- delete storage metadata with SQL"). So:
--   · retention: guest_photos_due_for_purge() below NAMES the photos 90 days
--     past their event; the server (guest_photos.purge_old_guest_photos, run
--     nightly by backend/scripts/purge_guest_photos.py) removes their files and
--     then their rows. It is SECURITY DEFINER, so it is revoked from anon and
--     authenticated here: the S9-1 lesson (019).
--   · account deletion: account.py removes the files of the account's events
--     through the Storage API before the Auth delete; the rows go in
--     cleanup_deleted_account() below (024's body plus one delete).

create extension if not exists pgcrypto;

create table if not exists public.guest_photos (
  id            uuid primary key,                     -- minted by the server; also names the file
  event_id      text not null,                        -- resolved server-side from rsvp_code
  rsvp_code     text not null,                        -- the invite code the guest holds
  guest_key     text not null,                        -- the guest's device key (never shown to anyone)
  guest_name    text not null check (char_length(guest_name) between 1 and 120),
  storage_path  text not null unique,                 -- object name in the guest-photos bucket
  content_type  text not null check (content_type = 'image/jpeg'),  -- always the re-encoded JPEG
  byte_size     int  not null check (byte_size > 0),
  width         int  not null check (width > 0),
  height        int  not null check (height > 0),
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'hidden')),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz null                      -- the host's last approve / hide
);

-- Host list, approved list, and the per-event cap.
create index if not exists guest_photos_event
  on public.guest_photos (event_id, created_at desc);
-- The guest's own photos, and the per-guest cap.
create index if not exists guest_photos_guest
  on public.guest_photos (rsvp_code, guest_key);

-- Same posture as 013/014/023/024: RLS on, NO anon or authenticated policy —
-- only the FastAPI service role (which bypasses RLS) reads or writes it.
alter table public.guest_photos enable row level security;
revoke all on table public.guest_photos from anon, authenticated;

-- ── The private bucket ───────────────────────────────────────────────────────
-- 20 MB, not 10: the 10 MB cap is on the UPLOAD (enforced by the server); the
-- stored file is the server's re-encoding, which for a dense image can be a
-- little larger than what was sent. JPEG only, because that is all it writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-photos', 'guest-photos', false, 20971520, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Retention: 90 days after the event ─────────────────────────────────────
-- A photo is due 90 days after its event's last day (endDate, else date, used
-- only when it looks like YYYY-MM-DD, and built by arithmetic so even
-- "2026-02-30" cannot make the cast throw and stop the purge — 024's rule).
-- With no usable date, or no event row, it is due 90 days after its upload.
-- This only NAMES them; the server removes files, then rows.
create or replace function public.guest_photos_due_for_purge(older_than_days int default 90)
returns table (id uuid, storage_path text)
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p.id, p.storage_path
  from public.guest_photos p
  left join public.events e on e.id = p.event_id
  cross join lateral (
    select coalesce(nullif(e.data->>'endDate', ''), nullif(e.data->>'date', '')) as d
  ) ev
  where coalesce(
          case when ev.d ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])' then ((left(ev.d, 7) || '-01')::date + (substr(ev.d, 9, 2)::int - 1))::timestamptz end,
          p.created_at
        ) < now() - make_interval(days => older_than_days)
  order by p.created_at
$$;
revoke all on function public.guest_photos_due_for_purge(integer) from public, anon, authenticated;
grant execute on function public.guest_photos_due_for_purge(integer) to service_role;

-- ── Account deletion covers the new table ──────────────────────────────────
-- 024's function, verbatim, with ONE addition: the guest_photos delete, placed
-- beside the guest_* deletes it mirrors. Diff this against 024 before changing
-- it; every other line must stay identical. The FILES are removed by account.py
-- before the Auth delete fires this trigger.
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
  if to_regclass('public.guest_photos') is not null then
    delete from public.guest_photos where event_id=any(personal_events);
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
-- CREATE OR REPLACE keeps 024's privileges and trigger; restated so this file
-- is safe on its own.
revoke all on function public.cleanup_deleted_account() from public, anon, authenticated;
