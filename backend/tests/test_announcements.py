"""Announcements (owner, 11/16/2026: "go with recommendations"; migration 027).

Pins:
  - 3 in any 24 hours and 20 per event, counted in the database; a removed post
    still counts;
  - host or co-host only (the shared studio-read check), 503 until 027 exists;
  - the invite's public route returns body and time only, never removed posts,
    and resolves the event from the code;
  - emails: once per opted-in address (case-insensitive), never to a blocked
    thread or a guest who did not tick the box, each with its own stop link;
    one failed send never stops the rest.
All names are synthetic.
"""
import asyncio
import datetime as _dt
import sys
import types
import uuid

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.announcements as an
import app.routers.rsvp as rsvp_mod
import app.guest_notices as gn
import app.emailer as em

CODE = "abcdefghij1234567890xy"
EVENT = {"name": "Friendsgiving at Pine Street", "rsvpCode": CODE, "hostNames": "Casey Morgan"}


def _now():
    return _dt.datetime.now(_dt.timezone.utc)


class _Tx:
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False


class _Conn:
    def __init__(self, ready=True):
        self.ready = ready
        self.rows = []          # announcements
        self.threads = []       # guest threads

    def transaction(self):
        return _Tx()

    async def fetchval(self, q, *a):
        if "to_regclass('public.event_announcements')" in q:
            return self.ready
        if "count(distinct lower(guest_email))" in q:
            return len({t["guest_email"].lower() for t in self._mailable(a[0])})
        if "update public.event_announcements set removed_at" in q:
            for r in self.rows:
                if r["id"] == a[0] and r["event_id"] == a[1]:
                    r["removed_at"] = r["removed_at"] or _now()
                    return r["id"]
            return None
        return None

    def _mailable(self, event_id):
        return [t for t in self.threads if t["event_id"] == event_id and t["email_opt_in"]
                and t["guest_email"] and t["blocked_at"] is None]

    async def execute(self, q, *a):
        return "OK"

    async def fetchrow(self, q, *a):
        if "count(*) filter (where created_at > now() - interval '24 hours')" in q:
            mine = [r for r in self.rows if r["event_id"] == a[0]]
            return {"day": sum(1 for r in mine if r["created_at"] > _now() - _dt.timedelta(hours=24)), "total": len(mine)}
        if "insert into public.event_announcements" in q:
            r = {"id": uuid.uuid4(), "event_id": a[0], "body": a[1], "posted_by": a[2], "created_at": _now(), "removed_at": None}
            self.rows.append(r)
            return r
        if "data->>'rsvpCode'" in q and "from public.events" in q and "event_announcements" not in q:
            return {"id": "e1", "data": dict(EVENT)} if a[0] == CODE else None
        if "from public.event_announcements a join public.events e" in q:
            r = next((x for x in self.rows if x["id"] == a[0]), None)
            if not r:
                return None
            return {"event_id": r["event_id"], "body": r["body"], "removed_at": r["removed_at"],
                    "event_name": EVENT["name"], "rsvp_code": CODE,
                    "event_data": getattr(self, "event_data", None) or dict(EVENT), "profile_name": getattr(self, "profile_name", None)}
        return None

    async def fetch(self, q, *a):
        if "select id, body, created_at, removed_at from public.event_announcements" in q:
            return sorted([r for r in self.rows if r["event_id"] == a[0]], key=lambda r: r["created_at"], reverse=True)
        if "select body, created_at from public.event_announcements" in q:
            return sorted([r for r in self.rows if r["event_id"] == a[0] and r["removed_at"] is None],
                          key=lambda r: r["created_at"], reverse=True)
        if "distinct on (lower(guest_email))" in q:
            seen, out = set(), []
            for t in sorted(self._mailable(a[0]), key=lambda t: t["created_at"]):
                if t["guest_email"].lower() not in seen:
                    seen.add(t["guest_email"].lower())
                    out.append(t)
            return out
        return []


class _Acq:
    def __init__(self, c): self.c = c
    async def __aenter__(self): return self.c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, c): self.c = c
    def acquire(self): return _Acq(self.c)


def _client(monkeypatch, conn, allowed=True, sent=None, fail_for=()):
    async def fake_planner(*a, **k):
        return {"id": "11111111-1111-4111-8111-111111111111", "via": "supabase"}

    async def fake_pool():
        return _Pool(conn)

    async def fake_read(c, event_id, principal):
        if not allowed or event_id != "e1":
            raise HTTPException(403, "no")

    async def fake_resolve(c, code):
        return ("e1", dict(EVENT)) if code == CODE else None

    async def fake_send(**kw):
        if kw["to"] in fail_for:
            raise em.ResendRejected(422, "validation_error test")
        (sent if sent is not None else []).append(kw)
        return {"id": "x"}

    monkeypatch.setattr(an, "require_planner", fake_planner)
    monkeypatch.setattr(an, "get_pool", fake_pool)
    monkeypatch.setattr(an, "_assert_event_studio_read", fake_read)
    monkeypatch.setattr(an, "_resolve_event", fake_resolve)
    monkeypatch.setattr(gn, "get_pool", fake_pool)
    monkeypatch.setattr(gn, "is_email_configured", lambda: True)
    monkeypatch.setattr(gn, "_send_via_resend", fake_send)
    monkeypatch.setattr(gn, "SEND_GAP_SECONDS", 0)
    rsvp_mod._rate.clear()
    app = FastAPI()
    app.include_router(an.router)
    return TestClient(app)


def _post(c, body="Parking is on Elm after 5."):
    return c.post("/api/events/e1/announcements", json={"body": body})


def _thread(conn, email, opt_in=True, blocked=False, token=None):
    conn.threads.append({"event_id": "e1", "guest_email": email, "email_opt_in": opt_in,
                         "blocked_at": _now() if blocked else None, "guest_token": token or uuid.uuid4().hex,
                         "created_at": _now()})


def test_three_a_day_and_a_removed_post_still_counts(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    ids = [_post(c, f"Update {i}").json()["announcement"]["id"] for i in range(3)]
    c.delete(f"/api/events/e1/announcements/{ids[0]}")
    r = _post(c)
    assert r.status_code == 429 and "3 updates in the last day" in r.json()["detail"]


def test_twenty_per_event(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    for i in range(20):
        conn.rows.append({"id": uuid.uuid4(), "event_id": "e1", "body": "x", "posted_by": None,
                          "created_at": _now() - _dt.timedelta(days=2 + i), "removed_at": None})
    r = _post(c)
    assert r.status_code == 429 and "(20)" in r.json()["detail"]


def test_off_until_027_and_host_only(monkeypatch):
    c = _client(monkeypatch, _Conn(ready=False))
    assert _post(c).status_code == 503
    c = _client(monkeypatch, _Conn(), allowed=False)
    assert _post(c).status_code == 403
    assert c.get("/api/events/e1/announcements").status_code == 403


def test_bodies_are_plain_text_within_the_limit(monkeypatch):
    c = _client(monkeypatch, _Conn())
    assert _post(c, "").status_code == 422
    assert _post(c, "a" * 1001).status_code == 422
    assert _post(c, "bad\x00").status_code == 422
    r = _post(c, "  Two lines\nare fine.  ")
    assert r.status_code == 200 and r.json()["announcement"]["body"] == "Two lines\nare fine."


def test_the_invite_shows_body_and_time_only_and_never_a_removed_post(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    keep = _post(c, "Bring a chair.").json()["announcement"]
    gone = _post(c, "Wrong address, sorry.").json()["announcement"]
    c.delete(f"/api/events/e1/announcements/{gone['id']}")
    r = c.get(f"/api/public/announcements/{CODE}")
    assert r.status_code == 200
    items = r.json()["announcements"]
    assert [i["body"] for i in items] == ["Bring a chair."]
    assert all(set(i) == {"body", "created_at"} for i in items)
    assert keep["id"] not in r.text
    assert c.get("/api/public/announcements/" + "z" * 22).status_code == 404


def test_emails_once_per_opted_in_address_never_blocked_or_unticked(monkeypatch):
    conn, sent = _Conn(), []
    _thread(conn, "jordan.guest@example.test", token="tok-jordan-aaaaaaaaaaaaaaaa")
    _thread(conn, "Jordan.Guest@example.test")                   # same address, another device
    _thread(conn, "ana.guest@example.test", opt_in=False)        # did not tick
    _thread(conn, "sam.guest@example.test", blocked=True)        # blocked by the host
    _thread(conn, "lee.guest@example.test", token="tok-lee-bbbbbbbbbbbbbbbbbbbb")
    c = _client(monkeypatch, conn, sent=sent)
    r = _post(c, "Doors open at 4.")
    assert r.status_code == 200 and r.json()["emailing"] == 2
    assert sorted(m["to"].lower() for m in sent) == ["jordan.guest@example.test", "lee.guest@example.test"]
    m = next(x for x in sent if x["to"].startswith("lee"))
    assert m["from_name"] == "Casey via No Guesswork"
    assert m["subject"] == "Update from Casey — Friendsgiving at Pine Street"
    assert "Doors open at 4." in m["html"]
    assert "/api/public/questions/unsubscribe/tok-lee-bbbbbbbbbbbbbbbbbbbb" in m["html"]
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_one_failed_send_never_stops_the_rest(monkeypatch):
    conn, sent = _Conn(), []
    _thread(conn, "bad.guest@example.test")
    _thread(conn, "good.guest@example.test")
    c = _client(monkeypatch, conn, sent=sent, fail_for=("bad.guest@example.test",))
    assert _post(c).status_code == 200
    assert [m["to"] for m in sent] == ["good.guest@example.test"]
