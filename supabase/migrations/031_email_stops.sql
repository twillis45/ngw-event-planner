-- 031 — A stop link on every email a host sends through the app
--
-- Owner ruling 11/19/2026, decision 7: an unsubscribe line on invites. The
-- message route (backend/app/routers/communication.py) sends the invite batch,
-- the one-guest email and "Send it to" a vendor. Each email now carries a
-- "Stop emails about this event" link and a one-click List-Unsubscribe header,
-- keyed by one random token per (event, address). Opening the link shows a
-- button; the button stops that address for that event, and the route then
-- refuses to email it about that event. Until this table exists the route
-- sends exactly as before, without the link.
--
-- Only the server reads or writes it (service role); no browser role can.
-- Safe to re-apply.

create table if not exists public.email_stops (
  event_id   text        not null,
  email      text        not null,          -- lowercased address
  token      text        not null unique,   -- the emailed-link credential
  stopped_at timestamptz,                   -- null until the person stops
  created_at timestamptz not null default now(),
  primary key (event_id, email)
);
alter table public.email_stops enable row level security;
revoke all on public.email_stops from public, anon, authenticated;
