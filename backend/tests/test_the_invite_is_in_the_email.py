"""The invite email carries the invitation itself (owner, 11/19/2026: "Put my
studio matte and format emails for invite from batch. Can't the emails being
sent include the actual invite in body of email message?").

Before: the batch sent the draft's words as plain paragraphs and a long link.
Now an invite email is the invitation: the Studio Matte paper card (masthead,
the event's name, WHEN and WHERE, one "Reply to the invite" button) with the
host's note under it. The facts come from the event the SERVER has saved, never
from the request; a time the host did not set is never stated.
"""
from app.invite_email import compose_invite_email

EV = {"name": "My Friendsgiving", "type": "Friendsgiving", "date": "2026-11-21", "startTime": "16:00",
      "startTimeSource": "host", "venue": "Vida's", "venueAddress": "12 Pine St, Baltimore, MD", "rsvpCode": "Code123456789012"}
NOTE = "We’d love to have you with us.\n\nLet us know you’re coming:\nhttps://x.test/hostv2/?rsvp=Code123456789012\n\nCan’t wait to see you!"


def test_the_email_is_the_invitation():
    html, text = compose_invite_email(EV, NOTE, "Kesha", "Vida Reyes", None)
    assert "An invitation" in html and "My Friendsgiving" in html
    assert "Saturday, November 21" in html and "4:00 PM" in html
    assert "Vida&#x27;s" in html and "12 Pine St, Baltimore, MD" in html
    assert 'href="https://twillis45.github.io/ngw-event-planner/hostv2/?rsvp=Code123456789012"' in html
    assert "Reply to the invite" in html
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
    assert "Saturday, November 21" in html


def test_a_solemn_gathering_gets_the_quiet_card():
    html, _ = compose_invite_email({**EV, "name": "Repast for Mr. Lewis", "type": "Repast"}, "Please join us.", None, "The Lewis family", None)
    assert "#8a7a66" in html and "#D9622B" not in html


def test_the_plain_text_part_has_the_same_facts_and_the_stop_link():
    _, text = compose_invite_email(EV, NOTE, "Kesha", "Vida Reyes", "https://api.test/api/public/email/stop/tok")
    for want in ("My Friendsgiving", "Saturday, November 21 · 4:00 PM", "Vida's", "https://twillis45.github.io/ngw-event-planner/hostv2/?rsvp=Code123456789012", "Stop emails about this event: https://api.test/api/public/email/stop/tok"):
        assert want in text


def test_the_note_does_not_repeat_the_date_and_place_the_card_shows():
    note = "We’d love to have you.\n\nSaturday, November 21 · 4:00 PM\nVida's\n\nSee you there!"
    _, text = compose_invite_email(EV, note, None, "Vida Reyes", None)
    assert text.count("Saturday, November 21 · 4:00 PM") == 1 and text.count("Vida's") == 1
    assert "We’d love to have you." in text and "See you there!" in text
