"""The helper ask, sent from the app, leads with a picture of its card: the
event, its day and place, and the helper's jobs (owner, 11/20/2026: "Do picture
for all emails"). The answer buttons and the stop link stay live under it.
The `env` fixture is the helper-send fixture in test_every_email_wears_the_frame."""
import html as _html

import app.email_pictures as ep
from _pictures import no_picture, picture, pics  # noqa: F401
from test_every_email_wears_the_frame import ask, env  # noqa: F401


def test_the_helper_ask_is_sent_with_its_picture(env, pics):  # noqa: F811
    assert ask(env).status_code == 200
    (m,) = env.sent
    token, alt = picture(m["body_html"])
    assert ep.card_path(token) in pics
    alt = _html.unescape(alt)
    assert alt.startswith("Casey asked you to help. My Friendsgiving. When: Saturday, November 21 · 4:00 PM. "
                          "Where: Vida's, 271 Whitaker Rd. You’ve got: • The stuffing")
    assert "I can do it" in m["body_html"] and "I can’t" in m["body_html"]
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert "Stop emails about this event" in m["body_html"]
    assert "• Set up chairs" in m["body_text"]          # the plain-text part still lists the jobs


def test_the_helper_ask_goes_without_a_picture_when_storage_refuses(env, pics, monkeypatch):  # noqa: F811
    async def refused(path, data): return False
    monkeypatch.setattr(ep, "_put", refused)
    assert ask(env).json()["ok"] is True
    html = env.sent[0]["body_html"]
    assert no_picture(html) and "• Set up chairs" in html and "I can do it" in html
