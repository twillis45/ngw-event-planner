# THE NGW ART-DIRECTION GRAMMAR — extracted from the owner's reference set

**Read 2026-10-20** from the eleven supplied reference sheets: Creation →
Understanding → Clarify → Reveal → Your Event · Place (Direction, Discovery,
Compare, Inquiry, Selected, Operational) · Place (Venue Workspace) · Travel &
Stay · Team · Vendors · Money · Schedule · The Day — each at mobile 390,
tablet 1024 and desktop 1440, in light and dark.

**This is the ART-DIRECTION authority.** It does not override the production
design system (tokens, primitives, interaction), the Sprint 0/0.5 intelligence
architecture, or the pre-redesign Host V2 capability baseline. Where it
conflicts with a later production decision, §7 records the conflict rather than
silently resolving it.

---

## 1 · THE RECURRING COMPOSITION

Every domain, at every breakpoint, is the same three-movement structure:

```
   EDITORIAL OPENING          photography + eyebrow + serif statement + deck
          ↓
   ORIENTATION               where you are, what's true, what's next
          ↓
   OPERATIONAL SURFACE       lists, tables, filters, status — quiet and fast
```

The product is **neither a portfolio nor a dashboard**: it opens emotionally and
then gets out of the way. The transition is the signature move, and it happens
*within one screen*, not across screens.

## 2 · THE MOBILE DOMAIN ENTRY — the most repeated artifact in the set

Measured consistently across Place, Team, Vendors, Money, Travel & Stay,
Schedule and The Day at 390×844:

| Band | ~Height | Contents |
|---|---|---|
| **Photographic field** | **~40–45% of viewport** | Full-bleed width, event-appropriate photography, dark scrim rising to the lower edge |
| **Domain eyebrow** | — | Small, letterspaced, warm accent: `Place` · `Team` · `Money` · `Schedule` · `The Day` · `Travel & Stay` |
| **Serif display statement** | 2–3 lines | *"Find the right venue with confidence."* · *"Right people. Right roles. Less stress."* · *"Your event budget in one view."* · *"Make the day flow perfectly."* · *"Everything in one place."* |
| **Sans deck** | 2–3 lines | Muted, explains the domain's job in plain host language |
| **Section directory** | — | Icon + label + chevron rows — the domain's own contents |
| **One primary CTA** | full width | *"Explore venues →"* · *"Manage team →"* · *"View budget →"* · *"Create timeline →"* |

**The photograph never consumes the useful viewport.** Something actionable is
always visible or one short scroll away. This is the direct answer to "do not
make them scroll through a giant decorative hero."

## 3 · TYPOGRAPHY — the serif carries the domain statement

The display voice across the whole set is a **light-weight serif**, two or three
lines, sentence case, ending in a full stop. The sans carries decks, labels,
data and controls.

This is an **extension** of the production doctrine rather than a contradiction.
`styles.css:751` already says *"the serif is the whole HUMAN voice — the event
NAME (identity) joins the guide voice"*. A domain statement is identity, so it
is the human voice, so it is serif. **What changes is scale and position, not
which family speaks.**

Page titles on tablet/desktop are the same serif at a smaller size: *"Team
overview"*, *"Payments"*, *"Venue options"*, *"Run-of-show"*.

## 4 · THE OPERATIONAL VOCABULARY

### List rows — the roster model
Three variants, one grammar: **media + name + one status pill + one meta line +
affordance**.

| Surface | Media | Status pill | Meta | Affordance |
|---|---|---|---|---|
| Team members | circular avatar ~28px | Confirmed / Pending / Tentative | role · category · email | ⋮ |
| Vendors | square thumb ~40px | Confirmed / In progress / Under review / Not started | category · next step · last contact | ⋮ |
| Venue options | rounded thumb ~64px | Shortlist / Site visit / In review / Not a fit | location · distance · amenity chips | View details → |

**Rows are quiet.** One pill, one line of meta, no competing emphasis. Density
comes from restraint, not from shrinking.

### Status colour — a closed vocabulary
`green` settled/confirmed/complete/paid · `amber` in progress/pending/due
soon/tentative · `red` overdue/issue/not a fit · `grey` not started/not needed.
Tinted background, darker text, pill shape. Identical semantics in both themes.

### Stat strips
Desktop domains open with 4–5 tiles: small icon, large number, small label —
*12 Total people · 6 Confirmed · 2 Pending · 4 Vendors · 10 Open tasks*.

### Right rail (desktop only)
A persistent **photographic event card** (event name, date, area, guest count),
then **Quick actions** and **Next steps** as icon + label + chevron rows. The
event photograph lives here permanently — this is how identity persists once the
hero has scrolled away.

## 5 · THE INTELLIGENCE PATTERNS — embedded, never a panel

| Pattern | Form | Where seen |
|---|---|---|
| **"Why we're recommending this"** | ✦ glyph + short bold title + ONE line + the primary CTA beside it | Venue Direction, Vendors |
| **"Why we're asking"** | ⓘ glyph + one line, under a question | Clarify |
| **"This decision updates your plan"** | a row of icon+label chips naming the affected domains (Food & Drink · Money · People · Team · Travel · Schedule · The Day) | Venue Selected |
| **"You want" / "Still unknown"** | **two labelled columns** — what we have, and what we don't | Understanding |
| **"Highest impact"** | a single pill on the one priority step | Your Event |

**`Still unknown` is the most important pattern in the set for us.** It is
truthful uncertainty, productized as a *labelled list* rather than a paragraph
of explanation — and it is exactly what Sprint 0/0.5 spent eight slices
protecting. An unowned access need belongs in that register, not in prose.

## 6 · PROGRESSION IS VISIBLE, AND IT IS PER-DOMAIN

Place: Direction → Discovery → Compare → Inquiry → Selected → Operational.
Creation: Create → Understanding → Clarify → Reveal → Your Event.
Others carry a lighter 4-step header (Build / Add details / View and adjust /
Share) that is **descriptive of the domain's work**, not a wizard.

The steps differ per domain. **A five-step Venue stepper must not be pasted onto
People.** People's own progression has to come from runtime state or not exist.

## 7 · WHAT THIS SET PREDATES — conflicts, recorded not resolved

The references were made before later production decisions. Per the owner's
instruction these are **art direction vs implementation detail**, and the
production decision wins on the first pass:

| Reference shows | Production decision | First pass does |
|---|---|---|
| Warm tan / brass eyebrows and accents | **Steel blue is the identity accent; decorative gold is on the never-reintroduce list** (`palette.js:35-37`) | Steel for eyebrows and accents |
| Warm ivory operational field | Current tokenized light/dark; no forced ivory | Current light-mode tokens |
| Mobile bottom tab bar (Home · Plan · Chat · Progress · More) | **Nav B** — app bar hidden, dock retired, eyebrow-summoned nav sheet | Nav B |
| Full-page domains under a horizontal top nav (Your Event · Place · People · Food & Drink · Team · Money · Schedule · The Day) | hostv2 is a sheet-based shell | Compose **within the sheet**; the IA question is real but out of scope for this slice |
| Guest/vendor portrait avatars on every row | No guest photography exists and none may be invented | Initials/monogram; media only where truthful |

**The one to watch:** much of the set's warmth comes from the tan accent over
near-black and from the ivory field. With steel over carbon the same composition
will read cooler. That is a visual-evidence question, not an argument — it gets
rendered, compared side by side, and documented either way.

---

## 8 · WHAT PEOPLE INHERITS

1. **A domain statement in serif.** "Guest list" is a sheet title, not a domain
   identity. People needs its own sentence.
2. **A photographic field at ~40% of mobile, scrimmed, with the statement over
   it** — and useful truth immediately beneath it.
3. **Attendance truth in the orientation band**, not buried under the fold.
4. **One attention moment**, in the "Why we're asking" register: glyph, short
   title, one line.
5. **`Still unknown` as the home for an unowned need** — a labelled unknown, not
   a paragraph.
6. **A quiet roster** on the list-row grammar: media, name, one status pill, one
   meta line, chevron.
7. **"This changes your plan"** for attendance consequences — chips naming the
   domains that moved, which is GOLD-07 made visible and needs no second engine.
8. **Desktop: stat strip + list + right rail**; the event card carries identity
   once the hero is gone.
