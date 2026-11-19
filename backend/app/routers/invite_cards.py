"""The invitation as a picture, for the invite email (owner, 11/19/2026: "That
dark invite sent is gross, doesn't resemble my invitations" then "Build the
invitation picture email").

Mail apps in dark mode recolor an email's HTML (the Gmail app inverts it), but
never a picture. So the host's app draws the invitation card (src/lib/
inviteCard.js: the invite page's paper, fonts and layout) and uploads it here;
the invite email shows it at the top, tapping it opens the invitation.

  POST /api/events/{event_id}/invite-card   host; the card as the raw body.
  GET  /api/public/invite-card/{rsvp_code}  public; the card, by invite code.

  - Upload: require_planner + _assert_event_studio_read (as the host photo
    routes). The body is checked by its magic bytes and RE-ENCODED from its
    pixels (guest_photos.clean_photo), so nothing but pixels is stored.
  - Storage: the private guest-photos bucket (migration 025) under
    invite-cards/, written and read only by this server with the service role.
  - Public read: resolved ONLY by the long invite code (rsvp._resolve_event),
    the same gate as the invite page, which already shows these facts. Never
    by event id. A missing card is a plain 404, and the email falls back to its
    HTML card (app/invite_email.py), so a card is an improvement, never a
    dependency.
  - Version: a short hash of the stored bytes rides the email's image URL
    (?v=), so a changed card is a new URL and no mail cache shows an old one.
"""
import hashlib
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool

from ..auth import require_planner
from ..config import API_PUBLIC_BASE_URL
from ..db import get_pool
from .guest_photos import (BUCKET, PhotoRefused, _storage_base, _storage_configured,
                           _storage_headers, clean_photo)
from .rsvp import _assert_event_studio_read, _resolve_event

router = APIRouter(tags=["invite-cards"])

CARD_MAX_BYTES = 3 * 1024 * 1024
CACHE_SECONDS = 600
_versions: dict = {}          # event_id -> (version or None, checked_at)


def card_path(event_id: str) -> str:
    safe = "".join(ch for ch in str(event_id) if ch.isalnum() or ch in "-_")[:120]
    return f"invite-cards/{safe}.jpg"


def card_version(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:12]


def card_url(rsvp_code: str, version: str) -> str:
    return f"{API_PUBLIC_BASE_URL.rstrip('/')}/api/public/invite-card/{rsvp_code}?v={version}"


async def _put(path: str, data: bytes) -> bool:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{_storage_base()}/object/{BUCKET}/{path}", content=data,
                                  headers={**_storage_headers(), "Content-Type": "image/jpeg", "x-upsert": "true"})
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


async def stored_card_version(event_id: str) -> Optional[str]:
    """The stored card's version, or None. Remembered for CACHE_SECONDS so a
    batch of invites reads storage once, and set at once by an upload."""
    if not _storage_configured():
        return None
    hit = _versions.get(event_id)
    if hit and time.monotonic() - hit[1] < CACHE_SECONDS:
        return hit[0]
    data = await _get(card_path(event_id))
    v = card_version(data) if data else None
    _versions[event_id] = (v, time.monotonic())
    return v


@router.post("/api/events/{event_id}/invite-card")
async def upload_invite_card(
    event_id: str, request: Request,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
    if not _storage_configured():
        raise HTTPException(503, "Pictures can't be stored right now.")
    raw = await request.body()
    if len(raw) > CARD_MAX_BYTES:
        raise HTTPException(413, "That picture is too large.")
    try:
        clean, _w, _h = await run_in_threadpool(clean_photo, raw)
    except PhotoRefused as e:
        raise HTTPException(e.status, e.message)
    if not await _put(card_path(event_id), clean):
        raise HTTPException(502, "The invitation picture couldn't be saved. The invites still go out.")
    v = card_version(clean)
    _versions[event_id] = (v, time.monotonic())
    return {"ok": True, "version": v}


@router.get("/api/public/invite-card/{rsvp_code}")
async def public_invite_card(rsvp_code: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, rsvp_code)
    if not resolved or not _storage_configured():
        raise HTTPException(404, "not found")
    event_id = resolved[0]
    data = await _get(card_path(event_id))
    if not data:
        raise HTTPException(404, "not found")
    return Response(content=data, media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})
