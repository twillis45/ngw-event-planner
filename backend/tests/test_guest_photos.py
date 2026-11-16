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
               "content_type": "image/jpeg"}
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
            (pid, event_id, code, key, name, path, ctype, size, w, h) = a
            row = {"id": pid, "event_id": event_id, "rsvp_code": code, "guest_key": key,
                   "guest_name": name, "storage_path": path, "content_type": ctype,
                   "byte_size": size, "width": w, "height": h, "status": "pending",
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
    monkeypatch.setattr(gp, "_today", lambda: TODAY)
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


def headers(key=KEY_A, name="Jordan Avery", ctype="image/jpeg"):
    h = {"Content-Type": ctype}
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
    (stored, ctype), = env.store.objects.values()
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


def test_png_text_chunks_are_stripped_and_png_and_webp_are_reencoded_as_jpeg(env):
    raw = png_with_text()
    assert b"Secret Person" in raw
    assert upload(env, raw, ctype="image/png").status_code == 200
    assert upload(env, webp(), ctype="image/webp").status_code == 200
    stored = [d for d, _t in env.store.objects.values()]
    assert len(stored) == 2
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
    assert len(env.store.removed) == 1 and env.store.objects == {}
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
    assert set(shown[0]) == {"id", "url", "created_at"}

    assert env.client.post(f"/api/events/e1/guest-photos/{pid}/hide").status_code == 200
    assert env.client.get(f"/api/public/photos/{CODE}").json()["photos"] == []


def test_signed_urls_are_server_minted_with_a_short_ttl(env):
    env.db.add(status="approved")
    env.client.get(f"/api/public/photos/{CODE}")
    paths, ttl = env.store.sign_calls[-1]
    assert ttl == gp.SIGNED_URL_TTL_SECONDS <= 900
    assert paths == [env.db.photos[0]["storage_path"]]


# ── Deleting ───────────────────────────────────────────────────────────────────
def test_a_guest_deletes_her_own_photo_and_its_object(env):
    upload(env, webp(), ctype="image/webp")
    row = env.db.photos[0]
    r = env.client.post(f"/api/public/photos/{CODE}/{row['id']}/delete", json={"guest_key": KEY_A})
    assert r.status_code == 200 and r.json() == {"ok": True, "deleted": True}
    assert env.db.photos == [] and env.store.removed == [row["storage_path"]]


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
    assert env.store.removed == [row["storage_path"]]


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
    assert env.store.removed == [gone["storage_path"]]
    assert env.db.photos == [keep]


def test_purge_keeps_rows_when_storage_refuses(env):
    row = env.db.add()
    row["due"] = True
    env.store.fail_remove = True
    with pytest.raises(RuntimeError):
        asyncio.run(gp.purge_old_guest_photos())
    assert env.db.photos == [row]


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
    assert calls[0][2]["json"] == {"prefixes": ["event-solo/p1.jpg", "event-solo/p2.jpg"]}
    assert calls[-1][1].endswith("/auth/v1/admin/users/" + uid)
