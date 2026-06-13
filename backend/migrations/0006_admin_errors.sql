-- 0006_admin_errors.sql — Admin / Support: server-side error log (A3-err)
--
-- A backend-owned error feed on the same Supabase Postgres the API pool connects
-- to (see app/db.py → DATABASE_URL). Captures SERVER-side failures that frontend
-- Sentry structurally cannot see: AI-proxy (OpenAI) errors, email/DocuSign/Stripe
-- failures, and unhandled API exceptions. Browser-side errors (CSP, frontend
-- crashes) still live in Sentry — the console says so and does not pretend
-- otherwise. A Sentry-API proxy can layer on later for full coverage.
--
-- Best-effort writes (app/error_log.record_error): a logging failure must never
-- break the request that triggered it.

create extension if not exists pgcrypto;

create table if not exists admin_error_log (
  id          uuid        primary key default gen_random_uuid(),
  source      text        not null,                       -- 'ai_proxy' | 'api' | 'email' | …
  level       text        not null default 'error',       -- 'error' | 'warning'
  message     text        not null,
  context     jsonb       not null default '{}'::jsonb,    -- path, user, feature, status…
  created_at  timestamptz not null default now()
);
create index if not exists idx_error_log_created on admin_error_log (created_at desc);
create index if not exists idx_error_log_source  on admin_error_log (source, created_at desc);

-- RLS: defense-in-depth (the API connects with a privileged role that bypasses
-- RLS). Only admin/support JWTs may SELECT; no write policy, so no anon/
-- authenticated client can INSERT/UPDATE/DELETE — only the privileged API.
alter table admin_error_log enable row level security;

drop policy if exists "error_log: admin read" on admin_error_log;
create policy "error_log: admin read" on admin_error_log for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support'));
