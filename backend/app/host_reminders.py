"""G87 — the week-before reminder to a HOST, and the promotion gate.

Owner ruling 11/19/2026: "Plan reminders go to all with one-click unsubscribe;
promotions only to people who tick an unchecked opt-in at sign-up." Every send
here goes through app/host_email.py, the gate for host-facing email.

THE WEEK-BEFORE REMINDER
  · WHEN: once a day (the `ngw-host-reminders` cron in render.yaml runs
    scripts/send_host_reminders.py) for every event whose saved `date` is
    exactly 7 days after today. "Today" is the US Eastern date: neither the
    event nor the account stores a time zone (see routers/guest_photos.py, "The
    event stores no time zone"), so the host's own local date is not knowable
    on the server.
  · WHICH EVENTS: a real plan only — a date and a head count, the app's own
    `event_qualified` rule (src/lib/analytics.js qualifiedEvents, through
    src/lib/guestCountFor.js). Mirrored in `qualified` below.
  · TO WHOM: the owner of the event's studio, from auth.users (as
    host_alerts.py finds a host). No owner with an address, no email.
  · ONCE: a row in public.host_reminders_sent (migration 032) is written BEFORE
    the email goes to Resend. With 032 absent nothing is sent. If Resend
    refuses the email outright the row is removed (nothing went out); on any
    other failure it stays, because the email may have gone and a second one
    is worse than none.
  · WHAT IT SAYS: the event's name and day, "Open your plan", why they get it,
    and "Stop plan reminders" with one-click List-Unsubscribe headers. No
    progress line: the app's open-steps count is computed in the browser from
    rules the server does not have, so the email does not claim one.
  · CAPPED at MAX_PER_RUN sends a run, fail-soft per host, and the log carries
    counts only — never an address.

PROMOTIONS: only the gate and one placeholder template. Nothing schedules or
sends one; the owner has not written an offer.
"""
import datetime as _dt
import html
import json
import logging
import re
from typing import Optional
from zoneinfo import ZoneInfo

from . import analytics, host_email
from .config import APP_BASE_URL
from .email_frame import frame, hue_for
from .email_pictures import with_picture
from .emailer import ResendRejected, SenderMisconfigured, _send_via_resend, failure_reason, is_email_configured

log = logging.getLogger("ngw.host_reminders")

EASTERN = ZoneInfo("America/New_York")
DAYS_BEFORE = 7
# THE NEXT-DAY CATCH-UP (owner, 11/20/2026). A plan reaches the server only once
# it saves to the account; one that lands after the 7-days-out run (the owner's
# own test plan took ~3 minutes) was never reminded. The next day's run also
# takes plans 6 days out that were not reminded, under the same once-only record
# (KIND), and says what is true: "6 days until …", never "One week".
CATCH_UP_DAYS = DAYS_BEFORE - 1
KIND = "week_before"
MAX_PER_RUN = 50     # Resend's daily quota is shared with invites; a run never takes more than this


# ── the app's rules, mirrored ────────────────────────────────────────────────

def _num(v) -> float:
    """JS Number(v) when finite, else 0 (guestCountFor's `num`)."""
    if isinstance(v, str) and not v.strip():
        return 0
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0
    return n if n == n and n not in (float("inf"), float("-inf")) else 0


def qualified(event_id, data) -> bool:
    """qualifiedEvents (src/lib/analytics.js): an id, a date, and
    guestCountFor's count known and above zero (guestCount || guestEstimate ||
    guests.length)."""
    if not event_id or not isinstance(data, dict):
        return False
    if not str(data.get("date") or "").strip():
        return False
    guests = data.get("guests")
    count = _num(data.get("guestCount")) or _num(data.get("guestEstimate")) or (
        len(guests) if isinstance(guests, list) else 0)
    return count > 0


def event_day(data) -> Optional[_dt.date]:
    d = str((data or {}).get("date") or "")
    if not re.match(r"^\d{4}-\d{2}-\d{2}", d):
        return None
    try:
        return _dt.date.fromisoformat(d[:10])
    except ValueError:
        return None


def today_eastern(now: Optional[_dt.datetime] = None) -> _dt.date:
    now = now or _dt.datetime.now(_dt.timezone.utc)
    return now.astimezone(EASTERN).date()


# ── the email ────────────────────────────────────────────────────────────────

def plan_url() -> str:
    # `?from=reminder` lets the app count plan_opened_from_reminder once, then
    # strip it (src/lib/flowAnalytics.takeReminderTag). Opens the same page.
    return f"{APP_BASE_URL.rstrip('/')}/hostv2/?from=reminder"


def compose_week_before(event_name, day: _dt.date, stop_token: str, days_out: int = DAYS_BEFORE) -> tuple[str, str, str]:
    """(subject, html, text). Pure. States only the saved name and date. In the
    shared frame (email_frame), without the invitation's parts. `days_out` is 7,
    or 6 for the next-day catch-up, and only the true count is ever stated."""
    name = " ".join(str(event_name or "").split())[:120] or "Your event"
    when = f"{day.strftime('%A')}, {day.strftime('%B')} {day.day}"
    stop = host_email.stop_url(stop_token)
    week = days_out == DAYS_BEFORE
    subject = f"One week until {name}" if week else f"{days_out} days until {name}"
    words = "A good moment to look over your plan and settle anything still open."
    body, text = frame(
        kind="week_before", hue=hue_for(name), eyebrow=("One week to go" if week else f"{days_out} days to go"), title=name,
        facts=[("When", html.escape(when).replace(", ", ",<br>", 1), when)],
        fixed=[(html.escape(words), words)],
        primary=("Open your plan", plan_url()),
        footer=(f"Sent by No Guesswork Events. You're getting this because you're planning {name} "
                "with No Guesswork. We send one reminder about a week before each event you plan."),
        stop_url=stop, stop_label="Stop plan reminders")
    return subject, body, text


# ── the daily run ────────────────────────────────────────────────────────────

_DUE = """
select e.id, e.data, h.email, h.owner_id
  from public.events e
  join lateral (
        select u.email, u.id as owner_id from public.studio_members m
          join auth.users u on u.id = m.user_id
         where m.studio_id = e.studio_id and m.role = 'owner' and u.email is not null
         order by m.user_id limit 1) h on true
 where left(e.data->>'date', 10) = any($1::text[])
   and not exists (select 1 from public.host_reminders_sent s where s.event_id = e.id and s.kind = $2)
 order by e.id
"""


async def send_week_before(conn, today: Optional[_dt.date] = None, cap: int = MAX_PER_RUN,
                           send=_send_via_resend) -> dict:
    """One run. Returns counts; never raises for one host's failure."""
    counts = {"due": 0, "sent": 0, "catch_up": 0, "not_a_plan": 0, "stopped": 0, "already": 0, "failed": 0, "over_cap": 0}
    if not await conn.fetchval("select to_regclass('public.host_reminders_sent')"):
        log.error("host reminders: migration 032 (host_reminders_sent) is missing; nothing sent")
        counts["blocked"] = "032_missing"
        return counts
    if not await conn.fetchval("select to_regclass('public.email_stops')"):
        log.error("host reminders: migration 031 (email_stops) is missing, so no stop link; nothing sent")
        counts["blocked"] = "031_missing"
        return counts
    day0 = today or today_eastern()
    target = day0 + _dt.timedelta(days=DAYS_BEFORE)
    catch_up = day0 + _dt.timedelta(days=CATCH_UP_DAYS)
    rows = await conn.fetch(_DUE, [target.isoformat(), catch_up.isoformat()], KIND)
    for row in rows:
        data = row["data"]
        if isinstance(data, str):          # asyncpg returns jsonb as text (no codec is set)
            data = json.loads(data or "{}")
        day = event_day(data)
        if not qualified(row["id"], data) or day not in (target, catch_up):
            counts["not_a_plan"] += 1
            continue
        counts["due"] += 1
        if counts["sent"] + counts["failed"] >= cap:
            counts["over_cap"] += 1
            continue
        claimed = False
        try:
            token = await host_email.host_stop_token(conn, row["email"], "reminders")
            if not token:
                counts["stopped"] += 1
                continue
            claimed = bool(await conn.fetchval(
                """insert into public.host_reminders_sent (event_id, kind) values ($1, $2)
                   on conflict (event_id, kind) do nothing returning event_id""", row["id"], KIND))
            if not claimed:
                counts["already"] += 1
                continue
            days_out = (day - day0).days
            subject, body, text = compose_week_before(data.get("name"), day, token, days_out)
            body, text = await with_picture(body, text)     # one picture per email; never raises
            await send(to=row["email"], subject=subject, html=body, text=text,
                       headers=host_email.headers(token))
            counts["sent"] += 1
            if day == catch_up:
                counts["catch_up"] += 1
            await _count_sent(row, catch_up=(day == catch_up))
        except Exception as e:  # noqa: BLE001 — fail-soft per host
            counts["failed"] += 1
            log.error("host reminder failed error=%s", failure_reason(e))
            if claimed and isinstance(e, (ResendRejected, SenderMisconfigured)):
                # Refused outright: nothing went out, so the record must not stand.
                try:
                    await conn.execute(
                        "delete from public.host_reminders_sent where event_id=$1 and kind=$2", row["id"], KIND)
                except Exception as e2:  # noqa: BLE001
                    log.error("host reminder record not released error=%s", failure_reason(e2))
    log.info("host reminders for %s (catch-up %s): %s", target.isoformat(), catch_up.isoformat(),
             " ".join(f"{k}={v}" for k, v in counts.items()))
    return counts


async def _count_sent(row, catch_up: bool = False) -> None:
    """host_reminder_sent, after the email went (app/analytics.py): the owner's
    hashed label, nothing else. Never raises, never touches the counts; capture
    itself is off outside Render and gives up after a short timeout."""
    try:
        owner = row.get("owner_id") if hasattr(row, "get") else None
        await analytics.capture(analytics.host_reminder_payload(owner, catch_up=catch_up))
    except Exception:  # noqa: BLE001 — analytics never breaks a reminder
        log.warning("host reminder: analytics dropped")


async def run(get_pool) -> dict:
    if not is_email_configured():
        log.error("host reminders: email is not configured (RESEND_API_KEY, COMMUNICATION_EMAIL_FROM); nothing sent")
        return {"blocked": "email_not_configured"}
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await send_week_before(conn)


# ── promotions: the gate and one placeholder, NOT WIRED ──────────────────────

def compose_offer(stop_token: str) -> tuple[str, str, str]:
    """(subject, html, text) for a promotion. A PLACEHOLDER: the owner has not
    written an offer, and nothing calls this to send. It takes the promotions
    stop token, so it can only be built behind host_stop_token(kind='promotions')."""
    if not stop_token:
        raise ValueError("a promotion needs a promotions stop token")
    stop = host_email.stop_url(stop_token)
    addr = host_email.mailing_address()
    subject = "[PLACEHOLDER] No offer written yet"
    words = "PLACEHOLDER — not wired. No offer has been written, and nothing sends this email."
    body = (
        f"<p>{html.escape(words)}</p>"
        "<p style=\"color:#666;font-size:13px\">You're getting this because you asked for offers "
        f"and news when you signed up. {html.escape(addr)} "
        f"<a href=\"{html.escape(stop, quote=True)}\" style=\"color:#666\">Stop offers and news</a></p>"
    )
    text = (f"{words}\n\n--\nYou're getting this because you asked for offers and news when you signed up.\n"
            f"{addr}\nStop offers and news: {stop}\n")
    return subject, body, text


async def prepare_offer(conn, email: str, meta) -> Optional[tuple[str, str, str, dict]]:
    """(subject, html, text, headers) for this host, or None when the gate says
    no: no sign-up opt-in, promotions stopped, no NGW_MAILING_ADDRESS, or 031
    absent. The only way to build a promotion."""
    token = await host_email.host_stop_token(conn, email, "promotions", meta)
    if not token:
        return None
    return (*compose_offer(token), host_email.headers(token))
