"""THE VENDOR BRIEF SAYS WHAT THE HOST'S APP KNOWS (audit 2, lane E P1-2, P0-4).

On the Wanda sample the brief carried no dietary needs (it read only the
host's stored tallies, never her guests' replies), no day-of contact and no
start time, and was signed "From the host" because the sample spells the host
line `host`. Now:
  * diets are dietCountsFor's (the host's tally wins per tag, the replies
    fill the rest), fixed vocabulary only, numbers only;
  * the host's name follows hostNameFor's rule, so the page signs with it and
    names her as the day-of contact when no one else is named;
  * the start time the host set, and every day of a multi-day event;
  * the parts of the one place line (street, City, ST ZIP): a vendor is
    working there.
Fictional sample data only.
"""
import json

from app.routers import vendor_brief as vb

from tests._wanda_sample import GUEST_NAMES, wanda


def _brief(data):
    v = next(x for x in data["vendors"] if x.get("category") == "Catering")
    return vb.build_vendor_brief_payload(v, data.get("id"), data)


def test_the_caterer_reads_the_diets_her_guests_replied_with():
    ev = wanda()
    ev["guests"].append({"id": "g10", "name": "Ana Ruiz", "rsvp": "Yes", "diets": ["Vegan"], "allergens": ["Shellfish"]})
    brief = _brief(ev)
    # Vida's Vegetarian meal, Chaplain Ellis's Gluten-free, Ana's reply.
    assert brief["dietCounts"] == {"Vegetarian": 1, "Gluten-free": 1, "Vegan": 1, "Shellfish": 1}
    blob = json.dumps(brief, ensure_ascii=False)
    for name in GUEST_NAMES + ("Ana", "Ruiz"):
        assert name not in blob, name


def test_the_hosts_own_tally_still_wins_and_free_text_stays_home():
    ev = {**wanda(), "dietCounts": {"Vegetarian": 6, "Gluten-free": 0, "Grandma no-salt": 2}}
    assert _brief(ev)["dietCounts"] == {"Vegetarian": 6}


def test_the_brief_signs_with_the_host_and_carries_the_hour_and_the_days():
    ev = {**wanda(), "endDate": "2027-03-21"}
    brief = _brief(ev)
    assert brief["hostName"] == "Wanda Mundy"
    assert brief["startTime"] == "18:30"
    assert brief["endDate"] == "2027-03-21"
    assert _brief({**ev, "startTimeSource": "derived"})["startTime"] == ""


def test_the_brief_carries_the_whole_place_line():
    ev = {**wanda(), "venueAddress": "6420 Old Marlboro Pike", "venueZip": "20772", "venueKind": "venue"}
    brief = _brief(ev)
    assert (brief["venueAddress"], brief["venueCity"], brief["venueZip"], brief["venueKind"]) == \
        ("6420 Old Marlboro Pike", "Upper Marlboro, MD", "20772", "venue")
