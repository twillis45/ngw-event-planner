"""Guest photos — after the event, a guest shares photos from the invite's
recap page; the host approves which ones the other guests see (owner request
11/16/2026).

  POST   /api/public/photos/{rsvp_code}                  — public; upload one photo.
  POST   /api/public/photos/{rsvp_code}/mine             — public; the caller's own photos.
  POST   /api/public/photos/{rsvp_code}/{photo_id}/delete — public; delete one of her own.
  GET    /api/public/photos/{rsvp_code}                  — public; APPROVED photos only.
  POST   /api/public/photos/{rsvp_code}/privacy          — public; "Keep my photos private".
  GET    /api/events/{event_id}/guest-photos             — host; every photo, with status.
  POST   /api/events/{event_id}/guest-photos/{id}/approve — host; guests can see it.
  POST   /api/events/{event_id}/guest-photos/{id}/hide    — host; guests cannot.
  POST   /api/events/{event_id}/guest-photos/{id}/sharing — host; "Don't allow sharing".
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
    approved photos, as {id, url, created_at, shareable}: never the uploader's
    name, key or the storage path. The guest sees her own photos with their
    status. `shareable` is false when the uploader keeps her photos private or
    the host turned sharing off for that photo (board 11/16, option C).
  - Host routes: require_planner + _assert_event_studio_read, as the helper
    link's host reads; a photo is reached only through its own event.
  - The file is checked by its magic bytes, decoded, and RE-ENCODED as a new
    JPEG built from the pixels alone, so no EXIF (GPS, camera, time), XMP, ICC
    profile, comment or PNG text chunk survives. The orientation tag is applied
    to the pixels first, so stripping it never turns a photo sideways, and the
    colors are converted from the photo's own profile to sRGB first, so
    dropping a Display P3 profile never makes an iPhone photo look washed out.
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
from PIL import Image, ImageCms, ImageOps
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
# Uploads open at the event's end, local time: _opens_at below.
RETENTION_DAYS_AFTER_EVENT = 90             # purge; uploads also close then
SIGNED_URL_TTL_SECONDS = 300                # every photo URL a client ever sees
PHOTO_IP_MAX = 30                           # public calls per IP per 60 s window
PHOTO_CODE_MAX = 30                         # uploads + deletes per invite per window
# ───────────────────────────────────────────────────────────────────────────────

BUCKET = "guest-photos"
MAX_PIXELS = 40_000_000                     # decompression-bomb guard (40 MP)
JPEG_QUALITY = 85
# GALLERY SIZES (11/16/2026). A phone photo is 12 MP and 3–5 MB; a gallery of
# 30 at full size was too heavy to scroll. The stored photo is capped at 2560 px
# on its longest side (sharper than any phone screen, and above every social
# app's upload size), and a 480 px THUMBNAIL is stored beside it for the grid.
# The grid loads only thumbnails; the full photo loads in the viewer.
MAX_EDGE = 2560
THUMB_EDGE = 480
THUMB_QUALITY = 78
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


def _now() -> _dt.datetime:
    return _dt.datetime.now(_dt.timezone.utc)


# ── The upload window, from the server's event ─────────────────────────────────
# OPENS AT THE EVENT'S END, LOCAL TIME (owner ruling 11/16/2026). It used to
# open at midnight UTC the day after the last day, which in New York is 7 PM on
# the day itself for a party that is still going, and the next evening for one
# that ended at 6. The event stores no time zone, so the guest's phone supplies
# its offset (JS getTimezoneOffset: minutes WEST of UTC, so UTC = local +
# offset). With no usable offset the window waits for the latest zone on earth
# (UTC-12): it can open late, never early. A spoofed offset can open it at most
# a day early, and every photo still waits for the host's approval.
LATEST_ZONE_OFFSET_MIN = 720               # UTC-12
EARLIEST_ZONE_OFFSET_MIN = -840            # UTC+14
_HHMM = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)")


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


def _clock(v) -> Optional[_dt.time]:
    m = _HHMM.match(str(v or "").strip())
    return _dt.time(int(m.group(1)), int(m.group(2))) if m else None


def tz_offset(raw) -> int:
    """The guest's offset in minutes, or the latest zone's when it is missing or impossible."""
    try:
        v = int(str(raw).strip())
    except (TypeError, ValueError):
        return LATEST_ZONE_OFFSET_MIN
    return v if EARLIEST_ZONE_OFFSET_MIN <= v <= LATEST_ZONE_OFFSET_MIN else LATEST_ZONE_OFFSET_MIN


def _opens_at(public: dict, offset_min: int) -> Optional[_dt.datetime]:
    """When uploads open, in UTC: the last day at the host's end time, else at
    the start time (the owner's words: "end/start time"), else local midnight
    after the last day. A start time the app derived never reaches here
    (rsvp._resolve_event pops it). An end time before the start time is past
    midnight, so it lands on the next day."""
    last = _last_day(public)
    if last is None:
        return None
    end, start = _clock(public.get("endTime")), _clock(public.get("startTime"))
    if end:
        local = _dt.datetime.combine(last, end)
        if start and end <= start:
            local += _dt.timedelta(days=1)
    elif start:
        local = _dt.datetime.combine(last, start)
    else:
        local = _dt.datetime.combine(last + _dt.timedelta(days=1), _dt.time(0, 0))
    return (local + _dt.timedelta(minutes=offset_min)).replace(tzinfo=_dt.timezone.utc)


def _window(public: dict, offset_min: int):
    """(opens_at UTC, closes_on date) or None when the event has no usable date."""
    last = _last_day(public)
    if last is None:
        return None
    return _opens_at(public, offset_min), last + _dt.timedelta(days=RETENTION_DAYS_AFTER_EVENT)


def _uploads_open(public: dict, offset_min: int) -> bool:
    w = _window(public, offset_min)
    now = _now()
    return bool(w) and w[0] <= now and now.date() <= w[1]


def _refuse_outside_window(public: dict, offset_min: int):
    w = _window(public, offset_min)
    if w is None:
        raise HTTPException(403, "Photo sharing isn't open for this invite.")
    now = _now()
    if now < w[0]:
        raise HTTPException(403, "Photos can be shared after the event.")
    if now.date() > w[1]:
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


_SRGB = ImageCms.createProfile("sRGB")


def _to_srgb(img, icc: Optional[bytes]):
    """Convert the pixels from the photo's own color profile to sRGB (owner,
    11/16/2026). An iPhone photo is Display P3: dropping its profile without
    converting made it look washed out. The stored JPEG carries no profile,
    and a browser reads an untagged image as sRGB, so the colors must already
    BE sRGB. A profile that can't be read leaves the pixels as they are; it
    never refuses the photo."""
    if not icc:
        return img
    try:
        src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        out_mode = "RGBA" if "A" in img.getbands() else "RGB"
        if img.mode not in ("RGB", "RGBA", "CMYK", "L"):
            img = img.convert(out_mode)
        return ImageCms.profileToProfile(img, src, _SRGB, outputMode=out_mode)
    except Exception:
        return img


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
        icc = img.info.get("icc_profile")
        img = ImageOps.exif_transpose(img)   # orientation into the pixels
        img = _to_srgb(img, icc)             # colors into the pixels, before the profile is dropped
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
        if max(clean.size) > MAX_EDGE:
            clean.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
    except PhotoRefused:
        raise
    except Image.DecompressionBombError:
        raise PhotoRefused(413, "That photo is too large to share.")
    except Exception:
        raise PhotoRefused(415, "That photo couldn't be read. Try another one.")
    out = io.BytesIO()
    clean.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue(), clean.width, clean.height


def make_thumb(clean_jpeg: bytes) -> bytes:
    """A small JPEG of an already-cleaned photo, from its pixels alone."""
    img = Image.open(io.BytesIO(clean_jpeg)).convert("RGB")
    img.thumbnail((THUMB_EDGE, THUMB_EDGE), Image.LANCZOS)
    small = Image.frombytes("RGB", img.size, img.tobytes())
    out = io.BytesIO()
    small.save(out, "JPEG", quality=THUMB_QUALITY, optimize=True)
    return out.getvalue()


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


def _thumb_path(path: str) -> str:
    return path[:-4] + ".t.jpg" if path.endswith(".jpg") else path + ".t.jpg"


def _files(paths) -> list:
    """Every Storage file behind these photos: the photo and its thumbnail.
    A photo stored before thumbnails existed has none; removing a name that
    isn't there is harmless."""
    return [f for p in paths for f in (p, _thumb_path(p))]


async def _sign_photos(paths: list) -> dict:
    """{storage_path: (url, thumb_url)}. thumb_url falls back to the photo."""
    urls = await _storage_sign(_files(paths), SIGNED_URL_TTL_SECONDS)
    return {p: (urls.get(p), urls.get(_thumb_path(p)) or urls.get(p)) for p in paths}


# ── Helpers ─────────────────────────────────────────────────────────────────────
class GuestKey(BaseModel):
    guest_key: str = Field(..., min_length=MIN_KEY, max_length=MAX_KEY)


class GuestMine(GuestKey):
    # The guest's phone's offset (JS getTimezoneOffset), for the upload window.
    tz_offset_min: Optional[int] = None


class GuestPrivacy(GuestKey):
    private: bool


class HostSharing(BaseModel):
    allowed: bool


def _truthy(raw: Optional[str]) -> bool:
    return str(raw or "").strip().lower() in ("1", "true", "yes", "on")


def _shareable(p) -> bool:
    """A Share button may appear only on an approved photo that neither its
    uploader ("Keep my photos private to this event") nor the host ("Don't
    allow sharing") kept back. Board 11/16, option C."""
    return p["status"] == "approved" and not p["uploader_private"] and not p["share_blocked"]


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


_HOST_COLS = ("id, guest_name, status, storage_path, created_at, reviewed_at, width, height, "
              "uploader_private, share_blocked")


def _host_view(p, urls: dict) -> dict:
    """The host's whitelist: no device key, invite code or storage path."""
    url, thumb = urls.get(p["storage_path"], (None, None))
    return {"id": str(p["id"]), "guest_name": p["guest_name"], "status": p["status"],
            "created_at": _iso(p["created_at"]), "reviewed_at": _iso(p["reviewed_at"]),
            "width": p["width"], "height": p["height"], "url": url, "thumb": thumb,
            "uploader_private": bool(p["uploader_private"]), "share_blocked": bool(p["share_blocked"]),
            "shareable": _shareable(p)}


# ── Guest routes ────────────────────────────────────────────────────────────────
@router.post("/api/public/photos/{rsvp_code}")
async def guest_upload_photo(
    rsvp_code: str,
    request: Request,
    content_type: Optional[str] = Header(default=None),
    x_guest_key: Optional[str] = Header(default=None),
    x_guest_name: Optional[str] = Header(default=None),
    x_guest_tz_offset: Optional[str] = Header(default=None),
    x_guest_private: Optional[str] = Header(default=None),
):
    """One photo, as the raw request body. Stored PENDING; the host decides
    whether other guests see it. X-Guest-Tz-Offset is the phone's offset, for
    the window; X-Guest-Private carries "Keep my photos private to this event".
    Returns { ok, photo: {id, status, created_at, url} }."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        event_id, public = await _resolve(conn, code)
        key = _guest_key(x_guest_key)
        name = _guest_name(x_guest_name)
        _refuse_outside_window(public, tz_offset(x_guest_tz_offset))
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
        # The thumbnail is a convenience: if it fails, the grid shows the photo.
        try:
            await _storage_put(_thumb_path(path), await run_in_threadpool(make_thumb, data), "image/jpeg")
        except Exception:  # noqa: BLE001
            pass
        try:
            async with conn.transaction():
                # Counted again under one lock per event: two uploads racing
                # cannot both read "9" and store the 11th.
                await conn.execute("select pg_advisory_xact_lock(hashtext('guest_photos:' || $1::text))", event_id)
                _refuse_over_cap(await _counts(conn, code, key, event_id))
                row = await conn.fetchrow(
                    """insert into public.guest_photos
                         (id, event_id, rsvp_code, guest_key, guest_name, storage_path,
                          content_type, byte_size, width, height, uploader_private)
                       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                       returning id, status, created_at, storage_path""",
                    photo_id, event_id, code, key, name, path, "image/jpeg", len(data), width, height,
                    _truthy(x_guest_private),
                )
        except BaseException:
            await _storage_remove(_files([path]))     # never leave a file with no row
            raise
    url, thumb = (await _sign_photos([path])).get(path, (None, None))
    return {"ok": True, "photo": {"id": str(row["id"]), "status": row["status"],
                                  "created_at": _iso(row["created_at"]), "url": url, "thumb": thumb,
                                  "width": width, "height": height}}


@router.post("/api/public/photos/{rsvp_code}/mine")
async def guest_my_photos(rsvp_code: str, payload: GuestMine, request: Request):
    """The caller's own photos, each with its status and whether a Share button
    may show on it, plus how many more she can share, whether sharing is open
    now in her zone, and whether she keeps her photos private."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        _event_id, public = await _resolve(conn, code)
        rows = await conn.fetch(
            """select id, status, storage_path, created_at, uploader_private, share_blocked, width, height
                 from public.guest_photos
               where rsvp_code = $1 and guest_key = $2 order by created_at desc""",
            code, payload.guest_key,
        )
    urls = await _sign_photos([r["storage_path"] for r in rows])
    return {
        "ok": True,
        "photos": [{"id": str(r["id"]), "status": r["status"], "created_at": _iso(r["created_at"]),
                    "url": urls[r["storage_path"]][0], "thumb": urls[r["storage_path"]][1],
                    "width": r["width"], "height": r["height"], "shareable": _shareable(r)} for r in rows],
        "remaining": max(0, PHOTOS_PER_GUEST_MAX - len(rows)),
        "uploads_open": _uploads_open(public, tz_offset(payload.tz_offset_min)),
        "keep_private": bool(rows) and all(r["uploader_private"] for r in rows),
    }


@router.post("/api/public/photos/{rsvp_code}/privacy")
async def guest_set_privacy(rsvp_code: str, payload: GuestPrivacy, request: Request):
    """"Keep my photos private to this event": on, no Share button appears on
    any of her photos, anywhere; off, her approved photos may be shared. Her
    own key only, as every guest route."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _resolve(conn, code)
        await conn.execute(
            """update public.guest_photos set uploader_private = $3
               where rsvp_code = $1 and guest_key = $2""",
            code, payload.guest_key, payload.private,
        )
    return {"ok": True, "private": payload.private}


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
        if not await _storage_remove(_files([row["storage_path"]])):
            raise HTTPException(502, "The photo wasn't deleted. Try again.")
        await conn.execute("delete from public.guest_photos where id = $1", pid)
    return {"ok": True, "deleted": True}


@router.get("/api/public/photos/{rsvp_code}")
async def guest_approved_photos(rsvp_code: str, request: Request):
    """Photos the host APPROVED, for anyone holding the invite code. No name,
    key, status or path: {id, url, created_at, shareable} only."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        event_id, _public = await _resolve(conn, code)
        rows = await conn.fetch(
            """select id, status, storage_path, created_at, uploader_private, share_blocked, width, height
                 from public.guest_photos
               where event_id = $1 and status = 'approved' order by created_at desc""",
            event_id,
        )
    urls = await _sign_photos([r["storage_path"] for r in rows])
    return {"ok": True, "photos": [{"id": str(r["id"]), "url": urls[r["storage_path"]][0],
                                    "thumb": urls[r["storage_path"]][1],
                                    "width": r["width"], "height": r["height"],
                                    "created_at": _iso(r["created_at"]), "shareable": _shareable(r)}
                                   for r in rows]}


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
    urls = await _sign_photos([r["storage_path"] for r in rows])
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
    urls = await _sign_photos([row["storage_path"]])
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


@router.post("/api/events/{event_id}/guest-photos/{photo_id}/sharing")
async def host_photo_sharing(
    event_id: str, photo_id: str, payload: HostSharing,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """"Don't allow sharing" on one photo: the person in a picture is not
    always the one who took it (board 11/16). It never changes who can SEE it."""
    principal = await require_planner(authorization, x_planner_token)
    pid = _photo_uuid(photo_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        row = await conn.fetchrow(
            f"""update public.guest_photos set share_blocked = $3
                where id = $1 and event_id = $2 returning {_HOST_COLS}""",
            pid, event_id, not payload.allowed,
        )
    if not row:
        raise HTTPException(404, NOT_FOUND)
    urls = await _sign_photos([row["storage_path"]])
    return {"ok": True, "photo": _host_view(row, urls)}


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
        if not await _storage_remove(_files([row["storage_path"]])):
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
            if not await _storage_remove(_files([r["storage_path"] for r in batch])):
                raise RuntimeError(f"Storage refused the purge after {removed} photos; rows kept for retry.")
            await conn.execute("delete from public.guest_photos where id = any($1::uuid[])",
                               [r["id"] for r in batch])
            removed += len(batch)
    return removed
