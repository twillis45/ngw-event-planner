"""Route tests for /api/lodging/unfurl — the host-directed listing-read exception.

This endpoint is the ONE place the app touches Airbnb/Vrbo, added on an explicit
host override (2026-07-28). Because it makes an outbound request on behalf of a
user, the guards matter more than the happy path: an open fetcher would be an
SSRF hole, and a confident wrong answer (an error page parsed as a listing) is
worse here than no answer at all. Every guard gets a test.

No network is touched: the client is monkeypatched.
"""
import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.routers.lodging as lodging_mod


def _client():
    app = FastAPI()
    app.include_router(lodging_mod.router)
    return TestClient(app)


class _Resp:
    """Just enough of httpx.Response for the router."""
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


def _stub_get(monkeypatch, resp_or_exc):
    """Replace the AsyncClient so no request leaves the machine."""
    class _AC:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url):
            if isinstance(resp_or_exc, Exception):
                raise resp_or_exc
            return resp_or_exc
    monkeypatch.setattr(lodging_mod.httpx, "AsyncClient", _AC)


# ── The allowlist is the SSRF guard, not a convenience ───────────────────────

@pytest.mark.parametrize("url", [
    "http://www.airbnb.com/rooms/1",          # http, not https
    "https://evil.example.com/rooms/1",       # host not on the list
    "https://airbnb.com.evil.example/x",      # suffix-confusion attempt
    "https://169.254.169.254/latest/meta",    # cloud metadata endpoint
    "https://localhost/admin",
])
def test_only_allowlisted_https_listing_hosts_are_fetched(url, monkeypatch):
    called = {"n": 0}

    class _AC:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, u):
            called["n"] += 1
            return _Resp(200, "<title>x</title>")

    monkeypatch.setattr(lodging_mod.httpx, "AsyncClient", _AC)
    r = _client().get("/api/lodging/unfurl", params={"url": url})
    assert r.status_code == 400
    # The refusal must happen BEFORE any request is made.
    assert called["n"] == 0


def test_allowlisted_hosts_are_accepted():
    for host in ("www.airbnb.com", "vrbo.com"):
        assert lodging_mod._host_ok(f"https://{host}/rooms/1") is True


def test_booking_com_is_refused(monkeypatch):
    """Removed 2026-07-28 (review board).

    Booking's terms (A15) uniquely name automated assistants that work "by
    interacting with or otherwise making use of your browser" — and THIS path is
    the worse of the two places it appeared: the bookmarklet at least runs in the
    host's own browser on her own IP, while this runs from a datacenter under a
    self-identifying non-browser UA, which is exactly the fact pattern that
    clause was drafted to catch. Booking is also a hotel platform and this engine
    is for whole-home group rentals, so the trade bought us nothing.
    """
    assert lodging_mod._host_ok("https://www.booking.com/hotel/x.html") is False
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.booking.com/hotel/x.html"})
    assert r.status_code == 400
    assert "Booking" not in r.json()["detail"]


# ── An error page is not a listing (caught in testing against a fake room id) ─

@pytest.mark.parametrize("title", [
    "404 Page Not Found",
    "Page unavailable",
    "This listing is no longer available",
    "Error",
])
def test_an_error_page_is_refused_rather_than_unfurled(title, monkeypatch):
    _stub_get(monkeypatch, _Resp(200, f"<title>{title}</title>"))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1"})
    assert r.status_code == 502
    assert "listing" in r.json()["detail"].lower()


# ── The expected failure: platforms decline datacenter traffic ───────────────

@pytest.mark.parametrize("status", [401, 403, 429])
def test_a_declined_read_is_reported_plainly(status, monkeypatch):
    _stub_get(monkeypatch, _Resp(status, ""))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.vrbo.com/987654"})
    assert r.status_code == 502
    detail = r.json()["detail"]
    assert "declined" in detail.lower()
    # Every failure hands the host the path that always works.
    assert "paste" in detail.lower()


def test_a_timeout_says_so_and_points_at_the_paste_path(monkeypatch):
    _stub_get(monkeypatch, httpx.TimeoutException("slow"))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1"})
    assert r.status_code == 504
    assert "paste" in r.json()["detail"].lower()


def test_a_transport_failure_never_leaks_the_exception(monkeypatch):
    _stub_get(monkeypatch, RuntimeError("getaddrinfo boom"))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1"})
    assert r.status_code == 502
    assert "boom" not in r.json()["detail"]


def test_a_page_with_nothing_readable_is_refused(monkeypatch):
    _stub_get(monkeypatch, _Resp(200, "<html><body>hi</body></html>"))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1"})
    assert r.status_code == 502


# ── The happy path: the page's OWN sharing metadata, nothing inferred ────────

AIRBNB_HEAD = """
<html><head>
<meta property="og:title" content="Home in McHenry &middot; 5 bedrooms &middot; 7 beds &middot; 4 baths" />
<meta property="og:image" content="https://a0.muscache.com/im/pictures/abc.jpg" />
<meta property="og:description" content="Lakefront home for 12 guests" />
<meta property="og:site_name" content="Airbnb" />
<link rel="canonical" href="https://www.airbnb.com/rooms/1325296319540609918?x=1" />
<title>Home in McHenry | Airbnb</title>
</head></html>
"""


def test_the_title_carries_real_facts(monkeypatch):
    _stub_get(monkeypatch, _Resp(200, AIRBNB_HEAD))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1325296319540609918"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["facts"] == {"bedrooms": 5, "beds": 7, "baths": 4, "guests": 12}
    # ONE image — the sharing picture. The gallery is never fetched.
    assert body["image"] == "https://a0.muscache.com/im/pictures/abc.jpg"
    # Canonical wins, query string stripped.
    assert body["url"] == "https://www.airbnb.com/rooms/1325296319540609918"
    assert body["siteName"] == "Airbnb"


def test_a_missing_figure_is_absent_not_guessed(monkeypatch):
    _stub_get(monkeypatch, _Resp(
        200,
        '<meta property="og:title" content="Cabin &middot; 3 bedrooms" />'
        '<meta property="og:image" content="https://x.example/a.jpg" />',
    ))
    body = _client().get("/api/lodging/unfurl", params={"url": "https://vrbo.com/1"}).json()
    assert body["facts"] == {"bedrooms": 3}
    assert "beds" not in body["facts"] and "baths" not in body["facts"]


def test_a_non_https_image_is_dropped_rather_than_served(monkeypatch):
    _stub_get(monkeypatch, _Resp(
        200,
        '<meta property="og:title" content="A real lakefront house" />'
        '<meta property="og:image" content="http://insecure.example/a.jpg" />',
    ))
    body = _client().get("/api/lodging/unfurl", params={"url": "https://vrbo.com/1"}).json()
    assert body["image"] == ""


def test_the_platform_suffix_is_trimmed_from_the_title(monkeypatch):
    _stub_get(monkeypatch, _Resp(200, "<title>Gulf View Home with Private Pool | Vrbo</title>"))
    body = _client().get("/api/lodging/unfurl", params={"url": "https://www.vrbo.com/987654"}).json()
    assert body["title"] == "Gulf View Home with Private Pool"


def test_reversed_meta_attribute_order_is_still_read(monkeypatch):
    # Some pages emit content= before property=; both orders must parse.
    _stub_get(monkeypatch, _Resp(
        200, '<meta content="A big lake house for everyone" property="og:title" />'))
    body = _client().get("/api/lodging/unfurl", params={"url": "https://vrbo.com/1"}).json()
    assert body["title"] == "A big lake house for everyone"


# ── The egress guard: a generic homepage title is not a listing ──────────────

@pytest.mark.parametrize("title", [
    "Vacation Rentals, Homes, Experiences & Places",
    "Holiday Rentals, Cabins, Beach Houses & More",
    "Book your next stay",
    "Find and book your perfect getaway",
])
def test_a_generic_front_page_title_is_refused(title, monkeypatch):
    """The failure nobody would notice.

    If a platform starts answering datacenter traffic with its homepage metadata
    instead of the listing's, every field still parses and nothing errors — the
    host just gets a shortlist row named after the website. We would learn about
    it from a confused host, not from an alarm. Refuse it like any other
    confident wrong answer.
    """
    _stub_get(monkeypatch, _Resp(200, f'<meta property="og:title" content="{title}" />'
                                      '<meta property="og:image" content="https://a0.muscache.com/x.jpg" />'))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1"})
    assert r.status_code == 502
    assert "front page" in r.json()["detail"].lower()


def test_a_real_listing_title_is_not_mistaken_for_a_front_page(monkeypatch):
    # The guard must not eat legitimate listings that happen to contain the words.
    _stub_get(monkeypatch, _Resp(200, '<meta property="og:title" content="Cabin in McHenry · 5 bedrooms · 8 beds" />'))
    r = _client().get("/api/lodging/unfurl", params={"url": "https://www.airbnb.com/rooms/1"})
    assert r.status_code == 200
    assert r.json()["facts"]["beds"] == 8
