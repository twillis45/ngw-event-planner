"""Every email's card as a picture: drawn, stored, served (owner, 11/20/2026:
"Do picture for all emails"). A mail app in dark mode recolors HTML, never a
picture; the invite email already leads with one (routers/invite_cards.py).

  with_picture(html, text)  for a sender, after it composes and before it sends.
    The html is email_frame's Framed string; its `card` is what the picture
    shows. The card is drawn (email_card.draw_card: a JPEG encoded from fresh
    pixels, nothing else in the file), checked by decoding it, stored under
    email-cards/<32 random hex>.jpg in the private guest-photos bucket with the
    service role, and the email is framed again around it
    (GET /api/public/email-card/{token}, routers/email_cards.py).

  FAIL-SOFT AND SHORT. Storage not configured, a drawing that fails, a store
  that is refused or slow (PICTURE_SECONDS in all): the email goes out as it
  was, the HTML paper card. A picture never blocks a send. The log carries
  counts and the error's type, never an address.

  PUBLIC ONLY BY TOKEN: 128 random bits, minted per picture, never derived from
  an event, a person or an address; the route accepts that exact shape only.
  No picture is ever found by event id.

  RETENTION: purge_old_email_cards removes pictures older than RETENTION_DAYS;
  the nightly ngw-guest-photo-purge job runs it (scripts/purge_guest_photos.py).
"""
import asyncio
import datetime as _dt
import io
import json
import logging
import re
import secrets
from typing import Optional

import httpx
from PIL import Image

from .config import API_PUBLIC_BASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
from .email_card import draw_card

log = logging.getLogger("ngw.email_pictures")

BUCKET = "guest-photos"           # routers/guest_photos.BUCKET (migration 025): private, service role only
PREFIX = "email-cards"
TOKEN = re.compile(r"^[0-9a-f]{32}$")
PICTURE_SECONDS = 4.0             # the most a picture may add to a send
RETENTION_DAYS = 90
_counts = {"stored": 0, "fallback": 0}


# Storage, with the service role key, from this server only. The same calls as
# routers/guest_photos.py; not imported from there, because that router imports
# rsvp, which imports host_alerts, which sends through here.
def _storage_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _storage_headers() -> dict:
    return {"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "apikey": SUPABASE_SERVICE_ROLE_KEY}


def _storage_base() -> str:
    return SUPABASE_URL.rstrip("/") + "/storage/v1"


def card_path(token: str) -> str:
    return f"{PREFIX}/{token}.jpg"


def card_url(token: str) -> str:
    return f"{API_PUBLIC_BASE_URL.rstrip('/')}/api/public/email-card/{token}"


async def _put(path: str, data: bytes) -> bool:
    try:
        async with httpx.AsyncClient(timeout=PICTURE_SECONDS) as client:
            r = await client.post(f"{_storage_base()}/object/{BUCKET}/{path}", content=data,
                                  headers={**_storage_headers(), "Content-Type": "image/jpeg", "x-upsert": "false"})
        return r.is_success
    except httpx.HTTPError:
        return False


async def _get(path: str) -> Optional[bytes]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{_storage_base()}/object/{BUCKET}/{path}", headers=_storage_headers())
        return r.content if r.status_code == 200 and r.content else None
    except httpx.HTTPError:
        return None


def _render(card: dict) -> bytes:
    """The drawn card, checked by decoding it. NOT passed through
    guest_photos.clean_photo: that is for pictures from outside (an upload),
    and its second encode (quality 85, 4:2:0) softened the text (11/20/2026).
    draw_card's JPEG already holds the pixels and nothing else."""
    data = draw_card(card)
    with Image.open(io.BytesIO(data)) as im:
        if im.format != "JPEG" or im.width != 1040:
            raise ValueError("not a card picture")
        im.load()
    return data


async def _store(card: dict) -> Optional[str]:
    jpeg = await asyncio.to_thread(_render, card)
    token = secrets.token_hex(16)
    return card_url(token) if await _put(card_path(token), jpeg) else None


async def with_picture(html, text, memo: Optional[dict] = None):
    """(html, text): the email around a stored picture of its card, or exactly
    as given. Never raises. `memo` (a dict the caller keeps) reuses one picture
    across a batch whose cards are the same (an announcement to every guest)."""
    card = getattr(html, "card", None)
    if not card or not _storage_configured():
        return html, text
    key = json.dumps(card, sort_keys=True)
    url = memo.get(key) if memo is not None else None
    if not url:
        try:
            url = await asyncio.wait_for(_store(card), PICTURE_SECONDS)
        except Exception as e:  # noqa: BLE001 — a picture is never a dependency
            log.warning("email picture skipped error=%s", type(e).__name__)
            url = None
    if not url:
        _counts["fallback"] += 1
        log.info("email pictures stored=%d fallback=%d", _counts["stored"], _counts["fallback"])
        return html, text
    if memo is not None:
        memo[key] = url
    _counts["stored"] += 1
    log.info("email pictures stored=%d fallback=%d", _counts["stored"], _counts["fallback"])
    return html.with_card(url)


# ── Retention ────────────────────────────────────────────────────────────────
async def _list_oldest(limit: int = 100) -> list:
    """The oldest email-card objects, oldest first: [{"name", "created_at"}]."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{_storage_base()}/object/list/{BUCKET}", headers=_storage_headers(),
                              json={"prefix": PREFIX, "limit": limit, "offset": 0,
                                    "sortBy": {"column": "created_at", "order": "asc"}})
    if not r.is_success:
        raise RuntimeError(f"Storage refused the email-card listing ({r.status_code}).")
    return [x for x in (r.json() or []) if isinstance(x, dict) and x.get("name")]


async def _remove(paths: list) -> bool:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.request("DELETE", f"{_storage_base()}/object/{BUCKET}",
                                     json={"prefixes": list(paths)}, headers=_storage_headers())
        return r.is_success
    except httpx.HTTPError:
        return False


def _created(item: dict) -> Optional[_dt.datetime]:
    try:
        return _dt.datetime.fromisoformat(str(item.get("created_at") or "").replace("Z", "+00:00"))
    except ValueError:
        return None


async def purge_old_email_cards(older_than_days: int = RETENTION_DAYS, now: Optional[_dt.datetime] = None) -> int:
    """Remove email-card pictures older than `older_than_days`, oldest first,
    100 at a time, until the oldest left is newer. Raises RuntimeError when
    Storage refuses (the next night retries). Returns how many were removed."""
    cutoff = (now or _dt.datetime.now(_dt.timezone.utc)) - _dt.timedelta(days=older_than_days)
    removed = 0
    while True:
        items = await _list_oldest()
        due = []
        for x in items:
            at = _created(x)
            if at is None or at >= cutoff:
                break
            due.append(f"{PREFIX}/{x['name']}")
        if not due:
            return removed
        if not await _remove(due):
            raise RuntimeError(f"Storage refused the email-card purge after {removed}; the rest wait for the next run.")
        removed += len(due)
        if len(due) < len(items) or len(items) < 100:
            return removed
