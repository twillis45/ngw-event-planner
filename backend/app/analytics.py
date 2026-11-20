"""Server-side product analytics: the one fact only the server knows for sure.

A pass purchase (owner, 11/19/2026: "Build the PostHog fixes"). The browser's
`pass_purchase_confirmed` fires only if the buyer comes back to the app, and it
never knew the amount (the server charges it). So the purchase, with the amount
Stripe actually took, is recorded HERE, where the pass is granted.

Same rules as the app's own analytics (src/lib/analytics.js):
  · the person is a ONE-WAY HASH of their account id (`host_` + 16 hex), the
    same label the app identifies a signed-in host by, so the purchase joins
    the person who planned. Never an email, a name or a raw id;
  · the event is a hash too (`event_id_hash`, as failureTelemetry does);
  · on only where Render runs this service (RENDER is set there), so tests and
    local runs send nothing; POSTHOG_KEY overrides the public ingestion key;
  · fail-soft: a short timeout, any failure logged without details and dropped.
    Analytics never holds up or breaks a grant.
"""
import hashlib
import logging
import os

import httpx

log = logging.getLogger("ngw.analytics")

# A PostHog project key (phc_…) is a PUBLIC, write-only ingestion key; the app
# ships the same one in its bundle.
POSTHOG_KEY = os.environ.get("POSTHOG_KEY", "phc_kViRwC7yZp9aAqfvqyKw7HJCBxuGqfCnzMAb7yZzgd9p")
POSTHOG_HOST = os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com").rstrip("/")


def analytics_enabled() -> bool:
    return bool(POSTHOG_KEY) and bool(os.environ.get("RENDER"))


def _hash16(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def account_label(user_id) -> str | None:
    uid = str(user_id or "").strip()
    return ("host_" + _hash16(uid)) if uid else None


def pass_purchase_payload(meta: dict, amount, currency) -> dict | None:
    """The capture body for a granted pass, or None without a buyer. PURE."""
    meta = meta or {}
    who = account_label(meta.get("purchased_by"))
    if not who:
        return None
    event_id = str(meta.get("event_id") or "").strip()
    props = {
        "amount_cents": int(amount) if isinstance(amount, (int, float)) else None,
        "currency": str(currency or "usd").lower(),
        "sku": str(meta.get("sku") or "one-event-pass"),
        "source": "server",
    }
    if event_id:
        props["event_id_hash"] = _hash16(event_id)
    if meta.get("came_from"):
        props["came_from"] = str(meta["came_from"])
    if meta.get("came_from_kind"):
        props["came_from_kind"] = str(meta["came_from_kind"])
    # The price test arm (G86). Only the two values the route writes travel.
    if meta.get("price_variant") in ("control", "test"):
        props["price_variant"] = meta["price_variant"]
    return {"api_key": POSTHOG_KEY, "event": "pass_purchased", "distinct_id": who, "properties": props}


# ── The server-only events (owner, 11/20/2026: "Yes, build the six events") ──
# Same rules as pass_purchased: the person is the studio owner's hashed account
# label, the properties are counts, booleans and fixed enums, and no payload is
# built without a person to join it to. Never an address, a name or a subject.


def host_reminder_payload(owner_user_id, catch_up: bool = False) -> dict | None:
    """One week-before reminder email that went out (host_reminders). PURE."""
    who = account_label(owner_user_id)
    if not who:
        return None
    return {"api_key": POSTHOG_KEY, "event": "host_reminder_sent", "distinct_id": who,
            "properties": {"catch_up": bool(catch_up), "source": "server"}}


# The Resend webhook's statuses that are a delivery outcome. "accepted" and
# "opened" are not: the first is the send itself, the second a mail app's read.
DELIVERY_STATUS = {
    "email-delivered": "delivered",
    "email-bounced": "bounced",
    "email-complained": "complained",
    "email-deferred": "delayed",
}


def email_kind(delivery: dict | None) -> str:
    """What the event_messages row says it was. PURE. The week-before reminder,
    announcements and reply notices write no such row today, so they cannot
    appear here until they do."""
    d = delivery or {}
    kind = str(d.get("kind") or "")
    intent = str(d.get("intent") or "")
    if kind in ("invite", "helper", "announcement", "reply_notice", "reminder"):
        return kind
    if intent == "cohost_invite":
        return "cohost"
    if intent == "approval_email":
        return "approval"
    if intent == "email":
        return "message"
    return "other"


def email_delivery_payload(owner_user_id, new_status: str, delivery: dict | None) -> dict | None:
    """One delivery-status change on an app-sent email (main.resend_webhook).
    None for a status that is not an outcome, or with no studio owner. PURE."""
    status = DELIVERY_STATUS.get(str(new_status or ""))
    who = account_label(owner_user_id)
    if not status or not who:
        return None
    return {"api_key": POSTHOG_KEY, "event": "email_delivery", "distinct_id": who,
            "properties": {"status": status, "kind": email_kind(delivery), "source": "server"}}


def pass_reversal_payload(event: str, purchased_by, amount, currency, full: bool) -> dict | None:
    """pass_refunded / pass_disputed, shaped like pass_purchased (stripe_payments). PURE."""
    if event not in ("pass_refunded", "pass_disputed"):
        return None
    who = account_label(purchased_by)
    if not who:
        return None
    return {"api_key": POSTHOG_KEY, "event": event, "distinct_id": who,
            "properties": {
                "amount_cents": int(amount) if isinstance(amount, (int, float)) and not isinstance(amount, bool) else None,
                "currency": str(currency or "usd").lower(),
                "full_or_partial": "full" if full else "partial",
                "source": "server",
            }}


async def capture(payload: dict | None) -> None:
    if not payload or not analytics_enabled():
        return
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(f"{POSTHOG_HOST}/capture/", json=payload)
    except Exception:  # noqa: BLE001 — analytics never breaks a grant
        log.warning("analytics: capture failed (dropped)")
