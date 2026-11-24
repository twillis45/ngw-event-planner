"""
Weather proxy — Sprint 52B

Keeps the OpenWeather key server-side (OPENWEATHER_KEY in Render env) instead of
baking it into the public browser bundle. Mirrors the two calls the frontend
needs — geocoding a venue and the One Call 3.0 daily forecast — and returns only
the data; the risk classification stays on the frontend (lib/weather.js).

While OPENWEATHER_KEY is unset, routes return 503 so the frontend hides the
weather feature / falls back to a local REACT_APP_OPENWEATHER_KEY in dev.
"""

import logging
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

log = logging.getLogger("ngw.weather")
router = APIRouter(prefix="/api/weather", tags=["weather"])

OPENWEATHER_KEY = os.environ.get("OPENWEATHER_KEY")
GEO_URL      = "https://api.openweathermap.org/geo/1.0/direct"
# A US ZIP has its own geocoder; the direct one reads a city name (11/24/2026:
# the app asks with the event's ZIP whenever it has one, venueFor.venueGeoQuery).
ZIP_URL      = "https://api.openweathermap.org/geo/1.0/zip"
# Free 5-day / 3-hour forecast — works with any standard key (no One Call 3.0
# subscription). We aggregate its 3-hour entries into the daily shape the frontend
# risk logic expects (parity with One Call's `daily`). See _to_daily.
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

# Worst-condition-of-day wins, so the frontend risk classifier (thunderstorm/snow/
# rain) sees the day's real hazard rather than a calm midday reading.
_SEVERITY = {"Tornado": 6, "Thunderstorm": 5, "Snow": 4, "Rain": 3, "Drizzle": 2, "Clouds": 1, "Clear": 0}


def _to_daily(entries):
    """Collapse 2.5 forecast's 3-hour `list` into One-Call-style daily objects:
    { dt, pop, temp:{min,max}, weather:[{main,description,icon}] }."""
    buckets = defaultdict(list)
    for e in entries:
        day = datetime.fromtimestamp(e.get("dt", 0), tz=timezone.utc).strftime("%Y-%m-%d")
        buckets[day].append(e)
    out = []
    for day in sorted(buckets):
        items = buckets[day]
        temps = [it.get("main", {}) for it in items]
        tmins = [t.get("temp_min", t.get("temp", 0)) for t in temps]
        tmaxs = [t.get("temp_max", t.get("temp", 0)) for t in temps]
        pop = max((it.get("pop", 0) or 0) for it in items)
        worst = max(items, key=lambda it: _SEVERITY.get(((it.get("weather") or [{}])[0]).get("main", ""), 0))
        w = (worst.get("weather") or [{}])[0]
        dt = int(datetime.strptime(day, "%Y-%m-%d").replace(hour=12, tzinfo=timezone.utc).timestamp())
        out.append({
            "dt": dt,
            "pop": pop,
            "temp": {"min": round(min(tmins)), "max": round(max(tmaxs))},
            "weather": [{"main": w.get("main", ""), "description": w.get("description", ""), "icon": w.get("icon", "")}],
        })
    return out


def _configured() -> bool:
    return bool(OPENWEATHER_KEY)


@router.get("/status")
async def weather_status():
    return {"configured": _configured()}


# OpenWeather names the state in full ("Louisiana"); the app's city list writes
# "City, ST". Used only to check a candidate is in the state that was asked for.
_STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
    "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
    "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}


@router.get("/geocode")
async def geocode(q: str = Query(..., min_length=1, max_length=120),
                  state: Optional[str] = Query(None, min_length=2, max_length=2)):
    # A STATE, WHEN GIVEN, IS ENFORCED (11/18/2026). With limit=1 OpenWeather
    # answered "Abbeville,LA,US" with Abbeville, ALABAMA — probed live. So a
    # caller that knows the state asks for several candidates and gets only one
    # in that state, or none; a neighbor's coordinates are never returned as
    # the place asked for. Without `state` the route is unchanged.
    want = _STATE_NAMES.get((state or "").upper()) if state else None
    if not _configured():
        raise HTTPException(status_code=503, detail="Weather not configured — set OPENWEATHER_KEY on the server")
    zip_code = q.strip() if re.fullmatch(r"\d{5}", q.strip()) else None
    # "City, ST" GETS ITS COUNTRY (owner, 11/24/2026, probed live): OpenWeather
    # reads a US state code only when the country follows it, so "Springfield,
    # VA" and "Austin, TX" came back empty and a host who gave a city and no ZIP
    # got no forecast. A US state code is normalized to "City,ST,US"; anything
    # else (a city alone, "Paris, FR") is left as typed.
    m = re.fullmatch(r"\s*(.+?)\s*,\s*([A-Za-z]{2})\s*(?:,\s*US)?\s*", q)
    if not zip_code and m and m.group(2).upper() in _STATE_NAMES:
        q = f"{m.group(1)},{m.group(2).upper()},US"
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            if zip_code:
                r = await client.get(ZIP_URL, params={"zip": f"{zip_code},US", "appid": OPENWEATHER_KEY})
                if r.status_code == 404:     # a ZIP it does not know is no result, not an outage
                    return {"ok": True, "result": None}
            else:
                r = await client.get(GEO_URL, params={"q": q, "limit": 5 if state else 1, "appid": OPENWEATHER_KEY})
            r.raise_for_status()
            data = r.json()
            if zip_code:     # one place, not a list; no state to check it against
                data, state = ([data] if isinstance(data, dict) and data.get("lat") is not None else []), None
    except httpx.HTTPStatusError as e:
        log.error("weather.geocode error %s", e.response.status_code)
        raise HTTPException(status_code=502, detail="Weather service error")
    except Exception:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    if state:
        data = [g for g in (data or []) if want and str(g.get("state") or "") == want]
    if not data:
        return {"ok": True, "result": None}
    g = data[0]
    return {"ok": True, "result": {"lat": g.get("lat"), "lon": g.get("lon"), "name": g.get("name"),
                                   **({"state": g.get("state")} if g.get("state") else {})}}


@router.get("/onecall")
async def onecall(lat: float = Query(...), lon: float = Query(...)):
    if not _configured():
        raise HTTPException(status_code=503, detail="Weather not configured — set OPENWEATHER_KEY on the server")
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(FORECAST_URL, params={
                "lat": lat, "lon": lon,
                "units": "imperial", "appid": OPENWEATHER_KEY,
            })
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        log.error("weather.onecall error %s", e.response.status_code)
        raise HTTPException(status_code=502, detail="Weather service error")
    except Exception:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    # Aggregate the free 5-day/3-hour forecast into One-Call-style daily objects.
    return {"ok": True, "daily": _to_daily(data.get("list", []))}
