"""Food prices — current regional food-price factor (Sprint 60D · Option B).

Pulls a basket of staple foods from the BLS **Average Price (APU)** survey for a
US census region + the US-city average, and returns a CURRENT regional price
**factor** (regional basket ÷ national basket, latest common month). It scales the
food-plan's synthesized national estimates to the event's local area.

HONESTY:
  • Real BLS data, monthly-current, cited. Every series ID below is a REAL BLS
    APU series (verified live, not fabricated).
  • It is **regional** (4 census regions) — NOT per-store local prices. That's the
    honest best available without a paid grocery API; the UI must label it so.
  • No key required: BLS API v2 allows 25 series / 10 queries-per-day unregistered;
    a free BLS_API_KEY raises limits. Results are cached per region+month, so BLS is
    hit at most once per region per month regardless.
"""
import datetime
import logging
import os
import re
import statistics
import time
from typing import Optional

import httpx
from fastapi import APIRouter

log = logging.getLogger("ngw.foodprices")
router = APIRouter(prefix="/api/food-prices", tags=["food-prices"])

BLS_API_KEY = os.environ.get("BLS_API_KEY")  # optional — data.bls.gov/registrationEngine/

# Verified-live BLS APU item codes (the 6 digits after the 4-digit area code).
_BASKET = {
    "708111": "Eggs", "709112": "Milk", "702111": "Bread",
    "703111": "Ground beef", "706111": "Chicken", "711211": "Potatoes", "712311": "Bananas",
}
_AREA = {"ne": "0100", "mw": "0200", "south": "0300", "west": "0400", "us": "0000"}

# ─── PER-ITEM FACTORS (added 2026-08-16) ────────────────────────────────────
# The basket above yields ONE mean factor applied to every priced line. Beer and
# potatoes do not move together, so the mean describes neither — and this
# endpoint already computed the per-item ratios and threw them away with fmean
# one line later. A review board ruled that the precision belongs HERE, where the
# data is fetched live and clamped, rather than in a hardcoded client table that
# silently ages.
#
# DELIBERATELY NOT ADDED TO _BASKET. Folding these into the mean would change the
# factor every existing host already sees — beer and wine are not staples, and
# moving everyone's food estimate is not what was asked for. These are additive:
# the mean is untouched, and a line only uses a specific factor when the client
# has mapped it to one.
#
# Keys are the client's geo item names (src/lib/knowledge/geoItemMap.js decides
# WHICH priced lines may claim each one — that mapping is judgment about dishes
# and stays on the client, where the corpus is).
_PER_ITEM = {
    "720111": "beerMalt",       # malt beverages
    "720311": "wineTable",      # table wine
    "702111": "breadWhite",     # white pan bread
    "706111": "chickenWhole",   # whole fryers
    "706212": "chickenLegs",    # legs — regional coverage is partial; absent regions are simply omitted
}

# US state → census region (BLS publishes APU food at these four regions).
_STATE_REGION = {
    **{s: "ne" for s in ["CT", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"]},
    **{s: "mw" for s in ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"]},
    **{s: "south" for s in ["AL", "AR", "DE", "DC", "FL", "GA", "KY", "LA", "MD", "MS",
                            "NC", "OK", "SC", "TN", "TX", "VA", "WV"]},
    **{s: "west" for s in ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR",
                           "UT", "WA", "WY"]},
}

_REGION_LABEL = {"ne": "Northeast", "mw": "Midwest", "south": "South", "west": "West", "us": "U.S."}

# ── IN-MEMORY CACHE: {(region, "YYYY-MM"): (expires_at, result)} ────────────
#
# IT NOW CACHES FAILURES TOO, and that is the point of the rewrite. Before this
# it stored successes only, so a BLS outage cost EVERY request the full 20s
# httpx timeout — one host loading the food sheet three times waited a minute
# to be told three times that prices are unavailable. The failure is exactly
# the case where repeating the work is most expensive and least useful.
#
# Two TTLs, because the two answers go stale at very different rates. A real
# factor is monthly data and is good for hours; a failure should be retried
# soon, because an outage ends and nobody wants a stale "unavailable" for the
# rest of the month.
_CACHE: dict = {}
_SUCCESS_TTL = 6 * 3600     # BLS publishes monthly; 6h keeps it fresh cheaply
_FAIL_TTL = 300             # an outage must not cost every host 20 seconds

# ── A QUOTA REFUSAL IS NOT AN OUTAGE (2026-09-24) ───────────────────────────
#
# Measured live this day, from a machine with no BLS_API_KEY:
#
#   REQUEST_NOT_PROCESSED: "the daily threshold for total number of requests
#   allocated to the user with registration key  has been reached"
#
# Every failure was cached for 5 minutes, which is right for an outage and
# actively harmful here. Unregistered BLS allows ~10 queries a day. The 6h
# success TTL already permits 4 regions x 4 = 16 fetches a day, over that limit
# on a busy day — and once the quota IS spent, a 5-minute retry means up to 288
# attempts per region per day, ~1,150 in total against a budget of 10. The
# failure cache was too short to let the daily quota ever reset: the outage
# sustained itself.
#
# So a refusal that names the daily threshold backs off until the next UTC day,
# when the quota actually resets. Every other failure keeps the 5-minute retry,
# because a real outage does end and nobody wants a stale "unavailable" for the
# rest of the month.
#
# THE REAL FIX IS A KEY. A free BLS_API_KEY raises the limit to 500 queries a
# day, which makes the 16/day worst case a non-issue. This backoff stops the
# self-sustaining failure while there is no key; it does not buy more quota.
_QUOTA_RE = re.compile(r"daily threshold", re.I)


def _fail_ttl_for(err: Exception, now: float) -> int:
    """Seconds to cache a failure: to the next UTC midnight for a quota refusal."""
    if not _QUOTA_RE.search(str(err)):
        return _FAIL_TTL
    tomorrow = (datetime.datetime.fromtimestamp(now, datetime.timezone.utc)
                + datetime.timedelta(days=1)).replace(
                    hour=0, minute=0, second=0, microsecond=0)
    # +60s of slack so a clock a minute fast does not retry into the same day.
    return max(_FAIL_TTL, int(tomorrow.timestamp() - now) + 60)

_BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def _series(area: str, item: str) -> str:
    return f"APU{area}{item}"


def _data_month(point: dict):
    """The month BLS STAMPED ON THE DATA, as "YYYY-MM", or None.

    Not the month we asked in. BLS Average Price publishes with a lag of a few
    weeks, so a request today routinely returns last month's figure — and this
    endpoint used to report `datetime.date.today()` as the data month, which
    told a host their prices were current when they were one or two months old.
    The value was always read from the point; the point's own date was thrown
    away one line later.

    `M13` is BLS's ANNUAL AVERAGE and is deliberately refused: it is not a
    month, and labelling it as one would be the same defect in a new place.
    """
    y = str(point.get("year") or "").strip()
    m = re.fullmatch(r"M(0[1-9]|1[0-2])", str(point.get("period") or "").strip().upper())
    if not (len(y) == 4 and y.isdigit() and m):
        return None
    return f"{y}-{m.group(1)}"


async def _fetch_latest(series_ids: list):
    """Return ({series_id: latest float value}, data_month) from BLS (v2, latest=true).

    The month comes back with the prices because it belongs to them. When the
    series disagree — they can, BLS does not publish every commodity on the same
    day — the OLDEST is reported: this factor is a ratio across all of them, so
    it is only as current as its stalest input. None when no point carries a
    readable period.
    """
    body = {"seriesid": series_ids, "latest": True}
    if BLS_API_KEY:
        body["registrationkey"] = BLS_API_KEY
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(_BLS_URL, json=body)
    res.raise_for_status()
    data = res.json()
    if data.get("status") != "REQUEST_SUCCEEDED":
        raise RuntimeError(f"BLS status {data.get('status')}: {data.get('message')}")
    out = {}
    months = set()
    for s in data.get("Results", {}).get("series", []):
        sid = s.get("seriesID")
        pts = s.get("data") or []
        if pts:
            try:
                out[sid] = float(pts[0]["value"])
            except (KeyError, ValueError):
                continue
            mk = _data_month(pts[0])
            if mk:
                months.add(mk)
    return out, (min(months) if months else None)


@router.get("")
async def food_price_factor(region: Optional[str] = None, state: Optional[str] = None):
    """Current regional food-price factor vs the US baseline. Pass ?region=ne|mw|south|west
    or ?state=GA. Returns 1.0 (no adjustment) for unknown/US, or when BLS is unreachable —
    so the caller always gets a usable, honest number."""
    reg = (region or "").strip().lower()
    if not reg and state:
        reg = _STATE_REGION.get(state.strip().upper(), "")
    if reg not in _AREA:
        reg = "us"

    src = "BLS Average Price"
    if reg == "us":
        return {"region": "us", "region_label": "U.S.", "factor": 1.0,
                "month": None, "source": src, "note": "National baseline — no regional adjustment."}

    # The cache KEY still uses today's month — that is a refetch cadence, and it
    # is the one thing today's date is legitimately for here. What gets REPORTED
    # as the data month comes from BLS's own stamp, below.
    month_key = datetime.date.today().strftime("%Y-%m")
    hit = _CACHE.get((reg, month_key))
    if hit is not None and hit[0] > time.time():
        return hit[1]

    try:
        codes = list(_BASKET) + [c for c in _PER_ITEM if c not in _BASKET]
        ids = ([_series(_AREA[reg], it) for it in codes]
               + [_series(_AREA["us"], it) for it in codes])
        prices, data_month = await _fetch_latest(ids)

        def _ratio(code):
            r = prices.get(_series(_AREA[reg], code))
            n = prices.get(_series(_AREA["us"], code))
            return (r / n) if (r and n and n > 0) else None

        ratios = [x for x in (_ratio(it) for it in _BASKET) if x is not None]
        if len(ratios) < 3:
            raise RuntimeError(f"insufficient BLS coverage for {reg} (got {len(ratios)})")
        factor = round(statistics.fmean(ratios), 3)
        # clamp to a sane band — guards against a bad/partial fetch skewing budgets.
        factor = max(0.8, min(1.3, factor))

        # Per-item factors carry the SAME clamp as the mean. The clamp exists
        # because a bad or partial fetch must not skew a budget, and that reason
        # does not weaken just because the number is more specific. An item BLS
        # does not publish for this region is omitted entirely — the client falls
        # back to the mean, which is a real answer rather than a guessed one.
        item_factors = {}
        for code, key in _PER_ITEM.items():
            x = _ratio(code)
            if x is not None:
                item_factors[key] = max(0.8, min(1.3, round(x, 3)))

        result = {
            "region": reg, "region_label": _REGION_LABEL[reg], "factor": factor,
            # BLS's own stamp, never today's date. None when no series carried a
            # readable period — an absent month is honest; a wrong one is not.
            "month": data_month, "source": src, "basket": list(_BASKET.values()),
            "items_used": len(ratios),
            "item_factors": item_factors,
        }
        _CACHE[(reg, month_key)] = (time.time() + _SUCCESS_TTL, result)
        return result
    except Exception as e:  # noqa: BLE001 — never break the food plan on a price miss
        log.error("food_price_factor %s failed: %s", reg, e)
        fallback = {"region": reg, "region_label": _REGION_LABEL.get(reg, reg), "factor": 1.0,
                    "month": None, "source": src,
                    "note": "Current prices unavailable right now — showing national estimate."}
        # CACHED, on a short leash. Without this every request during an outage
        # pays the full 20s timeout to learn the same thing. A daily-quota
        # refusal gets a LONG leash instead — see `_fail_ttl_for`: retrying that
        # every 5 minutes cannot succeed and keeps the quota pinned at zero.
        now = time.time()
        _CACHE[(reg, month_key)] = (now + _fail_ttl_for(e, now), fallback)
        return fallback
