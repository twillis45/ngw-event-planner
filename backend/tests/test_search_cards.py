"""The results page carries prices, and they pair with a listing by STRUCTURE.

The note this covers was corrected on 2026-10-02. Pairing by POSITION really is
guesswork — a regex taking "the first price after the id" was off by one card
and gave the same room $1,910 in one fetch and $7,517 in another. Parsing each
StaySearchResult object and reading the id, name and price OUT OF THE SAME
RECORD gave 16 of 16 identical prices across two independent fetches.

The fixture is ONE REAL CARD, lifted verbatim from a live Santa Fe search
rather than hand-written, because a synthetic card would only prove the parser
matches my idea of the shape.
"""
import json
import os

from app.routers.lodging import search_cards

HERE = os.path.dirname(__file__)
with open(os.path.join(HERE, "fixtures_airbnb_card.json"), encoding="utf-8") as fh:
    REAL_CARD = fh.read()

# A page is cards embedded in other markup; the parser must find them there.
PAGE = '<html><body><script>window.__d={"results":[' + REAL_CARD + ']}</script></body></html>'


def test_reads_the_real_card():
    got = search_cards(PAGE)
    assert len(got) == 1, got
    (room, rec), = got.items()
    # Ground truth: the listing page for this room is titled exactly this.
    assert room == "694594012522374038"
    assert rec["name"].startswith("HotTub + FirePit w. MtnViews")
    # The label reads "$3,355 for 4 nights" — a STAY TOTAL, not a nightly rate.
    assert rec["total"] == 3355
    assert rec["nights"] == 4


def test_a_page_with_no_cards_yields_nothing_rather_than_guessing():
    # This is the datacenter degradation path. An empty dict makes the endpoint
    # return exactly what it returned before prices existed.
    assert search_cards("<html><body>no cards here</body></html>") == {}
    assert search_cards("") == {}


def test_a_card_that_will_not_parse_is_skipped_not_guessed():
    broken = '<script>{"__typename":"StaySearchResult","oops":</script>'
    assert search_cards(broken) == {}


def test_a_card_with_no_price_is_not_invented():
    stripped = REAL_CARD.replace("structuredDisplayPrice", "somethingElse")
    assert search_cards('<script>[' + stripped + ']</script>') == {}


def test_the_same_card_twice_is_one_listing():
    twice = '<script>[' + REAL_CARD + ',' + REAL_CARD + ']</script>'
    assert len(search_cards(twice)) == 1


def test_it_refuses_a_nightly_label_as_a_total():
    # "for N nights" is the shape that makes this a stay total. Anything else
    # must not be read as one — a nightly rate in a total field is the crab
    # money bug, and this is the guard that keeps it out.
    nightly = REAL_CARD.replace("$3,355 for 4 nights", "$839 per night")
    assert search_cards('<script>[' + nightly + ']</script>') == {}
