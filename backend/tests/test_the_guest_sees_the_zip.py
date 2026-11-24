"""THE GUEST SEES THE ZIP (owner's invite, 11/24/2026).

The invite email's WHERE read "street, City, ST" with no ZIP. The emails read
the one place line (outward.place_line, the server copy of the app's
formatVenueAddress, both pinned to outwardLines.fixture.json). With venueZip
stored, the invite's facts, its plain text, its picture's card and the helper
ask each print it. Made-up places only.
"""
from app.invite_email import compose_invite_email
from app.outward import place_line
from app.routers.helper_link import compose_helper_email

HOME = {"name": "Aunt Rosa's Dinner", "type": "Dinner Party", "recordKind": "host_event", "date": "2027-12-04",
        "startTime": "18:00", "startTimeSource": "host", "venueKind": "home", "venueAddress": "42 Elm Ct",
        "venueCity": "Springfield", "venueState": "VA", "venueZip": "22150", "rsvpCode": "Code123456789012"}
LINE = "42 Elm Ct, Springfield, VA 22150"


def test_the_invite_email_prints_the_zip():
    html, text = compose_invite_email(HOME, "", None, "Rosa Diaz", None)
    assert f"Where: {LINE}" in text
    assert LINE in html
    where = next(f for f in html.card["facts"] if f["label"] == "Where")
    assert where["text"] == LINE


def test_the_helper_ask_prints_the_zip():
    helper = {"helperName": "Sam Roe", "hostName": "Rosa Diaz", "eventName": HOME["name"], "eventDate": HOME["date"],
              "startTime": "18:00", "venue": "", "venueAddress": "42 Elm Ct", "venueCity": "Springfield",
              "venueState": "VA", "venueZip": "22150", "venueKind": "home",
              "jobs": [{"kind": "task", "label": "Bring the ice"}]}
    _subject, html, text = compose_helper_email(HOME, helper, "https://x.test/hostv2/?helper=c", None)
    assert f"Where: {LINE}" in text and LINE in html


def test_a_town_and_a_zip_with_no_street():
    ev = {"recordKind": "host_event", "venueCity": "Springfield", "venueState": "VA", "venueZip": "22150"}
    assert place_line(ev) == "At home in Springfield, VA 22150"
    assert place_line(ev, private_home="town") == "At home in Springfield, VA 22150"
