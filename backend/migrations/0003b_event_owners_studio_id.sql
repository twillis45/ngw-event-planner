-- ============================================================================
-- NGW Events — event_owners.studio_id ONLY — the fresh-database stand-in for 0003
-- Run in Supabase → SQL Editor after 0002_event_owners.sql, INSTEAD OF 0003.
--
-- Owner decision (11/6/2026): on a NEW database, skip 0003_studios.sql. Its
-- studios / studio_members tables, helpers and provisioning trigger are owned by
-- the canonical supabase/migrations (001, 003, 010, 011) and must not be
-- defined twice. The ONE thing 0003 adds that the backend still needs is
-- event_owners.studio_id (routers/communication.py writes and reads it;
-- routers/rsvp.py scopes access through it). This file adds exactly that,
-- copied from 0003's "Comms ownership → studio-scoped" section, and nothing else.
--
-- Idempotent: safe on a database where 0003 already ran.
-- ============================================================================
alter table event_owners add column if not exists studio_id uuid;
create index if not exists idx_event_owners_studio on event_owners (studio_id);
-- Backfill: map each owned event's owner to that owner's studio.
-- event_owners.owner_id is TEXT (uuid-as-text); studio_members.user_id is UUID —
-- so the join must cast, or Postgres errors "operator does not exist: uuid = text".
update event_owners eo
   set studio_id = m.studio_id
  from studio_members m
 where eo.studio_id is null and m.user_id::text = eo.owner_id and m.role = 'owner';
