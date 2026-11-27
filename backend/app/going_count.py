"""How many have said yes to an event: one count for the invite's social line
and the host's reply alert (owner, 11/27/2026: "include the count").

A number, never a name. The saved guest list lags (a reply reaches it only when
the host next opens the app), so replies already received count too, each
guest name's LATEST answer once, and the larger of the two is used, so neither
source can lower the other. A failed read falls back to the saved list's count.
"""
import json


def roster_yes(guests) -> int:
    """Yes answers on the saved guest list (a list, or its JSON text)."""
    if isinstance(guests, str):
        try:
            guests = json.loads(guests)
        except ValueError:
            return 0
    if not isinstance(guests, list):
        return 0
    return sum(1 for g in guests
               if isinstance(g, dict) and str(g.get("rsvp", "")).strip().lower().startswith("y"))


async def going_count(conn, event_id, roster_count):
    try:
        n = await conn.fetchval(
            """select count(*) from (
                 select distinct on (lower(trim(guest_name))) rsvp
                   from public.rsvp_submissions
                  where event_id = $1 and coalesce(trim(guest_name), '') <> ''
                  order by lower(trim(guest_name)), coalesce(updated_at, submitted_at) desc
               ) latest
              where lower(coalesce(rsvp, '')) like 'y%'""",
            event_id,
        )
        n = int(n or 0)
    except Exception:
        return int(roster_count or 0)
    return max(n, int(roster_count or 0))
