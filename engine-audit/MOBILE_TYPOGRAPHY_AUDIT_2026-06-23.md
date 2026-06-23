# Mobile Typography — Review Board Audit & Rethink
**Date:** 2026-06-23 · **Lens:** mobile font excellence (390px phone) · **Board:** Wroblewski (mobile-first, lead) · Tufte (density) · Rams / Ive (restraint) · Kare (legibility at size) · Norman (ergonomics/accessibility) · Zhuo (product) · Saarinen (form)
**Method:** render-first at 390px + a full census of inline `fontSize` values.

---

## The evidence (not opinion)

**Census — every inline `fontSize` in App.js + plan/\*:**

| px | count | | px | count |
|---|---|---|---|---|
| 7.5 | 4 | | 11.5 | 110 |
| 8 | 17 | | **12** | **533** |
| 8.5 | 7 | | 12.5 | 116 |
| **9** | **94** | | 13 | 352 |
| 9.5 | 49 | | 13.5 | 53 |
| **10** | **342** | | 14 | 145 |
| 10.5 | 120 | | 15 | 65 |
| **11** | **716** | | 16 | 69 |

- **~1,460 text occurrences are below 12px.** The single most common size in the entire app is **11px (716×)**, with **10px (342×)** close behind. The workhorse of this UI is 10–11px micro-type.
- **~20 distinct sizes** between 7.5 and 16px — a type *sprawl*, not a *scale*. (7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15…)
- **They're fixed px.** Mobile inherits desktop's sizes. Phones need a *larger* floor than desktop, and get the same — or, via dense surfaces, worse.
- **On a 390px phone, the clean Overview alone renders 6 nodes at 9px and 14 at 12px.** The shopping-list modal: 6 @ 9px, 16 @ 12px — the intro paragraph and the textarea body crammed at 11–13px.

**Render reality (390px):** the eyebrows ("YOUR NEXT STEP", "READY TO SHARE", "WHAT STILL NEEDS YOU") are **9px** uppercase + letter-spacing — a genuine strain at arm's length. Secondary lines ("Just so you know…", "20 items to grab…", the dated row meta, "by Jun 25") sit at **11–12px**. The hero is fine; everything beneath it collapses into small gray. The screen reads as **one big thing + a wall of fine print.**

**Reference floor:** Apple HIG body is 17px; the practical accessible minimum for secondary text is ~13–14px on mobile, with ~11–12px reserved for true micro-labels used sparingly. This app inverts that — micro sizes are the *default*, not the exception.

---

## Board verdict (ruthless)

> **Wroblewski (mobile-first):** "This is a desktop dashboard shrunk to a phone. Mobile-first means the *content* sets the size and the thumb sets the target — here a 9px label is neither readable nor tappable. You designed the dense case and let the phone inherit it. Invert it: design the phone, let the desktop breathe."

> **Tufte:** "Density is a virtue only when every mark is legible. 11px gray-on-near-black at 390px is not data-ink — it's data-fog. You've maximized ink and minimized information."

> **Kare:** "Letterforms have a floor. Uppercase + letter-spacing at 9px destroys the word-shapes the eye reads by. Your eyebrows are decoration the user must decode, not labels they can glance."

> **Rams / Ive:** "Less, but better — you have *more* sizes (twenty) and *worse* legibility. A system has few sizes, each earning its step. This is twenty exceptions and no rule."

> **Norman:** "At 9–11px you've designed out the over-40 user and the one-handed-on-the-train user — i.e., the host. Ergonomically this fails the people it's for. The Grandmother test fails on contact."

> **Zhuo:** "The hierarchy is binary: hero, then fine print. Real hierarchy has a readable middle. Your secondary text is too small to be read and too present to be ignored — the worst of both."

**Consensus: this is the app's biggest unaddressed quality gap, and it is systemic, not cosmetic.** Score against bless=10: **Mobile typography 3/10.**

---

## Diagnosis — three root causes

1. **No type scale.** Sizes are chosen inline, per-element, by eye. 20 sizes is the symptom; the cause is that there's no token system, so every author reaches for "11ish."
2. **Desktop-density habit on a phone.** The 9px eyebrow + 11px meta is a dense-cockpit pattern. It was never re-thought for the phone; `isMobile` conditionals exist but mostly tweak layout, not type.
3. **px, not a responsive unit.** Fixed px can't bump on mobile without touching every site, so nobody does — the tiny sizes calcify.

---

## The rethink — a mobile type system

**Principle:** the phone is the design target. Establish ONE scale, with a real mobile floor, mobile-aware by construction.

**A 6-step scale (mobile / desktop):**

| token | role | mobile | desktop |
|---|---|---|---|
| `display` | the one hero number/headline | 26 | 30 |
| `title` | card/section title | 19 | 20 |
| `body` | the readable default — **the new workhorse** | 16 | 15 |
| `secondary` | supporting copy, row meta | 14 | 13 |
| `caption` | timestamps, small meta | 13 | 12 |
| `eyebrow` | uppercase labels (used sparingly) | 12 | 11 |

**Hard rules:**
- **Mobile floor = 12px. Nothing below it.** The 7.5–11px band is deleted on mobile.
- **The default is `body` (16 mobile).** If text matters enough to show, it's ≥14. Micro-caps (`eyebrow`) are the *only* thing at 12, and they shrink in number.
- **Eyebrows lose the 9px crutch.** Many become weight+color hierarchy instead of micro-caps; the survivors render at 12 mobile.
- **One scale, ~6 sizes.** Kill the 20-size sprawl.

**Implementation (the honest part — ~2,000 inline sites can't be hand-edited):**
1. **Add the scale to `design/tokens.js`** as a mobile-aware resolver: `const T = useType()` → `T.body`, `T.eyebrow`, … returning the right px for the current breakpoint. (Hooks into the existing `BpCtx`/`useT`.)
2. **Codemod the dominant clusters** with a mapping (9/9.5→eyebrow, 10/10.5→caption, 11/11.5→secondary, 12/12.5→secondary-or-body) so the bulk moves in one pass, then hand-tune the heroes.
3. **Migrate highest-traffic surfaces first**, render-verified at 390px: Home → Plan → Budget → The Day → Guests → the create flow + reveal.
4. **Guardrail:** a lint/grep check that fails on any raw `fontSize` below the mobile floor. No new micro-type.

**Fast first win (1 surface, high signal):** ship the scale + migrate the **Home/Overview** to it — eyebrows 9→12, meta 11→14, secondary 12→16 on mobile — and screenshot before/after at 390px for the board. Proves the system before the full sweep.

---

## Scores & next step

- **Mobile typography today: 3/10.** Systemic, the biggest quality gap in the app.
- **Effort to fix right: medium-high** (a real migration, but codemoddable).
- **Trust/quality impact: very high** — this is the difference between "feels like a premium tool" and "feels like a cramped spreadsheet" on the device the host actually uses.

**Build next:** the `useType()` scale in tokens.js + migrate the Overview to it, render-verified at 390px. Then sweep surface-by-surface with the codemod. Guardrail to stop regression.
