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
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Query

log = logging.getLogger("ngw.weather")
router = APIRouter(prefix="/api/weather", tags=["weather"])

OPENWEATHER_KEY = os.environ.get("OPENWEATHER_KEY")
GEO_URL      = "https://api.openweathermap.org/geo/1.0/direct"
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


@router.get("/geocode")
async def geocode(q: str = Query(..., min_length=1, max_length=120)):
    if not _configured():
        raise HTTPException(status_code=503, detail="Weather not configured — set OPENWEATHER_KEY on the server")
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(GEO_URL, params={"q": q, "limit": 1, "appid": OPENWEATHER_KEY})
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        log.error("weather.geocode error %s", e.response.status_code)
        raise HTTPException(status_code=502, detail="Weather service error")
    except Exception:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    if not data:
        return {"ok": True, "result": None}
    g = data[0]
    return {"ok": True, "result": {"lat": g.get("lat"), "lon": g.get("lon"), "name": g.get("name")}}


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
