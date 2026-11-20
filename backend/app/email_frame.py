"""The one frame every email the app sends wears (owner, 11/20/2026: "There
will be a branded envelope too" about the helper ask, then "And other comms").

The invite email (invite_email.py) set the look: a cream card on a warm gray
page, the event's hue (a muted one for a solemn gathering), the title in
Georgia (a font every mail app has), facts in labeled cells, one big button,
optional smaller buttons under it, and a quiet footer that says who sent it
and how to stop. Tables and inline styles only, no web fonts, no images, so
Gmail, Apple Mail and Outlook draw it the same way. The invite itself now
builds through this frame, byte for byte as before.

frame(...) is PURE and returns (html, text): the plain-text part carries the
same words and every link, so a reader with HTML off loses nothing.

Every argument named *_html is already escaped markup; every other string is
plain text and escaped here.

MARK is a substring every framed email carries (the card's own style). Tests
look for it to prove an email wears the frame.
"""
import html as _html
import re

from .config import APP_BASE_URL

SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',serif"

PAGE = "#efece6"      # the warm gray around the card
PAPER = "#f7f1e6"     # the card
INK = "#241f18"
SUB = "#62626d"
LINE = "#e2d6bf"
EDGE = "#d9cdb6"      # a secondary button's border
FOOT = "#8a8478"
HUE = "#B84E1E"       # the app's hue
SOMBRE_HUE = "#6f6152"

SOMBRE = re.compile(r"funeral|memorial|shiva|celebration of life|life celebration|wake|remembrance|in memoriam|mourn|repast", re.I)

# THE CARD IS PAPER (owner, 11/19/2026, on the first reminder in a dark-mode
# inbox: "Needs image for paper like the other emails"). A mail app in dark
# mode repaints a background COLOR (the cream came out brown) but not a picture,
# so the card carries paper-cream.jpg: the invite's own linen grain
# (invite-grain-light.jpg) multiplied over the cream, as the invite card draws
# it, made once because mail apps cannot blend. The cream stays as the fallback
# when images are off, and the email declares itself light-only (Apple Mail,
# Spark).
PAPER_IMAGE = APP_BASE_URL.rstrip("/") + "/hostv2/email/paper-cream.jpg"
LIGHT_ONLY = ('<meta name="color-scheme" content="light only">'
              '<meta name="supported-color-schemes" content="light only">'
              '<style>:root{color-scheme:light only;supported-color-schemes:light only;}</style>')
MARK = (f"background:{PAPER} url('{PAPER_IMAGE}') center / cover;"
        f"border:1px solid {LINE};border-radius:18px;")


def hue_for(*words) -> str:
    """The muted hue when any of the event's words (its type, its name) names a
    solemn gathering, else the app's hue."""
    return SOMBRE_HUE if any(SOMBRE.search(str(w or "")) for w in words) else HUE


def label_html(text: str, hue: str) -> str:
    """A small uppercase label in the hue ("When", "A note from Casey")."""
    return (f'<div style="margin:0 0 6px;font:800 10.5px/1 {SANS};letter-spacing:.16em;'
            f'text-transform:uppercase;color:{hue};">{_html.escape(text)}</div>')


def paragraphs_html(text: str) -> str:
    """Plain text to escaped markup: line breaks kept, runs of blank lines cut to one."""
    out = "<br>".join(_html.escape(x) for x in str(text or "").replace("\r", "").split("\n")).strip()
    return re.sub(r"(<br>){3,}", "<br><br>", out)


def _facts_html(facts, hue) -> str:
    cells = [label_html(lab, hue) + val for lab, val, _t in facts]
    width = "50%" if len(cells) == 2 else "100%"
    tds = "".join(
        f'<td width="{width}" valign="top" style="padding:14px 6px;text-align:center;font:600 14.5px/1.4 {SANS};color:{INK};'
        f'{f"border-left:1px solid {LINE};" if i else ""}">{c}</td>'
        for i, c in enumerate(cells))
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;'
            f'border-top:1px solid {LINE};border-bottom:1px solid {LINE};"><tr>{tds}</tr></table>')


def _pick(text, url, width):
    # Styled on the cell, so every one keeps one height when one wraps on a small phone.
    return (f'<td width="{width}" valign="middle" style="background:#ffffff;border:1px solid {EDGE};border-radius:10px;text-align:center;">'
            f'<a href="{url}" style="display:block;color:{INK};text-decoration:none;'
            f'font:600 13px/1.25 {SANS};padding:11px 2px;">{_html.escape(text)}</a></td>')


def frame(*, hue=HUE, greeting=None, top_html=None, eyebrow=None, lede=None, title=None, text_title=None,
          facts=(), blocks=(), primary=None, secondary_label=None, secondary=(), secondary_in_text=True,
          fine=None, fine_in_text=True, note_label=None, note_html="", note_text_lines=(),
          pad="28px 22px 24px", footer="Sent with No Guesswork Events.", stop_url=None,
          stop_label="Stop emails about this event"):
    """(html, text).

    facts      [(label, value_html, value_text)] — side by side in the card
    blocks     [(inner_html, text)]              — paragraphs in the card, left-aligned
    primary    (label, url)                      — the big button
    secondary  [(label, url_html)]               — the smaller buttons under it
               (url_html is an escaped href: a caller may append its own &amp;query)
    note_*     a labeled note under the card (the host's own words)
    footer     who sent it; the stop link follows it when there is one
    """
    e = _html.escape
    inner = []
    if top_html is not None:
        inner.append(top_html)
    else:
        head = ""
        if eyebrow:
            head += (f'<div style="font:800 11px/1 {SANS};letter-spacing:.18em;text-transform:uppercase;'
                     f'color:{hue};">{e(eyebrow)}</div>')
        if lede:
            head += f'<div style="margin:14px 0 0;font:500 14px/1.4 {SANS};color:{SUB};">{e(lede)}</div>'
        if title:
            head += f'<div style="margin:6px 0 0;font:700 30px/1.15 {SERIF};color:{INK};">{e(title)}</div>'
        if facts:
            head += _facts_html(facts, hue)
        if head:
            inner.append(head)
    for b_html, _t in blocks:
        inner.append(f'<div style="margin:18px 0 0;text-align:left;font:400 15px/1.6 {SANS};color:{INK};">{b_html}</div>')
    if primary:
        inner.append(f'<a href="{e(primary[1])}" style="display:block;margin:22px 0 0;background:{hue};color:#ffffff;'
                     f'text-decoration:none;border-radius:12px;font:700 16px/1.2 {SANS};padding:16px 10px;">{e(primary[0])}</a>')
    if secondary:
        if secondary_label:
            inner.append(f'<div style="margin:18px 0 2px;font:500 13px/1.4 {SANS};color:{SUB};">{e(secondary_label)}</div>')
        width = "32%" if len(secondary) >= 3 else ("49%" if len(secondary) == 2 else "100%")
        cells = "".join(_pick(t, u, width) for t, u in secondary)
        inner.append(f'<table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>{cells}</tr></table>')
    if fine:
        inner.append(f'<p style="margin:12px 0 0;font:500 12.5px/1.5 {SANS};color:{SUB};">{e(fine)}</p>')
    card = "\n  ".join(inner)

    hi = (f'<p style="max-width:520px;margin:0 auto 12px;font:500 15px/1.5 {SANS};color:{INK};">{e(greeting)}</p>'
          if greeting else '')
    note = (f'<div style="max-width:520px;margin:16px auto 0;padding:0 4px;">{label_html(note_label or "", hue)}'
            f'<div style="font:400 15px/1.6 {SANS};color:{INK};">{note_html}</div></div>' if note_html else '')
    stop = f' <a href="{e(stop_url)}" style="color:{FOOT};">{e(stop_label)}</a>.' if stop_url else ''
    html = f"""{LIGHT_ONLY}<div style="background:{PAGE};padding:24px 12px;">
{hi}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" background="{e(PAPER_IMAGE)}" bgcolor="{PAPER}" style="max-width:520px;margin:0 auto;{MARK}">
<tr><td style="padding:{pad};text-align:center;">
  {card}
</td></tr></table>
{note}
<p style="max-width:520px;margin:18px auto 0;text-align:center;font:500 12px/1.5 {SANS};color:{FOOT};">{e(footer)}{stop}</p>
</div>"""

    lines = [greeting or "", ""]
    if eyebrow:
        lines.append(eyebrow.upper())
    if text_title or title:
        lines.append(text_title or title)
    lines.append("")
    for lab, _h, val in facts:
        lines.append(f"{lab}: {val}")
    lines.append("")
    for _h, t in blocks:
        lines += [t, ""]
    if primary:
        lines += [f"{primary[0]}: {primary[1]}", ""]
    if secondary and secondary_in_text:
        lines += [f"{t}: {_html.unescape(u)}" for t, u in secondary] + [""]
    if fine and fine_in_text:
        lines += [fine, ""]
    if note_text_lines:
        lines += [f"{note_label}:", *note_text_lines, ""]
    lines.append(footer)
    if stop_url:
        lines.append(f"{stop_label}: {stop_url}")
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    return html, text


# ── a clock time, read the way src/lib/clock.js reads it ─────────────────────
def clock12(s) -> str:
    """"16:00" or "4:00 PM" → "4:00 PM"; '' when unreadable (clock.js clock12).
    Both forms are stored: the time field writes "16:00", a plan made from a
    sentence writes "4:00 PM". Reading only the digits sent a 4 PM party out
    as "4:00 AM" (found live 11/19/2026)."""
    t = str(s or "").strip()
    m = re.match(r"^(\d{1,2}):(\d{2})\s*(AM|PM)$", t, re.I)
    if m:
        h = int(m.group(1)) % 12 + (12 if m.group(3).upper() == "PM" else 0)
        mins = h * 60 + int(m.group(2))
    else:
        m = re.match(r"^(\d{1,2}):(\d{2})$", t)
        if not m:
            return ""
        mins = int(m.group(1)) * 60 + int(m.group(2))
    return f"{(mins // 60) % 12 or 12}:{mins % 60:02d} {'PM' if mins >= 720 else 'AM'}"
