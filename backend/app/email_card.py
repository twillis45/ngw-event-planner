"""The CARD of a framed email, drawn as a picture (owner, 11/20/2026: "Do
picture for all emails").

A mail app in dark mode (Spark, the Gmail app) recolors an email's HTML but
never a picture. The invite email already leads with a picture of the host's
card (invite_cards.py); this draws the same kind of picture, on the server, for
every other email the app sends: the eyebrow in the event's hue, the title in a
serif, the When / Where facts with their labels and hairlines, and the email's
short fixed copy (a helper's job list, the week-before line). What a picture
cannot carry stays live HTML under it (email_frame.frame): the buttons, the
host's own words, the footer and the stop link.

HOW IT LOOKS is the client's drawing (hostv2/src/inviteCardImage.js): the
invite page's paper, Playfair Display for the name, small uppercase labels in
the hue. Not the page's letterpress: at email size its shadows read as doubled
text, so every string is drawn once, flat (11/20/2026). The facts are laid out as the email's own HTML card
lays them out (email_frame._facts_html): side by side between hairlines.

DRAW_CARD IS PURE: the same card gives the same bytes, and it needs no network.
The paper and the fonts are bundled beside this file:
  assets/paper-cream.jpg        a copy of hostv2/public/email/paper-cream.jpg
                                (the linen grain multiplied over the cream, the
                                paper the HTML card shows), 1040 x 1400.
  fonts/PlayfairDisplay-wght.ttf  Playfair Display, variable weight. SIL Open
                                Font License 1.1 (fonts/OFL-PlayfairDisplay.txt;
                                Reserved Font Name "Playfair Display", so the
                                file is bundled unmodified). From
                                github.com/google/fonts ofl/playfairdisplay/
                                PlayfairDisplay[wght].ttf, fetched 11/20/2026,
                                sha256 c40f2293…d8d6; renamed on disk only.
  fonts/Inter-opsz-wght.ttf     Inter, variable optical size and weight. SIL
                                Open Font License 1.1 (fonts/OFL-Inter.txt).
                                From github.com/google/fonts ofl/inter/
                                Inter[opsz,wght].ttf, fetched 11/20/2026,
                                sha256 29160a80…9031; renamed on disk only.
Text is laid out with Pillow's BASIC engine, so a server with or without
libraqm draws the same picture.

TWO THEMES (email_frame.THEME_FOR picks one per email): "paper", above, and
"matte", the host app's Studio Matte: its flat charcoal card, hairlines and
text from the app's own tokens (email_frame.MATTE_*), labels in --ink-soft,
the accent rule in --steel, the eyebrow in the app's hue. Playfair Display only for the plan's name.

card (built by email_frame.frame):
  {"theme": "paper"|"matte", "hue": "#B84E1E", "eyebrow": str|None, "lede": str|None, "title": str|None,
   "facts": [{"label": "When", "lines": [[text, is_sub], ...], "text": str}],
   "fixed": [str, ...]}
"""
import functools
import io
import pathlib

from PIL import Image, ImageDraw, ImageFont

from .email_frame import (INK, LINE, MATTE_CARD, MATTE_INK, MATTE_LINE, MATTE_MUTED, MATTE_SOFT,
                          MATTE_STEEL, SUB)

HERE = pathlib.Path(__file__).resolve().parent
PAPER_FILE = HERE / "assets" / "paper-cream.jpg"
SERIF_FILE = HERE / "fonts" / "PlayfairDisplay-wght.ttf"
SANS_FILE = HERE / "fonts" / "Inter-opsz-wght.ttf"

W = 520          # the email's card width, in CSS px
S = 2            # drawn at 2x: 1040 px wide
PADX = 28
JPEG_QUALITY = 92


@functools.lru_cache(maxsize=32)
def _font(kind: str, size: float, weight: int):
    """A font at a size in CSS px (drawn at S x). Variable fonts, set by axis."""
    px = round(size * S)
    if kind == "serif":
        f = ImageFont.truetype(str(SERIF_FILE), px, layout_engine=ImageFont.Layout.BASIC)
        f.set_variation_by_axes([weight])
    else:
        f = ImageFont.truetype(str(SANS_FILE), px, layout_engine=ImageFont.Layout.BASIC)
        f.set_variation_by_axes([min(32, max(14, size)), weight])   # optical size, weight
    return f


def _rgb(hex_color: str):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _spaced_width(font, text: str, spacing: float) -> float:
    return sum(font.getlength(ch) + spacing for ch in text) - (spacing if text else 0)


def _wrap(font, text: str, max_px: float) -> list:
    words = str(text or "").split()
    lines, cur = [], ""
    for w in words:
        t = f"{cur} {w}" if cur else w
        if font.getlength(t) / S <= max_px or not cur:      # the font is at S x; max_px is CSS px
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# NO LETTERPRESS. The first cut drew the invite page's text-shadows (a light
# copy below each line, a brown one above, blurred); at email size they read as
# smeared, doubled text next to the crisp live HTML under the picture (11/20/2026).
# Every string is now drawn once, flat, at exactly 2x.

COLORS = {
    "paper": {"ink": INK, "sub": SUB, "line": LINE, "label": None, "rule": None, "card": None},
    "matte": {"ink": MATTE_INK, "sub": MATTE_MUTED, "line": MATTE_LINE, "label": MATTE_SOFT, "rule": MATTE_STEEL,
              "card": MATTE_CARD},
}


def _plan(card: dict):
    """The layout, in CSS px: a list of ops and the card's height."""
    ops = []
    inner = W - PADX * 2
    y = 30.0
    eyebrow = str(card.get("eyebrow") or "").strip()
    lede = str(card.get("lede") or "").strip()
    title = str(card.get("title") or "").strip()
    matte = card.get("theme") == "matte"
    if eyebrow and matte:
        # The host's own emails (owner, 11/28/2026): no eyebrow; its news is a plain line.
        f = _font("sans", 14, 500)
        for line in _wrap(f, eyebrow, inner):
            y += 19.6
            ops.append(("center", line, y - 5, f, "sub"))
        y -= 10
    elif eyebrow:
        f = _font("sans", 11, 800)
        text = eyebrow.upper()
        sp = 11 * 0.18
        # A long eyebrow ("Casey Rivera answered your question") wraps rather than runs off.
        for line in _wrap_spaced(f, text, sp, inner):
            ops.append(("spaced", line, y + 9, f, sp, "hue"))
            y += 17
        y -= 6
    if lede:
        y += 14
        f = _font("sans", 14, 500)
        for line in _wrap(f, lede, inner):
            y += 19.6
            ops.append(("center", line, y - 5, f, "sub"))
    if title:
        y += 8 if (eyebrow or lede) else 0
        f = _font("sans", 32, 800) if matte else _font("serif", 34, 700)
        for line in _wrap(f, title, inner):
            y += 34 * 1.15
            ops.append(("center", line, y - 9, f, "ink"))
    facts = list(card.get("facts") or [])
    if facts:
        y += 20
        top = y
        ops.append(("hline", top))
        cell_w = inner / len(facts)
        bottom = top
        for i, fact in enumerate(facts):
            cx = PADX + cell_w * i + cell_w / 2
            cy = top + 14
            if matte:   # sentence case, like the app's labels
                lf = _font("sans", 13, 600)
                ops.append(("spaced_at", str(fact.get("label") or ""), cx, cy + 8.5, lf, 0))
            else:
                lf = _font("sans", 10.5, 800)
                ops.append(("spaced_at", str(fact.get("label") or "").upper(), cx, cy + 8.5, lf, 10.5 * 0.16))
            cy += 10.5 + 6
            for text, is_sub in fact.get("lines") or []:
                vf = _font("sans", 14.5, 500 if is_sub else 600)
                for line in _wrap(vf, text, cell_w - 12):
                    cy += 20.3
                    ops.append(("at", line, cx, cy - 5.5, vf, "sub" if is_sub else "ink"))
            bottom = max(bottom, cy + 14)
        for i in range(1, len(facts)):
            ops.append(("vline", PADX + cell_w * i, top, bottom))
        ops.append(("hline", bottom))
        y = bottom
    elif title:
        y += 16
        ops.append(("rule", y))
        y += 2
    bf = _font("sans", 15, 400)
    for block in card.get("fixed") or []:
        y += 18                                   # the block's top margin, as in the HTML card
        for para in str(block or "").replace("\r", "").split("\n"):
            if not para.strip():
                y += 12
                continue
            for line in _wrap(bf, para, inner):
                ops.append(("left", line, PADX, y + 17, bf, "ink"))
                y += 24                           # 15 px at a 1.6 line height
    return ops, int(round(y + 26))


def _wrap_spaced(font, text: str, spacing: float, max_px: float) -> list:
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = f"{cur} {w}" if cur else w
        if _spaced_width(font, t, spacing * S) / S <= max_px or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _surface(theme: str, h_px: int) -> Image.Image:
    if theme == "matte":
        return Image.new("RGB", (W * S, h_px), _rgb(MATTE_CARD))
    return _paper(h_px)


def _paper(h_px: int) -> Image.Image:
    """The paper at the card's size: cut from the top of paper-cream.jpg (the
    light falls where it falls on the page), scaled to cover when taller."""
    src = Image.open(PAPER_FILE).convert("RGB")
    w_px = W * S
    if h_px > src.height:
        k = h_px / src.height
        src = src.resize((round(src.width * k), h_px), Image.LANCZOS)
        left = (src.width - w_px) // 2
        src = src.crop((left, 0, left + w_px, h_px))
    else:
        src = src.crop((0, 0, w_px, h_px))
    return src


def draw_card(card: dict) -> bytes:
    """The card as a JPEG, 1040 px wide, as tall as its contents. Pure."""
    theme = "matte" if card.get("theme") == "matte" else "paper"
    pal = COLORS[theme]
    ops, h = _plan(card)
    h_px = h * S
    base = _surface(theme, h_px).convert("RGBA")
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ink)
    hue = _rgb(str(card.get("hue") or "#B84E1E"))
    label = _rgb(pal["label"]) if pal["label"] else hue
    line = _rgb(pal["line"])
    rule = _rgb(pal["rule"]) if pal["rule"] else hue

    def text_at(x, y, s, font, color):
        # Once, at whole device pixels: no shadow, no second pass, no scaling.
        color = _rgb(pal[color]) if isinstance(color, str) else color
        d.text((round(x * S), round(y * S)), s, font=font, fill=color, anchor="ls")

    def spaced(cx, y, s, font, sp, color):
        x = cx - _spaced_width(font, s, sp * S) / S / 2
        for ch in s:
            text_at(x, y, ch, font, color)
            x += (font.getlength(ch) + sp * S) / S

    for op in ops:
        k = op[0]
        if k == "spaced":
            spaced(W / 2, op[2], op[1], op[3], op[4], hue)
        elif k == "spaced_at":
            spaced(op[2], op[3], op[1], op[4], op[5], label)
        elif k == "center":
            _k, s, y, font, color = op
            text_at(W / 2 - font.getlength(s) / S / 2, y, s, font, color)
        elif k == "at":
            _k, s, cx, y, font, color = op
            text_at(cx - font.getlength(s) / S / 2, y, s, font, color)
        elif k == "left":
            _k, s, x, y, font, color = op
            text_at(x, y, s, font, color)
        elif k == "hline":
            d.rectangle([PADX * S, op[1] * S, (W - PADX) * S - 1, op[1] * S + S - 1], fill=line)
        elif k == "vline":
            d.rectangle([op[1] * S, op[2] * S, op[1] * S + S - 1, op[3] * S], fill=line)
        elif k == "rule":
            d.rectangle([(W / 2 - 22) * S, op[1] * S, (W / 2 + 22) * S - 1, (op[1] + 2) * S - 1], fill=rule)
    # No edge of its own: the picture IS the top of the email's card (email_frame
    # puts it edge to edge), so a stroke here would be a frame inside the frame.
    out = Image.alpha_composite(base, ink).convert("RGB")
    buf = io.BytesIO()
    # 4:4:4: no chroma subsampling, which smears thin colored text (the hue's labels).
    out.save(buf, "JPEG", quality=JPEG_QUALITY, subsampling=0, optimize=True)
    return buf.getvalue()
