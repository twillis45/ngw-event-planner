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
MIGRATION = Path(__file__).resolve().parents[2] / 'supabase/migrations/021_account_deletion.sql'
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
create table public.events(id text primary key, studio_id uuid references public.studios on delete cascade);
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
        for role in ('anon','authenticated'):
            if not await conn.fetchval('select 1 from pg_roles where rolname=$1',role):
                await conn.execute('create role '+role)
        await conn.execute(MIGRATION.read_text())
        await conn.execute('insert into auth.users values ($1,$2),($3,$4)',OWNER,'owner@example.test',OTHER,'other@example.test')
        await conn.execute('insert into public.studios values ($1,$2)',STUDIO,OWNER)
        await conn.execute("insert into public.studio_members values ($1,$2,'owner')",STUDIO,OWNER)
        await conn.execute("insert into public.events values ('event',$1)",STUDIO)
        for table in ('event_channels','rsvp_submissions','vendor_brief_links','vendor_brief_confirmations'):
            await conn.execute('insert into public.'+table+" values ('event')")
        await conn.execute("insert into public.event_passes values ('event',$1)",OWNER)
        await scenario(conn)
    finally:
        await tx.rollback(); await conn.close()


def test_auth_delete_atomically_removes_solo_data_and_retains_receipt():
    async def scenario(conn):
        await conn.execute('delete from auth.users where id=$1',OWNER)
        for table in ('studios','studio_members','events','event_channels','rsvp_submissions','vendor_brief_links','vendor_brief_confirmations'):
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
