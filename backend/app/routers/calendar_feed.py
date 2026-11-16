"""The calendar subscription feed (owner, 11/16/2026: "need subscription
calendar").

The host subscribes their calendar app (Apple, Google, Outlook) to one private
link; the app re-reads it on its own schedule, so the plan's dates stay current
without the host doing anything.

NO DATE RULES LIVE HERE. The host's app computes the dated items with the same
code as its Calendar view (lib/planCalendar) and saves them in the plan as
`calendarFeed` while the feed is on. This route only formats that list as
iCalendar (RFC 5545), so the feed can never disagree with the app. Like the
family link, it shows the plan as last saved.

The long random `calendarCode` in the link is the only credential (exact
match, 24+ characters, the invite's rate limits); turning the feed off clears
it and the link stops working. It carries step names, vendor names and dates
only, never guests, money or notes.
"""
import json
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from ..db import get_pool
from .rsvp import _enforce, MAX_CODE

router = APIRouter(tags=["calendar"])

MIN_CALENDAR_CODE = 24
MAX_ITEMS = 400


def _esc(s) -> str:
    return (str(s or "").replace("\\", "\\\\").replace(";", "\;").replace(",", "\\,")
            .replace("\r\n", "\\n").replace("\n", "\\n"))


def _fold(line: str) -> str:
    out, rest = [], line
    while len(rest.encode("utf-8")) > 74:
        cut = 74
        while len(rest[:cut].encode("utf-8")) > 74:
            cut -= 1
        out.append(rest[:cut])
        rest = " " + rest[cut:]
    out.append(rest)
    return "\r\n".join(out)


def feed_ics(data: dict, now: datetime | None = None) -> str:
    """The saved feed as an iCalendar document. PURE."""
    name = str(data.get("name") or "The event").strip()[:120]
    stamp = (now or datetime.now(timezone.utc)).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//No Guesswork//Plan Feed//EN", "CALSCALE:GREGORIAN",
             "METHOD:PUBLISH",
             # X-WR-CALNAME is non-standard and apps disagree on unescaping it,
             # so the name drops , and ; instead of escaping them.
             "X-WR-CALNAME:" + " ".join(name.replace(",", " ").replace(";", " ").replace("\\", " ").split()) + " — plan",
             "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"]
    items = data.get("calendarFeed") if isinstance(data.get("calendarFeed"), list) else []
    for it in items[:MAX_ITEMS]:
        if not isinstance(it, dict):
            continue
        try:
            d = date.fromisoformat(str(it.get("date"))[:10])
        except ValueError:
            continue
        label = str(it.get("label") or "").strip()[:300]
        if not label:
            continue
        kind = it.get("kind")
        summary = label if kind == "event" else ("Vendor: " if kind == "vendor" else "To do: ") + label
        lines += ["BEGIN:VEVENT",
                  "UID:" + _esc(f"{data.get('id') or 'event'}-{str(it.get('id') or label)[:120]}@ngw-plan"),
                  "DTSTAMP:" + stamp,
                  "DTSTART;VALUE=DATE:" + d.strftime("%Y%m%d"),
                  "DTEND;VALUE=DATE:" + (d + timedelta(days=1)).strftime("%Y%m%d"),
                  "SUMMARY:" + _esc(summary),
                  "DESCRIPTION:" + _esc(f"From your plan for {name}."),
                  "TRANSP:TRANSPARENT",
                  "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"


@router.get("/api/public/calendar/{code}.ics")
async def public_calendar_feed(code: str, request: Request):
    """The plan's dates for a calendar app. Opaque 404 for anything else."""
    code = (code or "")[:MAX_CODE]
    _enforce(request, code, per_code=False)
    if len(code) < MIN_CALENDAR_CODE:
        raise HTTPException(404, "not found")
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "select id, data from public.events where data->>'calendarCode' = $1 limit 1", code)
    if not row:
        raise HTTPException(404, "not found")
    data = row["data"] or {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except ValueError:
            data = {}
    data = {**data, "id": row["id"]}
    return Response(feed_ics(data), media_type="text/calendar; charset=utf-8",
                    headers={"Cache-Control": "private, max-age=900"})
