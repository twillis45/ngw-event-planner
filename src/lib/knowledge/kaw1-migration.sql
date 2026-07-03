-- KAW-1: Autonomous Knowledge Acquisition Platform — Server Infrastructure (Bundle M)
-- Run manually in Supabase SQL editor. All tables are admin-scoped with RLS enforced.
-- Mirrors the localStorage-backed data models in knowledgeWorkers.js, providerMonitor.js,
-- and the existing observation/evidence/finding/campaign system.
-- NEVER auto-applied. Human deploys manually after review.
--
-- Migration: 0007_kaw1_autonomous_acquisition.sql

-- ── Worker instances ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_instances (
  id              TEXT PRIMARY KEY,
  type_id         TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  asset_id        TEXT,
  provider_family TEXT,
  field_path      TEXT,
  cadence         TEXT NOT NULL DEFAULT 'daily',
  enabled         BOOLEAN NOT NULL DEFAULT true,
  assigned_to     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at     TIMESTAMPTZ,
  last_run_status TEXT,
  run_count       INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}'
);

-- ── Worker runs ────────────────────────────────────────────────────────────────
-- Immutable log of every worker execution.
CREATE TABLE IF NOT EXISTS worker_runs (
  id              TEXT PRIMARY KEY,
  worker_id       TEXT REFERENCES worker_instances(id) ON DELETE SET NULL,
  type_id         TEXT NOT NULL,
  asset_id        TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'scheduler',  -- scheduler | manual | campaign | emergency
  status          TEXT NOT NULL DEFAULT 'running',    -- running | complete | failed | skipped
  outputs         JSONB DEFAULT '{}',
  error_message   TEXT,
  duration_ms     INTEGER,
  at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- ── Provider check log ────────────────────────────────────────────────────────
-- Records when each provider family was last checked. Used by overdueProviders().
CREATE TABLE IF NOT EXISTS provider_check_log (
  id              BIGSERIAL PRIMARY KEY,
  family          TEXT NOT NULL,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'ok',    -- ok | failed | unavailable | rate-limited
  observation_count INTEGER DEFAULT 0,
  change_count    INTEGER DEFAULT 0,
  notes           TEXT,
  run_id          TEXT REFERENCES worker_runs(id) ON DELETE SET NULL
);

-- ── Change records ─────────────────────────────────────────────────────────────
-- Output of change-detection-worker. Never modifies knowledge.
CREATE TABLE IF NOT EXISTS change_records (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  field_path      TEXT,
  change_type     TEXT NOT NULL,
  significance    TEXT NOT NULL DEFAULT 'low',  -- critical | high | med | low | none
  detail          JSONB,
  all_changes     JSONB DEFAULT '[]',
  prev_obs_id     TEXT,
  next_obs_id     TEXT,
  provider        TEXT,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  needs_review    BOOLEAN NOT NULL DEFAULT true,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_by     TEXT,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT
);

-- ── Research pipeline manifests (server-side mirror of researchPipeline.js) ───
CREATE TABLE IF NOT EXISTS research_pipeline_manifests (
  id              TEXT PRIMARY KEY,
  playbook_id     TEXT NOT NULL,
  asset_id        TEXT NOT NULL,
  field_path      TEXT,
  campaign_id     TEXT,
  gap_type        TEXT,
  assigned_to     TEXT,
  current_stage   TEXT NOT NULL DEFAULT 'discover',
  status          TEXT NOT NULL DEFAULT 'active',  -- active | blocked | complete | abandoned
  stages          JSONB NOT NULL DEFAULT '{}',
  kcr_ids         JSONB DEFAULT '[]',
  evidence_count  INTEGER DEFAULT 0,
  finding_count   INTEGER DEFAULT 0,
  contradiction_count INTEGER DEFAULT 0,
  impact_estimate JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  audit           JSONB DEFAULT '[]'
);

-- ── Scheduler jobs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduler_jobs (
  id              BIGSERIAL PRIMARY KEY,
  worker_type_id  TEXT NOT NULL,
  asset_id        TEXT,
  cadence         TEXT NOT NULL,            -- hourly | daily | weekly | monthly | seasonal | manual
  next_run_at     TIMESTAMPTZ NOT NULL,
  last_run_at     TIMESTAMPTZ,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  trigger         TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | event | emergency | manual
  metadata        JSONB DEFAULT '{}'
);

-- ── Research metrics ───────────────────────────────────────────────────────────
-- Derived operational metrics. Populated by workers; read by Corpus dashboard.
CREATE TABLE IF NOT EXISTS research_metrics (
  id              BIGSERIAL PRIMARY KEY,
  metric_date     DATE NOT NULL,
  campaigns_started INTEGER DEFAULT 0,
  campaigns_completed INTEGER DEFAULT 0,
  evidence_collected INTEGER DEFAULT 0,
  evidence_rejected INTEGER DEFAULT 0,
  findings_created INTEGER DEFAULT 0,
  contradictions_resolved INTEGER DEFAULT 0,
  kcrs_created    INTEGER DEFAULT 0,
  kcrs_published  INTEGER DEFAULT 0,
  validation_achieved INTEGER DEFAULT 0,
  debt_removed    INTEGER DEFAULT 0,
  worker_runs     INTEGER DEFAULT 0,
  worker_failures INTEGER DEFAULT 0
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_worker_runs_type ON worker_runs (type_id);
CREATE INDEX IF NOT EXISTS idx_worker_runs_at ON worker_runs (at DESC);
CREATE INDEX IF NOT EXISTS idx_change_records_asset ON change_records (asset_id);
CREATE INDEX IF NOT EXISTS idx_change_records_significance ON change_records (significance) WHERE needs_review AND NOT resolved;
CREATE INDEX IF NOT EXISTS idx_provider_check_family ON provider_check_log (family, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON research_pipeline_manifests (status, asset_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_next ON scheduler_jobs (next_run_at) WHERE enabled;

-- ── RLS ────────────────────────────────────────────────────────────────────────
-- All tables are admin-only. No public access.
ALTER TABLE worker_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_check_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_pipeline_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (adjust role name to match your Supabase setup)
CREATE POLICY "admin-only" ON worker_instances FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin-only" ON worker_runs FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin-only" ON provider_check_log FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin-only" ON change_records FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin-only" ON research_pipeline_manifests FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin-only" ON scheduler_jobs FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin-only" ON research_metrics FOR ALL USING (auth.role() = 'service_role' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── Notes ──────────────────────────────────────────────────────────────────────
-- 1. observations, evidence, findings, campaigns tables already exist (KAS pipeline)
-- 2. Run this AFTER migration 0006 (admin console baseline)
-- 3. No foreign keys to observations/evidence/campaigns because those use TEXT IDs in localStorage
-- 4. change_records.prev_obs_id and next_obs_id are soft references, not FK constraints
-- 5. After deploying, update AdminConsole Worker fleet to read from worker_runs instead of localStorage
