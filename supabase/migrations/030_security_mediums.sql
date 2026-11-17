-- 030 — Three of the self-test's Medium findings (11/17/2026), database side
--
-- docs/audits/2026-11-17_SECURITY_SELF_TEST.md: M1 (the pass stamp), M5 (studio
-- invitations), and the counter table M2 and M4 count in. Each part stands
-- alone; create-or-replace / if-not-exists throughout, safe to re-apply.
--
-- ── M1 · THE PASS STAMP STICKS ──────────────────────────────────────────────
-- vendor_brief.py's door 2 locks a destination or multi-day event on the
-- passRequired/passReasons stamp written at creation (the grandfather rule:
-- events created before the pass stay free). The stamp lives in events.data,
-- which the host writes through the browser, so deleting it unlocked the brief
-- without paying. Now:
--   · UPDATE: once an event carries passRequired=true, its stamp is carried
--     forward whatever the write says. Nothing else in data is touched.
--   · INSERT: an event that says it is a trip (isDestination=true) or spans
--     days (endDate after date, or statedNights>0) is stamped even if the
--     client left the stamp off. Every id, not only the cust-*/ev-copy-* ids the
--     client gates: the brief gate applies to any id, and samples never reach
--     this table, so an id the client would not gate is one the client did not
--     write. These are a SUBSET of
--     the client's own rule (passGate.passVerdictAtCreation + eventSpan.spanIntel,
--     minus the taxonomy "usually runs more than a day"), so the server never
--     stamps an event the client calls free.
--   · Events created unstamped before today are untouched (grandfathered).
--
-- ── M5 · AN INVITATION CANNOT MAKE YOU AN OWNER, OR BE FORGED ────────────────
-- Any owner could invite any email as role 'owner' with any invited_by; the
-- invitee joined at sign-in, and a client choosing "the owner studio" from an
-- unordered list could then write her new events into the inviter's studio.
-- Invitations are now written only as planner/assistant, with invited_by = the
-- caller. No shipped interface creates invitations (inviteStudioMember has no
-- caller), so nothing legitimate changes. Unsolicited planner-role joins on the
-- legacy shell remain, and are recorded as a Low in the report.
--
-- ── M2 + M4 · A COUNTER THE SERVER KEEPS ─────────────────────────────────────
-- AI calls per user per day and co-host invite emails per event per day were
-- limited in process memory or not at all. public.rate_counters holds one row
-- per (key, day); only the server (service role) reads or writes it.

-- M1
create or replace function public.events_pass_stamp_sticks()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  reasons jsonb;
  d text;
  e text;
begin
  if tg_op = 'UPDATE' then
    if coalesce(old.data->>'passRequired', '') = 'true' then
      new.data := jsonb_set(
        jsonb_set(coalesce(new.data, '{}'::jsonb), '{passRequired}', 'true'::jsonb),
        '{passReasons}', coalesce(old.data->'passReasons', '[]'::jsonb));
    end if;
    return new;
  end if;

  begin
    reasons := case when jsonb_typeof(new.data->'passReasons') = 'array'
                    then new.data->'passReasons' else '[]'::jsonb end;
    if coalesce(new.data->>'isDestination', '') = 'true' and not reasons ? 'destination' then
      reasons := reasons || '["destination"]'::jsonb;
    end if;
    d := left(coalesce(new.data->>'date', ''), 10);
    e := left(coalesce(new.data->>'endDate', ''), 10);
    if not reasons ? 'multi-day' and (
         (d ~ '^\d{4}-\d{2}-\d{2}$' and e ~ '^\d{4}-\d{2}-\d{2}$' and e > d)
         or coalesce(new.data->>'statedNights', '') ~ '^[1-9][0-9]*$') then
      reasons := reasons || '["multi-day"]'::jsonb;
    end if;
    if reasons ? 'destination' or reasons ? 'multi-day' then
      new.data := jsonb_set(jsonb_set(new.data, '{passRequired}', 'true'::jsonb), '{passReasons}', reasons);
    end if;
  end;
  return new;
end;
$$;
revoke all on function public.events_pass_stamp_sticks() from public, anon, authenticated;

drop trigger if exists events_pass_stamp_sticks on public.events;
create trigger events_pass_stamp_sticks before insert or update of data on public.events
  for each row execute function public.events_pass_stamp_sticks();

-- M5
drop policy if exists "invitations: owner write" on public.studio_invitations;
create policy "invitations: owner write" on public.studio_invitations for all
  using (public.is_studio_owner(studio_id))
  with check (public.is_studio_owner(studio_id)
              and invited_by = auth.uid()
              and role in ('planner', 'assistant'));

-- M2 + M4
create table if not exists public.rate_counters (
  key  text not null,
  day  date not null default current_date,
  n    integer not null default 0,
  primary key (key, day)
);
alter table public.rate_counters enable row level security;
revoke all on public.rate_counters from public, anon, authenticated;
