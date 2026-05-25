"""Resend email — backend only. Used ONLY for approval_request notifications.
Fail-soft: a failed email must never block message creation."""
import logging
import httpx
from .config import RESEND_API_KEY, COMMUNICATION_EMAIL_FROM

log = logging.getLogger("ngw.email")

async def send_approval_email(to: str | None, event_name: str, context: str, link: str) -> bool:
    if not to:
        log.info("approval email skipped: no recipient")
        return False
    if not RESEND_API_KEY:
        log.warning("approval email skipped: RESEND_API_KEY not set")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={
                    "from": COMMUNICATION_EMAIL_FROM,
                    "to": [to],
                    "subject": f"Approval needed — {event_name}",
                    "html": (
                        f"<p>An approval is requested for <strong>{event_name}</strong>:</p>"
                        f"<blockquote>{context}</blockquote>"
                        f"<p><a href=\"{link}\">Review &amp; respond</a></p>"
                    ),
                },
            )
            resp.raise_for_status()
            return True
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("approval email failed: %s", e)
        return False
