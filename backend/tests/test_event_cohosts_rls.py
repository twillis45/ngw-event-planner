"""Per-event co-host rules on a REAL PostgreSQL (owner ruling 11/16/2026).

Disposable-database fixture, like test_account_deletion_transaction.py:
NGW_COHOST_TEST_DATABASE_URL must name an EMPTY database whose name starts
ngw_cohost_test; everything runs in one transaction that rolls back. Skipped
when the variable is unset (CI has no database).

It applies 001 + 002 (studios, events, studio rules) and 026, then signs in
as each person in turn (a host, a co-host, a stranger, someone invited but
not yet signed in, and anon) and records what each can do. Red-proofed
11/16/2026: dropping the studio-lock trigger lets the co-host move the event
into their own studio and the host loses it; dropping the two co-host rules
blinds the co-host.
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest

DSN = os.environ.get("NGW_COHOST_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="requires an explicit empty disposable PostgreSQL database")
ROOT = Path(__file__).resolve().parents[2] / "supabase/migrations"
MIGRATIONS = ["001_initial_schema.sql", "002_rls_policies.sql", "026_event_cohosts.sql"]

SHIM = r"""-- Supabase stand-ins: roles, auth.users, auth.uid() from a session setting.
do $$ begin
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

SCENARIOS = r"""grant select, insert, update, delete on public.events to authenticated;
-- People: host H (studio S1), co-host C (studio S2), stranger X (studio S3), pending invitee P.
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','host@example.test'),
  ('00000000-0000-0000-0000-0000000000c1','cohost@example.test'),
  ('00000000-0000-0000-0000-0000000000e1','stranger@example.test'),
  ('00000000-0000-0000-0000-0000000000f1','pending@example.test');
insert into public.studios (id, name) values ('10000000-0000-0000-0000-000000000001','S1'),('20000000-0000-0000-0000-000000000002','S2'),('30000000-0000-0000-0000-000000000003','S3');
insert into public.studio_members (studio_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','owner'),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1','owner'),
  ('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000e1','owner');
insert into public.events (id, studio_id, data) values
  ('ev-shared','10000000-0000-0000-0000-000000000001','{"name":"Friendsgiving"}'),
  ('ev-other','10000000-0000-0000-0000-000000000001','{"name":"Host other event"}');
insert into public.event_cohosts (event_id, email, user_id, invited_by, accepted_at) values
  ('ev-shared','cohost@example.test','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1', now()),
  ('ev-other','pending@example.test', null,'00000000-0000-0000-0000-0000000000a1', null);

create table results(n serial, check_name text, pass boolean);
grant all on results to authenticated, anon; grant usage on sequence results_n_seq to authenticated, anon;

set role authenticated;
-- CO-HOST
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into results(check_name, pass) select 'cohost sees the shared event only', (select array_agg(id order by id) = array['ev-shared'] from public.events);
update public.events set data = '{"name":"Friendsgiving!"}' where id='ev-shared';
insert into results(check_name, pass) select 'cohost can edit the shared event', (select data->>'name' = 'Friendsgiving!' from public.events where id='ev-shared');
update public.events set data = '{"name":"hacked"}' where id='ev-other';
reset role;
insert into results(check_name, pass) select 'cohost cannot edit another event', (select data->>'name' = 'Host other event' from public.events where id='ev-other');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
delete from public.events where id='ev-shared';
insert into results(check_name, pass) select 'cohost cannot delete the event', (select count(*)=1 from public.events where id='ev-shared');
insert into results(check_name, pass) select 'cohost sees only their own cohost rows', (select count(*)=1 and min(email)='cohost@example.test' from public.event_cohosts);
reset role;
-- move attempt in its own transaction (expected to raise)
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  begin
    update public.events set studio_id = '20000000-0000-0000-0000-000000000002' where id='ev-shared';
    insert into results(check_name, pass) values ('cohost cannot move the event to their studio', false);
  exception when others then
    insert into results(check_name, pass) values ('cohost cannot move the event to their studio (' || sqlerrm || ')', sqlerrm like '%event_studio_locked%' or sqlerrm like '%row-level security%');
  end;
end $$;
do $$ begin
  begin
    insert into public.event_cohosts(event_id,email,invited_by) values ('ev-other','me2@example.test', auth.uid());
    insert into results(check_name, pass) values ('cohost cannot invite anyone', false);
  exception when others then insert into results(check_name, pass) values ('cohost cannot invite anyone', true); end;
end $$;
do $$ begin
  begin
    update public.event_cohosts set user_id = auth.uid(), accepted_at = now() where email='pending@example.test';
    insert into results(check_name, pass) values ('nobody claims an invite from the browser', (select count(*)=0 from public.event_cohosts where email='pending@example.test' and user_id is not null));
  exception when others then insert into results(check_name, pass) values ('nobody claims an invite from the browser', true); end;
end $$;
reset role;
-- PENDING (invited, not claimed)
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into results(check_name, pass) select 'an unclaimed invite opens nothing', (select count(*)=0 from public.events);
reset role;
-- STRANGER
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into results(check_name, pass) select 'a stranger sees nothing', (select count(*)=0 from public.events);
reset role;
-- HOST
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into results(check_name, pass) select 'host still sees both events', (select count(*)=2 from public.events);
insert into results(check_name, pass) select 'host does not see cohost rows from the browser (server-only)', (select count(*)=0 from public.event_cohosts);
reset role;
-- ANON
set role anon;
do $$ begin
  begin perform 1 from public.event_cohosts; insert into results(check_name, pass) values ('anon cannot read cohosts', false);
  exception when others then insert into results(check_name, pass) values ('anon cannot read cohosts', true); end;
end $$;
reset role;
insert into results(check_name, pass) select 'anon cannot execute is_event_cohost', not has_function_privilege('anon','public.is_event_cohost(text)','execute');
-- CASCADES
delete from public.events where id='ev-shared';
insert into results(check_name, pass) select 'deleting the event removes its cohost rows', (select count(*)=0 from public.event_cohosts where event_id='ev-shared');
delete from auth.users where id='00000000-0000-0000-0000-0000000000f1';
"""


async def _run():
    import asyncpg
    assert urlparse(DSN).path.lstrip("/").startswith("ngw_cohost_test"), "Refusing a non-test database"
    conn = await asyncpg.connect(DSN, statement_cache_size=0)
    tx = conn.transaction(); await tx.start()
    try:
        assert await conn.fetchval("select to_regclass('public.events')") is None, "Disposable database must be empty"
        await conn.execute(SHIM)
        for m in MIGRATIONS:
            await conn.execute((ROOT / m).read_text())
        await conn.execute(SCENARIOS)
        return await conn.fetch("select check_name, pass from results order by n")
    finally:
        await tx.rollback(); await conn.close()


def test_a_cohost_gets_one_event_and_nothing_else():
    rows = asyncio.run(_run())
    failed = [r["check_name"] for r in rows if not r["pass"]]
    assert len(rows) == 15 and failed == [], failed
