-- ─── NGW Event Boss — Announcements: the host posts one update to everyone ──
-- Canonical, integration-watched migration (see this folder's README).
--
-- WHY THIS EXISTS
--   Owner ruling 11/16/2026 ("go with recommendations"): reply notices first
--   (shipped, PR #151), then announcements. The host posts a short update; it
--   shows on every guest's invite, and guests who ticked "email me" get it by
--   email. Limits: 3 a day and 20 per event, counted HERE, so a restart or a
--   second server cannot reset them.
--
-- WHO WRITES WHAT
--   · Only the FastAPI service (service role) reads or writes this table: the
--     host posts and removes through an authenticated route, guests read
--     through the invite's public route, which returns body and time only.
--     anon and authenticated get nothing (the S9-1 lesson, 019).
--
-- DELETION
--   Deleting the event deletes its announcements (FK cascade). An account's
--   deletion removes its events (021's cleanup), and so these.

create extension if not exists pgcrypto;

create table if not exists public.event_announcements (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null references public.events(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  posted_by   uuid null,                        -- the signed-in host or co-host; null for a dev token
  created_at  timestamptz not null default now(),
  removed_at  timestamptz null                  -- the host took it off the invite (emails already sent stay sent)
);

create index if not exists event_announcements_event
  on public.event_announcements (event_id, created_at desc);

alter table public.event_announcements enable row level security;
revoke all on table public.event_announcements from anon, authenticated;
