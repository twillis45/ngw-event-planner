"""
Listing unfurl — the host-directed exception (2026-07-28)

WHY THIS EXISTS, AND WHAT IT IS NOT
-----------------------------------
The rental engine's standing rule is that the app never contacts Airbnb or Vrbo:
the destination research board's never-build list bans a live rental API, and
harvesting a listing's gallery or search results is scraping. The host has
explicitly overridden that for ONE narrow case, and this router is that case,
scoped as tightly as the decision allows.

What this does: given a single listing URL the host pasted and pressed a button
on, fetch that one page and read its OWN PUBLISHED SHARING METADATA — the
Open Graph tags a site publishes precisely so that links can be unfurled. This
is the same behaviour every messaging app performs when you paste a link, and
the page is one the host is already looking at.

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
    oversight.
"""

import logging
import re
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query

log = logging.getLogger("ngw.lodging")
router = APIRouter(prefix="/api/lodging", tags=["lodging"])

# Only listing pages on platforms the rental engine already models. An open
# fetcher would be an SSRF hole and a genuine crawler; this is neither.
ALLOWED_HOSTS = (
    "airbnb.com", "www.airbnb.com",
    "vrbo.com", "www.vrbo.com",
    "booking.com", "www.booking.com",
)

TIMEOUT = httpx.Timeout(8.0, connect=4.0)
MAX_BYTES = 512_000          # a listing head is small; stop reading long before a full page
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
            detail="Only https links to Airbnb, Vrbo or Booking.com listings can be read here.",
        )

    try:
        async with httpx.AsyncClient(
            timeout=TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"},
        ) as client:
            resp = await client.get(url)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The listing took too long to answer. Copy the page and paste it instead.")
    except Exception as exc:  # network-level failure
        log.info("unfurl transport failure: %s", exc)
        raise HTTPException(status_code=502, detail="Couldn’t reach the listing. Copy the page and paste it instead.")

    if resp.status_code in (401, 403, 429):
        # The expected, honest failure — say so rather than dressing it up.
        raise HTTPException(
            status_code=502,
            detail="The site declined an automated read (this is common). Copy the listing page and paste it — that always works.",
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"The listing answered {resp.status_code}. Copy the page and paste it instead.")

    html = resp.text[:MAX_BYTES]

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
