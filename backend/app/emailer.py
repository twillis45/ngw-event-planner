"""Resend email — backend only.

Two paths:
  1. send_approval_email  — approval_request notifications (Sprint 58)
  2. send_thread_email    — general thread messages via the composer (Sprint 58.2)

Both are fail-soft: a failed email must never block message creation. The message
is always persisted to Postgres first; email delivery is a best-effort sidecar.
"""
import logging
from typing import Optional
import httpx
from .config import RESEND_API_KEY, COMMUNICATION_EMAIL_FROM, RESEND_FROM_NAME

log = logging.getLogger("ngw.email")


def is_email_configured() -> bool:
    """True when the Resend API key AND a from address are both set."""
    return bool(RESEND_API_KEY and COMMUNICATION_EMAIL_FROM)


async def _send_via_resend(
    to: str,
    subject: str,
    html: str,
    reply_to: Optional[str] = None,
    from_name: Optional[str] = None,
) -> dict:
    """Low-level Resend POST. Returns the Resend response JSON on success,
    raises on failure so callers can decide fail-soft vs. raise."""
    from_label = from_name or RESEND_FROM_NAME or "NGW Events"
    from_addr = f"{from_label} <{COMMUNICATION_EMAIL_FROM}>"
    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def send_approval_email(to: str | None, event_name: str, context: str, link: str) -> bool:
    """Sprint 58 approval_request notification. Fail-soft."""
    if not to:
        log.info("approval email skipped: no recipient")
        return False
    if not is_email_configured():
        log.warning("approval email skipped: RESEND_API_KEY not set")
        return False
    try:
        await _send_via_resend(
            to=to,
            subject=f"Approval needed — {event_name}",
            html=(
                f"<p>An approval is requested for <strong>{event_name}</strong>:</p>"
                f"<blockquote>{context}</blockquote>"
                f"<p><a href=\"{link}\">Review &amp; respond</a></p>"
            ),
        )
        return True
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("approval email failed: %s", e)
        return False


async def send_thread_email(
    to: str,
    subject: str,
    body_html: str,
    sender_name: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """Sprint 58.2: send a composer-authored thread message via Resend.

    Returns:
        {"ok": True, "resend_id": "...", "provider": "resend"} on success
        {"ok": False, "error": "...", "provider": "resend"} on failure

    The caller stores the result in the message's metadata.delivery field.
    This function NEVER raises — all exceptions are caught and returned as
    structured error dicts so the create_message route can persist the
    message regardless.
    """
    if not is_email_configured():
        return {"ok": False, "error": "email_not_configured", "provider": "resend"}
    if not to or not to.strip():
        return {"ok": False, "error": "no_recipient", "provider": "resend"}
    try:
        result = await _send_via_resend(
            to=to.strip(),
            subject=subject or "(no subject)",
            html=body_html,
            reply_to=reply_to,
            from_name=sender_name,
        )
        resend_id = result.get("id") if isinstance(result, dict) else None
        log.info("thread email sent to=%s resend_id=%s", to, resend_id)
        return {"ok": True, "resend_id": resend_id, "provider": "resend"}
    except Exception as e:  # noqa: BLE001 — fail-soft
        log.error("thread email failed to=%s error=%s", to, e)
        return {"ok": False, "error": str(e), "provider": "resend"}
