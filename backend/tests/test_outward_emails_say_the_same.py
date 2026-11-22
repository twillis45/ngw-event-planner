"""THE EMAILS SAY WHAT THE PAGES SAY (audit 2, lane E P0-4, P1-1, P2-5, P2-6).

The invite email and the helper email printed the venue's name alone and the
first day of a multi-day event; the plain-text invite printed an empty "A note
from Vida:" when the host wrote no note; the reply buttons were 38px tall.
Both emails now read the place line and the days from app/outward.py, the
server's copy of the app's readers. Fictional sample data only.
"""
import re

from app.email_frame import frame
from app.invite_email import compose_invite_email
from app.routers.helper_link import compose_helper_email

WEEKEND = {"name": "Reed Family Reunion", "type": "Family Reunion", "date": "2027-12-13", "endDate": "2027-12-15",
           "startTime": "18:00", "startTimeSource": "host", "venue": "The Boathouse", "venueKind": "venue",
           "venueAddress": "9 Dock Rd", "venueCity": "Annapolis", "venueState": "MD", "venueZip": "21401",
           "rsvpCode": "Code123456789012", "host": "Dana Reed"}
LINE = "The Boathouse, 9 Dock Rd, Annapolis, MD 21401"
DAYS = "Monday, December 13 – Wednesday, December 15"


def test_the_invite_email_names_every_day_and_the_whole_place():
    html, text = compose_invite_email(WEEKEND, "", None, "Dana Reed", None)
    assert f"When: {DAYS} · 6:00 PM" in text
    assert f"Where: {LINE}" in text
    assert "Wednesday, December 15" in html and "9 Dock Rd, Annapolis, MD 21401" in html


def test_the_helper_email_names_every_day_and_the_whole_place():
    helper = {"helperName": "Sam Roe", "hostName": "Dana Reed", "eventName": WEEKEND["name"],
              "eventDate": WEEKEND["date"], "endDate": WEEKEND["endDate"], "startTime": "18:00",
              "venue": "The Boathouse", "venueAddress": "9 Dock Rd", "venueCity": "Annapolis",
              "venueState": "MD", "venueZip": "21401", "venueKind": "venue",
              "jobs": [{"kind": "task", "label": "Bring the ice"}]}
    _subject, html, text = compose_helper_email(WEEKEND, helper, "https://x.test/hostv2/?helper=c", None)
    assert f"When: {DAYS} · 6:00 PM" in text
    assert f"Where: {LINE}" in text
    assert "9 Dock Rd, Annapolis, MD 21401" in html


def test_no_note_means_no_note_heading():
    _html, text = compose_invite_email(WEEKEND, "", None, "Vida Reyes", None)
    assert "A note from" not in text
    _html, text = compose_invite_email(WEEKEND, "  \n\n ", None, "Vida Reyes", None)
    assert "A note from" not in text
    _html, text = compose_invite_email(WEEKEND, "See you there!", None, "Vida Reyes", None)
    assert "A note from Vida:\nSee you there!" in text


def test_every_email_button_is_at_least_44px_tall():
    html, _ = frame(title="X", primary=("Open", "https://x.test"),
                    secondary=[("Yes", "https://x.test/y"), ("No", "https://x.test/n"), ("Maybe", "https://x.test/m")])
    for font, lh, pad in re.findall(r"font:\d+ (\d+(?:\.\d+)?)px/(\d+(?:\.\d+)?) [^;]*;padding:(\d+)px", html):
        assert float(font) * float(lh) + 2 * int(pad) >= 44, (font, lh, pad)


def test_the_cohost_email_opens_the_app_not_the_frozen_shell():
    """E P1-5: "Open the app" went to the site root, the frozen CRA shell."""
    from app.config import APP_BASE_URL
    from app.routers.cohosts import compose_cohost_invite
    _html, text = compose_cohost_invite("Reed Reunion", "cohost@example.test", "Dana Reed")
    assert f"Open the app: {APP_BASE_URL.rstrip('/')}/hostv2/" in text


def test_a_friend_helping_reads_her_role_not_just_helper():
    """E P2-3: the informal vendor row's job read "Helper"; her role is in the name."""
    from app.routers.helper_link import _jobs_by_helper
    from tests._wanda_sample import wanda
    jobs = _jobs_by_helper(wanda())["g5"]["jobs"]
    assert {"kind": "help", "label": "Day-of helper"} in jobs
    data = {"vendors": [{"id": "v1", "name": "Sam Roe", "category": "Photography", "isInformal": True}]}
    assert _jobs_by_helper(data)["helper-sam-roe"]["jobs"] == [{"kind": "help", "label": "Photography"}]


def test_the_helper_emails_i_cant_opens_the_page_ready_to_say_so():
    """E P2-4: "I can't" opened the same page as "I can do it". It now opens it
    on the "can't" answer; a link a mail scanner opens still records nothing."""
    helper = {"helperName": "Sam Roe", "hostName": "Dana Reed", "eventName": "X", "eventDate": "2027-12-13",
              "jobs": [{"kind": "task", "label": "Ice"}]}
    _s, html, _t = compose_helper_email({}, helper, "https://x.test/hostv2/?helper=c0de", None)
    assert 'href="https://x.test/hostv2/?helper=c0de&amp;answer=declined"' in html
