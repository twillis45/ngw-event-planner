-- 032 — The week-before reminder goes to a host once, and only once
--
-- Owner ruling 11/19/2026 (plan G87): "Plan reminders go to all with one-click
-- unsubscribe." The first one is the week-before reminder: a daily job
-- (backend/scripts/send_host_reminders.py, the `ngw-host-reminders` cron in
-- render.yaml) emails an event's host when the event is 7 days away. This
-- table is how the job knows it already did: one row per (event, reminder
-- kind), written BEFORE the email is handed to Resend, so a restart, a second
-- run or a second process can never send it again. Until this table exists the
-- job sends nothing and logs that 032 is missing.
--
-- No address is stored: the host is looked up from the studio owner each run.
-- Only the server reads or writes it (service role); no browser role can.
-- Safe to re-apply.

create table if not exists public.host_reminders_sent (
  event_id text        not null,
  kind     text        not null,            -- 'week_before'
  sent_at  timestamptz not null default now(),
  primary key (event_id, kind)
);
alter table public.host_reminders_sent enable row level security;
revoke all on public.host_reminders_sent from public, anon, authenticated;
