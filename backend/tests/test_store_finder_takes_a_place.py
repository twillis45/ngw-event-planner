"""The store finder takes a place, not only a ZIP (owner, 11/18/2026: "Zip
input should also take city state and use the other city state lookup list
we use in the app").

Kroger's locations API finds stores by ZIP or by `filter.latLong.near`. A
"City, ST" picked from the app's city list is turned into coordinates by the
existing geocoder, and the geocoder must respect the state: probed live
11/18/2026, "Abbeville,LA,US" with limit=1 came back as Abbeville, ALABAMA
(31.57, -85.25). With a state given, the route asks for several candidates
and keeps only one in that state; none in that state is no result, never a
neighbor's.
"""
import sys
import types
import asyncio

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import app.routers.kroger as kr
import app.routers.weather as wx


class _Resp:
    def __init__(self, data, status=200):
        self._d, self.status_code, self.text = data, status, ""
    def json(self):
        return self._d
    def raise_for_status(self):
        return None


def _fake_client(calls, data):
    class C:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url, params=None, headers=None):
            calls.append(dict(params or {}))
            return _Resp(data)
    return C


def test_stores_near_coordinates(monkeypatch):
    calls = []
    monkeypatch.setattr(kr, "_configured", lambda: True)
    async def tok(): return "t"
    monkeypatch.setattr(kr, "_get_token", tok)
    monkeypatch.setattr(kr.httpx, "AsyncClient", _fake_client(calls, {"data": []}))
    out = asyncio.run(kr.kroger_locations(zip=None, lat=38.7254674, lon=-76.9900251))
    assert out.get("error") is None
    assert calls[0]["filter.latLong.near"] == "38.7254674,-76.9900251"
    assert "filter.zipCode.near" not in calls[0]


def test_a_zip_still_works_the_same(monkeypatch):
    calls = []
    monkeypatch.setattr(kr, "_configured", lambda: True)
    async def tok(): return "t"
    monkeypatch.setattr(kr, "_get_token", tok)
    monkeypatch.setattr(kr.httpx, "AsyncClient", _fake_client(calls, {"data": []}))
    asyncio.run(kr.kroger_locations(zip="20744", lat=None, lon=None))
    assert calls[0]["filter.zipCode.near"] == "20744"


def test_neither_a_zip_nor_a_place_is_refused(monkeypatch):
    monkeypatch.setattr(kr, "_configured", lambda: True)
    async def tok(): return "t"
    monkeypatch.setattr(kr, "_get_token", tok)
    out = asyncio.run(kr.kroger_locations(zip="", lat=None, lon=None))
    assert out["error"] == "no_zip" and out["locations"] == []


CANDIDATES = [
    {"name": "Abbeville", "lat": 31.5702088, "lon": -85.2503315, "state": "Alabama"},
    {"name": "Abbeville", "lat": 29.9746, "lon": -92.1343, "state": "Louisiana"},
]


def test_the_geocoder_keeps_the_requested_state(monkeypatch):
    calls = []
    monkeypatch.setattr(wx, "_configured", lambda: True)
    monkeypatch.setattr(wx.httpx, "AsyncClient", _fake_client(calls, CANDIDATES))
    out = asyncio.run(wx.geocode(q="Abbeville, LA, US", state="LA"))
    assert out["result"]["lat"] == 29.9746
    assert out["result"]["state"] == "Louisiana"
    assert calls[0]["limit"] > 1


def test_no_candidate_in_the_state_is_no_result(monkeypatch):
    monkeypatch.setattr(wx, "_configured", lambda: True)
    monkeypatch.setattr(wx.httpx, "AsyncClient", _fake_client([], CANDIDATES))
    out = asyncio.run(wx.geocode(q="Abbeville, OR, US", state="OR"))
    assert out["result"] is None


def test_without_a_state_the_geocoder_is_unchanged(monkeypatch):
    calls = []
    monkeypatch.setattr(wx, "_configured", lambda: True)
    monkeypatch.setattr(wx.httpx, "AsyncClient", _fake_client(calls, CANDIDATES))
    out = asyncio.run(wx.geocode(q="Abbeville", state=None))
    assert out["result"]["lat"] == 31.5702088
    assert calls[0]["limit"] == 1
