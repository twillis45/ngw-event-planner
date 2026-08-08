# ── /api/webhooks/relay WAS AN UNAUTHENTICATED SSRF ─────────────────────────
#
# Found 2026-08-07 while auditing which routers ship with no tests at all.
# `POST /api/webhooks/relay` took an arbitrary `url` from an UNAUTHENTICATED
# request body and POSTed to it from inside the server's own network, gated
# only by `startswith("http")`. That accepted:
#
#     http://169.254.169.254/latest/meta-data/iam/security-credentials/
#     http://localhost:5432 , http://10.0.0.5/admin , http://[::1]/
#
# i.e. cloud instance metadata (which hands out credentials) and anything on
# the deployment's private network, for anyone who could reach the API.
#
# The guard already existed — app/safe_fetch.py, written for this exact class
# and already applied at three other call sites. This router was never wired to
# it. These tests pin both halves of the fix: the caller must be a planner, and
# the destination must survive validate_public_url.
#
# Async style follows the rest of the suite (asyncio.run in a sync test).
import asyncio
import ipaddress

import pytest

from app import safe_fetch
from app.safe_fetch import SafeFetchError, validate_public_url


@pytest.fixture
def public_dns(monkeypatch):
    """Resolve every NAME to one public address.

    Real DNS in a unit test is a flake and a sandbox failure waiting to happen,
    and it would also make the meaning of a pass depend on the network. Literal
    IPs never reach this path, so the private-address cases below are unaffected
    by the stub — they are still checked for real.
    """
    async def _fake(host):
        if host == 'localhost':
            return [ipaddress.ip_address('127.0.0.1')]
        return [ipaddress.ip_address('93.184.216.34')]
    monkeypatch.setattr(safe_fetch, '_resolve_all', _fake)


def refuse(url):
    """Return the SafeFetchError raised for `url`, or None if it was allowed."""
    try:
        asyncio.run(validate_public_url(url))
        return None
    except SafeFetchError as e:
        return e


# ── The addresses that made this exploitable ────────────────────────────────
@pytest.mark.parametrize("url", [
    "https://169.254.169.254/latest/meta-data/",          # AWS/GCP metadata
    "https://[fd00:ec2::254]/latest/meta-data/",          # IPv6 metadata
    "https://127.0.0.1/admin",
    "https://localhost/admin",   # a NAME that resolves private — the stub maps it to 127.0.0.1
    "https://[::1]/admin",
    "https://10.0.0.5/internal",
    "https://192.168.1.1/router",
    "https://172.16.0.1/internal",
    "https://0.0.0.0/",
    "https://[::ffff:169.254.169.254]/",                  # IPv4-mapped IPv6 smuggling
])
def test_private_and_metadata_destinations_are_refused(url, public_dns):
    e = refuse(url)
    assert e is not None, f"{url} was ALLOWED — this is the SSRF"
    assert e.status_code == 400


def test_the_refusal_does_not_leak_what_it_found():
    # The caller learns it was refused, not which internal host answered.
    e = refuse("https://169.254.169.254/latest/meta-data/")
    assert "169.254" not in e.reason
    assert "metadata" not in e.reason.lower()


# ── The other bypasses ──────────────────────────────────────────────────────
def test_plaintext_http_is_refused():
    # A webhook body carries event data; it must not go over the wire in clear.
    # This is also what the old `startswith("http")` check literally permitted.
    e = refuse("http://example.com/hook")
    assert e is not None and "https" in e.reason.lower()


def test_a_url_carrying_credentials_is_refused():
    e = refuse("https://user:pass@example.com/hook")
    assert e is not None and "credential" in e.reason.lower()


@pytest.mark.parametrize("url", ["https://", "https:///path", "not-a-url", ""])
def test_malformed_urls_are_refused_rather_than_crashing(url):
    assert refuse(url) is not None


def test_the_old_check_would_have_passed_all_of_these():
    # The precise regression guard: every string below satisfies the ORIGINAL
    # `url.startswith("http")` test. If validate_public_url ever stops refusing
    # one of them, the endpoint is back to where it started.
    was_accepted_before = [
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:5432",
        "http://10.0.0.5/admin",
        "https://user:pass@example.com/hook",
    ]
    for u in was_accepted_before:
        assert u.startswith("http"), "premise: the old gate accepted this"
        assert refuse(u) is not None, f"{u} is accepted again"


# ── The endpoint itself is no longer anonymous ──────────────────────────────
def test_relay_requires_a_planner_and_validates_before_sending():
    # Reading the wiring rather than standing up the app: the point is that
    # BOTH gates run, and that they run BEFORE any outbound client is opened.
    import inspect
    from app.routers import webhooks

    src = inspect.getsource(webhooks.relay_webhook)
    assert "require_planner" in src, "the relay is anonymous again"
    assert "validate_public_url" in src, "the destination is unvalidated again"
    assert src.index("require_planner") < src.index("httpx.AsyncClient")
    assert src.index("validate_public_url") < src.index("httpx.AsyncClient")
    # A 302 to a private address is the standard way around a pre-flight check.
    assert "follow_redirects=False" in src


def test_a_normal_public_webhook_still_works(public_dns):
    # The fix must not quietly turn the feature off. An allowlist would have —
    # which is exactly why validate_public_url does not impose one.
    assert refuse("https://hooks.zapier.com/hooks/catch/123/abc") is None
    assert refuse("https://example.com/webhook") is None
