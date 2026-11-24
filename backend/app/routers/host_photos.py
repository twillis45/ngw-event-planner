"""The host's photo on her invite (owner, 11/24/2026: renders r3-2, r3-3, r3-4).

One photo per account, opt-in. Guests see it beside her name on the invite;
with none they see her initials.

  POST   /api/host-photo                    host; the photo as the raw body.
  GET    /api/host-photo                    host; her own photo, for her screens.
  DELETE /api/host-photo                    host; the file is deleted.
  GET    /api/public/host-photo/{rsvp_code} public; the photo, by invite code.

  - The account: the signed-in user's studio (her own first, the same order
    lib/api/studio.js currentStudioId uses). The file is
    host-photos/{studio_id}.jpg in the private guest-photos bucket (migration
    025), written and read only by this server with the service role.
  - The pipeline is the guest photos' (guest_photos.clean_photo): magic bytes
    checked, the pixels re-encoded so no metadata (location included) is
    kept, then cropped to a centered square of at most 400x400.
  - The profile (lib/api/profile.js) keeps only the returned version; the
    public invite carries it as `hostPhoto` (rsvp._resolve_event), so the
    page knows there is a photo and a changed one is a new URL.
  - Public read: resolved ONLY by the long invite code (rsvp._resolve_event),
    as invite_cards.py does. Never by event id or studio id.
"""
import hashlib
import io
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from ..auth import require_planner
from ..db import get_pool
from .guest_photos import (BUCKET, PhotoRefused, _storage_base, _storage_configured,
                           _storage_headers, _storage_remove, clean_photo)
from .rsvp import _resolve_event

router = APIRouter(tags=["host-photo"])

PHOTO_MAX_BYTES = 8 * 1024 * 1024
EDGE = 400
JPEG_QUALITY = 86


def photo_path(studio_id: str) -> str:
    safe = "".join(ch for ch in str(studio_id) if ch.isalnum() or ch in "-_")[:80]
    return f"host-photos/{safe}.jpg"


def photo_version(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:12]


def square(clean_jpeg: bytes) -> bytes:
    """A centered square of an already-cleaned photo, at most EDGE on a side."""
    img = Image.open(io.BytesIO(clean_jpeg)).convert("RGB")
    side = min(img.size)
    left, top = (img.width - side) // 2, (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side))
    if side > EDGE:
        img = img.resize((EDGE, EDGE), Image.LANCZOS)
    flat = Image.frombytes("RGB", img.size, img.tobytes())
    out = io.BytesIO()
    flat.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue()


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


async def _my_studio(principal: dict) -> str:
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                "select studio_id from public.studio_members where user_id=$1::uuid "
                "order by (role = 'owner') desc, created_at asc limit 1",
                principal.get("id"))
        except Exception:
            row = None
    if not row or not row["studio_id"]:
        raise HTTPException(403, "Your photo is kept with your account. Sign in to add one.")
    return str(row["studio_id"])


def _jpeg(data: bytes, cache: str) -> Response:
    return Response(content=data, media_type="image/jpeg",
                    headers={"Cache-Control": cache, "X-Content-Type-Options": "nosniff"})


@router.post("/api/host-photo")
async def upload_host_photo(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    studio = await _my_studio(principal)
    if not _storage_configured():
        raise HTTPException(503, "Photos can't be stored right now.")
    raw = await request.body()
    if len(raw) > PHOTO_MAX_BYTES:
        raise HTTPException(413, "That photo is too large.")
    try:
        clean, _w, _h = await run_in_threadpool(clean_photo, raw)
        data = await run_in_threadpool(square, clean)
    except PhotoRefused as e:
        raise HTTPException(e.status, e.message)
    if not await _put(photo_path(studio), data):
        raise HTTPException(502, "Your photo couldn't be saved. Try again.")
    return {"ok": True, "version": photo_version(data)}


@router.get("/api/host-photo")
async def my_host_photo(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    studio = await _my_studio(principal)
    data = await _get(photo_path(studio)) if _storage_configured() else None
    if not data:
        raise HTTPException(404, "not found")
    return _jpeg(data, "private, no-store")


@router.delete("/api/host-photo")
async def remove_host_photo(
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    studio = await _my_studio(principal)
    if not _storage_configured():
        raise HTTPException(503, "Photos can't be changed right now.")
    if not await _storage_remove([photo_path(studio)]):
        raise HTTPException(502, "Your photo couldn't be removed. Try again.")
    return {"ok": True}


@router.get("/api/public/host-photo/{rsvp_code}")
async def public_host_photo(rsvp_code: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, rsvp_code)
        row = await conn.fetchrow("select studio_id from public.events where id=$1", resolved[0]) if resolved else None
    if not row or not row["studio_id"] or not _storage_configured():
        raise HTTPException(404, "not found")
    data = await _get(photo_path(str(row["studio_id"])))
    if not data:
        raise HTTPException(404, "not found")
    # The URL carries ?v=<version>, so a changed photo is a new URL.
    return _jpeg(data, "public, max-age=86400")
