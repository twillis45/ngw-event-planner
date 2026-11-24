"""THE PUBLIC INVITE SENDS ONLY WHAT A GUEST'S PAGE SHOWS (audit lane E, P0-1).

GET /api/public/invite/{code} is read by anyone holding the link. It used to
pass the host's whole `lodging` value through, and on the Wanda sample that is
her list of who stays where: a private house address, family names and host
notes. The invite page (hostv2/src/InviteV2.jsx) reads `lodging` only as the
trip brief's hotel object (hotelName, rate, code, deadline, from).

Two pins:
  1. A Wanda-like event's payload carries none of her private data.
  2. A census: every key, top-level and nested, is on an allowlist written out
     HERE, so a new field cannot reach strangers without someone editing this
     file on purpose.
"""
import asyncio
import json

from app.routers import rsvp as R

from tests._wanda_sample import GUEST_NAMES, INVITE_CODE, PRIVATE_ADDRESS, wanda

# What InviteV2 renders from the public event, and nothing else.
ALLOWED_TOP = {
    # when and where
    "name", "type", "date", "endDate", "startTime", "timeOfDay", "endTime",
    "venue", "venueAddress", "venueCity", "venueState", "address",
    # the invitation itself
    "inviteStyle", "hostNames", "rsvpCode", "hashtag",
    # guest logistics the host wrote for guests
    "dressCode", "parking", "parkingNotes", "bringNote", "hostContact",
    # recap keepsake
    "recapNote", "albumUrl",
    # trip brief, each narrowed below
    "lodging", "airportOptions", "itinerary", "lodgingOptions", "dateOptions",
    "celebration", "tripMeals",
    # computed by the server
    "goingCount",
    # THE GUEST'S INVITE IS THE HOST'S PREVIEW (audit 2, lane E P0-3), added on
    # purpose: who hosts (computed, hostNameFor's rule), the deck line she
    # wrote and its second occasion, the rest of the one place line, and her
    # reply rules (only the values the host app writes). None is a guest's data.
    "hostName", "deckLine", "secondaryType",
    "venueStreet", "venueZip", "venueKind", "venueConfirmed", "recordKind",
    "kidsPolicy", "plusOnePolicy", "collectAddresses",
    # THE HOST'S PHOTO (owner, 11/24/2026): only its VERSION, read from her
    # account (studio_settings), never the image and never a URL. The page
    # builds the address from the invite code (GET /api/public/host-photo/{code}).
    "hostPhoto",
    # The layout she picked for the invite ('classic' | 'glance'), only those.
    "inviteLayout",
    # The event id. Not display data, and the audit (P2-9) asks for it to go;
    # it stays for now because the host app's "is this invite live?" check and
    # every guest's saved reply key are built on it (see rsvp.py). It is a
    # name, never a credential: no public route resolves by it.
    "id",
}
ALLOWED_NESTED = {
    "lodging": {"hotelName", "rate", "code", "deadline", "from"},
    "lodgingOptions": {"id", "label", "sleeps", "beds", "totalPrice", "photos", "photoUrl", "url"},
    "airportOptions": {"code", "name", "note"},
    "itinerary": {"day", "slot", "time", "title", "what", "note", "anchor", "celebration", "meal"},
    "dateOptions": {"id", "start", "end"},
    "celebration": {"night", "place"},
    "tripMeals": {"plan", "meals"},
}


def _public(data, host_photo=None):
    class Conn:
        async def fetchrow(self, sql, *a):
            return {"id": data.get("id", "ev-1"), "data": data, "host_photo": host_photo}
    return asyncio.run(R._resolve_event(Conn(), INVITE_CODE))[1]


def _trip(ev):
    """Wanda's event with every trip-brief field set, each carrying something private."""
    ev.update({
        "airportOptions": [{"code": "BWI", "name": "Baltimore", "note": "closest", "bookedBy": "Marcus"}],
        "itinerary": [{"day": 1, "slot": "evening", "title": "Welcome drinks", "owner": "Cory", "crewTime": "17:00"}],
        "lodgingOptions": [{"id": "o1", "label": "Lake house", "sleeps": 8, "beds": 4, "totalPrice": 1200,
                            "url": "https://example.test/listing/1", "photos": ["https://example.test/photo/1.jpg"],
                            "notes": "Gloria hates the stairs", "hostContact": "555-0101", "status": "removed"}],
    })
    return ev


def test_the_wanda_invite_carries_none_of_her_private_data():
    pub = _public(_trip(wanda()))
    blob = json.dumps(pub, ensure_ascii=False)
    for secret in PRIVATE_ADDRESS + GUEST_NAMES + ("$", "budget", "Denver", "Same house", "555-0", "Husband"):
        assert secret not in blob, secret
    # Her list of who stays where is not the hotel object the invite reads.
    assert "lodging" not in pub
    for k in ("guests", "vendors", "budget", "timeline", "ros", "notes", "meaning", "familyCode", "honoree"):
        assert k not in pub, k


def test_every_key_on_the_invite_is_on_the_allowlist():
    pub = _public(_trip(wanda()), host_photo="abc123def456")
    assert pub["hostPhoto"] == "abc123def456"     # PREMISE: the photo field is in the census
    assert set(pub) <= ALLOWED_TOP, set(pub) - ALLOWED_TOP
    for key, allowed in ALLOWED_NESTED.items():
        val = pub.get(key)
        rows = val if isinstance(val, list) else [val] if isinstance(val, dict) else []
        for row in rows:
            assert set(row) <= allowed, (key, set(row) - allowed)


def test_the_trip_brief_still_reaches_the_guest():
    """Narrowing must not cost the guest the stay row, the airports or the plan."""
    ev = _trip(wanda())
    ev["lodging"] = {"hotelName": "Marriott Largo", "rate": 149, "code": "WANDA50", "deadline": "2027-02-20",
                     "roster": [{"name": "Marcus", "room": "212"}], "backupOptions": ["Hilton"], "notBookedCount": 3}
    pub = _public(ev)
    assert pub["lodging"] == {"hotelName": "Marriott Largo", "rate": 149, "code": "WANDA50", "deadline": "2027-02-20"}
    assert pub["airportOptions"] == [{"code": "BWI", "name": "Baltimore", "note": "closest"}]
    assert pub["itinerary"] == [{"day": 1, "slot": "evening", "title": "Welcome drinks"}]
    assert pub["lodgingOptions"] == [{"id": "o1", "label": "Lake house", "sleeps": 8, "beds": 4, "totalPrice": 1200,
                                      "url": "https://example.test/listing/1",
                                      "photos": ["https://example.test/photo/1.jpg"]}]
    assert "Marcus" not in json.dumps(pub)


def test_the_layout_ships_only_as_one_of_the_two_layouts():
    """inviteLayout (owner, 11/24/2026) is a choice the host made for guests;
    any other value is not her choice and does not leave."""
    assert _public({**wanda(), "inviteLayout": "glance"})["inviteLayout"] == "glance"
    for bad in ("centered", "<script>", {"x": 1}):
        assert "inviteLayout" not in _public({**wanda(), "inviteLayout": bad})


def test_a_display_field_holding_an_object_is_not_passed_through():
    """A scalar field that somehow holds a dict or list (an old import, a bad
    patch) is dropped, not shipped whole."""
    pub = _public({**wanda(), "dressCode": {"text": "black", "internal": "x"}})
    assert "dressCode" not in pub
