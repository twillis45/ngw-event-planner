"""THE GEOCODER TAKES A ZIP (owner's invite, 11/24/2026).

The app asks the weather geocode with the event's ZIP whenever it has one
(src/lib/venueFor.js venueGeoQuery): the host's weather, the airports and the
guest's "tell me when I'm close". OpenWeather's direct geocoder reads a city
name; a ZIP has its own endpoint (geo/1.0/zip?zip=<zip>,US). A five-digit q
goes there; every other q is unchanged.
"""
import asyncio

import app.routers.weather as wx


class _Resp:
    def __init__(self, data, status=200):
        self._data, self.status_code = data, status

    def json(self):
        return self._data

    def raise_for_status(self):
        return None


def _client(calls, by_url):
    class C:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, params=None, headers=None):
            calls.append((url, dict(params or {})))
            return _Resp(by_url[url])
    return C


ZIP_HIT = {"zip": "22150", "name": "Springfield", "lat": 38.7726, "lon": -77.1844, "country": "US"}


def test_a_zip_is_geocoded_as_a_zip(monkeypatch):
    calls = []
    monkeypatch.setattr(wx, "_configured", lambda: True)
    monkeypatch.setattr(wx.httpx, "AsyncClient", _client(calls, {wx.ZIP_URL: ZIP_HIT, wx.GEO_URL: []}))
    out = asyncio.run(wx.geocode(q="22150", state=None))
    assert calls[0][0] == wx.ZIP_URL and calls[0][1]["zip"] == "22150,US"
    assert out["result"] == {"lat": 38.7726, "lon": -77.1844, "name": "Springfield"}


def test_a_town_is_unchanged(monkeypatch):
    calls = []
    monkeypatch.setattr(wx, "_configured", lambda: True)
    monkeypatch.setattr(wx.httpx, "AsyncClient", _client(calls, {wx.GEO_URL: [{"name": "Springfield", "lat": 1, "lon": 2}]}))
    out = asyncio.run(wx.geocode(q="Springfield, VA, US", state=None))
    assert calls[0][0] == wx.GEO_URL and out["result"]["lat"] == 1


def test_an_unknown_zip_is_no_result(monkeypatch):
    class R(_Resp):
        def raise_for_status(self):
            raise AssertionError("a 404 ZIP is answered before raise_for_status")
    calls = []

    def client(*a, **k):
        C = _client(calls, {})
        c = C()

        async def get(url, params=None, headers=None):
            calls.append((url, params))
            return R({"cod": "404", "message": "not found"}, 404)
        c.get = get
        return c
    monkeypatch.setattr(wx, "_configured", lambda: True)
    monkeypatch.setattr(wx.httpx, "AsyncClient", client)
    out = asyncio.run(wx.geocode(q="00000", state=None))
    assert out == {"ok": True, "result": None} and calls[0][0] == wx.ZIP_URL
