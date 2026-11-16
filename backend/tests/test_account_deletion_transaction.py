"""Destructive fixture ONLY for an empty disposable database.

NGW_ACCOUNT_DELETION_TEST_DATABASE_URL must point to a database whose name
starts ngw_account_deletion_test. Every fixture transaction rolls back. Never
infer this URL from application DATABASE_URL / production credentials.
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse
import asyncpg
import pytest

DSN = os.environ.get('NGW_ACCOUNT_DELETION_TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not DSN, reason='requires explicit empty disposable PostgreSQL database')
MIGRATIONS = [Path(__file__).resolve().parents[2] / 'supabase/migrations' / name
              for name in ('021_account_deletion.sql', '023_helper_links.sql', '024_guest_messages.sql')]
OWNER='11111111-1111-4111-8111-111111111111'
OTHER='22222222-2222-4222-8222-222222222222'
STUDIO='33333333-3333-4333-8333-333333333333'

SETUP = '''
create schema if not exists auth;
create schema if not exists storage;
create table auth.users(id uuid primary key, email text);
create table storage.objects(owner uuid, owner_id text);
create table public.studios(id uuid primary key, created_by uuid);
create table public.studio_members(studio_id uuid references public.studios on delete cascade, user_id uuid, role text);
create table public.events(id text primary key, studio_id uuid references public.studios on delete cascade, data jsonb);
create table public.clients(id text primary key, studio_id uuid references public.studios on delete cascade);
create table public.studio_settings(studio_id uuid references public.studios on delete cascade);
create table public.preferred_vendors(studio_id uuid references public.studios on delete cascade);
create table public.studio_invitations(invited_by uuid, email text);
create table public.event_channels(event_id text);
create table public.event_owners(event_id text, owner_id text, owner_email text, studio_id uuid);
create table public.rsvp_submissions(event_id text);
create table public.vendor_brief_links(event_id text);
create table public.vendor_brief_confirmations(event_id text);
create table public.event_passes(event_id text, purchased_by text);
'''

async def fixture(scenario):
    assert urlparse(DSN).path.lstrip('/').startswith('ngw_account_deletion_test'), 'Refusing non-test database'
    conn=await asyncpg.connect(DSN, statement_cache_size=0)
    tx=conn.transaction(); await tx.start()
    try:
        assert await conn.fetchval("select to_regclass('public.studios')") is None, 'Disposable database must be empty'
        await conn.execute(SETUP)
        # Supabase has these roles; a plain disposable PostgreSQL instance may not.
        for role in ('anon','authenticated','service_role'):
            if not await conn.fetchval('select 1 from pg_roles where rolname=$1',role):
                await conn.execute('create role '+role)
        for migration in MIGRATIONS:
            await conn.execute(migration.read_text())
        await conn.execute('insert into auth.users values ($1,$2),($3,$4)',OWNER,'owner@example.test',OTHER,'other@example.test')
        await conn.execute('insert into public.studios values ($1,$2)',STUDIO,OWNER)
        await conn.execute("insert into public.studio_members values ($1,$2,'owner')",STUDIO,OWNER)
        await conn.execute("insert into public.events values ('event',$1)",STUDIO)
        for table in ('event_channels','rsvp_submissions','vendor_brief_links','vendor_brief_confirmations'):
            await conn.execute('insert into public.'+table+" values ('event')")
        await conn.execute("insert into public.event_passes values ('event',$1)",OWNER)
        # 023's tables are created by 023 itself (helper links, 11/15/2026).
        await conn.execute("insert into public.helper_links(code,event_id,helper_key) values ('helper-code-0000000001','event','g1')")
        await conn.execute("insert into public.helper_confirmations(code,event_id,helper_key,idempotency_key,state) values ('helper-code-0000000001','event','g1','k1','confirmed')")
        # 024's tables are created by 024 itself (guest questions, 11/16/2026).
        await conn.execute("insert into public.guest_threads(event_id,rsvp_code,guest_key,guest_token,guest_name) values ('event','rsvp-code-000000000001','device-key-000000000001','guest-token-00000000000001','Jordan Avery')")
        await conn.execute("insert into public.guest_messages(thread_id,event_id,author,body) select id,'event','guest','Is there parking?' from public.guest_threads")
        await conn.execute("insert into public.invite_opens(rsvp_code,guest_key,event_id) values ('rsvp-code-000000000001','device-key-000000000001','event')")
        await conn.execute("insert into public.invite_open_days(event_id,day,opens,distinct_devices) values ('event',current_date,1,1)")
        await conn.execute("insert into public.invite_open_devices(event_id,day,device_hash) values ('event',current_date,repeat('a',64))")
        await scenario(conn)
    finally:
        await tx.rollback(); await conn.close()


def test_auth_delete_atomically_removes_solo_data_and_retains_receipt():
    async def scenario(conn):
        await conn.execute('delete from auth.users where id=$1',OWNER)
        for table in ('studios','studio_members','events','event_channels','rsvp_submissions','vendor_brief_links','vendor_brief_confirmations','helper_links','helper_confirmations','guest_threads','guest_messages','invite_opens','invite_open_days','invite_open_devices'):
            assert await conn.fetchval('select count(*) from public.'+table)==0
        assert await conn.fetchval('select count(*) from public.event_passes')==1
        assert await conn.fetchval('select purchased_by from public.event_passes') is None
        assert await conn.fetchval('select 1 from auth.users where id=$1',OTHER)==1
    asyncio.run(fixture(scenario))


def test_shared_sole_owner_refuses_and_rolls_back_everything():
    async def scenario(conn):
        await conn.execute("insert into public.studio_members values ($1,$2,'planner')",STUDIO,OTHER)
        with pytest.raises(asyncpg.RaiseError,match='ownership_transfer_required'):
            async with conn.transaction():
                await conn.execute('delete from auth.users where id=$1',OWNER)
        assert await conn.fetchval('select 1 from auth.users where id=$1',OWNER)==1
        assert await conn.fetchval('select count(*) from public.events')==1
        assert await conn.fetchval('select purchased_by from public.event_passes')==OWNER
    asyncio.run(fixture(scenario))


def test_transferred_shared_studio_survives_and_deleted_jwt_cannot_recreate_identity_links():
    async def scenario(conn):
        await conn.execute("insert into public.studio_members values ($1,$2,'owner')",STUDIO,OTHER)
        await conn.execute('delete from auth.users where id=$1',OWNER)
        assert await conn.fetchval('select count(*) from public.events')==1
        assert await conn.fetchval('select created_by from public.studios') is None
        assert await conn.fetchval('select user_id::text from public.studio_members')==OTHER
        with pytest.raises(asyncpg.ForeignKeyViolationError):
            async with conn.transaction():
                await conn.execute("insert into public.studio_members values ($1,$2,'owner')",STUDIO,OWNER)
        with pytest.raises(asyncpg.ForeignKeyViolationError):
            async with conn.transaction():
                await conn.execute('insert into public.studios values (gen_random_uuid(),$1)',OWNER)
    asyncio.run(fixture(scenario))


def test_remaining_owned_storage_rolls_back_auth_and_app_deletion():
    async def scenario(conn):
        await conn.execute('insert into storage.objects(owner_id) values ($1)',OWNER)
        with pytest.raises(asyncpg.RaiseError,match='storage_transfer_required'):
            async with conn.transaction():
                await conn.execute('delete from auth.users where id=$1',OWNER)
        assert await conn.fetchval('select 1 from auth.users where id=$1',OWNER)==1
        assert await conn.fetchval('select count(*) from public.events')==1
    asyncio.run(fixture(scenario))



def test_stale_legacy_owner_cannot_delete_other_studios_canonical_event_artifacts():
    async def scenario(conn):
        other_studio='44444444-4444-4444-8444-444444444444'
        await conn.execute('insert into public.studios values ($1,$2)',other_studio,OTHER)
        await conn.execute("insert into public.studio_members values ($1,$2,'owner')",other_studio,OTHER)
        await conn.execute("insert into public.events values ('shared-event',$1)",other_studio)
        await conn.execute("insert into public.rsvp_submissions values ('shared-event')")
        await conn.execute("insert into public.event_owners values ('shared-event',$1,'owner@example.test',$2)",OWNER,STUDIO)
        await conn.execute('delete from auth.users where id=$1',OWNER)
        assert await conn.fetchval("select count(*) from public.events where id='shared-event'")==1
        assert await conn.fetchval("select count(*) from public.rsvp_submissions where event_id='shared-event'")==1
    asyncio.run(fixture(scenario))


def test_guest_activity_purge_is_server_only_and_keeps_live_events():
    async def scenario(conn):
        # 024's retention purge is SECURITY DEFINER, so the S9-1 lesson: neither
        # browser role may run it.
        for role in ('anon','authenticated'):
            assert not await conn.fetchval("select has_function_privilege($1,'public.purge_old_guest_activity(integer)','execute')",role)
        assert await conn.fetchval("select has_function_privilege('service_role','public.purge_old_guest_activity(integer)','execute')")
        # 'event' has no data: it falls back to its own activity, which is new.
        assert await conn.fetchval('select public.purge_old_guest_activity(90)')==0
        # a device hash is kept only for the same day's distinct count
        await conn.execute("insert into public.invite_open_devices(event_id,day,device_hash) values ('event',current_date-2,repeat('b',64))")
        await conn.execute("""insert into public.events values ('past-event',$1,'{"date":"2026-01-10"}')""",STUDIO)
        await conn.execute("""update public.events set data='{"date":"not a date"}' where id='event'""")
        await conn.execute("insert into public.guest_threads(event_id,rsvp_code,guest_key,guest_token,guest_name) values ('past-event','rsvp-code-000000000002','device-key-000000000002','guest-token-00000000000002','Riley Park')")
        await conn.execute("insert into public.guest_messages(thread_id,event_id,author,body) select id,'past-event','guest','Old question' from public.guest_threads where event_id='past-event'")
        await conn.execute("insert into public.invite_opens(rsvp_code,guest_key,event_id,last_opened_at) values ('rsvp-code-000000000002','device-key-000000000002','past-event','2026-01-09')")
        await conn.execute("insert into public.invite_open_days(event_id,day,opens,distinct_devices) values ('past-event','2026-01-09',3,2)")
        # an impossible date ("2026-02-30") must not stop the purge either
        await conn.execute("insert into public.events values ('odd-event',$1,'{\"date\":\"2026-02-30\"}')",STUDIO)
        await conn.execute("insert into public.guest_threads(event_id,rsvp_code,guest_key,guest_token,guest_name) values ('odd-event','rsvp-code-000000000003','device-key-000000000003','guest-token-00000000000003','Sam Lee')")
        # unparseable and impossible dates do not break the purge; the past
        # event's thread, open and day go, and so does 'odd-event' (taken as March 2)
        assert await conn.fetchval('select public.purge_old_guest_activity(90)')==4
        assert await conn.fetchval("select count(*) from public.guest_threads where event_id='odd-event'")==0
        assert await conn.fetchval("select count(*) from public.invite_opens where event_id='past-event'")==0
        assert await conn.fetchval("select count(*) from public.invite_open_days where event_id='past-event'")==0
        assert await conn.fetchval("select count(*) from public.invite_open_devices")==1
        assert await conn.fetchval("select count(*) from public.invite_opens where event_id='event'")==1
        assert await conn.fetchval("select count(*) from public.guest_threads where event_id='past-event'")==0
        assert await conn.fetchval("select count(*) from public.guest_messages where event_id='past-event'")==0
        assert await conn.fetchval("select count(*) from public.guest_threads where event_id='event'")==1
    asyncio.run(fixture(scenario))
