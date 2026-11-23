"""Six root causes, cause 6: the server refuses the same placeholders the app does."""
from app.outward import outward_gaps, is_placeholder_name

HOME = {"venueKind": "home", "venue": "Our place", "venueCity": "Fort Washington", "venueState": "MD"}
STREET = {**HOME, "venueStreet": "1204 Oxon Hill Rd", "venueZip": "20744"}


def test_placeholder_names_are_refused():
    for name in ["My Thanksgiving Hosting", "", "Thanksgiving Hosting"]:
        assert is_placeholder_name({"type": "Thanksgiving Hosting", "name": name})
    assert not is_placeholder_name({"type": "Thanksgiving Hosting", "name": "Thanksgiving Dinner"})


def test_a_home_needs_a_street_and_real_data_passes():
    keys = [g["key"] for g in outward_gaps({"type": "Thanksgiving Hosting", "name": "My Thanksgiving Hosting", **HOME})]
    assert keys == ["name", "address"]
    assert outward_gaps({"type": "Thanksgiving Hosting", "name": "Thanksgiving Dinner", **STREET}) == []
    assert outward_gaps({"type": "Birthday", "name": "Aunt Bee's Birthday", "venue": "Elks Lodge 2004", "venueKind": "venue", "venueCity": "Bowie", "venueState": "MD"}) == []
