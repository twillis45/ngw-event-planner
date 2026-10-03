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
  · host-initiated, always: nothing is read that the host did not ask for by
    pasting a link or pressing "Pull the places in".
  · AMENDED 2026-10-02, because the line above used to read "no rate at which
    this could resemble a bot: one page, host-initiated" and the client no
    longer makes that true. Accepting the search offer now reads up to twenty
    listings, two at a time with jittered spacing, and stops on two consecutive
    refusals. That is still one host action and still not a crawl — but it is a
    rate, and a promise this file could no longer keep had to be rewritten
    rather than left standing. The ceiling, the concurrency and the breaker all
    live in hostv2/src/LodgingCockpit.jsx; this endpoint is unchanged and still
    serves exactly one page per call.

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

import json
import logging
import base64
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



# ── THE LISTING'S OWN STRUCTURED RECORD (2026-08-04) ────────────────────────
# Host: "if we have the link to go the site, what other information can we pull
# from the listing" — and, decisively, "what other information do we need to
# make the choices viable".
#
# The answer to both is one block we were already fetching and throwing away.
# An Airbnb listing carries schema.org JSON-LD, and it holds the field the whole
# comparison is blocked on:
#
#   containsPlace.occupancy.value  -> SLEEPS. Nothing else supplies it. A
#       results card never carries it (see D6/W3b "sleeps —"), and without it
#       `fits` cannot be computed, so "3 of 5 fit", the ranking and the
#       per-person split are all stranded on a number the host has to type.
#   aggregateRating                -> the rating and how many left it
#   address.addressLocality        -> the town the listing itself claims
#   latitude / longitude           -> a real position; we state DISTANCE from
#       this, never a drive time, which would need routing we do not have
#   name                           -> the host's own listing title, which is
#       better than og:title's generated "Home in Santa Fe · ★4.79 · ..."
#
# What is NOT here, checked rather than assumed: no price on any meta tag or in
# the JSON-LD, and `amenityFeature` appears zero times. Price and amenities stay
# host-typed. We do not guess either, and the surface says which is which.
_LD = re.compile(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', re.I | re.S)



# The listing's real guest capacity. personCapacity and maxGuestCapacity agree
# on every sample; either is accepted so one being renamed cannot silently zero
# the field out.
_CAPACITY = re.compile(r'"personCapacity":(\d{1,3})|"maxGuestCapacity":(\d{1,3})')
# One AmenityItem object, scanned whole so FIELD ORDER cannot break it — the
# first cut of this assumed "title" preceded "available" and matched nothing at
# all, because the real shape is {"__typename":"AmenityItem","available":true,
# "title":"Kitchen","icon":…}. Scanning the object and pulling each field out of
# it separately is immune to that, and to any field added between them.
_AMENITY_ITEM = re.compile(r'\{"__typename":"AmenityItem"[^{}]{0,400}\}')
_AM_TITLE = re.compile(r'"title":"([^"]{2,60})"')
_AM_AVAIL = re.compile(r'"available":(true|false)')


def _first_num(v):
    try:
        n = float(v)
        return int(n) if n == int(n) else n
    except (TypeError, ValueError):
        return None


def _listing_record(html: str) -> dict:
    """Pull the listing's own structured record. Never raises — a page without
    one, or with malformed JSON, simply yields nothing."""
    out = {}
    for block in _LD.findall(html)[:4]:
        try:
            data = json.loads(block.strip())
        except Exception:
            continue
        for d in (data if isinstance(data, list) else [data]):
            if not isinstance(d, dict):
                continue
            # ── occupancy IS NOT CAPACITY (driven 2026-08-06) ──────────────
            # This used to feed `sleeps`, and it was wrong in the most damaging
            # way available. containsPlace.occupancy.value is the BED count:
            #   6BR / 8 beds  -> occupancy 8,  personCapacity 16
            #   4BR / 6 beds  -> occupancy 6,  personCapacity 10
            #   4BR / 4 beds  -> occupancy 4,  personCapacity 10
            # A host planning for 10 was told two houses that BOTH fit — one
            # sleeping 16, one sleeping exactly 10 — slept 8 and 6, i.e. that
            # neither fit. Understating capacity makes a host discard the right
            # house, and `sources.sleeps: 'read'` vouched for the wrong number,
            # which is worse than leaving it blank.
            #
            # It was verified as "returns a number", never as "means capacity";
            # occupancy matching the bed count on every sample was the tell.
            # Real capacity comes from personCapacity below. Nothing reads
            # occupancy now — beds already come off the title.
            ar = d.get("aggregateRating")
            if isinstance(ar, dict) and "rating" not in out:
                r = _first_num(ar.get("ratingValue"))
                c = _first_num(ar.get("ratingCount") or ar.get("reviewCount"))
                if r is not None:
                    out["rating"] = r
                    if c is not None:
                        out["ratingCount"] = int(c)
            addr = d.get("address")
            if isinstance(addr, dict) and "locality" not in out:
                loc = str(addr.get("addressLocality") or "").strip()
                if loc:
                    out["locality"] = loc[:80]
            lat, lon = _first_num(d.get("latitude")), _first_num(d.get("longitude"))
            if lat is not None and lon is not None and "lat" not in out:
                out["lat"], out["lon"] = lat, lon
            nm = str(d.get("name") or "").strip()
            if nm and "listingName" not in out:
                out["listingName"] = nm[:120]

    # ── WHAT THE PAGE SAYS OUTSIDE ITS JSON-LD ──────────────────────────────
    # Both of these sit in the embedded render payload rather than the
    # schema.org block, which is why an og:/JSON-LD-only reader missed them.
    cap = _CAPACITY.search(html)
    if cap:
        n = _first_num(cap.group(1) or cap.group(2))
        if n and n > 0:
            out["sleeps"] = int(n)

    # Amenities carry their own availability flag, so this stays three-valued:
    # listed-and-present, listed-and-absent, or never mentioned. We keep only
    # what the page affirms and record the rest as absent — we never infer.
    have, lack = [], []
    seen = set()
    for m in _AMENITY_ITEM.finditer(html):
        obj = m.group(0)
        t_m, a_m = _AM_TITLE.search(obj), _AM_AVAIL.search(obj)
        if not t_m or not a_m:
            continue
        t = _unescape(t_m.group(1)).strip()[:60]
        if not t or t.lower() in seen:
            continue
        seen.add(t.lower())
        (have if a_m.group(1) == "true" else lack).append(t)
    if have:
        out["amenities"] = have[:40]
    if lack:
        out["amenitiesAbsent"] = lack[:40]
    return out


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
        # The listing's own structured record. Absent keys mean the page did not
        # say — never a zero, never a guess.
        **_listing_record(html),
    }

# ── WHAT A SEARCH LINK CAN AND CANNOT GIVE (2026-08-04) ─────────────────────
# Host: "can the app pull listings from results link". Probed rather than
# guessed, and the first probe nearly produced the wrong answer: a fetched
# Airbnb results page has ZERO /rooms/ links and zero JSON-LD, so it looks
# empty. It is not. The ids are in an embedded Explore payload as
# `"listingId":"20421338"` inside ExploreStayMapInfo objects — 18 of them on a
# normal page, alongside 121 photos.
#
# What is NOT recoverable: those objects are MAP PINS. Names and prices live in
# a different structure and are not adjacent to the ids, so pairing them by
# position would be guesswork — and a confident wrong price is far worse here
# than no price. `personCapacity` and `ratingAverage` appear zero times, so the
# `sleeps` that gates the whole comparison is not here either.
#
# ── AMENDED 2026-10-02: THE PRICES ARE THERE, AND THEY ARE PAIRABLE ───────
# The paragraph above is right that the MAP PINS carry no price and that
# pairing by POSITION would be guesswork. What it missed is that there is a
# second structure on the same page where the two live in ONE record: each
# `StaySearchResult` object carries a base64 node id that decodes to
# "DemandStayListing:<roomId>", the listing's own name, and its
# `structuredDisplayPrice`. No position guessing is needed because the fields
# are in the same object.
#
# HOW THIS WAS ESTABLISHED, because the note it corrects was also written in
# good faith:
#   · a regex that took "the first price after the id" looked right and was
#     OFF BY ONE CARD — it gave the same room $1,910 in one fetch and $7,517
#     in another. Internally consistent within a page, and wrong. Rejected.
#   · parsing each card as JSON and keying on the listing NAME gave 16 of 16
#     IDENTICAL prices across two independent fetches of the same search.
#   · ground truth: the listing page for room 694594012522374038 has the
#     title "HotTub + FirePit w. MtnViews | Pets OK | DT 10mins", which is
#     exactly the name on the card claiming that room id.
#   · the labels read "$3,355 for 4 nights", so these are STAY TOTALS, not
#     nightly rates. The nights count is carried so nothing has to assume it.
#
# A LISTING page still has no price — verified from a residential IP with
# check-in/check-out in the URL: the only dollar figures in 645KB are the
# host's own house rules ($500 smoking fine, $1,000 police fine). That is why
# the price has to come from here or not at all.
#
# UNKNOWN AT THE TIME OF WRITING: this was measured from a residential IP.
# Render is a datacenter IP and Airbnb serves those differently. If the page
# this endpoint receives has no card objects, `places` simply comes back
# empty and the response is exactly what it was before — links only. The
# client is written to that: prices when they are there, the old honest
# "no names or prices" path when they are not.
_CARD = re.compile(r'"__typename":"StaySearchResult"')
_NODE = re.compile(r'"id":"([A-Za-z0-9+/=]{20,})"')
_PRICE_LABEL = re.compile(r'\$([\d,]+) for (\d+) nights?')
_MAX_CARDS = 40
_MAX_CARD_BYTES = 120_000


def _walk(node, key, acc):
    """Every value under `key`, at any depth."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k == key:
                acc.append(v)
            _walk(v, key, acc)
    elif isinstance(node, list):
        for v in node:
            _walk(v, key, acc)
    return acc


def _card_objects(html: str):
    """Each StaySearchResult record on the page, parsed as JSON. Never raises:
    a card that will not parse is skipped, not guessed at."""
    for n, m in enumerate(_CARD.finditer(html)):
        if n >= _MAX_CARDS:
            return
        start = html.rfind('{', 0, m.start())
        if start < 0:
            continue
        depth, end = 0, None
        for j in range(start, min(start + _MAX_CARD_BYTES, len(html))):
            c = html[j]
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = j + 1
                    break
        if not end:
            continue
        try:
            yield json.loads(html[start:end])
        except Exception:
            continue


def _room_of(card) -> str:
    for raw in (x for x in _walk(card, 'id', []) if isinstance(x, str)):
        try:
            dec = base64.b64decode(raw + '==').decode('utf-8', 'ignore')
        except Exception:
            continue
        if dec.startswith('DemandStayListing:'):
            rid = dec.split(':', 1)[1]
            if rid.isdigit():
                return rid
    return ''


def search_cards(html: str) -> dict:
    """{roomId: {'name', 'total', 'nights'}} for every card showing a price."""
    out = {}
    for card in _card_objects(html):
        rid = _room_of(card)
        if not rid or rid in out:
            continue
        names = [n.get('localizedStringWithTranslationPreference')
                 for n in _walk(card, 'name', []) if isinstance(n, dict)]
        name = next((n for n in names if isinstance(n, str) and n.strip()), '')
        # ── READ THE PRICE OUT OF THE PRICE NODE, NOT OUT OF THE CARD ──────
        # The first cut searched every accessibilityLabel in the record for
        # something with a $ and the word "night". A card carries more than
        # one such string — "originally $3,701" among them — so that was
        # picking a price by luck of ordering inside the object, which is the
        # same failure as picking one by position inside the page, one level
        # down. Caught by the test that strips structuredDisplayPrice and
        # still got a price back.
        label = ''
        for node in _walk(card, 'structuredDisplayPrice', []):
            label = next((x for x in _walk(node, 'accessibilityLabel', [])
                          if isinstance(x, str) and '$' in x), '')
            if label:
                break
        m = _PRICE_LABEL.search(label)
        if not m:
            continue
        try:
            total = int(m.group(1).replace(',', ''))
            nights = int(m.group(2))
        except ValueError:
            continue
        out[rid] = {'name': name[:80], 'total': total, 'nights': nights}
    return out
#
# WHY IT IS AN OFFER, NOT AN AUTOMATIC PULL. This is one fetch of one page the
# host asked for. It deliberately does NOT walk the results and unfurl each
# listing: that would be bulk automated reading, which is exactly what the
# never-build rule and the egress guard in this file exist to prevent. The host
# picks which places to keep; only those get read.
_LISTING_ID = re.compile(r'"listingId":"(\d{4,20})"')
MAX_RESULTS = 24


def _is_search_url(url: str) -> bool:
    """A results page, not a listing. Airbnb /s/…, Vrbo /search…"""
    try:
        p = urlparse(url)
    except Exception:
        return False
    path = (p.path or "").lower()
    host = (p.hostname or "").lower()
    if "airbnb" in host:
        return path.startswith("/s/")
    if "vrbo" in host:
        return path.startswith("/search") or path.startswith("/vacation-rentals")
    return False


@router.get("/results")
async def results(url: str = Query(..., min_length=12, max_length=2048)):
    """Read one results page the host is looking at and return the listing links
    on it. Host-initiated, one page, never a crawl."""
    if not _host_ok(url):
        raise HTTPException(
            status_code=400,
            detail="Only https links to an Airbnb or Vrbo search can be read here.",
        )
    if not _is_search_url(url):
        raise HTTPException(
            status_code=400,
            detail="That looks like a single listing rather than a search. Paste it in the box and I will read it.",
        )
    try:
        html_bytes, _c, _f = await safe_get(
            url,
            allowed_hosts=ALLOWED_HOSTS,
            allowed_content_types=("text/html", "application/xhtml+xml"),
            max_bytes=MAX_BYTES,
            truncate_at_max=True,
            timeout=TIMEOUT,
            user_agent=UA,
        )
    except SafeFetchError as exc:
        raise HTTPException(status_code=502, detail=exc.reason)
    except Exception as exc:
        log.info("results transport failure: %s", exc)
        raise HTTPException(status_code=502, detail="Couldn’t reach that search. Copy the results page and paste it instead.")

    html = html_bytes.decode("utf-8", errors="replace")
    host = (urlparse(url).hostname or "").lower()
    base = "https://www.vrbo.com/" if "vrbo" in host else "https://www.airbnb.com/rooms/"
    ids, seen = [], set()
    for m in _LISTING_ID.finditer(html):
        i = m.group(1)
        if i not in seen:
            seen.add(i)
            ids.append(i)
        if len(ids) >= MAX_RESULTS:
            break
    # ── THE CARDS, WHEN THE PAGE WE WERE SERVED HAS THEM (2026-10-02) ─────
    # Never raises and never guesses: a page without card objects yields {},
    # and the response is then byte-for-byte the one this endpoint has always
    # returned. That is the degradation path for a datacenter IP being served
    # a thinner page than a browser gets.
    try:
        cards = search_cards(html)
    except Exception as exc:                      # pragma: no cover - defensive
        log.info("results card parse failed, falling back to links: %s", exc)
        cards = {}

    places = []
    for i in ids:
        c = cards.get(i)
        row = {"url": base + i}
        if c:
            # `total` is a STAY total — the label says "for N nights" — so the
            # nights it covers rides with it rather than being assumed.
            row["totalPrice"] = c["total"]
            row["nights"] = c["nights"]
            if c["name"]:
                row["name"] = c["name"]
        places.append(row)

    priced = sum(1 for p in places if "totalPrice" in p)
    return {
        "ok": True,
        "url": url,
        "count": len(ids),
        # Kept, unchanged, because every existing caller reads it.
        "links": [base + i for i in ids],
        # NEW: the same listings with whatever the page actually said about
        # them. `priced` lets the client speak accurately instead of inferring
        # from an empty field — 0 means this page carried no prices, which is
        # a different sentence from "this place has no price".
        "places": places,
        "priced": priced,
        # linksOnly now means what it says: we learned nothing but the links.
        "linksOnly": priced == 0,
    }
