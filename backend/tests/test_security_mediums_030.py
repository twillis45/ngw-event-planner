"""Migration 030 on a REAL PostgreSQL (security self-test Mediums M1, M5, and
the counter table M2/M4 use).

Disposable-database fixture, like test_retired_event_ids.py:
NGW_MEDIUMS_TEST_DATABASE_URL must name an EMPTY database whose name starts
ngw_mediums_test; one transaction that rolls back. Skipped when unset (CI has
no database). NGW_MEDIUMS_UNDER_TEST=none runs the same checks without 030
(the red-proof).
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest

DSN = os.environ.get("NGW_MEDIUMS_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="requires an explicit empty disposable PostgreSQL database")
ROOT = Path(__file__).resolve().parents[2] / "supabase/migrations"
BEFORE = ["001_initial_schema.sql", "002_rls_policies.sql", "004_studio_invitations.sql"]
UNDER_TEST = os.environ.get("NGW_MEDIUMS_UNDER_TEST", "030_security_mediums.sql")

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

HOST = "00000000-0000-0000-0000-0000000000a1"
VICTIM = "00000000-0000-0000-0000-0000000000b1"
S1 = "10000000-0000-0000-0000-000000000001"

SEED = f"""grant select, insert, update, delete on public.events, public.studio_invitations to authenticated;
insert into auth.users values ('{HOST}','host@example.test'), ('{VICTIM}','victim@example.test');
insert into public.studios (id, name) values ('{S1}','Host');
insert into public.studio_members (studio_id, user_id, role) values ('{S1}','{HOST}','owner');
-- Created before 030, unstamped: grandfathered.
insert into public.events (id, studio_id, data) values
  ('cust-old','{S1}','{{"name":"Old trip","isDestination":true,"date":"2027-06-11","endDate":"2027-06-13"}}');
"""


def attempt(name, sql):
    return f"""do $$ begin
  begin {sql}; insert into results(check_name, pass) values ('{name}', false);
  exception when others then insert into results(check_name, pass) values ('{name}', true);
  end; end $$;"""


CHECKS = f"""create table results(n serial, check_name text, pass boolean);
grant all on results to authenticated; grant usage on sequence results_n_seq to authenticated;
set role authenticated;
set request.jwt.claim.sub = '{HOST}';
-- M1: a stamped trip, created by the client as usual.
insert into public.events (id, studio_id, data) values
  ('cust-trip','{S1}','{{"name":"Trip","isDestination":true,"passRequired":true,"passReasons":["destination"]}}');
-- The host deletes the stamp, keeping everything else.
update public.events set data = '{{"name":"Trip, renamed","isDestination":true}}' where id='cust-trip';
-- A trip inserted with the stamp left off.
insert into public.events (id, studio_id, data) values
  ('cust-bare','{S1}','{{"name":"Bare","date":"2027-06-11","endDate":"2027-06-13"}}');
-- A one-day party, and a sample id, inserted plain.
insert into public.events (id, studio_id, data) values
  ('cust-party','{S1}','{{"name":"Party","date":"2027-06-11","endDate":"2027-06-11"}}'),
  ('made-up-1','{S1}','{{"name":"Any id","isDestination":true}}');
update public.events set data = '{{"name":"Old trip, edited","isDestination":true}}' where id='cust-old';
-- M5: invitations.
{attempt('an invitation cannot make someone an owner',
         f"insert into public.studio_invitations (studio_id, email, role, invited_by) values ('{S1}','victim@example.test','owner','{HOST}')")}
{attempt('an invitation cannot name someone else as the inviter',
         f"insert into public.studio_invitations (studio_id, email, role, invited_by) values ('{S1}','other@example.test','planner','{VICTIM}')")}
insert into public.studio_invitations (studio_id, email, role, invited_by) values ('{S1}','planner@example.test','planner','{HOST}');
{attempt('the browser cannot read or write the counters', "perform 1 from public.rate_counters")}
reset role;
insert into results(check_name, pass) select 'the stamp survives the host deleting it; her other edits land',
  (select data->>'passRequired' = 'true' and data->'passReasons' ? 'destination' and data->>'name' = 'Trip, renamed'
     from public.events where id='cust-trip');
insert into results(check_name, pass) select 'a multi-day event inserted without its stamp is stamped',
  (select data->>'passRequired' = 'true' and data->'passReasons' ? 'multi-day' from public.events where id='cust-bare');
insert into results(check_name, pass) select 'a one-day party stays unstamped',
  (select not (data ? 'passRequired') from public.events where id='cust-party');
insert into results(check_name, pass) select 'a trip under a made-up id is stamped too',
  (select data->>'passRequired' = 'true' from public.events where id='made-up-1');
insert into results(check_name, pass) select 'an event created unstamped before 030 stays free (grandfathered)',
  (select not (data ? 'passRequired') from public.events where id='cust-old');
insert into results(check_name, pass) select 'a planner invitation from the owner still saves',
  exists (select 1 from public.studio_invitations where email='planner@example.test');
insert into results(check_name, pass) select 'the trigger function cannot be called by browser roles',
  case when to_regprocedure('public.events_pass_stamp_sticks()') is null then false
       else not has_function_privilege('authenticated','public.events_pass_stamp_sticks()','execute') end;
"""


async def _run():
    import asyncpg
    assert urlparse(DSN).path.lstrip("/").startswith("ngw_mediums_test"), "Refusing a non-test database"
    conn = await asyncpg.connect(DSN, statement_cache_size=0)
    tx = conn.transaction(); await tx.start()
    try:
        assert await conn.fetchval("select to_regclass('public.events')") is None, "Disposable database must be empty"
        await conn.execute(SHIM)
        for m in BEFORE:
            await conn.execute((ROOT / m).read_text())
        await conn.execute(SEED)
        if UNDER_TEST != "none":
            await conn.execute((ROOT / UNDER_TEST).read_text())
        else:   # red-proof: same checks, no 030 (the counter table must exist for them to run)
            await conn.execute("create table public.rate_counters (key text, day date, n int)")
        await conn.execute(CHECKS)
        return await conn.fetch("select check_name, pass from results order by n")
    finally:
        await tx.rollback(); await conn.close()


def test_security_mediums_030():
    rows = asyncio.run(_run())
    failed = [r["check_name"] for r in rows if not r["pass"]]
    assert len(rows) == 10 and failed == [], failed
