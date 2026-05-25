-- ============================================================================
-- NGW Events — Event ownership (multi-tenant isolation)
-- Run in Supabase → SQL Editor after 0001_communication.sql.
--
-- Maps each event_id to the Supabase user who owns it. Ownership is claimed on
-- the first authenticated planner action against an event (claim-on-first-touch),
-- which also back-fills existing events the first time their owner signs in and
-- touches them. The FastAPI service enforces this (see app/auth.py / the comm
-- routes): a signed-in planner may only read the internal channel / write to
-- events they own. The public CLIENT read path is unaffected (clients aren't
-- authenticated). The legacy shared dev-token path skips ownership (single-planner).
-- ============================================================================

create table if not exists event_owners (
  event_id   text primary key,
  owner_id   text not null,          -- Supabase auth user id (uuid as text)
  owner_email text,
  created_at timestamptz default now()
);
create index if not exists idx_event_owners_owner on event_owners (owner_id);

-- Goes through the FastAPI service (DATABASE_URL role bypasses RLS), same as the
-- other comm tables. Enable RLS + no anon policies so a leaked anon key can't read it.
alter table event_owners enable row level security;
