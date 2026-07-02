-- 0007_kcr.sql — Knowledge Change Request (KCR) store (KCR-4)
--
-- Server-backed persistence for the admin KCR backlog (the governed knowledge-change
-- work-objects — see src/lib/knowledge/knowledgeChange.js). Admin governance metadata:
-- NO host data, NO PII. Keyed by the DETERMINISTIC KCR id, so upsert = ON CONFLICT (id).
--
-- The server is a DUMB store: it upserts whatever the client sends (authoritative). The
-- progress-preserving merge (syncIntake) runs CLIENT-SIDE in one JS implementation
-- (kcrStore.mergeKCR/reconcileKCRs) — never duplicated in SQL/Python (EP-1). The full
-- KCR lives in `data` jsonb; the columns are indexed projections for filtering.
--
-- Run in Supabase → SQL Editor (after 0006). Best-effort; idempotent.

create table if not exists kcr (
  id          text        primary key,                     -- deterministic KCR id (dedupe key)
  data        jsonb       not null default '{}'::jsonb,     -- the full KCR object
  asset_id    text,
  asset_kind  text,
  type        text,
  trigger     text,
  status      text,
  priority    text,
  created_by  text,
  updated_at  timestamptz not null default now()
);
create index if not exists idx_kcr_status     on kcr (status, updated_at desc);
create index if not exists idx_kcr_asset       on kcr (asset_id);
create index if not exists idx_kcr_updated     on kcr (updated_at desc);

-- RLS: defense-in-depth. The API connects with a privileged role that bypasses RLS;
-- this ensures no anon/authenticated client can read or write directly — only
-- admin/support JWTs may SELECT, and there is NO write policy (only the privileged API
-- writes, through the admin-gated router).
alter table kcr enable row level security;

drop policy if exists "kcr: admin read" on kcr;
create policy "kcr: admin read" on kcr for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support'));
