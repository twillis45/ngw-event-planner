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
WHAT FAMILY NEVER SEES: guest names or contact details, diets, any money
  (budget, prices, deposits), vendor contacts, notes, the host's private
  fields, or any code (invite, family, vendor or helper).

Only an event saved to the server can be shared: the code lives in the saved
plan, and a lookup reads the plan as last saved, so family sees the host's
changes once they sync.
"""
import json

from fastapi import APIRouter, HTTPException, Request

from ..db import get_pool
from .rsvp import _enforce, MAX_CODE

router = APIRouter(tags=["family"])

MIN_FAMILY_CODE = 24

WHEN_WHERE = ("name", "type", "date", "endDate", "startTime", "timeOfDay", "endTime", "venue",
              "venueAddress", "venueCity", "venueState", "address", "hostNames", "dressCode",
              "parking", "parkingNotes", "hashtag", "guestEstimate", "guestCount")


def _text(v, n=200):
    s = str(v).strip() if v is not None else ""
    return s[:n]


def _shown(r) -> bool:
    """A row the host marked as a surprise never leaves for the family link
    (owner ruling 11/22/2026: "Hide marked surprises")."""
    return isinstance(r, dict) and not r.get("surprise")


def _ros_row(r: dict) -> dict:
    row = {"time": _text(r.get("time"), 20), "label": _text(r.get("label") or r.get("segment") or r.get("title"), 160)}
    if r.get("generated") is True:
        row["generated"] = True   # the app's own row, so the page can tell hers from ours
    return row


def family_projection(data: dict) -> dict:
    """The family view of a saved plan. PURE; every field is allow-listed."""
    out = {k: data[k] for k in WHEN_WHERE if data.get(k) not in (None, "")}
    if str(data.get("startTimeSource") or "") == "derived":
        out.pop("startTime", None)          # the app's guess is not the host's hour
    ros = data.get("ros")
    if isinstance(ros, list):
        out["ros"] = [_ros_row(r) for r in ros
                      if _shown(r) and (r.get("label") or r.get("segment") or r.get("title"))][:80]
    if data.get("rosEdited"):
        out["rosEdited"] = True   # the host owns the stored schedule; the page shows it as stored
    tl = data.get("timeline")
    if isinstance(tl, list):
        out["checklist"] = [{"task": _text(t.get("task") or t.get("title"), 160), "done": bool(t.get("done"))}
                            for t in tl if _shown(t) and (t.get("task") or t.get("title"))][:200]
    vendors = data.get("vendors")
    if isinstance(vendors, list):
        out["vendors"] = [{"name": _text(v.get("name"), 120), "category": _text(v.get("category"), 60),
                           "status": _text(v.get("status"), 40)}
                          for v in vendors if _shown(v) and v.get("name")][:60]
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
