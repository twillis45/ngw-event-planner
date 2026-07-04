-- ─── KRE-2: Server Research Execution ────────────────────────────────────────
-- Tables that back the server-side research execution pipeline.
-- All reads/writes go through FastAPI with require_admin — no RLS needed.
-- set_updated_at() is already defined in migration 001_initial_schema.sql.
-- asyncpg-compatible; no Supabase-specific extensions beyond pgcrypto.

-- ─── 1. research_campaign_runs ────────────────────────────────────────────────
-- Execution state per research campaign run.
create table if not exists public.research_campaign_runs (
  id              text        primary key,          -- client-generated, e.g. run-crabFeast-1234
  campaign_id     text        not null,             -- references the KAS campaign
  playbook_type   text        not null,
  field_path      text        not null,
  gap_kind        text        not null,
  state           text        not null default 'queued',  -- queued/running/partial/complete/failed/cancelled
  blueprint       jsonb,                            -- ResearchBlueprint that drove this run
  execution_plan  jsonb,                            -- providers, policy
  summary         text,
  error           text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_rcr_state          on public.research_campaign_runs (state);
create index if not exists idx_rcr_playbook_type  on public.research_campaign_runs (playbook_type);
create index if not exists idx_rcr_field_path     on public.research_campaign_runs (field_path);

drop trigger if exists research_campaign_runs_updated_at on public.research_campaign_runs;
create trigger research_campaign_runs_updated_at
  before update on public.research_campaign_runs
  for each row execute procedure public.set_updated_at();

-- ─── 2. provider_run_logs ─────────────────────────────────────────────────────
-- Per-provider execution audit (append-only).
create table if not exists public.provider_run_logs (
  id               bigserial   primary key,
  run_id           text        not null references public.research_campaign_runs(id) on delete cascade,
  provider_id      text        not null,
  attempt          int         not null default 0,
  success          boolean     not null default false,
  records_produced int         not null default 0,
  failure_kind     text,                            -- timeout/unavailable/partial/duplicate/corrupt/unknown
  error_message    text,
  latency_ms       int,
  simulated        boolean     not null default false,  -- true = simulate mode, false = real fetch
  created_at       timestamptz not null default now()
);

create index if not exists idx_prl_run_id on public.provider_run_logs (run_id);

-- ─── 3. research_observations ────────────────────────────────────────────────
-- Server-produced observations (not synced from client).
create table if not exists public.research_observations (
  id            text        primary key,
  run_id        text        references public.research_campaign_runs(id) on delete cascade,
  provider_id   text        not null,
  playbook_type text        not null,
  field_path    text        not null,
  gap_type      text        not null,
  statement     text        not null,
  source        text,
  region        text,
  status        text        not null default 'open',  -- open/accepted/rejected/merged/flagged
  data          jsonb       not null default '{}',
  captured_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_ro_run_id     on public.research_observations (run_id);
create index if not exists idx_ro_field_path on public.research_observations (field_path);
create index if not exists idx_ro_status     on public.research_observations (status);

drop trigger if exists research_observations_updated_at on public.research_observations;
create trigger research_observations_updated_at
  before update on public.research_observations
  for each row execute procedure public.set_updated_at();

-- ─── 4. research_evidence ────────────────────────────────────────────────────
-- Server-produced evidence records.
create table if not exists public.research_evidence (
  id              text        primary key,
  run_id          text        references public.research_campaign_runs(id) on delete cascade,
  observation_id  text        references public.research_observations(id) on delete set null,
  playbook_type   text        not null,
  field_path      text        not null,
  authority       text,                             -- primary/official/standards/trade/community/expert
  confidence      text,                             -- high/medium/low
  data            jsonb       not null default '{}',
  captured_at     timestamptz not null default now()
);

create index if not exists idx_re_run_id     on public.research_evidence (run_id);
create index if not exists idx_re_field_path on public.research_evidence (field_path);

-- ─── 5. research_findings ─────────────────────────────────────────────────────
-- Server-produced findings (never auto-published).
create table if not exists public.research_findings (
  id              text        primary key,
  run_id          text        references public.research_campaign_runs(id) on delete cascade,
  playbook_type   text        not null,
  field_path      text        not null,
  gap_kind        text        not null,
  status          text        not null,             -- corroborated/contested/insufficient
  corroboration   int         not null default 0,
  data            jsonb       not null default '{}',
  kcr_draft_id    text,                             -- reference only; KCR record not stored here
  created_at      timestamptz not null default now()
);

create index if not exists idx_rf_run_id     on public.research_findings (run_id);
create index if not exists idx_rf_field_path on public.research_findings (field_path);
create index if not exists idx_rf_status     on public.research_findings (status);

-- ─── 6. research_queue_jobs ──────────────────────────────────────────────────
-- Pending/running/done job queue for batch scheduling.
create table if not exists public.research_queue_jobs (
  id           bigserial   primary key,
  run_id       text        not null references public.research_campaign_runs(id) on delete cascade,
  priority     text        not null default 'MED',  -- HIGH/MED/LOW
  state        text        not null default 'pending',  -- pending/running/done/failed/cancelled
  scheduled_at timestamptz,
  started_at   timestamptz,
  completed_at timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_rqj_state        on public.research_queue_jobs (state);
create index if not exists idx_rqj_priority     on public.research_queue_jobs (priority);
create index if not exists idx_rqj_scheduled_at on public.research_queue_jobs (scheduled_at);

-- ─── Tables created by this migration ────────────────────────────────────────
-- research_campaign_runs  — execution state per campaign run (queued→complete)
-- provider_run_logs       — append-only per-provider audit log (latency, success, simulate flag)
-- research_observations   — server-produced observations pending review (open/accepted/…)
-- research_evidence       — server-produced evidence records linked to observations
-- research_findings       — server-produced corroborated/contested/insufficient verdicts
-- research_queue_jobs     — batch scheduling queue (pending/running/done/failed/cancelled)
