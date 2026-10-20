# PEOPLE — VISUAL PARITY WORKING DOC

**Not a report. The delta map the parity loop runs against.**
Reference sheets held (review-only, gitignored):
`review-artifacts/_fixtures/reference/` — `ref-place-responsive`,
`ref-team-responsive`, `ref-place-journey`.

**Held: 3 of the 16 sheets supplied. None of them is a People sheet.**
`ref-team-responsive` (Vendors / "Build your team") is the structural analogue —
a roster of people with status pills, a stat rail and a recommendation band — so
the grammar transfers directly. `ref-place-journey` carries six states at three
breakpoints, which is what makes the macro system unambiguous rather than a
guess from one frame.

---

## 1 · MEASURED FROM THE REFERENCE

Proportions, read off the sheets and normalised to real viewports.

### Desktop (sheet frame ≈ 950×810 → 1440×1024)

| Band | Reference | Normalised |
|---|---|---|
| Top nav | 5.7% | ~58px |
| **Photographic hero** (photo + statement overlaid left) | **26%** | **~265px** |
| Stepper / orientation band | 5.5% | ~56px |
| **Operational field** | **~63%** | the rest |
| Content margins | 3.4% | ~32px each side |
| List / rail split | 56% / 23% | ≈ **70 / 30** of content width |
| Row height | 60/810 | **~76px**, with a ~56px media tile |

### Mobile (phone frame ≈ 230×770 → 390×844)

| Band | Reference | Normalised |
|---|---|---|
| Top bar | — | ~51px |
| **Photograph only** | ~10% | **~127px** |
| Statement block (eyebrow + serif + deck) on the SAME dark ground | ~12% | ~161px |
| **Dark plate total** | **~34%** | **~288px** |
| Stepper | — | ~68px |
| Section header | — | ~48px |
| Row | — | ~85px |

---

## 2 · THE MACRO SYSTEM, STATED

Every one of the nine frames across the three sheets is the same thing:

```
DARK TOP NAV
      ↓
DARK PHOTOGRAPHIC PLATE      eyebrow · serif statement · deck
      ↓   (hard edge, no dissolve)
IVORY OPERATIONAL FIELD      stepper · section header · cards · rail · CTA band
```

The product is an **editorial masthead over a light body**. The dark plate is
not "the hero in dark mode" — it is dark in every frame, and the operational
field is ivory in every frame. That relationship is the thing that makes the
reference read as a magazine rather than an application, and it is the single
largest delta against the current implementation.

---

## 3 · DELTA MAP — RANKED BY IMPACT

### P0 · MACRO COMPOSITION

| # | Delta | Current | Reference |
|---|---|---|---|
| 1 | **One surface, no plate** | the whole sheet takes the theme background; the hero dissolves into it | a dark plate with a hard edge, then a distinct operational field |
| 2 | **Hero 2.5× too tall on mobile** | 38vh ≈ 321px of photograph, statement over it | ~127px of photograph, statement BELOW it on the dark ground; 288px total |
| 3 | **Statement placement** | over the photo at every width | mobile: under the photo on dark · desktop: overlaid LEFT with a left-to-right gradient — a composition that transforms, not shrinks |
| 4 | **Operational content below the fold** | first viewport is photo + statement + deck | first viewport reaches the section header and the first rows |

### P1 · ROW AND SECTION GRAMMAR

| # | Delta | Current | Reference |
|---|---|---|---|
| 5 | Row shape | flat hairline rows, 32px circular initials | **bordered cards**, ~76px, **~56px rounded-rect media**, 8px gaps |
| 6 | Row name type | sans 600 | **serif** |
| 7 | Row affordance | 10px `▾` caret | **circular arrow button** |
| 8 | Section header | none | **serif H2 left + action button right** |
| 9 | One Move | no glyph, no eyebrow, left rule, CTA under | **✦ glyph + eyebrow + title + one line, CTA right-aligned in the same band** |
| 10 | Detail panel | a stack of controls | person first, then editing |

### P2 · POLISH
Type scale, border opacity, micro-spacing. **Not touched until P0 and P1 land.**

---

## 4 · THE ONE CONFLICT, STATED NOT RESOLVED

The reference's operational field is **ivory in every frame**, including the
frames whose chrome is dark. There is no dark-body variant in the set.

Production doctrine is a tokenized light/dark theme, and the owner has ruled
twice: *"Do not force warm ivory light surfaces"* (2026-10-20) and *"warmer
light neutral is the preferred direction… do not change production doctrine
until the evidence is complete"*.

**Reconciliation taken, and it is deliberately the narrow one:** the dark plate
is dark in BOTH themes, because it is a photographic surface with its own
luminance regime and the reference is unambiguous about it. The operational
field keeps the theme's own surface — which in light mode is Variant C's warm
neutral, i.e. the reference's relationship, and in dark mode is a coherent dark
body the reference does not show.

**Consequence for review: LIGHT MODE is the mode that should be judged against
these sheets.** Most of the evidence so far has been dark, which is the mode the
reference never shows.
