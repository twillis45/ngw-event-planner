"""ONE RULE, TWO LANGUAGES: THE OUTWARD LINES (audit 2, lane E P0-4, P1-1, P1-2).

The invite email and the helper email are composed here on the server; the
pages a guest, helper, vendor or relative opens are composed in the app. The
place line, the days, the host and the diet counts used to be built four
different ways. backend/app/outward.py is the server's copy of the app's
readers (venueFor.formatVenueAddress, doItForMe.fmtLongSpan, hostNameFor,
dietRows.dietCountsFor), and this file pins it to the SAME fixture rows the
app's own test pins (src/lib/__tests__/outwardLinesFixture.test.js).
"""
import json
import pathlib

import pytest

from app import outward as O

FIXTURE = pathlib.Path(__file__).resolve().parents[2] / "src/lib/__tests__/fixtures/outwardLines.fixture.json"
CASES = json.loads(FIXTURE.read_text())


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_the_server_gives_the_apps_lines(case):
    ev, want = case["event"], case["expect"]
    assert O.place_line(ev) == want["line"]
    assert O.town_line(ev) == want["town"]
    assert O.is_home(ev) == want["isHome"]
    assert O.event_days(ev) == want["days"]
    assert O.host_name_for(ev) == want["host"]
    assert O.diet_counts_for(ev) == want["diets"]


def test_a_private_home_shows_family_its_town_only():
    """Owner (#226 follow-up): family sees the town for a private home, never the street."""
    home = next(c["event"] for c in CASES if c["id"] == "home-street")
    assert O.place_line(home, private_home="town") == "Our place · Bowie, MD 20715"
    hall = next(c["event"] for c in CASES if c["id"] == "venue-full-address")
    assert O.place_line(hall, private_home="town") == O.place_line(hall)
