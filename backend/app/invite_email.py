"""The invite email is an ENVELOPE for the invitation (owner, 11/19/2026).

History: the owner asked for the invite in the email body, then "I need the html
version to be what they see". A copy of the invite page (its paper as an image,
its display font) still differed per mail app: Gmail drops the font, Outlook on
Windows drops the paper and the rounded corners. So the owner chose option C:
the email does not imitate the invite, it delivers it.

A plain cream card that every mail app draws the same way: "You're invited",
"<host> invites you to", the event's name in Georgia (a font every mail app
has), When and Where side by side, one button "Open your invitation" (the real
page), and "Or pick your answer": Yes / Can't make it / Maybe, each opening the
page with that answer PRESELECTED (?reply=). Nothing is sent until the guest
adds a name and taps send on the page. Then the host's note, then the footer.

Facts come from the event the SERVER has saved (events.data), never from the
request. A start time the host did not set (startTimeSource 'derived') is never
stated. A solemn gathering gets the muted hue. PURE: returns (html, text).
"""
import html as _html
import re
from datetime import date as _date

from .email_frame import SUB, frame, hue_for
from .guest_notices import invite_url

_URL_LINE = re.compile(r"^\s*https?://\S+\s*$")
_INTRO_LINE = re.compile(r":\s*$")     # "Let us know you're coming:" — it only introduced the link


def _when_parts(ev: dict):
    d = str(ev.get("date") or "")[:10]
    try:
        y, m, dd = (int(x) for x in d.split("-"))
        day = _date(y, m, dd)
        date_label = f"{day.strftime('%A')}, {day.strftime('%B')} {day.day}"
    except (ValueError, TypeError):
        date_label = ""
    t = str(ev.get("startTime") or "").strip()
    time_label = ""
    if t and str(ev.get("startTimeSource") or "") != "derived":
        mt = re.match(r"^(\d{1,2}):(\d{2})$", t)
        time_label = f"{(int(mt.group(1)) % 12) or 12}:{mt.group(2)} {'PM' if int(mt.group(1)) >= 12 else 'AM'}" if mt else t
    return date_label, time_label


def _note_lines(note: str, facts=()) -> list:
    """The host's words, minus the bare link and the line that only introduced it
    (the reply buttons carry the link), and minus a line that only repeats a fact
    the card already shows (the date, the place)."""
    lines = str(note or "").replace("\r", "").split("\n")
    seen = {f.strip().lower() for f in facts if f and f.strip()}
    out = []
    for i, line in enumerate(lines):
        if _URL_LINE.match(line) or line.strip().lower() in seen:
            continue
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if _INTRO_LINE.search(line) and _URL_LINE.match(nxt):
            continue
        out.append(line)
    return out


def invite_gaps(ev: dict) -> list:
    """What an invite cannot go out without (owner, 11/19/2026: "Before sending
    invites app should verify if the important info is included"): the day, an
    hour the host set, and the place. The app asks for them before it writes the
    invite (src/lib/inviteGaps.js); this is the server's own check on the SAVED
    event, so an email never goes out with a hole even if the app's copy and the
    saved one disagree."""
    ev = ev or {}
    gaps = []
    if not re.match(r"^\d{4}-\d{2}-\d{2}", str(ev.get("date") or "")):
        gaps.append("date")
    if not str(ev.get("startTime") or "").strip() or str(ev.get("startTimeSource") or "") == "derived":
        gaps.append("time")
    if not any(str(ev.get(k) or "").strip() for k in ("venue", "venueAddress", "venueCity")):
        gaps.append("place")
    return gaps


def compose_invite_email(ev: dict, note: str, recipient_name, sender: str, stop_url, card_url=None):
    ev = ev or {}
    e = _html.escape
    hue = hue_for(ev.get("type"), ev.get("name"))
    name = str(ev.get("name") or "").strip() or "Our gathering"
    date_label, time_label = _when_parts(ev)
    when = " · ".join(x for x in (date_label, time_label) if x)
    place = str(ev.get("venue") or "").strip()
    address = str(ev.get("venueAddress") or "").strip()
    if not place and not address:   # an at-home event named only by its town
        place = ", ".join(x for x in (str(ev.get("venueCity") or "").strip(), str(ev.get("venueState") or "").strip()) if x)
    host = str(sender or "").strip()
    first = host.split(" ")[0] if host else "your host"
    url = invite_url(str(ev.get("rsvpCode") or ev.get("id") or ""))
    hi = f"Hi {str(recipient_name).strip()}," if recipient_name and str(recipient_name).strip() else ""
    note_lines = _note_lines(note, (when, date_label, place, address))
    note_html = re.sub(r"(<br>){3,}", "<br><br>", "<br>".join(e(x) for x in note_lines).strip())

    facts = []
    if date_label or time_label:
        # The weekday on its own line, so "Thursday, November 26" never breaks mid-date.
        d = e(date_label).replace(", ", "<br>", 1)
        t = f'<span style="color:{SUB};font-weight:500;">{e(time_label)}</span>' if time_label else ""
        facts.append(("When", "<br>".join(x for x in (d, t) if x), when))
    if place or address:
        extra = f'<br><span style="color:{SUB};font-weight:500;">{e(address)}</span>' if place and address and address != place else ""
        facts.append(("Where", e(place or address) + extra,
                      (place or address) + (f", {address}" if place and address and address != place else "")))

    # THE INVITATION AS A PICTURE (owner, 11/19/2026: "doesn't resemble my
    # invitations"). A picture of the host's own card (src/lib/inviteCard.js),
    # which no mail app recolors in dark mode. Its alt text carries the facts
    # for a reader with pictures off. Without one, the HTML card stands in.
    alt = ". ".join(x for x in (f"Invitation: {name}", when, place or address, f"Hosted by {host}" if host else "") if x)
    top = (f'<a href="{e(url)}" style="display:block;text-decoration:none;"><img src="{e(card_url)}" width="520" alt="{e(alt)}" '
           f'style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:14px;margin:0 auto;"></a>'
           if card_url else None)
    # "Or pick your answer": each opens the page with that answer PRESELECTED (?reply=).
    picks = [("Yes, I’m in", f"{e(url)}&amp;reply=Yes"), ("Can’t make it", f"{e(url)}&amp;reply=No"),
             ("Maybe", f"{e(url)}&amp;reply=Maybe")]
    return frame(
        hue=hue, greeting=hi, top_html=top,
        eyebrow="You’re invited", lede=f"{host} invites you to" if host else "You’re invited to", title=name,
        text_title=f"{host} invites you to {name}" if host else name,
        facts=facts, primary=("Open your invitation", url),
        secondary_label="Or pick your answer", secondary=picks, secondary_in_text=False,
        fine=f"No app, no account. Only {first} sees your reply.", fine_in_text=False,
        note_label="A note from " + first, note_html=note_html, note_text_lines=note_lines,
        pad="12px 12px 22px" if card_url else "28px 22px 24px",
        footer=f"Sent by {host or 'your host'} with No Guesswork Events.", stop_url=stop_url)
