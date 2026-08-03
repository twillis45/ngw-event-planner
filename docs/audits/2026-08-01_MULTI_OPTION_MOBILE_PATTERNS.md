# Multi-Option on Mobile — container patterns, grid specs, and mocks for Event Boss

> **Portable version.** This is the full content of the interactive artifact
> https://claude.ai/code/artifact/e7d74073-17a0-48d0-94aa-f1b4160e20f9 rewritten as plain
> Markdown so it can be read outside claude.ai (ChatGPT, email, another editor). The artifact has
> live draggable demos; here those are ASCII. Nothing else is abridged.

Date: 2026-08-01 · Source: Mobbin (iOS), read 2026-08-01 · Plus blink.global mobile frames, driven live

**Problem this addresses:** variable-width pills laying out badly on a narrow screen — ragged
wrapping, unpredictable control height, and options that vanish past the right edge.

---

## 0 · Scope

Read for this study: Careem · Binance · Hyundai Card · komoot · Jobber · Nike · Zip · Crypto.com ·
Yubo · Formula 1 · foodpanda · Meta AI · Booking.com · Wise · Journal · Azar · Linktree ·
KakaoTalk — 18 apps. Plus blink.global's attendee app.

**Not claimed:** no hands-on with any of these products; no exact paddings or type sizes (Mobbin
re-renders at roughly a third of native width); the "nobody wraps" finding covers the screens read
here, not every screen those apps ship.

---

## 1 · The universal rule: nobody wraps

**Eighteen apps. Zero wrapped pill rows.** Every one either scrolls horizontally, escalates to a
bottom sheet, or converts to a grid.

Wrapping is the thing that looks like the obvious answer and is used by none of them.

### What breaks — wrapped pills

```
┌──────────────────────────────────────────┐
│ (All) (Needs a decision) (Vendors)       │
│ (Money) (Guests & RSVPs) (Travel)        │
│ (Where everyone stays) (Run of show)     │
└──────────────────────────────────────────┘
```
Ragged right edge · unpredictable height · the control reflows when the label set changes · a
two-line filter bar eats the fold.

### The same options, scrolled

```
┌──────────────────────────────────────────┐
│ (All)(Needs a decision)(Vendors)(Mone▓   │  ← clipped mid-pill
└──────────────────────────────────────────┘
   ↔ drag
```
One line · fixed height · **the clip at the right edge IS the affordance** that says there is more.
Mask the edge (`mask-image: linear-gradient(to right, #000 88%, transparent)`) so a pill is cut
rather than ending flush.

---

## 2 · The five containers — choose by count and axes, not taste

| Options | Axes | Container | Best in set |
|---|---|---|---|
| 2–4 | 1 | Segmented control / underline tabs — equal width, all visible | Nike, Zip |
| 5–8 | 1 | **Scrolling pill rail**, clipped right edge | Careem, Formula 1, KakaoTalk |
| 5–8 | 1, all must be reachable | Scrolling rail **+ a `⌄` expander** at the end | **Hyundai Card** |
| any | **2+** | **Stacked labelled rails** — one axis per row | **Binance** |
| 9+ | 1 | Bottom sheet, radio rows, **grouped with dividers** | **komoot** |
| 9+ visual | 1 | 2-column tile grid | blink.global, Crypto.com, Nike |

This is a decision function of `(count, axes)` — it can be derived rather than argued per surface.

---

## 3 · Binance — the best answer for multiple axes

Three dimensions of choice, stacked as three labelled rails. No modal, no wrapping, and every axis
shows its current value at a glance.

```
What needs you                    ← 11px muted label
(All)(Decisions)(Vendors)(Money)(Trav▓
                                   ↔
When
(Any time)(This week)(Before the day)(On th▓
                                   ↔
Standing
(All)(Open)(Waiting on someone)(Settl▓
                                   ↔
```

**Why it wins.** A single rail forces unrelated options onto one line, so the user must read every
pill to find the axis they care about. Splitting by axis means **each row is scanned once and
skipped** — and the muted label costs ~11px of height to remove that work entirely.

**Cost.** Vertical space: three axes ≈ 96px. Worth it above a long list, wasteful above a short one.

---

## 4 · Three more mechanisms

### Anchor the left — Careem, Jobber

A fixed icon-pill that does **not** scroll away, holding the overflow control and the count of
active filters. Everything else scrolls past it.

```
┌──────────────────────────────────────────┐
│ [⚙ 2]│(Needs a decision)(Vendors)(Mone▓  │
│  ↑ sticky, never scrolls                 │
└──────────────────────────────────────────┘
```
Always a route back to the full set, and it carries what is currently on.

### The `⌄` escape hatch — Hyundai Card ⭐

Scrolling rail **plus** a trailing expander. Solves the real complaint about rails — options past
the edge are effectively invisible — without giving up the single line.

```
(All)(Vendors)(Money)(Guests)(Travel)(⌄ All 9)
                                       ↑ dashed border
```
**The count in the expander is the honest part** — it says how much you cannot see, rather than
leaving it to be discovered by dragging.

### Grouped sheet for long lists — komoot ⭐

Past roughly nine options a rail stops working at any width. komoot groups by kind with a divider
and puts an *All …* row at the head of each group, so a broad pick never requires scrolling.

```
┌──────────────────────────────────────────┐
│ ● Everything                         (◉) │  ← selected: row tinted AND radio filled
│──────────────────────────────────────────│
│ PEOPLE                                   │
│   All guest items                    ( ) │
│   RSVPs                              ( ) │
│     2 still out                          │
│   Dietary needs                      ( ) │
│──────────────────────────────────────────│
│ MONEY                                    │
│   All money items                    ( ) │
│   Deposits due                       ( ) │
│   Who owes what                      ( ) │
└──────────────────────────────────────────┘
```

**Detail:** the radio sits **right**, the label **left** — every sheet in the set does this, and it
means the thumb reaches the control without covering the text it is choosing. Selected state is
row-tint **and** filled radio; never colour alone.

---

## 5 · What blink.global does — the sharpest lesson

Their mobile app has **no pill rail at all.** Eight browse categories become a 2-column tile grid;
the agenda is four rows; the tab bar is five icons. There is nothing to lay out badly because there
is almost nothing to lay out.

> **Before choosing a container, question the count.** A rail of nine filters is often a symptom
> that one list is doing the work of three surfaces — which is what our own density re-audit found.
> **The best pill layout is frequently four fewer pills.**

**Caveat:** Blink's option count is low because it is an attendee app with no obligations, not
because they solved a hard problem. Copy the restraint; the circumstances are not ours.

---

## 6 · Who is handling it best

| Situation | Winner | What they do |
|---|---|---|
| Several axes at once | **Binance** | Stacked labelled rails — the only app in the set solving multi-axis without a modal |
| More options than fit | **Hyundai Card** | Rail + trailing `⌄` expander carrying the hidden count |
| Long single list | **komoot** | Grouped sheet with an *All …* row per group |
| Active filters must stay visible | Jobber | Anchored icon-pill, removable ✕ per applied filter |
| Browse, not filter | blink.global, Nike | 2-col tile grid — equal sizes, ragged-proof by construction |
| 2–4 options | Nike | Underline tabs, equal width, no scroll |

---

## 7 · What Nike and blink.global actually use for grids

Read off captured screens. Proportions are relative — no pixel value is asserted.

| | Nike — "Experiences" | blink.global — "Explore" |
|---|---|---|
| Control above | Underline tabs — `All · Customisation · Running · Training`, scrollable, active = ink text + 2px underline | None. A section header only |
| Columns | 2, equal | 2, equal — **twice**: a featured pair, then a browse grid |
| Image ratio | ~4:3, rounded | ~4:3, rounded |
| **Text placement** | **Below the image, always** | **Both** — below for entities, overlaid for categories |
| Text block | Bold title (wraps to 3 lines) · muted date · muted address | Featured: muted category + `NAME UPPERCASE` below. Browse: single uppercase word on the image |
| Overlay badge | None | Featured only — a gold `★ 8.4` top-left |
| Row heights | Uneven — content-driven | Even — fixed tile height |

### The rule that separates them

Blink runs **two different grids on one screen** and switches on what the tile represents:

- an **entity** (THE GRAND HOTEL, GREEN MEADOWS PARK) → text **below** the image
- a **category** (CONFERENCE, MUSIC, EXPO) → single uppercase word **on** the image

**Overlay only survives when the label is one word you did not have to invent.** Our surface names
are sentences — *"Where everyone stays"*, *"Getting around"*, *"Food & shopping"* — so the overlay
branch is closed to us on every tile. Fitting them would mean inventing jargon (`STAYS`, `GROUND`),
which UX_06 forbids and which would undo naming work already shipped.

Second reason text-below wins: **no contrast problem.** Text-on-photo needs a scrim on every image
and can still fail WCAG against a bright one.

What Blink still wins: **equal-size tiles.** A grid is ragged-proof by construction — the layout
cannot break when a label changes length, which is the complaint that started this study.

---

## 8 · ⚠ The constraint that decides everything

Both leader grids are **photography-driven.** hostv2 ships exactly **two images** —
`crab-hero.png` and `catfish-hero.png` — and both are event-type heroes. **There is no per-section
artwork.**

- A literal port of either grid renders eight empty rectangles.
- Commissioning eight section photos collides with the existing artwork rule (event glyphs are real
  artwork, identical at every size). Section photography is a different asset class and a standing
  cost.

The four mocks below assume the real asset situation.

---

## 9 · Four mocks that work with what we have

All four use the same event — crab feast, 42 of 44 replied, Bayside deposit paid, lake house
committed at $1,394, 9 days out. **None needs a photograph.**

### A · Nike's shape, no photograph

```
 All | Needs you | Waiting | Settled          ← underline tabs, active=All
─────────────────────────────────────────
┌───────────────┐ ┌───────────────┐
│  ▒▒ ◍ ▒▒      │ │  ▒▒ ◈ ▒▒      │          ← tinted cap + glyph, no photo
│ Food &        │ │ Where everyone│
│ shopping      │ │ stays         │
│ Count due Fri │ │ Lake house ·  │
│ · Bayside     │ │ committed     │
└───────────────┘ └───────────────┘
┌───────────────┐ ┌───────────────┐
│  ▒▒ ◇ ▒▒      │ │  ▒▒ ◉ ▒▒      │
│ Getting around│ │ Guests & RSVPs│  ← 72% opacity when settled
│ 4 rides ·     │ │ 42 of 44      │
│ 2 unassigned  │ │ replied       │
└───────────────┘ └───────────────┘
```
The image band becomes a quiet tinted cap holding a glyph. Keeps Nike's rhythm, needs no assets.
Settled tiles drop to 72% opacity — **state without spending colour.**

### B · The state tile — number leads

```
┌───────────────┐ ┌───────────────┐
│ Fri           │ │ 42 / 44       │   ← 23px, tabular
│ Crab count due│ │ Replied       │
│ Bayside cutoff│ │ 2 still out   │
│ · 2 days      │ │               │
└───────────────┘ └───────────────┘
┌───────────────┐ ┌───────────────┐
│ $1,394        │ │ 4             │
│ Lake house    │ │ Rides         │
│ 3 nights ·    │ │ 2 unassigned  │
│ committed     │ │               │
└───────────────┘ └───────────────┘
```
Densest and most scannable — but it **inverts the hierarchy**: the number leads, the label follows.
Only honest where a number genuinely *is* the answer.

### C · Data instead of photography ⭐ recommended

```
┌───────────────┐ ┌───────────────┐
│ ▰▰▱▱          │ │ ◕  72%        │   ← segmented bar / ring
│ Run of show   │ │ Money         │
│ Doors is next │ │ $2,840 of     │
│ · 2 of 4 done │ │ $3,950        │
└───────────────┘ └───────────────┘
┌───────────────┐ ┌───────────────┐
│ ▰▰▰▱          │ │ ▰▰▰▰          │
│ Vendors       │ │ Where everyone│
│ 3 booked ·    │ │ stays         │
│ 1 awaiting    │ │ Committed ·   │
│ reply         │ │ backup held   │
└───────────────┘ └───────────────┘
```
**The missing photograph becomes an asset.** Every bar here is already computed — `dayPhases()`
returns `{total, done, state}`, plus planned/committed/spent and `raiseCounts`.

### D · Blink's featured split, honestly

```
┌─────────────────────────────────┐
│  9 DAYS OUT                     │   ← the one artwork we own
│  Crab feast · Saturday          │      (event glyph)
└─────────────────────────────────┘
┌───────────────┐ ┌───────────────┐
│ Food &        │ │ Guests &      │
│ shopping      │ │ RSVPs         │
│ Count due Fri │ │ 42 of 44      │
└───────────────┘ └───────────────┘
```
One hero using the *one* artwork we actually own, then unphotographed tiles beneath. Blink's
structure, our asset reality.

### Recommendation

**C, with A's tab row above it.** It solves the ragged problem structurally (equal tiles), needs no
new assets, and turns the constraint into the feature — a Sections directory where every door
states what it is holding. It also finally spends the infographic finding from the gap board, where
the note was that the data is already computed in six places and rendered in one.

**Caveat needing a ruling:** one small visual per tile is four visuals per screen, which presses on
the one-chart-per-surface rule. That rule was written for charts carrying a *number*; these carry a
*proportion* with the number in the line beneath. Decide before building, not in review.

### The honest problem with tile grids generally

Nike's and Blink's grids are **browse** surfaces. Nothing in either raises a count, and neither has
to say which tile needs you today. Our Sections directory does both — it is *"a door to EVERY
surface"* **and** it carries what each surface is raising.

Put a numeric badge on a tile and the grid stops being calm; leave it off and the directory stops
being useful.

**The resolution is the actual translation:** use Nike's two muted lines **as** the count.
*"4 rides · 2 unassigned"* says what a badge would, in the register we already use, without
spending a colour. The transferable idea is not the tile shape — it is **putting state in prose
beneath rather than a number on top.**

Placement: the **Sections directory**, which is browse-shaped by definition. Not the home fold,
where the ranked ask lives.

---

## 10 · A spec you could gate

1. **Never wrap a pill row.** A test asserting the filter container has `flex-wrap: nowrap` and one
   computed line-height of children makes this permanent.
2. **2–4 options → segmented control.** Equal widths, all visible, no scroll.
3. **5–8 on one axis → scrolling rail**, mask the right edge so it clips mid-pill. Never fade both
   ends unless both directions really have content.
4. **More than one axis → stack labelled rails.** One axis per row, 11px muted label above.
5. **9+ → grouped bottom sheet.** Radio right, label left, an *All …* row per group.
6. **Selected = filled** (`--steel`); unselected = outlined on `--band`. Never colour alone — the
   fill is the signal.
7. **If the rail exceeds 8, ask what to delete** before choosing a container.

Rules 2–5 are a single decision function of *(count, axes)*, so the container choice can be derived
rather than argued about per surface.

---

## Sources

Mobbin iOS, read 2026-08-01 — Careem, Binance, Hyundai Card, komoot, Jobber, Nike, Zip, Crypto.com,
Yubo, Formula 1, foodpanda, Meta AI, Booking.com, Wise, Journal, Azar, Linktree, KakaoTalk. Plus
blink.global mobile frames, driven live in-browser.

Our-side claims — the two-image asset situation, `dayPhases()` returning `{total, done, state}`, and
the Sections-directory role — are verified against `demo/hostv2/` at HEAD. The density and
infographic findings are carried from the Mobbin gap board and the 2026-07-17 Attention & Density
Re-Audit, both in `demo/docs/audits/`.
