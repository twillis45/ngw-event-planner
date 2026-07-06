-- ─── NGW Event Boss — Vendor Brief confirmations (Vendor Brief v2 Phase 2A) ───
-- Canonical, integration-watched migration (see this folder's README). SHARED
-- table (written by the public FastAPI endpoint, read back by the planner
-- endpoint), so it lives here — never in backend/migrations.
--
-- WHY THIS TABLE EXISTS
--   Phase 1 gave vendors a live tokenized brief link. This is the vendor's
--   lightweight confirm-back: "all good — I'm confirmed" or "something's off",
--   plus on-site contact and an optional note, submitted from the PUBLIC brief
--   page. The host reads it back through an authenticated, studio-scoped
--   endpoint. Capture + display only (Slice 2A): nothing here mutates vendor
--   status, vendor logs, or the event blob — that is Slice 2B.
--
-- event_id/vendor_id are TEXT (app string ids) and are resolved SERVER-SIDE
-- from the brief code via vendor_brief_links — a public client never supplies
-- a trusted event_id/vendor_id. No hard FK for the same reason as 013.
--
-- Idempotency mirrors rsvp_submissions: unique (code, idempotency_key), and a
-- re-submit (retry, double-tap, or a changed answer) UPDATES the row in place.

create extension if not exists pgcrypto;

create table if not exists public.vendor_brief_confirmations (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,                    -- the brief code used (the only public credential)
  event_id         text not null,                    -- resolved server-side from code
  vendor_id        text not null,                    -- resolved server-side from code
  idempotency_key  text not null,                    -- client-generated, stable per code
  state            text not null check (state in ('confirmed','issue_reported')),
  on_site_name     text,
  on_site_phone    text,
  note             text,                             -- vendor-entered free text (render as plain text only)
  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz,
  unique (code, idempotency_key)
);

-- Planner read-back path: all confirmations for an event, newest first.
create index if not exists vendor_brief_confirmations_event
  on public.vendor_brief_confirmations (event_id, submitted_at desc);

-- Same posture as rsvp_submissions / vendor_brief_links: no direct client
-- access — only the FastAPI service role (which bypasses RLS) touches this.
alter table public.vendor_brief_confirmations enable row level security;
