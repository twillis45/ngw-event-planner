-- ─── NGW Event Boss — Vendor Brief links (Vendor Brief v2 Phase 1) ────────────
-- Canonical, integration-watched migration (see this folder's README). SHARED
-- table (read/written by the FastAPI service), so it lives here — never in
-- backend/migrations.
--
-- WHY THIS TABLE EXISTS
--   Until now a vendor brief was shared as a FROZEN base64 snapshot of the
--   payload embedded in the URL (?vendor=<huge token>): stale the moment the
--   host edits anything, and a very dense QR. This table is the tokenized
--   mapping: one short unguessable code per (event, vendor). The PUBLIC
--   resolver looks the code up here, then builds the brief FRESH from the
--   latest public.events.data blob through the same audited vendor-safe
--   whitelist as src/lib/vendorBrief.js — so the link always shows current data.
--
-- WHAT THIS TABLE IS NOT (Phase 1 guardrails)
--   - No vendor confirmation fields. Vendor confirm-back is Phase 2 and gets
--     its own table if/when it ships. Never add response columns here.
--   - No rotation lifecycle. revoked_at exists so a future revoke can work
--     without a migration, but NOTHING writes it in Phase 1.
--
-- event_id/vendor_id are TEXT (the app's string ids), matching public.events(id)
-- and the vendor ids inside the event JSONB. No hard FK: demo/local events never
-- reach Postgres; the code lookup (not a constraint) is the integrity boundary.
-- The event is resolved from the code SERVER-SIDE; a public client never
-- supplies a trusted event_id.

create table if not exists public.vendor_brief_links (
  code        text primary key,                          -- long random token (the only public credential)
  event_id    text not null,
  vendor_id   text not null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz null                           -- Phase 2 hook; never written in Phase 1
);

-- Mint-or-reuse: one ACTIVE link per (event, vendor). A partial unique index
-- (rather than a plain unique) leaves room for a future revoke+re-mint without
-- violating uniqueness on historical revoked rows.
create unique index if not exists vendor_brief_links_active_one
  on public.vendor_brief_links (event_id, vendor_id)
  where revoked_at is null;

-- Same posture as rsvp_submissions: no direct client access — only the FastAPI
-- service role (which bypasses RLS) reads/writes this table.
alter table public.vendor_brief_links enable row level security;
