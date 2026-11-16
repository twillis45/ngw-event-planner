"""Guest photo upload (owner request 11/16/2026).

Same pattern as test_helper_link.py: asyncpg is stubbed before import, the DB
pool and the Storage calls are monkeypatched, and a small in-memory table
stands in for public.guest_photos, dispatched on query text.

Pins:
  - every uploaded photo is re-encoded with NO metadata: EXIF, GPS, the camera
    make, a JPEG comment, XMP and PNG text chunks are gone; the orientation is
    applied to the pixels first, so stripping it never turns a photo sideways.
  - the type is decided by magic bytes, not the Content-Type header; HEIC is
    refused with a plain message; 10 MB is the cap.
  - 10 photos per guest and 300 per event, counted again under a lock after
    the upload (an over-cap upload removes its own stored object).
  - uploads open only after the event's last day, read from the SERVER's copy
    of the event, and close when retention would purge the photo anyway.
  - every photo is pending until the host approves it; other guests see only
    approved photos, without the uploader's name; the guest sees her own.
  - the guest credential is (invite code, device key); a wrong key is a 404.
  - host routes are planner-gated and studio-scoped (the real
    _assert_event_studio_read runs here, not a stub), and a photo is reached
    only through its own event.
  - signed URLs are minted by the server with a short TTL.
  - retention and account deletion remove the stored objects, not just rows.
All names are synthetic.
"""
import asyncio
import datetime as _dt
import io
import sys
import types
import uuid
from contextlib import asynccontextmanager
from urllib.parse import quote

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from PIL import ExifTags, Image, PngImagePlugin
from PIL.TiffImagePlugin import IFDRational as R

import app.routers.guest_photos as gp
import app.routers.rsvp as rsvp_mod

CODE = "abcdefghij1234567890xy"
OTHER_CODE = "zzzzzzzzzz1234567890xy"
KEY_A = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
KEY_B = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
TODAY = _dt.date(2026, 11, 16)
NOW = _dt.datetime(2026, 11, 16, 12, 0, tzinfo=_dt.timezone.utc)
STUDIO = "33333333-3333-4333-8333-333333333333"


# ── In-memory stand-ins ─────────────────────────────────────────────────────────
class _DB:
    def __init__(self, event=None, studio_id=STUDIO, members=()):
        self.event = {"name": "Fall Gathering", "date": "2026-11-01"} if event is None else event
        self.studio_id = studio_id
        self.members = set(members)
        self.photos = []           # dicts shaped like public.guest_photos rows
        self.locks = []

    def add(self, *, key=KEY_A, code=CODE, event_id="e1", status="pending", name="Jordan Avery"):
        pid = uuid.uuid4()
        row = {"id": pid, "event_id": event_id, "rsvp_code": code, "guest_key": key,
               "guest_name": name, "storage_path": f"{event_id}/{pid}.jpg", "status": status,
               "created_at": _dt.datetime(2026, 11, 10, tzinfo=_dt.timezone.utc),
               "reviewed_at": None, "width": 10, "height": 10, "byte_size": 100,
               "content_type": "image/jpeg", "uploader_private": False, "share_blocked": False}
        self.photos.append(row)
        return row


class _Conn:
    def __init__(self, db):
        self.db = db

    @asynccontextmanager
    async def transaction(self):
        yield self

    async def execute(self, q, *a):
        if "pg_advisory_xact_lock" in q:
            self.db.locks.append(a)
            return "SELECT 1"
        if "delete from public.guest_photos where id = any" in q:
            ids = set(a[0])
            self.db.photos = [p for p in self.db.photos if p["id"] not in ids]
            return "DELETE"
        if "delete from public.guest_photos where id = $1" in q:
            self.db.photos = [p for p in self.db.photos if p["id"] != a[0]]
            return "DELETE"
        if "update public.guest_photos set uploader_private" in q:
            assert "where rsvp_code = $1 and guest_key = $2" in q, q
            code, key, private = a
            n = 0
            for p in self.db.photos:
                if p["rsvp_code"] == code and p["guest_key"] == key:
                    p["uploader_private"] = private
                    n += 1
            return f"UPDATE {n}"
        raise AssertionError("unexpected execute: " + q)

    async def fetchrow(self, q, *a):
        db = self.db
        if "data->>'rsvpCode'" in q:
            return {"id": "e1", "data": dict(db.event)} if a[0] == CODE else None
        if "select studio_id from public.events" in q:
            return {"studio_id": db.studio_id} if a[0] == "e1" else None
        if "from event_owners" in q:
            return None
        if "count(*)" in q and "guest_photos" in q:
            code, key, event_id = a
            rows = [p for p in db.photos if p["event_id"] == event_id]
            return {"mine": sum(1 for p in rows if p["rsvp_code"] == code and p["guest_key"] == key),
                    "total": len(rows)}
        if "insert into public.guest_photos" in q:
            (pid, event_id, code, key, name, path, ctype, size, w, h, private) = a
            row = {"id": pid, "event_id": event_id, "rsvp_code": code, "guest_key": key,
                   "guest_name": name, "storage_path": path, "content_type": ctype,
                   "byte_size": size, "width": w, "height": h, "status": "pending",
                   "uploader_private": private, "share_blocked": False,
                   "created_at": _dt.datetime(2026, 11, 16, 12, tzinfo=_dt.timezone.utc),
                   "reviewed_at": None}
            db.photos.append(row)
            return row
        if "update public.guest_photos set status" in q:
            # A photo is reached only through its own event: pin the shape the
            # semantics below assume.
            assert "where id = $1 and event_id = $2" in q, q
            pid, event_id, status = a
            for p in db.photos:
                if p["id"] == pid and p["event_id"] == event_id:
                    p["status"] = status
                    p["reviewed_at"] = _dt.datetime(2026, 11, 16, 13, tzinfo=_dt.timezone.utc)
                    return p
            return None
        if "update public.guest_photos set share_blocked" in q:
            assert "where id = $1 and event_id = $2" in q, q
            pid, event_id, blocked = a
            for p in db.photos:
                if p["id"] == pid and p["event_id"] == event_id:
                    p["share_blocked"] = blocked
                    return p
            return None
        if "where id = $1 and rsvp_code = $2 and guest_key = $3" in q:
            pid, code, key = a
            return next((p for p in db.photos if p["id"] == pid and p["rsvp_code"] == code
                         and p["guest_key"] == key), None)
        if "where id = $1 and event_id = $2" in q:
            pid, event_id = a
            return next((p for p in db.photos if p["id"] == pid and p["event_id"] == event_id), None)
        raise AssertionError("unexpected fetchrow: " + q)

    async def fetchval(self, q, *a):
        if "from studio_members" in q:
            return 1 if a[1] in self.db.members else None
        raise AssertionError("unexpected fetchval: " + q)

    async def fetch(self, q, *a):
        db = self.db
        if "guest_photos_due_for_purge" in q:
            return [{"id": p["id"], "storage_path": p["storage_path"]} for p in db.photos
                    if p.get("due")]
        if "status = 'approved'" in q:
            return [p for p in db.photos if p["event_id"] == a[0] and p["status"] == "approved"]
        if "where rsvp_code = $1 and guest_key = $2" in q:
            return [p for p in db.photos if p["rsvp_code"] == a[0] and p["guest_key"] == a[1]]
        if "where event_id = $1" in q:
            return [p for p in db.photos if p["event_id"] == a[0]]
        raise AssertionError("unexpected fetch: " + q)


class _Pool:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        conn = self._conn

        @asynccontextmanager
        async def _a():
            yield conn
        return _a()


class _Storage:
    def __init__(self):
        self.objects = {}
        self.removed = []
        self.sign_calls = []
        self.fail_remove = False
        self.on_put = None

    async def put(self, path, data, content_type):
        self.objects[path] = (data, content_type)
        if self.on_put:
            self.on_put()
        return True

    async def sign(self, paths, ttl):
        self.sign_calls.append((list(paths), ttl))
        return {p: f"https://project.supabase.co/storage/v1/object/sign/guest-photos/{p}?token=t"
                for p in paths}

    async def remove(self, paths):
        if self.fail_remove:
            return False
        self.removed.extend(paths)
        for p in paths:
            self.objects.pop(p, None)
        return True


def photos_only(env):
    """The stored photos, without their gallery thumbnails (`<id>.t.jpg`)."""
    return [v for k, v in env.store.objects.items() if not k.endswith(".t.jpg")]


def both(path):
    """A photo's two Storage files: the photo, then its thumbnail."""
    return [path, path[:-4] + ".t.jpg"]


@pytest.fixture
def env(monkeypatch):
    db = _DB()
    store = _Storage()

    async def fake_get_pool():
        return _Pool(_Conn(db))

    async def signed_in(*a, **k):
        return {"id": "member-1", "via": "supabase"}

    db.members.add("member-1")
    monkeypatch.setattr(gp, "get_pool", fake_get_pool)
    monkeypatch.setattr(gp, "require_planner", signed_in)
    monkeypatch.setattr(gp, "_storage_configured", lambda: True)
    monkeypatch.setattr(gp, "_storage_put", store.put)
    monkeypatch.setattr(gp, "_storage_sign", store.sign)
    monkeypatch.setattr(gp, "_storage_remove", store.remove)
    monkeypatch.setattr(gp, "_now", lambda: NOW)
    rsvp_mod._rate.clear()
    app = FastAPI()
    app.include_router(gp.router)
    return types.SimpleNamespace(db=db, store=store, client=TestClient(app), mp=monkeypatch)


# ── Image builders ──────────────────────────────────────────────────────────────
def jpeg_with_gps(size=(40, 20), orientation=6):
    img = Image.new("RGB", size, (200, 30, 30))
    exif = Image.Exif()
    exif[0x010F] = "SecretCam"          # Make
    exif[0x0112] = orientation          # Orientation
    gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
    gps.update({1: "N", 2: (R(40), R(26), R(46)), 3: "W", 4: (R(79), R(58), R(56))})
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif.tobytes(), comment=b"secret comment",
             xmp=b"<x:xmpmeta>secret-xmp</x:xmpmeta>")
    return buf.getvalue()


def png_with_text():
    info = PngImagePlugin.PngInfo()
    info.add_text("Author", "Secret Person")
    buf = io.BytesIO()
    Image.new("RGBA", (12, 8), (0, 0, 0, 0)).save(buf, "PNG", pnginfo=info)
    return buf.getvalue()


def webp():
    buf = io.BytesIO()
    Image.new("RGB", (12, 8), (0, 90, 0)).save(buf, "WEBP")
    return buf.getvalue()


def headers(key=KEY_A, name="Jordan Avery", ctype="image/jpeg", tz=None, private=None):
    h = {"Content-Type": ctype}
    if tz is not None:
        h["X-Guest-Tz-Offset"] = str(tz)
    if private is not None:
        h["X-Guest-Private"] = private
    if key is not None:
        h["X-Guest-Key"] = key
    if name is not None:
        h["X-Guest-Name"] = quote(name)
    return h


def upload(env, body, code=CODE, **kw):
    return env.client.post(f"/api/public/photos/{code}", content=body, headers=headers(**kw))


# ── Metadata is gone ─────────────────────────────────────────────────────────────
def test_exif_gps_comment_and_xmp_are_stripped_and_orientation_is_kept(env):
    raw = jpeg_with_gps()
    # Premise: the fixture really carries what must be removed.
    src = Image.open(io.BytesIO(raw))
    assert src.getexif().get_ifd(0x8825).get(2) == (40.0, 26.0, 46.0)
    assert b"SecretCam" in raw and b"secret comment" in raw and b"secret-xmp" in raw

    r = upload(env, raw)
    assert r.status_code == 200, r.text
    (stored, ctype), = photos_only(env)
    assert ctype == "image/jpeg"
    out = Image.open(io.BytesIO(stored))
    assert out.format == "JPEG"
    assert dict(out.getexif()) == {}
    assert out.getexif().get_ifd(0x8825) == {}
    for needle in (b"Exif", b"SecretCam", b"secret comment", b"secret-xmp", b"xmpmeta"):
        assert needle not in stored, needle
    assert "comment" not in out.info and "exif" not in out.info and "xmp" not in out.info
    assert "icc_profile" not in out.info
    # Orientation 6 means "rotate 90": the stored pixels are already upright.
    assert out.size == (20, 40)
    row, = env.db.photos
    assert (row["width"], row["height"]) == (20, 40)
    assert row["byte_size"] == len(stored)
    # THE THUMBNAIL (11/16/2026) is made from the cleaned pixels: it carries
    # none of the original's metadata either.
    thumb, _t = env.store.objects[row["storage_path"][:-4] + ".t.jpg"]
    for needle in (b"Exif", b"SecretCam", b"secret comment", b"secret-xmp", b"xmpmeta"):
        assert needle not in thumb, needle
    assert dict(Image.open(io.BytesIO(thumb)).getexif()) == {}


def test_png_text_chunks_are_stripped_and_png_and_webp_are_reencoded_as_jpeg(env):
    raw = png_with_text()
    assert b"Secret Person" in raw
    assert upload(env, raw, ctype="image/png").status_code == 200
    assert upload(env, webp(), ctype="image/webp").status_code == 200
    stored = [d for d, _t in env.store.objects.values()]
    assert len(stored) == 4            # two photos and their two thumbnails
    for data in stored:
        assert data[:3] == b"\xff\xd8\xff"
        assert b"Secret Person" not in data and b"Author" not in data


# ── The type comes from the bytes ───────────────────────────────────────────────
@pytest.mark.parametrize("body", [
    b"GIF89a" + b"\x00" * 64,                               # a GIF sent as image/jpeg
    b"%PDF-1.7\n" + b"\x00" * 64,                            # a PDF sent as image/jpeg
    b"<svg xmlns='http://www.w3.org/2000/svg'></svg>",       # an SVG sent as image/jpeg
    b"\xff\xd8\xff\xe0" + b"not really a jpeg" * 4,         # right magic, broken image
])
def test_wrong_magic_bytes_are_refused_whatever_the_header_says(env, body):
    r = upload(env, body, ctype="image/jpeg")
    assert r.status_code == 415
    assert env.store.objects == {} and env.db.photos == []


def test_a_real_jpeg_with_a_non_image_content_type_is_refused(env):
    r = upload(env, jpeg_with_gps(), ctype="application/octet-stream")
    assert r.status_code == 415
    assert env.store.objects == {}


def test_heic_is_refused_with_a_plain_message(env):
    heic = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64
    r = upload(env, heic, ctype="image/heic")
    assert r.status_code == 415
    assert "HEIC" in r.json()["detail"]
    assert env.store.objects == {}


def test_size_cap_is_10_mb_and_an_oversized_body_is_refused(env):
    assert gp.PHOTO_MAX_BYTES == 10 * 1024 * 1024
    env.mp.setattr(gp, "PHOTO_MAX_BYTES", 2000)
    big = jpeg_with_gps(size=(400, 400))
    assert len(big) > 2000
    r = upload(env, big)
    assert r.status_code == 413
    assert env.store.objects == {} and env.db.photos == []


def test_a_body_with_no_content_length_is_still_capped_while_it_streams(env):
    env.mp.setattr(gp, "PHOTO_MAX_BYTES", 2000)
    big = jpeg_with_gps(size=(400, 400))

    def chunks():
        for i in range(0, len(big), 500):
            yield big[i:i + 500]
    r = env.client.post(f"/api/public/photos/{CODE}", content=chunks(), headers=headers())
    assert "content-length" not in {k.lower() for k in r.request.headers}
    assert r.status_code == 413
    assert env.store.objects == {} and env.db.photos == []


def test_a_decompression_bomb_is_refused(env):
    env.mp.setattr(gp, "MAX_PIXELS", 100)
    r = upload(env, jpeg_with_gps(size=(40, 20)))
    assert r.status_code == 413
    assert env.store.objects == {}


# ── Caps ───────────────────────────────────────────────────────────────────────
def test_ten_photos_per_guest(env):
    assert gp.PHOTOS_PER_GUEST_MAX == 10
    for _ in range(10):
        env.db.add(key=KEY_A)
    r = upload(env, webp(), ctype="image/webp")
    assert r.status_code == 429
    assert env.store.objects == {}
    # another guest on the same invite is not affected
    assert upload(env, webp(), ctype="image/webp", key=KEY_B, name="Riley Park").status_code == 200


def test_three_hundred_photos_per_event(env):
    assert gp.PHOTOS_PER_EVENT_MAX == 300
    for i in range(300):
        env.db.add(key=f"other-guest-key-{i:04d}")
    r = upload(env, webp(), ctype="image/webp")
    assert r.status_code == 429
    assert env.store.objects == {}


def test_caps_are_counted_again_under_the_lock_and_a_losing_upload_removes_its_object(env):
    # Two of her other uploads land while this one is being stored.
    def race():
        for _ in range(10):
            env.db.add(key=KEY_A)
    env.store.on_put = race
    r = upload(env, webp(), ctype="image/webp")
    assert r.status_code == 429
    assert env.db.locks, "the recount must run under the per-event advisory lock"
    assert len(env.store.removed) == 2 and env.store.objects == {}   # the photo and its thumbnail
    assert all(p["guest_key"] == KEY_A and p["storage_path"] not in env.store.removed
               for p in env.db.photos)


# ── The window comes from the server's event ───────────────────────────────────
@pytest.mark.parametrize("event", [
    {"name": "Later", "date": "2026-12-01"},                          # before
    {"name": "Today", "date": "2026-11-16"},                          # day of
    {"name": "Span", "date": "2026-11-14", "endDate": "2026-11-16"},  # last day is today
    {"name": "No date"},                                              # unknown: refuse
    {"name": "Junk", "date": "2026-02-30"},                           # impossible date
    {"name": "Old", "date": "2026-08-01"},                            # past retention: closed
])
def test_uploads_open_only_after_the_event_and_before_retention(env, event):
    env.db.event = event
    r = upload(env, webp(), ctype="image/webp")
    assert r.status_code == 403
    assert env.store.objects == {}


def test_uploads_open_the_day_after_the_last_day(env):
    env.db.event = {"name": "Span", "date": "2026-11-13", "endDate": "2026-11-15"}
    assert upload(env, webp(), ctype="image/webp").status_code == 200


# ── Identity ───────────────────────────────────────────────────────────────────
def test_a_name_and_a_device_key_are_required(env):
    assert upload(env, webp(), ctype="image/webp", name=None).status_code == 422
    assert upload(env, webp(), ctype="image/webp", name="   ").status_code == 422
    assert upload(env, webp(), ctype="image/webp", key=None).status_code == 422
    assert upload(env, webp(), ctype="image/webp", key="short").status_code == 422
    assert upload(env, webp(), ctype="image/webp", name="Jo‮dan").status_code == 422
    assert env.store.objects == {}


def test_a_non_ascii_name_survives_the_header(env):
    assert upload(env, webp(), ctype="image/webp", name="Zoë Ñúñez").status_code == 200
    assert env.db.photos[0]["guest_name"] == "Zoë Ñúñez"


@pytest.mark.parametrize("code", [OTHER_CODE, "short"])
def test_an_unknown_or_short_code_is_a_404_everywhere(env, code):
    pid = env.db.add()["id"]
    assert upload(env, webp(), code=code, ctype="image/webp").status_code == 404
    assert env.client.post(f"/api/public/photos/{code}/mine", json={"guest_key": KEY_A}).status_code == 404
    assert env.client.get(f"/api/public/photos/{code}").status_code == 404
    assert env.client.post(f"/api/public/photos/{code}/{pid}/delete",
                           json={"guest_key": KEY_A}).status_code == 404
    assert env.store.objects == {} and len(env.db.photos) == 1


# ── Who sees what ──────────────────────────────────────────────────────────────
def test_an_unapproved_photo_is_invisible_to_other_guests(env):
    r = upload(env, webp(), ctype="image/webp")
    pid = r.json()["photo"]["id"]
    assert r.json()["photo"]["status"] == "pending"

    assert env.client.get(f"/api/public/photos/{CODE}").json()["photos"] == []
    other = env.client.post(f"/api/public/photos/{CODE}/mine", json={"guest_key": KEY_B}).json()
    assert other["photos"] == []
    mine = env.client.post(f"/api/public/photos/{CODE}/mine", json={"guest_key": KEY_A}).json()
    assert [p["id"] for p in mine["photos"]] == [pid]
    assert mine["photos"][0]["status"] == "pending" and mine["photos"][0]["url"].startswith("https://")
    assert mine["remaining"] == gp.PHOTOS_PER_GUEST_MAX - 1 and mine["uploads_open"] is True

    assert env.client.post(f"/api/events/e1/guest-photos/{pid}/approve").status_code == 200
    shown = env.client.get(f"/api/public/photos/{CODE}").json()["photos"]
    assert [p["id"] for p in shown] == [pid]
    # Whitelist: no uploader name, key, code, path or status reaches other guests.
    # "shareable" is the one consent flag (board 11/16): it says whether a Share
    # button may appear, and nothing about who took the photo.
    # thumb/width/height (11/16/2026) are the gallery's sizes: still nothing
    # about who took it.
    assert set(shown[0]) == {"id", "url", "thumb", "width", "height", "created_at", "shareable"}

    assert env.client.post(f"/api/events/e1/guest-photos/{pid}/hide").status_code == 200
    assert env.client.get(f"/api/public/photos/{CODE}").json()["photos"] == []


def test_signed_urls_are_server_minted_with_a_short_ttl(env):
    env.db.add(status="approved")
    env.client.get(f"/api/public/photos/{CODE}")
    paths, ttl = env.store.sign_calls[-1]
    assert ttl == gp.SIGNED_URL_TTL_SECONDS <= 900
    assert paths == both(env.db.photos[0]["storage_path"])


# ── Deleting ───────────────────────────────────────────────────────────────────
def test_a_guest_deletes_her_own_photo_and_its_object(env):
    upload(env, webp(), ctype="image/webp")
    row = env.db.photos[0]
    r = env.client.post(f"/api/public/photos/{CODE}/{row['id']}/delete", json={"guest_key": KEY_A})
    assert r.status_code == 200 and r.json() == {"ok": True, "deleted": True}
    assert env.db.photos == [] and env.store.removed == both(row["storage_path"])


def test_another_guests_key_cannot_delete_it(env):
    row = env.db.add(key=KEY_A)
    r = env.client.post(f"/api/public/photos/{CODE}/{row['id']}/delete", json={"guest_key": KEY_B})
    assert r.status_code == 404
    assert env.db.photos == [row] and env.store.removed == []
    # a malformed photo id is the same 404
    assert env.client.post(f"/api/public/photos/{CODE}/not-a-uuid/delete",
                           json={"guest_key": KEY_A}).status_code == 404


def test_a_failed_object_delete_keeps_the_row_so_it_can_be_retried(env):
    row = env.db.add(key=KEY_A)
    env.store.fail_remove = True
    r = env.client.post(f"/api/public/photos/{CODE}/{row['id']}/delete", json={"guest_key": KEY_A})
    assert r.status_code == 502
    assert env.db.photos == [row]


# ── Host ───────────────────────────────────────────────────────────────────────
def test_host_sees_every_photo_with_its_status_and_the_guests_name(env):
    env.db.add(status="pending", name="Jordan Avery")
    env.db.add(status="approved", key=KEY_B, name="Riley Park")
    env.db.add(status="hidden", key=KEY_B, name="Riley Park")
    env.db.add(event_id="e2")       # another event's photo never appears
    body = env.client.get("/api/events/e1/guest-photos").json()
    assert sorted(p["status"] for p in body["photos"]) == ["approved", "hidden", "pending"]
    assert {p["guest_name"] for p in body["photos"]} == {"Jordan Avery", "Riley Park"}
    for p in body["photos"]:
        assert "guest_key" not in p and "rsvp_code" not in p and "storage_path" not in p
        assert p["url"].startswith("https://")
    assert body["event_max"] == gp.PHOTOS_PER_EVENT_MAX


def test_host_deletes_a_photo_and_its_object(env):
    row = env.db.add()
    r = env.client.delete(f"/api/events/e1/guest-photos/{row['id']}")
    assert r.status_code == 200 and env.db.photos == []
    assert env.store.removed == both(row["storage_path"])


def test_a_photo_is_reached_only_through_its_own_event(env):
    row = env.db.add(event_id="e2")
    assert env.client.post(f"/api/events/e1/guest-photos/{row['id']}/approve").status_code == 404
    assert env.client.delete(f"/api/events/e1/guest-photos/{row['id']}").status_code == 404
    assert row["status"] == "pending" and env.store.removed == []


def test_host_routes_require_the_planner_gate(env):
    async def deny(*a, **k):
        raise HTTPException(401, "Unauthorized")
    env.mp.setattr(gp, "require_planner", deny)
    row = env.db.add()
    assert env.client.get("/api/events/e1/guest-photos").status_code == 401
    assert env.client.post(f"/api/events/e1/guest-photos/{row['id']}/approve").status_code == 401
    assert env.client.delete(f"/api/events/e1/guest-photos/{row['id']}").status_code == 401


def test_a_host_from_another_studio_is_refused(env):
    async def outsider(*a, **k):
        return {"id": "outsider-9", "via": "supabase"}
    env.mp.setattr(gp, "require_planner", outsider)
    row = env.db.add()
    assert env.client.get("/api/events/e1/guest-photos").status_code == 403
    assert env.client.post(f"/api/events/e1/guest-photos/{row['id']}/approve").status_code == 403
    assert env.client.post(f"/api/events/e1/guest-photos/{row['id']}/hide").status_code == 403
    assert env.client.delete(f"/api/events/e1/guest-photos/{row['id']}").status_code == 403
    assert row["status"] == "pending" and env.store.removed == [] and env.store.sign_calls == []


# ── Rate limits and configuration ──────────────────────────────────────────────
def test_uploads_are_rate_limited_per_invite(env):
    env.mp.setattr(gp, "PHOTO_CODE_MAX", 2)
    assert upload(env, webp(), ctype="image/webp").status_code == 200
    assert upload(env, webp(), ctype="image/webp").status_code == 200
    r = upload(env, webp(), ctype="image/webp")
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_without_storage_configured_uploads_say_so(env):
    env.mp.setattr(gp, "_storage_configured", lambda: False)
    r = upload(env, webp(), ctype="image/webp")
    assert r.status_code == 503
    assert env.db.photos == []


# ── Retention ──────────────────────────────────────────────────────────────────
def test_purge_removes_objects_first_then_rows(env):
    keep = env.db.add()
    gone = env.db.add()
    gone["due"] = True
    n = asyncio.run(gp.purge_old_guest_photos())
    assert n == 1
    assert env.store.removed == both(gone["storage_path"])
    assert env.db.photos == [keep]


def test_purge_keeps_rows_when_storage_refuses(env):
    row = env.db.add()
    row["due"] = True
    env.store.fail_remove = True
    with pytest.raises(RuntimeError):
        asyncio.run(gp.purge_old_guest_photos())
    assert env.db.photos == [row]


# ── Color: a wide-gamut photo is converted to sRGB, not flattened (11/16) ──────
def _p3_icc() -> bytes:
    """A minimal ICC v2 RGB matrix profile with Display P3 primaries (D50-adapted)
    and a 2.2 gamma: what an iPhone photo carries. Hand-built so the test needs
    no profile file on disk."""
    import struct

    def s15(x):
        return struct.pack(">i", int(round(x * 65536)))

    def xyz(x, y, z):
        return b"XYZ " + b"\0" * 4 + s15(x) + s15(y) + s15(z)

    curv = b"curv" + b"\0" * 4 + struct.pack(">I", 1) + struct.pack(">H", int(2.2 * 256)) + b"\0\0"
    text = b"Display P3 (test)\0"
    desc = (b"desc" + b"\0" * 4 + struct.pack(">I", len(text)) + text
            + struct.pack(">II", 0, 0) + struct.pack(">HB", 0, 0) + b"\0" * 67)
    cprt = b"text" + b"\0" * 4 + b"none\0"
    tags = [(b"desc", desc), (b"cprt", cprt), (b"wtpt", xyz(0.9642, 1.0, 0.8249)),
            (b"rXYZ", xyz(0.5151, 0.2412, -0.0011)), (b"gXYZ", xyz(0.2919, 0.6922, 0.0419)),
            (b"bXYZ", xyz(0.1572, 0.0666, 0.7841)),
            (b"rTRC", curv), (b"gTRC", curv), (b"bTRC", curv)]
    table_len = 4 + 12 * len(tags)
    offset = 128 + table_len
    table, data = struct.pack(">I", len(tags)), b""
    for sig, body in tags:
        while (offset + len(data)) % 4:
            data += b"\0"
        table += sig + struct.pack(">II", offset + len(data), len(body))
        data += body
    while (128 + table_len + len(data)) % 4:
        data += b"\0"
    size = 128 + table_len + len(data)
    header = (struct.pack(">I", size) + b"lcms" + struct.pack(">I", 0x02100000) + b"mntrRGB XYZ "
              + struct.pack(">6H", 2026, 11, 16, 0, 0, 0) + b"acsp" + b"\0" * 24
              + struct.pack(">I", 0) + s15(0.9642) + s15(1.0) + s15(0.8249) + b"\0" * 48)
    assert len(header) == 128
    return header + table + data


def _jpeg(color, icc=None):
    buf = io.BytesIO()
    kw = {"icc_profile": icc} if icc else {}
    Image.new("RGB", (16, 16), color).save(buf, "JPEG", quality=100, **kw)
    return buf.getvalue()


def test_a_wide_gamut_photo_is_converted_to_srgb_so_it_does_not_look_washed_out(env):
    from PIL import ImageCms
    p3 = _p3_icc()
    src_color = (60, 180, 60)
    # What the photo SHOULD look like in sRGB, computed independently.
    expect = ImageCms.profileToProfile(Image.new("RGB", (1, 1), src_color),
                                       ImageCms.ImageCmsProfile(io.BytesIO(p3)),
                                       ImageCms.createProfile("sRGB")).getpixel((0, 0))
    # Premise: dropping the profile (the old behavior) would visibly change it.
    assert max(abs(a - b) for a, b in zip(expect, src_color)) > 15

    assert upload(env, _jpeg(src_color, p3)).status_code == 200
    (stored, _t), = photos_only(env)
    out = Image.open(io.BytesIO(stored))
    assert "icc_profile" not in out.info          # stored as plain sRGB: no profile rides along
    got = out.convert("RGB").getpixel((8, 8))
    assert max(abs(a - b) for a, b in zip(got, expect)) <= 6, (got, expect)


def test_an_srgb_or_untagged_photo_keeps_its_colors(env):
    from PIL import ImageCms
    srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    for icc in (None, srgb):
        env.store.objects.clear()
        assert upload(env, _jpeg((60, 180, 60), icc)).status_code == 200
        (stored, _t), = photos_only(env)
        got = Image.open(io.BytesIO(stored)).convert("RGB").getpixel((8, 8))
        assert max(abs(a - b) for a, b in zip(got, (60, 180, 60))) <= 6, (icc is None, got)


def test_a_broken_color_profile_never_refuses_the_photo(env):
    r = upload(env, _jpeg((60, 180, 60), b"not an icc profile at all" * 8))
    assert r.status_code == 200, r.text
    (stored, _t), = photos_only(env)
    assert b"not an icc profile" not in stored


# ── The upload window opens at the event's END, local time (owner 11/16) ───────
def _at(env, y, mo, d, h, mi=0):
    env.mp.setattr(gp, "_now", lambda: _dt.datetime(y, mo, d, h, mi, tzinfo=_dt.timezone.utc))


def test_uploads_open_at_the_events_end_time_in_the_guests_zone(env):
    # 6:00 PM in New York (UTC-5 in November; JS getTimezoneOffset says 300).
    env.db.event = {"name": "Friendsgiving", "date": "2026-11-16", "startTime": "15:00", "endTime": "18:00"}
    _at(env, 2026, 11, 16, 22, 59)
    r = upload(env, webp(), ctype="image/webp", tz=300)
    assert r.status_code == 403 and "after the event" in r.json()["detail"]
    _at(env, 2026, 11, 16, 23, 0)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 200


def test_an_end_time_past_midnight_lands_on_the_next_day(env):
    # 8 PM to 1 AM: the party ends at 1 AM on the 17th, not on the 16th.
    env.db.event = {"name": "Late one", "date": "2026-11-16", "startTime": "20:00", "endTime": "01:00"}
    _at(env, 2026, 11, 17, 5, 59)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 403
    _at(env, 2026, 11, 17, 6, 0)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 200


def test_with_no_end_time_the_start_time_opens_them(env):
    env.db.event = {"name": "Cookout", "date": "2026-11-16", "startTime": "16:00"}
    _at(env, 2026, 11, 16, 20, 59)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 403
    _at(env, 2026, 11, 16, 21, 0)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 200


def test_with_no_time_at_all_they_open_at_local_midnight_after_the_last_day(env):
    env.db.event = {"name": "Span", "date": "2026-11-14", "endDate": "2026-11-16"}
    _at(env, 2026, 11, 17, 4, 59)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 403
    _at(env, 2026, 11, 17, 5, 0)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 200


@pytest.mark.parametrize("tz", [None, "abc", "5000", "-5000"])
def test_a_missing_or_impossible_zone_waits_for_the_last_zone_on_earth(env, tz):
    # Never early: with no usable offset the window opens when the event has
    # ended everywhere (UTC-12), so 6:00 PM local is 6:00 AM UTC the next day.
    env.db.event = {"name": "Friendsgiving", "date": "2026-11-16", "endTime": "18:00"}
    _at(env, 2026, 11, 17, 5, 59)
    assert upload(env, webp(), ctype="image/webp", tz=tz).status_code == 403
    _at(env, 2026, 11, 17, 6, 0)
    assert upload(env, webp(), ctype="image/webp", tz=tz).status_code == 200


def test_a_derived_start_time_never_opens_them_early(env):
    # The app's own guess is popped before this router sees the event (R2-23),
    # so a derived hour falls back to the end of the day.
    env.db.event = {"name": "Cookout", "date": "2026-11-16", "startTime": "16:00", "startTimeSource": "derived"}
    _at(env, 2026, 11, 16, 21, 0)
    assert upload(env, webp(), ctype="image/webp", tz=300).status_code == 403


def test_mine_says_whether_uploads_are_open_in_the_guests_zone(env):
    env.db.event = {"name": "Friendsgiving", "date": "2026-11-16", "endTime": "18:00"}
    _at(env, 2026, 11, 16, 23, 30)
    body = {"guest_key": KEY_A, "tz_offset_min": 300}
    assert env.client.post(f"/api/public/photos/{CODE}/mine", json=body).json()["uploads_open"] is True
    body["tz_offset_min"] = 480           # Los Angeles: still 3:30 PM there
    assert env.client.post(f"/api/public/photos/{CODE}/mine", json=body).json()["uploads_open"] is False


# ── Consent (board 11/16, option C) ─────────────────────────────────────────────
def test_keep_my_photos_private_takes_the_share_flag_off_all_her_photos(env):
    a1 = env.db.add(key=KEY_A, status="approved")
    b1 = env.db.add(key=KEY_B, status="approved")
    shown = {p["id"]: p for p in env.client.get(f"/api/public/photos/{CODE}").json()["photos"]}
    assert shown[str(a1["id"])]["shareable"] is True

    r = env.client.post(f"/api/public/photos/{CODE}/privacy", json={"guest_key": KEY_A, "private": True})
    assert r.status_code == 200 and r.json()["private"] is True
    shown = {p["id"]: p for p in env.client.get(f"/api/public/photos/{CODE}").json()["photos"]}
    assert shown[str(a1["id"])]["shareable"] is False
    assert shown[str(b1["id"])]["shareable"] is True       # another guest's photo is untouched
    mine = env.client.post(f"/api/public/photos/{CODE}/mine", json={"guest_key": KEY_A}).json()
    assert mine["keep_private"] is True and mine["photos"][0]["shareable"] is False

    # Switched back off: shareable again.
    env.client.post(f"/api/public/photos/{CODE}/privacy", json={"guest_key": KEY_A, "private": False})
    shown = {p["id"]: p for p in env.client.get(f"/api/public/photos/{CODE}").json()["photos"]}
    assert shown[str(a1["id"])]["shareable"] is True


def test_the_switch_set_at_upload_rides_on_the_new_photo(env):
    assert upload(env, webp(), ctype="image/webp", private="1").status_code == 200
    assert env.db.photos[0]["uploader_private"] is True
    assert upload(env, webp(), ctype="image/webp").status_code == 200
    assert env.db.photos[1]["uploader_private"] is False


def test_the_private_switch_needs_her_own_key(env):
    row = env.db.add(key=KEY_A, status="approved")
    r = env.client.post(f"/api/public/photos/{OTHER_CODE}/privacy", json={"guest_key": KEY_A, "private": True})
    assert r.status_code == 404
    env.client.post(f"/api/public/photos/{CODE}/privacy", json={"guest_key": KEY_B, "private": True})
    assert row["uploader_private"] is False


def test_the_host_can_stop_sharing_one_photo(env):
    row = env.db.add(status="approved")
    other = env.db.add(status="approved", key=KEY_B)
    r = env.client.post(f"/api/events/e1/guest-photos/{row['id']}/sharing", json={"allowed": False})
    assert r.status_code == 200
    assert r.json()["photo"]["share_blocked"] is True and r.json()["photo"]["shareable"] is False
    shown = {p["id"]: p for p in env.client.get(f"/api/public/photos/{CODE}").json()["photos"]}
    assert shown[str(row["id"])]["shareable"] is False and shown[str(other["id"])]["shareable"] is True
    # Allowed again.
    env.client.post(f"/api/events/e1/guest-photos/{row['id']}/sharing", json={"allowed": True})
    shown = {p["id"]: p for p in env.client.get(f"/api/public/photos/{CODE}").json()["photos"]}
    assert shown[str(row["id"])]["shareable"] is True


def test_the_host_sees_both_consent_flags(env):
    env.db.add(status="approved")["uploader_private"] = True
    p, = env.client.get("/api/events/e1/guest-photos").json()["photos"]
    assert p["uploader_private"] is True and p["share_blocked"] is False and p["shareable"] is False


def test_an_unapproved_photo_is_never_shareable(env):
    env.db.add(status="pending")
    mine = env.client.post(f"/api/public/photos/{CODE}/mine", json={"guest_key": KEY_A}).json()
    assert mine["photos"][0]["shareable"] is False
    p, = env.client.get("/api/events/e1/guest-photos").json()["photos"]
    assert p["shareable"] is False


def test_the_sharing_route_is_gated_and_scoped_like_the_others(env):
    row = env.db.add(event_id="e2", status="approved")
    assert env.client.post(f"/api/events/e1/guest-photos/{row['id']}/sharing", json={"allowed": False}).status_code == 404
    assert row["share_blocked"] is False

    async def outsider(*a, **k):
        return {"id": "outsider-9", "via": "supabase"}
    env.mp.setattr(gp, "require_planner", outsider)
    mine = env.db.add(status="approved")
    assert env.client.post(f"/api/events/e1/guest-photos/{mine['id']}/sharing", json={"allowed": False}).status_code == 403
    assert mine["share_blocked"] is False


# ── Account deletion removes the stored photos too ─────────────────────────────
def test_account_deletion_removes_guest_photo_objects_before_the_auth_delete(monkeypatch):
    import httpx
    from app.routers import account as A

    uid = "11111111-1111-4111-8111-111111111111"

    class Conn:
        @asynccontextmanager
        async def transaction(self):
            yield self

        async def execute(self, sql, *args):
            return None

        async def fetchval(self, sql, *args):
            if "pg_trigger" in sql:
                return True
            if "to_regclass('public.guest_photos')" in sql:
                return True
            return None

        async def fetch(self, sql, *args):
            if "storage.objects" in sql:
                return []
            if "from public.guest_photos" in sql:
                assert args[0] == ["event-solo"]
                return [{"storage_path": "event-solo/p1.jpg"}, {"storage_path": "event-solo/p2.jpg"}]
            return [{"id": "event-solo"}]

    conn = Conn()

    @asynccontextmanager
    async def acquire():
        yield conn

    async def pool():
        return types.SimpleNamespace(acquire=acquire)

    async def signed_in(*args):
        return {"id": uid, "via": "supabase"}

    calls = []

    async def request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return httpx.Response(204)

    @asynccontextmanager
    async def http(*args, **kwargs):
        yield types.SimpleNamespace(request=request)

    monkeypatch.setattr(A, "require_planner", signed_in)
    monkeypatch.setattr(A, "get_pool", pool)
    monkeypatch.setattr(A, "SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setattr(A, "SUPABASE_SERVICE_ROLE_KEY", "server-secret")
    monkeypatch.setattr(A.httpx, "AsyncClient", http)
    asyncio.run(A.delete_account(A.DeleteAccountRequest(confirmation="DELETE"), "Bearer token"))
    assert calls[0][1].endswith("/storage/v1/object/guest-photos")
    assert calls[0][2]["json"] == {"prefixes": ["event-solo/p1.jpg", "event-solo/p1.t.jpg",
                                                "event-solo/p2.jpg", "event-solo/p2.t.jpg"]}
    assert calls[-1][1].endswith("/auth/v1/admin/users/" + uid)


# ── Gallery sizes (11/16/2026) ─────────────────────────────────────────────────
def test_a_big_photo_is_stored_at_2560_and_its_thumbnail_at_480(env):
    big = io.BytesIO(); Image.new("RGB", (4032, 3024), (180, 120, 60)).save(big, "JPEG", quality=90)
    r = upload(env, big.getvalue())
    assert r.status_code == 200, r.text
    row, = env.db.photos
    (stored, _t), = photos_only(env)
    assert Image.open(io.BytesIO(stored)).size == (2560, 1920) == (row["width"], row["height"])
    thumb, _t = env.store.objects[row["storage_path"][:-4] + ".t.jpg"]
    assert Image.open(io.BytesIO(thumb)).size == (480, 360)
    assert len(thumb) < len(stored) / 5
    p = r.json()["photo"]
    assert p["thumb"].endswith(".t.jpg?token=t") and (p["width"], p["height"]) == (2560, 1920)


def test_a_small_photo_is_never_enlarged(env):
    upload(env, webp(), ctype="image/webp")
    row, = env.db.photos
    assert max(row["width"], row["height"]) <= gp.THUMB_EDGE


def test_a_photo_stored_before_thumbnails_falls_back_to_itself_in_the_grid(env):
    env.db.add(status="approved")
    real = env.store.sign
    async def no_thumbs(paths, ttl):
        return {k: v for k, v in (await real(paths, ttl)).items() if not k.endswith(".t.jpg")}
    env.mp.setattr(gp, "_storage_sign", no_thumbs)
    p, = env.client.get(f"/api/public/photos/{CODE}").json()["photos"]
    assert p["thumb"] == p["url"] and p["url"]
