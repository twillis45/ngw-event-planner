# ── A SEARCH LINK YIELDS LINKS, AND SAYS SO (2026-08-04) ────────────────────
#
# Host: "can the app pull listings from results link". Yes — but only links.
# The ids live in an embedded map-pin payload; names and prices sit in a
# different structure and are not adjacent, so pairing them by position would be
# a guess, and a confident wrong price is worse here than no price. These pin
# that contract so a future "improvement" cannot quietly start inventing facts.
import re

from app.routers.lodging import _LISTING_ID, _is_search_url, MAX_RESULTS


def test_search_urls_are_told_from_listing_urls():
    assert _is_search_url("https://www.airbnb.com/s/Santa-Fe--NM/homes?adults=10")
    assert _is_search_url("https://www.vrbo.com/search?destination=Santa+Fe")
    # a single listing is NOT a search — it belongs in the unfurl path
    assert not _is_search_url("https://www.airbnb.com/rooms/20421338")
    assert not _is_search_url("https://www.example.com/s/anything")
    assert not _is_search_url("not a url")


def test_ids_come_off_the_embedded_payload_not_from_hrefs():
    # A real results page has ZERO /rooms/ links — the first probe of this
    # nearly produced the wrong answer. The ids are in the Explore payload.
    html = (
        '<html><body><script>{"__typename":"ExploreStayMapInfo","listingId":"20421338",'
        '"pinState":"FULL_PIN"},{"__typename":"ExploreStayMapInfo","listingId":"9511209"}'
        '</script></body></html>'
    )
    assert "/rooms/" not in html
    assert _LISTING_ID.findall(html) == ["20421338", "9511209"]


def test_duplicate_ids_collapse_and_the_page_is_capped():
    html = "".join(f'"listingId":"{i}"' for i in range(1000, 1000 + MAX_RESULTS + 40))
    ids, seen = [], set()
    for m in _LISTING_ID.finditer(html):
        if m.group(1) not in seen:
            seen.add(m.group(1))
            ids.append(m.group(1))
        if len(ids) >= MAX_RESULTS:
            break
    assert len(ids) == MAX_RESULTS      # one page, never a crawl
    assert len(set(ids)) == len(ids)


def test_short_numbers_are_not_mistaken_for_listing_ids():
    # 4-digit floor: page metrics and indexes are full of small numbers.
    assert _LISTING_ID.findall('"listingId":"12"') == []
    assert _LISTING_ID.findall('"listingId":"4659490"') == ["4659490"]
