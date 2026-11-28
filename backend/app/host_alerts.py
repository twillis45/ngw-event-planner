"""G8 — tell the host when someone answers (11/16/2026).

Before this, a guest's reply, a guest's question and a vendor's confirm-back
showed only when the host next opened the plan. Now the event's host gets one
short email.

RULES
  · AT MOST ONE EMAIL PER EVENT PER HOUR. Later answers in that hour wait in the
    app; the email says so. The throttle is in this process's memory, like the
    public routes' rate limiters: a restart can cost at most one extra email.
  · THE HOST CAN TURN IT OFF per event (`hostAlerts: false` in the event's own
    data, written by the guests sheet's switch).
  · WHAT THE EMAIL SAYS is who answered and what kind of answer — never the
    answer's body (no notes, diets, phone numbers or question text). The host
    reads those in the app, behind sign-in.
  · WHO GETS IT: the owner of the event's studio, from auth.users. An event
    with no synced row has no host to find, and nothing is sent.
  · FAIL-SOFT. Called as a background task after the guest's request has
    returned; any failure is logged without the address and dropped.
  · DEVICE NOTIFICATIONS (owner decision "B", 11/20/2026) go out from HERE,
    beside the email, under every rule above: the same hour (one claim covers
    both), the same off switch, the same host, the same "who and what kind,
    never the words". web_push only delivers; this function decides. A host
    with no device turned on gets the email alone, and with email unset on the
    server, the push alone.
"""
import logging
import time
from datetime import date as date_cls, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from urllib.parse import quote

from .config import APP_BASE_URL
from .db import get_pool
from .email_frame import frame, hue_for, paragraphs_html
from .email_pictures import with_picture
from .emailer import _send_via_resend, failure_reason, is_email_configured
from . import web_push
from .going_count import going_count, roster_yes

log = logging.getLogger("ngw.host_alerts")

WINDOW_SECONDS = 3600
# On the event day there is no hourly limit (owner, 11/27/2026); replies are
# held to one per quarter hour so a burst of them is one alert, not a dozen.
DAY_WINDOW_SECONDS = 900
FALLBACK_TZ = "America/New_York"   # host_reminders' zone, when her phone's is unknown
_last_sent: dict[str, float] = {}


def _mono() -> float:
    return time.monotonic()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def event_day(date: str | None, end_date: str | None, tz: str | None, now: datetime | None = None) -> bool:
    """True when `now`, in the host's zone, falls on the event's day (or any day
    of a trip, `date` to `endDate`). PURE. Her phone's zone, saved with the
    device; Eastern when unknown or unreadable. A date that is not YYYY-MM-DD is
    no day at all."""
    try:
        zone = ZoneInfo(tz) if tz else ZoneInfo(FALLBACK_TZ)
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo(FALLBACK_TZ)
    today = (now or _now_utc()).astimezone(zone).date()
    try:
        first = date_cls.fromisoformat(str(date or "")[:10])
    except ValueError:
        return False
    try:
        last = date_cls.fromisoformat(str(end_date or "")[:10]) if end_date else first
    except ValueError:
        last = first
    return first <= today <= max(first, last)


async def _host_tz(conn, user_id: str) -> str | None:
    """The zone of the host's most recently used device (migration 035), or None."""
    try:
        return await conn.fetchval(
            "select tz from public.push_subscriptions where user_id = $1::uuid and tz is not null "
            "order by coalesce(last_ok_at, created_at) desc limit 1", user_id)
    except Exception:  # noqa: BLE001 — before 033/035: Eastern
        return None


def _claim(event_id: str, now: float | None = None, window: int = WINDOW_SECONDS) -> bool:
    """True when this event has not had an alert within `window` seconds (and
    records one): an hour off the event day, a quarter hour on it."""
    now = _mono() if now is None else now
    last = _last_sent.get(event_id)
    if last is not None and now - last < window:
        return False
    _last_sent[event_id] = now
    return True


def _one_line(s: str, n: int = 80) -> str:
    return " ".join(str(s or "").split())[:n]


def _what(kind: str, who: str, answer: str | None) -> str:
    """Who answered and what kind of answer, for the email and the push alike.
    An RSVP answer is shown only when it is one of the three fixed choices, so
    no free text can ride in on it."""
    who = _one_line(who) or "Someone"
    if kind == "rsvp":
        return f"{who} replied {answer}" if answer in ("Yes", "No", "Maybe") else f"{who} replied"
    if kind == "question":
        return f"{who} asked you a question"
    if kind == "vendor":
        return f"{who} answered your vendor brief"
    raise ValueError(kind)


def push_payload(kind: str, who: str, event_name: str, answer: str | None = None, event_id: str = "",
                 going: int | None = None) -> dict:
    """The device notification for one alert. Pure. Exactly three fields, all
    fixed wording plus who answered and the event's name; never an answer's
    body. The service worker opens the app itself, so no address rides here.
    A reply also says how many have said yes (owner, 11/27/2026: "include the
    count"): a number, never a name."""
    body = _one_line(event_name) or "Your event"
    if kind == "rsvp" and going is not None:
        body += f" · {int(going)} said yes"
    return {"title": _what(kind, who, answer),
            "body": body,
            # One notification per event on the device: a later one replaces it.
            "tag": "ngw-alert-" + _one_line(event_id, 64)}


def open_url(event_id: str = "") -> str:
    """The app, opened on this event (the app checks it is the host's own).
    PURE. Without an id, the app as before."""
    base = f"{APP_BASE_URL.rstrip('/')}/hostv2/"
    eid = _one_line(event_id, 64)
    return f"{base}?event={quote(eid, safe='')}" if eid else base


def compose(kind: str, who: str, event_name: str, answer: str | None = None, event_id: str = "") -> tuple[str, str, str]:
    """(subject, html, text) for one alert. Pure. Never includes an answer's body.
    In the shared frame (email_frame), without the invitation's parts: to the
    host, about their own plan."""
    name = _one_line(event_name) or "your event"
    what = _what(kind, who, answer)
    subject = f"{what} — {name}"
    words = f"{what} for {name}."
    html, text = frame(
        kind="host_alert", hue=hue_for(name), title=name,
        blocks=[(paragraphs_html(words), words)],
        primary=("Open your plan", open_url(event_id)),
        fine=("We send at most one of these an hour for each event, "
              "so anything else that came in is waiting in the app. "
              "To stop them, open Guests, tap ⋯ More, and turn off "
              "\u201cTell me when someone replies.\u201d"),
        footer="Sent by No Guesswork Events.")
    return subject, html, text


async def alert_host(event_id: str, kind: str, who: str, answer: str | None = None) -> None:
    try:
        email_on, push_on = is_email_configured(), web_push.is_configured()
        if not (email_on or push_on) or not event_id:
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "select studio_id, data->>'name' as name, data->>'hostAlerts' as alerts, "
                "data->'guests' as guests, data->>'date' as date, data->>'endDate' as end_date "
                "from public.events where id = $1", event_id)
            if not row or row["alerts"] == "false" or row["studio_id"] is None:
                return
            host = await conn.fetchrow(
                """select u.id::text as id, u.email from public.studio_members m
                     join auth.users u on u.id = m.user_id
                    where m.studio_id = $1 and m.role = 'owner' and u.email is not null
                    order by m.user_id limit 1""",
                row["studio_id"])
            if kind == "vendor":  # `who` is the vendor id; the name is the host's own
                who = await conn.fetchval(
                    "select v->>'name' from public.events e, jsonb_array_elements(coalesce(e.data->'vendors','[]'::jsonb)) v "
                    "where e.id = $1 and v->>'id' = $2 limit 1", event_id, who) or "A vendor"
            going = (await going_count(conn, event_id, roster_yes(row.get("guests")))
                     if kind == "rsvp" else None)
            tz = await _host_tz(conn, host["id"]) if host else None
        window = DAY_WINDOW_SECONDS if event_day(row.get("date"), row.get("end_date"), tz, _now_utc()) else WINDOW_SECONDS
        if not host or not host["email"] or not _claim(event_id, window=window):
            return
        delivered, failure = False, None
        if email_on:
            try:
                subject, body, text = compose(kind, who, row["name"], answer, event_id)
                body, text = await with_picture(body, text)
                await _send_via_resend(to=host["email"], subject=subject, html=body, text=text)
                delivered = True
                log.info("host alert sent event=%s kind=%s", event_id, kind)
            except Exception as e:  # noqa: BLE001 — the push below still goes
                failure = e
        if push_on:
            counts = await web_push.send_to_user(host["id"], push_payload(kind, who, row["name"], answer, event_id, going=going))
            delivered = delivered or counts.get("sent", 0) > 0
        if not delivered:
            # Nothing reached the host, so nothing used up the hour (11/16/2026:
            # two hours of refused sends would each have blocked the next).
            _last_sent.pop(event_id, None)
        if failure is not None:
            raise failure
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("host alert failed event=%s kind=%s error=%s", event_id, kind, failure_reason(e))
