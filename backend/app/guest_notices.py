"""Reply notices — email a guest when the host answers their question
(owner ruling 11/16/2026, "go with recommendations": reply notices first,
announcements next).

  · Only a guest who ticked the opt-in AND gave an email, on a thread that is
    not blocked. Nothing else ever triggers one.
  · From "<host first name> via No Guesswork" at COMMUNICATION_EMAIL_FROM, no
    reply-to: the guest answers on the invite, and the host's own address is
    never exposed.
  · Every email carries a "stop these emails" link and the one-click
    List-Unsubscribe headers (RFC 8058), keyed by the thread's guest_token, a
    credential minted for exactly this in migration 024 and returned to nobody.
    Stopping clears the email and the opt-in on that thread.
  · Fail-soft: a failed send never fails the host's reply. The log names the
    event and the reason, never an address.
"""
import asyncio
import logging

from .config import APP_BASE_URL, API_PUBLIC_BASE_URL
from .db import get_pool
from .email_frame import frame, hue_for, paragraphs_html
from .email_pictures import with_picture
from .emailer import _send_via_resend, failure_reason, is_email_configured

log = logging.getLogger("ngw.guest_notices")


def _one_line(s, n: int = 80) -> str:
    return " ".join(str(s or "").split())[:n]


def invite_url(rsvp_code: str) -> str:
    return f"{APP_BASE_URL.rstrip('/')}/hostv2/?rsvp={rsvp_code}"


def unsubscribe_url(guest_token: str) -> str:
    return f"{API_PUBLIC_BASE_URL.rstrip('/')}/api/public/questions/unsubscribe/{guest_token}"


def _notice(kind, host, name, eyebrow, words, rsvp_code, guest_token, why):
    """(html, text) in the shared frame (email_frame), for a guest who opted in."""
    stop = unsubscribe_url(guest_token)
    return frame(
        kind=kind, hue=hue_for(name), eyebrow=eyebrow, title=name,
        blocks=[(paragraphs_html(str(words or "")[:1000]), str(words or "")[:1000])],
        primary=("Open your invite", invite_url(rsvp_code)),
        fine=f"Reply on your invite. Replies to this email don't reach {host}.",
        footer=f"Sent by {host} with No Guesswork Events. {why}",
        stop_url=stop, stop_label="Stop these emails")


def compose_reply_notice(host_first: str, event_name: str, reply: str, rsvp_code: str, guest_token: str):
    """(from_name, subject, html, headers, text). Pure."""
    host = _one_line(host_first, 40) or "Your host"
    name = _one_line(event_name) or "the event"
    stop = unsubscribe_url(guest_token)
    subject = f"{host} answered your question — {name}"
    body, text = _notice("reply_notice", host, name, f"{host} answered your question", reply, rsvp_code, guest_token,
                         f"You get this because you asked for email when {host} replies.")
    headers = {"List-Unsubscribe": f"<{stop}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
    return f"{host} via No Guesswork", subject, body, headers, text


async def notify_guest_of_reply(thread_id, reply: str) -> None:
    """Background task after a host reply. Never raises."""
    try:
        if not is_email_configured():
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """select t.guest_email, t.email_opt_in, t.guest_token, t.blocked_at, t.rsvp_code,
                          e.data->>'name' as event_name,
                          coalesce(e.data->>'hostName', e.data->>'hostNames') as host_name
                     from public.guest_threads t join public.events e on e.id = t.event_id
                    where t.id = $1""",
                thread_id,
            )
        if not row or not row["email_opt_in"] or not row["guest_email"] or row["blocked_at"] is not None:
            return
        host_first = (str(row["host_name"] or "").split() or [""])[0]
        from_name, subject, body, headers, text = compose_reply_notice(
            host_first, row["event_name"], reply, row["rsvp_code"], row["guest_token"])
        body, text = await with_picture(body, text)
        await _send_via_resend(to=row["guest_email"], subject=subject, html=body,
                               from_name=from_name, headers=headers, text=text)
        log.info("reply notice sent thread=%s", thread_id)
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("reply notice failed thread=%s error=%s", thread_id, failure_reason(e))


# ── Announcements (027): one post, emailed once to every opted-in guest ──────
def compose_announcement(host_first: str, event_name: str, body: str, rsvp_code: str, guest_token: str):
    """(from_name, subject, html, headers, text). Pure."""
    host = _one_line(host_first, 40) or "Your host"
    name = _one_line(event_name) or "the event"
    stop = unsubscribe_url(guest_token)
    subject = f"Update from {host} — {name}"
    html_body, text = _notice("announcement", host, name, f"An update from {host}", body, rsvp_code, guest_token,
                              f"You get this because you asked for email when {host} replies or posts an update.")
    headers = {"List-Unsubscribe": f"<{stop}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
    return f"{host} via No Guesswork", subject, html_body, headers, text


SEND_GAP_SECONDS = 0.6   # Resend's default limit is 2 requests a second


async def notify_guests_of_announcement(announcement_id) -> None:
    """Background task after a post. One email per opted-in address (deduped,
    case-insensitive), never to a blocked thread. Never raises."""
    try:
        if not is_email_configured():
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            a = await conn.fetchrow(
                """select a.event_id, a.body, a.removed_at, e.data->>'name' as event_name,
                          e.data->>'rsvpCode' as rsvp_code,
                          coalesce(e.data->>'hostName', e.data->>'hostNames') as host_name
                     from public.event_announcements a join public.events e on e.id = a.event_id
                    where a.id = $1""", announcement_id)
            if not a or a["removed_at"] is not None or not a["rsvp_code"]:
                return
            rows = await conn.fetch(
                """select distinct on (lower(guest_email)) guest_email, guest_token
                     from public.guest_threads
                    where event_id = $1 and email_opt_in and guest_email is not null and blocked_at is null
                    order by lower(guest_email), created_at""", a["event_id"])
        host_first = (str(a["host_name"] or "").split() or [""])[0]
        sent = failed = 0
        pictures = {}     # one picture for the whole batch: the card is the same for every guest
        for i, r in enumerate(rows):
            if i:
                await asyncio.sleep(SEND_GAP_SECONDS)
            from_name, subject, body, headers, text = compose_announcement(
                host_first, a["event_name"], a["body"], a["rsvp_code"], r["guest_token"])
            body, text = await with_picture(body, text, pictures)
            try:
                await _send_via_resend(to=r["guest_email"], subject=subject, html=body,
                                       from_name=from_name, headers=headers, text=text)
                sent += 1
            except Exception as e:  # noqa: BLE001 — one guest's failure never stops the rest
                failed += 1
                log.error("announcement email failed announcement=%s error=%s", announcement_id, failure_reason(e))
        log.info("announcement emails announcement=%s sent=%s failed=%s", announcement_id, sent, failed)
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("announcement emails failed announcement=%s error=%s", announcement_id, failure_reason(e))
