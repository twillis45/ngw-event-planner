-- ─── NGW Event Boss — Guest RSVP submissions (P0 RSVP persistence) ────────────
-- Canonical, integration-watched migration (see this folder's README). This is a
-- SHARED table, so it lives here — never in backend/migrations.
--
-- WHY THIS TABLE EXISTS
--   Until now a guest RSVP was written only to the host's own browser
--   (localStorage `ngw-rsvp-queue-${id}`). A *stranger's* browser holds no copy of
--   the event and has no way to deliver a reply to the host. This table is the real
--   server-side mailbox: a public, unauthenticated guest POST lands here, and the
--   authenticated host reads it back server-side (the FastAPI service / DB role
--   that bypasses RLS) — so an RSVP from ANY browser reaches the host.
--
-- event_id is TEXT (the app's string ids like 'ev-wedding' / a uid()), matching
-- public.events(id). The event is resolved from rsvp_code SERVER-SIDE; the client
-- never supplies a trusted event_id. No hard FK: some demo/local events never reach
-- Postgres, so the rsvp_code lookup (not a constraint) is the integrity boundary.

create extension if not exists pgcrypto;

create table if not exists public.rsvp_submissions (
  id               uuid primary key default gen_random_uuid(),
  event_id         text        not null,                 -- resolved server-side from rsvp_code
  rsvp_code        text        not null,                 -- the public invite code (?rsvp=CODE)
  idempotency_key  text        not null,                 -- client-generated, stable per form instance
  guest_name       text,
  rsvp             text        check (rsvp in ('Yes','No','Maybe')),
  meal             text,
  needs            text,                                  -- SENSITIVE: allergy / dietary (health data)
  plus_one         text,
  plus_one_meal    text,
  plus_one_needs   text,                                  -- SENSITIVE: allergy / dietary (health data)
  kids             int         default 0,
  note             text,                                  -- SENSITIVE: free-text note to host
  submitted_at     timestamptz default now(),
  updated_at       timestamptz default now(),
  -- Idempotency: a retry / double-tap with the SAME (rsvp_code, idempotency_key)
  -- UPDATES the existing row instead of inserting a duplicate. See the upsert in
  -- backend/app/routers/rsvp.py (ON CONFLICT (rsvp_code, idempotency_key)).
  unique (rsvp_code, idempotency_key)
);

-- Hot paths: public POST resolves/writes by rsvp_code; host read-back lists the
-- newest submissions for an event.
create index if not exists idx_rsvp_code        on public.rsvp_submissions (rsvp_code);
create index if not exists idx_rsvp_event_time  on public.rsvp_submissions (event_id, submitted_at desc);

-- ── events.rsvpCode uniqueness + lookup perf (P0 security review) ─────────────
-- The public resolver looks up an event by exact data->>'rsvpCode'. Two problems
-- this index fixes:
--   1) UNIQUENESS — without a uniqueness constraint two events could share an
--      rsvpCode, and the resolver's `limit 1` would deliver one guest's RSVP to the
--      wrong event. A unique index makes a duplicate code impossible to persist.
--   2) PERF — turns the per-request public lookup from a seq scan into an index scan.
-- Partial (where the key is non-null/non-empty) so legacy/demo events that never set
-- an rsvpCode don't collide on NULL and aren't forced to carry a code.
create unique index if not exists uq_events_rsvp_code
  on public.events ((data->>'rsvpCode'))
  where (data->>'rsvpCode') is not null and (data->>'rsvpCode') <> '';

-- updated_at maintenance — reuse the shared set_updated_at() from 001_initial_schema.
drop trigger if exists rsvp_submissions_updated_at on public.rsvp_submissions;
create trigger rsvp_submissions_updated_at before update on public.rsvp_submissions
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- anon = INSERT-ONLY. A stranger's browser (Supabase anon key) may submit an RSVP
-- but may NEVER read this table — no SELECT policy for anon means strangers can't
-- enumerate or read other guests' replies (names, allergies, notes are PII).
--
-- Host read-back does NOT use the anon key: it runs server-side through the FastAPI
-- service, which connects with the Postgres role from DATABASE_URL (that role
-- BYPASSES RLS — the same "service role" path the communication ledger uses). So the
-- only browser-reachable capability here is "insert my own RSVP".
--
-- NOTE: the current frontend submits via the FastAPI public POST (also the service
-- path), NOT the anon key. The anon INSERT policy below is defense in depth so that
-- *if* a direct supabase-js insert is ever wired, anon stays insert-only and can
-- never read the table.
alter table public.rsvp_submissions enable row level security;

drop policy if exists rsvp_anon_insert on public.rsvp_submissions;
create policy rsvp_anon_insert
  on public.rsvp_submissions
  for insert
  to anon, authenticated
  with check (true);   -- inserts allowed; no select/update/delete policy ⇒ those are denied for these roles

-- (Deliberately NO select/update/delete policy for anon/authenticated ⇒ those
--  operations are denied for the browser keys. The service role bypasses RLS.)

-- ── PII / RETENTION ──────────────────────────────────────────────────────────
-- This table holds guest PII: names, dietary/allergy needs (health data), and
-- free-text notes. Encryption at rest is provided by the platform — Supabase
-- Postgres volumes are encrypted at rest, with TLS in transit. Application-layer
-- field encryption is out of scope for P0.
--
-- Retention: purge submissions a configurable window after the event date. This
-- helper deletes submissions whose resolved event date is older than
-- `older_than_days` (default 90). Schedule it (Supabase cron / pg_cron / a nightly
-- job hitting an admin endpoint) — it is NOT auto-scheduled here.
--
--   -- one-off / cron invocation:
--   select public.purge_old_rsvp_submissions(90);
--
-- It joins to public.events to read data->>'date'; submissions whose event row is
-- gone fall back to submitted_at age so orphans are still reaped.
create or replace function public.purge_old_rsvp_submissions(older_than_days int default 90)
returns int language plpgsql security definer as $$
declare
  removed int;
begin
  with doomed as (
    select s.id
    from public.rsvp_submissions s
    left join public.events e on e.id = s.event_id
    where coalesce(
            (nullif(e.data->>'date',''))::timestamptz,   -- event date when parseable
            s.submitted_at                                 -- else fall back to submission age
          ) < now() - make_interval(days => older_than_days)
  )
  delete from public.rsvp_submissions s using doomed d
  where s.id = d.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ── Schedule retention nightly (pg_cron) ─────────────────────────────────────
-- The purge fn above is a no-op unless something calls it. Schedule it to run every
-- night at 04:00 UTC. Guarded so the migration still applies on projects where the
-- pg_cron extension isn't available (it just skips scheduling, and an operator must
-- enable pg_cron + re-run this block, OR call purge_old_rsvp_submissions(90) from a
-- nightly external job / admin endpoint).
--
-- On Supabase, pg_cron lives in the `cron` schema (enable via Dashboard → Database →
-- Extensions, or `create extension pg_cron`). cron.schedule() upserts by job name, so
-- re-running this migration is idempotent.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-rsvps',
      '0 4 * * *',
      $cron$ select public.purge_old_rsvp_submissions(90); $cron$
    );
  else
    raise notice 'pg_cron not installed — RSVP retention NOT scheduled. Enable pg_cron and re-run, or run purge_old_rsvp_submissions(90) from a nightly job.';
  end if;
end
$$;
