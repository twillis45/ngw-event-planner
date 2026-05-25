-- ============================================================================
-- NGW Events — Communication ledger (FastAPI + Supabase Postgres)
-- Run in Supabase → SQL Editor.
--
-- NOTE: event_id is TEXT (the app's string ids like 'ev-wedding'), NOT uuid.
-- There is no `events` table in Postgres yet, so there is no FK to events(id).
-- TODO(schema): once events are migrated into Postgres, add:
--   alter table event_channels add constraint fk_event foreign key (event_id) references events(id) on delete cascade;
-- (and the same on the other tables).
-- ============================================================================

create table if not exists event_channels (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null,
  channel_type text not null check (channel_type in ('CLIENT','INTERNAL_TEAM')),
  label        text not null,
  visibility   text not null check (visibility in ('client','internal')),
  created_at   timestamptz default now(),
  unique (event_id, channel_type)
);

create table if not exists event_messages (
  id               uuid primary key default gen_random_uuid(),
  event_id         text not null,
  channel_id       uuid not null references event_channels(id) on delete cascade,
  message_type     text not null check (message_type in ('standard','approval_request','operational_update','guest_impact_summary')),
  author_role      text not null check (author_role in ('planner','client','system')),
  author_name      text,
  body             text,
  approval_status  text check (approval_status is null or approval_status in ('pending','approved','rejected','expired')),
  approval_context text,
  required_by      timestamptz,
  pinned           boolean default false,
  pinned_at        timestamptz,
  pinned_by        text,
  metadata         jsonb default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  deleted_at       timestamptz
);
create index if not exists idx_msg_event_created   on event_messages (event_id, created_at desc);
create index if not exists idx_msg_channel_created on event_messages (channel_id, created_at desc);
create index if not exists idx_msg_channel_active  on event_messages (channel_id) where deleted_at is null;
create index if not exists idx_msg_type            on event_messages (message_type);
create index if not exists idx_msg_approval        on event_messages (approval_status);

create table if not exists pinned_decisions (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null,
  channel_id uuid not null references event_channels(id) on delete cascade,
  message_id uuid not null references event_messages(id) on delete cascade,
  label      text default 'Decision',
  pinned_by  text,
  created_at timestamptz default now(),
  unique (channel_id, message_id)
);

create table if not exists channel_read_state (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null,
  channel_id   uuid not null references event_channels(id) on delete cascade,
  reader_key   text not null,
  last_read_at timestamptz default now(),
  unread_count integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (channel_id, reader_key)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- All access goes through the FastAPI service using the DB connection string,
-- NOT the anon key from the browser. So the browser never touches these tables.
-- Enable RLS + deny anon so a leaked anon key can't read comms directly.
alter table event_channels     enable row level security;
alter table event_messages     enable row level security;
alter table pinned_decisions   enable row level security;
alter table channel_read_state enable row level security;
-- No policies for the anon role = anon denied. The FastAPI service connects with
-- the Postgres role from DATABASE_URL (bypasses RLS), which is the intended path.
-- TODO(auth): when clients/guests get direct access, add tokenized policies here.
