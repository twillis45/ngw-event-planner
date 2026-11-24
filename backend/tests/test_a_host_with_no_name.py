"""A HOST WITH NO NAME IS "YOUR HOST", NEVER "YOUR" (owner's invite, 11/24/2026).

The app signs an email "Your host" when the host's profile has no name
(HostShellV2: author_name = profile.name || 'Your host'). The invite email took
the first word of the sender as her first name, so the guest read "Only Your
sees your reply.", "A NOTE FROM YOUR" and "Sent by Your host with No Guesswork
Events." One reader, outward.real_host_name, now says whether a sender names a
person; every outbound template asks it. Fictional sample data only.
"""
import pytest

from app.outward import real_host_name
from app.invite_email import compose_invite_email
from app.guest_notices import compose_announcement, compose_reply_notice
from app.routers.communication import compose_message_email
from app.routers.helper_link import compose_helper_email
from app.routers.cohosts import compose_cohost_invite

EV = {"name": "Aunt Rosa’s Dinner", "type": "Dinner Party", "date": "2027-12-04", "startTime": "18:00",
      "startTimeSource": "host", "venueKind": "home", "venueAddress": "42 Elm Ct", "venueCity": "Springfield",
      "venueState": "VA", "venueZip": "22150", "rsvpCode": "Code123456789012"}
NOTE = "Bring a sweater, we eat on the porch."
NO_NAMES = ["Your host", "your host", "  Your   host ", "The host", "Host", "", None]


@pytest.mark.parametrize("v", NO_NAMES)
def test_a_placeholder_is_no_name(v):
    assert real_host_name(v) == ""


@pytest.mark.parametrize("v", ["Rosa Diaz", "Rosa", "Hosteen Begay", "Your Hostess Ann"])
def test_a_real_name_is_kept(v):
    assert real_host_name(v) == " ".join(v.split())


def _all(html, text):
    return html + "\n" + text


@pytest.mark.parametrize("sender", ["Your host", "", None])
def test_the_invite_with_no_host_name(sender):
    html, text = compose_invite_email(EV, NOTE, "Sam", sender, "https://x.test/stop")
    both = _all(html, text)
    assert "Only your host sees your reply." in html
    assert "A note from your host" in both
    assert "You’re invited to" in html
    assert "Sent with No Guesswork Events." in both
    for bad in ("Only Your ", "A note from Your", "Sent by Your", "Your host invites you", "Hosted by Your",
                "Sent by your host"):
        assert bad not in both, bad


def test_the_invite_with_a_host_name_is_unchanged():
    html, text = compose_invite_email(EV, NOTE, "Sam", "Rosa Diaz", "https://x.test/stop")
    both = _all(html, text)
    assert "Only Rosa sees your reply." in html
    assert "A note from Rosa" in both
    assert "Rosa Diaz invites you to" in both
    assert "Sent by Rosa Diaz with No Guesswork Events." in both


@pytest.mark.parametrize("sender", ["Your host", ""])
def test_a_message_with_no_host_name(sender):
    html, text = compose_message_email(EV, "See you Saturday.", "Sam", sender, None)
    both = _all(html, text)
    assert "A message from your host" in both
    assert "Sent with No Guesswork Events." in both
    assert "Sent by Your" not in both and "from Your host" not in both


def test_a_message_with_a_host_name_is_unchanged():
    html, text = compose_message_email(EV, "See you Saturday.", "Sam", "Rosa Diaz", None)
    assert "A message from Rosa Diaz" in html and "Sent by Rosa Diaz with No Guesswork Events." in text


@pytest.mark.parametrize("compose", [compose_reply_notice, compose_announcement])
@pytest.mark.parametrize("host", ["", "Your", "Your host", None])
def test_guest_notices_with_no_host_name(compose, host):
    _from, subject, html, _headers, text = compose(host, EV["name"], "We moved it to 6.", "Code123456789012", "tok")
    both = _all(html, text) + "\n" + subject
    for bad in ("Sent by Your", "reach Your", "when Your", "from Your", "Sent by your host"):
        assert bad not in both, bad
    assert "Sent with No Guesswork Events." in both
    assert "reach your host" in both


def test_guest_notices_with_a_host_name_are_unchanged():
    _from, subject, html, _h, text = compose_reply_notice("Rosa", EV["name"], "Yes.", "Code123456789012", "tok")
    assert subject == f"Rosa answered your question — {EV['name']}"
    assert "Sent by Rosa with No Guesswork Events." in text and "reach Rosa" in text


@pytest.mark.parametrize("host", ["Your host", ""])
def test_the_helper_ask_with_no_host_name(host):
    helper = {"helperName": "Sam Roe", "hostName": host, "eventName": EV["name"], "eventDate": EV["date"],
              "startTime": "18:00", "jobs": [{"kind": "task", "label": "Bring the ice"}]}
    _subject, html, text = compose_helper_email(EV, helper, "https://x.test/hostv2/?helper=c", None)
    both = _all(html, text)
    assert "You’re asked to help" in both
    assert "Sent with No Guesswork Events." in both
    assert "Your asked" not in both and "Sent by Your" not in both and "Sent by your host" not in both


def test_the_cohost_invite_with_no_host_name():
    html, text = compose_cohost_invite(EV["name"], "sam@example.test", "Your host")
    assert "Sent with No Guesswork Events." in text and "Sent by Your" not in _all(html, text)


# ── NO NAME ON THE PROFILE: THE EVENT'S HOST LINE (owner ruling, 11/24/2026) ──
# When the profile names nobody, the email reads the event's host line
# (hostNameFor's fields: hostName, hostNames, host) when it names a person;
# "your host" only when nothing does. The profile's name still comes first.
LINE = {**EV, "hostName": "Rosa Diaz"}


def test_the_helper_takes_the_first_real_name():
    assert real_host_name("Your host", "Rosa Diaz") == "Rosa Diaz"
    assert real_host_name("Casey Lin", "Rosa Diaz") == "Casey Lin"
    assert real_host_name("", None, "your host") == ""


@pytest.mark.parametrize("sender,ev,first,full", [
    ("Casey Lin", LINE, "Casey", "Casey Lin"),            # the profile's name
    ("Your host", LINE, "Rosa", "Rosa Diaz"),             # the host line only
    ("", {**EV, "host": "Rosa Diaz"}, "Rosa", "Rosa Diaz"),
    ("Your host", EV, None, None),                        # neither
])
def test_the_invite_reads_the_host_line_when_the_profile_has_no_name(sender, ev, first, full):
    html, text = compose_invite_email(ev, NOTE, "Sam", sender, None)
    both = _all(html, text)
    if first:
        assert f"Only {first} sees your reply." in html
        assert f"A note from {first}" in both
        assert f"{full} invites you to" in both
        assert f"Sent by {full} with No Guesswork Events." in both
    else:
        assert "Only your host sees your reply." in html and "Sent with No Guesswork Events." in both


@pytest.mark.parametrize("sender,ev,full", [
    ("Casey Lin", LINE, "Casey Lin"), ("Your host", LINE, "Rosa Diaz"), ("", EV, None)])
def test_the_message_reads_the_host_line_when_the_profile_has_no_name(sender, ev, full):
    html, text = compose_message_email(ev, "See you Saturday.", "Sam", sender, None)
    if full:
        assert f"A message from {full}" in html and f"Sent by {full} with No Guesswork Events." in text
    else:
        assert "A message from your host" in html and "Sent with No Guesswork Events." in text


def test_the_cohost_invite_reads_the_host_line():
    # cohosts.py passes the event's host line (hostName/hostNames); there is no profile on the server.
    _html, text = compose_cohost_invite(EV["name"], "sam@example.test", "Rosa Diaz")
    assert "Sent by Rosa Diaz with No Guesswork Events." in text
