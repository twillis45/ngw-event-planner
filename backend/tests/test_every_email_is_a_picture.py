"""Every email the server sends leads with a PICTURE of its card (owner,
11/20/2026: "Do picture for all emails"). A dark-mode mail app (Spark, the
Gmail app) recolors HTML but never a picture.

app/email_card.py draws it, app/email_pictures.py stores it and frames the
email around it, routers/email_cards.py serves it by its random token only.
Under the picture stay live HTML: the buttons, the host's own words, the
footer and the stop link. No storage, or a failed one: the HTML card, as before.

Two themes, one row per email kind (email_frame.THEME_FOR): paper for the
emails to guests, helpers, vendors and clients; matte, the host app's Studio
Matte, for the host's own. All names and addresses here are synthetic.
"""
import asyncio
import datetime as dt
import html as _html
import io
import time
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image, ImageChops, ImageStat

import app.email_card as ec
import app.email_frame as ef
import app.email_pictures as ep
import app.emailer as em
import app.guest_notices as gn
import app.host_alerts as ha
import app.host_reminders as hr
import app.routers.cohosts as co
import app.routers.communication as cm
import app.routers.email_cards as rc
import app.routers.helper_link as hl
from app.invite_email import compose_invite_email
from _pictures import no_picture, picture, pics  # noqa: F401  (pics is a fixture)

STOP = "https://api.example.test/api/public/email/stop/tok-aaaaaaaaaaaaaaaaaaaa"
EVENT = {"name": "Reyes Friendsgiving", "type": "Friendsgiving", "date": "2026-11-21", "startTime": "4:00 PM",
         "venue": "Vida's", "venueAddress": "271 Whitaker Rd", "rsvpCode": "rsvp-code-aaaaaaaaaaaa",
         "hostName": "Casey Rivera",
         "guests": [{"id": "g1", "name": "Jordan Lee", "email": "jordan.helper@example.test", "allergens": ["Peanut"]}],
         "foodAdd": [{"id": "f1", "name": "The stuffing", "owner": "Jordan Lee"}],
         "timeline": [{"id": "t1", "task": "Set up chairs", "owner": "Jordan"}]}
HELPER_PAGE = "https://app.example.test/hostv2/?helper=CODE"


def _helper(ev=EVENT):
    return hl.compose_helper_email(ev, hl.build_helper_payload(ev, "g1"), HELPER_PAGE, STOP)


# kind -> a function returning (html, text) for that kind, as its sender composes it,
# with the buttons and the stop link each one must keep under a picture.
EMAILS = {
    "invite": (lambda: compose_invite_email(EVENT, "Bring a folding chair!", "Jordan", "Casey Rivera", STOP),
               ["Open your invitation", "Yes, I’m in", "Can’t make it", "Maybe", "Bring a folding chair!"], STOP),
    "message": (lambda: cm.compose_message_email(EVENT, "Can you bring ice?\nThanks", "Rosa", "Casey Rivera", STOP),
                ["Can you bring ice?<br>Thanks", "Hi Rosa,"], STOP),
    "reply_notice": (lambda: gn.compose_reply_notice("Casey", "Reyes Friendsgiving", "Street parking is free.", "rsvp-1", "gtok-1")[2:5:2],
                     ["Open your invite", "Street parking is free."], gn.unsubscribe_url("gtok-1")),
    "announcement": (lambda: gn.compose_announcement("Casey", "Reyes Friendsgiving", "Doors at 4.", "rsvp-1", "gtok-1")[2:5:2],
                     ["Open your invite", "Doors at 4."], gn.unsubscribe_url("gtok-1")),
    "helper_ask": (lambda: _helper()[1:], ["I can do it", "I can’t", "Hi Jordan,"], STOP),
    "approval": (lambda: em.compose_approval_email("Reyes Friendsgiving", "Menu & budget", "https://app.example.test/?event=e1"),
                 ["Review &amp; respond", "Menu &amp; budget"], None),
    "week_before": (lambda: hr.compose_week_before("Reyes Friendsgiving", dt.date(2026, 11, 21), "tok-r")[1:],
                    ["Open your plan"], "tok-r"),
    "host_alert": (lambda: ha.compose("rsvp", "Jordan", "Reyes Friendsgiving", "Yes")[1:],
                   ["Open your plan", "Jordan replied Yes for Reyes Friendsgiving."], None),
    "cohost_invite": (lambda: co.compose_cohost_invite("Reyes Friendsgiving", "sam.cohost@example.test", "Casey Rivera"),
                      ["Open the app", "sam.cohost@example.test"], None),
}


def jpeg_size(data):
    im = Image.open(io.BytesIO(data))
    assert im.format == "JPEG"
    return im.size


# ── the drawing ───────────────────────────────────────────────────────────────
@pytest.mark.parametrize("kind", sorted(EMAILS))
def test_each_email_kind_draws_a_jpeg_1040_wide(kind):
    html, _t = EMAILS[kind][0]()
    card = html.card
    assert card and card["title"] == "Reyes Friendsgiving" and card["theme"] == ef.THEME_FOR[kind]
    data = ec.draw_card(card)
    w, h = jpeg_size(data)
    assert w == 1040 and 200 < h < 2400
    assert ec.draw_card(card) == data                                   # pure: the same card, the same bytes


def test_the_text_is_actually_drawn():
    # Not OCR: two cards that differ only in their words draw different pixels,
    # and the difference sits where that text goes.
    html, _t = EMAILS["week_before"][0]()
    a = Image.open(io.BytesIO(ec.draw_card(html.card))).convert("L")
    b = Image.open(io.BytesIO(ec.draw_card({**html.card, "title": "Ana's Retirement Party"}))).convert("L")
    assert a.size[0] == b.size[0]
    box = ImageChops.difference(a.crop((0, 0, 1040, 160)), b.crop((0, 0, 1040, 160))).getbbox()
    assert box is not None                                               # the title band changed
    c = Image.open(io.BytesIO(ec.draw_card({**html.card, "fixed": ["Something else entirely, said here."]}))).convert("L")
    assert ImageChops.difference(a.crop((0, 0, 1040, 100)), c.crop((0, 0, 1040, 100))).getbbox() is None
    assert ImageChops.difference(a, c.resize(a.size)).getbbox() is not None   # only the copy below moved


# ── crisp text (11/20/2026: the first cut's text looked smeared, doubled) ─────
def test_every_string_is_drawn_once_with_no_shadow(monkeypatch):
    # The cause was the letterpress: each line drawn three times (a light copy
    # below, a brown one above, then the ink) on a blurred layer. A string drawn
    # twice, or a blur anywhere, fails here.
    from PIL import ImageDraw, ImageFilter
    drawn, real = [], ImageDraw.ImageDraw.text
    def spy(self, xy, text, *a, **k):
        drawn.append(text)
        return real(self, xy, text, *a, **k)
    def no_blur(*a, **k): raise AssertionError("a blur softens the text")
    monkeypatch.setattr(ImageDraw.ImageDraw, "text", spy)
    monkeypatch.setattr(ImageFilter, "GaussianBlur", no_blur)
    _s, html, _t = _helper()
    ec.draw_card(html.card)
    words = [w for w in drawn if len(w) > 1]           # a spaced label is drawn a letter at a time
    for s in ("Reyes Friendsgiving", "Saturday", "November 21", "4:00 PM", "Vida's", "271 Whitaker Rd", "• Set up chairs"):
        assert words.count(s) == 1, (s, words.count(s))
    assert len(words) == len(set(words))


def test_the_jpeg_keeps_full_color_resolution():
    # 4:4:4 (no chroma subsampling), quality 90+: thin text in the hue stays sharp.
    from PIL import JpegImagePlugin
    _s, html, _t = _helper()
    im = Image.open(io.BytesIO(ec.draw_card(html.card)))
    assert JpegImagePlugin.get_sampling(im) == 0
    def table(quality):
        buf = io.BytesIO(); Image.new("RGB", (8, 8)).save(buf, "JPEG", quality=quality)
        return list(Image.open(buf).quantization[0])
    assert list(im.quantization[0]) == table(ec.JPEG_QUALITY) and ec.JPEG_QUALITY >= 90


def test_the_stored_picture_is_the_drawn_one_not_a_second_encode(pics):  # noqa: F811
    html, text = EMAILS["helper_ask"][0]()
    out, _ = asyncio.run(ep.with_picture(html, text))
    assert pics[ep.card_path(picture(out)[0])] == ec.draw_card(html.card)


def test_the_picture_is_the_top_of_the_card_edge_to_edge(pics):  # noqa: F811
    for kind, theme_mark in (("helper_ask", ef.PICTURE_MARK), ("week_before", ef.MATTE_MARK)):
        html, text = EMAILS[kind][0]()
        out, _ = asyncio.run(ep.with_picture(html, text))
        assert theme_mark in out
        assert '<tr><td style="padding:0;line-height:0;font-size:0;"><a href=' in out      # its own row, no padding
        assert "border-radius:17px 17px 0 0;" in out and "border-radius:14px" not in out
        assert '<tr><td style="padding:0 22px 24px;text-align:center;">' in out             # the live part below


def test_a_longer_job_list_makes_a_taller_card():
    _s, html, _t = _helper()
    more = {**html.card, "fixed": [html.card["fixed"][0] + "\n• Bring ice\n• Sweep the porch\n• Hang the lights"]}
    assert jpeg_size(ec.draw_card(more))[1] > jpeg_size(ec.draw_card(html.card))[1]


def test_paper_is_light_and_matte_is_dark():
    paper, _ = EMAILS["helper_ask"][0]()
    matte, _ = EMAILS["week_before"][0]()
    lum = lambda card: ImageStat.Stat(Image.open(io.BytesIO(ec.draw_card(card))).convert("L")).mean[0]
    assert lum(paper.card) > 180 and lum(matte.card) < 60


# ── one mapping decides each email's theme ───────────────────────────────────
def test_the_mapping_names_every_email_kind_and_the_owners_defaults():
    assert set(ef.THEME_FOR) == set(EMAILS)
    assert {k for k, v in ef.THEME_FOR.items() if v == "matte"} == {"week_before", "host_alert", "cohost_invite"}


@pytest.mark.parametrize("kind", sorted(EMAILS))
def test_every_sender_wears_its_rows_theme_and_flips_with_it(kind, monkeypatch):
    for theme in ("paper", "matte"):
        monkeypatch.setitem(ef.THEME_FOR, kind, theme)
        html, _t = EMAILS[kind][0]()
        assert html.card["theme"] == theme
        assert (ef.MARK in html and ef.PAPER_IMAGE in html) is (theme == "paper")
        assert (ef.MATTE_MARK in html) is (theme == "matte")
        assert 'name="color-scheme" content="light only"' in html          # both stay light-only


def test_the_matte_card_uses_the_apps_tokens_only():
    html, _t = EMAILS["week_before"][0]()
    assert f"background:{ef.MATTE_PAGE}" in html and ef.PAPER not in html
    assert f"background:{ef.MATTE_STEEL};color:{ef.MATTE_INK}" in html    # the button is --steel / --on-steel
    assert html.card["hue"] == ef.MATTE_HUE


# ── with a picture, and without ──────────────────────────────────────────────
@pytest.mark.parametrize("kind", sorted(EMAILS))
def test_with_a_picture_the_email_leads_with_it_and_keeps_its_live_parts(kind, pics):  # noqa: F811
    compose, live, stop = EMAILS[kind]
    html, text = compose()
    card = html.card
    out, out_text = asyncio.run(ep.with_picture(html, text))
    token, alt = picture(out)
    assert pics[ep.card_path(token)][:3] == b"\xff\xd8\xff"               # stored, a JPEG
    # The alt text carries every fact on the card.
    assert _html.unescape(alt) == ef.card_alt(card)
    # (The reply alert has no eyebrow since 11/28/2026: the host's emails wear the app's look.)
    for part in [p for p in (card["eyebrow"], card["title"]) if p] + [f"{f['label']}: {f['text']}" for f in card["facts"]]:
        assert part in _html.unescape(alt)
    # The picture replaces the HTML card's head, and nothing else.
    assert ">When<" not in out and 'font:700 30px/1.15' not in out
    for piece in live:
        assert piece in out
    assert "No Guesswork Events." in out
    if stop:
        assert stop in out
    assert out_text == text                                               # the plain-text part is unchanged


@pytest.mark.parametrize("kind", sorted(EMAILS))
def test_without_storage_the_html_card_stands_in(kind):
    compose, live, stop = EMAILS[kind]
    html, text = compose()
    out, out_text = asyncio.run(ep.with_picture(html, text))
    assert out == html and out_text == text and no_picture(out)
    assert "Reyes Friendsgiving" in out
    for piece in live:
        assert piece in out
    if stop:
        assert stop in out


def test_the_picture_opens_the_emails_primary_destination(pics):  # noqa: F811
    _s, html, text = _helper()
    out, _ = asyncio.run(ep.with_picture(html, text))
    a = out.index(f'<a href="{HELPER_PAGE}" style="display:block;text-decoration:none;"><img')
    assert a < out.index("/api/public/email-card/")
    # The jobs are in the picture (and its alt text); the buttons stay live.
    assert "• Set up chairs" in _html.unescape(picture(out)[1])
    assert "• Set up chairs" not in out.split("alt=")[0] and out.count(f'href="{HELPER_PAGE}"') == 2 \
        and out.count(f'href="{HELPER_PAGE}&amp;answer=declined"') == 1   # "I can't" (audit 2, E P2-4)


def test_the_invite_keeps_its_own_uploaded_picture(pics):  # noqa: F811
    card = "https://api.test/api/public/invite-card/rsvp-code-aaaaaaaaaaaa?v=abc123def456"
    html, text = compose_invite_email(EVENT, "", "Jordan", "Casey Rivera", STOP, card_url=card)
    assert html.card is None
    out, _ = asyncio.run(ep.with_picture(html, text))
    assert out == html and pics == {} and "/api/public/email-card/" not in out


def test_one_picture_serves_a_batch(pics):  # noqa: F811
    memo = {}
    a = asyncio.run(ep.with_picture(*EMAILS["announcement"][0](), memo))[0]
    b = gn.compose_announcement("Casey", "Reyes Friendsgiving", "Doors at 4.", "rsvp-1", "gtok-2")
    b = asyncio.run(ep.with_picture(b[2], b[4], memo))[0]
    assert picture(a)[0] == picture(b)[0] and len(pics) == 1


# ── a failed or slow picture never holds a send ──────────────────────────────
@pytest.mark.parametrize("failure", ["refused", "raises", "draw"])
def test_a_storage_failure_falls_back_to_the_html_card(failure, pics, monkeypatch):  # noqa: F811
    async def refused(path, data): return False
    async def raises(path, data): raise RuntimeError("storage down")
    def bad_draw(card): raise OSError("font missing")
    if failure == "refused":
        monkeypatch.setattr(ep, "_put", refused)
    elif failure == "raises":
        monkeypatch.setattr(ep, "_put", raises)
    else:
        monkeypatch.setattr(ep, "draw_card", bad_draw)
    html, text = EMAILS["helper_ask"][0]()
    out, out_text = asyncio.run(ep.with_picture(html, text))
    assert out == html and no_picture(out)


def test_a_slow_store_is_cut_short(pics, monkeypatch):  # noqa: F811
    async def slow(path, data): await asyncio.sleep(5); return True
    monkeypatch.setattr(ep, "_put", slow)
    monkeypatch.setattr(ep, "PICTURE_SECONDS", 0.3)
    html, text = EMAILS["week_before"][0]()
    t0 = time.monotonic()
    out, _ = asyncio.run(ep.with_picture(html, text))
    assert time.monotonic() - t0 < 2 and no_picture(out)


def test_the_log_holds_counts_never_an_address(pics, monkeypatch, caplog):  # noqa: F811
    async def refused(path, data): return False
    caplog.set_level("INFO", logger="ngw.email_pictures")
    asyncio.run(ep.with_picture(*EMAILS["cohost_invite"][0]()))
    monkeypatch.setattr(ep, "_put", refused)
    asyncio.run(ep.with_picture(*EMAILS["cohost_invite"][0]()))
    assert "stored=" in caplog.text and "fallback=" in caplog.text
    assert "@" not in caplog.text


# ── the senders: each one sends the picture, and still sends without it ──────
def test_the_approval_email_is_sent_with_its_picture(pics, monkeypatch):  # noqa: F811
    sent = []
    async def fake(**k): sent.append(k); return {"id": "r1"}
    monkeypatch.setattr(em, "_send_via_resend", fake)
    monkeypatch.setattr(em, "is_email_configured", lambda: True)
    r = asyncio.run(em.send_approval_email("client@example.test", "Reyes Friendsgiving", "Menu", "https://app.example.test/?event=e1"))
    assert r["ok"] and picture(sent[0]["html"]) and "Review &amp; respond" in sent[0]["html"]


def test_the_week_before_reminder_is_sent_with_its_picture_and_its_stop(pics):  # noqa: F811
    from test_week_before_reminder import Conn, Outbox, plan, run
    out = Outbox()
    run(Conn({"e1": (plan("Reyes Friendsgiving"), "casey.host@example.test")}), out)
    (m,) = out.mail
    token, alt = picture(m["html"])
    assert _html.unescape(alt) == ("One week to go. Reyes Friendsgiving. When: Thursday, November 26. "
                                   "A good moment to look over your plan and settle anything still open.")
    assert ef.MATTE_MARK in m["html"] and "Stop plan reminders" in m["html"]
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_the_week_before_reminder_goes_when_storage_refuses(pics, monkeypatch):  # noqa: F811
    from test_week_before_reminder import Conn, Outbox, plan, run
    async def refused(path, data): return False
    monkeypatch.setattr(ep, "_put", refused)
    out = Outbox()
    counts = run(Conn({"e1": (plan("Reyes Friendsgiving"), "casey.host@example.test")}), out)
    assert counts["sent"] == 1 and no_picture(out.mail[0]["html"]) and "Stop plan reminders" in out.mail[0]["html"]


def test_the_host_alert_is_sent_with_its_picture(pics, monkeypatch):  # noqa: F811
    from test_host_alerts import ROW, _Conn, _Pool
    sent = []
    async def fake(to, subject, html, **k): sent.append(html); return {"id": "r1"}
    async def gp(): return _Pool(_Conn(ROW))
    monkeypatch.setattr(ha, "_send_via_resend", fake)
    monkeypatch.setattr(ha, "is_email_configured", lambda: True)
    monkeypatch.setattr(ha, "get_pool", gp)
    ha._last_sent.clear()
    asyncio.run(ha.alert_host("ev1", "rsvp", "Jordan", "Yes"))
    assert picture(sent[0]) and "Jordan replied Yes for Friendsgiving." in sent[0]
    assert "Jordan" not in _html.unescape(picture(sent[0])[1])          # the guest's name stays out of the picture


def test_the_reply_notice_is_sent_with_its_picture(pics, monkeypatch):  # noqa: F811
    from test_guest_reply_notices import _ask, _opt_in, _reply, _setup
    conn, c, sent = _setup(monkeypatch)
    _ask(c); _opt_in(c)
    assert _reply(c, conn).status_code == 200
    (m,) = sent
    assert picture(m["html"]) and "Street parking is free after 6." in m["html"]
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_an_announcement_is_one_picture_for_every_guest(pics, monkeypatch):  # noqa: F811
    from test_announcements import _Conn, _client, _post, _thread
    conn, sent = _Conn(), []
    _thread(conn, "jordan.guest@example.test")
    _thread(conn, "lee.guest@example.test")
    c = _client(monkeypatch, conn, sent=sent)
    assert _post(c, "Doors open at 4.").status_code == 200
    assert len(sent) == 2 and picture(sent[0]["html"])[0] == picture(sent[1]["html"])[0] and len(pics) == 1
    assert all("Doors open at 4." in m["html"] for m in sent)


# ── the public route: by its token only ──────────────────────────────────────
@pytest.fixture
def route(pics):  # noqa: F811
    app = FastAPI(); app.include_router(rc.router)
    return types.SimpleNamespace(store=pics, c=TestClient(app))


def test_a_stored_picture_is_served_by_its_token(route):
    out, _ = asyncio.run(ep.with_picture(*EMAILS["helper_ask"][0]()))
    token, _alt = picture(out)
    r = route.c.get(f"/api/public/email-card/{token}")
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert r.headers["cache-control"] == "public, max-age=86400" and r.headers["x-content-type-options"] == "nosniff"
    assert r.content == route.store[ep.card_path(token)]


@pytest.mark.parametrize("bad", ["abc", "A" * 32, "g" * 32, "a" * 31, "a" * 33, "a" * 32 + ".jpg",
                                 "..%2F" + "a" * 28, "ev1", "rsvp-code-aaaaaaaaaaaa"])
def test_a_malformed_token_is_404_before_storage_is_asked(route, bad, monkeypatch):
    asked = []
    async def get(path): asked.append(path); return b"\xff\xd8\xff"
    monkeypatch.setattr(ep, "_get", get)
    assert route.c.get(f"/api/public/email-card/{bad}").status_code == 404 and asked == []


def test_an_unknown_token_is_404(route):
    assert route.c.get("/api/public/email-card/" + "0" * 32).status_code == 404


def test_never_by_event_id(route):
    # Even a file stored under an event's id is unreachable: only a token's shape is read.
    route.store[ep.card_path("ev1")] = b"\xff\xd8\xff"
    route.store[ep.card_path("1732130400000")] = b"\xff\xd8\xff"
    assert route.c.get("/api/public/email-card/ev1").status_code == 404
    assert route.c.get("/api/public/email-card/1732130400000").status_code == 404


def test_storage_off_is_404(monkeypatch):
    monkeypatch.setattr(ep, "_storage_configured", lambda: False)
    app = FastAPI(); app.include_router(rc.router)
    assert TestClient(app).get("/api/public/email-card/" + "0" * 32).status_code == 404


def test_tokens_are_random_and_never_from_the_email(pics):  # noqa: F811
    html, text = EMAILS["helper_ask"][0]()
    a = picture(asyncio.run(ep.with_picture(html, text))[0])[0]
    b = picture(asyncio.run(ep.with_picture(html, text))[0])[0]
    assert a != b and len(pics) == 2


# ── retention: 90 days, in the nightly purge ─────────────────────────────────
def test_pictures_older_than_90_days_are_purged_and_newer_kept(monkeypatch):
    now = dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc)
    files = [{"name": f"{i:032x}.jpg", "created_at": (now - dt.timedelta(days=d)).isoformat().replace("+00:00", "Z")}
             for i, d in enumerate([200, 120, 91, 89, 3])]
    removed = []
    async def oldest(limit=100):
        return sorted([f for f in files if f"email-cards/{f['name']}" not in removed], key=lambda f: f["created_at"])[:limit]
    async def remove(paths): removed.extend(paths); return True
    monkeypatch.setattr(ep, "_list_oldest", oldest)
    monkeypatch.setattr(ep, "_remove", remove)
    assert asyncio.run(ep.purge_old_email_cards(90, now=now)) == 3
    assert removed == [f"email-cards/{files[i]['name']}" for i in (0, 1, 2)]


def test_a_refused_purge_raises_for_the_nightly_job(monkeypatch):
    now = dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc)
    async def oldest(limit=100): return [{"name": "0" * 32 + ".jpg", "created_at": "2026-01-01T00:00:00Z"}]
    async def remove(paths): return False
    monkeypatch.setattr(ep, "_list_oldest", oldest)
    monkeypatch.setattr(ep, "_remove", remove)
    with pytest.raises(RuntimeError):
        asyncio.run(ep.purge_old_email_cards(90, now=now))


def test_the_nightly_purge_job_runs_the_picture_purge(monkeypatch):
    import importlib.util, pathlib
    path = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "purge_guest_photos.py"
    spec = importlib.util.spec_from_file_location("purge_script", path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    calls = []
    async def photos(days): calls.append(("photos", days)); return 0
    async def cards(days): calls.append(("cards", days)); return 2
    async def close(): return None
    monkeypatch.setattr(mod, "_storage_configured", lambda: True)
    monkeypatch.setattr(mod, "purge_old_guest_photos", photos)
    monkeypatch.setattr(mod, "purge_old_email_cards", cards)
    monkeypatch.setattr(mod, "close_pool", close)
    assert asyncio.run(mod.main()) == 0 and calls == [("photos", 90), ("cards", 90)]
