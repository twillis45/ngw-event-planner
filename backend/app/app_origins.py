"""Is a redirect target one of OUR app origins?

WHY A MODULE AND NOT AN INLINE CHECK. `safe_fetch.py` is the precedent, and
`webhooks.py` is the cautionary tale: that guard already existed and one router
was simply never wired to it, which is how a live SSRF shipped. DocuSign builds
redirects too, and `create-subscription-session` will when it exists, so the
rule lives in one place from the start.

WHY IT REUSES THE CORS ALLOWLIST. A redirect allowlist needs a canonical list of
app origins, and one already exists: `ALLOWED_ORIGINS` (a real, non-empty
default of the production Pages origin plus localhost) and
`ALLOWED_ORIGIN_REGEX` (localhost / 127.0.0.1 / RFC1918 on any port, which
covers CRA :3000, hostv2 :5199, preview :5233 and LAN devices).

That makes this check unable to be wrong in a way CORS is not already wrong: any
origin that can legitimately reach these endpoints from a browser has, by
definition, passed CORSMiddleware against the same list. It adds no new
misconfiguration class for browser callers — and the threat it closes is not a
browser at all, it is `curl` from anywhere on the internet minting a genuine
Stripe checkout page on this account that redirects wherever the caller likes.
"""
import re
from urllib.parse import urlparse

from .config import ALLOWED_ORIGIN_REGEX, ALLOWED_ORIGINS, APP_BASE_URL

MAX_REDIRECT_LEN = 2048


def app_origins() -> list:
    """The origins a redirect may point at.

    `"*"` IS DELIBERATELY NOT HONOURED. It is a defensible CORS setting — there
    the real boundary is the JWT — but as a redirect allowlist it would mean
    "send the payer anywhere", and the validation would silently become a no-op
    while still looking installed. That is worse than having no check at all, so
    a wildcard collapses to the one origin that is definitionally ours.
    """
    if "*" in ALLOWED_ORIGINS:
        p = urlparse(APP_BASE_URL)
        return [f"{p.scheme}://{p.netloc}"]
    return list(ALLOWED_ORIGINS)


def is_app_redirect(url: str) -> bool:
    """True only for an absolute http(s) URL on one of our own origins."""
    if not url or len(url) > MAX_REDIRECT_LEN:
        return False
    if any(c in url for c in "\r\n\t"):
        return False                      # header / URL smuggling
    try:
        p = urlparse(url)
    except Exception:
        return False
    if p.scheme not in ("http", "https"):
        return False                      # kills javascript: and data:
    if not p.hostname:
        return False                      # kills scheme-relative //evil.com
    if p.username or p.password:
        return False                      # kills https://ours@evil.com

    origin = f"{p.scheme}://{p.netloc}"
    # EXACT equality, never startswith/in: `https://twillis45.github.io.evil.com`
    # defeats both of those.
    if origin in app_origins():
        return True
    # fullmatch, never match: the LAN regex is UNANCHORED at the end, so
    # `re.match` would happily accept `http://localhost.evil.com`.
    if "*" not in ALLOWED_ORIGINS and ALLOWED_ORIGIN_REGEX:
        try:
            return bool(re.fullmatch(ALLOWED_ORIGIN_REGEX, origin))
        except re.error:
            return False
    return False
