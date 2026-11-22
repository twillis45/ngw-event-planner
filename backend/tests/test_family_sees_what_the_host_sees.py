"""THE FAMILY LINK SAYS WHAT THE HOST'S APP SAYS (audit 2, lane E P0-4, P1-4).

  * Who hosts: hostNameFor's rule, so a plan spelling it `host` still names her.
  * Where: the one place line's parts (venueFor), so the page prints the
    venue's street, City, ST ZIP like the host's app. A PRIVATE HOME is the
    exception (owner, a #226 follow-up): family reads its town, never its
    street.
  * The checklist counts what the host's checklist counts: a step the plan
    retired leaves the list, as it leaves the host's "N of M".
Fictional sample data only.
"""
import json

from app.routers import family_view as fv

from tests._wanda_sample import wanda

HALL = {"name": "Reed Reunion", "date": "2027-12-13", "endDate": "2027-12-15", "host": "Dana Reed",
        "venue": "The Boathouse", "venueKind": "venue", "venueAddress": "9 Dock Rd",
        "venueCity": "Annapolis", "venueState": "MD", "venueZip": "21401"}
HOME = {"name": "Reed Cookout", "date": "2027-06-12", "hostName": "Dana Reed",
        "venue": "Our place", "venueKind": "home", "venueStreet": "12 Elm St", "venueAddress": "12 Elm St, Bowie, MD",
        "venueCity": "Bowie", "venueState": "MD", "venueZip": "20715"}


def test_the_family_page_names_the_host_from_any_spelling():
    assert fv.family_projection(wanda())["hostName"] == "Wanda Mundy"
    assert fv.family_projection(HALL)["hostName"] == "Dana Reed"


def test_a_venue_reaches_family_with_its_whole_address_and_its_last_day():
    plan = fv.family_projection(HALL)
    for k in ("venue", "venueKind", "venueAddress", "venueCity", "venueState", "venueZip", "endDate"):
        assert plan[k] == HALL[k], k


def test_a_private_home_reaches_family_as_its_town_only():
    plan = fv.family_projection(HOME)
    blob = json.dumps(plan)
    assert "12 Elm" not in blob and "venueStreet" not in plan and "venueAddress" not in plan
    assert (plan["venue"], plan["venueKind"], plan["venueCity"], plan["venueState"]) == ("Our place", "home", "Bowie", "MD")


def test_a_home_whose_name_is_its_street_drops_the_name_too():
    plan = fv.family_projection({**HOME, "venue": "12 Elm St"})
    assert "12 Elm" not in json.dumps(plan)


def test_the_checklist_leaves_out_what_the_plan_retired():
    data = {"name": "n", "timeline": [{"task": "Book the DJ", "done": True},
                                      {"task": "Order the cake", "done": False},
                                      {"task": "Rent a tent", "done": False, "retired": True}]}
    assert [t["task"] for t in fv.family_projection(data)["checklist"]] == ["Book the DJ", "Order the cake"]
