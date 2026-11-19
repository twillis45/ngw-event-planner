"""The invite email IS the invitation (owner, 11/19/2026: "Put my studio matte
and format emails for invite from batch. Can't the emails being sent include the
actual invite in body of email message?").

The Studio Matte paper card from the guest invite page (hostv2 InviteV2,
styles.css .inv2-sheet), made for email: inline styles and tables only, since
mail apps strip stylesheets. The masthead, the event's name in the display
serif, WHEN and WHERE, one "Reply to the invite" button, then the host's note.

Facts come from the event the SERVER has saved (events.data), never from the
request. A start time the host did not set (startTimeSource 'derived') is never
stated, the same outward rule as eventWhen.eventStartLabel. A solemn gathering
gets the muted hue (.inv2-muted). PURE: returns (html, text).
"""
import html as _html
import re
from datetime import date as _date

from .guest_notices import invite_url

SOMBRE = re.compile(r"funeral|memorial|shiva|celebration of life|life celebration|wake|remembrance|in memoriam|mourn|repast", re.I)
_URL_LINE = re.compile(r"^\s*https?://\S+\s*$")
_INTRO_LINE = re.compile(r":\s*$")     # "Let us know you're coming:" — it only introduced the link


def _when(ev: dict) -> str:
    d = str(ev.get("date") or "")[:10]
    try:
        y, m, dd = (int(x) for x in d.split("-"))
        day = _date(y, m, dd)
        label = f"{day.strftime('%A')}, {day.strftime('%B')} {day.day}"
    except (ValueError, TypeError):
        label = ""
    t = str(ev.get("startTime") or "").strip()
    if t and str(ev.get("startTimeSource") or "") != "derived":
        mt = re.match(r"^(\d{1,2}):(\d{2})$", t)
        if mt:
            h, mm = int(mt.group(1)), mt.group(2)
            t = f"{(h % 12) or 12}:{mm} {'PM' if h >= 12 else 'AM'}"
        label = f"{label} · {t}" if label else t
    return label


def _month_year(ev: dict) -> str:
    try:
        y, m, dd = (int(x) for x in str(ev.get("date") or "")[:10].split("-"))
        return _date(y, m, dd).strftime("%b %Y").upper()
    except (ValueError, TypeError):
        return ""


def _note_lines(note: str, facts=()) -> list:
    """The host's words, minus the bare link and the line that only introduced it
    (the button carries the link), and minus a line that only repeats a fact the
    card already shows (the date, the place)."""
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
    hue, hue_deep = ("#8a7a66", "#6f6152") if solemn else ("#D9622B", "#B84E1E")
    ink, sub = "#241f18", "#62626d"
    name = str(ev.get("name") or "").strip() or "Our gathering"
    when = _when(ev)
    place = str(ev.get("venue") or "").strip()
    address = str(ev.get("venueAddress") or "").strip()
    url = invite_url(str(ev.get("rsvpCode") or ev.get("id") or ""))
    first = str(sender or "").strip().split(" ")[0] or "your host"
    hi = f"Hi {str(recipient_name).strip()}," if recipient_name and str(recipient_name).strip() else ""
    note_lines = _note_lines(note, (when, place, address))

    label = (f'<div style="font:800 11px/1.4 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;'
             f'letter-spacing:.16em;text-transform:uppercase;color:{hue_deep};margin:0 0 4px;">{{}}</div>')
    row = lambda k, v, extra="": (  # noqa: E731
        f'<tr><td style="padding:10px 0;border-top:1px solid #e6dccb;">{label.format(e(k))}'
        f'<div style="font:600 17px/1.45 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:{ink};">{e(v)}</div>'
        f'{extra}</td></tr>')
    rows = ""
    if when:
        rows += row("When", when)
    if place or address:
        extra = (f'<div style="font:500 14px/1.45 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:{sub};">{e(address)}</div>'
                 if address and address != place else "")
        rows += row("Where", place or address, extra)
    note_html = "<br>".join(e(line) for line in note_lines).strip()
    note_html = re.sub(r"(<br>){3,}", "<br><br>", note_html)

    html = f"""<div style="background:#efe9dd;padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fbf7ef;border:1px solid #e2d6c0;border-radius:18px;">
<tr><td style="padding:28px 28px 24px;">
  {f'<p style="margin:0 0 16px;font:500 15px/1.5 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:{ink};">{e(hi)}</p>' if hi else ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font:800 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:{hue_deep};">An invitation</td>
    <td align="right" style="font:800 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.16em;color:{hue_deep};">{e(_month_year(ev))}</td>
  </tr></table>
  <h1 style="margin:20px 0 0;text-align:center;font:700 34px/1.15 'Playfair Display',Georgia,'Times New Roman',serif;letter-spacing:-.015em;color:{ink};">{e(name)}</h1>
  <div style="width:44px;height:2px;background:{hue};margin:16px auto 18px;"></div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td align="center">
    <a href="{e(url)}" style="display:inline-block;background:{hue};color:#ffffff;text-decoration:none;font:700 16px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:15px 30px;border-radius:999px;">Reply to the invite</a>
  </td></tr></table>
  <p style="margin:8px 0 0;text-align:center;font:500 12.5px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:{sub};">Tap to say yes, no or maybe. No app or account needed.</p>
  {f'<div style="margin:24px 0 0;padding:16px 0 0;border-top:1px solid #e6dccb;">{label.format("A note from " + e(first))}<div style="font:400 15.5px/1.6 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:{ink};">{note_html}</div></div>' if note_html else ''}
</td></tr></table>
<p style="max-width:560px;margin:14px auto 0;text-align:center;font:500 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#8a8478;">Sent by {e(str(sender or "your host"))} with No Guesswork Events.{f' <a href="{e(stop_url)}" style="color:#8a8478;">Stop emails about this event</a>.' if stop_url else ''}</p>
</div>"""

    text_lines = [hi, "", "AN INVITATION", name]
    if when:
        text_lines.append(when)
    if place or address:
        text_lines.append(place or address)
        if address and address != place:
            text_lines.append(address)
    text_lines += ["", f"Reply to the invite: {url}", ""]
    if note_lines:
        text_lines += [f"A note from {first}:", *note_lines, ""]
    text_lines.append(f"Sent by {sender or 'your host'} with No Guesswork Events.")
    if stop_url:
        text_lines.append(f"Stop emails about this event: {stop_url}")
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(text_lines)).strip()
    return html, text
