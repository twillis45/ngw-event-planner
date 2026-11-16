"""Route tests for "Questions & updates" — a guest asks the host a question
from their invite link; the host replies (owner ruling 11/16/2026, free).

Same pattern as test_helper_link.py: asyncpg is stubbed before import, auth and
the DB pool are monkeypatched, and the DB mock dispatches on query text. The
mock keeps a small in-memory store so caps, deletes and blocks are exercised
end to end through the routes.

Pins:
  - the guest credential is (rsvp code, guest device key): a wrong key or a
    bad code is the same opaque 404, and one guest never sees another's thread.
  - the guest payload is a strict whitelist: their own name, email and opt-in,
    whether the thread is closed, and the messages' author/body/time. Never a
    thread id, the device key, another guest, or anything about the host.
  - the host payload never carries a guest's email or device key.
  - caps: 1,000 characters, plain text (control characters refused), 5 guest
    messages an hour and 30 ever per thread (counted in the database), 300
    threads per invite; per-IP and per-code windows.
  - a blocked thread refuses new guest messages; a guest deletes their own
    thread; email opt-in is false unless the guest ticks it.
  - host routes are planner-only and studio-scoped (the real
    _assert_event_studio_read runs in the cross-studio test), and a thread is
    only reachable through its own event.
  - never pass-gated.
All names are synthetic.
"""
import sys
import types
import uuid
import datetime as _dt

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.guest_messages as gm_mod
import app.routers.rsvp as rsvp_mod

GOOD_CODE = "abcdefghij1234567890xy"
OTHER_CODE = "zyxwvutsrq0987654321ab"
KEY_A = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
KEY_B = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

EVENT = {
    "name": "Friendsgiving at Pine Street",
    "date": "2026-11-26",
    "rsvpCode": GOOD_CODE,
    "hostNames": "Casey Morgan",
    "hostEmail": "casey.host@example.test",
    "guests": [{"id": "g1", "name": "Jordan Avery", "email": "jordan@example.test"}],
}


def _now():
    return _dt.datetime.now(_dt.timezone.utc)


class _Tx:
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False


class _Conn:
    """In-memory stand-in for the two tables. Dispatches on query text."""

    def __init__(self, events=None, studio_of=None, members=None):
        # rsvp code -> (event id, data)
        self.events = events if events is not None else {GOOD_CODE: ("e1", dict(EVENT))}
        self.studio_of = studio_of or {}      # event id -> studio id
        self.members = members or set()       # {(studio id, user id)}
        self.threads = {}                     # id -> dict
        self.messages = []                    # list of dicts
        self.rsvps = {}                       # (code, key) -> {"id", "guest_name", "rsvp"}
        self.opens = {}                       # (code, key) -> {"event_id", "last_opened_at"}
        self.devices = {}                     # (event id, day, hash) -> last_at
        self.days = {}                        # (event id, day) -> {"opens", "distinct_devices"}
        self.statements = []                  # every SQL parameter written, for leak checks

    def transaction(self):
        return _Tx()

    def _thread_by_cred(self, code, key):
        for t in self.threads.values():
            if t["rsvp_code"] == code and t["guest_key"] == key:
                return t
        return None

    async def execute(self, q, *a):
        self.statements.append(a)
        if "insert into public.invite_open_days" in q:
            eid, day, new_device = a
            d = self.days.setdefault((eid, day), {"opens": 0, "distinct_devices": 0})
            d["opens"] += 1
            d["distinct_devices"] += int(new_device)
        if "delete from public.invite_opens" in q:
            r = self.rsvps.get((a[0], a[1]))
            if not (r and r["rsvp"] is not None):
                self.opens.pop((a[0], a[1]), None)
        return "OK"

    async def fetchrow(self, q, *a):
        self.statements.append(a)
        if "insert into public.invite_opens" in q:
            code, key, eid = a
            o = self.opens.get((code, key))
            if o and o["last_opened_at"] >= _now() - _dt.timedelta(hours=1):
                return None
            self.opens[(code, key)] = {"event_id": eid, "last_opened_at": _now()}
            return {"last_opened_at": self.opens[(code, key)]["last_opened_at"]}
        if "insert into public.invite_open_devices" in q:
            eid, day, h = a
            last = self.devices.get((eid, day, h))
            if last and last >= _now() - _dt.timedelta(hours=1):
                return None
            self.devices[(eid, day, h)] = _now()
            return {"is_new": last is None}
        if "data->>'rsvpCode'" in q:
            hit = self.events.get(a[0])
            return {"id": hit[0], "data": hit[1]} if hit else None
        if "select studio_id from public.events" in q:
            sid = self.studio_of.get(a[0])
            return {"studio_id": sid} if sid else None
        if "from event_owners" in q:
            return None
        if "insert into public.guest_threads" in q:
            code, key = a[1], a[2]
            t = self._thread_by_cred(code, key)
            if t is None:
                t = {"id": uuid.uuid4(), "event_id": a[0], "rsvp_code": code, "guest_key": key,
                     "guest_token": a[3], "guest_name": a[4], "guest_email": None,
                     "email_opt_in": False, "created_at": _now(), "last_guest_at": None,
                     "last_host_at": None, "blocked_at": None}
                self.threads[t["id"]] = t
            return dict(t)
        if "insert into public.guest_messages" in q:
            tid, eid, author, body = a
            m = {"thread_id": tid, "event_id": eid, "author": author, "body": body, "created_at": _now()}
            self.messages.append(m)
            self.threads[tid]["last_guest_at" if author == "guest" else "last_host_at"] = m["created_at"]
            return {"created_at": m["created_at"]}
        if "count(*)" in q and "from public.guest_messages" in q:
            mine = [m for m in self.messages if m["thread_id"] == a[0] and m["author"] == "guest"]
            hour = [m for m in mine if m["created_at"] > _now() - _dt.timedelta(hours=1)]
            return {"hour": len(hour), "total": len(mine)}
        if "update public.guest_threads set guest_email" in q:
            t = self._thread_by_cred(a[0], a[1])
            if not t:
                return None
            t["guest_email"], t["email_opt_in"] = a[2], a[3]
            return dict(t)
        if "set blocked_at" in q:
            t = self.threads.get(a[0])
            if not t or t["event_id"] != a[1]:
                return None
            t["blocked_at"] = (t["blocked_at"] or _now()) if a[2] else None
            return dict(t)
        if "delete from public.guest_threads" in q:
            t = self._thread_by_cred(a[0], a[1])
            if not t:
                return None
            del self.threads[t["id"]]
            self.messages = [m for m in self.messages if m["thread_id"] != t["id"]]
            return {"id": t["id"]}
        if "from public.guest_threads" in q and "guest_key = $2" in q:
            t = self._thread_by_cred(a[0], a[1])
            return dict(t) if t else None
        if "from public.guest_threads" in q and "event_id = $2" in q:
            t = self.threads.get(a[0])
            return dict(t) if t and t["event_id"] == a[1] else None
        return None

    async def fetchval(self, q, *a):
        if "from public.rsvp_submissions" in q and "exists" in q:
            r = self.rsvps.get((a[0], a[1]))
            return bool(r and r["rsvp"] is not None) or self._thread_by_cred(a[0], a[1]) is not None
        if "from studio_members" in q:
            return 1 if (a[0], a[1]) in self.members else None
        if "count(*)" in q and "from public.guest_threads" in q:
            return sum(1 for t in self.threads.values() if t["rsvp_code"] == a[0])
        return None

    async def fetch(self, q, *a):
        if "from public.invite_opens o" in q:
            out = []
            for (code, key), o in self.opens.items():
                if o["event_id"] != a[0]:
                    continue
                r = self.rsvps.get((code, key))
                t = self._thread_by_cred(code, key)
                if not ((r and r["rsvp"] is not None) or t):
                    continue
                out.append({"last_opened_at": o["last_opened_at"],
                            "rsvp_id": r["id"] if r else None, "rsvp_name": r["guest_name"] if r else None,
                            "thread_id": t["id"] if t else None, "thread_name": t["guest_name"] if t else None})
            return out
        if "from public.invite_open_days" in q:
            return [{"day": day, **v} for (eid, day), v in sorted(self.days.items(), reverse=True) if eid == a[0]]
        if "from public.guest_threads t" in q:
            out = []
            for t in self.threads.values():
                if t["event_id"] != a[0]:
                    continue
                ms = [m for m in self.messages if m["thread_id"] == t["id"]]
                last = ms[-1] if ms else None
                out.append({**t, "message_count": len(ms),
                            "last_author": last["author"] if last else None,
                            "last_body": last["body"] if last else None})
            return out
        if "from public.guest_messages" in q:
            return [dict(m) for m in self.messages if m["thread_id"] == a[0]]
        return []


class _Acquire:
    def __init__(self, conn):   self._c = conn
    async def __aenter__(self): return self._c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, conn): self._conn = conn
    def acquire(self): return _Acquire(self._conn)


def _client(monkeypatch, conn, principal=None):
    async def fake_require_planner(*a, **k):
        return principal or {"id": "planner-1", "via": "dev_token"}

    async def fake_get_pool():
        return _Pool(conn)

    monkeypatch.setattr(gm_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(gm_mod, "get_pool", fake_get_pool)
    rsvp_mod._rate.clear()
    app = FastAPI()
    app.include_router(gm_mod.router)
    return TestClient(app)


def _ask(c, body="Is there parking nearby?", key=KEY_A, name="Jordan Avery", code=GOOD_CODE, ip=None):
    headers = {"x-forwarded-for": ip} if ip else {}
    return c.post(f"/api/public/questions/{code}/ask",
                  json={"guest_key": key, "name": name, "body": body}, headers=headers)


def _mine(c, key=KEY_A, code=GOOD_CODE):
    return c.post(f"/api/public/questions/{code}/mine", json={"guest_key": key})


def _only_thread_id(conn):
    assert len(conn.threads) == 1
    return str(next(iter(conn.threads)))


# ── Guest: ask, read back, whitelist ───────────────────────────────────────────

def test_a_guest_asks_and_reads_back_only_whitelisted_fields(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    r = _ask(c)
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"ok", "thread"}
    t = body["thread"]
    assert set(t) == {"guest_name", "email", "email_opt_in", "closed", "messages"}
    assert t["guest_name"] == "Jordan Avery" and t["closed"] is False
    assert [m["body"] for m in t["messages"]] == ["Is there parking nearby?"]
    for m in t["messages"]:
        assert set(m) == {"author", "body", "created_at"}
    assert _mine(c).json() == body


def test_a_guest_never_sees_ids_keys_or_the_host(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c)
    tid = _only_thread_id(conn)
    hc = c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "Street parking on Elm."})
    assert hc.status_code == 200
    text = _mine(c).text
    for needle in (tid, KEY_A, "guest_token", "rsvp_code", "event_id", "e1", "casey.host@example.test",
                   "Casey", "planner-1", "jordan@example.test"):
        assert needle not in text, needle
    assert [m["author"] for m in _mine(c).json()["thread"]["messages"]] == ["guest", "host"]


def test_one_guest_never_sees_another_guests_thread(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c, body="Can I bring my dog?", key=KEY_A, name="Jordan Avery")
    r = _ask(c, body="What time does it end?", key=KEY_B, name="Riley Park")
    text = r.text
    assert "Jordan" not in text and "dog" not in text
    assert [m["body"] for m in r.json()["thread"]["messages"]] == ["What time does it end?"]


def test_credential_mismatch_and_bad_codes_are_the_same_opaque_404(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c)
    wrong_key = _mine(c, key=KEY_B)
    unknown_code = _mine(c, code=OTHER_CODE)
    short_code = _mine(c, code="short")
    assert wrong_key.status_code == unknown_code.status_code == short_code.status_code == 404
    assert wrong_key.json() == unknown_code.json() == short_code.json()
    # the same holds for every guest write
    for path, extra in (("email", {"email": "x@example.test", "email_opt_in": True}), ("delete", {})):
        r = c.post(f"/api/public/questions/{GOOD_CODE}/{path}", json={"guest_key": KEY_B, **extra})
        assert r.status_code == 404 and r.json() == wrong_key.json(), path
        r = c.post(f"/api/public/questions/{OTHER_CODE}/{path}", json={"guest_key": KEY_A, **extra})
        assert r.status_code == 404 and r.json() == wrong_key.json(), path
    assert _ask(c, code=OTHER_CODE).json() == wrong_key.json()
    # nothing about the first thread changed
    assert len(_mine(c).json()["thread"]["messages"]) == 1


def test_identity_comes_from_the_code_never_the_body(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    r = c.post(f"/api/public/questions/{GOOD_CODE}/ask",
               json={"guest_key": KEY_A, "name": "Jordan Avery", "body": "Hi",
                     "event_id": "evil", "author": "host"})
    assert r.status_code == 200
    t = next(iter(conn.threads.values()))
    assert t["event_id"] == "e1"
    assert conn.messages[0]["author"] == "guest"


# ── Plain text and length ──────────────────────────────────────────────────────

def test_length_limit_is_1000_characters(monkeypatch):
    c = _client(monkeypatch, _Conn())
    assert _ask(c, body="a" * 1000).status_code == 200
    assert _ask(c, body="a" * 1001).status_code == 422
    assert _ask(c, body="   ").status_code == 422
    assert _ask(c, name="  ").status_code == 422


def test_control_characters_are_refused_but_newlines_and_emoji_are_fine(monkeypatch):
    c = _client(monkeypatch, _Conn())
    for bad in ("hi\x00there", "bell\x07", "esc\x1b[31mred", "spoof‮evil", "del\x7f"):
        assert _ask(c, body=bad).status_code == 422, repr(bad)
    assert _ask(c, name="Jordan\nAvery").status_code == 422
    r = _ask(c, body="Line one\r\nLine two\tok \U0001F468‍\U0001F469‍\U0001F467")
    assert r.status_code == 200
    assert r.json()["thread"]["messages"][-1]["body"] == "Line one\nLine two\tok \U0001F468‍\U0001F469‍\U0001F467"


# ── Caps ───────────────────────────────────────────────────────────────────────

def test_five_guest_messages_an_hour(monkeypatch):
    c = _client(monkeypatch, _Conn())
    codes = [_ask(c, body=f"q{i}", ip=f"10.0.1.{i}").status_code for i in range(gm_mod.GUEST_MSG_HOUR_MAX + 1)]
    assert gm_mod.GUEST_MSG_HOUR_MAX == 5
    assert codes[-1] == 429 and all(s == 200 for s in codes[:-1])


def test_thirty_guest_messages_ever_counted_in_the_database(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    assert gm_mod.GUEST_MSG_TOTAL_MAX == 30
    _ask(c)
    t = next(iter(conn.threads.values()))
    old = _now() - _dt.timedelta(days=2)
    for i in range(gm_mod.GUEST_MSG_TOTAL_MAX - 1):
        conn.messages.append({"thread_id": t["id"], "event_id": "e1", "author": "guest",
                              "body": f"old {i}", "created_at": old})
    # host replies never count against the guest
    conn.messages.append({"thread_id": t["id"], "event_id": "e1", "author": "host",
                          "body": "reply", "created_at": _now()})
    r = _ask(c)
    assert r.status_code == 429
    # the limiter in memory was cleared; the database count still refuses
    rsvp_mod._rate.clear()
    assert _ask(c).status_code == 429


def test_three_hundred_threads_per_invite(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    assert gm_mod.THREADS_PER_INVITE_MAX == 300
    for i in range(gm_mod.THREADS_PER_INVITE_MAX):
        tid = uuid.uuid4()
        conn.threads[tid] = {"id": tid, "event_id": "e1", "rsvp_code": GOOD_CODE, "guest_key": f"k-{i:020d}",
                             "guest_token": "t", "guest_name": f"Guest {i}", "guest_email": None,
                             "email_opt_in": False, "created_at": _now(), "last_guest_at": None,
                             "last_host_at": None, "blocked_at": None}
    assert _ask(c, key=KEY_A).status_code == 429
    # an existing guest can still write to their own thread
    assert _ask(c, key="k-" + "0" * 20).status_code == 200


def test_per_ip_and_per_code_windows(monkeypatch):
    c = _client(monkeypatch, _Conn())
    codes = [_mine(c).status_code for _ in range(gm_mod.GM_IP_MAX + 1)]
    assert codes[-1] == 429 and 429 not in codes[:-1]
    rsvp_mod._rate.clear()
    codes = []
    for i in range(gm_mod.GM_CODE_MAX + 1):
        r = c.post(f"/api/public/questions/{GOOD_CODE}/delete",
                   json={"guest_key": f"key-{i:020d}"}, headers={"x-forwarded-for": f"10.0.2.{i}"})
        codes.append(r.status_code)
    assert codes[-1] == 429 and 429 not in codes[:-1]


# ── Block, delete, email ──────────────────────────────────────────────────────

def test_a_blocked_thread_refuses_new_guest_messages(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c)
    tid = _only_thread_id(conn)
    r = c.post(f"/api/events/e1/guest-threads/{tid}/block", json={"blocked": True})
    assert r.status_code == 200 and r.json()["thread"]["blocked"] is True
    assert _ask(c, body="hello again").status_code == 403
    assert _mine(c).json()["thread"]["closed"] is True
    assert len(conn.messages) == 1
    # unblocking reopens it
    c.post(f"/api/events/e1/guest-threads/{tid}/block", json={"blocked": False})
    assert _ask(c, body="hello again").status_code == 200


def test_a_guest_deletes_their_own_thread(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c, key=KEY_A)
    _ask(c, key=KEY_B, name="Riley Park")
    r = c.post(f"/api/public/questions/{GOOD_CODE}/delete", json={"guest_key": KEY_A})
    assert r.status_code == 200 and r.json() == {"ok": True, "deleted": True}
    assert _mine(c, key=KEY_A).status_code == 404
    assert _mine(c, key=KEY_B).status_code == 200          # another guest's thread survives
    assert all(m["thread_id"] in conn.threads for m in conn.messages)


def test_email_opt_in_defaults_false_and_needs_an_email(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    t = _ask(c).json()["thread"]
    assert t["email"] is None and t["email_opt_in"] is False
    url = f"/api/public/questions/{GOOD_CODE}/email"
    # giving an email does not opt in
    r = c.post(url, json={"guest_key": KEY_A, "email": "jordan.guest@example.test"})
    assert r.status_code == 200 and r.json()["thread"]["email_opt_in"] is False
    # opting in with no email is refused
    assert c.post(url, json={"guest_key": KEY_A, "email": None, "email_opt_in": True}).status_code == 422
    assert c.post(url, json={"guest_key": KEY_A, "email": "not-an-email", "email_opt_in": True}).status_code == 422
    r = c.post(url, json={"guest_key": KEY_A, "email": "jordan.guest@example.test", "email_opt_in": True})
    assert r.status_code == 200
    assert r.json()["thread"]["email"] == "jordan.guest@example.test"
    assert r.json()["thread"]["email_opt_in"] is True


# ── Host ───────────────────────────────────────────────────────────────────────

def test_host_routes_require_the_planner_gate(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c)
    tid = _only_thread_id(conn)

    async def deny(*a, **k):
        raise HTTPException(401, "Unauthorized")
    monkeypatch.setattr(gm_mod, "require_planner", deny)
    assert c.get("/api/events/e1/guest-threads").status_code == 401
    assert c.get(f"/api/events/e1/guest-threads/{tid}").status_code == 401
    assert c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "x"}).status_code == 401
    assert c.post(f"/api/events/e1/guest-threads/{tid}/block", json={"blocked": True}).status_code == 401


def test_host_cannot_read_another_studios_event(monkeypatch):
    # The REAL _assert_event_studio_read runs: event e1 belongs to studio-a,
    # and the caller is a member of studio-b only.
    conn = _Conn(studio_of={"e1": "studio-a"}, members={("studio-b", "planner-9")})
    c = _client(monkeypatch, conn, principal={"id": "planner-9", "via": "jwt"})
    _ask(c)
    tid = _only_thread_id(conn)
    assert c.get("/api/events/e1/guest-threads").status_code == 403
    assert c.get(f"/api/events/e1/guest-threads/{tid}").status_code == 403
    assert c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "x"}).status_code == 403
    assert c.post(f"/api/events/e1/guest-threads/{tid}/block", json={"blocked": True}).status_code == 403
    assert [m["author"] for m in conn.messages] == ["guest"]
    # a member of studio-a is let in
    conn.members.add(("studio-a", "planner-9"))
    assert c.get("/api/events/e1/guest-threads").status_code == 200


def test_a_thread_is_only_reachable_through_its_own_event(monkeypatch):
    conn = _Conn(events={GOOD_CODE: ("e1", dict(EVENT)), OTHER_CODE: ("e2", {**EVENT, "rsvpCode": OTHER_CODE})})
    c = _client(monkeypatch, conn)
    _ask(c, code=OTHER_CODE)                     # a thread on e2
    tid = _only_thread_id(conn)
    assert c.get(f"/api/events/e1/guest-threads/{tid}").status_code == 404
    assert c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "x"}).status_code == 404
    assert c.post(f"/api/events/e1/guest-threads/{tid}/block", json={"blocked": True}).status_code == 404
    assert c.get("/api/events/e1/guest-threads").json() == []
    assert c.get("/api/events/e1/guest-threads/not-a-uuid").status_code == 404


def test_host_list_puts_unanswered_first_and_never_carries_email_or_keys(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c, key=KEY_A, name="Jordan Avery", body="First question")
    _ask(c, key=KEY_B, name="Riley Park", body="Second question")
    c.post(f"/api/public/questions/{GOOD_CODE}/email",
           json={"guest_key": KEY_A, "email": "jordan.guest@example.test", "email_opt_in": True})
    ids = {t["guest_name"]: str(t["id"]) for t in conn.threads.values()}
    # answer Riley; Jordan stays unanswered
    c.post(f"/api/events/e1/guest-threads/{ids['Riley Park']}/reply", json={"body": "Yes!"})
    r = c.get("/api/events/e1/guest-threads")
    assert r.status_code == 200
    rows = r.json()
    assert [x["guest_name"] for x in rows] == ["Jordan Avery", "Riley Park"]
    assert [x["unanswered"] for x in rows] == [True, False]
    assert set(rows[0]) == {"id", "guest_name", "created_at", "last_guest_at", "last_host_at",
                            "blocked", "unanswered", "email_notices", "message_count",
                            "last_author", "last_body"}
    assert rows[0]["email_notices"] is True and rows[1]["email_notices"] is False
    text = r.text
    for needle in ("jordan.guest@example.test", KEY_A, KEY_B, GOOD_CODE, "guest_token"):
        assert needle not in text, needle


def test_host_reads_a_thread_and_replies_within_the_same_limits(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c)
    tid = _only_thread_id(conn)
    assert c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "a" * 1001}).status_code == 422
    assert c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "bad\x00"}).status_code == 422
    r = c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "  See you there.  "})
    assert r.status_code == 200
    assert set(r.json()) == {"ok", "message"}
    assert r.json()["message"]["body"] == "See you there."
    r = c.get(f"/api/events/e1/guest-threads/{tid}")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"ok", "thread", "messages"}
    assert [m["author"] for m in body["messages"]] == ["guest", "host"]
    assert body["thread"]["unanswered"] is False
    assert KEY_A not in r.text and "guest_token" not in r.text


def test_never_pass_gated(monkeypatch):
    # Free (owner ruling 11/16/2026): no event_passes read, no 402, with billing live.
    import app.config as cfg
    monkeypatch.setattr(cfg, "STRIPE_SECRET_KEY", "sk_test_x", raising=False)
    monkeypatch.setattr(cfg, "STRIPE_WEBHOOK_SECRET", "whsec_x", raising=False)
    conn = _Conn()
    c = _client(monkeypatch, conn)
    assert _ask(c).status_code == 200
    tid = _only_thread_id(conn)
    assert c.post(f"/api/events/e1/guest-threads/{tid}/reply", json={"body": "Hi"}).status_code == 200
    import inspect
    src = inspect.getsource(gm_mod)
    assert "event_passes" not in src and "402" not in src


# ── "Opened your invite" (owner scope addition 11/16/2026) ────────────────────
# One shared code per event, so a guest is identifiable only by her device key,
# and only once she has replied or asked. Everyone else is a number.

DEVICE_1 = "device-0000000000000001"
DEVICE_2 = "device-0000000000000002"


def _opened(c, guest_key=None, device_id=DEVICE_1, code=GOOD_CODE, ip=None):
    body = {"device_id": device_id}
    if guest_key:
        body["guest_key"] = guest_key
    headers = {"x-forwarded-for": ip} if ip else {}
    return c.post(f"/api/public/invite/{code}/opened", json=body, headers=headers)


def _today():
    return _now().date()


def test_an_unknown_key_is_counted_anonymously_and_never_becomes_an_identity(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    r = _opened(c, guest_key=KEY_A)
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert conn.opens == {}
    assert conn.days[("e1", _today())] == {"opens": 1, "distinct_devices": 1}


def test_an_identified_guest_gets_last_opened_at_at_most_once_an_hour(monkeypatch):
    conn = _Conn()
    conn.rsvps[(GOOD_CODE, KEY_A)] = {"id": 7, "guest_name": "Jordan Avery", "rsvp": "Yes"}
    c = _client(monkeypatch, conn)
    assert _opened(c, guest_key=KEY_A).json() == {"ok": True}   # the same answer as an unknown key
    first = conn.opens[(GOOD_CODE, KEY_A)]["last_opened_at"]
    rsvp_mod._rate.clear()                                       # not the in-memory limiter:
    _opened(c, guest_key=KEY_A)                                  # the database timestamp throttles
    assert conn.opens[(GOOD_CODE, KEY_A)]["last_opened_at"] == first
    conn.opens[(GOOD_CODE, KEY_A)]["last_opened_at"] = first - _dt.timedelta(minutes=61)
    _opened(c, guest_key=KEY_A)
    assert conn.opens[(GOOD_CODE, KEY_A)]["last_opened_at"] > first


def test_a_guest_who_asked_is_identified_and_a_withdrawn_reply_is_not(monkeypatch):
    conn = _Conn()
    conn.rsvps[(GOOD_CODE, KEY_B)] = {"id": 8, "guest_name": "Riley Park", "rsvp": None}   # withdrawn
    c = _client(monkeypatch, conn)
    _ask(c, key=KEY_A)
    _opened(c, guest_key=KEY_A)
    _opened(c, guest_key=KEY_B, device_id=DEVICE_2)
    assert set(conn.opens) == {(GOOD_CODE, KEY_A)}


def test_daily_counts_are_distinct_devices_by_salted_hash_and_nothing_raw_is_stored(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _opened(c, device_id=DEVICE_1)
    _opened(c, device_id=DEVICE_1)          # the same device within the hour: no new open
    _opened(c, device_id=DEVICE_2, ip="10.0.3.9")
    assert conn.days[("e1", _today())] == {"opens": 2, "distinct_devices": 2}
    hashes = [h for (_e, _d, h) in conn.devices]
    assert len(hashes) == 2 and all(len(h) == 64 for h in hashes)
    written = repr(conn.statements)
    for raw in (DEVICE_1, DEVICE_2, "10.0.3.9", "testclient"):
        assert raw not in written, raw
    # the salt includes the event and the day: one device is not linkable across events
    assert gm_mod._device_hash("e1", _today(), DEVICE_1) != gm_mod._device_hash("e2", _today(), DEVICE_1)


def test_opened_bad_code_is_opaque_404_and_rate_limited(monkeypatch):
    c = _client(monkeypatch, _Conn())
    assert _opened(c, code=OTHER_CODE).status_code == 404
    assert _opened(c, code="short").json() == _opened(c, code=OTHER_CODE).json()
    rsvp_mod._rate.clear()
    codes = [_opened(c).status_code for _ in range(gm_mod.GM_IP_MAX + 1)]
    assert codes[-1] == 429 and 429 not in codes[:-1]
    rsvp_mod._rate.clear()
    assert _opened(c, device_id="short").status_code == 422


def test_host_sees_opened_per_identified_guest_and_daily_totals_only(monkeypatch):
    conn = _Conn()
    conn.rsvps[(GOOD_CODE, KEY_A)] = {"id": 7, "guest_name": "Jordan Avery", "rsvp": "Yes"}
    c = _client(monkeypatch, conn)
    _opened(c, guest_key=KEY_A)
    _opened(c, device_id=DEVICE_2, ip="10.0.3.8")
    r = c.get("/api/events/e1/invite-opens")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"ok", "guests", "days"}
    assert len(body["guests"]) == 1
    g = body["guests"][0]
    assert set(g) == {"guest_name", "last_opened_at", "rsvp_id", "thread_id"}
    assert g["guest_name"] == "Jordan Avery" and g["rsvp_id"] == 7
    assert body["days"] == [{"day": _today().isoformat(), "opens": 2, "distinct_devices": 2}]
    for needle in (KEY_A, DEVICE_1, DEVICE_2, GOOD_CODE):
        assert needle not in r.text, needle


def test_host_opened_route_is_planner_only_and_studio_scoped(monkeypatch):
    conn = _Conn(studio_of={"e1": "studio-a"}, members={("studio-b", "planner-9")})
    c = _client(monkeypatch, conn, principal={"id": "planner-9", "via": "jwt"})
    assert c.get("/api/events/e1/invite-opens").status_code == 403

    async def deny(*a, **k):
        raise HTTPException(401, "Unauthorized")
    monkeypatch.setattr(gm_mod, "require_planner", deny)
    assert c.get("/api/events/e1/invite-opens").status_code == 401


def test_deleting_a_thread_forgets_the_opens_of_a_guest_with_no_live_reply(monkeypatch):
    conn = _Conn()
    c = _client(monkeypatch, conn)
    _ask(c, key=KEY_A)
    _opened(c, guest_key=KEY_A)
    assert (GOOD_CODE, KEY_A) in conn.opens
    c.post(f"/api/public/questions/{GOOD_CODE}/delete", json={"guest_key": KEY_A})
    assert (GOOD_CODE, KEY_A) not in conn.opens


def test_nothing_says_read_or_seen(monkeypatch):
    # Owner rule: "opened", never "read" or "seen", in any field name or copy.
    import inspect
    import re
    conn = _Conn()
    conn.rsvps[(GOOD_CODE, KEY_A)] = {"id": 7, "guest_name": "Jordan Avery", "rsvp": "Yes"}
    c = _client(monkeypatch, conn)
    _ask(c, key=KEY_A)
    _opened(c, guest_key=KEY_A)
    tid = _only_thread_id(conn)
    payloads = [_mine(c).json(), c.get("/api/events/e1/guest-threads").json(),
                c.get(f"/api/events/e1/guest-threads/{tid}").json(),
                c.get("/api/events/e1/invite-opens").json()]

    def keys(o):
        if isinstance(o, dict):
            for k, v in o.items():
                yield k
                yield from keys(v)
        elif isinstance(o, list):
            for v in o:
                yield from keys(v)
    for k in {k for p in payloads for k in keys(p)}:
        words = set(k.lower().split("_"))       # "thread_id" is not "read"
        assert not words & {"read", "seen", "unread", "unseen"}, k
    for s in re.findall(r'"[^"\n]*"', inspect.getsource(gm_mod)):
        assert not re.search(r"\b(read|seen)\b", s, re.I), s


def test_the_thread_model_holds_a_host_first_message():
    # The next PR lets a host start a thread with an opted-in guest. No route
    # does that yet, but a thread whose only message is the host's must read
    # as answered, not as a waiting question.
    t = {"id": uuid.uuid4(), "guest_name": "Jordan Avery", "guest_email": "j@example.test",
         "email_opt_in": True, "created_at": _now(), "last_guest_at": None,
         "last_host_at": _now(), "blocked_at": None}
    assert gm_mod._host_view(t)["unanswered"] is False


def test_a_question_tells_the_host_by_name_only(monkeypatch):
    # G8 (11/16/2026): the alert carries the guest's name — never the question.
    calls = []
    async def fake_alert(*a): calls.append(a)
    monkeypatch.setattr(gm_mod, "alert_host", fake_alert)
    c = _client(monkeypatch, _Conn())
    assert _ask(c, body="Secret question text").status_code == 200
    assert calls == [("e1", "question", "Jordan Avery")]
