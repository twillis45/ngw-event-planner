# ── A GENUINE STRIPE PAGE THAT REDIRECTS ANYWHERE ───────────────────────────
#
# `success_url` / `cancel_url` were accepted unvalidated. A caller could produce
# a REAL Stripe checkout page on this account — correct branding, correct
# business name — that sends the payer to any site on completion. The payment
# page really is Stripe's and really is yours, which is exactly what makes it
# credible.
#
# I had deferred this believing an env-backed allowlist would fail closed
# wherever it was unset. The board showed that reasoning is false for this
# variable: `config.py` gives ALLOWED_ORIGINS a real non-empty default (the
# production Pages origin plus localhost) and ALLOWED_ORIGIN_REGEX a second one
# covering localhost/127.0.0.1/RFC1918 on any port. The canonical list I was
# waiting to decide on already existed and already gates every browser caller.
import pytest

from app import app_origins as AO
from app.app_origins import is_app_redirect

# Built the way src/lib/stripeApi.js actually builds them.
ALLOWED = [
    "https://twillis45.github.io/ngw-event-planner/?stripe_paid=1&fee_id=abc",
    "https://twillis45.github.io/ngw-event-planner/hostv2/?stripe_cancel=1",
    "https://twillis45.github.io/ngw-event-planner/?stripe_paid=1&session={CHECKOUT_SESSION_ID}",
    "http://localhost:3000/?stripe_paid=1&fee_id=x",
    "http://localhost:5199/ngw-event-planner/hostv2/?stripe_cancel=1",
    "http://127.0.0.1:5233/ngw-event-planner/hostv2/",
    "http://192.168.1.230:5199/",
]

REFUSED = [
    "https://evil.com/pay",
    "https://twillis45.github.io.evil.com/",          # suffix — defeats startswith/in
    "http://localhost.evil.com/",                     # defeats re.match without fullmatch
    "https://twillis45.github.io@evil.com/",          # userinfo
    "//evil.com/pay",                                 # scheme-relative
    "javascript:alert(1)",
    "data:text/html,<h1>pay</h1>",
    "http://twillis45.github.io/",                    # scheme downgrade; allowlist is https
    "https://evil.com/\r\nX-Injected: 1",
    "",
    "https://twillis45.github.io/" + "a" * 3000,
]


@pytest.mark.parametrize("url", ALLOWED)
def test_our_own_redirects_are_allowed(url):
    # Premise guard: a check that refuses everything would satisfy every
    # REFUSED case below while breaking payments entirely.
    assert is_app_redirect(url) is True, f"{url} must be allowed"


@pytest.mark.parametrize("url", REFUSED)
def test_everything_else_is_refused(url):
    assert is_app_redirect(url) is False, f"{url} must be refused"


def test_none_and_non_strings_do_not_crash():
    assert is_app_redirect(None) is False


def test_wildcard_cors_does_not_open_the_redirect(monkeypatch):
    # THE FAILURE MODE, MADE EXECUTABLE. `ALLOWED_ORIGINS="*"` is a plausible
    # "make CORS stop bothering me" setting, and it is defensible for CORS
    # because the real boundary there is the JWT. As a redirect allowlist it
    # would mean "send the payer anywhere" — the validation would look installed
    # and enforce nothing, which is worse than not having it.
    monkeypatch.setattr(AO, "ALLOWED_ORIGINS", ["*"])
    assert is_app_redirect("https://evil.com/") is False
    assert is_app_redirect("https://twillis45.github.io/ngw-event-planner/") is True


def test_a_wildcard_also_closes_the_lan_regex(monkeypatch):
    # Otherwise "*" would collapse the exact list but leave dev origins open.
    monkeypatch.setattr(AO, "ALLOWED_ORIGINS", ["*"])
    assert is_app_redirect("http://192.168.1.5:5199/") is False


def test_a_custom_domain_must_be_added_deliberately(monkeypatch):
    monkeypatch.setattr(AO, "ALLOWED_ORIGINS", ["https://plan.example.com"])
    assert is_app_redirect("https://plan.example.com/x") is True
    assert is_app_redirect("https://twillis45.github.io/") is False
