"""A host's message, and an invite with no uploaded card, lead with the
server's picture of the card (owner, 11/20/2026: "Do picture for all
emails"). The host's own words stay live HTML, any length, copyable. The
`env` fixture is the message-route fixture in test_an_invite_can_be_stopped."""
import app.email_pictures as ep
from app.email_frame import paragraphs_html
import app.routers.communication as cm
from _pictures import no_picture, picture, pics  # noqa: F401
from test_an_invite_can_be_stopped import GUEST, env  # noqa: F401

LONG = "Can you bring ice?\n" + "We have lots of guests coming, so more is better. " * 20


def _send(env, **extra):
    return env.c.post("/api/events/ev1/communication/channels/CLIENT/messages", json={
        "message_type": "standard", "body": LONG, "deliver_email": True, "recipient_email": GUEST,
        "recipient_name": "Guest One", "subject": "Ice", "author_name": "Vida Reyes", **extra})


def test_a_message_is_sent_with_its_picture_and_the_hosts_words_live(env, pics):  # noqa: F811
    assert _send(env).status_code == 200
    html = env.sent[0]["body_html"]
    token, alt = picture(html)
    assert ep.card_path(token) in pics and alt == "A message from Vida Reyes. Reyes Friendsgiving."
    assert paragraphs_html(LONG) in html                              # every word, live
    assert "Stop emails about this event" in html
    assert env.sent[0]["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_a_message_goes_with_the_html_card_when_storage_is_off(env):  # noqa: F811
    assert _send(env).status_code == 200
    html = env.sent[0]["body_html"]
    assert no_picture(html) and "Reyes Friendsgiving" in html and "Stop emails about this event" in html


def test_an_invite_without_an_uploaded_card_gets_the_servers_picture(env, pics, monkeypatch):  # noqa: F811
    async def none(event_id): return None
    monkeypatch.setattr(cm, "stored_card_version", none)
    env.db["event"].update({"date": "2026-11-21", "startTime": "16:00", "venue": "Vida's", "rsvpCode": "Code123456789012"})
    assert _send(env, invite=True).status_code == 200
    html = env.sent[0]["body_html"]
    _token, alt = picture(html)
    assert alt.startswith("You’re invited. Vida Reyes invites you to. Reyes Friendsgiving. When: Saturday, November 21")
    for b in ("Open your invitation", "&amp;reply=Yes", "&amp;reply=No", "&amp;reply=Maybe"):
        assert b in html
