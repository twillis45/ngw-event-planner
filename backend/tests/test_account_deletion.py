from fastapi.testclient import TestClient
from app.main import app


def test_account_deletion_exists_and_requires_authentication():
    response = TestClient(app).request('DELETE', '/api/account', json={'confirmation':'DELETE'})
    assert response.status_code == 401

import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from app.routers import account as A
from app import auth

UID = '11111111-1111-4111-8111-111111111111'

class Conn:
    shared = False
    ready = True
    objects = []
    executed = []
    @asynccontextmanager
    async def transaction(self): yield self
    async def execute(self, sql, *args): self.executed.append((sql,args))
    async def fetchval(self, sql, *args):
        if 'pg_trigger' in sql: return self.ready
        if 'mine.role' in sql: return self.shared
        return None
    async def fetch(self, sql, *args):
        return self.objects if 'storage.objects' in sql else [{'id':'event-solo'}]

@pytest.fixture
def setup(monkeypatch):
    conn = Conn(); conn.objects=[]; conn.executed=[]
    @asynccontextmanager
    async def acquire(): yield conn
    async def pool(): return SimpleNamespace(acquire=acquire)
    async def signed_in(*args): return {'id':UID,'via':'supabase'}
    monkeypatch.setattr(A, 'require_planner', signed_in)
    monkeypatch.setattr(A, 'get_pool', pool)
    monkeypatch.setattr(A, 'SUPABASE_URL', 'https://project.supabase.co')
    monkeypatch.setattr(A, 'SUPABASE_SERVICE_ROLE_KEY', 'server-secret')
    calls=[]
    async def request(method, url, **kwargs):
        calls.append((method,url,kwargs))
        return httpx.Response(204)
    client=SimpleNamespace(request=request)
    @asynccontextmanager
    async def http(*args,**kwargs): yield client
    monkeypatch.setattr(A.httpx, 'AsyncClient', http)
    return conn,calls,client

def delete():
    return asyncio.run(A.delete_account(A.DeleteAccountRequest(confirmation='DELETE'),'Bearer token'))

def test_real_admin_delete_self_and_invalidates_every_cached_token(setup):
    conn,calls,_=setup
    auth._cache['one']=(10**12,{'id':UID})
    auth._cache['two']=(10**12,{'id':UID})
    auth._cache['other']=(10**12,{'id':'other'})
    out=delete()
    assert out['deleted'] is True
    assert calls[0][1] == 'https://project.supabase.co/auth/v1/admin/users/'+UID
    assert calls[0][2]['json'] == {'should_soft_delete':False}
    assert calls[0][2]['headers']['apikey'] == 'server-secret'
    assert 'one' not in auth._cache and 'two' not in auth._cache
    assert 'other' in auth._cache
    assert 'server-secret' not in str(out)
    auth._cache.clear()

@pytest.mark.parametrize('shared,ready,code', [(True,True,'ownership_transfer_required'),(False,False,'deletion_unavailable')])
def test_preflight_refusal_does_not_delete_anything(setup,shared,ready,code):
    conn,calls,_=setup;conn.shared=shared;conn.ready=ready
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.detail['code']==code
    assert calls==[]

def test_shared_or_unknown_storage_refuses_before_any_removal(setup):
    conn,calls,_=setup
    conn.objects=[{'bucket_id':'event-files','name':UID+'/shared-event/invoice/file.pdf','owner_id':UID}]
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.detail['code']=='storage_transfer_required'
    assert calls==[]

def test_personal_storage_uses_real_api_before_auth_delete(setup):
    conn,calls,_=setup
    name=UID+'/event-solo/invoice/file.pdf'
    conn.objects=[{'bucket_id':'event-files','name':name,'owner_id':UID}]
    delete()
    assert calls[0][1].endswith('/storage/v1/object/event-files')
    assert calls[0][2]['json']=={'prefixes':[name]}
    assert calls[1][1].endswith('/auth/v1/admin/users/'+UID)
    assert all('delete from storage.objects' not in sql for sql,args in conn.executed)

def test_storage_failure_does_not_delete_identity(setup):
    conn,calls,client=setup
    conn.objects=[{'bucket_id':'event-files','name':UID+'/event-solo/invoice/file.pdf','owner_id':UID}]
    client.request=AsyncMock(return_value=httpx.Response(500,text='secret internal message'))
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.detail['code']=='storage_delete_failed'
    assert 'secret' not in str(exc.value.detail)
    assert client.request.await_count==1

def test_auth_error_is_not_reported_as_deleted(setup):
    _,_,client=setup
    client.request=AsyncMock(return_value=httpx.Response(500,text='private details'))
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.detail['code']=='deletion_failed'
    assert 'private details' not in str(exc.value.detail)

@pytest.mark.parametrize('key', ['',None])
def test_missing_admin_secret_fails_closed(setup,monkeypatch,key):
    _,calls,_=setup
    monkeypatch.setattr(A,'SUPABASE_SERVICE_ROLE_KEY',key)
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.status_code==503
    assert calls==[]

def test_confirmation_must_be_exact(setup):
    _,calls,_=setup
    with pytest.raises(A.HTTPException) as exc:
        asyncio.run(A.delete_account(A.DeleteAccountRequest(confirmation='delete'),'Bearer token'))
    assert exc.value.status_code==400
    assert calls==[]

@pytest.mark.parametrize('message,code', [('ownership_transfer_required','ownership_transfer_required'),('storage_transfer_required','storage_transfer_required')])
def test_trigger_race_constraints_are_safe_actionable_errors(setup,message,code):
    _,_,client=setup
    client.request=AsyncMock(return_value=httpx.Response(500,text=message))
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.status_code==409
    assert exc.value.detail['code']==code


def test_deletion_identity_ignores_cached_token(setup,monkeypatch):
    auth._cache['token']=(10**12,{'id':UID})
    async def fresh(*args):
        assert 'token' not in auth._cache
        return {'id':UID,'via':'supabase'}
    monkeypatch.setattr(A,'require_planner',fresh)
    delete()


def test_cache_hit_checks_shared_user_existence(monkeypatch):
    auth._cache['cached']=(10**12,{'id':UID})
    monkeypatch.setattr(auth,'SUPABASE_URL','https://project.supabase.co')
    monkeypatch.setattr(auth,'SUPABASE_ANON_KEY','public')
    @asynccontextmanager
    async def acquire(): yield SimpleNamespace(fetchval=AsyncMock(return_value=None))
    async def pool(): return SimpleNamespace(acquire=acquire)
    from app import db
    monkeypatch.setattr(db,'get_pool',pool)
    response=SimpleNamespace(status_code=404)
    @asynccontextmanager
    async def client(*args,**kwargs): yield SimpleNamespace(get=AsyncMock(return_value=response))
    monkeypatch.setattr(auth.httpx,'AsyncClient',client)
    assert asyncio.run(auth.verify_supabase_token('cached')) is None
    assert 'cached' not in auth._cache


def test_dev_identity_cannot_delete_account(setup,monkeypatch):
    _,calls,_=setup
    async def dev(*args): return {'id':'dev-token','via':'dev_token'}
    monkeypatch.setattr(A,'require_planner',dev)
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.status_code==403
    assert not calls


def test_auth_timeout_reports_unconfirmed_and_clears_cache(setup):
    _,_,client=setup
    auth._cache['cached-user']=(10**12,{'id':UID})
    client.request=AsyncMock(side_effect=httpx.ReadTimeout('network'))
    with pytest.raises(A.HTTPException) as exc: delete()
    assert exc.value.detail['code']=='deletion_unconfirmed'
    assert 'cached-user' not in auth._cache


def test_one_shared_file_prevents_removal_of_every_file(setup):
    conn,calls,_=setup
    conn.objects=[
        {'bucket_id':'event-files','name':UID+'/event-solo/invoice/own.pdf','owner_id':UID},
        {'bucket_id':'event-files','name':UID+'/event-shared/invoice/shared.pdf','owner_id':UID},
    ]
    with pytest.raises(A.HTTPException): delete()
    assert calls==[]
