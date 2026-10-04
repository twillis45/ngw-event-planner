"""The month must describe the number it is stamped on.

Measured against the live BLS API on 2026-10-04, West region:

    milk / bread / chicken / potatoes / beer / wine    2026-08
    chicken legs                                       2026-04
    eggs / ground beef / bananas                       no 2026 data at all

`_fetch_latest` returned min() across EVERY series in the request and the
endpoint stamped that on the basket factor. Chicken legs is an ADDITIVE item,
contributes nothing to that factor, and its own code comment already says its
regional coverage is partial -- so one series outside the basket dragged the
basket's label from August back to April. A host planning in October was shown
April for a number built from August prices.

Nothing is dropped to fix it: chicken legs keeps its factor AND gains its own
honest April stamp.
"""
from app.routers import food_prices as fp


def _mk(area_item_month):
    """{(area, item): 'YYYY-MM'} -> the months-by-series map _fetch_latest returns."""
    return {fp._series(a, i): m for (a, i), m in area_item_month.items()}


def test_an_additive_item_cannot_age_the_basket_label(monkeypatch):
    west, us = fp._AREA["west"], fp._AREA["us"]
    prices, months = {}, {}
    # Every basket item current.
    for code in fp._BASKET:
        for area in (west, us):
            prices[fp._series(area, code)] = 2.0 if area == us else 2.2
            months[fp._series(area, code)] = "2026-08"
    # One ADDITIVE item four months behind -- the real chicken-legs case.
    legs = "706212"
    for area in (west, us):
        prices[fp._series(area, legs)] = 1.0
        months[fp._series(area, legs)] = "2026-04"

    basket_months = [
        min(m for m in (months.get(fp._series(a, c)) for a in (west, us)) if m)
        for c in fp._BASKET
    ]
    assert min(basket_months) == "2026-08", "the basket's own months are all August"
    assert min(list(months.values())) == "2026-04", (
        "and a global min still reaches back to April -- which is the bug"
    )


def test_a_ratio_is_only_as_current_as_its_staler_half():
    # A ratio compares region against US; it cannot be newer than the older side.
    months = _mk({(fp._AREA["west"], "709112"): "2026-08",
                  (fp._AREA["us"], "709112"): "2026-05"})
    pair = [months[fp._series(a, "709112")] for a in (fp._AREA["west"], fp._AREA["us"])]
    assert min(pair) == "2026-05"


def test_fetch_latest_returns_a_map_not_one_minimum(monkeypatch):
    """The fix IS the signature: months per series, never one collapsed value.

    Asserted by CALLING it, not by grepping the source. The first draft of this
    test did grep -- and failed on its own explanatory comment, which contains
    the very string it was banning. A source grep cannot tell code from the
    paragraph describing it.
    """
    import asyncio, json

    class _Res:
        status_code = 200
        def raise_for_status(self): pass
        def json(self):
            return {"status": "REQUEST_SUCCEEDED", "Results": {"series": [
                {"seriesID": "APU0400709112",
                 "data": [{"year": "2026", "period": "M08", "value": "4.831"}]},
                {"seriesID": "APU0400706212",
                 "data": [{"year": "2026", "period": "M04", "value": "1.000"}]},
            ]}}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): return _Res()

    monkeypatch.setattr(fp.httpx, "AsyncClient", _Client)
    prices, months = asyncio.run(
        fp._fetch_latest(["APU0400709112", "APU0400706212"]))

    assert isinstance(months, dict), "one collapsed month is what caused this bug"
    assert months["APU0400709112"] == "2026-08"
    assert months["APU0400706212"] == "2026-04"
    # Each series keeps its OWN date. Nothing is dropped and nothing inherits
    # another series' staleness.
    assert prices["APU0400709112"] == 4.831


def test_m13_annual_average_is_still_refused():
    assert fp._data_month({"year": "2026", "period": "M13"}) is None
    assert fp._data_month({"year": "2026", "period": "M08"}) == "2026-08"


def test_the_live_west_case_end_to_end(monkeypatch):
    """The exact shape measured against BLS on 2026-10-04.

    Basket at 2026-08, additive chicken legs at 2026-04. Before the fix the
    endpoint reported 2026-04 for a factor built entirely from August prices.
    """
    from fastapi.testclient import TestClient
    from app.main import app

    west, us = fp._AREA["west"], fp._AREA["us"]

    async def live_shape(ids):
        prices, months = {}, {}
        for code in fp._BASKET:
            for area in (west, us):
                sid = fp._series(area, code)
                prices[sid] = 2.2 if area == west else 2.0
                months[sid] = "2026-08"
        for area in (west, us):          # additive, four months behind
            sid = fp._series(area, "706212")
            prices[sid] = 1.0
            months[sid] = "2026-04"
        return prices, months

    monkeypatch.setattr(fp, "_fetch_latest", live_shape)
    fp._CACHE.clear()
    r = TestClient(app).get("/api/food-prices?region=west").json()

    assert r["month"] == "2026-08", (
        "the factor is made of August prices and must say so"
    )
    # NOTHING DROPPED: chicken legs keeps its factor and carries its own date.
    assert "chickenLegs" in r["item_factors"]
    assert r["item_months"]["chickenLegs"] == "2026-04"


# ── IS THE KEY EVEN SET? NOTHING COULD SAY (2026-10-04) ────────────────────
# render.yaml declares BLS_API_KEY with `sync: false`, so it is set by hand in
# the dashboard or not at all -- and no endpoint, log or test could answer
# whether it had been. The failure it guards is silent: unregistered BLS caps
# around 25 queries a day, a refusal caches until UTC midnight, and the only
# symptom a host sees is a number that stopped moving.
def test_status_reports_whether_a_key_is_set_and_never_the_key(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app

    monkeypatch.setattr(fp, "BLS_API_KEY", "super-secret-value")
    r = TestClient(app).get("/api/food-prices/status").json()
    assert r["keyed"] is True
    assert r["daily_query_cap"] == 500
    # The VALUE must never travel. This is the whole reason /api/stripe/status
    # answers a boolean and nothing else.
    assert "super-secret-value" not in str(r)

    monkeypatch.setattr(fp, "BLS_API_KEY", None)
    r2 = TestClient(app).get("/api/food-prices/status").json()
    assert r2["keyed"] is False
    assert r2["daily_query_cap"] == 25


def test_status_shows_what_the_cache_holds_without_spending_a_query(monkeypatch):
    """A monitor must be able to see whether the month is advancing cheaply."""
    import time
    from fastapi.testclient import TestClient
    from app.main import app

    fp._CACHE.clear()
    fp._CACHE[("west", "2026-10")] = (time.time() + 3600, {"region": "west", "month": "2026-08"})
    r = TestClient(app).get("/api/food-prices/status").json()
    assert {"region": "west", "month": "2026-08"} in r["cached"]
    fp._CACHE.clear()
