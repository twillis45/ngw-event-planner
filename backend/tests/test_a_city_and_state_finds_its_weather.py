"""A host who gives only "City, ST" gets her weather (owner, 11/24/2026).

Probed live: OpenWeather's direct geocoder answers "Springfield, VA" and
"Austin, TX" with nothing. It only reads a two-letter state when the country
follows it ("Springfield, VA, US"). The app sends "City, ST" (the city ask's own
form), so every host who gave a city and no ZIP got no forecast, silently. A ZIP
went through a different endpoint and worked, which is how this hid.

These tests are offline: the HTTP client is a stub that records what the route
asked OpenWeather for.
"""

import asyncio

from app.routers import weather


class _Resp:
    def __init__(self, data):
        self._data = data
        self.status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return self._data


class _Client:
    """Records every query and answers like OpenWeather: a US state code is
    only understood when the country follows it."""

    asked = []

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, params=None):
        q = (params or {}).get("q", "")
        _Client.asked.append(q)
        parts = [p.strip() for p in q.split(",")]
        if len(parts) == 3 and parts[2] == "US":
            return _Resp([{"lat": 38.78, "lon": -77.19, "name": parts[0], "state": "Virginia" if parts[1] == "VA" else "Texas"}])
        if len(parts) == 2:
            return _Resp([])  # "City, ST" alone: OpenWeather finds nothing
        return _Resp([{"lat": 39.8, "lon": -89.6, "name": parts[0], "state": "Illinois"}])


def _geocode(monkeypatch, q, state=None):
    _Client.asked = []
    monkeypatch.setattr(weather, "OPENWEATHER_KEY", "test-key")
    monkeypatch.setattr(weather, "_configured", lambda: True)
    monkeypatch.setattr(weather.httpx, "AsyncClient", _Client)
    return asyncio.run(weather.geocode(q=q, state=state))


def test_city_and_state_is_asked_with_the_country(monkeypatch):
    out = _geocode(monkeypatch, "Springfield, VA", state="VA")
    assert _Client.asked == ["Springfield,VA,US"]
    assert out["result"] and out["result"]["state"] == "Virginia"


def test_a_query_that_already_names_the_country_is_unchanged(monkeypatch):
    out = _geocode(monkeypatch, "Springfield, VA, US", state="VA")
    assert _Client.asked == ["Springfield,VA,US"]
    assert out["result"]["state"] == "Virginia"


def test_a_city_alone_is_unchanged(monkeypatch):
    _geocode(monkeypatch, "Springfield")
    assert _Client.asked == ["Springfield"]


def test_a_non_us_two_letter_tail_that_is_not_a_state_is_left_alone(monkeypatch):
    # "Paris, FR" names a country, not a US state: no ",US" is added.
    _geocode(monkeypatch, "Paris, FR")
    assert _Client.asked == ["Paris, FR"]
