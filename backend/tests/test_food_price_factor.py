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
        return out
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
        return out
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
        return {i: (1.1 if i.startswith("APU" + _AREA["south"]) else 1.0) for i in ids}
    monkeypatch.setattr(FP, "_fetch_latest", counting)
    call(region="south")
    call(region="south")
    assert calls["n"] == 1
