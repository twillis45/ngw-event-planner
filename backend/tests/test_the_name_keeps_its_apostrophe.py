"""THE NAME KEEPS ITS APOSTROPHE (owner's invite, 11/24/2026).

The owner's invite email read "Mom Lindas …" for a name typed with an
apostrophe. Round trip on the server: the name as saved, then what each
outbound surface prints. A straight ' and a curly ’ both. The HTML escapes the
straight one once (&#x27;, which every mail app shows as '), never twice, and
the plain-text part, the subject and the card's picture carry it as typed.
Made-up names only.
"""
import asyncio
import html as _html

import pytest

import app.routers.rsvp as R
from app.guest_notices import compose_announcement, compose_reply_notice
from app.invite_email import compose_invite_email
from app.routers.communication import compose_message_email
from app.routers.helper_link import compose_helper_email
from tests.test_rsvp import FakeConn

NAMES = ["Aunt Rosa's Dinner", "Aunt Rosa’s Dinner"]


def _ev(name):
    return {"name": name, "type": "Dinner Party", "recordKind": "host_event", "date": "2027-12-04",
            "startTime": "18:00", "startTimeSource": "host", "venueKind": "home", "venueAddress": "42 Elm Ct",
            "venueCity": "Springfield", "venueState": "VA", "venueZip": "22150", "rsvpCode": "c" * R.MIN_CODE_LEN}


def _shows(html, name):
    """The name is in the HTML as a mail app shows it, escaped once."""
    assert _html.escape(name) in html
    assert "&amp;#x27;" not in html and "&amp;#39;" not in html


@pytest.mark.parametrize("name", NAMES)
def test_the_invite_email(name):
    html, text = compose_invite_email(_ev(name), "", None, "Rosa Diaz", None)
    _shows(html, name)
    assert f"Rosa Diaz invites you to {name}" in text
    assert html.card["title"] == name                      # the card's picture draws this


@pytest.mark.parametrize("name", NAMES)
def test_the_invite_email_with_its_picture(name):
    html, _text = compose_invite_email(_ev(name), "", None, "Rosa Diaz", None, card_url="https://x.test/c.jpg")
    assert _html.escape(f"Invitation: {name}") in html      # the picture's alt text
    assert "&amp;#x27;" not in html


@pytest.mark.parametrize("name", NAMES)
def test_a_message_and_the_guest_notices(name):
    html, text = compose_message_email(_ev(name), "See you.", "Sam", "Rosa Diaz", None)
    _shows(html, name)
    assert name in text
    for compose in (compose_reply_notice, compose_announcement):
        _from, subject, html, _h, text = compose("Rosa", name, "Yes.", "c" * 16, "tok")
        assert subject.endswith(name)
        _shows(html, name)
        assert name in text


@pytest.mark.parametrize("name", NAMES)
def test_the_helper_ask(name):
    helper = {"helperName": "Sam Roe", "hostName": "Rosa Diaz", "eventName": name, "eventDate": "2027-12-04",
              "jobs": [{"kind": "task", "label": "Bring the ice"}]}
    subject, html, text = compose_helper_email(_ev(name), helper, "https://x.test/hostv2/?helper=c", None)
    assert subject == f"Your job for {name}"
    _shows(html, name)
    assert name in text


@pytest.mark.parametrize("name", NAMES)
def test_the_guest_page_is_sent_the_name_as_saved(name):
    conn = FakeConn({"id": "ev-1", "data": _ev(name)})
    _id, public = asyncio.run(R._resolve_event(conn, "c" * R.MIN_CODE_LEN))
    assert public["name"] == name
