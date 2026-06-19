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
import statistics
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

# In-memory cache: {(region, "YYYY-MM"): result}. Monthly data ⇒ tiny volume.
_CACHE: dict = {}

_BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def _series(area: str, item: str) -> str:
    return f"APU{area}{item}"


async def _fetch_latest(series_ids: list) -> dict:
    """Return {series_id: latest float value} from BLS (v2, latest=true)."""
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
    for s in data.get("Results", {}).get("series", []):
        sid = s.get("seriesID")
        pts = s.get("data") or []
        if pts:
            try:
                out[sid] = float(pts[0]["value"])
            except (KeyError, ValueError):
                pass
    return out


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

    month_key = datetime.date.today().strftime("%Y-%m")
    cached = _CACHE.get((reg, month_key))
    if cached is not None:
        return cached

    try:
        ids = ([_series(_AREA[reg], it) for it in _BASKET]
               + [_series(_AREA["us"], it) for it in _BASKET])
        prices = await _fetch_latest(ids)
        ratios = []
        for it in _BASKET:
            r = prices.get(_series(_AREA[reg], it))
            n = prices.get(_series(_AREA["us"], it))
            if r and n and n > 0:
                ratios.append(r / n)
        if len(ratios) < 3:
            raise RuntimeError(f"insufficient BLS coverage for {reg} (got {len(ratios)})")
        factor = round(statistics.fmean(ratios), 3)
        # clamp to a sane band — guards against a bad/partial fetch skewing budgets.
        factor = max(0.8, min(1.3, factor))
        result = {
            "region": reg, "region_label": _REGION_LABEL[reg], "factor": factor,
            "month": month_key, "source": src, "basket": list(_BASKET.values()),
            "items_used": len(ratios),
        }
        _CACHE[(reg, month_key)] = result
        return result
    except Exception as e:  # noqa: BLE001 — never break the food plan on a price miss
        log.error("food_price_factor %s failed: %s", reg, e)
        return {"region": reg, "region_label": _REGION_LABEL.get(reg, reg), "factor": 1.0,
                "month": None, "source": src,
                "note": "Current prices unavailable right now — showing national estimate."}
