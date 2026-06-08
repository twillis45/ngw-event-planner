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
import httpx
from fastapi import APIRouter, HTTPException, Query

log = logging.getLogger("ngw.weather")
router = APIRouter(prefix="/api/weather", tags=["weather"])

OPENWEATHER_KEY = os.environ.get("OPENWEATHER_KEY")
GEO_URL     = "https://api.openweathermap.org/geo/1.0/direct"
ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall"


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
            r = await client.get(ONECALL_URL, params={
                "lat": lat, "lon": lon,
                "exclude": "current,minutely,hourly,alerts",
                "units": "imperial", "appid": OPENWEATHER_KEY,
            })
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        log.error("weather.onecall error %s", e.response.status_code)
        raise HTTPException(status_code=502, detail="Weather service error")
    except Exception:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    # Return only the daily forecast array — all the frontend risk logic needs.
    return {"ok": True, "daily": data.get("daily", [])}
