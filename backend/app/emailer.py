"""Resend email — backend only.

Two paths:
  1. send_approval_email  — approval_request notifications (Sprint 58)
  2. send_thread_email    — general thread messages via the composer (Sprint 58.2)

Both are fail-soft: a failed email must never block message creation. The message
is always persisted to Postgres first; email delivery is a best-effort sidecar.
"""
import html as _html
import logging
import re
from typing import Optional
import httpx
from .config import RESEND_API_KEY, COMMUNICATION_EMAIL_FROM, RESEND_FROM_NAME

log = logging.getLogger("ngw.email")


def is_email_configured() -> bool:
    """True when the Resend API key AND a from address are both set."""
    return bool(RESEND_API_KEY and COMMUNICATION_EMAIL_FROM)


class ResendRejected(Exception):
    """Resend refused the email. str() is the status and Resend's own reason —
    never the recipient, so it is safe to log."""
    def __init__(self, status: int, reason: str):
        self.status = status
        super().__init__(f"{status} {reason}".strip())


def failure_reason(e: Exception) -> str:
    """For a log line: Resend's own reason when it refused, else the error's
    type. Never an address (ResendRejected never carries one)."""
    if isinstance(e, (ResendRejected, SenderMisconfigured)):
        return f"{type(e).__name__} {e}"
    return type(e).__name__


def _resend_reason(resp) -> str:
    try:
        body = resp.json()
    except Exception:  # noqa: BLE001
        return ""
    if not isinstance(body, dict):
        return ""
    return " ".join(str(body.get(k) or "") for k in ("name", "message")).strip()[:300]


class SenderMisconfigured(ValueError):
    """COMMUNICATION_EMAIL_FROM holds no usable address. The message shows the
    setting's exact characters (it is our own sender, not anyone's data)."""


_INVISIBLE = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
_ADDR = re.compile(r"[A-Za-z0-9.!#$%&*+/=?^_{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")


def _plain(s) -> str:
    """Invisible characters out, non-breaking spaces to spaces, whitespace collapsed."""
    return " ".join(str(s or "").translate(_INVISIBLE).replace("\u00a0", " ").split())


def format_from(name: str, address: str) -> str:
    """The From header Resend accepts: `Name <addr>`.

    Built from whatever COMMUNICATION_EMAIL_FROM holds. On 11/16/2026 Resend
    refused the From twice (422 "Invalid `from` field") while the setting looked
    like a bare events@ address, so the address is now EXTRACTED: quotes,
    invisible and non-breaking characters, `mailto:` and angle brackets are
    shed. A setting that is already `Name <addr>` keeps its own name. No address
    at all raises SenderMisconfigured showing the setting's exact characters."""
    raw = _plain(address)
    m = _ADDR.search(raw)
    if not m:
        raise SenderMisconfigured(f"COMMUNICATION_EMAIL_FROM holds no email address: {address!r}")
    given = raw.split("<", 1)[0] if "<" in raw else ""
    label = "".join(ch for ch in _plain(given or name) if ch not in '<>",;\'\u201c\u201d\u2018\u2019')
    return f"{_plain(label) or 'NGW Events'} <{m.group(0)}>"


async def _send_via_resend(
    to: str,
    subject: str,
    html: str,
    reply_to: Optional[str] = None,
    from_name: Optional[str] = None,
    headers: Optional[dict] = None,
    text: Optional[str] = None,
) -> dict:
    """Low-level Resend POST. Returns the Resend response JSON on success,
    raises on failure so callers can decide fail-soft vs. raise."""
    from_addr = format_from(from_name or RESEND_FROM_NAME or "NGW Events", COMMUNICATION_EMAIL_FROM)
    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text      # a plain-text part: the same words, no markup
    if reply_to:
        payload["reply_to"] = reply_to
    if headers:
        payload["headers"] = headers
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json=payload,
        )
        if resp.status_code >= 400:
            reason = _resend_reason(resp)
            if "`from`" in reason:          # our own sender, exact characters: never a guest's data
                reason = f"{reason} sent_from={from_addr!r}"
            raise ResendRejected(resp.status_code, reason)
        return resp.json()


async def send_approval_email(to: str | None, event_name: str, context: str, link: str) -> dict:
    """Sprint 58 approval_request notification. Fail-soft.

    Sprint 58P.4c: return shape now matches send_thread_email() so the Resend
    webhook (POST /api/resend-webhook) can update approval-email delivery the
    same way it updates thread-email delivery. The caller (communication
    router) stores `resend_id` in `metadata.delivery.resend_id` and the
    webhook looks messages up by that id.

    Returns:
        {"ok": True,  "resend_id": "...", "provider": "resend"} on success
        {"ok": False, "error": "no_recipient" | "email_not_configured" | "...", "provider": "resend"} otherwise
    """
    if not to:
        log.info("approval email skipped: no recipient")
        return {"ok": False, "error": "no_recipient", "provider": "resend"}
    if not is_email_configured():
        log.warning("approval email skipped: RESEND_API_KEY not set")
        return {"ok": False, "error": "email_not_configured", "provider": "resend"}
    try:
        result = await _send_via_resend(
            to=to,
            subject=f"Approval needed — {' '.join(str(event_name or '').split())}",
            # Escaped (security self-test, 11/17/2026): the event name and the
            # context are typed by the host; the link carries the event id.
            html=(
                f"<p>An approval is requested for <strong>{_html.escape(str(event_name or ''))}</strong>:</p>"
                f"<blockquote>{_html.escape(str(context or ''))}</blockquote>"
                f"<p><a href=\"{_html.escape(str(link or ''), quote=True)}\">Review &amp; respond</a></p>"
            ),
        )
        resend_id = result.get("id") if isinstance(result, dict) else None
        log.info("approval email sent resend_id=%s", resend_id)
        return {"ok": True, "resend_id": resend_id, "provider": "resend"}
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("approval email failed error=%s", failure_reason(e))
        return {"ok": False, "error": str(e), "provider": "resend"}


async def send_thread_email(
    to: str,
    subject: str,
    body_html: str,
    sender_name: Optional[str] = None,
    reply_to: Optional[str] = None,
    body_text: Optional[str] = None,
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
            text=body_text,
        )
        resend_id = result.get("id") if isinstance(result, dict) else None
        log.info("thread email sent resend_id=%s", resend_id)
        return {"ok": True, "resend_id": resend_id, "provider": "resend"}
    except Exception as e:  # noqa: BLE001 — fail-soft
        log.error("thread email failed error=%s", failure_reason(e))
        return {"ok": False, "error": str(e), "provider": "resend"}
