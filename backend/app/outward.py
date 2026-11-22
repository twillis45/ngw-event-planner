"""What every outward surface says about the event, read ONE way (audit 2, lane E).

The 11/22/2026 audit found the place line built four ways (the host's app:
name · street, City, ST ZIP; the remote invite and the family page: name and
town; the helper page and email, the vendor brief and the invite email: the
name alone), a multi-day event printed as its first day, the host's name
missing wherever the event spells it `host`, and the vendor brief reading only
the host's stored diet tallies while her guests' replies sat beside them.

The app answers each of these with one reader:
  where        src/lib/venueFor.js formatVenueAddress
  which days   src/lib/doItForMe.js fmtLongSpan
  who hosts    src/lib/hostNameFor.js hostNameFor (no profile on the server)
  which diets  src/lib/dietRows.js dietCountsFor

The pages a guest, helper, vendor or relative opens run those readers in the
browser. The emails are composed here, so this module is their server copy, a
line-for-line port. The two are held together by one fixture
(src/lib/__tests__/fixtures/outwardLines.fixture.json): the app's test and
tests/test_outward_lines.py both read it. PURE; no I/O.
"""
import re
from datetime import date as _date

# ── who hosts (hostNameFor) ──────────────────────────────────────────────────


def _clean(v) -> str:
    return str(v).strip() if v is not None else ""


def host_name_for(ev: dict) -> str:
    ev = ev or {}
    return _clean(ev.get("hostName")) or _clean(ev.get("hostNames")) or _clean(ev.get("host"))


# ── which days (fmtLongDate / spanEnd / fmtLongSpan) ─────────────────────────
_WD = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
_MO = ("January", "February", "March", "April", "May", "June", "July", "August", "September",
       "October", "November", "December")
_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def long_date(iso) -> str:
    """"Sunday, July 7"; '' when unreadable."""
    try:
        y, m, d = (int(x) for x in str(iso or "").split("-"))
        day = _date(y, m, d)
    except (ValueError, TypeError):
        return ""
    return f"{_WD[day.weekday()]}, {_MO[m - 1]} {d}"


def span_end(ev: dict):
    start = str(ev.get("date"))[:10] if ev.get("date") else None
    if not start:
        return None
    end = str(ev.get("endDate"))[:10] if ev.get("endDate") else None
    return end if end and _ISO.match(end) and end > start else start


def event_days(ev: dict) -> str:
    """"Monday, December 13 – Wednesday, December 15", or the one day."""
    ev = ev or {}
    start = long_date(ev.get("date"))
    if not start:
        return ""
    end = span_end(ev) or ""
    return f"{start} – {long_date(end)}" if end and end != str(ev.get("date"))[:10] else start


# ── where (cityText + venueFor) ──────────────────────────────────────────────
_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
    "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
    "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
}
_STATE_FULL = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
    "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts",
    "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
    "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
_STATE_BY_NAME = {v.lower(): k for k, v in _STATE_FULL.items()}

_STREET_LINE = re.compile(
    r"^\d{1,6}[a-z]?\s+(?:[a-z0-9.'-]+\s+){0,4}(st|street|rd|road|ave|avenue|blvd|boulevard|ln|lane|dr|drive|way|"
    r"ct|court|pl|place|pkwy|parkway|hwy|highway|cir|circle|ter|terrace|trl|trail|pike|sq|square)\b\.?", re.I)
_HOME_WORD = r"(?:back\s?yard|yard|home|house|place|garden|apartment|condo)"
_HOME_NAME = re.compile(
    r"^(?:at\s+)?(?:home|back\s?yard|"
    r"(?:(?:my|our)\s+)?(?:[a-z][\w.-]*(?:\s+(?:and|&)\s+[a-z][\w.-]*)?['’]s\s+)" + _HOME_WORD + "|"
    r"(?:my|our)\s+" + _HOME_WORD + "|"
    r"the\s+(?:back\s?yard|yard|house|home))$", re.I)
_OLD_HOME_GUESS = re.compile(r"backyard|house|home|yard|place|garden", re.I)


def _plausible_city(v) -> bool:
    s = _clean(v)
    return bool(s) and len(s) <= 48 and not re.search(r"\d", s) and not re.search(r"[—–]", s)


def _parse_location(v):
    s = _clean(v)
    if not s:
        return None
    z = re.match(r"^(\d{5})(-\d{4})?$", s)
    if z:
        return {"zip": z.group(1)}
    if re.search(r"\d", s) or re.search(r"[—–]", s) or len(s) > 60:
        return None
    m = re.match(r"^([^,]+),\s*(.+)$", s)
    if not m:
        return None
    city, state_raw = m.group(1).strip(), m.group(2).strip()
    if not _plausible_city(city):
        return None
    if state_raw.upper() in _STATES:
        return {"city": city, "state": state_raw.upper()}
    if state_raw.lower() in _STATE_BY_NAME:
        return {"city": city, "state": _STATE_BY_NAME[state_raw.lower()]}
    return None


def _split_trailing_place(v):
    s = _clean(v)
    if not s:
        return None
    dash = re.match(r"^(.*\S)\s+[—–-]\s+([^—–]+)$", s)
    if dash:
        p = _parse_location(dash.group(2))
        if p and p.get("state"):
            return {"name": dash.group(1).strip(), "city": p["city"], "state": p["state"]}
    parts = [p.strip() for p in s.split(",") if p.strip()]
    if len(parts) >= 3:
        p = _parse_location(", ".join(parts[-2:]))
        if p and p.get("state"):
            return {"name": ", ".join(parts[:-2]), "city": p["city"], "state": p["state"]}
    return None


def _carries(line: str, part: str) -> bool:
    return bool(part) and bool(re.search(r"(^|[\s,])" + re.escape(part) + r"(?=$|[\s,.])", line, re.I))


def _join_town(city, state, zip_):
    cs = f"{city}, {state}" if city and state else (city or state or "")
    return " ".join(x for x in (cs, zip_) if x)


def _with_missing_parts(line, city, state, zip_):
    out = str(line).strip()
    if city and not _carries(out, city):
        out += f", {city}"
    if state and not _carries(out, state) and not _carries(out, _STATE_FULL.get(state, "")):
        out += f", {state}"
    if zip_ and not _carries(out, zip_):
        out += f" {zip_}"
    return out


def _zip_of(ev, address):
    z = _clean(ev.get("venueZip"))
    if re.match(r"^\d{5}$", z):
        return z
    c = _clean(ev.get("venueCity"))
    if re.match(r"^\d{5}$", c):
        return c
    a = str(address or "")
    m = re.search(r"(?:^|[\s,])(\d{5})(?:-\d{4})?\s*$", a)
    return m.group(1) if m and re.search(r"[a-z]", a[:m.start()], re.I) else ""


def venue_for(ev: dict) -> dict:
    """venueFor, the parts the outward lines read: name, isHome, address,
    fullAddress, townLine, displayLine."""
    ev = ev or {}
    raw = _clean(ev.get("venue"))
    name_is_place = _parse_location(raw) if raw else None
    tail = None
    if not name_is_place and raw:
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        if len(parts) >= 3:
            tail = _parse_location(", ".join(parts[-2:]))
    dash = None
    if not name_is_place and not tail and raw and re.search(r"\s[—–-]\s", raw):
        dash = _split_trailing_place(raw)
    if name_is_place:
        name = ""
    elif tail:
        name = ", ".join([p.strip() for p in raw.split(",") if p.strip()][:-2])
    else:
        name = raw
    stale = (ev.get("venueKind") == "home" and not ev.get("venueConfirmed") and bool(raw)
             and bool(_OLD_HOME_GUESS.search(raw)) and not _HOME_NAME.match(" ".join(raw.split())))
    kind = "venue" if stale else (ev.get("venueKind") or ("home" if ev.get("recordKind") == "host_event" and not name else "venue"))
    is_home = kind == "home"
    from_name = name_is_place or tail or dash
    city = next((_clean(x) for x in (ev.get("venueCity"), ev.get("city")) if _plausible_city(x)), "") \
        or (_clean(from_name.get("city")) if from_name else "")
    state = _clean(ev.get("venueState") or ev.get("state")) or (_clean(from_name.get("state")) if from_name else "")
    street = _clean(ev.get("venueStreet"))
    name_is_street = bool(name) and bool(_STREET_LINE.match(name))
    address = _clean(ev.get("venueAddress")) or (
        ", ".join(x for x in (street, _join_town(city, state, _clean(ev.get("venueZip")))) if x) if street
        else (name if name_is_street else ""))
    zip_ = _zip_of(ev, address)
    town = _join_town(city, state, zip_)
    full = _with_missing_parts(address, city, state, zip_) if address else ""
    if name_is_street:
        line = full
    elif name:
        alone = not full and (dash or (_carries(name, city) and (not state or _carries(name, state))))
        line = name if alone else " · ".join(x for x in (name, full or town) if x)
    else:
        line = f"At home in {_join_town(city, state, '')}" if is_home and city and not address else (full or town)
    return {"name": name, "isHome": is_home, "address": address, "fullAddress": full, "townLine": town,
            "displayLine": line, "nameIsStreet": name_is_street}


# The fields that can carry a street. A private home shown "town only" leaves
# them all out, and a street typed as the venue's NAME with them.
STREET_FIELDS = ("venueAddress", "venueStreet", "address")


def is_home(ev: dict) -> bool:
    return venue_for(ev)["isHome"]


def without_home_street(ev: dict) -> dict:
    """The event as a relative may see its place: a private home keeps its
    name (unless the name is the street) and its town, never the street."""
    ev = ev or {}
    vf = venue_for(ev)
    if not vf["isHome"]:
        return ev
    out = {k: v for k, v in ev.items() if k not in STREET_FIELDS}
    if vf["nameIsStreet"]:
        out.pop("venue", None)
    return out


def place_line(ev: dict, private_home=None) -> str:
    """formatVenueAddress(event): name · street, City, ST ZIP. With
    private_home="town", a private home reads only as far as its town."""
    return venue_for(without_home_street(ev) if private_home == "town" else ev)["displayLine"]


def town_line(ev: dict) -> str:
    return venue_for(ev)["townLine"]


# ── which diets (dietRows) ───────────────────────────────────────────────────
DIET_TAGS = (
    "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "Nut allergy",
    "Shellfish", "Halal", "Kosher", "Alcohol-free", "Egg allergy", "Soy allergy",
    "Diabetic-friendly",
)


def diet_tag_for(s):
    t = _clean(s).lower()
    if not t:
        return None
    short = re.sub(r" (allergy|free)$", "", t)
    for tag in DIET_TAGS:
        tl = tag.lower()
        if tl == t or tl.startswith(t) or (len(t) > 2 and tl.startswith(short)):
            return tag
    return None


def _num(v):
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0
    if n != n or n in (float("inf"), float("-inf")):
        return 0
    return int(n) if n.is_integer() else n


def guest_diet_counts(ev: dict) -> dict:
    out = {}
    for g in (ev or {}).get("guests") or []:
        if not isinstance(g, dict) or re.match(r"^n", str(g.get("rsvp") or ""), re.I):
            continue
        parts = [*str(g.get("needs") or "").split(","), *str(g.get("plusOneNeeds") or "").split(","),
                 str(g.get("meal") or "")]
        parts += [x for k in ("diets", "allergens") if isinstance(g.get(k), list) for x in g.get(k)]
        seen = set()
        for p in parts:
            tag = diet_tag_for(p)
            if tag and tag not in seen:
                seen.add(tag)
                out[tag] = out.get(tag, 0) + 1
    return out


def diet_counts_for(ev: dict) -> dict:
    """The host's own tally wins for any tag she gave a number to (zero
    included); every other tag comes from the guest rows and their replies."""
    host = (ev or {}).get("dietCounts")
    merged = dict(guest_diet_counts(ev))
    for k, v in (host.items() if isinstance(host, dict) else ()):
        merged[k] = _num(v)
    return merged
