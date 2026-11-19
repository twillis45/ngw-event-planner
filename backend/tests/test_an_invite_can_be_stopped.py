"""An email a host sends through the app can be stopped by the person it went
to (owner ruling 11/19/2026, decision 7: an unsubscribe line on invites).

Every email the message route sends carries a "stop emails about this event"
link and a one-click List-Unsubscribe header, keyed by a random token per
(event, address) (migration 031). Opening the link only shows a button: mail
scanners open links, and a scanner must never stop anyone. Once stopped, the
route refuses to email that address about that event, and says why. Before 031
reaches a database the route sends exactly as it did, without the link.
"""
import sys
import types
import json

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.routers.communication as cm

GUEST = "guest@example.test"


class Conn:
    def __init__(self, db): self.db = db
    async def fetchrow(self, q, *a):
        if "from public.events where id=$1" in q:
            return {"data": json.dumps(self.db["event"])}
        if "from public.email_stops where event_id" in q:
            return self.db["stops"].get((a[0], a[1]))
        if "insert into public.email_stops" in q:
            key = (a[0], a[1])
            self.db["stops"].setdefault(key, {"token": a[2], "stopped_at": None})
            return self.db["stops"][key]
        if q.lstrip().startswith("insert into event_messages"):
            self.db["msgs"].append(a)
            return {"id": len(self.db["msgs"]), "metadata": a[9]}
        if q.lstrip().startswith("update event_messages"):
            return {"id": a[0], "metadata": json.dumps({"delivery": json.loads(a[1])})}
        raise AssertionError(q)
    async def fetchval(self, q, *a):
        if "to_regclass('public.email_stops')" in q:
            return "email_stops"
        if "count(*) from event_messages" in q:
            return 0
        raise AssertionError(q)
    async def execute(self, q, *a):
        if "update public.email_stops set stopped_at" in q:
            for row in self.db["stops"].values():
                if row["token"] == a[0]:
                    row["stopped_at"] = "now"
            return "UPDATE 1"
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
    db = {"event": {"name": "My Friendsgiving", "guests": [{"name": "Guest One", "email": GUEST}]}, "msgs": [], "stops": {}}
    sent = []
    async def gp(): return Pool(Conn(db))
    async def planner(*a, **k): return {"id": "u1", "email": "host@example.test", "via": "supabase"}
    async def access(conn, event_id, principal, claim=True): return None
    async def channel(conn, event_id, t): return {"id": "ch1"}
    async def thread(**k): sent.append(k); return {"ok": True, "resend_id": "r1", "provider": "resend"}
    monkeypatch.setattr(cm, "get_pool", gp)
    monkeypatch.setattr(cm, "require_planner", planner)
    monkeypatch.setattr(cm, "_assert_event_access", access)
    monkeypatch.setattr(cm, "_channel", channel)
    monkeypatch.setattr(cm, "send_thread_email", thread)
    app = FastAPI(); app.include_router(cm.router); app.include_router(cm.public_router)
    return types.SimpleNamespace(db=db, sent=sent, c=TestClient(app))


def send(env):
    return env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "message_type": "standard", "body": "You’re invited.", "deliver_email": True,
        "recipient_email": GUEST, "recipient_name": "Guest One", "subject": "You’re invited — My Friendsgiving",
        "author_name": "Vida Reyes"})


def test_every_email_carries_a_stop_link_and_a_one_click_header(env):
    assert send(env).status_code == 200
    k = env.sent[0]
    token = env.db["stops"][("ev1", GUEST)]["token"]
    assert len(token) >= 22
    assert f"/api/public/email/stop/{token}" in k["body_html"] and f"/api/public/email/stop/{token}" in k["body_text"]
    assert "Stop emails about this event" in k["body_html"]
    assert k["headers"]["List-Unsubscribe"].endswith(f"/api/public/email/stop/{token}>")
    assert k["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_the_same_address_keeps_the_same_token(env):
    send(env); send(env)
    assert len(env.db["stops"]) == 1


def test_opening_the_link_stops_nothing_and_the_button_does(env):
    send(env)
    token = env.db["stops"][("ev1", GUEST)]["token"]
    page = env.c.get(f"/api/public/email/stop/{token}")
    assert page.status_code == 200 and "<form method=post" in page.text
    assert env.db["stops"][("ev1", GUEST)]["stopped_at"] is None      # a scanner opened it: nothing changed
    done = env.c.post(f"/api/public/email/stop/{token}")
    assert done.status_code == 200 and env.db["stops"][("ev1", GUEST)]["stopped_at"] is not None


def test_once_stopped_the_host_cannot_email_them_about_this_event(env):
    send(env)
    token = env.db["stops"][("ev1", GUEST)]["token"]
    env.c.post(f"/api/public/email/stop/{token}")
    r = send(env)
    assert r.status_code == 410 and "asked not to" in r.json()["detail"]
    assert len(env.sent) == 1                                          # the second email never left


def test_a_short_or_unknown_token_answers_the_same_page(env):
    assert env.c.get("/api/public/email/stop/short").status_code == 404
    r = env.c.post("/api/public/email/stop/" + "x" * 30)
    assert r.status_code == 200                                        # no oracle: same page, nothing stopped


def test_an_invite_send_is_the_invitation_and_keeps_its_stop_link(env):
    env.db["event"].update({"date": "2026-11-21", "startTime": "16:00", "startTimeSource": "host", "venue": "Vida's", "rsvpCode": "Code123456789012"})
    r = env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "message_type": "standard", "body": "We’d love to have you.", "deliver_email": True, "invite": True,
        "recipient_email": GUEST, "recipient_name": "Guest One", "subject": "You’re invited — My Friendsgiving",
        "author_name": "Vida Reyes"})
    assert r.status_code == 200
    k = env.sent[0]
    token = env.db["stops"][("ev1", GUEST)]["token"]
    assert "Open your invitation" in k["body_html"] and "Yes, I’m in" in k["body_html"]
    assert "Saturday<br>November 21" in k["body_html"] and "4:00 PM" in k["body_html"] and "?rsvp=Code123456789012" in k["body_html"]
    assert f"/api/public/email/stop/{token}" in k["body_html"] and f"/api/public/email/stop/{token}" in k["body_text"]
    assert k["headers"]["List-Unsubscribe"].endswith(f"{token}>")


def test_a_note_to_a_vendor_is_not_dressed_as_an_invitation(env):
    send(env)
    assert "An invitation" not in env.sent[0]["body_html"]


def test_an_invite_missing_its_place_is_refused_and_nothing_is_sent(env):
    # Owner, 11/19/2026: "Before sending invites app should verify if the
    # important info is included." The saved event has a day and an hour, no place.
    env.db["event"].update({"date": "2026-11-21", "startTime": "16:00", "startTimeSource": "host", "rsvpCode": "Code123456789012"})
    for k in ("venue", "venueAddress", "venueCity"):
        env.db["event"].pop(k, None)
    r = env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "message_type": "standard", "body": "We’d love to have you.", "deliver_email": True, "invite": True,
        "recipient_email": GUEST, "recipient_name": "Guest One", "subject": "You’re invited — My Friendsgiving",
        "author_name": "Vida Reyes"})
    assert r.status_code == 422 and "missing the place" in r.json()["detail"]
    assert env.sent == []
