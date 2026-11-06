"""A signed-out token is refused at once (owner decision, 11/6/2026).

Measured on the local stack: after a global sign-out GoTrue answered 403 for the
old access token, while this backend kept answering 200 — its five-minute token
cache only re-checked that the USER still existed. The cache hit now also checks
that the token's own session still exists in auth.sessions.
"""
import asyncio
import base64
import json
from contextlib import asynccontextmanager
from types import SimpleNamespace

from app import auth, db

UID = '11111111-1111-4111-8111-111111111111'
LIVE = '22222222-2222-4222-8222-222222222222'
GONE = '33333333-3333-4333-8333-333333333333'


def _jwt(session_id):
    enc = lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return enc({'alg': 'HS256'}) + '.' + enc({'sub': UID, 'session_id': session_id}) + '.sig'


def _setup(monkeypatch, sessions):
    calls = []

    class Conn:
        async def fetchval(self, sql, *args):
            calls.append((sql, args))
            uid = args[0]
            sid = args[1] if len(args) > 1 else None
            return uid == UID and (sid is None or sid in sessions)

    @asynccontextmanager
    async def acquire():
        yield Conn()

    async def pool():
        return SimpleNamespace(acquire=acquire)

    monkeypatch.setattr(db, 'get_pool', pool)
    monkeypatch.setattr(auth, 'SUPABASE_URL', 'https://project.supabase.co')
    monkeypatch.setattr(auth, 'SUPABASE_ANON_KEY', 'public')

    @asynccontextmanager
    async def client(*a, **k):
        async def get(*a, **k):
            return SimpleNamespace(status_code=403)   # GoTrue already refuses it
        yield SimpleNamespace(get=get)

    monkeypatch.setattr(auth.httpx, 'AsyncClient', client)
    return calls


def test_a_cached_token_whose_session_ended_is_refused(monkeypatch):
    calls = _setup(monkeypatch, sessions={LIVE})
    tok = _jwt(GONE)
    auth._cache[tok] = (10**12, {'id': UID})
    assert asyncio.run(auth.verify_supabase_token(tok)) is None
    assert tok not in auth._cache
    assert any('auth.sessions' in sql for sql, _ in calls)


def test_control_a_cached_token_whose_session_is_live_still_passes(monkeypatch):
    _setup(monkeypatch, sessions={LIVE})
    tok = _jwt(LIVE)
    auth._cache[tok] = (10**12, {'id': UID})
    assert asyncio.run(auth.verify_supabase_token(tok)) == {'id': UID}
    auth._cache.clear()


def test_control_a_token_without_a_session_claim_still_checks_the_user(monkeypatch):
    _setup(monkeypatch, sessions=set())
    tok = 'opaque-token-without-claims'
    auth._cache[tok] = (10**12, {'id': UID})
    assert asyncio.run(auth.verify_supabase_token(tok)) == {'id': UID}
    auth._cache.clear()
