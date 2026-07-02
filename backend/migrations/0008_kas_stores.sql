-- 0008 — KAS knowledge stores (KEP-3 Bundle B)
-- Server-backed persistence for the manufacturing objects: observations, evidence,
-- findings, knowledge overrides, and research campaigns. One generic record table keyed by
-- `kind` (the client owns all merge/lifecycle logic — the server is a dumb store, like kcr).
-- Admin-scoped governance metadata: no host data, no PII.
--
-- Optimistic concurrency uses updated_at (same discipline as kcr / 0007). Writes go through
-- the service-role backend (kas.py); RLS grants admin/support READ only.

create table if not exists kas_records (
  id          text primary key,
  kind        text not null,          -- observation | evidence | finding | override | campaign
  data        jsonb not null,
  asset_id    text,
  created_by  text,
  updated_at  timestamptz not null default now()
);

create index if not exists kas_records_kind_idx    on kas_records (kind);
create index if not exists kas_records_asset_idx   on kas_records (asset_id);
create index if not exists kas_records_updated_idx on kas_records (updated_at desc);

alter table kas_records enable row level security;

-- Admin/support may READ; no client WRITE policy (service-role backend performs writes).
drop policy if exists "kas: admin read" on kas_records;
create policy "kas: admin read" on kas_records
  for select
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'support'));
