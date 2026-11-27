-- 035 — her phone's time zone, beside the device (owner, 11/27/2026).
--
-- On the event day there is no hourly limit on alerts, and "the event day" is
-- the host's own: the zone her phone reports when she turns alerts on. The
-- event stores no zone, and a host who travels with the event takes her phone's
-- zone with her. Nullable: a device turned on before this, or a zone the server
-- did not recognize, falls back to US Eastern (as host reminders do).
-- Safe to re-apply.

alter table public.push_subscriptions add column if not exists tz text;

do $$ begin
  alter table public.push_subscriptions
    add constraint push_subscriptions_tz_len check (tz is null or char_length(tz) between 1 and 64);
exception when duplicate_object then null; end $$;
