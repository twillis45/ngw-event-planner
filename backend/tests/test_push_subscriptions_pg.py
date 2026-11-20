"""Migration 033 and the push routes' own SQL on a REAL PostgreSQL.

Disposable-database fixture, like test_event_cohosts_rls.py:
NGW_PUSH_TEST_DATABASE_URL must name an EMPTY database whose name starts
ngw_push_test; everything runs in one transaction that rolls back. Skipped when
the variable is unset (CI has no database).

Two halves:
  · RLS, as a signed-in browser would meet it: each person sees, adds and
    removes only their own devices; nobody updates a row in place; anon gets
    nothing.
  · The server's statements (routers/push.py SUBSCRIBE_SQL / UNSUBSCRIBE_SQL),
    run as the service role the server uses: re-subscribing updates your own
    row, another account cannot take your device without its auth secret, and
    delete removes only the caller's row.
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest

DSN = os.environ.get("NGW_PUSH_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="requires an explicit empty disposable PostgreSQL database")
MIGRATION = Path(__file__).resolve().parents[2] / "supabase/migrations/033_push_subscriptions.sql"

A = "00000000-0000-0000-0000-0000000000a1"
B = "00000000-0000-0000-0000-0000000000b2"

SHIM = r"""do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
"""

BROWSER = f"""
insert into auth.users values ('{A}','a@example.test'), ('{B}','b@example.test');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('{A}','https://fcm.googleapis.com/fcm/send/a','pa','sa'),
  ('{B}','https://fcm.googleapis.com/fcm/send/b','pb','sb');
create table results(n serial, check_name text, pass boolean);
grant all on results to authenticated, anon; grant usage on sequence results_n_seq to authenticated, anon;

set role authenticated; set request.jwt.claim.sub = '{A}';
insert into results(check_name, pass) select 'A sees only A''s device', (select array_agg(endpoint) = array['https://fcm.googleapis.com/fcm/send/a'] from public.push_subscriptions);
do $$ begin
  begin
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('{B}','https://fcm.googleapis.com/fcm/send/forged','x','y');
    insert into results(check_name, pass) values ('A cannot add a device for B', false);
  exception when others then insert into results(check_name, pass) values ('A cannot add a device for B', true); end;
end $$;
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('{A}','https://fcm.googleapis.com/fcm/send/a2','p','s');
delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/b';
do $$ begin
  begin
    update public.push_subscriptions set user_id = '{A}' where endpoint = 'https://fcm.googleapis.com/fcm/send/a2';
    insert into results(check_name, pass) values ('nobody updates a row in place', false);
  exception when others then insert into results(check_name, pass) values ('nobody updates a row in place', true); end;
end $$;
reset role;
insert into results(check_name, pass) select 'A can add their own device', (select count(*)=1 from public.push_subscriptions where endpoint like '%/a2');
insert into results(check_name, pass) select 'A cannot delete B''s device', (select count(*)=1 from public.push_subscriptions where user_id = '{B}');
-- A delete with no WHERE reads no column, so only the delete rule stands
-- between it and every row (PostgreSQL applies the select rule only when a
-- delete reads a column).
set role authenticated; set request.jwt.claim.sub = '{A}';
delete from public.push_subscriptions;
reset role;
insert into results(check_name, pass) select 'a bare delete by A removes only A''s devices',
  (select count(*)=0 from public.push_subscriptions where user_id = '{A}') and (select count(*)=1 from public.push_subscriptions where user_id = '{B}');
set role authenticated; set request.jwt.claim.sub = '{B}';
delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/b';
reset role;
insert into results(check_name, pass) select 'B can delete their own device', (select count(*)=0 from public.push_subscriptions where user_id = '{B}');
set role anon;
do $$ begin
  begin perform 1 from public.push_subscriptions; insert into results(check_name, pass) values ('anon cannot read devices', false);
  exception when others then insert into results(check_name, pass) values ('anon cannot read devices', true); end;
end $$;
reset role;
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('{A}','https://fcm.googleapis.com/fcm/send/a3','p','s');
delete from auth.users where id = '{A}';
insert into results(check_name, pass) select 'deleting the account removes its devices', (select count(*)=0 from public.push_subscriptions where user_id = '{A}');
"""


async def _connect():
    import asyncpg
    assert urlparse(DSN).path.lstrip("/").startswith("ngw_push_test"), "Refusing a non-test database"
    conn = await asyncpg.connect(DSN, statement_cache_size=0)
    tx = conn.transaction(); await tx.start()
    assert await conn.fetchval("select to_regclass('public.push_subscriptions')") is None, "Disposable database must be empty"
    await conn.execute(SHIM)
    await conn.execute(MIGRATION.read_text())
    return conn, tx


async def _browser():
    conn, tx = await _connect()
    try:
        await conn.execute(BROWSER)
        return await conn.fetch("select check_name, pass from results order by n")
    finally:
        await tx.rollback(); await conn.close()


def test_a_browser_reaches_only_its_own_devices():
    rows = asyncio.run(_browser())
    failed = [r["check_name"] for r in rows if not r["pass"]]
    assert len(rows) == 9 and failed == [], failed


async def _server():
    from app.routers.push import SUBSCRIBE_SQL, UNSUBSCRIBE_SQL
    conn, tx = await _connect()
    ep = "https://fcm.googleapis.com/fcm/send/shared"
    try:
        await conn.execute(f"insert into auth.users values ('{A}','a@example.test'), ('{B}','b@example.test')")
        out = {}
        out["a_subscribes"] = await conn.fetchval(SUBSCRIBE_SQL, A, ep, "p1", "s1")
        out["a_again_new_keys"] = await conn.fetchval(SUBSCRIBE_SQL, A, ep, "p2", "s2")
        out["b_without_secret"] = await conn.fetchval(SUBSCRIBE_SQL, B, ep, "p9", "guess")
        out["owner_after_b_try"] = await conn.fetchval("select user_id::text from public.push_subscriptions where endpoint=$1", ep)
        out["b_deletes_as_row"] = await conn.execute(UNSUBSCRIBE_SQL, B, ep)
        out["rows_after_b_delete"] = await conn.fetchval("select count(*) from public.push_subscriptions")
        out["b_same_browser"] = await conn.fetchval(SUBSCRIBE_SQL, B, ep, "p2", "s2")   # holds the secret
        out["a_delete_now"] = await conn.execute(UNSUBSCRIBE_SQL, A, ep)
        out["b_delete"] = await conn.execute(UNSUBSCRIBE_SQL, B, ep)
        out["rows_end"] = await conn.fetchval("select count(*) from public.push_subscriptions")
        return out
    finally:
        await tx.rollback(); await conn.close()


def test_the_servers_statements_keep_each_device_with_its_owner():
    out = asyncio.run(_server())
    assert out == {
        "a_subscribes": A,
        "a_again_new_keys": A,           # your own row: keys refreshed
        "b_without_secret": None,         # someone else's device: refused (409)
        "owner_after_b_try": A,
        "b_deletes_as_row": "DELETE 0",   # B cannot remove A's device
        "rows_after_b_delete": 1,
        "b_delete": "DELETE 1",           # once B holds it, B can
        "b_same_browser": B,              # the same browser, a new account: allowed
        "a_delete_now": "DELETE 0",       # and A can no longer remove it
        "rows_end": 0,
    }
