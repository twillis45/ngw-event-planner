"""The invite email IS the invitation (owner, 11/19/2026: "Put my studio matte
and format emails for invite from batch. Can't the emails being sent include the
actual invite in body of email message?" then "I need the html version to be
what they see").

It mirrors the guest invite page's card (hostv2 InviteV2, styles.css .inv2-*):
the masthead with its rule and diamond, the event's name in the display serif,
the italic deck line, the accent rule, WHEN / WHERE / HOSTED BY, then "The
favor of a reply" with Yes / Can't make it / Maybe, then the host's note.

Mail apps strip the page's CSS paper (gradients, grain, inset shadows), so the
paper is the page's own CSS rendered ONCE to an image (hostv2/public/email/
invite-paper.jpg, served beside the app) and laid behind the card, with the
same paper colour as the fallback where images are off. The text stays text,
and each reply button opens the invite with that answer preselected (?reply=).
The countdown is left out: an email cannot update itself, so it would go stale.

Facts come from the event the SERVER has saved (events.data), never from the
request. A start time the host did not set (startTimeSource 'derived') is never
stated. A solemn gathering gets the muted hue. PURE: returns (html, text).
"""
import html as _html
import re
from datetime import date as _date

from .config import APP_BASE_URL
from .guest_notices import invite_url

SOMBRE = re.compile(r"funeral|memorial|shiva|celebration of life|life celebration|wake|remembrance|in memoriam|mourn|repast", re.I)
_URL_LINE = re.compile(r"^\s*https?://\S+\s*$")
_INTRO_LINE = re.compile(r":\s*$")     # "Let us know you're coming:" — it only introduced the link
SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
SERIF = "'Playfair Display',Georgia,'Times New Roman',serif"
PAPER_URL = f"{APP_BASE_URL.rstrip('/')}/hostv2/email/invite-paper.jpg"


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


def _month_year(ev: dict) -> str:
    try:
        y, m, dd = (int(x) for x in str(ev.get("date") or "")[:10].split("-"))
        return _date(y, m, dd).strftime("%b %Y").upper()
    except (ValueError, TypeError):
        return ""


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


def compose_invite_email(ev: dict, note: str, recipient_name, sender: str, stop_url, deck: str = ""):
    ev = ev or {}
    e = _html.escape
    solemn = bool(SOMBRE.search(str(ev.get("type") or "")) or SOMBRE.search(str(ev.get("name") or "")))
    hue, hue_deep = ("#8a7a66", "#6f6152") if solemn else ("#D9622B", "#B84E1E")
    ink, sub = "#241f18", "#62626d"
    name = str(ev.get("name") or "").strip() or "Our gathering"
    date_label, time_label = _when_parts(ev)
    when = " · ".join(x for x in (date_label, time_label) if x)
    place = str(ev.get("venue") or "").strip()
    address = str(ev.get("venueAddress") or "").strip()
    host = str(sender or "").strip()
    first = host.split(" ")[0] if host else "your host"
    deck = re.sub(r"\s+", " ", str(deck or "")).strip()[:90]
    url = invite_url(str(ev.get("rsvpCode") or ev.get("id") or ""))
    hi = f"Hi {str(recipient_name).strip()}," if recipient_name and str(recipient_name).strip() else ""
    note_lines = _note_lines(note, (when, date_label, place, address, deck, deck + '.' if deck else ''))
    note_html = re.sub(r"(<br>){3,}", "<br><br>", "<br>".join(e(line) for line in note_lines).strip())

    def label(text, align="center", top=18):
        return (f'<div style="margin:{top}px 0 0;text-align:{align};font:800 11px/1.3 {SANS};letter-spacing:.16em;'
                f'text-transform:uppercase;color:{hue_deep};">{e(text)}</div>')

    def value(text, color=ink, weight=600):
        return f'<div style="margin:4px 0 0;text-align:center;font:{weight} 16px/1.4 {SANS};color:{color};">{text}</div>'

    facts = ""
    if when:
        when_html = e(date_label) + (f'<span style="font-weight:500;color:{sub};"> · {e(time_label)}</span>' if time_label and date_label else e(time_label) if time_label else "")
        facts += label("When") + value(when_html)
    if place or address:
        facts += label("Where") + value(e(place or address))
        if address and address != place:
            facts += value(e(address), color=sub, weight=500)
    if host:
        facts += label("Hosted by") + value(e(host))

    def reply_btn(text, answer, filled):
        style = (f"background:{hue_deep};color:#ffffff;border:1px solid {hue_deep};" if filled
                 else f"background:#fbf7ee;color:{ink};border:1px solid #d9cdb6;")
        return (f'<td style="padding:0 4px;" width="33%"><a href="{e(url)}&amp;reply={answer}" '
                f'style="display:block;{style}text-decoration:none;text-align:center;font:700 14px/1.2 {SANS};'
                f'white-space:nowrap;padding:15px 4px;border-radius:12px;">{e(text)}</a></td>')

    paper = (f"background-color:#f7f1e6;background-image:url('{PAPER_URL}');background-size:100% 100%;"
             f"background-repeat:no-repeat;background-position:center top;")
    html = f"""<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&amp;display=swap" rel="stylesheet">
<div style="background:#efece6;padding:20px 12px;">
{f'<p style="max-width:560px;margin:0 auto 12px;font:500 15px/1.5 {SANS};color:{ink};">{e(hi)}</p>' if hi else ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" background="{PAPER_URL}" style="max-width:560px;margin:0 auto;{paper}border:1px solid #e2d6bf;border-radius:22px;">
<tr><td style="padding:26px 24px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="white-space:nowrap;font:800 11px/1 {SANS};letter-spacing:.18em;text-transform:uppercase;color:{hue_deep};">An invitation</td>
    <td width="100%" style="padding:0 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="border-top:1px solid {hue};opacity:.55;font-size:0;line-height:0;">&nbsp;</td>
      <td width="10" style="color:{hue};font:700 9px/1 {SANS};text-align:center;padding:0 2px;">&#9670;</td>
      <td style="border-top:1px solid {hue};opacity:.55;font-size:0;line-height:0;">&nbsp;</td>
    </tr></table></td>
    <td style="white-space:nowrap;font:800 11px/1 {SANS};letter-spacing:.18em;color:{hue_deep};">{e(_month_year(ev))}</td>
  </tr></table>
  <h1 style="margin:26px 0 0;text-align:center;font:700 40px/1.08 {SERIF};letter-spacing:-.01em;color:{ink};text-shadow:0 2px 1px rgba(255,255,255,.9),0 -1.5px 1px rgba(90,62,32,.5);">{e(name)}</h1>
  {f'<p style="margin:8px 0 0;text-align:center;font:italic 400 17px/1.4 {SERIF};color:{sub};">{e(deck)}</p>' if deck else ''}
  <div style="width:44px;height:2px;background:{hue};margin:18px auto 4px;font-size:0;line-height:0;">&nbsp;</div>
  {facts}
  {label("The favor of a reply", align="left", top=30)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0;"><tr>
    {reply_btn("Yes, I’m in", "Yes", True)}{reply_btn("Can’t make it", "No", False)}{reply_btn("Maybe", "Maybe", False)}
  </tr></table>
  <p style="margin:12px 0 0;text-align:center;font:500 13px/1.5 {SANS};color:{sub};">Your reply goes straight to your host’s plan — nothing to install, no account. Only your host sees it; the guest list stays private.</p>
  {f'<div style="margin:24px 0 0;padding:16px 0 0;border-top:1px solid #e2d6bf;">{label("A note from " + first, align="left", top=0)}<div style="margin:6px 0 0;font:400 15.5px/1.6 {SANS};color:{ink};">{note_html}</div></div>' if note_html else ''}
</td></tr></table>
<p style="max-width:560px;margin:14px auto 0;text-align:center;font:500 12px/1.5 {SANS};color:#8a8478;">Sent by {e(host or "your host")} with No Guesswork Events.{f' <a href="{e(stop_url)}" style="color:#8a8478;">Stop emails about this event</a>.' if stop_url else ''}</p>
</div>"""

    text_lines = [hi, "", "AN INVITATION", name]
    if deck:
        text_lines.append(deck)
    text_lines.append("")
    if when:
        text_lines.append(f"When: {when}")
    if place or address:
        text_lines.append(f"Where: {place or address}" + (f", {address}" if address and address != place else ""))
    if host:
        text_lines.append(f"Hosted by: {host}")
    text_lines += ["", f"Reply to the invite: {url}", ""]
    if note_lines:
        text_lines += [f"A note from {first}:", *note_lines, ""]
    text_lines.append(f"Sent by {host or 'your host'} with No Guesswork Events.")
    if stop_url:
        text_lines.append(f"Stop emails about this event: {stop_url}")
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(text_lines)).strip()
    return html, text
