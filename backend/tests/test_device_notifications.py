"""Device notifications (owner decision "B", 11/20/2026).

Pins, each red-proofed by removing the guard it names (see the report):
  · the push goes from host_alerts beside the email, under the SAME hour
    (one claim covers both) and the SAME per-event off switch;
  · the payload says who answered and what kind of answer, never the words;
  · a 404 or 410 from the push service deletes the row; an address that is not
    a known push service is never called;
  · the routes: the public key is 503 until VAPID is set; subscribe and delete
    act only on the CALLER's rows; a missing 033 is a 503, never a crash.
The real crypto runs: the payload is decrypted here with the receiver's key.
All names, ids and addresses are synthetic.
"""
import asyncio
import base64
import json
import logging
import os
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.host_alerts as ha
import app.web_push as wp
import app.routers.push as push_mod
from app import config

HOST_ID = "00000000-0000-0000-0000-0000000000a1"
OTHER_ID = "00000000-0000-0000-0000-0000000000b2"
FCM = "https://fcm.googleapis.com/fcm/send/device-one"


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _keypair():
    k = ec.generate_private_key(ec.SECP256R1())
    pub = k.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return k, _b64(k.private_numbers().private_value.to_bytes(32, "big")), _b64(pub)


@pytest.fixture
def vapid(monkeypatch):
    _k, priv, pub = _keypair()
    monkeypatch.setattr(config, "VAPID_PUBLIC_KEY", pub)
    monkeypatch.setattr(config, "VAPID_PRIVATE_KEY", priv)
    monkeypatch.setattr(config, "VAPID_SUBJECT", "mailto:alerts@example.test")
    return pub


# ── the payload ────────────────────────────────────────────────────────────

def test_the_payload_says_who_and_what_kind_never_the_words():
    p = ha.push_payload("rsvp", "Jordan Avery", "Friendsgiving", "Yes", "ev1")
    assert p == {"title": "Jordan Avery replied Yes", "body": "Friendsgiving", "tag": "ngw-alert-ev1"}
    assert ha.push_payload("question", "Jordan", "Friendsgiving")["title"] == "Jordan asked you a question"
    assert ha.push_payload("vendor", "Oak Smoke BBQ", "Friendsgiving")["title"] == "Oak Smoke BBQ answered your vendor brief"


def test_a_reply_says_how_many_have_said_yes():
    # Owner, 11/27/2026: "include the count". A number, never a name.
    p = ha.push_payload("rsvp", "Dana", "Thanksgiving at ours", "No", "ev1", going=13)
    assert p["title"] == "Dana replied No"
    assert p["body"] == "Thanksgiving at ours · 13 said yes"
    assert ha.push_payload("rsvp", "Dana", "Thanksgiving", "Yes", "ev1", going=1)["body"] == "Thanksgiving · 1 said yes"
    # No count known (or a question/vendor): the event name alone, as before.
    assert ha.push_payload("rsvp", "Dana", "Thanksgiving", "Yes", "ev1")["body"] == "Thanksgiving"
    assert ha.push_payload("question", "Dana", "Thanksgiving", going=4)["body"] == "Thanksgiving"


def test_the_reply_count_counts_the_saved_list_and_the_replies_not_yet_opened(monkeypatch, out):
    # The saved list says 2 yes; 13 replies have come in since. The larger shows.
    row = dict(ROW, guests='[{"name":"A","rsvp":"Yes"},{"name":"B","rsvp":"yes"},{"name":"C","rsvp":"No"}]')
    _alert(monkeypatch, row, "ev1", "rsvp", "Jordan", "Yes")
    assert out["push"][0][1]["body"] == "Friendsgiving · 13 said yes"


def test_free_text_in_the_answer_never_reaches_the_device():
    # Only Yes / No / Maybe are ever shown. Anything else a caller hands in —
    # a note, a phone number, a question's words — is dropped, not echoed.
    p = ha.push_payload("rsvp", "Jordan", "Friendsgiving", "Bringing my cousin, call 410-555-0102", "ev1")
    blob = json.dumps(p)
    assert "cousin" not in blob and "555" not in blob
    assert p["title"] == "Jordan replied"
    assert set(p) == {"title", "body", "tag"}


# ── one place decides: host_alerts ─────────────────────────────────────────

class _Conn:
    def __init__(self, row, email="casey.host@example.test"):
        self.row, self.email = row, email
    async def fetchrow(self, q, *a):
        if "auth.users" in q:
            return {"id": HOST_ID, "email": self.email} if self.email else None
        return self.row
    async def fetchval(self, q, *a):
        if "rsvp_submissions" in q:
            return 13
        return "Oak Smoke BBQ"


class _Pool:
    def __init__(self, conn): self.conn = conn
    def acquire(self):
        pool = self
        class _Ctx:
            async def __aenter__(self): return pool.conn
            async def __aexit__(self, *a): return False
        return _Ctx()


ROW = {"studio_id": "s1", "name": "Friendsgiving", "alerts": None}


@pytest.fixture
def out(monkeypatch):
    """Both channels on and recorded; nothing leaves the process."""
    rec = {"email": [], "push": []}
    async def fake_email(to, subject, html, **k):
        rec["email"].append(subject); return {"id": "r1"}
    async def fake_push(user_id, payload, transport=None):
        rec["push"].append((user_id, payload)); return {"sent": 1, "gone": 0, "failed": 0}
    monkeypatch.setattr(ha, "_send_via_resend", fake_email)
    monkeypatch.setattr(ha, "is_email_configured", lambda: True)
    monkeypatch.setattr(ha.web_push, "is_configured", lambda: True)
    monkeypatch.setattr(ha.web_push, "send_to_user", fake_push)
    ha._last_sent.clear()
    return rec


def _alert(monkeypatch, row, *args, **kw):
    async def gp(): return _Pool(_Conn(row, **kw))
    monkeypatch.setattr(ha, "get_pool", gp)
    asyncio.run(ha.alert_host(*args))


def test_the_push_goes_beside_the_email_to_the_studio_owner(monkeypatch, out):
    _alert(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    assert out["email"] == ["Jordan replied Yes — Friendsgiving"]
    assert out["push"] == [(HOST_ID, {"title": "Jordan replied Yes", "body": "Friendsgiving · 13 said yes", "tag": "ngw-alert-ev1"})]


def test_the_vendor_push_names_the_vendor_from_the_hosts_list(monkeypatch, out):
    _alert(monkeypatch, ROW, "ev1", "vendor", "v-123")
    assert out["push"][0][1]["title"] == "Oak Smoke BBQ answered your vendor brief"


def test_host_alerts_off_turns_off_the_push_too(monkeypatch, out):
    _alert(monkeypatch, {**ROW, "alerts": "false"}, "ev1", "rsvp", "Jordan", "Yes")
    assert out == {"email": [], "push": []}
    assert "ev1" not in ha._last_sent


def test_the_hour_is_shared_one_alert_per_event_per_hour_across_both(monkeypatch, out):
    _alert(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    _alert(monkeypatch, ROW, "ev1", "question", "Sam")          # same hour: neither channel
    _alert(monkeypatch, ROW, "ev2", "rsvp", "Sam", "No")        # another event: its own hour
    assert out["email"] == ["Jordan replied Yes — Friendsgiving", "Sam replied No — Friendsgiving"]
    assert [p["title"] for _u, p in out["push"]] == ["Jordan replied Yes", "Sam replied No"]


def test_push_alone_keeps_the_same_hour(monkeypatch, out):
    # A server with no Resend key still sends the push, and still once an hour.
    monkeypatch.setattr(ha, "is_email_configured", lambda: False)
    _alert(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    _alert(monkeypatch, ROW, "ev1", "rsvp", "Sam", "No")
    assert out["email"] == [] and len(out["push"]) == 1


def test_a_refused_email_still_pushes_and_the_push_uses_the_hour(monkeypatch, out):
    async def boom(**k): raise RuntimeError("resend down")
    monkeypatch.setattr(ha, "_send_via_resend", boom)
    _alert(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    assert len(out["push"]) == 1
    assert "ev1" in ha._last_sent


def test_nothing_delivered_gives_the_hour_back(monkeypatch, out):
    async def boom(**k): raise RuntimeError("resend down")
    async def no_device(user_id, payload, transport=None): return {"sent": 0, "gone": 0, "failed": 0}
    monkeypatch.setattr(ha, "_send_via_resend", boom)
    monkeypatch.setattr(ha.web_push, "send_to_user", no_device)
    _alert(monkeypatch, ROW, "ev1", "rsvp", "Jordan", "Yes")
    assert "ev1" not in ha._last_sent


# ── the sender ─────────────────────────────────────────────────────────────

class _SenderConn:
    def __init__(self, rows, table=True):
        self.rows, self.table, self.executed = rows, table, []
    async def fetchval(self, q, *a):
        return "public.push_subscriptions" if self.table else None
    async def fetch(self, q, *a):
        assert a == (HOST_ID,)
        return self.rows
    async def execute(self, q, *a):
        self.executed.append((" ".join(q.split()), a))
        return "OK"


def _device(i, endpoint=FCM):
    k, _priv, pub = _keypair()
    auth = os.urandom(16)
    return {"id": i, "endpoint": endpoint, "p256dh": pub, "auth": _b64(auth)}, k, auth


def _send(monkeypatch, conn, handler):
    async def gp(): return _Pool(conn)
    monkeypatch.setattr(wp, "get_pool", gp)
    return asyncio.run(wp.send_to_user(HOST_ID, {"title": "Jordan replied Yes", "body": "Friendsgiving", "tag": "t"},
                                       transport=httpx.MockTransport(handler)))


def test_the_payload_is_encrypted_to_the_device_and_signed(monkeypatch, vapid):
    import http_ece
    row, key, auth = _device(1)
    seen = []
    def handler(req):
        seen.append(req); return httpx.Response(201)
    conn = _SenderConn([row])
    counts = _send(monkeypatch, conn, handler)
    assert counts == {"sent": 1, "gone": 0, "failed": 0}
    req = seen[0]
    assert str(req.url) == FCM
    assert req.headers["Content-Encoding"] == "aes128gcm" and req.headers["TTL"]
    assert req.headers["Authorization"].startswith("vapid t=") and f"k={vapid}" in req.headers["Authorization"]
    assert b"Jordan" not in req.content   # what travels is ciphertext
    plain = http_ece.decrypt(req.content, private_key=key, auth_secret=auth, version="aes128gcm")
    assert json.loads(plain) == {"title": "Jordan replied Yes", "body": "Friendsgiving", "tag": "t"}
    assert conn.executed == [("update public.push_subscriptions set last_ok_at = now() where id = $1", (1,))]


@pytest.mark.parametrize("status", [404, 410])
def test_a_gone_subscription_is_deleted(monkeypatch, vapid, status):
    row, _k, _a = _device(7)
    conn = _SenderConn([row])
    counts = _send(monkeypatch, conn, lambda req: httpx.Response(status))
    assert counts["gone"] == 1 and counts["sent"] == 0
    assert conn.executed == [("delete from public.push_subscriptions where id = $1", (7,))]


def test_any_other_refusal_keeps_the_row(monkeypatch, vapid):
    row, _k, _a = _device(7)
    conn = _SenderConn([row])
    counts = _send(monkeypatch, conn, lambda req: httpx.Response(500))
    assert counts["failed"] == 1 and conn.executed == []


def test_an_address_that_is_not_a_push_service_is_never_called(monkeypatch, vapid):
    # A browser can insert its own row directly (033's insert rule), so the
    # sender checks the address again rather than trusting the route did.
    row, _k, _a = _device(9, endpoint="https://internal.example.test/hook")
    called = []
    conn = _SenderConn([row])
    counts = _send(monkeypatch, conn, lambda req: called.append(req) or httpx.Response(201))
    assert called == [] and counts["sent"] == 0
    assert conn.executed == [("delete from public.push_subscriptions where id = $1", (9,))]


def test_the_log_never_carries_an_endpoint_or_key(monkeypatch, vapid, caplog):
    row, _k, _a = _device(3)
    caplog.set_level(logging.DEBUG, logger="ngw.web_push")
    _send(monkeypatch, _SenderConn([row]), lambda req: httpx.Response(500))
    _send(monkeypatch, _SenderConn([row]), lambda req: (_ for _ in ()).throw(httpx.ConnectError("x")))
    text = caplog.text
    assert "device-one" not in text and row["p256dh"] not in text and row["auth"] not in text and HOST_ID not in text


def test_before_033_nothing_is_sent_and_nothing_raises(monkeypatch, vapid):
    row, _k, _a = _device(1)
    called = []
    counts = _send(monkeypatch, _SenderConn([row], table=False), lambda req: called.append(req) or httpx.Response(201))
    assert called == [] and counts.get("blocked") == "033_missing"


def test_without_vapid_keys_nothing_is_sent(monkeypatch):
    monkeypatch.setattr(config, "VAPID_PRIVATE_KEY", "")
    assert not wp.is_configured()
    async def gp(): raise AssertionError("must not touch the database")
    monkeypatch.setattr(wp, "get_pool", gp)
    assert asyncio.run(wp.send_to_user(HOST_ID, {"title": "x"})) == {"sent": 0, "gone": 0, "failed": 0}


@pytest.mark.parametrize("url,ok", [
    ("https://fcm.googleapis.com/fcm/send/abc", True),
    ("https://updates.push.services.mozilla.com/wpush/v2/abc", True),
    ("https://web.push.apple.com/QGx", True),
    ("https://wns2-by3p.notify.windows.com/w/?token=abc", True),
    ("http://fcm.googleapis.com/fcm/send/abc", False),
    ("https://fcm.googleapis.com.evil.example/abc", False),
    ("https://evilfcm.googleapis.com.example/abc", False),
    ("https://user:pw@fcm.googleapis.com/abc", False),
    ("https://fcm.googleapis.com:8443/abc", False),
    ("https://localhost/abc", False),
    ("not a url", False),
])
def test_only_known_push_services(url, ok):
    assert wp.endpoint_allowed(url) is ok


# ── the routes ─────────────────────────────────────────────────────────────

class _RouteConn:
    """Records what the route asked of the database; answers like PostgreSQL
    would for the one row the test seeds."""
    def __init__(self, owner_after=HOST_ID, table=True, deleted=1):
        self.owner_after, self.table, self.deleted, self.calls = owner_after, table, deleted, []
    async def fetchval(self, q, *a):
        if "to_regclass" in q:
            return "public.push_subscriptions" if self.table else None
        self.calls.append((q, a)); return self.owner_after
    async def execute(self, q, *a):
        self.calls.append((q, a)); return f"DELETE {self.deleted}"


def _client(monkeypatch, conn, user_id=HOST_ID):
    async def gp(): return _Pool(conn)
    async def signed_in(authorization=None, x_planner_token=None):
        if not authorization: raise push_mod.HTTPException(status_code=401)
        return {"id": user_id, "via": "supabase"}
    monkeypatch.setattr(push_mod, "get_pool", gp)
    monkeypatch.setattr(push_mod, "require_planner", signed_in)
    app = FastAPI(); app.include_router(push_mod.router)
    return TestClient(app)


SUB = {"endpoint": FCM, "keys": {"p256dh": "BPub_key-1", "auth": "AuthSecret_1"}}
AUTH = {"Authorization": "Bearer t"}


def test_the_public_key_is_503_until_vapid_is_set(monkeypatch):
    monkeypatch.setattr(config, "VAPID_PUBLIC_KEY", "")
    c = _client(monkeypatch, _RouteConn())
    assert c.get("/api/push/public-key").status_code == 503


def test_the_public_key_once_set(monkeypatch, vapid):
    c = _client(monkeypatch, _RouteConn())
    r = c.get("/api/push/public-key")
    assert r.status_code == 200 and r.json() == {"key": vapid}


def test_subscribe_needs_a_signed_in_caller(monkeypatch, vapid):
    c = _client(monkeypatch, _RouteConn())
    assert c.post("/api/push/subscribe", json=SUB).status_code == 401
    assert c.request("DELETE", "/api/push/subscribe", json={"endpoint": FCM}).status_code == 401


def test_subscribe_stores_the_device_under_the_callers_own_id(monkeypatch, vapid):
    conn = _RouteConn()
    c = _client(monkeypatch, conn)
    r = c.post("/api/push/subscribe", json={**SUB, "user_id": OTHER_ID}, headers=AUTH)
    assert r.status_code == 200
    (q, args), = conn.calls
    assert q == push_mod.SUBSCRIBE_SQL
    assert args == (HOST_ID, FCM, "BPub_key-1", "AuthSecret_1")   # never an id from the body


def test_a_device_held_by_another_account_is_refused(monkeypatch, vapid):
    # The upsert's WHERE did not match (another owner, a different auth
    # secret), so PostgreSQL returns no row and the route says so.
    c = _client(monkeypatch, _RouteConn(owner_after=None))
    assert c.post("/api/push/subscribe", json=SUB, headers=AUTH).status_code == 409


def test_subscribe_refuses_an_address_that_is_not_a_push_service(monkeypatch, vapid):
    conn = _RouteConn()
    c = _client(monkeypatch, conn)
    r = c.post("/api/push/subscribe", json={**SUB, "endpoint": "https://internal.example.test/x"}, headers=AUTH)
    assert r.status_code == 400 and conn.calls == []


def test_delete_matches_the_callers_id(monkeypatch, vapid):
    conn = _RouteConn()
    c = _client(monkeypatch, conn, user_id=OTHER_ID)
    r = c.request("DELETE", "/api/push/subscribe", json={"endpoint": FCM, "user_id": HOST_ID}, headers=AUTH)
    assert r.status_code == 200 and r.json() == {"ok": True, "removed": 1}
    (q, args), = conn.calls
    assert q == push_mod.UNSUBSCRIBE_SQL and args == (OTHER_ID, FCM)
    assert "user_id = $1" in q


def test_before_033_the_routes_answer_503(monkeypatch, vapid):
    c = _client(monkeypatch, _RouteConn(table=False))
    assert c.post("/api/push/subscribe", json=SUB, headers=AUTH).status_code == 503
    assert c.request("DELETE", "/api/push/subscribe", json={"endpoint": FCM}, headers=AUTH).status_code == 503


def test_subscribe_is_503_without_vapid(monkeypatch):
    monkeypatch.setattr(config, "VAPID_PUBLIC_KEY", "")
    c = _client(monkeypatch, _RouteConn())
    assert c.post("/api/push/subscribe", json=SUB, headers=AUTH).status_code == 503


def test_the_dev_token_has_no_user_to_store_a_device_for(monkeypatch, vapid):
    c = _client(monkeypatch, _RouteConn(), user_id="dev-token")
    assert c.post("/api/push/subscribe", json=SUB, headers=AUTH).status_code == 403


# ── the migration, read as text (the real-PostgreSQL proof is
#    test_push_subscriptions_pg.py, which CI skips for want of a database) ──

def test_033_keeps_each_persons_devices_their_own():
    import pathlib, re
    sql = (pathlib.Path(__file__).resolve().parents[2] / "supabase/migrations/033_push_subscriptions.sql").read_text()
    code = "\n".join(l.split("--", 1)[0] for l in sql.splitlines())
    assert "alter table public.push_subscriptions enable row level security" in code
    assert re.search(r"revoke all on public\.push_subscriptions from public, anon;", code)
    assert re.search(r"grant select, insert, delete on public\.push_subscriptions to authenticated;", code)
    assert "update" not in code.split("enable row level security", 1)[1].lower()   # no in-place edits
    for verb, clause in (("select", "using"), ("insert", "with check"), ("delete", "using")):
        assert re.search(rf"for {verb} to authenticated {clause} \(user_id = auth\.uid\(\)\)", code), verb
    assert "endpoint   text        not null unique" in code
    assert "references auth.users (id) on delete cascade" in code
