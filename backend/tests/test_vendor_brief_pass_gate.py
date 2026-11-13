"""S9-5 (11/11/2026): the One-Event Pass is enforced where a live brief link is
minted, not only in the browser. The rule mirrors lib/passGate.briefAllowed and
is documented at vendor_brief._brief_blocked_reason.

Pins, with billing live:
  - the first vendor's brief on a free event is minted (the free tier works);
  - a second vendor's brief is refused with 402 'second-vendor', whether the
    first one is known from a server link or from the event's shared list;
  - an event stamped destination or multi-day refuses with 402 'pass-required';
  - Model H (owner ruling 11/13/2026): an event stamped pass-required under
    the removed door 3 alone ('additional-event') is free, so its first brief
    is minted, and door 1 still applies to it;
  - an unblocked pass unlocks every vendor;
  - a vendor that already has a link keeps it, even on a pass-required event
    (never mid-conversation);
  - the event blob can only block: listing the vendor itself as shared does not
    count against it.
And with billing not live, nothing is refused (the client's dormant rule).
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.routers.vendor_brief as vb_mod

V1 = {"id": "v1", "name": "Capital Rotisserie Catering", "category": "Catering"}
V2 = {"id": "v2", "name": "Fork & Flower", "category": "Florist"}


class _Conn:
    """Answers by query text. `links` maps vendor_id -> active code."""
    def __init__(self, data, links=None, pass_held=False):
        self.data = data
        self.links = dict(links or {})
        self.pass_held = pass_held
        self.inserted = None

    async def fetchrow(self, q, *a):
        if "from public.events" in q:
            return {"id": "e1", "data": self.data}
        return None

    async def fetchval(self, q, *a):
        if "from public.event_passes" in q:
            return 1 if self.pass_held else None
        if "insert into public.vendor_brief_links" in q:
            self.inserted = a[0]
            return a[0]
        if "from public.vendor_brief_links" in q:
            return self.links.get(a[1])
        return None

    async def fetch(self, q, *a):
        if "from public.vendor_brief_links" in q and "vendor_id<>$2" in q:
            return [{"vendor_id": v} for v in self.links if v != a[1]]
        return []


class _Acquire:
    def __init__(self, conn):   self._c = conn
    async def __aenter__(self): return self._c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, conn): self._conn = conn
    def acquire(self): return _Acquire(self._conn)


def _client(monkeypatch, conn, live=True):
    async def fake_require_planner(*a, **k):
        return {"id": "planner-1", "via": "dev_token"}

    async def fake_assert(*a, **k):
        return None

    async def fake_get_pool():
        return _Pool(conn)

    monkeypatch.setattr(vb_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(vb_mod, "_assert_event_studio_read", fake_assert)
    monkeypatch.setattr(vb_mod, "get_pool", fake_get_pool)
    monkeypatch.setattr(vb_mod, "_billing_live", lambda: live)
    app = FastAPI()
    app.include_router(vb_mod.router)
    return TestClient(app)


def _mint(c, vendor_id):
    return c.post("/api/events/e1/vendor-brief-links", json={"vendor_id": vendor_id})


def _reason(r):
    return r.json()["detail"]["reason"]


def test_the_first_brief_on_a_free_event_is_minted(monkeypatch):
    conn = _Conn({"vendors": [V1, V2]})
    r = _mint(_client(monkeypatch, conn), "v1")
    assert r.status_code == 200 and r.json()["code"] == conn.inserted


def test_a_second_vendor_is_refused_after_a_server_link(monkeypatch):
    conn = _Conn({"vendors": [V1, V2]}, links={"v1": "CODE_FOR_V1_123456789"})
    r = _mint(_client(monkeypatch, conn), "v2")
    assert r.status_code == 402 and _reason(r) == "second-vendor"
    assert conn.inserted is None


def test_a_second_vendor_is_refused_after_a_shared_list_entry(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "briefSharedVendorIds": ["v1"]})
    r = _mint(_client(monkeypatch, conn), "v2")
    assert r.status_code == 402 and _reason(r) == "second-vendor"


def test_listing_the_vendor_itself_as_shared_does_not_count_against_it(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "briefSharedVendorIds": ["v1"]})
    r = _mint(_client(monkeypatch, conn), "v1")
    assert r.status_code == 200


def test_a_pass_required_event_is_refused(monkeypatch):
    conn = _Conn({"vendors": [V1], "passRequired": True, "passReasons": ["destination"]})
    r = _mint(_client(monkeypatch, conn), "v1")
    assert r.status_code == 402 and _reason(r) == "pass-required"


def test_a_multi_day_stamp_is_refused_even_beside_a_door_3_reason(monkeypatch):
    conn = _Conn({"vendors": [V1], "passRequired": True, "passReasons": ["multi-day", "additional-event"]})
    r = _mint(_client(monkeypatch, conn), "v1")
    assert r.status_code == 402 and _reason(r) == "pass-required"


def test_a_door_3_only_stamp_is_free_its_first_brief_is_minted(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "passRequired": True, "passReasons": ["additional-event"]})
    r = _mint(_client(monkeypatch, conn), "v1")
    assert r.status_code == 200 and r.json()["code"] == conn.inserted


def test_a_door_3_only_stamp_still_takes_the_pass_for_a_second_vendor(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "passRequired": True, "passReasons": ["additional-event"]},
                 links={"v1": "CODE_FOR_V1_123456789"})
    r = _mint(_client(monkeypatch, conn), "v2")
    assert r.status_code == 402 and _reason(r) == "second-vendor"


def test_a_held_pass_unlocks_every_vendor(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "passRequired": True, "passReasons": ["destination"]}, links={"v1": "CODE_FOR_V1_123456789"}, pass_held=True)
    r = _mint(_client(monkeypatch, conn), "v2")
    assert r.status_code == 200


def test_an_existing_link_is_never_taken_back(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "passRequired": True, "passReasons": ["destination"]}, links={"v1": "CODE_FOR_V1_123456789", "v2": "CODE_FOR_V2_123456789"})
    r = _mint(_client(monkeypatch, conn), "v2")
    assert r.status_code == 200 and r.json()["code"] == "CODE_FOR_V2_123456789"


def test_nothing_is_refused_while_billing_is_not_live(monkeypatch):
    conn = _Conn({"vendors": [V1, V2], "passRequired": True, "passReasons": ["destination"]}, links={"v1": "CODE_FOR_V1_123456789"})
    r = _mint(_client(monkeypatch, conn, live=False), "v2")
    assert r.status_code == 200


def test_billing_live_reads_both_stripe_keys(monkeypatch):
    monkeypatch.setattr(vb_mod.config, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(vb_mod.config, "STRIPE_WEBHOOK_SECRET", None)
    assert vb_mod._billing_live() is False
    monkeypatch.setattr(vb_mod.config, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    assert vb_mod._billing_live() is True
