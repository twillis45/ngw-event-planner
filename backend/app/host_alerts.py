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
"""
import html
import logging
import time

from .config import APP_BASE_URL
from .db import get_pool
from .emailer import _send_via_resend, failure_reason, is_email_configured

log = logging.getLogger("ngw.host_alerts")

WINDOW_SECONDS = 3600
_last_sent: dict[str, float] = {}


def _claim(event_id: str, now: float | None = None) -> bool:
    """True when this event has not had an alert in the last hour (and records one)."""
    now = time.monotonic() if now is None else now
    last = _last_sent.get(event_id)
    if last is not None and now - last < WINDOW_SECONDS:
        return False
    _last_sent[event_id] = now
    return True


def _one_line(s: str, n: int = 80) -> str:
    return " ".join(str(s or "").split())[:n]


def compose(kind: str, who: str, event_name: str, answer: str | None = None) -> tuple[str, str]:
    """(subject, html) for one alert. Pure. Never includes an answer's body."""
    who = _one_line(who) or "Someone"
    name = _one_line(event_name) or "your event"
    if kind == "rsvp":
        what = f"{who} replied {answer}" if answer in ("Yes", "No", "Maybe") else f"{who} replied"
    elif kind == "question":
        what = f"{who} asked you a question"
    elif kind == "vendor":
        what = f"{who} answered your vendor brief"
    else:
        raise ValueError(kind)
    subject = f"{what} — {name}"
    body = (
        f"<p>{html.escape(what)} for <strong>{html.escape(name)}</strong>.</p>"
        f"<p><a href=\"{html.escape(APP_BASE_URL)}\">Open your plan</a> to see it.</p>"
        "<p style=\"color:#666\">We send at most one of these an hour for each event, "
        "so anything else that came in is waiting in the app. "
        "To stop them, open the event's guest list and tap Turn off.</p>"
    )
    return subject, body


async def alert_host(event_id: str, kind: str, who: str, answer: str | None = None) -> None:
    try:
        if not is_email_configured() or not event_id:
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "select studio_id, data->>'name' as name, data->>'hostAlerts' as alerts "
                "from public.events where id = $1", event_id)
            if not row or row["alerts"] == "false" or row["studio_id"] is None:
                return
            to = await conn.fetchval(
                """select u.email from public.studio_members m
                     join auth.users u on u.id = m.user_id
                    where m.studio_id = $1 and m.role = 'owner' and u.email is not null
                    order by m.user_id limit 1""",
                row["studio_id"])
            if kind == "vendor":  # `who` is the vendor id; the name is the host's own
                who = await conn.fetchval(
                    "select v->>'name' from public.events e, jsonb_array_elements(coalesce(e.data->'vendors','[]'::jsonb)) v "
                    "where e.id = $1 and v->>'id' = $2 limit 1", event_id, who) or "A vendor"
        if not to or not _claim(event_id):
            return
        subject, body = compose(kind, who, row["name"], answer)
        await _send_via_resend(to=to, subject=subject, html=body)
        log.info("host alert sent event=%s kind=%s", event_id, kind)
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("host alert failed event=%s kind=%s error=%s", event_id, kind, failure_reason(e))
