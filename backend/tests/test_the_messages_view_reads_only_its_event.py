"""The host's Messages view (owner, 11/20/2026): GET .../communication/sent.

One read of everything the app emailed on an event's behalf, with the status
the Resend webhook last wrote, and the co-host invitations. Pinned here:
  - signed in, and only the event's own studio or a CLAIMED co-host of it;
  - only THIS event's rows, never another studio's;
  - the co-host list is the host's alone (cohosts.list_cohosts is host-only);
  - metadata that arrives as JSON text is read, and resend_id / error /
    portal_token never leave the server;
  - a co-host invite email is now recorded where the others are, and does not
    spend the vendor/guest email cap;
  - the subject and "invite" are kept on a new send, so the view can say what
    it was without guessing.
Synthetic people only.
"""
import sys
import types
import json
from datetime import datetime, timezone

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.communication as cm
import app.routers.cohosts as ch

HOST = "00000000-0000-0000-0000-0000000000a1"
COHOST = "00000000-0000-0000-0000-0000000000c1"
INVITED = "00000000-0000-0000-0000-0000000000c2"     # invited, never signed in
STRANGER = "00000000-0000-0000-0000-0000000000e1"     # another studio's host
STUDIO = "10000000-0000-0000-0000-000000000001"
OTHER_STUDIO = "10000000-0000-0000-0000-000000000002"
T0 = datetime(2026, 11, 20, 15, 0, tzinfo=timezone.utc)


def _msg(event_id, delivery, minute, as_text=True):
    return {"id": f"m-{event_id}-{minute}", "event_id": event_id,
            "created_at": T0.replace(minute=minute), "updated_at": T0.replace(minute=minute),
            "delivery": json.dumps(delivery) if as_text else delivery}


class DB:
    def __init__(self):
        self.events = {"ev1": STUDIO, "ev2": OTHER_STUDIO}
        self.members = {(STUDIO, HOST), (OTHER_STUDIO, STRANGER)}
        self.cohosts = [
            {"event_id": "ev1", "email": "cohost@example.test", "user_id": COHOST,
             "created_at": T0.replace(minute=1), "accepted_at": T0.replace(minute=30)},
            {"event_id": "ev1", "email": "pending@example.test", "user_id": None,
             "created_at": T0.replace(minute=2), "accepted_at": None},
        ]
        self.msgs = [
            _msg("ev1", {"intent": "email", "status": "email-delivered", "recipient_email": "maya@example.test",
                         "recipient_name": "Maya Chen", "subject": "You’re invited", "kind": "invite",
                         "resend_id": "secret-resend-id", "provider_event": "email.delivered"}, 10),
            _msg("ev1", {"intent": "email", "status": "email-bounced", "recipient_email": "rosa@example.test",
                         "error": "mailbox full"}, 11, as_text=False),
            _msg("ev2", {"intent": "email", "status": "accepted", "recipient_email": "theirs@example.test",
                         "subject": "Another studio’s note"}, 12),
        ]


class Conn:
    def __init__(self, db): self.db = db
    async def fetchrow(self, q, *a):
        if "select studio_id from public.events where id=$1" in q:
            s = self.db.events.get(a[0]); return {"studio_id": s} if s else None
        if "from event_owners" in q:
            return None
        raise AssertionError(q)
    async def fetchval(self, q, *a):
        if "to_regclass('public.event_cohosts')" in q: return True
        if "select studio_id from public.events where id=$1" in q: return self.db.events.get(a[0])
        if "from studio_members" in q: return 1 if (str(a[0]), str(a[1])) in self.db.members else None
        if "from public.event_cohosts where event_id=$1 and user_id=$2::uuid and accepted_at is not null" in q:
            return 1 if any(c["event_id"] == a[0] and c["user_id"] == a[1] and c["accepted_at"] for c in self.db.cohosts) else None
        raise AssertionError(q)
    async def fetch(self, q, *a):
        if "from event_messages" in q:
            assert "event_id=$1" in q and "metadata ? 'delivery'" in q
            rows = [m for m in self.db.msgs if m["event_id"] == a[0]]
            return sorted(rows, key=lambda m: m["created_at"], reverse=True)
        if "from public.event_cohosts where event_id=$1" in q:
            return [c for c in self.db.cohosts if c["event_id"] == a[0]]
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
    db = DB(); who = {"id": HOST}
    async def gp(): return Pool(Conn(db))
    async def planner(authorization=None, x_planner_token=None):
        if who["id"] is None:
            raise HTTPException(401, "Sign in")
        return {"id": who["id"], "email": "x@example.test", "via": "supabase"}
    monkeypatch.setattr(cm, "get_pool", gp)
    monkeypatch.setattr(cm, "require_planner", planner)
    app = FastAPI(); app.include_router(cm.router)
    return types.SimpleNamespace(db=db, who=who, c=TestClient(app))


def sent(env, event="ev1"):
    return env.c.get(f"/api/events/{event}/communication/sent")


def test_signed_out_is_refused(env):
    env.who["id"] = None
    assert sent(env).status_code == 401


def test_the_host_reads_this_events_email_newest_first_with_its_real_status(env):
    r = sent(env)
    assert r.status_code == 200, r.text
    emails = r.json()["emails"]
    assert [e["delivery"]["status"] for e in emails] == ["email-bounced", "email-delivered"]
    assert emails[1]["delivery"] == {"intent": "email", "status": "email-delivered", "recipient_email": "maya@example.test",
                                     "recipient_name": "Maya Chen", "subject": "You’re invited", "kind": "invite",
                                     "provider_event": "email.delivered"}


def test_another_studios_messages_never_appear(env):
    body = json.dumps(sent(env).json())
    assert "theirs@example.test" not in body and "Another studio" not in body


def test_nothing_internal_leaves_the_server(env):
    body = json.dumps(sent(env).json())
    assert "secret-resend-id" not in body and "mailbox full" not in body and "portal_token" not in body


def test_another_studios_host_cannot_read_this_event(env):
    env.who["id"] = STRANGER
    assert sent(env).status_code == 403
    assert sent(env, "ev2").status_code == 200       # their own event, still theirs


def test_the_host_sees_co_host_invites_joined_and_pending(env):
    co = sent(env).json()["cohosts"]
    assert co == [
        {"email": "cohost@example.test", "invited_at": "2026-11-20T15:01:00+00:00", "joined_at": "2026-11-20T15:30:00+00:00"},
        {"email": "pending@example.test", "invited_at": "2026-11-20T15:02:00+00:00", "joined_at": None},
    ]


def test_a_claimed_co_host_reads_the_email_but_not_the_co_host_list(env):
    env.who["id"] = COHOST
    r = sent(env)
    assert r.status_code == 200 and len(r.json()["emails"]) == 2 and r.json()["cohosts"] is None


def test_an_invite_nobody_has_claimed_grants_nothing(env):
    env.who["id"] = INVITED
    assert sent(env).status_code == 403


# ── the co-host invite email is recorded at send time ──────────────────────────
class RecordConn:
    def __init__(self): self.inserts = []
    async def execute(self, q, *a):
        assert q.lstrip().startswith("insert into event_messages")
        self.inserts.append(a)


def test_a_co_host_invite_email_is_recorded_with_its_resend_id(monkeypatch):
    rc = RecordConn()
    async def gp(): return Pool(rc)
    async def channel(conn, event_id, t): return {"id": "ch-team"}
    monkeypatch.setattr(ch, "get_pool", gp)
    monkeypatch.setattr(cm, "_channel", channel)
    import asyncio
    asyncio.run(ch._record_invite_email("ev1", "cohost@example.test", "You're invited to co-host X", True, {"id": "re_1"}))
    asyncio.run(ch._record_invite_email("ev1", "late@example.test", "You're invited to co-host X", False, None))
    (ev, chan, body, md), (_e2, _c2, _b2, md2) = rc.inserts
    d = json.loads(md)["delivery"]
    assert ev == "ev1" and chan == "ch-team" and body == "You're invited to co-host X"
    assert d == {"intent": "cohost_invite", "recipient_email": "cohost@example.test", "subject": "You're invited to co-host X",
                 "status": "accepted", "provider": "resend", "resend_id": "re_1"}
    assert json.loads(md2)["delivery"]["status"] == "failed" and "resend_id" not in json.loads(md2)["delivery"]


def test_a_record_that_cannot_be_written_never_undoes_the_invite(monkeypatch):
    async def gp(): raise RuntimeError("db down")
    monkeypatch.setattr(ch, "get_pool", gp)
    import asyncio
    asyncio.run(ch._record_invite_email("ev1", "a@example.test", "s", True, {"id": "x"}))   # no raise


def test_the_invite_route_records_the_email_it_sends(monkeypatch):
    # The route, end to end on test_cohosts' fake, with the recorder observed.
    import tests.test_cohosts as tc
    db = tc.DB(); seen = []
    async def gp(): return tc.Pool(tc.Conn(db))
    async def planner(*a, **k): return {"id": tc.HOST, "email": "host@example.test", "via": "supabase"}
    async def send(**k): return {"id": "re_9"}
    async def record(*a): seen.append(a)
    monkeypatch.setattr(ch, "get_pool", gp)
    monkeypatch.setattr(ch, "require_planner", planner)
    monkeypatch.setattr(ch, "_send_via_resend", send)
    monkeypatch.setattr(ch, "is_email_configured", lambda: True)
    monkeypatch.setattr(ch, "_record_invite_email", record)
    app = FastAPI(); app.include_router(ch.router); c = TestClient(app)
    assert c.post("/api/events/ev1/cohosts", json={"email": "co@example.test"}).json()["emailed"] is True
    assert seen == [("ev1", "co@example.test", "You're invited to co-host Vida’s Friendsgiving", True, {"id": "re_9"})]
    c.post("/api/events/ev1/cohosts", json={"email": "co@example.test"})     # already invited: no email, no record
    assert len(seen) == 1


def test_a_co_host_invite_does_not_spend_the_guest_and_vendor_email_cap():
    import inspect
    src = inspect.getsource(cm._assert_email_send_allowed)
    assert "<> 'cohost_invite'" in src
