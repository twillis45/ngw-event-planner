"""Route tests for the helper link (owner-approved 11/15/2026, free).

Same pattern as test_vendor_brief.py: asyncpg is stubbed before import, auth
and the DB pool are monkeypatched, and the DB mock dispatches on query text.

Pins:
  - mint is planner-only and studio-scoped; the helper is found in the
    SERVER's event blob (a name with no job there is a 404); the code is long
    enough to be unguessable and is reused, never re-minted.
  - the public resolve is a strict whitelist: host name, event name/date/
    start time/venue + address, and THIS helper's own jobs only — never
    another helper's job, a guest, money, notes, or contacts.
  - the answer is idempotent on (code, idempotency_key), its identity comes
    from the server's link row, and it is rate-limited per IP and per code
    with a lifetime ceiling.
  - missing / revoked / too-short codes are the same opaque 404.
  - the host read-back requires the planner gate.
All names are synthetic.
"""
import sys
import types
import datetime as _dt

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.helper_link as hl_mod


class _Conn:
    def __init__(self, event_row=None, link_row=None, existing_code=None,
                 answer_count=0, is_resubmit=False, latest=None, answer_rows=None):
        self.event_row = event_row
        self.link_row = link_row
        self.existing_code = existing_code
        self.inserted = None
        self.answer_count = answer_count
        self.is_resubmit = is_resubmit
        self.latest = latest
        self.answer_rows = answer_rows or []
        self.answer_args = None

    async def fetchrow(self, q, *a):
        if "insert into public.helper_confirmations" in q:
            self.answer_args = a
            return {"submitted_at": _dt.datetime(2026, 11, 20, 12, 0, tzinfo=_dt.timezone.utc)}
        if "count(*)" in q and "helper_confirmations" in q:
            return {"n": self.answer_count, "is_resubmit": self.is_resubmit}
        if "from public.helper_confirmations" in q:
            return self.latest
        if "from public.events" in q:
            return self.event_row
        if "from public.helper_links" in q:
            return self.link_row
        return None

    async def fetchval(self, q, *a):
        if "insert into public.helper_links" in q:
            self.inserted = (a[0], a[1], a[2])
            return a[0]
        if "from public.helper_links" in q:
            return self.existing_code
        return None

    async def fetch(self, q, *a):
        if "helper_confirmations" in q:
            return list(self.answer_rows)
        return []


class _Acquire:
    def __init__(self, conn):   self._c = conn
    async def __aenter__(self): return self._c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, conn): self._conn = conn
    def acquire(self): return _Acquire(self._conn)


EVENT = {
    "name": "Friendsgiving at Pine Street",
    "date": "2026-11-26",
    "startTime": "16:00",
    "venue": "Our place",
    "venueAddress": "12 Pine Street, Springfield",
    "hostName": "Casey Morgan",
    "totalBudget": 900,
    "notes": "PRIVATE host note: Riley still owes $40",
    "guests": [
        {"id": "g1", "name": "Jordan Avery", "phone": "555-0101", "email": "jordan@example.test",
         "allergens": ["Peanut"], "needs": "PRIVATE needs line"},
        {"id": "g2", "name": "Riley Park", "phone": "555-0102"},
    ],
    "timeline": [
        {"id": "t1", "task": "Bring folding chairs", "owner": "Jordan"},
        {"id": "t2", "task": "Pick up ice", "owner": "Riley Park"},
        {"id": "t3", "task": "Old task", "owner": "Jordan", "retired": True},
        {"id": "t4", "task": "Host only", "owner": "me"},
    ],
    "foodAdd": [
        {"id": "f1", "name": "Cornbread stuffing", "owner": "Jordan Avery", "cost": 25, "group": "Food"},
        {"id": "f2", "name": "Skipped pie", "owner": "Jordan Avery", "group": "Food"},
        {"id": "f3", "name": "Cranberry sauce", "owner": "Riley Park", "group": "Food"},
    ],
    "foodSkip": {"f2": True},
    "ros": [
        {"id": "r1", "time": "15:30", "segment": "Set the table", "owner": "Jordan Avery"},
        {"id": "r2", "time": "15:00", "segment": "DJ load-in", "owner": "Jordan Avery", "type": "vendor"},
    ],
    "vendors": [
        {"id": "v1", "name": "Sam Lee", "category": "Bartending", "isInformal": True, "cost": 0},
        {"id": "v2", "name": "Spin Cycle", "category": "DJ", "cost": 600},
    ],
}

GOOD_CODE = "abcdefghij1234567890xy"


def _client(monkeypatch, conn):
    async def fake_require_planner(*a, **k):
        return {"id": "planner-1", "via": "dev_token"}

    async def fake_assert(*a, **k):
        return None

    async def fake_get_pool():
        return _Pool(conn)

    monkeypatch.setattr(hl_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(hl_mod, "_assert_event_studio_read", fake_assert)
    monkeypatch.setattr(hl_mod, "get_pool", fake_get_pool)
    hl_mod._rate.clear()
    app = FastAPI()
    app.include_router(hl_mod.router)
    return TestClient(app)


def _resolving(**k):
    return _Conn(event_row={"id": "e1", "data": dict(EVENT)},
                 link_row={"event_id": "e1", "helper_key": "g1"}, **k)


# ── Mint ───────────────────────────────────────────────────────────────────────

def test_mint_requires_the_planner_gate(monkeypatch):
    c = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": dict(EVENT)}))

    async def deny(*a, **k):
        raise HTTPException(401, "Unauthorized")
    monkeypatch.setattr(hl_mod, "require_planner", deny)
    assert c.post("/api/events/e1/helper-links", json={"helper_name": "Jordan Avery"}).status_code == 401


def test_mint_is_studio_scoped(monkeypatch):
    c = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": dict(EVENT)}))

    async def forbid(*a, **k):
        raise HTTPException(403, "Forbidden")
    monkeypatch.setattr(hl_mod, "_assert_event_studio_read", forbid)
    assert c.post("/api/events/e1/helper-links", json={"helper_name": "Jordan Avery"}).status_code == 403


def test_mint_returns_an_unguessable_code_keyed_to_the_guest(monkeypatch):
    conn = _Conn(event_row={"id": "e1", "data": dict(EVENT)})
    c = _client(monkeypatch, conn)
    r = c.post("/api/events/e1/helper-links", json={"helper_name": "Jordan Avery"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and body["code"] == conn.inserted[0]
    assert len(body["code"]) >= hl_mod.MIN_CODE_LEN
    # one person, one key: the typed "Jordan" and the guest "Jordan Avery"
    # resolve to the same guest id, exactly as the client's helper engine does
    assert conn.inserted[1:] == ("e1", "g1")
    assert body["helper_key"] == "g1"


def test_mint_reuses_the_active_code(monkeypatch):
    conn = _Conn(event_row={"id": "e1", "data": dict(EVENT)}, existing_code="EXISTINGCODE12345678ab")
    c = _client(monkeypatch, conn)
    r1 = c.post("/api/events/e1/helper-links", json={"helper_name": "Jordan Avery"})
    r2 = c.post("/api/events/e1/helper-links", json={"helper_name": "Jordan Avery"})
    assert r1.json()["code"] == r2.json()["code"] == "EXISTINGCODE12345678ab"
    assert conn.inserted is None


def test_mint_404_for_someone_with_no_job_on_the_server_event(monkeypatch):
    c = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": dict(EVENT)}))
    assert c.post("/api/events/e1/helper-links", json={"helper_name": "Nobody Here"}).status_code == 404
    # the host is never a helper
    assert c.post("/api/events/e1/helper-links", json={"helper_name": "me"}).status_code == 404
    # a paid vendor is never a helper
    assert c.post("/api/events/e1/helper-links", json={"helper_name": "Spin Cycle"}).status_code == 404


def test_mint_keys_a_helper_off_the_guest_list_by_name(monkeypatch):
    conn = _Conn(event_row={"id": "e1", "data": dict(EVENT)})
    c = _client(monkeypatch, conn)
    r = c.post("/api/events/e1/helper-links", json={"helper_name": "Sam Lee"})
    assert r.status_code == 200
    assert conn.inserted[2] == "helper-sam-lee"   # the client engine's own id shape


def test_mint_is_never_pass_gated(monkeypatch):
    # The helper link is free (owner ruling 11/15/2026): no event_passes read,
    # no 402, even with billing live and a second, third, fourth helper.
    import app.config as cfg
    monkeypatch.setattr(cfg, "STRIPE_SECRET_KEY", "sk_test_x", raising=False)
    monkeypatch.setattr(cfg, "STRIPE_WEBHOOK_SECRET", "whsec_x", raising=False)
    for name in ("Jordan Avery", "Riley Park", "Sam Lee"):
        c = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": dict(EVENT)}))
        assert c.post("/api/events/e1/helper-links", json={"helper_name": name}).status_code == 200


# ── Public resolve ─────────────────────────────────────────────────────────────

def test_resolve_returns_only_this_helpers_jobs_and_the_event_basics(monkeypatch):
    c = _client(monkeypatch, _resolving())
    r = c.get(f"/api/public/helper/{GOOD_CODE}")
    assert r.status_code == 200
    h = r.json()["helper"]
    assert set(h) == {"helperName", "hostName", "eventName", "eventDate", "startTime",
                      "venue", "venueAddress", "jobs", "answer"}
    assert h["helperName"] == "Jordan Avery"
    assert h["hostName"] == "Casey Morgan"
    assert h["eventName"] == "Friendsgiving at Pine Street"
    assert h["eventDate"] == "2026-11-26" and h["startTime"] == "16:00"
    assert h["venue"] == "Our place" and h["venueAddress"] == "12 Pine Street, Springfield"
    labels = [j["label"] for j in h["jobs"]]
    assert labels == ["Cornbread stuffing", "Bring folding chairs", "Set the table"]
    assert [j["kind"] for j in h["jobs"]] == ["food", "task", "setup"]
    assert h["jobs"][2]["time"] == "15:30"
    for j in h["jobs"]:
        assert set(j) <= {"kind", "label", "time"}
    assert h["answer"] is None


def test_resolve_never_exposes_anything_off_the_whitelist(monkeypatch):
    c = _client(monkeypatch, _resolving())
    body = c.get(f"/api/public/helper/{GOOD_CODE}").text
    for needle in ("Riley", "Pick up ice", "Cranberry", "Skipped pie", "Old task", "Sam Lee",
                   "Spin Cycle", "DJ load-in", "555-01", "example.test", "Peanut", "PRIVATE",
                   "900", "$40", "cost", "totalBudget", "guests", "Host only"):
        assert needle not in body, needle


def test_resolve_carries_the_helpers_own_prior_answer(monkeypatch):
    c = _client(monkeypatch, _resolving(latest={"state": "declined", "note": "Out of town"}))
    h = c.get(f"/api/public/helper/{GOOD_CODE}").json()["helper"]
    assert h["answer"] == {"state": "declined", "note": "Out of town"}


def test_resolve_opaque_404s(monkeypatch):
    c = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": dict(EVENT)}))
    nf = c.get(f"/api/public/helper/{GOOD_CODE}")      # missing or revoked
    short = c.get("/api/public/helper/short")         # under the entropy floor
    assert nf.status_code == short.status_code == 404
    assert nf.json() == short.json()
    # the helper no longer holds any job (host took them all back)
    gone = dict(EVENT); gone["timeline"] = []; gone["foodAdd"] = []; gone["ros"] = []
    c2 = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": gone},
                                    link_row={"event_id": "e1", "helper_key": "g1"}))
    r = c2.get(f"/api/public/helper/{GOOD_CODE}")
    assert r.status_code == 404 and r.json() == nf.json()
    # the event itself is gone
    c3 = _client(monkeypatch, _Conn(link_row={"event_id": "e1", "helper_key": "g1"}))
    assert c3.get(f"/api/public/helper/{GOOD_CODE}").json() == nf.json()


def test_resolve_is_rate_limited_per_ip(monkeypatch):
    c = _client(monkeypatch, _resolving())
    codes = [c.get(f"/api/public/helper/{GOOD_CODE}").status_code for _ in range(hl_mod.HELPER_IP_MAX + 1)]
    assert codes[-1] == 429 and all(s == 200 for s in codes[:-1])


# ── Public answer ──────────────────────────────────────────────────────────────

def _answer(**over):
    body = {"idempotency_key": "idk-helper-1", "state": "confirmed", "note": None}
    body.update(over)
    return body


def test_answer_takes_identity_from_the_server_link_row(monkeypatch):
    conn = _resolving()
    c = _client(monkeypatch, conn)
    r = c.post(f"/api/public/helper/{GOOD_CODE}/answer",
               json=_answer(event_id="evil", helper_key="g2"))
    assert r.status_code == 200
    assert set(r.json()) == {"ok", "submitted_at"}
    a = conn.answer_args
    assert a[0] == GOOD_CODE and a[1] == "e1" and a[2] == "g1"
    assert a[3] == "idk-helper-1" and a[4] == "confirmed"


def test_answer_is_idempotent_and_can_change(monkeypatch):
    conn = _resolving(answer_count=1, is_resubmit=True)
    c = _client(monkeypatch, conn)
    assert c.post(f"/api/public/helper/{GOOD_CODE}/answer", json=_answer()).status_code == 200
    r = c.post(f"/api/public/helper/{GOOD_CODE}/answer",
               json=_answer(state="declined", note="  Out of town that week  "))
    assert r.status_code == 200
    assert conn.answer_args[3] == "idk-helper-1"     # same key → the SQL upserts one row
    assert conn.answer_args[4] == "declined"
    assert conn.answer_args[5] == "Out of town that week"


def test_answer_rejects_an_unknown_state(monkeypatch):
    c = _client(monkeypatch, _resolving())
    assert c.post(f"/api/public/helper/{GOOD_CODE}/answer", json=_answer(state="maybe")).status_code == 422


def test_answer_opaque_404s(monkeypatch):
    c = _client(monkeypatch, _Conn())
    assert c.post(f"/api/public/helper/{GOOD_CODE}/answer", json=_answer()).status_code == 404
    assert c.post("/api/public/helper/short/answer", json=_answer()).status_code == 404


def test_answer_lifetime_cap_blocks_new_rows_not_a_changed_answer(monkeypatch):
    cap = hl_mod.ANSWER_CODE_MAX_TOTAL
    c = _client(monkeypatch, _resolving(answer_count=cap, is_resubmit=False))
    assert c.post(f"/api/public/helper/{GOOD_CODE}/answer", json=_answer()).status_code == 429
    c2 = _client(monkeypatch, _resolving(answer_count=cap, is_resubmit=True))
    assert c2.post(f"/api/public/helper/{GOOD_CODE}/answer", json=_answer()).status_code == 200


def test_answer_per_code_rate_limit(monkeypatch):
    c = _client(monkeypatch, _resolving())
    codes = []
    for i in range(hl_mod.ANSWER_CODE_MAX + 1):
        r = c.post(f"/api/public/helper/{GOOD_CODE}/answer", json=_answer(),
                   headers={"x-forwarded-for": f"10.0.0.{i}"})
        codes.append(r.status_code)
    assert codes[-1] == 429 and all(s == 200 for s in codes[:-1])


# ── Host read-back ─────────────────────────────────────────────────────────────

def test_readback_requires_the_planner_gate(monkeypatch):
    c = _client(monkeypatch, _Conn())

    async def deny(*a, **k):
        raise HTTPException(401, "Unauthorized")
    monkeypatch.setattr(hl_mod, "require_planner", deny)
    assert c.get("/api/events/e1/helper-confirmations").status_code == 401


def test_readback_returns_the_answers_own_fields_only(monkeypatch):
    rows = [{"helper_key": "g1", "state": "declined", "note": "Out of town",
             "submitted_at": _dt.datetime(2026, 11, 20, 13, 0, tzinfo=_dt.timezone.utc),
             "updated_at": None}]
    c = _client(monkeypatch, _Conn(answer_rows=rows))
    r = c.get("/api/events/e1/helper-confirmations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert set(data[0]) == {"helper_key", "state", "note", "submitted_at", "updated_at"}


def test_an_hour_the_app_guessed_never_reaches_the_helper():
    # doItForMe.timePhrase's rule, server-side: a derived start time is the
    # app's guess, not the host's word, so it is withheld.
    p = hl_mod.build_helper_payload({**EVENT, "startTimeSource": "derived"}, "g1")
    assert p["startTime"] == ""
    assert hl_mod.build_helper_payload({**EVENT, "startTimeSource": "host"}, "g1")["startTime"] == "16:00"


def test_the_phantom_address_field_is_not_read():
    # venueFor.js: event.address is whitelisted elsewhere but never written;
    # venueAddress is the truth.
    data = {k: v for k, v in EVENT.items() if k != "venueAddress"}
    data["address"] = "999 Phantom Road"
    assert hl_mod.build_helper_payload(data, "g1")["venueAddress"] == ""
