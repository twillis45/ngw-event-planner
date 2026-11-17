-- ─── NGW Event Boss — Deleting an event drops its guest activity at once ─────
-- Canonical, integration-watched migration (see this folder's README).
--
-- OWNER RULING 11/16/2026: "Drop them with the event."
--   Until now, deleting an event left its guest questions (guest_threads and
--   their guest_messages), the email addresses guests gave for answers, and
--   the invite-open records (invite_opens, invite_open_days,
--   invite_open_devices) in place until 024's nightly purge, up to 90 days
--   later. The event was gone from the host's screen; the guests' details
--   were not gone from the database.
--
-- HOW
--   hostv2 deletes an event straight from the browser
--   (src/lib/api/events.deleteEvent), so no server route sees it. An AFTER
--   DELETE trigger on public.events removes the five tables' rows for that
--   event id in the same transaction: the event and its guest activity go
--   together or not at all. The browser has no privilege on those tables
--   (024 revokes everything), so the trigger function is SECURITY DEFINER,
--   with the fixed search_path every definer here uses, and revoked from
--   public, anon and authenticated: it runs only as the trigger.
--
--   It also covers the other ways an event row goes: account deletion
--   (cleanup_deleted_account deletes the account's events) and anything the
--   service role deletes.
--
-- NOT CHANGED
--   · Announcements (027) already go with their event (foreign key cascade).
--   · Guest photos (025): their FILES must be removed through the Storage API,
--     which SQL cannot call. A photo whose event row is gone is already due
--     at the next nightly run, and unreachable until then (025's comment).
--   · 024's 90-day purge stays: it still retires activity on events that are
--     kept.
--
-- ONE-TIME CLEANUP
--   Rows whose event row is already gone (events deleted before this
--   migration) are removed below, so the ruling applies to them too. Every
--   thread and open was created against an existing event row (the routes
--   resolve the event from the invite code first), so a missing row means a
--   deleted event.

create or replace function public.events_drop_guest_activity()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  delete from public.guest_threads where event_id = old.id;   -- guest_messages cascade
  delete from public.guest_messages where event_id = old.id;  -- belt and braces: none should remain
  delete from public.invite_opens where event_id = old.id;
  delete from public.invite_open_days where event_id = old.id;
  delete from public.invite_open_devices where event_id = old.id;
  return old;
end;
$$;
revoke all on function public.events_drop_guest_activity() from public, anon, authenticated;

drop trigger if exists events_drop_guest_activity on public.events;
create trigger events_drop_guest_activity after delete on public.events
  for each row execute function public.events_drop_guest_activity();

-- One-time: activity left behind by events deleted before today.
delete from public.guest_threads t
  where not exists (select 1 from public.events e where e.id = t.event_id);
delete from public.guest_messages m
  where not exists (select 1 from public.events e where e.id = m.event_id);
delete from public.invite_opens o
  where not exists (select 1 from public.events e where e.id = o.event_id);
delete from public.invite_open_days d
  where not exists (select 1 from public.events e where e.id = d.event_id);
delete from public.invite_open_devices v
  where not exists (select 1 from public.events e where e.id = v.event_id);
