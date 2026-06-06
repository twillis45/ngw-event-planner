-- 0005_admin_support.sql — Admin / Support v1 (A1 foundation)
--
-- Two backend-owned tables on the same Supabase Postgres the API pool connects to
-- (see app/db.py → DATABASE_URL). The admin ROLE itself is NOT stored here — it
-- lives in the Supabase user's app_metadata.role (server-controlled; users cannot
-- set it themselves). See app/auth.require_admin.
--
-- Grant yourself admin (run once in the Supabase SQL editor / service role):
--   update auth.users
--      set raw_app_meta_data =
--          coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--    where email = 'todd@toddwillisphoto.com';
-- Revoke: || '{"role":"planner"}'::jsonb (or remove the key).

create extension if not exists pgcrypto;

-- Append-only notes about a user/workspace. Corrections are NEW rows, never edits.
create table if not exists admin_support_notes (
  id              uuid primary key default gen_random_uuid(),
  subject_user_id text        not null,
  author_id       text        not null,
  author_name     text,
  body            text        not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_support_notes_subject
  on admin_support_notes (subject_user_id, created_at desc);

-- Immutable audit of every admin action. No UPDATE/DELETE is issued by app code.
create table if not exists admin_audit_log (
  id          uuid        primary key default gen_random_uuid(),
  actor_id    text        not null,
  actor_name  text,
  action      text        not null,
  target_type text,
  target_id   text,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on admin_audit_log (created_at desc);
create index if not exists idx_audit_target  on admin_audit_log (target_type, target_id);

-- RLS: the API connects with a privileged role that bypasses RLS, so these
-- policies are defense-in-depth against any direct access using the browser anon
-- key. Only admin/support JWTs may SELECT; there is no write policy, so under RLS
-- no anon/authenticated client can INSERT/UPDATE/DELETE — only the privileged API.
alter table admin_support_notes enable row level security;
alter table admin_audit_log     enable row level security;

drop policy if exists "support_notes: admin read" on admin_support_notes;
create policy "support_notes: admin read" on admin_support_notes for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support'));

drop policy if exists "audit_log: admin read" on admin_audit_log;
create policy "audit_log: admin read" on admin_audit_log for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support'));
