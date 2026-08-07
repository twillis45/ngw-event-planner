# Where our command-board rules stop working — 2026-08-07

Host, in Chrome: *"definitely doesn't look like a command center."* Correct. Four
of our own rules are the reason, and three of them are rules that are RIGHT on a
phone and were never given a desktop clause.

Measured on the host's own machine (Chrome, 1280x800 display, inner viewport
**1280x654**) and headless at 1440x900 / 1920x1080. Leaders read from Mobbin:
[Railway](https://mobbin.com/screens/3af70f9f-c560-4a42-a15c-cbd12db09c73),
[ClickUp](https://mobbin.com/screens/2802e4dc-5a33-4b61-b556-7008bffeeb2f),
[Asana](https://mobbin.com/screens/4977138b-43d5-41fa-a844-7a583b31aaab),
[Airtable](https://mobbin.com/screens/5074a5c3-b4e3-4f0d-839c-e3c89793b199),
[Plane](https://mobbin.com/screens/0dd9ff7e-b7b6-4ec1-9bd2-9e403fc687ec).

---

## 1. UX_04 Zone 1 assumes a short text title. On Event Command the title IS the ask.

> "Title on the left, stat cards on the right (desktop)." — UX_04, Zone 1

That rule was written for **Events (L2)** and **Vendor Detail (L4)**, where the
title is a 20-24px text label with room beside it. On **Event Command (L3)** the
top element is a 60px display headline — "Sort where everyone stays." — which is
Zone 1's title AND Zone 2's priority ask **in the same element**.

Stat cards placed to its right become a tall narrow column that cannot fill.
Measured after the re-zone landed: 288x246 of content sitting in a 288x640
column. **61% of the stat column is empty**, and the emptiness is a single
unbroken band, which is the worst shape for it.

**No leader does this.** Every one of the five above runs stat cards as a
HORIZONTAL row of 3-4 across the full canvas width. Railway — closest to our dark
aesthetic — uses a 2x3 tile grid across the top, then panels beneath it.

**Proposed amendment.** UX_04 Zone 1 gains a clause: *when the surface's title
is a display-type ask rather than a text label, stat cards run as a horizontal
row beneath the eyebrow and above the ask — never as a vertical column beside
it.* Vertical stat columns are legal only where the title is a text label.

---

## 2. UX_01's void budget is proportional. It has to be absolute.

> one loud thing per screen, ~45% void

That budget was set on a 393x852 phone: about **150,000 px²** of deliberate
emptiness, and at that size it reads as composure.

The same 45% is:

| viewport | void at 45% | vs the phone |
|---|---|---|
| 393x852 (phone) | ~150,000 px² | 1.0x |
| 1280x654 (host's laptop) | ~377,000 px² | **2.5x** |
| 1920x1080 (wide) | ~933,000 px² | **6.2x** |

Emptiness does not scale as a feeling. Six times the void is not six times the
calm — it is an unfinished page. This is the single biggest reason the surface
reads as a stretched phone even after the columns were fixed.

**Proposed amendment.** State the void budget in absolute terms, not as a
percentage: *no single empty band taller than ~200px at desktop, and the void
budget stops growing above the phone tier.* Percentage stays for phone only.

---

## 3. UX_03 has one desktop band. There are three, and height is missing entirely.

UX_03's pattern library ends at "Desktop (>= 1280px)". Three problems:

1. **1280x654 is not 1920x1080.** At 654px inner height the whole composition
   must land inside ~620px of usable canvas; at 1080 there is room for a third
   zone. One rule cannot serve both.
2. **Height is not a doctrine axis at all** — and it is load-bearing in the
   stylesheet, where every desktop rule is `@media (min-width:1280px) and
   (min-height:700px)`.
3. **The host's own laptop fails that height test.** 654 < 700.

That mismatch — `showsRail()` is width-only (`isWideBp`, >=1280) while the CSS
is width AND height — is the single root cause of four defects fixed in
`8a4d4556`, including two that earlier sessions chased and could not place. The
headless matrix never saw any of them because it runs 1440x900 and 1920x1080,
where the height condition passes.

**Proposed amendment.** Add a `wide` tier (>=1600) and make height an explicit
axis with a `short-desktop` case (>=1280 wide, <700 tall) — which is the
COMMON laptop, not an edge case. Then bring `showsRail()` and the stylesheet
onto one gate.

---

## 4. Nothing in doctrine says a surface must fill its canvas.

UX_04's anti-patterns are all about too much or mis-ordered content — equal-weight
card wall, stats without context, scroll-to-find-action, filter-heavy/content-light,
double header, ghost zone. **Not one is about too little.**

Yet the defining property of every leader screen above is that every horizontal
band carries something. Ours, at 1280x654 after the fixes: a ~130px empty band
between the CTA and the progress rule, and a ~450px empty column on the right.

Density, ours vs theirs, on the working list:

| | rows visible |
|---|---|
| ClickUp / Asana / Airtable / Wrike | 8-20 |
| Event Boss "Then, in order" + "Worth keeping an eye on" | **2 + 2** |

**Proposed amendment.** Add to UX_04's anti-pattern list: *"**Abandoned canvas** —
any band 200px or taller carrying no content at desktop. If a zone has nothing to
say, the zones below it move up; empty space is not a layout."* And a density
floor for Zone 3 at desktop.

---

## What this does NOT mean

Not "make it dense like ClickUp." The elegant hero is right, and it is the thing
that makes this product feel unlike a CRM template. The claim is narrower:

**Every rule that produces the hero was written on a phone, and none of them was
given a desktop clause.** The hero should keep its authority and stop being the
only thing on a 1280-wide canvas.

---

## Status

Fixed and driven in the host's Chrome (`8a4d4556`): the three-column re-zone,
the reference-row measure cap, the orphaned fold handle, and the stranded
progress rule.

Open, and needing a board ruling before any of it is built:

1. Stat cards from the right column to a top row (§1).
2. The absolute void budget (§2).
3. The `wide` tier + `short-desktop` case, and one gate for rail and CSS (§3).
4. The abandoned-canvas anti-pattern and a Zone 3 density floor (§4).
