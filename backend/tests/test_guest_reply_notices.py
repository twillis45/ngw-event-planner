"""Reply notices (owner, 11/16/2026: "go with recommendations").

Pins:
  - a host reply emails the guest ONLY when they opted in with an email, and
    never on a blocked thread;
  - the email is "<host first name> via No Guesswork", carries the reply
    (escaped), the invite link and a stop link, plus one-click
    List-Unsubscribe headers; never the host's own email, never a reply-to;
  - the stop link's GET changes nothing (mail scanners open links); its POST
    clears the email and the opt-in; an unknown token gets the same page;
  - a failed send never fails the host's reply.
All names are synthetic.
"""
import asyncio

import app.guest_notices as gn
import app.emailer as em
from tests.test_guest_messages import _Conn, _Pool, _client, _ask, _only_thread_id, GOOD_CODE, KEY_A, EVENT


class _NoticeConn(_Conn):
    async def fetchrow(self, q, *a):
        if "join public.events e on e.id = t.event_id" in q:
            t = self.threads.get(a[0])
            if not t:
                return None
            data = self.events[t["rsvp_code"]][1]
            # The event's data and the planner's profile name, as the query reads
            # them (cohesion G, 11/24/2026: the host is read through
            # real_host_name(profile name, host_name_for(event))).
            return {**{k: t[k] for k in ("guest_email", "email_opt_in", "guest_token", "blocked_at", "rsvp_code")},
                    "event_name": data.get("name"), "event_data": data, "profile_name": getattr(self, "profile_name", None)}
        return await super().fetchrow(q, *a)

    async def execute(self, q, *a):
        if "set email_opt_in = false, guest_email = null where guest_token" in q:
            for t in self.threads.values():
                if t["guest_token"] == a[0]:
                    t["email_opt_in"], t["guest_email"] = False, None
            return "UPDATE"
        return await super().execute(q, *a)


def _setup(monkeypatch, fail=False):
    conn = _NoticeConn()
    sent = []

    async def fake_pool():
        return _Pool(conn)

    async def fake_send(**kw):
        if fail:
            raise em.ResendRejected(422, "validation_error test")
        sent.append(kw)
        return {"id": "x"}

    c = _client(monkeypatch, conn)
    monkeypatch.setattr(gn, "get_pool", fake_pool)
    monkeypatch.setattr(gn, "is_email_configured", lambda: True)
    monkeypatch.setattr(gn, "_send_via_resend", fake_send)
    return conn, c, sent


def _opt_in(c, email="jordan.guest@example.test"):
    r = c.post(f"/api/public/questions/{GOOD_CODE}/email",
               json={"guest_key": KEY_A, "email": email, "email_opt_in": True})
    assert r.status_code == 200


def _reply(c, conn, body="Street parking is free after 6."):
    return c.post(f"/api/events/e1/guest-threads/{_only_thread_id(conn)}/reply", json={"body": body})


def test_an_opted_in_guest_gets_one_email_per_reply(monkeypatch):
    conn, c, sent = _setup(monkeypatch)
    _ask(c)
    _opt_in(c)
    assert _reply(c, conn).status_code == 200
    assert len(sent) == 1
    m = sent[0]
    assert m["to"] == "jordan.guest@example.test"
    assert m["from_name"] == "Casey via No Guesswork"
    assert m["subject"] == "Casey answered your question — Friendsgiving at Pine Street"
    assert "Street parking is free after 6." in m["html"]
    assert f"/hostv2/?rsvp={GOOD_CODE}" in m["html"]
    token = next(iter(conn.threads.values()))["guest_token"]
    assert f"/api/public/questions/unsubscribe/{token}" in m["html"]
    assert m["headers"]["List-Unsubscribe"].endswith(f"/api/public/questions/unsubscribe/{token}>")
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert "reply_to" not in m
    assert EVENT["hostEmail"] not in m["html"]


def test_no_email_without_the_opt_in_or_on_a_blocked_thread(monkeypatch):
    conn, c, sent = _setup(monkeypatch)
    _ask(c)
    c.post(f"/api/public/questions/{GOOD_CODE}/email", json={"guest_key": KEY_A, "email": "jordan.guest@example.test"})
    assert _reply(c, conn).status_code == 200
    assert sent == []                                    # an email alone is not consent
    _opt_in(c)
    next(iter(conn.threads.values()))["blocked_at"] = object()
    assert _reply(c, conn).status_code == 409            # blocked: no reply, no email
    assert sent == []


def test_the_reply_is_escaped_in_the_email(monkeypatch):
    conn, c, sent = _setup(monkeypatch)
    _ask(c)
    _opt_in(c)
    _reply(c, conn, body='<a href="x">click</a> & see')
    assert "&lt;a href=&quot;x&quot;&gt;click&lt;/a&gt; &amp; see" in sent[0]["html"]
    assert '<a href="x">' not in sent[0]["html"]


def test_a_failed_send_never_fails_the_reply(monkeypatch):
    conn, c, sent = _setup(monkeypatch, fail=True)
    _ask(c)
    _opt_in(c)
    assert _reply(c, conn).status_code == 200


def test_stop_link_get_changes_nothing_post_clears_unknown_token_same_page(monkeypatch):
    conn, c, sent = _setup(monkeypatch)
    _ask(c)
    _opt_in(c)
    t = next(iter(conn.threads.values()))
    url = f"/api/public/questions/unsubscribe/{t['guest_token']}"
    r = c.get(url)
    assert r.status_code == 200 and "Stop these emails" in r.text and "<form method=post" in r.text
    assert t["email_opt_in"] is True                     # a mail scanner's GET unsubscribes nobody
    r = c.post(url)
    assert r.status_code == 200 and "won't get these emails" in r.text
    assert t["email_opt_in"] is False and t["guest_email"] is None
    _reply(c, conn)
    assert sent == []
    other = c.post("/api/public/questions/unsubscribe/" + "z" * 30)
    assert other.status_code == 200 and other.text == r.text   # no oracle
    assert c.post("/api/public/questions/unsubscribe/short").status_code == 404


def test_emailer_sends_the_headers(monkeypatch):
    captured = {}

    class _Resp:
        status_code = 200
        def json(self): return {"id": "1"}

    class _Client:
        def __init__(self, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, headers=None, json=None):
            captured.update(json)
            return _Resp()

    monkeypatch.setattr(em.httpx, "AsyncClient", _Client)
    asyncio.run(em._send_via_resend("g@example.test", "s", "<p>h</p>", headers={"List-Unsubscribe": "<u>"}))
    assert captured["headers"] == {"List-Unsubscribe": "<u>"}
