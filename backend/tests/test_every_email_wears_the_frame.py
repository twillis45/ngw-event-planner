"""Every email the app sends wears the invite's frame (owner, 11/20/2026: "There
will be a branded envelope too" about the helper ask, then "And other comms").

The frame is backend/app/email_frame.py. Each email here must carry its mark
(the cream card), say who sent it, and keep the stop link it had. The helper
ask is now an email the app sends: these pin who may send it, what it says,
the shared daily cap, and the record the Messages view reads.
"""
import sys
import types
import json
import datetime as dt

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.email_frame as ef
import app.emailer as em
import app.guest_notices as gn
import app.host_alerts as ha
import app.host_reminders as hr
import app.host_email as he
from app.invite_email import compose_invite_email
import app.routers.communication as cm
import app.routers.cohosts as co
import app.routers.helper_link as hl

STOP = "https://api.example.test/api/public/email/stop/tok-aaaaaaaaaaaaaaaaaaaa"
EVENT = {"name": "My Friendsgiving", "type": "Friendsgiving", "date": "2026-11-21", "startTime": "4:00 PM",
         "venue": "Vida's", "venueAddress": "271 Whitaker Rd", "rsvpCode": "rsvp-code-aaaaaaaaaaaa",
         "hostName": "Casey Rivera"}


def framed(html, theme="paper"):
    # PAPER: the linen grain image behind the card, like the invite's picture.
    # MATTE (the host's own emails): the app's flat charcoal card. Both declare
    # the light-only color scheme so a dark-mode mail app (Spark, Apple Mail)
    # does not repaint them (owner, 11/19/2026, on the reminder).
    mark = ef.MARK in html and ef.PAPER_IMAGE in html
    matte = ef.MATTE_MARK in html and ef.PAPER_IMAGE not in html
    return ((mark if theme == "paper" else matte)
            and 'name="color-scheme" content="light only"' in html)


# ── each email: the frame, the sender line, its stop link ────────────────────
def test_the_invite_wears_the_frame():
    html, text = compose_invite_email(EVENT, "", "Jordan", "Casey Rivera", STOP)
    assert framed(html) and "Sent by Casey Rivera with No Guesswork Events." in html
    assert STOP in html and STOP in text and "Stop emails about this event" in html


def test_the_hosts_message_wears_the_frame():
    html, text = cm.compose_message_email(EVENT, "Can you confirm 3 PM?\nThanks", "Rosa", "Casey Rivera", STOP)
    assert framed(html)
    for part in (html, text):
        assert "Sent by Casey Rivera with No Guesswork Events." in part
        assert STOP in part and "Stop emails about this event" in part
        assert "My Friendsgiving" in part and "Hi Rosa," in part
    assert "Can you confirm 3 PM?<br>Thanks" in html


def test_the_reply_notice_and_the_announcement_wear_the_frame():
    for compose in (gn.compose_reply_notice, gn.compose_announcement):
        from_name, subject, html, headers, text = compose("Casey", "My Friendsgiving", "Doors at 4.", "rsvp-1", "gtok-1")
        stop = gn.unsubscribe_url("gtok-1")
        assert framed(html) and "Sent by Casey with No Guesswork Events." in html
        assert stop in html and stop in text and "Stop these emails" in html
        assert headers == {"List-Unsubscribe": f"<{stop}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
        assert from_name == "Casey via No Guesswork"


def test_the_cohost_invite_wears_the_frame():
    html, text = co.compose_cohost_invite("My Friendsgiving", "sam.cohost@example.test", "Casey Rivera")
    assert framed(html, "matte") and "Sent by Casey Rivera with No Guesswork Events." in html
    assert "co-host" in html and "sam.cohost@example.test" in text


def test_the_approval_email_wears_the_frame(monkeypatch):
    sent = []
    async def fake(**k): sent.append(k); return {"id": "r1"}
    monkeypatch.setattr(em, "_send_via_resend", fake)
    monkeypatch.setattr(em, "is_email_configured", lambda: True)
    import asyncio
    r = asyncio.run(em.send_approval_email("client@example.test", "My <Friendsgiving>", "Menu & budget", "https://app.example.test/?event=e1"))
    assert r["ok"] and framed(sent[0]["html"]) and "Sent with No Guesswork Events." in sent[0]["html"]
    assert "&lt;Friendsgiving&gt;" in sent[0]["html"] and "<Friendsgiving>" not in sent[0]["html"]
    assert "https://app.example.test/?event=e1" in sent[0]["text"]


def test_host_emails_wear_the_frame_without_the_invitation():
    _s, html, text = ha.compose("rsvp", "Jordan", "My Friendsgiving", "Yes")
    s2, html2, text2 = hr.compose_week_before("My Friendsgiving", dt.date(2026, 11, 21), "tok-r")
    assert framed(html, "matte") and framed(html2, "matte")
    assert "Sent by No Guesswork Events." in html and "Sent by No Guesswork Events." in html2
    assert he.stop_url("tok-r") in html2 and "Stop plan reminders" in html2
    for h in (html, html2):
        assert "invited" not in h.lower() and "pick your answer" not in h.lower()


def test_a_solemn_event_gets_the_muted_hue():
    html, _t = cm.compose_message_email({**EVENT, "name": "Repast for Ana", "type": "Repast"}, "x", None, "Casey", None)
    assert ef.SOMBRE_HUE in html and ef.HUE not in html


# ── the helper ask, composed ──────────────────────────────────────────────────
HELPER_EVENT = {**EVENT, "guests": [{"id": "g1", "name": "Jordan Lee", "email": "jordan.helper@example.test",
                                     "allergens": ["Peanut"]}],
                "foodAdd": [{"id": "f1", "name": "The stuffing", "owner": "Jordan Lee"}],
                "timeline": [{"id": "t1", "task": "Set up chairs", "owner": "Jordan"}]}


@pytest.mark.parametrize("stored", ["4:00 PM", "16:00"])
def test_the_helper_email_reads_the_afternoon_either_way(stored):
    data = {**HELPER_EVENT, "startTime": stored}
    helper = hl.build_helper_payload(data, "g1")
    subject, html, text = hl.compose_helper_email(data, helper, "https://app.example.test/hostv2/?helper=CODE", STOP)
    for part in (html, text):
        assert "4:00 PM" in part and "4:00 AM" not in part and "16:00" not in part
        assert "Saturday" in part and "November 21" in part
        assert "Vida" in part and "271 Whitaker Rd" in part
    assert subject == "Your job for My Friendsgiving"
    # The jobs, each on its own line; the allergy note names the allergen, never the guest.
    assert "• The stuffing — keep it nut-free, a guest is allergic\n• Set up chairs" in text
    assert "• The stuffing — keep it nut-free, a guest is allergic<br>• Set up chairs" in html
    # Both answers open the helper's own page; the frame, the sender, the stop link.
    assert html.count('href="https://app.example.test/hostv2/?helper=CODE"') == 2
    assert "I can do it" in html and "I can’t" in html
    assert framed(html) and "Sent by Casey Rivera with No Guesswork Events." in html
    assert STOP in html and STOP in text


def test_a_derived_hour_is_never_stated():
    data = {**HELPER_EVENT, "startTime": "16:00", "startTimeSource": "derived"}
    _s, html, text = hl.compose_helper_email(data, hl.build_helper_payload(data, "g1"), "https://x.test/?helper=C", None)
    assert "4:00" not in html and "4:00" not in text


# ── the helper ask, sent: auth, cap, record ──────────────────────────────────
STUDIO_MEMBER, COHOST, STRANGER = "u-host", "u-cohost", "u-stranger"


class DB:
    def __init__(self):
        self.event = json.loads(json.dumps(HELPER_EVENT))
        self.event["vendors"] = [{"name": "Rosa", "email": "rosa.caterer@example.test"}]
        self.msgs = []      # [{"id", "metadata"}]
        self.links = {}
        self.stops = {}
        self.prior = 0      # sends earlier today, before this test's own


class Conn:
    def __init__(self, db): self.db = db
    def _sent_today(self):
        own = sum(1 for m in self.db.msgs
                  if "delivery" in m["metadata"] and m["metadata"]["delivery"].get("intent") != "cohost_invite")
        return self.db.prior + own
    async def fetchrow(self, q, *a):
        q = " ".join(q.split())
        if q.startswith("select studio_id from public.events where id=$1"):
            return {"studio_id": "studio-1"}
        if q.startswith("select id, data from public.events") or q.startswith("select data from public.events"):
            return {"id": a[0], "data": json.dumps(self.db.event)}
        if q.startswith("select * from event_channels"):
            return {"id": "ch1"}
        if q.startswith("select token, stopped_at from public.email_stops"):
            return self.db.stops.get(a[1])
        if q.startswith("insert into public.email_stops"):
            self.db.stops[a[1]] = {"token": "tok-" + a[1].split("@")[0], "stopped_at": None}
            return self.db.stops[a[1]]
        if q.startswith("insert into event_messages"):
            meta = json.loads(a[-1]) if isinstance(a[-1], str) else {}
            m = {"id": len(self.db.msgs) + 1, "metadata": meta}
            self.db.msgs.append(m)
            return {"id": m["id"], "metadata": json.dumps(meta)}
        if q.startswith("update event_messages"):
            m = next(x for x in self.db.msgs if x["id"] == a[0])
            m["metadata"]["delivery"] = json.loads(a[1])
            return {"id": a[0], "metadata": json.dumps(m["metadata"])}
        raise AssertionError(q)
    async def fetchval(self, q, *a):
        q = " ".join(q.split())
        if q.startswith("select 1 from studio_members"):
            return 1 if a[1] == STUDIO_MEMBER else None
        if "to_regclass('public.event_cohosts')" in q:
            return True
        if q.startswith("select 1 from public.event_cohosts"):
            return 1 if a[1] == COHOST else None
        if "to_regclass('public.email_stops')" in q:
            return "public.email_stops"
        if "count(*) from event_messages" in q:
            return self._sent_today()
        if q.startswith("select code from public.helper_links"):
            return self.db.links.get(a[1])
        if q.startswith("insert into public.helper_links"):
            self.db.links[a[2]] = a[0]
            return a[0]
        raise AssertionError(q)
    async def execute(self, q, *a):
        q = " ".join(q.split())
        if q.startswith("update event_messages"):
            m = next(x for x in self.db.msgs if x["id"] == a[0])
            m["metadata"]["delivery"] = json.loads(a[1])
            return
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
    db = DB(); who = {"id": STUDIO_MEMBER}; sent = []
    async def gp(): return Pool(Conn(db))
    async def planner(*a, **k): return {"id": who["id"], "email": "someone@example.test", "via": "supabase"}
    async def send(**k):
        sent.append(k)
        return {"ok": True, "resend_id": f"re_{len(sent)}", "provider": "resend"}
    async def access(conn, event_id, principal, claim=True): return None
    for mod in (hl, cm):
        monkeypatch.setattr(mod, "get_pool", gp)
        monkeypatch.setattr(mod, "require_planner", planner)
        monkeypatch.setattr(mod, "send_thread_email", send)
    monkeypatch.setattr(cm, "_assert_event_access", access)
    monkeypatch.setattr(hl, "APP_BASE_URL", "https://app.example.test")
    app = FastAPI(); app.include_router(hl.router); app.include_router(cm.router)
    return types.SimpleNamespace(db=db, who=who, sent=sent, c=TestClient(app))


def ask(env, name="Jordan Lee"):
    return env.c.post("/api/events/ev1/helper-links/email", json={"helper_name": name})


def test_the_studio_sends_it_and_it_is_recorded(env):
    r = ask(env)
    assert r.status_code == 200 and r.json()["ok"] is True and r.json()["status"] == "accepted"
    (m,) = env.sent
    assert m["to"] == "jordan.helper@example.test" and m["sender_name"] == "Casey Rivera via No Guesswork"
    assert framed(m["body_html"]) and "4:00 PM" in m["body_text"]
    assert "https://app.example.test/hostv2/?helper=" in m["body_html"]
    stop = cm.email_stop_url("tok-jordan.helper")
    assert stop in m["body_html"] and m["headers"]["List-Unsubscribe"] == f"<{stop}>"
    (row,) = env.db.msgs
    d = row["metadata"]["delivery"]
    assert d["kind"] == "helper" and d["status"] == "accepted" and d["resend_id"] == "re_1"
    assert d["recipient_email"] == "jordan.helper@example.test" and d["subject"] == "Your job for My Friendsgiving"


def test_a_claimed_cohost_may_send(env):
    env.who["id"] = COHOST
    assert ask(env).status_code == 200 and len(env.sent) == 1


def test_a_stranger_is_refused_and_nothing_is_sent_or_written(env):
    env.who["id"] = STRANGER
    r = ask(env)
    assert r.status_code == 403
    assert env.sent == [] and env.db.msgs == [] and env.db.links == {}


def test_a_failed_send_is_recorded_as_failed_and_never_accepted(env, monkeypatch):
    async def refuse(**k): return {"ok": False, "error": "422 validation_error", "provider": "resend"}
    monkeypatch.setattr(hl, "send_thread_email", refuse)
    r = ask(env)
    assert r.status_code == 200 and r.json() == {"ok": False, "status": "failed", "message_id": "1"}
    assert env.db.msgs[0]["metadata"]["delivery"]["status"] == "failed"


def test_no_email_saved_for_the_helper_sends_nothing(env):
    env.db.event["guests"][0]["email"] = ""
    r = ask(env)
    assert r.status_code == 422 and env.sent == [] and env.db.msgs == []


def test_a_stopped_address_is_not_emailed(env):
    env.db.stops["jordan.helper@example.test"] = {"token": "t", "stopped_at": "2026-11-20"}
    assert ask(env).status_code == 410 and env.sent == []


def test_the_cap_is_shared_with_the_message_route(env):
    env.db.prior = cm.EMAIL_SENDS_PER_EVENT_PER_DAY - 1
    assert ask(env).status_code == 200                      # the event's 40th email today
    r = env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "body": "See you at 3", "deliver_email": True, "recipient_email": "rosa.caterer@example.test"})
    assert r.status_code == 429                             # the helper email spent the message route's cap
    env.db.prior = cm.EMAIL_SENDS_PER_EVENT_PER_DAY
    env.sent.clear()
    assert ask(env).status_code == 429 and env.sent == []   # and the message route's sends spend the helper's


def test_a_draft_that_greets_is_not_greeted_twice():
    html, text = cm.compose_message_email(EVENT, "Hi Rosa,\n\nSee you at 3.", "Rosa", "Casey", None)
    assert html.count("Hi Rosa,") == 1 and text.count("Hi Rosa,") == 1
