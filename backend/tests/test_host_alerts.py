"""G8 — the host hears when someone answers (11/16/2026).

Pins: the email names who answered and the kind of answer, never its body;
at most one per event per hour; the per-event off switch; no studio → nothing;
a send failure never escapes. All names and addresses are synthetic.
"""
import sys
import types
import asyncio

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
import app.host_alerts as ha


def test_compose_says_who_and_what_never_the_body():
    s, body = ha.compose("rsvp", "Jordan Avery", "Friendsgiving", "Yes")
    assert s == "Jordan Avery replied Yes — Friendsgiving"
    assert "Open your plan" in body and "at most one of these an hour" in body
    s, _ = ha.compose("question", "Jordan", "Friendsgiving")
    assert s == "Jordan asked you a question — Friendsgiving"
    s, _ = ha.compose("vendor", "Oak Smoke BBQ", "Friendsgiving")
    assert s == "Oak Smoke BBQ answered your vendor brief — Friendsgiving"


def test_compose_escapes_and_flattens_guest_text():
    s, body = ha.compose("rsvp", "<b>Eve</b>\nBcc: x@example.test", "Party", "Yes")
    assert "\n" not in s
    assert "<b>Eve</b>" not in body and "&lt;b&gt;Eve&lt;/b&gt;" in body


def test_one_per_event_per_hour():
    ha._last_sent.clear()
    assert ha._claim("ev1", now=1000.0)
    assert not ha._claim("ev1", now=1000.0 + 3599)
    assert ha._claim("ev2", now=1001.0)
    assert ha._claim("ev1", now=1000.0 + 3600)


class _Conn:
    def __init__(self, row, email="casey.host@example.test", vendor="Oak Smoke BBQ"):
        self.row, self.email, self.vendor = row, email, vendor
    async def fetchrow(self, q, *a):
        return self.row
    async def fetchval(self, q, *a):
        return self.vendor if "jsonb_array_elements" in q else self.email


class _Pool:
    def __init__(self, conn): self.conn = conn
    def acquire(self):
        pool = self
        class _Ctx:
            async def __aenter__(self): return pool.conn
            async def __aexit__(self, *a): return False
        return _Ctx()


@pytest.fixture
def sent(monkeypatch):
    out = []
    async def fake_send(to, subject, html, **k):
        out.append((to, subject))
        return {"id": "r1"}
    monkeypatch.setattr(ha, "_send_via_resend", fake_send)
    monkeypatch.setattr(ha, "is_email_configured", lambda: True)
    ha._last_sent.clear()
    return out


def _run(monkeypatch, row, *args, **conn_kw):
    async def gp(): return _Pool(_Conn(row, **conn_kw))
    monkeypatch.setattr(ha, "get_pool", gp)
    asyncio.run(ha.alert_host(*args))


ROW = {"studio_id": "s1", "name": "Friendsgiving", "alerts": None}


def test_sends_once_then_waits_the_hour(monkeypatch, sent):
    _run(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    _run(monkeypatch, ROW, "ev1", "rsvp", "Sam", "No")
    assert sent == [("casey.host@example.test", "Jordan replied Yes — Friendsgiving")]


def test_vendor_name_comes_from_the_hosts_own_list(monkeypatch, sent):
    _run(monkeypatch, ROW, "ev1", "vendor", "v-123")
    assert sent[0][1] == "Oak Smoke BBQ answered your vendor brief — Friendsgiving"


@pytest.mark.parametrize("row,kw", [
    ({**ROW, "alerts": "false"}, {}),          # host turned it off
    ({**ROW, "studio_id": None}, {}),          # no studio → no host to find
    (None, {}),                                # no synced event row
    (ROW, {"email": None}),                    # owner has no address
])
def test_nothing_sent(monkeypatch, sent, row, kw):
    _run(monkeypatch, row, "ev1", "rsvp", "Jordan", "Yes", **kw)
    assert sent == []
    assert "ev1" not in ha._last_sent  # a skipped alert does not use up the hour


def test_a_failed_send_never_escapes(monkeypatch, sent):
    async def boom(**k): raise RuntimeError("resend down")
    monkeypatch.setattr(ha, "_send_via_resend", boom)
    _run(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")  # no raise


def test_not_configured_does_nothing(monkeypatch, sent):
    monkeypatch.setattr(ha, "is_email_configured", lambda: False)
    _run(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    assert sent == []


def test_an_rsvp_tells_the_host_its_name_and_answer_only(monkeypatch):
    import datetime as dt
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    import app.routers.rsvp as rsvp_mod

    class C:
        async def fetchrow(self, q, *a):
            if "count(*)" in q:
                return {"n": 0, "is_resubmit": False}
            return {"submitted_at": dt.datetime.now(dt.timezone.utc)}
    async def gp(): return _Pool(C())
    async def resolved(conn, code): return ("e1", {})
    calls = []
    async def fake_alert(*a): calls.append(a)
    monkeypatch.setattr(rsvp_mod, "get_pool", gp)
    monkeypatch.setattr(rsvp_mod, "_resolve_event", resolved)
    monkeypatch.setattr(rsvp_mod, "alert_host", fake_alert)
    rsvp_mod._rate.clear()
    app = FastAPI(); app.include_router(rsvp_mod.router)
    r = TestClient(app).post("/api/public/rsvp/abcdefghij1234567890xy",
        json={"idempotency_key": "k1", "name": " Jordan Avery ", "rsvp": "Yes", "note": "private note", "phone": "555"})
    assert r.status_code == 200
    assert calls == [("e1", "rsvp", "Jordan Avery", "Yes")]


def test_a_failed_send_gives_the_hour_back(monkeypatch, sent):
    # 11/16/2026: Resend refused every send for two hours (a bad From, then a key
    # that could not send from the domain). Each failure still used up the
    # event's hour, so the first good send after a fix could wait an hour.
    async def boom(**k): raise RuntimeError("resend down")
    monkeypatch.setattr(ha, "_send_via_resend", boom)
    _run(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    assert "ev1" not in ha._last_sent
    async def ok(to, subject, html, **k):
        sent.append((to, subject)); return {"id": "r2"}
    monkeypatch.setattr(ha, "_send_via_resend", ok)
    _run(monkeypatch, ROW, "ev1", "rsvp", "Sam", "No")
    assert sent == [("casey.host@example.test", "Sam replied No — Friendsgiving")]
