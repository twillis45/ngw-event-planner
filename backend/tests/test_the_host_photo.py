"""THE HOST'S PHOTO ON HER INVITE (owner, 11/24/2026: renders r3-2, r3-3, r3-4).

One photo per account, opt-in. It reuses the guest-photo pipeline the invite
picture already uses (guest_photos.clean_photo, the private guest-photos
bucket), stored at host-photos/{studio_id}.jpg as a square of about 400x400.
Guests reach it only by the invite's long code, like the invite picture:

  POST   /api/host-photo                    host; the photo as the raw body.
  GET    /api/host-photo                    host; her own photo, for her screens.
  DELETE /api/host-photo                    host; the file is gone.
  GET    /api/public/host-photo/{rsvp_code} public; by invite code only.

The profile (lib/api/profile.js) keeps only the version; the public invite
carries it as `hostPhoto` so the page knows there is a photo and which.

Every outward call is stubbed: storage is a dict, the pool a fake.
"""
import asyncio
import io
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

import app.routers.host_photos as hp
from app.routers import rsvp as R

STUDIO = "11111111-2222-3333-4444-555555555555"
CODE = "host-photo-invite-code-000001"


def plain_jpeg(w=900, h=600, color=(200, 160, 120)):
    """A plain made-up test image: one flat color, never a person."""
    out = io.BytesIO()
    Image.new("RGB", (w, h), color).save(out, "JPEG")
    return out.getvalue()


@pytest.fixture
def photos(monkeypatch):
    store = {}
    async def put(path, data): store[path] = data; return True
    async def get(path): return store.get(path)
    async def remove(paths):
        for p in paths:
            store.pop(p, None)
        return True
    async def planner(*a, **k): return {"id": "99999999-8888-7777-6666-555555555555", "via": "supabase"}
    async def resolve(conn, code): return ("ev1", {"name": "x"}) if code == CODE else None

    class Conn:
        async def fetchrow(self, sql, *a):
            if "studio_members" in sql:
                return {"studio_id": STUDIO}
            if "from public.events" in sql:
                return {"studio_id": STUDIO}
            return None

    class Pool:
        def acquire(self):
            class Ctx:
                async def __aenter__(s): return Conn()
                async def __aexit__(s, *a): return False
            return Ctx()
    async def gp(): return Pool()
    monkeypatch.setattr(hp, "_put", put); monkeypatch.setattr(hp, "_get", get)
    monkeypatch.setattr(hp, "_storage_remove", remove)
    monkeypatch.setattr(hp, "require_planner", planner)
    monkeypatch.setattr(hp, "_resolve_event", resolve); monkeypatch.setattr(hp, "get_pool", gp)
    monkeypatch.setattr(hp, "_storage_configured", lambda: True)
    app = FastAPI(); app.include_router(hp.router)
    return types.SimpleNamespace(store=store, c=TestClient(app))


def test_a_photo_is_cleaned_cropped_square_and_stored_under_the_studio(photos):
    raw = plain_jpeg(900, 600)
    r = photos.c.post("/api/host-photo", content=raw, headers={"Content-Type": "image/jpeg"})
    assert r.status_code == 200, r.text
    stored = photos.store[f"host-photos/{STUDIO}.jpg"]
    assert stored[:3] == b"\xff\xd8\xff" and stored != raw            # re-encoded pixels, not the bytes sent
    img = Image.open(io.BytesIO(stored))
    assert img.size == (400, 400)                                   # square, about 400x400
    assert r.json()["version"] == hp.photo_version(stored)
    assert len(photos.store) == 1


def test_the_host_reads_her_own_and_a_guest_reads_it_by_invite_code_only(photos):
    photos.c.post("/api/host-photo", content=plain_jpeg(), headers={"Content-Type": "image/jpeg"})
    mine = photos.c.get("/api/host-photo")
    assert mine.status_code == 200 and mine.headers["content-type"] == "image/jpeg"
    g = photos.c.get(f"/api/public/host-photo/{CODE}")
    assert g.status_code == 200 and g.content == mine.content
    assert g.headers["x-content-type-options"] == "nosniff"
    assert photos.c.get("/api/public/host-photo/ev1").status_code == 404                 # never by event id
    assert photos.c.get("/api/public/host-photo/WrongCode000000000000").status_code == 404


def test_remove_deletes_the_file(photos):
    photos.c.post("/api/host-photo", content=plain_jpeg(), headers={"Content-Type": "image/jpeg"})
    r = photos.c.delete("/api/host-photo")
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert photos.store == {}
    assert photos.c.get(f"/api/public/host-photo/{CODE}").status_code == 404
    assert photos.c.get("/api/host-photo").status_code == 404


def test_not_a_photo_is_refused_and_nothing_is_stored(photos):
    r = photos.c.post("/api/host-photo", content=b"<html>hi</html>", headers={"Content-Type": "image/jpeg"})
    assert r.status_code == 415 and photos.store == {}


def test_a_small_photo_is_not_blown_up(photos):
    photos.c.post("/api/host-photo", content=plain_jpeg(120, 200), headers={"Content-Type": "image/jpeg"})
    img = Image.open(io.BytesIO(photos.store[f"host-photos/{STUDIO}.jpg"]))
    assert img.size == (120, 120)


# ── The public invite carries the version, and only a version ─────────────────
def _public(data, host_photo):
    class Conn:
        async def fetchrow(self, sql, *a):
            return {"id": "ev-1", "data": data, "host_photo": host_photo}
    return asyncio.run(R._resolve_event(Conn(), CODE))[1]


def test_the_invite_carries_the_hosts_photo_version():
    pub = _public({"name": "Supper", "rsvpCode": CODE}, "abc123def456")
    assert pub["hostPhoto"] == "abc123def456"


def test_no_photo_means_no_field_and_a_stray_value_is_never_shipped():
    assert "hostPhoto" not in _public({"name": "Supper", "rsvpCode": CODE}, None)
    # The event's own JSON cannot set it: only the account's photo counts.
    assert "hostPhoto" not in _public({"name": "Supper", "rsvpCode": CODE, "hostPhoto": "abc123def456"}, None)
    # Anything that is not a version (a URL, a data: image) never reaches a guest.
    for bad in ("https://example.test/me.jpg", "data:image/jpeg;base64,AAAA", "x" * 40):
        assert "hostPhoto" not in _public({"name": "Supper", "rsvpCode": CODE}, bad)


def test_the_resolver_reads_the_version_from_the_account_in_the_same_query():
    seen = []
    class Conn:
        async def fetchrow(self, sql, *a):
            seen.append(sql)
            return {"id": "ev-1", "data": {"name": "Supper", "rsvpCode": CODE}, "host_photo": None}
    asyncio.run(R._resolve_event(Conn(), CODE))
    assert len(seen) == 1
    assert "studio_settings" in seen[0] and "hostPhoto" in seen[0] and "data->>'rsvpCode'" in seen[0]


# THE EMAIL PICTURE DRAWS THE PHOTO (owner, 11/24/2026, follow-on item 6). The
# invite card is drawn on a canvas in the host's browser (hostv2
# inviteCardImage.js) and uploaded; a cross-origin image without CORS taints the
# canvas and the upload fails. So the photo routes allow cross-origin image use.
def test_the_public_photo_allows_cross_origin_image_use(photos):
    photos.c.post("/api/host-photo", content=plain_jpeg(), headers={"Content-Type": "image/jpeg"})
    r = photos.c.get(f"/api/public/host-photo/{CODE}", headers={"Origin": "https://example.com"})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "*"
    assert r.headers.get("cross-origin-resource-policy") == "cross-origin"
