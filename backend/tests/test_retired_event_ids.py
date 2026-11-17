"""A deleted event's id is retired (security self-test, 11/17/2026, F1).

Migration 029 on a REAL PostgreSQL. Disposable-database fixture, like
test_event_delete_drops_guest_activity.py: NGW_RETIRED_TEST_DATABASE_URL must
name an EMPTY database whose name starts ngw_retired_test; everything runs in
one transaction that rolls back. Skipped when the variable is unset (CI has no
database).

The attack it closes: a host deletes an event; its guests' RSVPs stay keyed on
the id, which every guest saw in the invite. Someone signs up, inserts an event
with that id into their own studio (or renames one of theirs to it), and the
server's studio check on the recreated row hands them the old guests' answers.
Red-proofed 11/17/2026: without 029 the attacker's insert and rename succeed.
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest

DSN = os.environ.get("NGW_RETIRED_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="requires an explicit empty disposable PostgreSQL database")
ROOT = Path(__file__).resolve().parents[2] / "supabase/migrations"
BEFORE = ["001_initial_schema.sql", "002_rls_policies.sql", "009_rsvp_submissions.sql"]
UNDER_TEST = os.environ.get("NGW_RETIRED_UNDER_TEST", "029_retired_event_ids.sql")

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
ATTACKER = "00000000-0000-0000-0000-0000000000e1"

SEED = f"""grant select, insert, update, delete on public.events to authenticated;
insert into auth.users values ('{HOST}','host@example.test'), ('{ATTACKER}','x@example.test');
insert into public.studios (id, name) values
  ('10000000-0000-0000-0000-000000000001','Host'), ('20000000-0000-0000-0000-000000000002','Attacker');
insert into public.studio_members (studio_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001','{HOST}','owner'),
  ('20000000-0000-0000-0000-000000000002','{ATTACKER}','owner');
insert into public.events (id, studio_id, data) values
  ('ev-del','10000000-0000-0000-0000-000000000001','{{"name":"Jordan’s 50th"}}'),
  ('ev-mine','20000000-0000-0000-0000-000000000002','{{"name":"Mine"}}');
insert into public.rsvp_submissions (event_id, rsvp_code, idempotency_key, guest_name, rsvp, needs)
  values ('ev-del','code-del','k-000000000000001','Ana','Yes','peanut allergy'),
         ('ev-old','code-old','k-000000000000002','Bo','Yes','none');
"""


def attempt(name, sql):
    """Record whether a statement run as the attacker was REFUSED."""
    return f"""do $$ begin
  begin {sql}; insert into results(check_name, pass) values ('{name}', false);
  exception when others then insert into results(check_name, pass) values ('{name}', true);
  end; end $$;"""


CHECKS = f"""create table results(n serial, check_name text, pass boolean);
grant all on results to authenticated; grant usage on sequence results_n_seq to authenticated;
insert into results(check_name, pass) select 'an id deleted before 029 is retired by the backfill',
  exists (select 1 from public.retired_event_ids where id='ev-old');
insert into results(check_name, pass) select 'a live event is not retired',
  not exists (select 1 from public.retired_event_ids where id in ('ev-del','ev-mine'));
set role authenticated;
set request.jwt.claim.sub = '{HOST}';
delete from public.events where id='ev-del';
set request.jwt.claim.sub = '{ATTACKER}';
{attempt('the attacker cannot recreate the deleted id in their studio',
         "insert into public.events (id, studio_id, data) values ('ev-del','20000000-0000-0000-0000-000000000002','{}')")}
{attempt('nor an id deleted before 029',
         "insert into public.events (id, studio_id, data) values ('ev-old','20000000-0000-0000-0000-000000000002','{}')")}
{attempt('nor rename their own event to it',
         "update public.events set id='ev-del' where id='ev-mine'")}
{attempt('an event id cannot change at all',
         "update public.events set id='ev-new-name' where id='ev-mine'")}
{attempt('the browser cannot read the retired list', "perform 1 from public.retired_event_ids")}
{attempt('the browser cannot un-retire an id', "delete from public.retired_event_ids")}
insert into public.events (id, studio_id, data) values ('ev-fresh','20000000-0000-0000-0000-000000000002','{{"name":"New"}}');
update public.events set data='{{"name":"Mine, renamed"}}' where id='ev-mine';
reset role;
insert into results(check_name, pass) select 'the host''s delete went through and retired the id',
  not exists (select 1 from public.events where id='ev-del') and exists (select 1 from public.retired_event_ids where id='ev-del');
insert into results(check_name, pass) select 'new events and ordinary edits still save',
  exists (select 1 from public.events where id='ev-fresh') and exists (select 1 from public.events where id='ev-mine' and data->>'name'='Mine, renamed');
insert into results(check_name, pass) select 'the trigger functions exist and browser roles cannot call them',
  case when to_regprocedure('public.events_retire_id()') is null or to_regprocedure('public.events_refuse_retired_id()') is null
       then false
       else not has_function_privilege('authenticated','public.events_retire_id()','execute')
        and not has_function_privilege('authenticated','public.events_refuse_retired_id()','execute')
        and not has_function_privilege('anon','public.events_refuse_retired_id()','execute') end;
"""


async def _run():
    import asyncpg
    assert urlparse(DSN).path.lstrip("/").startswith("ngw_retired_test"), "Refusing a non-test database"
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
        else:   # red-proof: the same checks with no 029 (the retired table must exist for them to run)
            await conn.execute("create table public.retired_event_ids (id text primary key, retired_at timestamptz default now())")
        await conn.execute(CHECKS)
        return await conn.fetch("select check_name, pass from results order by n")
    finally:
        await tx.rollback(); await conn.close()


def test_a_deleted_events_id_is_retired():
    rows = asyncio.run(_run())
    failed = [r["check_name"] for r in rows if not r["pass"]]
    assert len(rows) == 11 and failed == [], failed
