"""The message route's email is the host writing to someone ON the event, not a
relay for anyone to mail anyone (security self-test, 11/17/2026, H1).

Before: any signed-in account could post to a made-up event id (first touch
claimed it), name any recipient, subject, From name and reply-to, put raw HTML
in the body, and repeat without limit — phishing sent from the product's own
verified domain. The host app's one real use is "Email this vendor", whose
address is already saved on the event; these pin that it still works and that
nothing else does.
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

HOST_EMAIL = "host@example.test"
VENDOR = "caterer@example.test"


class Conn:
    def __init__(self, db): self.db = db
    async def fetchrow(self, q, *a):
        if "from public.events where id=$1" in q:
            d = self.db["events"].get(a[0])
            return None if d is None else {"data": json.dumps(d)}
        if q.lstrip().startswith("insert into event_messages"):
            self.db["msgs"].append(a)
            return {"id": len(self.db["msgs"]), "metadata": a[9]}
        if q.lstrip().startswith("update event_messages"):
            return {"id": a[0], "metadata": json.dumps({"delivery": json.loads(a[1])})}
        raise AssertionError(q)
    async def fetchval(self, q, *a):
        if "to_regclass('public.email_stops')" in q:
            return None      # before 031: no stop links, and sends go as before
        if "count(*) from event_messages" in q:
            return self.db["sent_today"]
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
    db = {"events": {"ev1": {"name": "Jordan’s 50th", "vendors": [{"name": "Rosa", "email": "Caterer@Example.test"}]}},
          "msgs": [], "sent_today": 0}
    sent = []
    async def gp(): return Pool(Conn(db))
    async def planner(*a, **k): return {"id": "u1", "email": HOST_EMAIL, "via": "supabase"}
    async def access(conn, event_id, principal, claim=True): return None
    async def channel(conn, event_id, t): return {"id": "ch1"}
    async def thread(**k): sent.append(("thread", k)); return {"ok": True, "resend_id": "r1", "provider": "resend"}
    async def approval(to, event_name, context, link): sent.append(("approval", dict(to=to, event_name=event_name, context=context, link=link))); return {"ok": True, "resend_id": "r2"}
    monkeypatch.setattr(cm, "get_pool", gp)
    monkeypatch.setattr(cm, "require_planner", planner)
    monkeypatch.setattr(cm, "_assert_event_access", access)
    monkeypatch.setattr(cm, "_channel", channel)
    monkeypatch.setattr(cm, "send_thread_email", thread)
    monkeypatch.setattr(cm, "send_approval_email", approval)
    app = FastAPI(); app.include_router(cm.router)
    return types.SimpleNamespace(db=db, sent=sent, c=TestClient(app))


def post(env, event="ev1", channel="CLIENT", **body):
    base = {"message_type": "standard", "body": "Can you do 3pm?", "deliver_email": True,
            "recipient_email": VENDOR, "recipient_name": "Rosa", "subject": "Jordan’s 50th"}
    base.update(body)
    return env.c.post(f"/api/events/{event}/communication/channels/{channel}/messages", json=base)


def test_emailing_a_vendor_saved_on_the_event_still_works(env):
    r = post(env, reply_to=HOST_EMAIL)
    assert r.status_code == 200, r.text
    kind, k = env.sent[0]
    assert kind == "thread" and k["to"] == VENDOR and k["reply_to"] == HOST_EMAIL


def test_an_address_not_on_the_event_is_refused_and_nothing_is_sent(env):
    r = post(env, recipient_email="victim@elsewhere.test")
    assert r.status_code == 403 and env.sent == [] and env.db["msgs"] == []


def test_a_near_miss_address_is_not_on_the_event(env):
    # A substring of a saved address is not that address.
    assert post(env, recipient_email="aterer@example.test").status_code == 403
    assert post(env, recipient_email="caterer@example.te").status_code == 403
    assert env.sent == []


def test_an_event_that_is_not_saved_to_an_account_cannot_send(env):
    # A made-up id used to be claimed on first touch; it can never send email.
    r = post(env, event="made-up-123")
    assert r.status_code == 409 and env.sent == []


def test_the_body_and_name_are_text_not_html(env):
    post(env, body='<a href="https://evil.test">Reset your password</a>\nline 2', recipient_name="<b>Rosa</b>")
    html = env.sent[0][1]["body_html"]
    assert "<a href" not in html and "&lt;a href=" in html and "<b>Rosa" not in html
    assert "line 2" in html and "<br>" in html     # line breaks still read as line breaks


def test_a_reply_to_that_is_not_the_senders_own_address_is_dropped(env):
    post(env, reply_to="attacker@evil.test")
    assert env.sent[0][1]["reply_to"] is None


def test_a_subject_cannot_carry_a_line_break(env):
    post(env, subject="Hello\r\nBcc: everyone@example.test")
    assert "\r" not in env.sent[0][1]["subject"] and "\n" not in env.sent[0][1]["subject"]


def test_sends_per_event_per_day_are_capped(env):
    env.db["sent_today"] = cm.EMAIL_SENDS_PER_EVENT_PER_DAY
    r = post(env)
    assert r.status_code == 429 and env.sent == []


def test_a_message_without_email_needs_none_of_this(env):
    # Posting to the thread with no email keeps working on an unsynced event.
    r = post(env, event="made-up-123", deliver_email=False, recipient_email=None)
    assert r.status_code == 200 and env.sent == []


def test_an_approval_email_obeys_the_same_rules_and_is_escaped(env):
    base = dict(message_type="approval_request", body=None, deliver_email=False)
    assert post(env, recipient_email="victim@elsewhere.test", approval_context="x", **base).status_code == 403
    assert post(env, event="made-up-123", recipient_email=VENDOR, approval_context="x", **base).status_code == 409
    r = post(env, recipient_email=VENDOR, approval_context="<script>alert(1)</script>", **base)
    assert r.status_code == 200
    assert env.sent and env.sent[-1][0] == "approval"


def test_the_approval_email_html_escapes_what_the_host_typed():
    import asyncio
    import app.emailer as em
    seen = {}
    async def fake(**k): seen.update(k); return {"id": "x"}
    orig = em._send_via_resend, em.is_email_configured
    em._send_via_resend, em.is_email_configured = fake, (lambda: True)
    try:
        asyncio.run(em.send_approval_email("c@example.test", "<b>ev</b>", "<script>x</script>", 'https://a.test/?event="><x'))
    finally:
        em._send_via_resend, em.is_email_configured = orig
    assert "<script>" not in seen["html"] and "&lt;script&gt;" in seen["html"]
    assert "<b>ev</b>" not in seen["html"] and '"><x' not in seen["html"]


# ── LOOKS LIKE THE EMAILS THAT ARRIVE (live alias check, 11/19/2026) ──────────
# The invite batch's emails reached Gmail and landed in Spam, while the app's
# reply and update notices to the same inbox arrived. The notices go out as
# "<host> via No Guesswork" with a plain-text part's worth of signal; the thread
# email went out under the bare name the host typed ("Your host") with HTML
# only. Both now match the notices' shape.

def test_the_sender_reads_as_the_host_via_no_guesswork(env):
    post(env, author_name="Vida Reyes")
    assert env.sent[0][1]["sender_name"] == "Vida Reyes via No Guesswork"


def test_no_name_on_the_profile_still_says_who_it_is_from(env):
    post(env, author_name="")
    assert env.sent[0][1]["sender_name"] == "Your host via No Guesswork"


def test_every_email_carries_a_plain_text_part_with_the_same_words(env):
    post(env, body="Can you do 3pm?\nThanks!", recipient_name="Rosa")
    text = env.sent[0][1]["body_text"]
    assert "Hi Rosa," in text and "Can you do 3pm?\nThanks!" in text and "<" not in text


def test_the_subject_and_invite_are_kept_for_the_messages_view(env):
    # Messages view (11/20/2026): what an email was is kept with its status.
    r = post(env, subject="Lunch on the 28th")
    d = r.json()["metadata"]
    d = (json.loads(d) if isinstance(d, str) else d)["delivery"]
    assert d["subject"] == "Lunch on the 28th" and "kind" not in d


def test_the_approval_email_is_titled_with_the_events_name_not_its_id(env):
    # Found 11/20/2026: the route passed the event id where the email takes the
    # event's name, so the client read "ev1" as the title.
    r = post(env, message_type="approval_request", body=None, deliver_email=False,
             recipient_email=VENDOR, approval_context="Menu and budget")
    assert r.status_code == 200, r.text
    kind, k = env.sent[-1]
    assert kind == "approval" and k["event_name"] == "Jordan’s 50th"
