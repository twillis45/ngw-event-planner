"""Per-event co-host routes (owner ruling 11/16/2026). Synthetic people only.

The database rules are proven on PostgreSQL in test_event_cohosts_rls.py; this
pins the server: only the host invites, lists and removes; a co-host may leave;
a claim binds only to the CONFIRMED email in auth.users; a claimed co-host
passes the shared read check, an unclaimed invite does not.
"""
import sys
import types
import asyncio
import uuid
from datetime import datetime, timezone

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.cohosts as ch
import app.routers.rsvp as rsvp_mod

HOST = "00000000-0000-0000-0000-0000000000a1"
COHOST = "00000000-0000-0000-0000-0000000000c1"
STRANGER = "00000000-0000-0000-0000-0000000000e1"
STUDIO = "10000000-0000-0000-0000-000000000001"


class DB:
    def __init__(self):
        self.members = {(STUDIO, HOST)}
        self.events = {"ev1": {"studio_id": STUDIO, "name": "Vida’s Friendsgiving"}}
        self.rows = []      # {id, event_id, email, user_id, accepted_at, created_at}
        self.users = {HOST: ("host@example.test", True), COHOST: ("cohost@example.test", True),
                      STRANGER: ("stranger@example.test", False)}


class Conn:
    def __init__(self, db): self.db = db
    async def fetchval(self, q, *a):
        if "to_regclass('public.event_cohosts')" in q: return True
        if "from studio_members" in q: return 1 if (str(a[0]), str(a[1])) in self.db.members else None
        if "count(*) from public.event_cohosts" in q: return sum(r["event_id"] == a[0] for r in self.db.rows)
        if "insert into public.event_cohosts" in q:
            if any(r["event_id"] == a[0] and r["email"] == a[1] for r in self.db.rows): return None
            rid = uuid.uuid4()
            self.db.rows.append({"id": rid, "event_id": a[0], "email": a[1], "user_id": None, "accepted_at": None,
                                 "created_at": datetime.now(timezone.utc)})
            return rid
        if "from public.event_cohosts where event_id=$1 and user_id=$2::uuid and accepted_at is not null" in q:
            return 1 if any(r["event_id"] == a[0] and r["user_id"] == a[1] and r["accepted_at"] for r in self.db.rows) else None
        raise AssertionError(q)
    async def fetchrow(self, q, *a):
        if "from public.events where id=$1" in q:
            e = self.db.events.get(a[0]); return {"studio_id": e["studio_id"], "name": e["name"]} if e else None
        if "where user_id=$1::uuid and event_id=$2" in q:
            for r in self.db.rows:
                if r["user_id"] == a[0] and r["event_id"] == a[1]: return r
            return None
        if "select id, user_id from public.event_cohosts" in q:
            for r in self.db.rows:
                if str(r["id"]) == a[0] and r["event_id"] == a[1]: return r
            return None
        if "from auth.users" in q:
            u = self.db.users.get(a[0]); return {"email": u[0], "email_confirmed_at": datetime.now() if u[1] else None} if u else None
        raise AssertionError(q)
    async def fetch(self, q, *a):
        if "select id, email, accepted_at" in q: return [r for r in self.db.rows if r["event_id"] == a[0]]
        if "select event_id from public.event_cohosts where user_id" in q:
            return [{"event_id": r["event_id"]} for r in self.db.rows if r["user_id"] == a[0] and r["accepted_at"]]
        raise AssertionError(q)
    async def execute(self, q, *a):
        if q.startswith("delete from public.event_cohosts"):
            self.db.rows = [r for r in self.db.rows if r["id"] != a[0]]
        elif "update public.event_cohosts set user_id" in q:
            for r in self.db.rows:
                if r["email"] == a[1] and r["user_id"] is None:
                    r["user_id"], r["accepted_at"] = a[0], datetime.now(timezone.utc)
        else:
            raise AssertionError(q)


class Pool:
    def __init__(self, c): self.c = c
    def acquire(self):
        c = self.c
        class Ctx:
            async def __aenter__(self): return c
            async def __aexit__(self, *a): return False
        return Ctx()


@pytest.fixture
def env(monkeypatch):
    db = DB(); who = {"id": HOST}; sent = []
    async def gp(): return Pool(Conn(db))
    async def planner(*a, **k): return {"id": who["id"], "email": db.users[who["id"]][0], "via": "supabase"}
    async def send(**k): sent.append(k); return {"id": "r"}
    monkeypatch.setattr(ch, "get_pool", gp)
    monkeypatch.setattr(ch, "require_planner", planner)
    monkeypatch.setattr(ch, "_send_via_resend", send)
    monkeypatch.setattr(ch, "is_email_configured", lambda: True)
    app = FastAPI(); app.include_router(ch.router)
    return types.SimpleNamespace(db=db, who=who, sent=sent, c=TestClient(app))


def invite(env, email): return env.c.post("/api/events/ev1/cohosts", json={"email": email})


def test_the_host_invites_by_email_and_it_is_emailed_once(env):
    r = invite(env, " CoHost@Example.test ")
    assert r.status_code == 200 and r.json()["emailed"] is True
    assert r.json()["cohosts"] == [{"id": r.json()["cohosts"][0]["id"], "email": "cohost@example.test", "status": "invited"}]
    assert env.sent[0]["to"] == "cohost@example.test" and "Vida’s Friendsgiving" in env.sent[0]["subject"]
    again = invite(env, "cohost@example.test")
    assert again.json()["already_invited"] is True and len(env.sent) == 1 and len(env.db.rows) == 1


@pytest.mark.parametrize("email,code", [("not-an-email", 422), ("host@example.test", 422)])
def test_a_bad_address_or_the_hosts_own_is_refused(env, email, code):
    assert invite(env, email).status_code == code


def test_only_the_host_invites_lists_or_removes(env):
    invite(env, "cohost@example.test")
    rid = env.db.rows[0]["id"]
    env.who["id"] = STRANGER
    assert invite(env, "x@example.test").status_code == 403
    assert env.c.get("/api/events/ev1/cohosts").status_code == 403
    assert env.c.delete(f"/api/events/ev1/cohosts/{rid}").status_code == 403
    # A claimed co-host is not a host either.
    env.who["id"] = COHOST; env.c.post("/api/cohosts/claim")
    assert invite(env, "y@example.test").status_code == 403
    assert env.c.get("/api/events/ev1/cohosts").status_code == 403


def test_a_cohost_may_leave(env):
    invite(env, "cohost@example.test")
    env.who["id"] = COHOST
    assert env.c.post("/api/cohosts/claim").json()["events"] == ["ev1"]
    rid = env.db.rows[0]["id"]
    assert env.c.delete(f"/api/events/ev1/cohosts/{rid}").status_code == 200
    assert env.db.rows == []


def test_a_claim_binds_only_a_confirmed_email_from_auth_users(env):
    invite(env, "stranger@example.test")             # stranger's email is NOT confirmed
    env.who["id"] = STRANGER
    assert env.c.post("/api/cohosts/claim").json()["events"] == []
    assert env.db.rows[0]["user_id"] is None


def test_the_cap_is_ten(env):
    for i in range(10): assert invite(env, f"p{i}@example.test").status_code == 200
    assert invite(env, "p10@example.test").status_code == 429


def test_the_shared_read_check_lets_a_claimed_cohost_in_and_an_invited_one_not(env):
    invite(env, "cohost@example.test")
    conn = Conn(env.db)
    with pytest.raises(HTTPException) as e:
        asyncio.run(rsvp_mod._assert_event_studio_read(conn, "ev1", {"id": COHOST, "via": "supabase"}))
    assert e.value.status_code == 403
    env.who["id"] = COHOST; env.c.post("/api/cohosts/claim")
    asyncio.run(rsvp_mod._assert_event_studio_read(conn, "ev1", {"id": COHOST, "via": "supabase"}))   # no raise
    with pytest.raises(HTTPException):
        asyncio.run(rsvp_mod._assert_event_studio_read(conn, "ev1", {"id": STRANGER, "via": "supabase"}))


def test_a_cohost_leaves_by_saying_me(env):
    invite(env, "cohost@example.test")
    env.who["id"] = COHOST; env.c.post("/api/cohosts/claim")
    assert env.c.delete("/api/events/ev1/cohosts/me").status_code == 200 and env.db.rows == []
    env.who["id"] = STRANGER
    assert env.c.delete("/api/events/ev1/cohosts/me").status_code == 404
