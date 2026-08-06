# ── occupancy IS NOT CAPACITY, AND AMENITIES ARE ON THE PAGE (2026-08-06) ───
#
# Both defects were found by driving a real host event, not by a unit test, and
# both had passing gates around them at the time.
#
# 1 · `sleeps` was read from containsPlace.occupancy.value, which is the BED
#     count. A host planning for 10 was shown two houses that BOTH fit — one
#     sleeping 16, one sleeping exactly 10 — as sleeping 8 and 6, i.e. neither.
#     Understating capacity makes a host discard the right house, and the
#     provenance said "read", vouching for the wrong number.
# 2 · The structured amenity list was never extracted, so every must-have row
#     read "—" even where the listing plainly said "Free washer – In unit".
from app.routers.lodging import _listing_record

# The real shapes, reduced: field ORDER here is the one the live page uses —
# "available" precedes "title". The first cut of the scanner assumed the
# reverse and matched nothing at all.
PAGE = (
    '<script type="application/ld+json">'
    '{"@context":"https://schema.org","@type":"VacationRental",'
    '"name":"Lake house with sauna","address":{"addressLocality":"Oakland"},'
    '"latitude":39.5,"longitude":-79.3,'
    '"aggregateRating":{"ratingValue":5.0,"ratingCount":"15"},'
    '"containsPlace":{"@type":"Accommodation","occupancy":{"value":8}}}'
    '</script>'
    '<script>{"personCapacity":16,"maxGuestCapacity":16}</script>'
    '<script>"amenities":[]</script>'   # an EMPTY block appears first on the real page
    '<script>"amenities":['
    '{"__typename":"AmenityItem","available":true,"title":"Kitchen","icon":"A"},'
    '{"__typename":"AmenityItem","available":true,"title":"Free washer – In unit","icon":"B"},'
    '{"__typename":"AmenityItem","available":false,"title":"Pool","icon":"C"},'
    '{"__typename":"AmenityItem","available":true,"title":"Kitchen","icon":"D"}'
    ']</script>'
)


def test_sleeps_is_guest_capacity_never_the_bed_count():
    rec = _listing_record(PAGE)
    # 16 guests, NOT the occupancy value of 8
    assert rec["sleeps"] == 16


def test_occupancy_alone_yields_no_capacity_claim():
    # Strip personCapacity: rather than fall back to the bed count and be
    # confidently wrong, the record must simply not claim a capacity.
    only_ld = PAGE.split("<script>{")[0]
    rec = _listing_record(only_ld)
    assert "sleeps" not in rec


def test_amenities_are_read_with_their_availability():
    rec = _listing_record(PAGE)
    assert "Kitchen" in rec["amenities"]
    # the exact string that made the host's "Washer & dryer" row read "—"
    assert any("washer" in a.lower() for a in rec["amenities"])
    # an unavailable amenity is NOT claimed as present
    assert "Pool" not in rec["amenities"]
    assert "Pool" in rec["amenitiesAbsent"]
    # and the same amenity twice is one amenity
    assert rec["amenities"].count("Kitchen") == 1


def test_the_rest_of_the_record_still_rides():
    rec = _listing_record(PAGE)
    assert rec["rating"] == 5.0 and rec["ratingCount"] == 15
    assert rec["locality"] == "Oakland"
    assert rec["listingName"] == "Lake house with sauna"


def test_a_page_with_none_of_it_claims_nothing():
    rec = _listing_record("<html><body>no listing here</body></html>")
    assert rec == {}
