"""The co-host invite leads with a picture of its card, in the host app's
Studio Matte (owner, 11/20/2026). The sign-in sentence, which names the
invited address, stays live HTML and never enters the stored picture.
The `env` fixture is the co-host fixture in test_cohosts."""
import html as _html

import app.email_frame as ef
import app.email_pictures as ep
from _pictures import no_picture, picture, pics  # noqa: F401
from test_cohosts import env, invite  # noqa: F401


def test_the_cohost_invite_is_sent_with_its_picture(env, pics):  # noqa: F811
    assert invite(env, "cohost@example.test").json()["emailed"] is True
    html = env.sent[0]["html"]
    token, alt = picture(html)
    assert ep.card_path(token) in pics and ef.MATTE_MARK in html
    assert "@" not in _html.unescape(alt) and "cohost@example.test" in html
    assert "Open the app" in html


def test_the_cohost_invite_is_emailed_when_storage_refuses(env, pics, monkeypatch):  # noqa: F811
    async def refused(path, data): return False
    monkeypatch.setattr(ep, "_put", refused)
    assert invite(env, "cohost@example.test").json()["emailed"] is True
    assert no_picture(env.sent[0]["html"])
