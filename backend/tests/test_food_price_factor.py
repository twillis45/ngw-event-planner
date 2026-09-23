# ── THE FOOD-PRICE FACTOR MULTIPLIES A HOST'S BUDGET ────────────────────────
#
# `food_price_factor` returns a number the food plan multiplies by. Its own
# docstring commits to the property that matters: it "returns 1.0 (no
# adjustment) for unknown/US, or when BLS is unreachable — so the caller always
# gets a usable, honest number". A wrong factor here is not an error message,
# it is a quietly wrong grocery budget.
#
# It was untested. These pin the resolution rules, the clamp, and the two
# honest-fallback paths.
import asyncio

import pytest

from app.routers import food_prices as FP
from app.routers.food_prices import _AREA, _REGION_LABEL, _STATE_REGION, _series, food_price_factor


def call(**kw):
    return asyncio.run(food_price_factor(**kw))


@pytest.fixture(autouse=True)
def _clear_cache():
    FP._CACHE.clear()
    yield
    FP._CACHE.clear()


# ── Region resolution ───────────────────────────────────────────────────────
def test_the_us_baseline_is_exactly_one_and_costs_no_fetch():
    r = call(region="us")
    assert r["factor"] == 1.0
    assert r["region"] == "us"
    assert r["month"] is None


def test_an_unknown_region_falls_back_to_the_national_baseline():
    # Never guess. An unrecognised region must not silently pick a real one.
    for bad in ["atlantis", "NE-ish", "", "  ", "xx"]:
        assert call(region=bad)["region"] == "us"


def test_a_state_resolves_to_its_region_when_no_region_is_given():
    assert _STATE_REGION["GA"] == "south"
    assert _STATE_REGION["NY"] == "ne"
    assert _STATE_REGION["CA"] == "west"
    assert _STATE_REGION["IL"] == "mw"


def test_state_is_case_and_space_insensitive():
    assert call(region=None, state=" ga ")["region"] == "south"


def test_an_unknown_state_falls_back_to_the_baseline_rather_than_a_guess():
    assert call(region=None, state="ZZ")["region"] == "us"


def test_an_explicit_region_wins_over_a_state():
    assert call(region="west", state="GA")["region"] == "west"


def test_every_region_has_a_label_and_an_area_code():
    # A region resolvable by _STATE_REGION but missing from either map would
    # raise a KeyError mid-request.
    for reg in set(_STATE_REGION.values()):
        assert reg in _AREA
        assert reg in _REGION_LABEL


def test_the_series_id_is_the_bls_format():
    assert _series("0300", "FF1101") == "APU0300FF1101"


# ── The number itself ───────────────────────────────────────────────────────
def _with_prices(monkeypatch, regional, national):
    async def fake(ids):
        out = {}
        for i in ids:
            out[i] = regional if i.startswith("APU" + _AREA["south"]) else national
        return out, "2026-07"
    monkeypatch.setattr(FP, "_fetch_latest", fake)


def test_a_real_regional_premium_comes_through(monkeypatch):
    _with_prices(monkeypatch, 1.10, 1.00)
    r = call(region="south")
    assert r["factor"] == 1.1
    assert r["region_label"] == "South"
    assert r["items_used"] >= 3


def test_the_factor_is_clamped_so_a_bad_fetch_cannot_wreck_a_budget(monkeypatch):
    # The clamp is the difference between a skewed feed and a host being told to
    # budget five times over.
    _with_prices(monkeypatch, 100.0, 1.0)
    assert call(region="south")["factor"] == 1.3
    FP._CACHE.clear()
    _with_prices(monkeypatch, 0.001, 1.0)
    assert call(region="south")["factor"] == 0.8


def test_an_unreachable_bls_returns_an_honest_one_not_an_error(monkeypatch):
    async def boom(ids):
        raise RuntimeError("BLS down")
    monkeypatch.setattr(FP, "_fetch_latest", boom)
    r = call(region="south")
    assert r["factor"] == 1.0
    assert r["month"] is None
    assert "unavailable" in r["note"].lower()


def test_thin_coverage_is_a_fallback_not_a_two_item_average(monkeypatch):
    # Fewer than 3 usable pairs must NOT produce a confident factor.
    used = {"n": 0}

    async def sparse(ids):
        out = {}
        for i in ids:
            used["n"] += 1
            # only one basket item resolves on both sides
            if i.endswith(list(FP._BASKET)[0]):
                out[i] = 1.5 if i.startswith("APU" + _AREA["south"]) else 1.0
        return out, "2026-07"
    monkeypatch.setattr(FP, "_fetch_latest", sparse)
    r = call(region="south")
    assert r["factor"] == 1.0, "a single pair must not become the regional factor"


def test_a_zero_national_price_cannot_divide(monkeypatch):
    _with_prices(monkeypatch, 1.2, 0.0)
    assert call(region="south")["factor"] == 1.0


def test_the_month_is_cached_so_one_host_does_not_refetch_per_render(monkeypatch):
    calls = {"n": 0}

    async def counting(ids):
        calls["n"] += 1
        return {i: (1.1 if i.startswith("APU" + _AREA["south"]) else 1.0) for i in ids}, "2026-07"
    monkeypatch.setattr(FP, "_fetch_latest", counting)
    call(region="south")
    call(region="south")
    assert calls["n"] == 1


# ── THE MONTH BLS STAMPED, NOT THE MONTH WE ASKED IN ────────────────────────
#
# `month` used to be `datetime.date.today()`. BLS Average Price publishes with a
# lag of a few weeks, so a September request routinely returns July's figure —
# and the app told the host "September". The value was read off the data point;
# the point's own date was discarded on the next line. Same defect class as the
# rest of this programme: a fact arrives, one field of it is kept, and the
# consumer states something the source never said.
def test_the_reported_month_is_the_DATA_month_not_today(monkeypatch):
    async def lagging(ids):
        return {i: (1.1 if i.startswith("APU" + _AREA["south"]) else 1.0) for i in ids}, "2026-07"
    monkeypatch.setattr(FP, "_fetch_latest", lagging)
    r = call(region="south")
    assert r["month"] == "2026-07"
    assert r["month"] != __import__("datetime").date.today().strftime("%Y-%m")


def test_no_readable_period_means_NO_month_rather_than_a_wrong_one(monkeypatch):
    # An absent month is honest. Falling back to today would restate the exact
    # defect this fix removes.
    async def undated(ids):
        return {i: (1.1 if i.startswith("APU" + _AREA["south"]) else 1.0) for i in ids}, None
    monkeypatch.setattr(FP, "_fetch_latest", undated)
    assert call(region="south")["month"] is None


def test_the_period_parser_reads_a_real_bls_point_and_refuses_the_annual_average():
    assert FP._data_month({"year": "2026", "period": "M07", "value": "3.21"}) == "2026-07"
    assert FP._data_month({"year": "2026", "period": "M12"}) == "2026-12"
    # M13 is BLS's ANNUAL AVERAGE. It is not a month, and labelling it as one
    # would be the same defect in a new place.
    assert FP._data_month({"year": "2026", "period": "M13"}) is None
    for bad in [{}, {"year": "26", "period": "M07"}, {"year": "2026"},
                {"year": "2026", "period": "Q01"}, {"year": "2026", "period": "M00"}]:
        assert FP._data_month(bad) is None


def test_disagreeing_series_report_the_OLDEST_month(monkeypatch):
    # The factor is a ratio across every series, so it is only as current as its
    # stalest input. Reporting the newest would overstate how fresh it is.
    import httpx

    class FakeResp:
        status_code = 200
        def raise_for_status(self): pass
        def json(self):
            return {"status": "REQUEST_SUCCEEDED", "Results": {"series": [
                {"seriesID": "A", "data": [{"year": "2026", "period": "M08", "value": "1.0"}]},
                {"seriesID": "B", "data": [{"year": "2026", "period": "M06", "value": "2.0"}]},
            ]}}

    class FakeClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): return FakeResp()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    prices, month = asyncio.run(FP._fetch_latest(["A", "B"]))
    assert prices == {"A": 1.0, "B": 2.0}
    assert month == "2026-06"


# ── A FAILURE IS CACHED TOO, ON A SHORT LEASH ───────────────────────────────
#
# Only successes were cached. So during a BLS outage every single request paid
# the full 20-second httpx timeout to be told the same thing — one host opening
# the food sheet three times waited a minute for three identical non-answers.
# The failure is the case where repeating the work is most expensive and least
# useful, which is exactly backwards from what shipped.
def test_an_outage_is_not_re_paid_by_every_request(monkeypatch):
    calls = {"n": 0}

    async def boom(ids):
        calls["n"] += 1
        raise RuntimeError("BLS down")
    monkeypatch.setattr(FP, "_fetch_latest", boom)

    for _ in range(4):
        r = call(region="south")
        assert r["factor"] == 1.0
        assert "unavailable" in r["note"].lower()
    assert calls["n"] == 1, "every request after the first re-paid the 20s timeout"


def test_the_failure_is_on_a_SHORTER_leash_than_a_success(monkeypatch):
    # An outage ends. A stale "unavailable" that lasted as long as a real factor
    # would keep prices dark for hours after BLS came back.
    assert FP._FAIL_TTL < FP._SUCCESS_TTL
    assert FP._FAIL_TTL <= 600

    async def boom(ids):
        raise RuntimeError("down")
    monkeypatch.setattr(FP, "_fetch_latest", boom)
    call(region="south")
    key = ("south", __import__("datetime").date.today().strftime("%Y-%m"))
    expires_at, _ = FP._CACHE[key]
    import time as _t
    assert expires_at - _t.time() <= FP._FAIL_TTL + 1


def test_an_expired_entry_is_refetched_rather_than_served_forever(monkeypatch):
    # Without an expiry check a cached failure would outlive the outage.
    calls = {"n": 0}

    async def flaky(ids):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("down")
        return {i: (1.1 if i.startswith("APU" + _AREA["south"]) else 1.0) for i in ids}, "2026-07"
    monkeypatch.setattr(FP, "_fetch_latest", flaky)

    assert call(region="south")["factor"] == 1.0          # outage, cached
    key = ("south", __import__("datetime").date.today().strftime("%Y-%m"))
    _, stale = FP._CACHE[key]
    FP._CACHE[key] = (0, stale)                            # leash runs out
    assert call(region="south")["factor"] == 1.1           # BLS is back
    assert calls["n"] == 2
