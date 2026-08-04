"""
Listing unfurl — the host-directed exception (2026-07-28)

WHY THIS EXISTS, AND WHAT IT IS NOT
-----------------------------------
The rental engine's standing rule is that the app never contacts Airbnb or Vrbo:
the destination research board's never-build list bans a live rental API, and
harvesting a listing's gallery or search results is scraping. The host has
explicitly overridden that for ONE narrow case, and this router is that case,
scoped as tightly as the decision allows.

WHAT WE ACTUALLY CLAIM (rewritten 2026-07-28 after the review board).

The first version of this docstring argued that reading a page's Open Graph tags
"is the same behaviour every messaging app performs when you paste a link." That
is true and irrelevant, and it was doing rhetorical work it had not earned: it
smuggled in the claim that because the mechanism is common, it is PERMITTED.
Research settled that it is not. There is no oEmbed endpoint on these platforms
and no OpenGraph/preview/unfurl carve-out in any of their terms. Nobody has
permitted this. Messaging apps do it from a position of scale and mutual
commercial interest — platforms WANT their links to unfurl in iMessage because it
drives bookings. That is tolerance, not permission, and tolerance is a
relationship we do not have.

So the honest statement is about our CONDUCT, not our rights:

  We read one page's published sharing metadata, on the host's explicit action,
  on a link she gave us. No platform's terms permit it. Airbnb's forbid automated
  collection; Vrbo's forbid automated AND manual copying. We do it anyway, in the
  narrowest form we could build — one page, one request, host-initiated, a
  self-identifying user agent, on a path robots.txt allows for our agent class,
  no crawling, no gallery, no search harvest, nothing retained server-side. Any
  of these platforms could ask us to stop. If asked, we will. The paste path
  exists so the product still works the day that happens.

That last sentence is the load-bearing one, and it is testable: the error copy
below sends the host back to pasting, and the product survives losing this
endpoint entirely.

Note also (verified 2026-07-28): Airbnb's robots.txt disallows `/rooms/*/photos`,
`/rooms/*/amenities`, `/rooms/*/reviews` and `/rooms/*/description` for our agent
class but NOT the bare `/rooms/<id>` page this fetches. Every sub-path they
forbid is one we already refused to build. If a UA containing `ClaudeBot` or
`anthropic-ai` ever reaches here, that changes — those agents get an explicit
`Disallow: /rooms/` that ours does not.

What this deliberately does NOT do:
  · no crawling — one URL, one request, only on an explicit host action
  · no search-results harvesting, ever
  · no gallery harvesting; og:image is the ONE image the page offers for sharing.
    The full gallery still comes from the host's own copy-paste, which remains
    the primary path precisely because it needs no fetch at all.
  · no storage — nothing about the listing is retained server-side
  · no rate at which this could resemble a bot: one page, host-initiated

HONEST LIMITS the host should hear rather than discover:
  · Airbnb and Vrbo actively block datacenter traffic. This runs from Render, so
    a meaningful share of requests will come back 403/429 or as a challenge page.
    The endpoint reports that plainly instead of pretending; the paste path is
    the fallback and is not going away.
  · Automated access is contrary to those platforms' terms of use. That exposure
    is the product owner's decision, taken knowingly on 2026-07-28. It is
    recorded here so the next reader knows it was a decision and not an
    oversight — stated plainly, without the defence the earlier draft attached.
"""

import logging
import re
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query

from ..safe_fetch import SafeFetchError, safe_get

log = logging.getLogger("ngw.lodging")
router = APIRouter(prefix="/api/lodging", tags=["lodging"])

# Only listing pages on platforms the rental engine already models. An open
# fetcher would be an SSRF hole and a genuine crawler; this is neither.
# BOOKING.COM REMOVED 2026-07-28 (review board). Its terms (A15) specifically
# name automated assistants that work "by interacting with or otherwise making
# use of your browser" — and the SERVER path is the worse of the two places it
# appeared: the bookmarklet at least runs in the host's own browser on her own
# IP, while this runs from a datacenter under a self-identifying non-browser
# user agent, which is the exact fact pattern that clause was written to catch.
# The board's note: "the audit found one exposure and there were two."
ALLOWED_HOSTS = (
    "airbnb.com", "www.airbnb.com",
    "vrbo.com", "www.vrbo.com",
)

TIMEOUT = httpx.Timeout(8.0, connect=4.0)
# A listing head is small; stop reading long before a full page. That was always
# the intent of this cap and safe_get did the opposite with it — it REFUSED any
# document bigger than the cap, so every real Airbnb page came back
# "That document is too large to read." and the host got a row with no name, no
# price and no picture (driven 2026-08-04). The og: tags we want live in <head>,
# inside the first few tens of KB, so a prefix is exactly what we need.
# Raised from 512_000 on 2026-08-04. Truncation is what makes the read WORK;
# this is headroom so the prefix actually contains what we came for. Airbnb
# inlines a lot of CSS and JSON-LD ahead of its og: tags, and 512KB is not a
# reliable margin for reaching them. 1.5MB still stops far short of a full page
# and is bounded per request — we never buffer more than this.
MAX_BYTES = 1_500_000
UA = "Mozilla/5.0 (compatible; EventBossLinkPreview/1.0; +link-unfurl-on-user-action)"

_META = re.compile(
    r"<meta[^>]+(?:property|name)=[\"']([^\"']+)[\"'][^>]+content=[\"']([^\"']*)[\"']",
    re.I,
)
_META_REV = re.compile(
    r"<meta[^>]+content=[\"']([^\"']*)[\"'][^>]+(?:property|name)=[\"']([^\"']+)[\"']",
    re.I,
)
_TITLE = re.compile(r"<title[^>]*>([^<]{0,300})</title>", re.I)
_CANON = re.compile(r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"']([^\"']+)[\"']", re.I)


def _unescape(v: str) -> str:
    for a, b in (("&amp;", "&"), ("&quot;", '"'), ("&#39;", "'"), ("&lt;", "<"), ("&gt;", ">")):
        v = v.replace(a, b)
    return v.strip()


def _host_ok(url: str) -> bool:
    try:
        p = urlparse(url)
    except Exception:
        return False
    return p.scheme == "https" and (p.hostname or "").lower() in ALLOWED_HOSTS


@router.get("/unfurl")
async def unfurl(url: str = Query(..., min_length=12, max_length=2048)):
    """Read one listing page's own sharing metadata. Host-initiated, never bulk."""
    if not _host_ok(url):
        raise HTTPException(
            status_code=400,
            detail="Only https links to an Airbnb or Vrbo listing can be read here.",
        )

    # SECURITY (2026-07-30): _host_ok gates the FIRST url, but follow_redirects=True
    # meant an allowlisted listing could 302 the server anywhere — including a
    # private address or 169.254.169.254. safe_get re-validates every hop against
    # the same allowlist and rejects non-public resolved addresses.
    try:
        html_bytes, _ctype, _final = await safe_get(
            url,
            allowed_hosts=ALLOWED_HOSTS,
            allowed_content_types=("text/html", "application/xhtml+xml"),
            max_bytes=MAX_BYTES,
            # Read the head and stop — a truncated listing page is still a
            # readable listing head. Same byte ceiling, we just keep what we got.
            truncate_at_max=True,
            timeout=TIMEOUT,
            user_agent=UA,
        )
    except SafeFetchError as exc:
        up = exc.upstream_status
        if exc.status_code == 504:
            raise HTTPException(status_code=504, detail="The listing took too long to answer. Copy the page and paste it instead.")
        if up in (401, 403, 429):
            # The expected, honest failure — say so rather than dressing it up.
            raise HTTPException(
                status_code=502,
                detail="The site declined an automated read (this is common). Copy the listing page and paste it — that always works.",
            )
        if up is not None:
            raise HTTPException(status_code=502, detail=f"The listing answered {up}. Copy the page and paste it instead.")
        raise HTTPException(status_code=exc.status_code, detail=exc.reason)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The listing took too long to answer. Copy the page and paste it instead.")
    except Exception as exc:  # network-level failure
        log.info("unfurl transport failure: %s", exc)
        raise HTTPException(status_code=502, detail="Couldn’t reach the listing. Copy the page and paste it instead.")

    html = html_bytes.decode("utf-8", errors="replace")[:MAX_BYTES]

    meta = {}
    for pat in (_META, _META_REV):
        for a, b in pat.findall(html):
            key, val = (a, b) if pat is _META else (b, a)
            k = key.lower().strip()
            if k not in meta and val.strip():
                meta[k] = _unescape(val)

    title = meta.get("og:title") or meta.get("twitter:title") or ""
    if not title:
        m = _TITLE.search(html)
        title = _unescape(m.group(1)) if m else ""
    # Trim the platform's own suffix the way the client-side extractor does.
    title = re.sub(r"\s*[|·—-]\s*(Vrbo|Airbnb|Booking\.com).*$", "", title, flags=re.I).strip()[:120]

    image = meta.get("og:image") or meta.get("twitter:image") or ""
    if image and not image.startswith("https://"):
        image = ""

    canon = ""
    m = _CANON.search(html)
    if m and m.group(1).startswith("https://"):
        canon = m.group(1).split("?")[0]

    # AN ERROR PAGE IS NOT A LISTING. A dead or moved URL frequently answers 200
    # with a perfectly parseable "404 Page Not Found" title — caught in testing
    # against a made-up room id, which unfurled "successfully" as garbage. A
    # confident wrong answer is worse here than no answer.
    if re.search(r"\b(404|not found|page unavailable|no longer available|error)\b", title, re.I):
        raise HTTPException(
            status_code=502,
            detail="That link doesn’t open a live listing. Check the link, or copy the page and paste it.",
        )

    # ── THE EGRESS GUARD (review board, Engineering Realist 2026-07-28) ──────
    # "You verified 4 listings on one day. That is not a passing test, it is a
    # weather report." The failure mode nobody would notice: a platform that
    # decides it dislikes datacenter traffic can answer 200 with its GENERIC
    # HOMEPAGE metadata instead of the listing's. Every field parses, nothing
    # errors, and the host gets a shortlist row named "Vacation Rentals, Homes,
    # Experiences & Places". A confident wrong answer is the thing this endpoint
    # exists to refuse — same reason the error-page guard above exists.
    #
    # (Tested against production 2026-07-28: three distinct listings returned
    # three distinct titles matching what the host's own browser saw, so this is
    # not currently firing. It is here because we would not find out if it did.)
    GENERIC_TITLES = (
        "vacation rentals", "holiday rentals", "cabins", "beach houses",
        "book your", "find and book", "unique places to stay",
    )
    low = title.lower().strip()
    if low and any(low.startswith(g) or low == g for g in GENERIC_TITLES):
        raise HTTPException(
            status_code=502,
            detail="That came back as the site's front page, not the listing. Copy the listing page and paste it instead.",
        )

    if not (title or image):
        raise HTTPException(
            status_code=502,
            detail="That page didn’t publish anything readable. Copy the listing page and paste it instead.",
        )

    # THE TITLE CARRIES REAL FACTS. Airbnb writes its listing title as
    # "Home in McHenry · ★5.0 · 5 bedrooms · 7 beds · 4 baths" — beds and baths
    # are exactly the numbers the seating/fit maths wants, and pulling them here
    # saves the host typing what the page already said. Only what is literally
    # present is returned; nothing is inferred from a missing figure.
    def _num(pattern):
        m = re.search(pattern, f"{title} {meta.get('og:description', '')}", re.I)
        if not m:
            return None
        try:
            v = float(m.group(1))
        except ValueError:
            return None
        return int(v) if v == int(v) else v

    facts = {
        "bedrooms": _num(r"(\d+(?:\.\d+)?)\s*bedrooms?"),
        "beds": _num(r"(\d+(?:\.\d+)?)\s*beds?\b"),
        "baths": _num(r"(\d+(?:\.\d+)?)\s*(?:full\s*)?baths?\b"),
        "guests": _num(r"(\d+)\s*guests?\b"),
    }

    return {
        "ok": True,
        "url": canon or url.split("?")[0],
        "title": title,
        "facts": {k: v for k, v in facts.items() if v is not None},
        # ONE image — the page's own sharing picture. The gallery is not fetched;
        # that stays with the host's paste, by design.
        "image": image,
        "description": (meta.get("og:description") or "")[:400],
        "siteName": meta.get("og:site_name") or "",
    }
