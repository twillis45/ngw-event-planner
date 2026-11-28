"""THE HOST'S OWN EMAILS WEAR THE APP'S LOOK (owner, 11/28/2026: "Yes, fix both,
match the app's look").

The reply alert reached the demo inbox with a small orange all-caps "YOUR PLAN"
label over a serif title (the invitation's stationery), and its footer said to
"tap Turn off", a button the app does not have: the switch is "Tell me when
someone replies" under Guests, ⋯ More. The emails that reach the host about
their own plan (the matte rows of THEME_FOR) now wear the host app's look
(UX_12: no eyebrows, the system sans at weight 800, -0.02em), in the HTML and
in the stored card picture; a label that carries news ("One week to go") stays
as a plain sentence-case line. A guest's email (paper) is unchanged.
"""
from datetime import date

from app import host_alerts, host_reminders, email_card
from app.email_frame import frame, SERIF


def test_reply_alert_has_no_label_and_a_sans_title():
    _subject, html, text = host_alerts.compose("rsvp", "Ada Pine", "Thanksgiving at ours", "Yes", "ev1")
    assert "text-transform:uppercase" not in html
    assert "YOUR PLAN" not in text and "Your plan" not in text.splitlines()[0:2]
    assert SERIF not in html
    assert "font:800 30px" in html and "letter-spacing:-.02em" in html


def test_reply_alert_footer_names_the_real_switch():
    _subject, html, text = host_alerts.compose("rsvp", "Ada Pine", "Thanksgiving at ours", "Yes", "ev1")
    assert "Turn off" not in text and "Turn off" not in html
    assert "Tell me when someone replies" in text


def test_week_before_keeps_its_news_as_a_plain_line():
    _subject, html, text = host_reminders.compose_week_before("Thanksgiving at ours", date(2026, 12, 17), "tok")
    assert "text-transform:uppercase" not in html
    assert "One week to go" in html
    assert SERIF not in html


def test_the_card_picture_draws_the_title_in_the_sans():
    ops, _h = email_card._plan({"theme": "matte", "hue": "#D9622B", "eyebrow": None, "lede": None,
                                "title": "Thanksgiving at ours", "facts": [], "fixed": []})
    title_ops = [op for op in ops if op[0] == "center" and op[1] == "Thanksgiving at ours"]
    assert title_ops, ops
    assert "Inter" in title_ops[0][3].getname()[0]


def test_NEGATIVE_CONTROL_a_guest_invite_keeps_its_stationery():
    html, _text = frame(kind="invite", eyebrow="You’re invited", title="Thanksgiving at ours")
    assert "text-transform:uppercase" in html and SERIF in html
    ops, _h = email_card._plan({"theme": "paper", "hue": "#B84E1E", "eyebrow": "You’re invited", "lede": None,
                                "title": "Thanksgiving at ours", "facts": [], "fixed": []})
    t = [op for op in ops if op[0] == "center" and op[1] == "Thanksgiving at ours"]
    assert "Playfair" in t[0][3].getname()[0]
