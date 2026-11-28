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

THE CARD AS A PICTURE (owner, 11/20/2026: "Do picture for all emails"). A mail
app in dark mode recolors HTML, never a picture. The html frame() returns is a
Framed string that also carries `card`: what a picture of its card would show
(the eyebrow, the lede, the title, the facts and the `fixed` copy), for
email_card.draw_card. email_pictures.with_picture draws and stores it and calls
frame() again with `card_url`; the top of the card is then that picture, linked
to the email's primary destination, with alt text carrying every fact on it.
Under the picture, still live HTML: the host's own words (`blocks`), the
buttons, the fine print, the note, the footer and the stop link. Without a
card_url the email is exactly what it was, so a picture is an improvement and
never a dependency.

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
# Under a picture of the card the paper is laid from the top at the card's
# width, so it continues the picture's own paper (email_card crops
# paper-cream.jpg from its top at the same width) with no seam.
PICTURE_MARK = (f"background:{PAPER} url('{PAPER_IMAGE}') center top / 100% auto;"
                f"border:1px solid {LINE};border-radius:18px;")

# ── TWO THEMES, ONE ROW PER EMAIL (owner ruling 11/20/2026, "Approve as
# recommended": paper for the invite, announcement, reply notice, message to a
# guest or vendor, RSVP nudge, helper ask and approval; matte for the
# week-before reminder, host alerts and the co-host invite) ──
# PAPER, the invite's linen stationery, for the emails that reach a guest, a
# helper, a vendor or a client. MATTE, the host app's own Studio Matte, for the
# emails that reach the host about their own plan. THEME_FOR is the one place
# that decides: flip a row and that email changes, its picture with it.
# (An RSVP nudge to one guest is a "message"; it goes through that sender.)
THEME_FOR = {
    "invite": "paper",
    "announcement": "paper",
    "reply_notice": "paper",
    "message": "paper",
    "helper_ask": "paper",
    "approval": "paper",
    "week_before": "matte",
    "host_alert": "matte",
    "cohost_invite": "matte",
}

# MATTE's colors are the host app's, never new ones: the surfaces are
# carbonNeutral.mid (src/theme/palette.js, the ramp hostv2/src/theme.js paints
# the shell with), the text is the dark bundle's textPrimary and textSecondary
# (--ink, --ink-soft) and theme.js's --muted literal, the button is --steel
# with its --on-steel label, and the eyebrow is the app's hue as hostv2 paints
# it (styles.css --hue; a solemn gathering takes --muted instead, as the paper
# takes its muted hue).
MATTE_PAGE = "#141518"     # carbonNeutral.mid.bg      (--bg)
MATTE_CARD = "#1E1F22"     # carbonNeutral.mid.panel   (--card)
MATTE_RAISED = "#25262A"   # carbonNeutral.mid.surface2 (a secondary button)
MATTE_LINE = "#313338"     # carbonNeutral.mid.border  (--line)
MATTE_INK = "#eef0f4"      # textPrimary, dark         (--ink, --on-steel)
MATTE_SOFT = "#849eb8"     # textSecondary, dark       (--ink-soft): the facts' labels
MATTE_MUTED = "#909296"    # theme.js --muted: lede, fine print, footer
MATTE_STEEL = "#4c6675"    # steelBlue                 (--steel): the button
MATTE_HUE = "#D9622B"      # styles.css --hue: the eyebrow
MATTE_MARK = f"background:{MATTE_CARD};border:1px solid {MATTE_LINE};border-radius:18px;"

THEMES = {
    "paper": {"page": PAGE, "card": PAPER, "ink": INK, "sub": SUB, "line": LINE, "edge": EDGE, "foot": FOOT,
              "raised": "#ffffff", "mark": MARK, "mark_picture": PICTURE_MARK, "image": PAPER_IMAGE, "button": None, "on_button": "#ffffff",
              "label": None, "hues": {}},
    "matte": {"page": MATTE_PAGE, "card": MATTE_CARD, "ink": MATTE_INK, "sub": MATTE_MUTED, "line": MATTE_LINE,
              "edge": MATTE_LINE, "foot": MATTE_MUTED, "raised": MATTE_RAISED, "mark": MATTE_MARK,
              "mark_picture": MATTE_MARK, "image": None,
              "button": MATTE_STEEL, "on_button": MATTE_INK, "label": MATTE_SOFT,
              "hues": {HUE: MATTE_HUE, SOMBRE_HUE: MATTE_MUTED}},
}


def theme_for(kind) -> str:
    """The theme THEME_FOR names for an email kind; paper for one it does not name."""
    return THEME_FOR.get(kind, "paper")


def hue_for(*words) -> str:
    """The muted hue when any of the event's words (its type, its name) names a
    solemn gathering, else the app's hue."""
    return SOMBRE_HUE if any(SOMBRE.search(str(w or "")) for w in words) else HUE


def label_html(text: str, hue: str, matte: bool = False) -> str:
    """A small uppercase label in the hue ("When", "A note from Casey"); the
    matte theme passes its own label color here, and sets it in sentence case
    like the app (UX_12: no all-capitals labels; owner, 11/28/2026)."""
    if matte:
        return (f'<div style="margin:0 0 6px;font:600 13px/1.2 {SANS};'
                f'color:{hue};">{_html.escape(text)}</div>')
    return (f'<div style="margin:0 0 6px;font:800 10.5px/1 {SANS};letter-spacing:.16em;'
            f'text-transform:uppercase;color:{hue};">{_html.escape(text)}</div>')


def paragraphs_html(text: str) -> str:
    """Plain text to escaped markup: line breaks kept, runs of blank lines cut to one."""
    out = "<br>".join(_html.escape(x) for x in str(text or "").replace("\r", "").split("\n")).strip()
    return re.sub(r"(<br>){3,}", "<br><br>", out)


def _facts_html(facts, hue, t=None) -> str:
    t = t or THEMES["paper"]
    ink, line = t["ink"], t["line"]
    cells = [label_html(lab, hue, t is THEMES["matte"]) + (val if t is THEMES["paper"] else val.replace(f"color:{SUB}", f"color:{t['sub']}"))
             for lab, val, _t in facts]
    width = "50%" if len(cells) == 2 else "100%"
    tds = "".join(
        f'<td width="{width}" valign="top" style="padding:14px 6px;text-align:center;font:600 14.5px/1.4 {SANS};color:{ink};'
        f'{f"border-left:1px solid {line};" if i else ""}">{c}</td>'
        for i, c in enumerate(cells))
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;'
            f'border-top:1px solid {line};border-bottom:1px solid {line};"><tr>{tds}</tr></table>')


class Framed(str):
    """A framed email's html, plus what a picture of its card would show (`card`,
    None when the email already leads with a picture of its own). `with_card(url)`
    frames the same email again around a stored picture of that card."""
    card = None
    _kw = None

    def with_card(self, url):
        return frame(**self._kw, card_url=url)


def _fact_lines(value_html: str) -> list:
    """A fact cell's markup as the picture draws it: one [text, is_sub] per
    <br> line, is_sub where the line is the quieter span (an hour, an address)."""
    out = []
    for seg in str(value_html or "").split("<br>"):
        sub = f"color:{SUB}" in seg
        text = _html.unescape(re.sub(r"<[^>]+>", "", seg)).strip()
        if text:
            out.append([text, sub])
    return out


def card_alt(card: dict) -> str:
    """Every fact on the card, as one line of alt text."""
    parts = [card.get("eyebrow"), card.get("lede"), card.get("title")]
    parts += [f"{f['label']}: {f['text']}" for f in card.get("facts") or []]
    parts += [" ".join(str(t).split()) for t in card.get("fixed") or []]
    return ". ".join(str(p).strip().rstrip(".") for p in parts if p and str(p).strip()) + "."


def _pick(text, url, width, t=None):
    t = t or THEMES["paper"]
    # Styled on the cell, so every one keeps one height when one wraps on a small phone.
    return (f'<td width="{width}" valign="middle" style="background:{t["raised"]};border:1px solid {t["edge"]};border-radius:10px;text-align:center;">'
            f'<a href="{url}" style="display:block;color:{t["ink"]};text-decoration:none;'
            f'font:600 13px/1.25 {SANS};padding:14px 2px;">{_html.escape(text)}</a></td>')
    # 13px x 1.25 + 2 x 14px = 44px: a tap target (audit 2, lane E P2-6; was 38px).


# ── When and Where, the same two facts on every outward email (audit 2, E) ───
# The words come from app/outward.py (event_days, place_line): the app's own
# readers, ported. These only lay them out: the weekday over the date, the
# hour under it; the place's name over the rest of its line.
def when_fact(day_label: str, time_label: str):
    if not (day_label or time_label):
        return None
    e = _html.escape
    d = e(day_label).replace(", ", "<br>", 1)
    t = f'<span style="color:{SUB};font-weight:500;">{e(time_label)}</span>' if time_label else ""
    return ("When", "<br>".join(x for x in (d, t) if x), " · ".join(x for x in (day_label, time_label) if x))


def where_fact(line: str):
    if not line:
        return None
    e = _html.escape
    head, _sep, rest = line.partition(" · ")
    extra = f'<br><span style="color:{SUB};font-weight:500;">{e(rest)}</span>' if rest else ""
    # In words, the line reads as a sentence, the way the invite text says it
    # (doItForMe.placePhrase): "Vida's, 271 Whitaker Rd".
    return ("Where", e(head) + extra, ", ".join(line.split(" · ")))


def frame(*, kind=None, hue=HUE, greeting=None, top_html=None, eyebrow=None, lede=None, title=None, text_title=None,
          facts=(), fixed=(), blocks=(), primary=None, secondary_label=None, secondary=(), secondary_in_text=True,
          fine=None, fine_in_text=True, note_label=None, note_html="", note_text_lines=(),
          pad="28px 22px 24px", footer="Sent with No Guesswork Events.", stop_url=None,
          stop_label="Stop emails about this event", card_url=None):
    """(html, text); html is a Framed str.

    kind       the email's row in THEME_FOR (paper or matte)
    facts      [(label, value_html, value_text)] — side by side in the card
    fixed      [(inner_html, text)]              — the email's own short copy (a
               helper's jobs): paragraphs in the card, and drawn in its picture
    blocks     [(inner_html, text)]              — paragraphs in the card, left-aligned;
               the host's own words, which stay live HTML under a picture
    card_url   a stored picture of this card: it replaces the eyebrow, lede,
               title, facts and fixed copy at the top, linked to `primary`
    primary    (label, url)                      — the big button
    secondary  [(label, url_html)]               — the smaller buttons under it
               (url_html is an escaped href: a caller may append its own &amp;query)
    note_*     a labeled note under the card (the host's own words)
    footer     who sent it; the stop link follows it when there is one
    """
    kw = {k: v for k, v in locals().items() if k != "card_url"}
    e = _html.escape
    theme = theme_for(kind)
    t = THEMES[theme]
    hue = t["hues"].get(hue, hue)
    label = t["label"] or hue
    ink, sub = t["ink"], t["sub"]
    pic = None
    if top_html is None and (eyebrow or lede or title or facts or fixed):
        pic = {"theme": theme, "hue": hue, "eyebrow": eyebrow, "lede": lede, "title": title,
                "facts": [{"label": lab, "lines": _fact_lines(h), "text": t} for lab, h, t in facts],
                "fixed": [t for _h, t in fixed]}
    picture = bool(card_url and pic)
    inner = []
    if top_html is not None:
        inner.append(top_html)
    elif picture:
        pass      # the picture is its own row of the card, below
    else:
        head = ""
        if eyebrow and theme == "matte":
            # THE HOST'S OWN EMAILS WEAR THE APP'S LOOK (owner, 11/28/2026; UX_12:
            # no eyebrows): news in the label ("One week to go") is a plain line.
            head += f'<div style="font:500 14px/1.4 {SANS};color:{sub};">{e(eyebrow)}</div>'
        elif eyebrow:
            head += (f'<div style="font:800 11px/1 {SANS};letter-spacing:.18em;text-transform:uppercase;'
                     f'color:{hue};">{e(eyebrow)}</div>')
        if lede:
            head += f'<div style="margin:14px 0 0;font:500 14px/1.4 {SANS};color:{sub};">{e(lede)}</div>'
        if title and theme == "matte":
            head += (f'<div style="margin:6px 0 0;font:800 30px/1.15 {SANS};letter-spacing:-.02em;'
                     f'color:{ink};">{e(title)}</div>')
        elif title:
            head += f'<div style="margin:6px 0 0;font:700 30px/1.15 {SERIF};color:{ink};">{e(title)}</div>'
        if facts:
            head += _facts_html(facts, label, t)
        if head:
            inner.append(head)
    for b_html, _t in (blocks if picture else (*fixed, *blocks)):
        inner.append(f'<div style="margin:18px 0 0;text-align:left;font:400 15px/1.6 {SANS};color:{ink};">{b_html}</div>')
    if primary:
        inner.append(f'<a href="{e(primary[1])}" style="display:block;margin:22px 0 0;background:{t["button"] or hue};color:{t["on_button"]};'
                     f'text-decoration:none;border-radius:12px;font:700 16px/1.2 {SANS};padding:16px 10px;">{e(primary[0])}</a>')
    if secondary:
        if secondary_label:
            inner.append(f'<div style="margin:18px 0 2px;font:500 13px/1.4 {SANS};color:{sub};">{e(secondary_label)}</div>')
        width = "32%" if len(secondary) >= 3 else ("49%" if len(secondary) == 2 else "100%")
        cells = "".join(_pick(lab, u, width, t) for lab, u in secondary)
        inner.append(f'<table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>{cells}</tr></table>')
    if fine:
        inner.append(f'<p style="margin:12px 0 0;font:500 12.5px/1.5 {SANS};color:{sub};">{e(fine)}</p>')
    card = "\n  ".join(inner)

    hi = (f'<p style="max-width:520px;margin:0 auto 12px;font:500 15px/1.5 {SANS};color:{ink};">{e(greeting)}</p>'
          if greeting else '')
    note = (f'<div style="max-width:520px;margin:16px auto 0;padding:0 4px;">{label_html(note_label or "", label, theme == "matte")}'
            f'<div style="font:400 15px/1.6 {SANS};color:{ink};">{note_html}</div></div>' if note_html else '')
    foot = t["foot"]
    stop = f' <a href="{e(stop_url)}" style="color:{foot};">{e(stop_label)}</a>.' if stop_url else ''
    # The paper card carries its picture as a background (and the cream when
    # images are off); the matte card is its own flat color.
    bg = f'background="{e(t["image"])}" ' if t["image"] else ""
    if picture:
        # THE PICTURE IS THE TOP OF THE CARD (11/20/2026: an inset picture read
        # as a photo pasted on paper). Edge to edge, the card's own corners on
        # top, no border of its own; the live part continues below on the same
        # paper, laid from the card's top at the card's width (`top / 100%`), so
        # the paper under the picture is the very rows the picture shows, and
        # there is no seam. Matte is one flat color either way.
        radius = "17px 17px 0 0" if inner else "17px"      # the card's 18px, inside its 1px border
        img = (f'<img src="{e(card_url)}" width="518" alt="{e(card_alt(pic))}" '
               f'style="display:block;width:100%;height:auto;border:0;border-radius:{radius};">')
        top = (f'<a href="{e(primary[1])}" style="display:block;text-decoration:none;">{img}</a>'
               if primary else img)
        rows = f'<tr><td style="padding:0;line-height:0;font-size:0;">{top}</td></tr>'
        if inner:
            rows += f'\n<tr><td style="padding:0 22px 24px;text-align:center;">\n  {card}\n</td></tr>'
        mark = t["mark_picture"]
    else:
        rows = f'<tr><td style="padding:{pad};text-align:center;">\n  {card}\n</td></tr>'
        mark = t["mark"]
    html = f"""{LIGHT_ONLY}<div style="background:{t["page"]};padding:24px 12px;">
{hi}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" {bg}bgcolor="{t["card"]}" style="max-width:520px;margin:0 auto;{mark}">
{rows}</table>
{note}
<p style="max-width:520px;margin:18px auto 0;text-align:center;font:500 12px/1.5 {SANS};color:{foot};">{e(footer)}{stop}</p>
</div>"""

    lines = [greeting or "", ""]
    if eyebrow:
        lines.append(eyebrow if theme == "matte" else eyebrow.upper())
    if text_title or title:
        lines.append(text_title or title)
    lines.append("")
    for lab, _h, val in facts:
        lines.append(f"{lab}: {val}")
    lines.append("")
    for _h, t in (*fixed, *blocks):
        lines += [t, ""]
    if primary:
        lines += [f"{primary[0]}: {primary[1]}", ""]
    if secondary and secondary_in_text:
        lines += [f"{t}: {_html.unescape(u)}" for t, u in secondary] + [""]
    if fine and fine_in_text:
        lines += [fine, ""]
    # No words, no heading: an empty note printed a bare "A note from Vida:" (E P2-5).
    if any(str(x).strip() for x in note_text_lines):
        lines += [f"{note_label}:", *note_text_lines, ""]
    lines.append(footer)
    if stop_url:
        lines.append(f"{stop_label}: {stop_url}")
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    out = Framed(html)
    out.card = None if card_url else pic
    out._kw = kw
    return out, text


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
