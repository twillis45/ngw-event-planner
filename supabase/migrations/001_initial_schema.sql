-- ─── NGW Event Boss — Phase 2 app data schema (STUDIO-scoped) ────────────────
-- Events and clients are owned by a STUDIO (multi-tenant teams), not a single
-- user — any member of the studio can read/write. See docs/MULTITENANCY.md.
-- JSONB-first: each row stores its full object graph in `data` so the frontend
-- round-trips without JOINs; relational columns stay typed for RLS + indexes.
--
-- The studios / studio_members / is_studio_member helpers below mirror
-- backend/migrations/0003_studios.sql and are written idempotently, so running
-- this after 0003 (or standalone) is safe. Run via Supabase SQL editor or
-- `supabase db push`.

create extension if not exists pgcrypto;

-- ─── Studios (mirror of 0003 — idempotent) ───────────────────────────────────
create table if not exists public.studios (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  plan       text not null default 'free',
  created_by uuid,
  created_at timestamptz default now()
);
create table if not exists public.studio_members (
  studio_id  uuid not null references public.studios(id) on delete cascade,
  user_id    uuid not null,
  role       text not null default 'planner' check (role in ('owner','planner','assistant')),
  created_at timestamptz default now(),
  primary key (studio_id, user_id)
);
create index if not exists idx_studio_members_user on public.studio_members (user_id);

create or replace function public.is_studio_member(p_studio uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.studio_members m
                 where m.studio_id = p_studio and m.user_id = auth.uid());
$$;

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ─── events (studio-scoped) ───────────────────────────────────────────────────
create table if not exists public.events (
  id          text        primary key,        -- client-generated id
  studio_id   uuid        not null references public.studios(id) on delete cascade,
  data        jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute procedure public.set_updated_at();

-- ─── clients (studio-scoped) ──────────────────────────────────────────────────
create table if not exists public.clients (
  id          text        primary key,
  studio_id   uuid        not null references public.studios(id) on delete cascade,
  data        jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS immediately (deny-by-default until 002 adds studio policies) ──
-- Enabling RLS here (not just in 002) means the tables are never exposed to the
-- anon/authenticated keys in the window between running 001 and 002.
alter table public.studios        enable row level security;
alter table public.studio_members enable row level security;
alter table public.events         enable row level security;
alter table public.clients        enable row level security;

-- ─── Indexes (studio_id is the hot path) ──────────────────────────────────────
create index if not exists events_studio_id_idx   on public.events(studio_id);
create index if not exists clients_studio_id_idx   on public.clients(studio_id);
create index if not exists events_updated_at_idx   on public.events(updated_at desc);
create index if not exists clients_updated_at_idx  on public.clients(updated_at desc);
