"""Guest photos — after the event, a guest shares photos from the invite's
recap page; the host approves which ones the other guests see (owner request
11/16/2026).

  POST   /api/public/photos/{rsvp_code}                  — public; upload one photo.
  POST   /api/public/photos/{rsvp_code}/mine             — public; the caller's own photos.
  POST   /api/public/photos/{rsvp_code}/{photo_id}/delete — public; delete one of her own.
  GET    /api/public/photos/{rsvp_code}                  — public; APPROVED photos only.
  GET    /api/events/{event_id}/guest-photos             — host; every photo, with status.
  POST   /api/events/{event_id}/guest-photos/{id}/approve — host; guests can see it.
  POST   /api/events/{event_id}/guest-photos/{id}/hide    — host; guests cannot.
  DELETE /api/events/{event_id}/guest-photos/{id}         — host; photo and file gone.

THE UPLOAD is the raw image as the request body (Content-Type image/jpeg,
image/png, image/webp; HEIC is refused, below), with the guest's identity in
two headers: X-Guest-Key (the device key) and X-Guest-Name (percent-encoded
UTF-8). A raw body rather than a multipart form, because FastAPI's form
parsing needs python-multipart, a dependency this service does not have.

Security model:
  - THE GUEST CREDENTIAL is (rsvp code, guest key), the pair a guest's own RSVP
    uses (rsvp.py /mine, /withdraw): the key is the random id minted in HER
    browser (rsvpIdempotencyKey). Both are matched in the WHERE clause. A wrong
    key, an unknown code and a short code are the same opaque 404.
  - The event, and its date, come from the SERVER's copy of the event, resolved
    from the code (rsvp._resolve_event). A client never supplies an event id or
    a date.
  - Every photo is PENDING until the host approves it. Other guests see only
    approved photos, as {id, url, created_at}: never the uploader's name, key
    or the storage path. The guest sees her own photos with their status.
  - Host routes: require_planner + _assert_event_studio_read, as the helper
    link's host reads; a photo is reached only through its own event.
  - The file is checked by its magic bytes, decoded, and RE-ENCODED as a new
    JPEG built from the pixels alone, so no EXIF (GPS, camera, time), XMP, ICC
    profile, comment or PNG text chunk survives. The orientation tag is applied
    to the pixels first, so stripping it never turns a photo sideways.
  - Storage: a PRIVATE Supabase bucket (migration 025) with no storage policy,
    written and read only with the service role key, from this server. Photos
    are served only through signed URLs this server mints, valid for
    SIGNED_URL_TTL_SECONDS.
  - Caps: 10 per guest and 300 per event, checked before the upload and
    counted again after it under a per-event advisory lock (an upload that
    loses that race removes its own file). Per-IP and per-code windows on top.

Retention: purge_old_guest_photos() below, 90 days after the event's last
day. SQL cannot delete a Storage file, so the purge is this server's job: the
database names the photos that are due (guest_photos_due_for_purge, service
role only), this removes their files, then their rows. Run it nightly with
backend/scripts/purge_guest_photos.py. Account deletion removes the files in
account.py and the rows in cleanup_deleted_account() (025).

See supabase/migrations/025_guest_photos.sql for the table, bucket and purge.
"""
import datetime as _dt
import io
import re
import uuid
from typing import Optional
from urllib.parse import unquote

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageOps
from pydantic import BaseModel, Field

from ..auth import require_planner
from ..config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
from ..db import get_pool
from .rsvp import _assert_event_studio_read, _client_ip, _rate_check, _resolve_event

router = APIRouter(tags=["guest-photos"])

# ── THE OWNER'S DEFAULTS (11/16/2026), in one place. Change them here. ─────────
PHOTOS_PER_GUEST_MAX = 10
PHOTOS_PER_EVENT_MAX = 300
PHOTO_MAX_BYTES = 10 * 1024 * 1024          # per upload, before re-encoding
UPLOAD_OPENS_DAYS_AFTER_EVENT = 1           # the day after the event's last day (UTC)
RETENTION_DAYS_AFTER_EVENT = 90             # purge; uploads also close then
SIGNED_URL_TTL_SECONDS = 300                # every photo URL a client ever sees
PHOTO_IP_MAX = 30                           # public calls per IP per 60 s window
PHOTO_CODE_MAX = 30                         # uploads + deletes per invite per window
# ───────────────────────────────────────────────────────────────────────────────

BUCKET = "guest-photos"
MAX_PIXELS = 40_000_000                     # decompression-bomb guard (40 MP)
JPEG_QUALITY = 85
MAX_CODE = 80
MAX_NAME = 120
MIN_KEY = 16
MAX_KEY = 120
NOT_FOUND = "not found"

# What a client may say it is sending. The bytes decide what it actually is.
DECLARED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"}
HEIC_REFUSED = ("HEIC photos can't be shared here yet. Share it as a JPEG instead: on an iPhone, "
                "choosing the photo from this page usually converts it, or set Camera → Formats → "
                "Most Compatible.")

_BAD_CHARS = re.compile(r"[\x00-\x1f\x7f-\x9f‪-‮⁦-⁩]")
_HEIF_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"hevm", b"hevs",
                b"mif1", b"msf1", b"avif"}


def _today() -> _dt.date:
    return _dt.datetime.now(_dt.timezone.utc).date()


# ── The upload window, from the server's event ─────────────────────────────────
def _last_day(public: dict) -> Optional[_dt.date]:
    """The event's last day: endDate, else date, when it is a real YYYY-MM-DD."""
    for k in ("endDate", "date"):
        v = str(public.get(k) or "")
        if re.match(r"^\d{4}-\d{2}-\d{2}", v):
            try:
                return _dt.date.fromisoformat(v[:10])
            except ValueError:
                return None
    return None


def _window(public: dict):
    """(opens_on, closes_on) or None when the event has no usable date."""
    last = _last_day(public)
    if last is None:
        return None
    return (last + _dt.timedelta(days=UPLOAD_OPENS_DAYS_AFTER_EVENT),
            last + _dt.timedelta(days=RETENTION_DAYS_AFTER_EVENT))


def _uploads_open(public: dict) -> bool:
    w = _window(public)
    return bool(w) and w[0] <= _today() <= w[1]


def _refuse_outside_window(public: dict):
    w = _window(public)
    if w is None:
        raise HTTPException(403, "Photo sharing isn't open for this invite.")
    if _today() < w[0]:
        raise HTTPException(403, "Photos can be shared after the event.")
    if _today() > w[1]:
        raise HTTPException(403, "Photo sharing for this event has closed.")


# ── The image: sniff, decode, strip, re-encode ─────────────────────────────────
class PhotoRefused(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def sniff(raw: bytes) -> Optional[str]:
    if raw[:3] == b"\xff\xd8\xff":
        return "JPEG"
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return "PNG"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "WEBP"
    if raw[4:8] == b"ftyp" and raw[8:12] in _HEIF_BRANDS:
        return "HEIC"
    return None


def clean_photo(raw: bytes):
    """Return (jpeg bytes, width, height) holding the pixels and nothing else.
    Raises PhotoRefused."""
    kind = sniff(raw)
    if kind == "HEIC":
        raise PhotoRefused(415, HEIC_REFUSED)
    if kind is None:
        raise PhotoRefused(415, "That file isn't a photo. Share a JPEG, PNG or WEBP.")
    try:
        img = Image.open(io.BytesIO(raw))
        # Checked from the header, before a single pixel is decoded.
        if img.width * img.height > MAX_PIXELS:
            raise PhotoRefused(413, "That photo is too large to share.")
        img.load()
        img = ImageOps.exif_transpose(img)   # orientation into the pixels
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            rgba = img.convert("RGBA")
            flat = Image.new("RGB", rgba.size, (255, 255, 255))
            flat.paste(rgba, mask=rgba.getchannel("A"))
            img = flat
        else:
            img = img.convert("RGB")
        # A NEW image from the raw pixels: its .info is empty, so nothing from
        # the original file (EXIF, XMP, ICC, comment, text) can ride along
        # into the save below.
        clean = Image.frombytes("RGB", img.size, img.tobytes())
    except PhotoRefused:
        raise
    except Image.DecompressionBombError:
        raise PhotoRefused(413, "That photo is too large to share.")
    except Exception:
        raise PhotoRefused(415, "That photo couldn't be read. Try another one.")
    out = io.BytesIO()
    clean.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue(), clean.width, clean.height


# ── Supabase Storage, with the service role key, from this server only ────────
def _storage_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _storage_headers() -> dict:
    return {"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "apikey": SUPABASE_SERVICE_ROLE_KEY}


def _storage_base() -> str:
    return SUPABASE_URL.rstrip("/") + "/storage/v1"


async def _storage_put(path: str, data: bytes, content_type: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{_storage_base()}/object/{BUCKET}/{path}", content=data,
                                  headers={**_storage_headers(), "Content-Type": content_type,
                                           "x-upsert": "false"})
        return r.is_success
    except httpx.HTTPError:
        return False


async def _storage_sign(paths: list, ttl: int) -> dict:
    """{path: signed url}; a path that could not be signed is absent."""
    if not paths:
        return {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{_storage_base()}/object/sign/{BUCKET}",
                                  json={"expiresIn": ttl, "paths": list(paths)},
                                  headers=_storage_headers())
        if not r.is_success:
            return {}
        out = {}
        for item in r.json() or []:
            if isinstance(item, dict) and item.get("signedURL") and not item.get("error"):
                out[item.get("path")] = _storage_base() + item["signedURL"]
        return out
    except (httpx.HTTPError, ValueError):
        return {}


async def _storage_remove(paths: list) -> bool:
    if not paths:
        return True
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.request("DELETE", f"{_storage_base()}/object/{BUCKET}",
                                     json={"prefixes": list(paths)}, headers=_storage_headers())
        return r.is_success
    except httpx.HTTPError:
        return False


def _path_for(event_id: str, photo_id: uuid.UUID) -> str:
    # The event segment only groups files; the database row is the record.
    seg = re.sub(r"[^A-Za-z0-9_-]", "_", str(event_id))[:80] or "event"
    return f"{seg}/{photo_id}.jpg"


# ── Helpers ─────────────────────────────────────────────────────────────────────
class GuestKey(BaseModel):
    guest_key: str = Field(..., min_length=MIN_KEY, max_length=MAX_KEY)


def _limit(request: Request, code: str, *, write: bool):
    ok, retry = _rate_check(f"gp-ip:{_client_ip(request)}", PHOTO_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    if write:
        ok, retry = _rate_check(f"gp-code:{code}", PHOTO_CODE_MAX)
        if not ok:
            raise HTTPException(429, "Too many photos on this invite right now — try again shortly",
                                headers={"Retry-After": str(retry)})


def _iso(v):
    return v.isoformat() if v is not None else None


def _photo_uuid(photo_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(photo_id)
    except (ValueError, TypeError):
        raise HTTPException(404, NOT_FOUND)


def _guest_name(raw: Optional[str]) -> str:
    try:
        name = unquote(raw or "", errors="strict").strip()
    except UnicodeDecodeError:
        name = ""
    if not name or len(name) > MAX_NAME or _BAD_CHARS.search(name):
        raise HTTPException(422, "Add your name (plain text, up to 120 characters).")
    return name


def _guest_key(raw: Optional[str]) -> str:
    key = (raw or "").strip()
    if not (MIN_KEY <= len(key) <= MAX_KEY) or _BAD_CHARS.search(key):
        raise HTTPException(422, "This device's guest key is missing.")
    return key


async def _resolve(conn, code: str):
    resolved = await _resolve_event(conn, code)
    if not resolved:
        raise HTTPException(404, NOT_FOUND)
    return resolved


async def _read_body(request: Request) -> bytes:
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > PHOTO_MAX_BYTES:
        raise HTTPException(413, "That photo is over 10 MB.")
    buf = bytearray()
    async for chunk in request.stream():
        buf += chunk
        if len(buf) > PHOTO_MAX_BYTES:
            raise HTTPException(413, "That photo is over 10 MB.")
    return bytes(buf)


async def _counts(conn, code: str, key: str, event_id: str):
    return await conn.fetchrow(
        """select count(*) filter (where rsvp_code = $1 and guest_key = $2) as mine,
                  count(*) as total
             from public.guest_photos where event_id = $3""",
        code, key, event_id,
    )


def _refuse_over_cap(c):
    if c["mine"] >= PHOTOS_PER_GUEST_MAX:
        raise HTTPException(429, f"You've shared {PHOTOS_PER_GUEST_MAX} photos, the most one guest can. "
                                 "Delete one to share another.")
    if c["total"] >= PHOTOS_PER_EVENT_MAX:
        raise HTTPException(429, "This event has all the photos it can hold.")


_HOST_COLS = "id, guest_name, status, storage_path, created_at, reviewed_at, width, height"


def _host_view(p, urls: dict) -> dict:
    """The host's whitelist: no device key, invite code or storage path."""
    return {"id": str(p["id"]), "guest_name": p["guest_name"], "status": p["status"],
            "created_at": _iso(p["created_at"]), "reviewed_at": _iso(p["reviewed_at"]),
            "width": p["width"], "height": p["height"], "url": urls.get(p["storage_path"])}


# ── Guest routes ────────────────────────────────────────────────────────────────
@router.post("/api/public/photos/{rsvp_code}")
async def guest_upload_photo(
    rsvp_code: str,
    request: Request,
    content_type: Optional[str] = Header(default=None),
    x_guest_key: Optional[str] = Header(default=None),
    x_guest_name: Optional[str] = Header(default=None),
):
    """One photo, as the raw request body. Stored PENDING; the host decides
    whether other guests see it. Returns { ok, photo: {id, status, created_at, url} }."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        event_id, public = await _resolve(conn, code)
        key = _guest_key(x_guest_key)
        name = _guest_name(x_guest_name)
        _refuse_outside_window(public)
        if not _storage_configured():
            raise HTTPException(503, "Photo sharing isn't available right now.")
        _refuse_over_cap(await _counts(conn, code, key, event_id))
        if (content_type or "").split(";")[0].strip().lower() not in DECLARED_TYPES:
            raise HTTPException(415, "That file isn't a photo. Share a JPEG, PNG or WEBP.")
        raw = await _read_body(request)
        try:
            data, width, height = await run_in_threadpool(clean_photo, raw)
        except PhotoRefused as e:
            raise HTTPException(e.status, e.message)
        photo_id = uuid.uuid4()
        path = _path_for(event_id, photo_id)
        if not await _storage_put(path, data, "image/jpeg"):
            raise HTTPException(502, "The photo didn't upload. Try again.")
        try:
            async with conn.transaction():
                # Counted again under one lock per event: two uploads racing
                # cannot both read "9" and store the 11th.
                await conn.execute("select pg_advisory_xact_lock(hashtext('guest_photos:' || $1::text))", event_id)
                _refuse_over_cap(await _counts(conn, code, key, event_id))
                row = await conn.fetchrow(
                    """insert into public.guest_photos
                         (id, event_id, rsvp_code, guest_key, guest_name, storage_path,
                          content_type, byte_size, width, height)
                       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                       returning id, status, created_at, storage_path""",
                    photo_id, event_id, code, key, name, path, "image/jpeg", len(data), width, height,
                )
        except BaseException:
            await _storage_remove([path])     # never leave a file with no row
            raise
    urls = await _storage_sign([path], SIGNED_URL_TTL_SECONDS)
    return {"ok": True, "photo": {"id": str(row["id"]), "status": row["status"],
                                  "created_at": _iso(row["created_at"]), "url": urls.get(path)}}


@router.post("/api/public/photos/{rsvp_code}/mine")
async def guest_my_photos(rsvp_code: str, payload: GuestKey, request: Request):
    """The caller's own photos, each with its status, plus how many more she
    can share and whether sharing is open now."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        _event_id, public = await _resolve(conn, code)
        rows = await conn.fetch(
            """select id, status, storage_path, created_at from public.guest_photos
               where rsvp_code = $1 and guest_key = $2 order by created_at desc""",
            code, payload.guest_key,
        )
    urls = await _storage_sign([r["storage_path"] for r in rows], SIGNED_URL_TTL_SECONDS)
    return {
        "ok": True,
        "photos": [{"id": str(r["id"]), "status": r["status"], "created_at": _iso(r["created_at"]),
                    "url": urls.get(r["storage_path"])} for r in rows],
        "remaining": max(0, PHOTOS_PER_GUEST_MAX - len(rows)),
        "uploads_open": _uploads_open(public),
    }


@router.post("/api/public/photos/{rsvp_code}/{photo_id}/delete")
async def guest_delete_photo(rsvp_code: str, photo_id: str, payload: GuestKey, request: Request):
    """Delete one of her own photos: the file first, then the row, so a
    failed file delete leaves something to retry."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pid = _photo_uuid(photo_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _resolve(conn, code)
        row = await conn.fetchrow(
            """select id, storage_path from public.guest_photos
               where id = $1 and rsvp_code = $2 and guest_key = $3""",
            pid, code, payload.guest_key,
        )
        if not row:
            raise HTTPException(404, NOT_FOUND)
        if not await _storage_remove([row["storage_path"]]):
            raise HTTPException(502, "The photo wasn't deleted. Try again.")
        await conn.execute("delete from public.guest_photos where id = $1", pid)
    return {"ok": True, "deleted": True}


@router.get("/api/public/photos/{rsvp_code}")
async def guest_approved_photos(rsvp_code: str, request: Request):
    """Photos the host APPROVED, for anyone holding the invite code. No name,
    key, status or path: {id, url, created_at} only."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        event_id, _public = await _resolve(conn, code)
        rows = await conn.fetch(
            """select id, storage_path, created_at from public.guest_photos
               where event_id = $1 and status = 'approved' order by created_at desc""",
            event_id,
        )
    urls = await _storage_sign([r["storage_path"] for r in rows], SIGNED_URL_TTL_SECONDS)
    return {"ok": True, "photos": [{"id": str(r["id"]), "url": urls.get(r["storage_path"]),
                                    "created_at": _iso(r["created_at"])} for r in rows]}


# ── Host routes ─────────────────────────────────────────────────────────────────
@router.get("/api/events/{event_id}/guest-photos")
async def host_list_photos(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Every photo on the event, newest first, with its status and the name
    the guest gave."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            f"select {_HOST_COLS} from public.guest_photos where event_id = $1 order by created_at desc",
            event_id,
        )
    urls = await _storage_sign([r["storage_path"] for r in rows], SIGNED_URL_TTL_SECONDS)
    return {"ok": True, "photos": [_host_view(r, urls) for r in rows],
            "event_max": PHOTOS_PER_EVENT_MAX}


async def _set_status(event_id: str, photo_id: str, status: str, principal: dict):
    pid = _photo_uuid(photo_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        row = await conn.fetchrow(
            f"""update public.guest_photos set status = $3, reviewed_at = now()
                where id = $1 and event_id = $2 returning {_HOST_COLS}""",
            pid, event_id, status,
        )
    if not row:
        raise HTTPException(404, NOT_FOUND)
    urls = await _storage_sign([row["storage_path"]], SIGNED_URL_TTL_SECONDS)
    return {"ok": True, "photo": _host_view(row, urls)}


@router.post("/api/events/{event_id}/guest-photos/{photo_id}/approve")
async def host_approve_photo(
    event_id: str, photo_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Guests holding the invite code can now see it."""
    principal = await require_planner(authorization, x_planner_token)
    return await _set_status(event_id, photo_id, "approved", principal)


@router.post("/api/events/{event_id}/guest-photos/{photo_id}/hide")
async def host_hide_photo(
    event_id: str, photo_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Other guests can no longer see it; the uploader still can, as hidden."""
    principal = await require_planner(authorization, x_planner_token)
    return await _set_status(event_id, photo_id, "hidden", principal)


@router.delete("/api/events/{event_id}/guest-photos/{photo_id}")
async def host_delete_photo(
    event_id: str, photo_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """The file first, then the row."""
    principal = await require_planner(authorization, x_planner_token)
    pid = _photo_uuid(photo_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        row = await conn.fetchrow(
            "select id, storage_path from public.guest_photos where id = $1 and event_id = $2",
            pid, event_id,
        )
        if not row:
            raise HTTPException(404, NOT_FOUND)
        if not await _storage_remove([row["storage_path"]]):
            raise HTTPException(502, "The photo wasn't deleted. Try again.")
        await conn.execute("delete from public.guest_photos where id = $1", pid)
    return {"ok": True, "deleted": True}


# ── Retention ──────────────────────────────────────────────────────────────────
async def purge_old_guest_photos(older_than_days: int = RETENTION_DAYS_AFTER_EVENT) -> int:
    """Remove photos 90 days after their event: files first, then rows, 100 at
    a time. A Storage failure stops the run with the rows still in place, so
    the next run retries them. Returns how many photos were removed."""
    pool = await get_pool()
    removed = 0
    async with pool.acquire() as conn:
        due = await conn.fetch(
            "select id, storage_path from public.guest_photos_due_for_purge($1)", older_than_days)
        for start in range(0, len(due), 100):
            batch = due[start:start + 100]
            if not await _storage_remove([r["storage_path"] for r in batch]):
                raise RuntimeError(f"Storage refused the purge after {removed} photos; rows kept for retry.")
            await conn.execute("delete from public.guest_photos where id = any($1::uuid[])",
                               [r["id"] for r in batch])
            removed += len(batch)
    return removed
