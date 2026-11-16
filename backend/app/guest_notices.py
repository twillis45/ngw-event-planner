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
import html
import logging

from .config import APP_BASE_URL, API_PUBLIC_BASE_URL
from .db import get_pool
from .emailer import _send_via_resend, is_email_configured

log = logging.getLogger("ngw.guest_notices")


def _one_line(s, n: int = 80) -> str:
    return " ".join(str(s or "").split())[:n]


def invite_url(rsvp_code: str) -> str:
    return f"{APP_BASE_URL.rstrip('/')}/hostv2/?rsvp={rsvp_code}"


def unsubscribe_url(guest_token: str) -> str:
    return f"{API_PUBLIC_BASE_URL.rstrip('/')}/api/public/questions/unsubscribe/{guest_token}"


def compose_reply_notice(host_first: str, event_name: str, reply: str, rsvp_code: str, guest_token: str):
    """(from_name, subject, html, headers). Pure."""
    host = _one_line(host_first, 40) or "Your host"
    name = _one_line(event_name) or "the event"
    stop = unsubscribe_url(guest_token)
    subject = f"{host} answered your question — {name}"
    body = (
        f"<p><strong>{html.escape(host)}</strong> answered your question about "
        f"<strong>{html.escape(name)}</strong>:</p>"
        f"<blockquote style=\"margin:0 0 16px;padding:8px 12px;border-left:3px solid #ccc\">"
        f"{html.escape(str(reply or ''))[:1000].replace(chr(10), '<br>')}</blockquote>"
        f"<p><a href=\"{html.escape(invite_url(rsvp_code))}\">Open your invite</a> to reply — "
        f"replies to this email don't reach {html.escape(host)}.</p>"
        f"<p style=\"color:#666\">You get this because you asked for email when {html.escape(host)} replies. "
        f"<a href=\"{html.escape(stop)}\">Stop these emails</a>.</p>"
    )
    headers = {"List-Unsubscribe": f"<{stop}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
    return f"{host} via No Guesswork", subject, body, headers


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
        from_name, subject, body, headers = compose_reply_notice(
            host_first, row["event_name"], reply, row["rsvp_code"], row["guest_token"])
        await _send_via_resend(to=row["guest_email"], subject=subject, html=body,
                               from_name=from_name, headers=headers)
        log.info("reply notice sent thread=%s", thread_id)
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("reply notice failed thread=%s error=%s %s", thread_id, type(e).__name__,
                  str(e)[:300] if type(e).__name__ == "ResendRejected" else "")
