"""The invite email is the envelope for the invitation (owner, 11/19/2026: "Go
with C, use 'Or pick your answer'").

A plain cream card every mail app draws alike: "You're invited", "<host>
invites you to", the event's name, When and Where, "Open your invitation" (the
real page), then "Or pick your answer" with Yes / Can't make it / Maybe, each
opening the page with that answer preselected. The host's note follows. The
facts come from the event the SERVER has saved, never from the request; a time
the host did not set is never stated.
"""
from app.invite_email import compose_invite_email

EV = {"name": "My Friendsgiving", "type": "Friendsgiving", "date": "2026-11-21", "startTime": "16:00",
      "startTimeSource": "host", "venue": "Vida's", "venueAddress": "12 Pine St, Baltimore, MD", "rsvpCode": "Code123456789012"}
NOTE = "We’d love to have you with us.\n\nLet us know you’re coming:\nhttps://x.test/hostv2/?rsvp=Code123456789012\n\nCan’t wait to see you!"


def test_the_email_is_the_invitation():
    html, text = compose_invite_email(EV, NOTE, "Kesha", "Vida Reyes", None)
    assert "You’re invited" in html and "Vida Reyes invites you to" in html and "My Friendsgiving" in html
    assert "Saturday<br>November 21" in html and "4:00 PM" in html
    assert "Vida&#x27;s" in html and "12 Pine St, Baltimore, MD" in html
    assert "https://twillis45.github.io/ngw-event-planner/hostv2/?rsvp=Code123456789012" in html
    assert "Open your invitation" in html and "Or pick your answer" in html
    assert "Or reply right now" not in html          # a tap here preselects; it does not send
    assert "url(" not in html and "Playfair" not in html   # nothing a mail app may drop: no image, no web font
    assert "Yes, I’m in" in html and "Can’t make it" in html and "Maybe" in html
    assert '?rsvp=Code123456789012&amp;reply=Yes"' in html and '&amp;reply=No"' in html and '&amp;reply=Maybe"' in html
    assert "A note from Vida" in html and "We’d love to have you with us." in html
    assert "Hi Kesha," in html


def test_the_note_does_not_repeat_the_link_the_button_carries():
    html, _ = compose_invite_email(EV, NOTE, "Kesha", "Vida Reyes", None)
    note = html.split("A note from Vida", 1)[1]
    assert "https://x.test/hostv2/?rsvp=" not in note
    assert "Let us know you’re coming:" not in note        # the line that only introduced the link


def test_what_the_host_typed_is_text_not_markup():
    html, _ = compose_invite_email({**EV, "name": "<script>x</script>"}, "<b>hi</b>", None, "<i>V</i>", None)
    assert "<script>" not in html and "<b>hi</b>" not in html and "<i>V</i>" not in html


def test_a_time_the_host_never_set_is_never_stated():
    html, text = compose_invite_email({**EV, "startTimeSource": "derived"}, NOTE, None, "Vida Reyes", None)
    assert "4:00 PM" not in html and "4:00 PM" not in text
    assert "Saturday<br>November 21" in html


def test_a_solemn_gathering_gets_the_quiet_card():
    html, _ = compose_invite_email({**EV, "name": "Repast for Mr. Lewis", "type": "Repast"}, "Please join us.", None, "The Lewis family", None)
    assert "#6f6152" in html and "#B84E1E" not in html


def test_the_plain_text_part_has_the_same_facts_and_the_stop_link():
    _, text = compose_invite_email(EV, NOTE, "Kesha", "Vida Reyes", "https://api.test/api/public/email/stop/tok")
    for want in ("My Friendsgiving", "Saturday, November 21 · 4:00 PM", "Vida's", "https://twillis45.github.io/ngw-event-planner/hostv2/?rsvp=Code123456789012", "Stop emails about this event: https://api.test/api/public/email/stop/tok"):
        assert want in text


def test_the_note_does_not_repeat_the_date_and_place_the_card_shows():
    note = "We’d love to have you.\n\nSaturday, November 21 · 4:00 PM\nVida's\n\nSee you there!"
    _, text = compose_invite_email(EV, note, None, "Vida Reyes", None)
    assert text.count("Saturday, November 21 · 4:00 PM") == 1 and text.count("Vida's") == 1
    assert "We’d love to have you." in text and "See you there!" in text


def test_the_reply_buttons_can_wrap_on_a_small_phone():
    # Measured 11/19/2026: with nowrap, "Can’t make it" pushed a 320px screen
    # sideways. The buttons must be allowed to wrap their words.
    from app.invite_email import compose_invite_email
    html, _ = compose_invite_email({"name": "X", "date": "2026-11-26", "rsvpCode": "abcdefghijklmnop1234"}, "", None, "Vida Reyes", None)
    for chunk in html.split("reply=")[1:]:
        assert "nowrap" not in chunk.split("</a>")[0]


def test_without_a_place_the_date_takes_the_whole_row():
    html, _ = compose_invite_email({**EV, "venue": "", "venueAddress": ""}, "", None, "Vida Reyes", None)
    assert "Where" not in html and 'width="100%" valign="top"' in html
