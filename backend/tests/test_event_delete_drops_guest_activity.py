"""Deleting an event drops its guest activity at once (owner, 11/16/2026).

"Drop them with the event": migration 028's trigger on a REAL PostgreSQL.
Disposable-database fixture, like test_event_cohosts_rls.py:
NGW_GUESTDROP_TEST_DATABASE_URL must name an EMPTY database whose name starts
ngw_guestdrop_test; everything runs in one transaction that rolls back.
Skipped when the variable is unset (CI has no database).

It applies 001 + 002 (studios, events, rules) and 024 (guest questions and
invite opens), seeds two events plus activity left behind by an event deleted
before 028, applies 028, then deletes one event AS THE HOST from the browser
role, which has no privilege on the guest tables. Red-proofed 11/16/2026:
without 028 the deleted event's threads, guest emails and opens all remain.
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest

DSN = os.environ.get("NGW_GUESTDROP_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="requires an explicit empty disposable PostgreSQL database")
ROOT = Path(__file__).resolve().parents[2] / "supabase/migrations"
BEFORE = ["001_initial_schema.sql", "002_rls_policies.sql", "024_guest_messages.sql"]
UNDER_TEST = "028_event_delete_drops_guest_activity.sql"

SHIM = r"""do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
"""

SEED = r"""grant select, insert, update, delete on public.events to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','host@example.test');
insert into public.studios (id, name) values ('10000000-0000-0000-0000-000000000001','S1');
insert into public.studio_members (studio_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','owner');
insert into public.events (id, studio_id, data) values
  ('ev-del','10000000-0000-0000-0000-000000000001','{"name":"Deleted"}'),
  ('ev-keep','10000000-0000-0000-0000-000000000001','{"name":"Kept"}');
insert into public.guest_threads (id, event_id, rsvp_code, guest_key, guest_token, guest_name, guest_email, email_opt_in) values
  ('aaaaaaaa-0000-4000-8000-000000000001','ev-del','code-del','k1','tok-del-0000000000000001','Ana','ana@example.test',true),
  ('aaaaaaaa-0000-4000-8000-000000000002','ev-keep','code-keep','k2','tok-keep-000000000000002','Bo','bo@example.test',true),
  ('aaaaaaaa-0000-4000-8000-000000000003','ev-gone','code-gone','k3','tok-gone-000000000000003','Cy','cy@example.test',true);
insert into public.guest_messages (thread_id, event_id, author, body) values
  ('aaaaaaaa-0000-4000-8000-000000000001','ev-del','guest','Parking?'),
  ('aaaaaaaa-0000-4000-8000-000000000002','ev-keep','guest','Bring anything?'),
  ('aaaaaaaa-0000-4000-8000-000000000003','ev-gone','guest','Old question');
insert into public.invite_opens (rsvp_code, guest_key, event_id) values
  ('code-del','k1','ev-del'),('code-keep','k2','ev-keep'),('code-gone','k3','ev-gone');
insert into public.invite_open_days (event_id, day, opens, distinct_devices) values
  ('ev-del', current_date, 3, 1),('ev-keep', current_date, 2, 1),('ev-gone', current_date, 1, 1);
insert into public.invite_open_devices (event_id, day, device_hash) values
  ('ev-del', current_date, repeat('a',64)),('ev-keep', current_date, repeat('b',64)),('ev-gone', current_date, repeat('c',64));
"""

TABLES = ["guest_threads", "guest_messages", "invite_opens", "invite_open_days", "invite_open_devices"]


def _counts(event_id):
    return " + ".join(f"(select count(*) from public.{t} where event_id='{event_id}')" for t in TABLES)


CHECKS = f"""create table results(n serial, check_name text, pass boolean);
insert into results(check_name, pass) select 'activity of an event deleted before 028 is cleaned up', ({_counts('ev-gone')}) = 0;
insert into results(check_name, pass) select 'activity of live events is untouched by the cleanup', ({_counts('ev-del')}) = 5 and ({_counts('ev-keep')}) = 5;
grant all on results to authenticated; grant usage on sequence results_n_seq to authenticated;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
delete from public.events where id='ev-del';
reset role;
insert into results(check_name, pass) select 'the host deleted the event from the browser role', (select count(*)=0 from public.events where id='ev-del');
insert into results(check_name, pass) select 'its threads, messages and opens went with it', ({_counts('ev-del')}) = 0;
insert into results(check_name, pass) select 'no guest email for it remains', (select count(*)=0 from public.guest_threads where guest_email='ana@example.test');
insert into results(check_name, pass) select 'the other event keeps everything', ({_counts('ev-keep')}) = 5;
insert into results(check_name, pass) select 'the browser roles cannot run the trigger function',
  not has_function_privilege('anon','public.events_drop_guest_activity()','execute')
  and not has_function_privilege('authenticated','public.events_drop_guest_activity()','execute');
-- A studio deleted with its events (cascade) takes the activity too.
delete from public.studios where id='10000000-0000-0000-0000-000000000001';
insert into results(check_name, pass) select 'a cascaded event delete drops its activity too', ({_counts('ev-keep')}) = 0;
"""


async def _run():
    import asyncpg
    assert urlparse(DSN).path.lstrip("/").startswith("ngw_guestdrop_test"), "Refusing a non-test database"
    conn = await asyncpg.connect(DSN, statement_cache_size=0)
    tx = conn.transaction(); await tx.start()
    try:
        assert await conn.fetchval("select to_regclass('public.events')") is None, "Disposable database must be empty"
        await conn.execute(SHIM)
        for m in BEFORE:
            await conn.execute((ROOT / m).read_text())
        await conn.execute(SEED)
        await conn.execute((ROOT / UNDER_TEST).read_text())
        await conn.execute(CHECKS)
        return await conn.fetch("select check_name, pass from results order by n")
    finally:
        await tx.rollback(); await conn.close()


def test_deleting_an_event_drops_its_guest_activity():
    rows = asyncio.run(_run())
    failed = [r["check_name"] for r in rows if not r["pass"]]
    assert len(rows) == 8 and failed == [], failed
