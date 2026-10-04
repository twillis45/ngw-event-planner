"""Board ruling, 2026-10-04 (docs/audits/2026-10-04_BLS_COVERAGE_BOARD.md).

Three of four regions compute their factor from four of seven items, and the
retired ones are eggs, milk and ground beef -- the volatile, high-spend
staples. The number renders identically whether it came from seven items or
four, so a host cannot tell a measured regional spread from an arithmetic
accident.

The board did not set the floor (that trades reach for honesty and is the
owner's call, open item B1). It ruled on the MECHANISM around it.
"""
from app.routers import food_prices as fp


def _client():
    from fastapi.testclient import TestClient
    from app.main import app
    fp._CACHE.clear()
    return TestClient(app)


def _resolving(n, region="west"):
    """A fetch where exactly n basket items resolve on both sides.

    The region is a parameter because it was not, and a test asking about the
    South got a fetch that only ever priced the West -- so it fell back for
    the right-looking wrong reason.
    """
    reg, us = fp._AREA[region], fp._AREA["us"]
    keep = list(fp._BASKET)[:n]

    async def fake(ids):
        prices, months = {}, {}
        for code in keep:
            for area in (reg, us):
                sid = fp._series(area, code)
                prices[sid] = 2.2 if area == reg else 2.0
                months[sid] = "2026-08"
        return prices, months
    return fake


def test_a_measured_region_says_it_is_regional(monkeypatch):
    monkeypatch.setattr(fp, "_fetch_latest", _resolving(len(fp._BASKET)))
    r = _client().get("/api/food-prices?region=west").json()
    assert r["basis"] == "regional"
    assert r["items_used"] == len(fp._BASKET)
    assert "fallback_reason" not in r


def test_too_thin_is_labelled_NATIONAL_not_dressed_as_regional(monkeypatch):
    monkeypatch.setattr(fp, "_fetch_latest", _resolving(fp._MIN_ITEMS - 1))
    r = _client().get("/api/food-prices?region=west").json()
    assert r["basis"] == "national-fallback"
    assert r["factor"] == 1.0
    # The number alone cannot carry this: 1.0 is a plausible regional factor.
    assert r["fallback_reason"] == "coverage"
    assert "Not enough local price data" in r["note"]


def test_thin_coverage_and_an_outage_are_not_the_same_sentence(monkeypatch):
    """They want opposite things from a host: wait, versus this is how it is."""
    async def boom(ids):
        raise RuntimeError("BLS unreachable")
    monkeypatch.setattr(fp, "_fetch_latest", boom)
    r = _client().get("/api/food-prices?region=west").json()
    assert r["basis"] == "national-fallback"
    assert r["fallback_reason"] == "unavailable"
    assert "unavailable right now" in r["note"]


def test_every_answer_carries_the_basket_version(monkeypatch):
    monkeypatch.setattr(fp, "_fetch_latest", _resolving(len(fp._BASKET)))
    assert _client().get("/api/food-prices?region=west").json()["basket_version"] == fp.BASKET_VERSION

    async def boom(ids):
        raise RuntimeError("down")
    monkeypatch.setattr(fp, "_fetch_latest", boom)
    assert _client().get("/api/food-prices?region=west").json()["basket_version"] == fp.BASKET_VERSION


# ── THE RATCHET (A3) ───────────────────────────────────────────────────────
# Same shape as PARSER_FIELDS and MAX_HOSTV2_TEXT_GATES, both of which have
# already caught a silent drift in this repo. A factor from one basket is not
# comparable with a factor from another, so the basket cannot change quietly.
def test_the_basket_cannot_change_without_bumping_the_version():
    expected = {
        1: {"708111", "709112", "702111", "703111", "706111", "711211", "712311"},
    }
    assert fp.BASKET_VERSION in expected, (
        f"BASKET_VERSION is {fp.BASKET_VERSION} and this test does not know it. "
        "If you changed the basket, add its item set here; if you bumped the "
        "version without changing the basket, do not."
    )
    assert set(fp._BASKET) == expected[fp.BASKET_VERSION], (
        "the basket changed but BASKET_VERSION did not. Changing which items "
        "make the factor changes what the factor MEASURES, and a host whose "
        "estimate moves should be seeing prices move, not our bookkeeping."
    )


# ── OWNER RULING, 2026-10-04: DO NOT CARRY REGIONAL ────────────────────────
# The board sent the floor to the owner as B1 because raising it trades reach
# for honesty. Ruled: if we cannot measure the basket we do not claim a
# regional spread. The floor is the WHOLE basket -- a count alone cannot
# express the board's actual finding, which was about WHICH items retired
# (eggs, milk, ground beef: the volatile, high-spend ones), and expressing
# that needs a weighting scheme the board recommended not building yet.
def test_the_floor_is_the_whole_basket_and_tracks_it():
    assert fp._MIN_ITEMS == len(fp._BASKET), (
        "the floor is derived from the basket so the two cannot drift apart"
    )


def test_four_of_seven_no_longer_claims_a_region(monkeypatch):
    """The exact live shape on 2026-10-04 for Northeast, Midwest and West."""
    monkeypatch.setattr(fp, "_fetch_latest", _resolving(4))
    r = _client().get("/api/food-prices?region=west").json()
    assert r["basis"] == "national-fallback"
    assert r["fallback_reason"] == "coverage"
    assert r["factor"] == 1.0
    assert "Not enough local price data" in r["note"]


def test_a_complete_basket_still_carries_its_region(monkeypatch):
    """South, today. The ruling removes unmeasurable claims, not the feature."""
    monkeypatch.setattr(fp, "_fetch_latest", _resolving(len(fp._BASKET), "south"))
    r = _client().get("/api/food-prices?region=south").json()
    assert r["basis"] == "regional"
    assert r["items_used"] == len(fp._BASKET)


def test_one_missing_item_is_enough_to_stop_claiming(monkeypatch):
    """Deliberately strict, and the cost is stated at the constant."""
    monkeypatch.setattr(fp, "_fetch_latest", _resolving(len(fp._BASKET) - 1, "south"))
    assert _client().get("/api/food-prices?region=south").json()["basis"] == "national-fallback"
