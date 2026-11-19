"""The invite email carries the host's invitation as a PICTURE (owner,
11/19/2026: "That dark invite sent is gross, doesn't resemble my invitations"
then "Build the invitation picture email"). Mail apps in dark mode recolor an
email's HTML, never a picture. app/routers/invite_cards.py, app/invite_email.py."""
import asyncio
import io
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

import app.routers.invite_cards as ic
from app.invite_email import compose_invite_email
from test_an_invite_can_be_stopped import GUEST, env  # noqa: F401  (the route fixture)

EV = {"name": "My Friendsgiving", "date": "2026-11-26", "startTime": "16:00", "startTimeSource": "host",
      "venue": "Vida's place", "rsvpCode": "Code123456789012"}
CARD = "https://api.test/api/public/invite-card/Code123456789012?v=abc123def456"


def jpeg(w=1200, h=900):
    out = io.BytesIO(); Image.new("RGB", (w, h), (247, 241, 230)).save(out, "JPEG"); return out.getvalue()


# ── The email ─────────────────────────────────────────────────────────────────
def test_with_a_picture_the_email_leads_with_it_and_it_opens_the_invitation():
    html, text = compose_invite_email(EV, "See you there!", "Kesha", "Vida Reyes", None, card_url=CARD)
    assert f'src="{CARD}"' in html
    a = html.index('<a href="https://twillis45.github.io/ngw-event-planner/hostv2/?rsvp=Code123456789012"')
    assert a < html.index(CARD)                                            # the picture is the link
    assert 'alt="Invitation: My Friendsgiving. Thursday, November 26 · 4:00 PM. Vida&#x27;s place. Hosted by Vida Reyes"' in html
    assert ">When<" not in html                                            # the picture carries the facts; no second card
    for b in ("Open your invitation", "Or pick your answer", "&amp;reply=Yes", "&amp;reply=No", "&amp;reply=Maybe", "See you there!"):
        assert b in html
    assert "When: Thursday, November 26 · 4:00 PM" in text and CARD not in text   # plain text keeps the facts


def test_without_a_picture_the_html_card_stands_in():
    html, _ = compose_invite_email(EV, "", None, "Vida Reyes", None)
    assert "<img" not in html and ">When<" in html and "You’re invited" in html


# ── The route picks the picture when one is stored ────────────────────────────
def test_the_invite_send_uses_the_stored_picture(env, monkeypatch):  # noqa: F811
    import app.routers.communication as cm
    async def version(event_id): return "abc123def456"
    monkeypatch.setattr(cm, "stored_card_version", version)
    env.db["event"].update(EV)
    r = env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "message_type": "standard", "body": "Come!", "deliver_email": True, "invite": True, "invite_card_version": "abc123def456",
        "recipient_email": GUEST, "recipient_name": "Guest One", "subject": "You’re invited", "author_name": "Vida Reyes"})
    assert r.status_code == 200
    assert "/api/public/invite-card/Code123456789012?v=abc123def456" in env.sent[0]["body_html"]


def test_a_stored_picture_that_is_not_the_one_just_made_is_never_sent(env, monkeypatch):  # noqa: F811
    # The host changed the venue and the new picture failed to upload: the old
    # one, with the old venue, must not go out. The HTML card does.
    import app.routers.communication as cm
    async def version(event_id): return "oldoldoldold"
    monkeypatch.setattr(cm, "stored_card_version", version)
    env.db["event"].update(EV)
    for extra in ({"invite_card_version": "newnewnewnew"}, {}):
        env.sent.clear()
        env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
            "message_type": "standard", "body": "Come!", "deliver_email": True, "invite": True, **extra,
            "recipient_email": GUEST, "recipient_name": "Guest One", "subject": "You’re invited", "author_name": "Vida Reyes"})
        assert "invite-card" not in env.sent[0]["body_html"] and ">When<" in env.sent[0]["body_html"]


def test_no_stored_picture_sends_the_html_card(env, monkeypatch):  # noqa: F811
    import app.routers.communication as cm
    async def none(event_id): return None
    monkeypatch.setattr(cm, "stored_card_version", none)
    env.db["event"].update(EV)
    env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "message_type": "standard", "body": "Come!", "deliver_email": True, "invite": True,
        "recipient_email": GUEST, "recipient_name": "Guest One", "subject": "You’re invited", "author_name": "Vida Reyes"})
    assert "invite-card" not in env.sent[0]["body_html"] and ">When<" in env.sent[0]["body_html"]


# ── Upload and the public read ────────────────────────────────────────────────
@pytest.fixture
def cards(monkeypatch):
    store = {}
    async def put(path, data): store[path] = data; return True
    async def get(path): return store.get(path)
    async def planner(*a, **k): return {"id": "u1", "via": "supabase"}
    async def access(conn, event_id, principal): return None
    async def resolve(conn, code): return ("ev1", {"name": "x"}) if code == "Code123456789012" else None
    class Pool:
        def acquire(self):
            class Ctx:
                async def __aenter__(s): return object()
                async def __aexit__(s, *a): return False
            return Ctx()
    async def gp(): return Pool()
    monkeypatch.setattr(ic, "_put", put); monkeypatch.setattr(ic, "_get", get)
    monkeypatch.setattr(ic, "require_planner", planner); monkeypatch.setattr(ic, "_assert_event_studio_read", access)
    monkeypatch.setattr(ic, "_resolve_event", resolve); monkeypatch.setattr(ic, "get_pool", gp)
    monkeypatch.setattr(ic, "_storage_configured", lambda: True)
    ic._versions.clear()
    app = FastAPI(); app.include_router(ic.router)
    return types.SimpleNamespace(store=store, c=TestClient(app))


def test_an_uploaded_card_is_re_encoded_stored_and_served_by_invite_code(cards):
    raw = jpeg()
    r = cards.c.post("/api/events/ev1/invite-card", content=raw, headers={"Content-Type": "image/jpeg"})
    assert r.status_code == 200
    stored = cards.store["invite-cards/ev1.jpg"]
    assert stored[:3] == b"\xff\xd8\xff" and stored != raw                # pixels re-encoded, not the bytes sent
    assert r.json()["version"] == ic.card_version(stored)
    assert asyncio.run(ic.stored_card_version("ev1")) == r.json()["version"]
    g = cards.c.get("/api/public/invite-card/Code123456789012")
    assert g.status_code == 200 and g.headers["content-type"] == "image/jpeg" and g.content == stored


def test_only_the_invite_code_reaches_a_card(cards):
    cards.c.post("/api/events/ev1/invite-card", content=jpeg(), headers={"Content-Type": "image/jpeg"})
    assert cards.c.get("/api/public/invite-card/ev1").status_code == 404           # never by event id
    assert cards.c.get("/api/public/invite-card/WrongCode0000000000").status_code == 404


def test_not_a_picture_is_refused(cards):
    r = cards.c.post("/api/events/ev1/invite-card", content=b"<html>hi</html>", headers={"Content-Type": "image/jpeg"})
    assert r.status_code == 415 and cards.store == {}
