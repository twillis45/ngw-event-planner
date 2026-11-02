-- ─── 018: Row Level Security on the research-execution tables ─────────────────
--
-- 012_research_execution.sql created six tables in `public` with no RLS, on
-- the comment "All reads/writes go through FastAPI with require_admin — no RLS
-- needed." That reasoning covers the app's own door and misses the second one:
-- every table in `public` is also served by PostgREST at
-- `<project>.supabase.co/rest/v1/<table>`, and Supabase's default privileges
-- grant `anon` and `authenticated` on tables created in `public`. A table with
-- RLS disabled is therefore readable AND writable by anyone holding the
-- publishable anon key — which ships in the live bundle by design. For this
-- set that means a stranger could enqueue research jobs (provider spend),
-- rewrite findings, or read every campaign's blueprint.
--
-- The fix is the shape the backend already runs on for admin_error_log and
-- kas_records (backend/migrations/0006, 0008): RLS ENABLED, no policy for
-- anon/authenticated. The FastAPI service connects through DATABASE_URL as the
-- table-owning Postgres role, which non-forced RLS does not apply to, so the
-- research router keeps working unchanged. Nothing client-side touches these
-- tables (grep src/ hostv2/src: zero hits), so there is nothing to grant.
--
-- No policies are created on purpose. A later admin-read policy can be added
-- the way 0006 does it; until then the only path is the server.
--
-- Guarded by src/lib/__tests__/everyPublicTableHasRls.test.js, which reads this
-- folder and fails on any `create table` in public without a matching
-- `enable row level security` — so the next 012 cannot land quietly.
-- Idempotent: enabling RLS twice is a no-op.

alter table public.research_campaign_runs  enable row level security;
alter table public.research_queue_jobs     enable row level security;
alter table public.research_findings       enable row level security;
alter table public.research_evidence       enable row level security;
alter table public.research_observations   enable row level security;
alter table public.provider_run_logs       enable row level security;
