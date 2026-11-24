"""The read-only family link (owner, 11/16/2026: "read-only family link").

A host turns on a link for family: they can see the plan, never change it.
No account, no sign-in: the long random code in the link is the only
credential, as with the invite. The host turns it off by clearing the code, and
the old link stops working at once (the lookup is by exact match).

WHAT FAMILY SEES — an explicit allow-list, never the event blob:
  when and where (the same fields the invite already shows), the run of show
  the host stored (minus anything she marked as a surprise), the checklist (each step and whether it is done), who is
  being hired (name, kind, booked or not), how many guests said yes / no /
  maybe / haven't answered, and the hashtag.
WHERE, ONE LINE (audit 2, lane E P0-4): the place line's own parts, so the
  page prints the line the host's app prints, except that a PRIVATE HOME
  reaches family as its town only (owner, a #226 follow-up), never its street.
WHAT FAMILY NEVER SEES: guest names or contact details, diets, any money
  (budget, prices, deposits), vendor contacts, notes, the host's private
  fields, or any code (invite, family, vendor or helper).

THE CHECKLIST AND THE RUN OF SHOW ARE THE HOST'S OWN WORDS, so they are
  scrubbed before they leave (audit lane E, P0-2: the page printed "$5,000",
  "rooms at 4604 for Marcus's family + Mom" and "Marcus (brother)" under a
  footer promising neither money nor names). A line keeps only its part
  before the first clause that mentions money, a person on the event other
  than the honoree, or a private house address from the stay list; a line
  that is private from its first word is left out. A friend helping on the
  day (`isInformal`, the app's hired/informal rule) is help, not a hire, and
  is not listed under "Who's been hired" (P1-3).

Only an event saved to the server can be shared: the code lives in the saved
plan, and a lookup reads the plan as last saved, so family sees the host's
changes once they sync.
"""
import json
import re

from fastapi import APIRouter, HTTPException, Request

from ..db import get_pool
from ..outward import host_name_for, without_home_street
from .rsvp import _enforce, MAX_CODE

router = APIRouter(tags=["family"])

MIN_FAMILY_CODE = 24

# The place line's parts are those venueFor reads, so the page prints the line
# the host's app prints (audit 2, lane E P0-4). A private home's street parts
# are taken out first (outward.without_home_street): family reads its town.
WHEN_WHERE = ("name", "type", "date", "endDate", "startTime", "timeOfDay", "endTime", "venue",
              "venueAddress", "venueStreet", "venueCity", "venueState", "venueZip", "venueKind",
              "venueConfirmed", "address", "hostNames", "dressCode",
              "parking", "parkingNotes", "hashtag", "guestEstimate", "guestCount")


def _text(v, n=200):
    s = str(v).strip() if v is not None else ""
    return s[:n]


def _shown(r) -> bool:
    """A row the host marked as a surprise never leaves for the family link
    (owner ruling 11/22/2026: "Hide marked surprises")."""
    return isinstance(r, dict) and not r.get("surprise")


# ── WHAT A HOST LINE MAY NOT CARRY ────────────────────────────────────────────
_MONEY = re.compile(r"\$|\bbudget|\bdeposit|\bdollars?\b|\busd\b|\bprices?\b|\bpriced\b|\bcosts?\b"
                    r"|\bpaid\b|/\s*head\b|\bper (?:head|person)\b|\b\d+(?:\.\d+)?\s?k\b", re.I)
# A capitalized word in a person's entry, possessive cut ("Wanda’s" -> "Wanda").
_WORD = re.compile(r"\b[A-Z][a-z]+(?:-[A-Z][a-z]+)?")
# Words that sit in guest-list entries but name no one.
_NOT_A_NAME = {"The", "And", "Mom", "Dad", "Mother", "Father", "Family", "Friend", "Friends", "Crew", "Unit",
               "Church", "Team", "Brother", "Sister", "Aunt", "Uncle", "Grandma", "Grandpa", "Cousin",
               "Kids", "Boys", "Girls", "Chaplain", "Pastor", "Plus", "Guest", "Guests"}
_STREET_WORDS = {"Way", "St", "Street", "Rd", "Road", "Ave", "Avenue", "Dr", "Drive", "Ln", "Lane", "Ct",
                 "Court", "Blvd", "Pl", "Place", "Ter", "Terrace", "Cir", "Circle", "Pkwy", "Hwy"}
# Clause breaks inside one host line: " — ", " - ", "; ", ": ", ", then / or / and / but ".
_CLAUSE = re.compile(r"(\s+[—–-]\s+|;\s*|:\s+|,\s+(?:then|or|and|but)\s+)")
_PAREN = re.compile(r"\s*\(([^()]*)\)")


def _private_terms(data: dict) -> re.Pattern | None:
    """Everyone on the event but the honoree, and the stay list's house
    addresses, as one pattern. Built from the event's own records, never a
    guess: a name the host never entered cannot be caught, and is not claimed."""
    honoree = set(_WORD.findall(str(data.get("honoree") or "")))
    people = []
    for g in data.get("guests") or []:
        if isinstance(g, dict):
            people += [g.get("name"), g.get("plusOne")]
    for v in data.get("vendors") or []:
        if isinstance(v, dict):
            people.append(str(v.get("contact") or "").split(",")[0])
            if v.get("isInformal"):
                people.append(v.get("name"))
    for c in data.get("crew") or []:
        if isinstance(c, dict):
            people.append(c.get("name"))
    terms = set()
    for p in people:
        terms |= {w for w in _WORD.findall(str(p or "")) if len(w) > 2 and w not in _NOT_A_NAME} - honoree
    stays = data.get("lodging") if isinstance(data.get("lodging"), list) else []
    for st in stays:
        if isinstance(st, dict):
            terms |= {w for w in _WORD.findall(str(st.get("who") or "")) if len(w) > 2 and w not in _NOT_A_NAME} - honoree
            street = str(st.get("address") or "").split(",")[0]
            terms |= {w for w in re.findall(r"\b\d+[A-Za-z]?\b", street)}
            terms |= {w for w in _WORD.findall(street) if w not in _STREET_WORDS}
    if not terms:
        return None
    return re.compile(r"\b(?:" + "|".join(sorted(map(re.escape, terms), key=len, reverse=True)) + r")\b")


def _scrub(text: str, private) -> str:
    """The host's line, cut before its first private clause; "" if it is
    private from the start. Unsafe asides in parentheses are dropped first."""
    bad = lambda s: bool(_MONEY.search(s) or (private and private.search(s)))
    s = _PAREN.sub(lambda m: "" if bad(m.group(1)) else m.group(0), str(text or ""))
    parts = _CLAUSE.split(s)
    kept = ""
    for i in range(0, len(parts), 2):
        if bad(parts[i]):
            break
        kept += (parts[i - 1] if i else "") + parts[i]
    else:
        return s.strip()
    return kept.strip().rstrip(" ,;:—–-").strip()


def _ros_row(r: dict, private=None) -> dict:
    label = _scrub(_text(r.get("label") or r.get("segment") or r.get("title"), 160), private)
    row = {"time": _text(r.get("time"), 20), "label": label}
    if r.get("generated") is True:
        row["generated"] = True   # the app's own row, so the page can tell hers from ours
    return row


def _checklist_count(v):
    """The host app's saved checklist count: two whole numbers, 0 <= done <= total
    <= 1000, and nothing else. Anything else is dropped, never repaired."""
    if not isinstance(v, dict):
        return None
    d, t = v.get("done"), v.get("total")
    if type(d) is not int or type(t) is not int:   # bool is an int subclass; refuse it
        return None
    if not (0 <= d <= t <= 1000):
        return None
    return {"done": d, "total": t}


def family_projection(data: dict) -> dict:
    """The family view of a saved plan. PURE; every field is allow-listed."""
    place = without_home_street(data)
    out = {k: place[k] for k in WHEN_WHERE if place.get(k) not in (None, "")}
    if data.get("recordKind") == "host_event":
        out["recordKind"] = "host_event"      # an unnamed host event is at home (venueFor)
    host = host_name_for(data)
    if host:
        out["hostName"] = host[:120]          # hostNameFor's rule, `host` included
    if str(data.get("startTimeSource") or "") == "derived":
        out.pop("startTime", None)          # the app's guess is not the host's hour
    private = _private_terms(data)
    ros = data.get("ros")
    if isinstance(ros, list):
        rows = [_ros_row(r, private) for r in ros
                if _shown(r) and (r.get("label") or r.get("segment") or r.get("title"))]
        out["ros"] = [r for r in rows if r["label"]][:80]
    if data.get("rosEdited"):
        out["rosEdited"] = True   # the host owns the stored schedule; the page shows it as stored
    tl = data.get("timeline")
    if isinstance(tl, list):
        items = [{"task": _scrub(_text(t.get("task") or t.get("title"), 160), private), "done": bool(t.get("done"))}
                 # A retired step leaves the host's list and its "N of M"; it leaves this one too.
                 for t in tl if _shown(t) and not t.get("retired") and (t.get("task") or t.get("title"))]
        out["checklist"] = [t for t in items if t["task"]][:200]
    cc = _checklist_count(data.get("checklistCount"))
    if cc:
        # The host's own "N of M" (UX_11 rule 12, audit #35, owner 11/24/2026):
        # her app counts the steps her plan has handled, which only it can see.
        out["checklistCount"] = cc
    vendors = data.get("vendors")
    if isinstance(vendors, list):
        # Hired vendors only (workstreams.isHiredVendor): an informal helper is
        # a friend, not a booking, and her name is a guest's name.
        out["vendors"] = [{"name": _text(v.get("name"), 120), "category": _text(v.get("category"), 60),
                           "status": _text(v.get("status"), 40)}
                          for v in vendors if _shown(v) and not v.get("isInformal") and v.get("name")
                          and not _MONEY.search(str(v.get("name")))][:60]
    guests = data.get("guests")
    if isinstance(guests, list):
        counts = {"yes": 0, "no": 0, "maybe": 0, "waiting": 0}
        for g in guests:
            if not isinstance(g, dict):
                continue
            r = str(g.get("rsvp") or "").strip().lower()
            key = "yes" if r.startswith("y") else "no" if r.startswith("n") else "maybe" if r.startswith("m") else "waiting"
            counts[key] += 1
        out["replies"] = counts
    return out


@router.get("/api/public/family/{code}")
async def public_family_view(code: str, request: Request):
    """The plan, read-only, for a family link. Opaque 404 for anything else."""
    code = (code or "")[:MAX_CODE]
    _enforce(request, code, per_code=False)
    if len(code) < MIN_FAMILY_CODE:
        raise HTTPException(404, "not found")
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "select data from public.events where data->>'familyCode' = $1 limit 1", code)
    if not row:
        raise HTTPException(404, "not found")
    data = row["data"] or {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except ValueError:
            data = {}
    return {"ok": True, "plan": family_projection(data)}
