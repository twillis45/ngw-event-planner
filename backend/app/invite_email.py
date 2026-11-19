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

from .guest_notices import invite_url

SOMBRE = re.compile(r"funeral|memorial|shiva|celebration of life|life celebration|wake|remembrance|in memoriam|mourn|repast", re.I)
_URL_LINE = re.compile(r"^\s*https?://\S+\s*$")
_INTRO_LINE = re.compile(r":\s*$")     # "Let us know you're coming:" — it only introduced the link
SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',serif"


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


def compose_invite_email(ev: dict, note: str, recipient_name, sender: str, stop_url):
    ev = ev or {}
    e = _html.escape
    solemn = bool(SOMBRE.search(str(ev.get("type") or "")) or SOMBRE.search(str(ev.get("name") or "")))
    hue = "#6f6152" if solemn else "#B84E1E"
    ink, sub, line = "#241f18", "#62626d", "#e2d6bf"
    name = str(ev.get("name") or "").strip() or "Our gathering"
    date_label, time_label = _when_parts(ev)
    when = " · ".join(x for x in (date_label, time_label) if x)
    place = str(ev.get("venue") or "").strip()
    address = str(ev.get("venueAddress") or "").strip()
    host = str(sender or "").strip()
    first = host.split(" ")[0] if host else "your host"
    url = invite_url(str(ev.get("rsvpCode") or ev.get("id") or ""))
    hi = f"Hi {str(recipient_name).strip()}," if recipient_name and str(recipient_name).strip() else ""
    note_lines = _note_lines(note, (when, date_label, place, address))
    note_html = re.sub(r"(<br>){3,}", "<br><br>", "<br>".join(e(x) for x in note_lines).strip())

    def label(text):
        return (f'<div style="margin:0 0 6px;font:800 10.5px/1 {SANS};letter-spacing:.16em;'
                f'text-transform:uppercase;color:{hue};">{e(text)}</div>')

    cells = []
    if date_label or time_label:
        # The weekday on its own line, so "Thursday, November 26" never breaks mid-date.
        d = e(date_label).replace(", ", "<br>", 1)
        t = f'<span style="color:{sub};font-weight:500;">{e(time_label)}</span>' if time_label else ""
        cells.append(label("When") + "<br>".join(x for x in (d, t) if x))
    if place or address:
        extra = f'<br><span style="color:{sub};font-weight:500;">{e(address)}</span>' if place and address and address != place else ""
        cells.append(label("Where") + e(place or address) + extra)
    facts = ""
    if cells:
        width = "50%" if len(cells) == 2 else "100%"
        tds = "".join(
            f'<td width="{width}" valign="top" style="padding:14px 6px;text-align:center;font:600 14.5px/1.4 {SANS};color:{ink};'
            f'{f"border-left:1px solid {line};" if i else ""}">{c}</td>'
            for i, c in enumerate(cells))
        facts = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;'
                 f'border-top:1px solid {line};border-bottom:1px solid {line};"><tr>{tds}</tr></table>')

    def pick(text, answer):
        # Styled on the cell, so all three keep one height when one wraps on a small phone.
        return (f'<td width="32%" valign="middle" style="background:#ffffff;border:1px solid #d9cdb6;border-radius:10px;text-align:center;">'
                f'<a href="{e(url)}&amp;reply={answer}" style="display:block;color:{ink};text-decoration:none;'
                f'font:600 13px/1.25 {SANS};padding:11px 2px;">{e(text)}</a></td>')

    invites = f"{e(host)} invites you to" if host else "You’re invited to"
    html = f"""<div style="background:#efece6;padding:24px 12px;">
{f'<p style="max-width:520px;margin:0 auto 12px;font:500 15px/1.5 {SANS};color:{ink};">{e(hi)}</p>' if hi else ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#f7f1e6;border:1px solid {line};border-radius:18px;">
<tr><td style="padding:28px 22px 24px;text-align:center;">
  <div style="font:800 11px/1 {SANS};letter-spacing:.18em;text-transform:uppercase;color:{hue};">You’re invited</div>
  <div style="margin:14px 0 0;font:500 14px/1.4 {SANS};color:{sub};">{invites}</div>
  <div style="margin:6px 0 0;font:700 30px/1.15 {SERIF};color:{ink};">{e(name)}</div>
  {facts}
  <a href="{e(url)}" style="display:block;margin:22px 0 0;background:{hue};color:#ffffff;text-decoration:none;border-radius:12px;font:700 16px/1.2 {SANS};padding:16px 10px;">Open your invitation</a>
  <div style="margin:18px 0 2px;font:500 13px/1.4 {SANS};color:{sub};">Or pick your answer</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>{pick("Yes, I’m in", "Yes")}{pick("Can’t make it", "No")}{pick("Maybe", "Maybe")}</tr></table>
  <p style="margin:12px 0 0;font:500 12.5px/1.5 {SANS};color:{sub};">No app, no account. Only {e(first)} sees your reply.</p>
</td></tr></table>
{f'<div style="max-width:520px;margin:16px auto 0;padding:0 4px;">{label("A note from " + first)}<div style="font:400 15px/1.6 {SANS};color:{ink};">{note_html}</div></div>' if note_html else ''}
<p style="max-width:520px;margin:18px auto 0;text-align:center;font:500 12px/1.5 {SANS};color:#8a8478;">Sent by {e(host or "your host")} with No Guesswork Events.{f' <a href="{e(stop_url)}" style="color:#8a8478;">Stop emails about this event</a>.' if stop_url else ''}</p>
</div>"""

    text_lines = [hi, "", "YOU’RE INVITED", f"{host} invites you to {name}" if host else name, ""]
    if when:
        text_lines.append(f"When: {when}")
    if place or address:
        text_lines.append(f"Where: {place or address}" + (f", {address}" if place and address and address != place else ""))
    text_lines += ["", f"Open your invitation: {url}", ""]
    if note_lines:
        text_lines += [f"A note from {first}:", *note_lines, ""]
    text_lines.append(f"Sent by {host or 'your host'} with No Guesswork Events.")
    if stop_url:
        text_lines.append(f"Stop emails about this event: {stop_url}")
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(text_lines)).strip()
    return html, text
