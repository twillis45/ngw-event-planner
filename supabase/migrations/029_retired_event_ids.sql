-- 029 — A deleted event's id is retired (security self-test, 11/17/2026, F1)
--
-- THE HOLE
--   public.events.id is any string the client sends, and the insert policy
--   checks only that the caller belongs to the studio named on the row (002).
--   Deleting an event leaves rows that are keyed on its id alone:
--   rsvp_submissions (guests' allergies, phone, email, mailing address),
--   vendor-brief and helper links and their confirmations, event_passes, guest
--   photos until the nightly purge, and event-files storage objects whose read
--   policy is "a member of the studio that owns the event in the path".
--   Every guest learns the id (the public invite returns it). So after a host
--   deleted an event, anyone could sign up, insert an event with that id into
--   their own studio — or PATCH one of theirs to that id — and the server's
--   studio check on the RECREATED row handed them the old guests' answers, the
--   paid pass, the old links and the old files.
--
-- THE RULE
--   An id that has been deleted is never an event again, and an event's id
--   never changes. A deleted event has no undo in the app (deleteThisEvent is
--   final), so nothing legitimate re-creates one.
--   · public.retired_event_ids records every deleted id (AFTER DELETE).
--   · BEFORE INSERT refuses a retired id; BEFORE UPDATE refuses any change of
--     id. Both raise, so the client's write fails loudly instead of landing.
--   · No browser role can read or write the record (RLS on, no policy, grants
--     revoked); the trigger functions are SECURITY DEFINER with a fixed
--     search_path and callable only as triggers.
--
-- NOT CHANGED HERE (owner question, recorded in the self-test report)
--   The rows a deleted event leaves behind are still kept; retiring the id
--   makes them unreachable through any new event. Whether RSVPs and brief
--   confirmations should be DELETED with the event (as 028 does for guest
--   questions and opens) is a retention decision, not a security fix.
--
-- ONE-TIME BACKFILL
--   Ids of events deleted before today are recovered from the tables that can
--   only hold a row for an event that EXISTED when the row was written: each
--   route resolves the event from public.events first (RSVP, brief, helper,
--   photo, pass). event_owners and event_channels are deliberately NOT used:
--   the communication route creates them for events not yet synced, and
--   retiring those ids would block their first save.

create table if not exists public.retired_event_ids (
  id         text primary key,
  retired_at timestamptz not null default now()
);
alter table public.retired_event_ids enable row level security;
revoke all on public.retired_event_ids from public, anon, authenticated;

create or replace function public.events_retire_id()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.retired_event_ids (id) values (old.id) on conflict (id) do nothing;
  return old;
end;
$$;
revoke all on function public.events_retire_id() from public, anon, authenticated;

create or replace function public.events_refuse_retired_id()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'an event''s id cannot change' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and exists (select 1 from public.retired_event_ids r where r.id = new.id) then
    raise exception 'that event was deleted; its id cannot be used again' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.events_refuse_retired_id() from public, anon, authenticated;

drop trigger if exists events_retire_id on public.events;
create trigger events_retire_id after delete on public.events
  for each row execute function public.events_retire_id();

drop trigger if exists events_refuse_retired_id on public.events;
create trigger events_refuse_retired_id before insert or update of id on public.events
  for each row execute function public.events_refuse_retired_id();

-- One-time: ids of events deleted before this migration.
do $$
declare t text;
begin
  foreach t in array array['rsvp_submissions','vendor_brief_links','vendor_brief_confirmations',
                           'helper_links','helper_confirmations','guest_photos','event_passes'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'insert into public.retired_event_ids (id)
           select distinct x.event_id from public.%I x
            where not exists (select 1 from public.events e where e.id = x.event_id)
         on conflict (id) do nothing', t);
    end if;
  end loop;
end $$;
