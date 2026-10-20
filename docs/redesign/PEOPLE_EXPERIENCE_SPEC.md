# PEOPLE — EXPERIENCE SPECIFICATION

**Phase C of the First Production Calibration Slice. Written 2026-10-20.**

Implementation-grade. **Mobile first, then tablet, then desktop** — in that
order, because that is the order the decisions are actually made in: mobile
settles *what the product says*, and the wider breakpoints only decide *how much
of it can be seen at once*.

Reads against:
- `docs/redesign/PEOPLE_PRODUCT_CONTRACT.md` — what People is (Phase A)
- `docs/redesign/PEOPLE_CAPABILITY_PARITY.md` — what exists (Phase B)
- `docs/redesign/NGW_PRODUCT_EXPERIENCE_REFERENCE.md` — the visual family (Phase D)

Breakpoints are the shipped system (`src/lib/viewport.js`):
**mobile < 640 · tablet 640–1023 · tablet-land 1024–1279 · desktop ≥ 1280**,
with ≥1536 a refinement *within* desktop, deliberately not a fifth enum value.

---

## 0 · THE SURFACE'S ARGUMENT

People makes one argument, in one order, and every breakpoint tells the same
story. The breakpoints change *simultaneity*, never *sequence*.

```
A  THE PLATE           this event, named, photographic
B  THE ATTENDANCE      the number · whose it is · how firm
C  THE ONE MOVE        one action · why it matters elsewhere
D  THE ASK             how people get asked, and what's outstanding
E  THE LIST            the people, searchable, filterable
F  WHAT THEY NEED      accounted for · still unknown
G  THE TOOLS           import, export, invite rules, counting mode
```

**Why this order and not another.** The host's question on arrival is *how
many*, not *who* — every downstream commitment divides by the number, and the
list is how the number is maintained, not what it is for. So B precedes E. C
sits between them because a move the host can take is worth more than a list she
has to read. D precedes E because when the balance is non-zero, asking is the
work and the list is the evidence. F follows E because a need belongs to a
person and the host has just met them. G is last because it is configuration.

**This order is a contract.** No breakpoint reorders it. Desktop may render D
beside B; it may not render D *before* B.

---

# PART ONE — MOBILE (< 640px)

The flagship. 390px is the design width. Everything below is specified at 390
and must survive 320.

## A · THE PLATE

```
┌────────────────────────────────────┐
│  [ photograph, 16:9-ish, ~127px ]  │   ← event cover, or absent
│  ·····fixture badge if a fixture···│
├────────────────────────────────────┤
│  PEOPLE                            │   caps eyebrow, letterspaced, 11px floor
│  Know who's coming.                │   serif, 2 lines max
│  Replies, needs and who's bringing │   sans deck, --muted
│  whom for Wanda's 50th.            │
└────────────────────────────────────┘
        hard edge ────────────────────
```

| | |
|---|---|
| **Ground** | Dark in **both themes** (`--people-plate: #15130F`). It is a photographic surface with its own luminance regime, not "the hero in dark mode". Nine reference frames in both themes are unanimous. |
| **Photograph** | `event.coverImageUrl`. **No writer exists** (Parity §7 / G11) — so in production it is absent, and a review fixture must carry a visible `DESIGN FIXTURE — NOT YOUR PHOTO` badge. No guest image is ever inferred; no photograph is attached to a named guest. |
| **Image-absent** | The plate keeps its full height and its text. It does **not** shrink. A shorter slab was tried and reverted — it only made the slab smaller without making it mean anything. |
| **Statement** | One eyebrow, one serif statement of at most two lines, one deck sentence. Never a figure. |
| **Edge** | Hard. No gradient, no radius, no card straddling the seam. The seam is the product's strongest compositional signal: above it the event is a feeling, below it it is work. |
| **Open choice** | Statement **over** the photograph or **under** it on the same dark ground. Both ship in the reference family (Experience Reference §2 VARIANT). Decide on legibility against a real photograph — not by picking a frame. Until there is a real photograph, under-it is the safer default because it cannot fail a contrast check. |

**Why the plate is capped at ~288px total.** Operational content must be
reachable in the first viewport at every breakpoint. On a 390×844 phone the
plate plus the top bar must leave the attendance statement visible without a
scroll. That is a measured constraint, not a taste.

## B · THE ATTENDANCE

The dominant block of the operational field. Branches on
`attendanceBand(event).basis` **before** choosing any word.

### B1 · `basis: 'estimate'` — a figure exists, nobody has replied

```
PLAN AROUND
  40
We'd expect 40 on the day. Nobody has replied yet.
We filled that in from what this kind of event usually runs —
it stays out of anything we send.

[ Plan for 40 ]            ← filled primary, full width
[ Use a different number ] ← quiet secondary
▸ Why this number
```

| Element | Source | Rule |
|---|---|---|
| Figure | `attendanceStatement().confirmable` | The only figure worth showing on this basis. `band.confirmed` is `0` here and must never wear a confirmed label. |
| Provenance line | `guestCountNotice(event)` | **Rendered, not disclosed.** Phase B #8 / G4: the sentence exists and is currently discarded on this surface. It appears whenever `countFromHost === false`. |
| *Plan for N* | → `patchEvent({guestEstimate, guestCount, guestCountSource:'host'})` | The single explicit adopt act. After it, the number is hers and the outward gate opens. There is no silent promotion. |
| *Use a different number* | reveals `#guests-entry-anchor` | **Must render on roster events too.** Currently suppressed (`onAdjust` null at `:24122`), which makes headcount mode unreachable — Phase B #6a / G6. |
| *Why this number* | `band.because` | Now genuinely supplementary, because the headline already told the truth. |

### B2 · `basis: 'count'` — the host's own number

```
THE NUMBER YOU SET
  75
Firm. Nobody has been asked to reply.
▸ How that's counted
```

**The word `confirmed` does not appear.** `band.confirmed` is `75` here with
nobody having replied; rendering it behind *"75 have confirmed they're coming"*
is the repository's named recurring defect. The honest register is *firm /
settled / the number you set*.

### B3 · `basis: 'rsvp'` — real replies

```
WHO'S COMING
  52
52 have said yes. 23 haven't answered yet.
▸ Who's counted
```

| Element | Source | Rule |
|---|---|---|
| Figure | `band.confirmed` | On this basis **only**, it genuinely means people replied. |
| Second clause | `band.pending` | A pending guest is never spoken of as coming. |
| *Who's counted* | `confirmedCovers` | Covers, not rows: yeses + filled plus-ones + confirmed rows' children. The disclosure is where the row/cover distinction gets explained, because that is the only place a host will ask. |

### B4 · Kids

Where the host stated a kids figure in headcount mode, it renders here —
**and it must survive the next roster write.** Phase B #11 / G2 is the one
defect in the ledger that produces a wrong number in the physical world, and
this block is where its loss becomes visible to a host.

## C · THE ONE MOVE

```
✦  BUILD GUEST LIST
   Drives RSVPs, seating and final headcount.
                              [ Start now → ]
```

| | |
|---|---|
| Source | `eventPlan()` → first action or worry with `domain === 'guests'` |
| Form | A **band**, not a card. Glyph + caps eyebrow + title + one line + right-aligned CTA, matching the reference's `YOUR NEXT MOVE` treatment. |
| **The *why* is required** | The reference's ladder carries a `Why:` on every single domain card, and names *other* domains. People's own measured entry is *"Drives RSVPs, seating and final headcount."* A move without its consequence is incomplete. |
| CTA | Rendered **only** when `resolveRoute` lands somewhere that is not `guests`. A button linking to where the host already is is worse than no button. |
| If the top move belongs elsewhere | People shows **no competing primary**. The attendance block states truth; the board keeps the move. |
| One, not three | The ladder's premise is singularity. |

## D · THE ASK

Three tiers, and the tiering is the point: one thing is the action, a few things
are alternatives, the rest are depth.

```
GET RESPONSES
A final headcount by Feb 8 means 23 more replies.

[ Share the RSVP link ]              ← one filled primary, full width
  Show the QR · Preview the RSVP     ← quiet secondary row
▸ More ways to reach people          ← labelled fold: copy invite,
                                       guest brief, update everyone,
                                       write a nudge
  Reply by Feb 8 · Change            ← quiet, only if she set one
```

**The line logic, exactly:**

| State | Line |
|---|---|
| Nobody invited | *Nobody has been invited yet — the link below is how they get asked.* |
| Outstanding, reply-by set | *A final headcount by {date} means {n} more repl{y/ies}.* |
| Outstanding, no reply-by | *{N} {person hasn't / people haven't} answered yet.* |
| All answered | *Everyone has answered.* |

**Reply-by:** `rsvpDeadlineFor().source === 'override'` is hers; `'derived'` is
our `event.date − 7d` guess and **is never spoken as a date she set**. The
product may offer to set one (*pick one for me*), and nothing is written until
she taps.

**Nothing here claims to have sent.** Drafts open in her own composer; the
per-row links hand off to the OS. The bulk nudge's label was deliberately
changed from *"Nudge the quiet ones"* because the draft carries no recipient
list.

**Gating:** everything reply-shaped is gated on `showsReplyTracking(event)`.
A count-only host is not chased. **The list below is not gated** — suppression
hides pressure, never data.

## E · THE LIST

### E1 · The toolbar (≥8 guests)

```
12 of 23 people still don't know.        ← told-rollup, reachable guests only
[ Find someone                        ]
( Everyone 23 )( Coming 12 )( No reply 8 )( Maybe 2 )( Can't 1 )
```

The lens counts recompute **after** the search, so a chip never promises rows a
search has already removed. The rollup's denominator is guests with a phone or
email, and the copy says so.

### E2 · The row

```
┌──────────────────────────────────────────┐
│ ⬤   Marcus Webb              [Yes]       │   ⬤ = 40px initials, serif name
│ 40  +1 Dana · 2 children                 │   party line, --muted
│     Step-free access                     │   need line, only if one exists
└──────────────────────────────────────────┘   ~60px min, 8px gaps, bordered
```

| Tier | Content | Rule |
|---|---|---|
| Identity | media + **serif** name + state pill | The pill is `aria-hidden` and display-only; **the whole row is the trigger.** One actionable thing per row for a screen reader. |
| Party | plus-one by name, children as a count | A filled plus-one is a real adult. Children are counted, not listed. |
| Need | the need, if the row carries one | Not a diagnosis, ever. |

**The media tile is initials, not a photograph.** This is a reasoned
substitution, not a reference match: the family's rows carry photographs of
*venues*, and no guest image may be inferred. The Experience Reference declines
to promote initials to doctrine, and so does this spec — it is simply the only
honest thing available.

**The row is the same object at every breakpoint.** Stripping desktop rows to
hairline dividers was tried and reverted: it gave one object two row grammars.

### E3 · The detail, inline

Tapping a row expands it in place. There is nowhere else for it to go at 390px,
and a route would lose the host's position in the list.

Order, and the order is the argument — **person first, then editing**:

```
Marcus Webb                          ← name, EDITABLE (closes G1)
  REPLY      ( Yes )( Maybe )( No )( — )
  CHILDREN   [ − ] 2 [ + ]
  Who they're bringing  [ Dana          ]
  Meal       ( — )( Standard )( Veg )( Vegan )( GF )
  Dietary needs         [               ]
  Phone                 [               ]
  Email                 [               ]
  Group                 [               ] ⌄ Family/Friends/Work/Neighbors
  Step-free access  ·  Nuts              ← read-only tags from their reply
  ─────────────────────────────────────
  Text Marcus · Email Marcus · Call Marcus
  Mark it sent to Marcus — I sent it myself
  ─────────────────────────────────────
  Remove Marcus                          ← destructive register
```

**Name editing is new and is required** (Phase B #25 / G1). Today a typo forces
remove-and-re-add, destroying the row's reply, meal, children, contact details
and group. The field writes through `writeGuest(i, {name})` like every other.

**Undo must become a decision.** Today `writeGuest(i, patch, null)` passes no
message, so plus-one, dietary needs, phone, email and group changes are silently
un-undoable — an accident of call sites, not a ruling. **This spec requires:
every field in the detail is undoable, or the detail states which are not.**

**Contact actions are mutually exclusive**: the chase row (Text/Email/Call)
appears only when chasing *and* the row is unanswered; the quiet contact row
appears otherwise. A guest with no contact details gets neither, and the
grounding note under D explains why.

### E4 · Grouping and empty

Grouping appears automatically at ≥2 distinct groups. A filter that empties the
list offers **Show everyone** as a control, not as prose.

## F · WHAT THEY NEED

```
ACCOUNTED FOR
 ✓ Step-free access — 2 people              ▸ Who
 ✓ Nut allergy — 1 person                   ▸ Who

STILL UNKNOWN
 ○ "my aunt uses a walker"
   Someone coming needs step-free access. We won't guess which
   person — tell us who and we can check the seating too.
```

| | |
|---|---|
| Source | `accessNeedsFor(event)` — **read only, never writes `guests`** |
| Grouping | **By need, not per person.** Five guests needing step-free access is one row with a *Who* disclosure. Printing five identical sentences was shipped once and caught. |
| Unknown owner | A first-class state. The host's **verbatim phrase** is quoted; the person is explicitly not named. |
| No control | There is deliberately no *assign to a guest* control. `accessNeedsFor` merges intake and roster sources with no dedupe, so assigning would make lodging say two people asked about one (Phase B #58 / G7). **That is engine work, and the absence is declared rather than faked.** |
| Reach | An unowned need reaches **lodging only**. The copy may not imply seating. |
| Empty | The block is **absent**. A "no needs" card is a zero-card. |
| Never | A diagnosis. `healthNoted` owns health; a mobility aid is not evidence of a condition. |

**Why F follows E.** A need belongs to a person, and the host has just met the
people. Putting needs above the list would ask her to hold names she hasn't read
yet.

## G · THE TOOLS

One labelled fold, closed by default, containing everything configurational:

```
▸ How the invite looks, and your list
    Counting:  ( By list )( By headcount )
    Invite look: Match the event / Bright paper / Elegant dark
    Artwork on the invite  (only if event artwork exists)
    Plus-ones: Welcome / Named guests only
    Children:  Welcome / Adults only
    Ask yeses for a mailing address
    Gifts: none / registry / charity / potluck / chip-in  + detail
    ─────────────────────────────────
    Import a guest list (CSV)
      → platform → file → preview → Bring them in
    ▸ Past imports · 3
      Undo last import  ·  Clear import history
    Download the guest list (CSV)
```

| | |
|---|---|
| **Subordinated, not removed** | Every one of these is a shipped capability. The fold is a hierarchy decision, not a retirement. |
| Counting chips | Both must read their pressed state from `guestPlanningMode(event)`. Today *By list* reads `showsReplyTracking` and *By headcount* reads `event.guestMode` — two chips in one group answering two questions (Phase B #10a / G10). That is an accessibility lie. |
| CSV | The **preview before write is non-negotiable** even inside a fold. A destructive merge may be subordinated; it may not be made quiet. |
| Import history | Device-local, outside the event blob, outside undo. The copy says *latest batch only* because that is what `undoLastImportBatch` does. |
| Label | *"How the invite looks, and your list."* Not *"Invite look, rules and list tools"* — hosts do not have teams and do not run tools. |

## MOBILE — ORDER OF COMPLETION

| Viewport | What is visible without scrolling at 390×844 |
|---|---|
| 1 | Plate (≈288px) + the attendance eyebrow and figure |
| 2 | The rest of the attendance block + the One Move |
| 3 | The ask block |
| 4+ | The list, then needs, then tools |

**This is the acceptance criterion for mobile composition.** If the attendance
figure is not on screen one, the plate is too tall.

---

# PART TWO — TABLET (640–1279px)

Two bands, and the product currently has layout for **neither**. The reference's
caption is the brief: *"focused planning with the same core experience,
optimized for touch."*

## The governing principle

> **Tablet is not a wide phone and not a narrow desktop. It keeps mobile's
> single narrative order and spends the extra width on measure and on putting
> *more of one thing* on a line — never on a second column, until there is
> genuinely a second thing worth looking at simultaneously.**

The reason is behavioural, not aesthetic. A tablet is held, often one-handed,
often at an angle. A second column at 768px produces two columns of ~360px,
which is two phones side by side — the host's eye has to choose, and neither
column is comfortable. The width is better spent making the single column
*legible* than making it *double*.

## 640–1023 (`tablet`)

| Block | What changes | **Why** |
|---|---|---|
| A · Plate | Grows to ~265px of photograph; the statement may move to an overlaid left third | At this width the photograph is finally wide enough that an overlay has somewhere to sit without crossing the subject. The reference's own tablet frames do exactly this. |
| B · Attendance | Figure and statement sit **side by side** rather than stacked | The figure is a display-register number; at 390px it needs its own line, at 768px it does not, and recovering that vertical space moves the One Move up a viewport. |
| C · One Move | CTA moves to the right of the band instead of under it | Same recovery. The reference's band is always horizontal where width allows. |
| D · Ask | Secondary row and the fold's contents can share a line | — |
| E · Row | Party and need lines **merge onto one line** separated by `·` | The row's facts finally fit. This is the first thing extra width should buy, because it makes the list scannable rather than tall. |
| E3 · Detail | **Still inline.** No rail. | Below 1280 there is not enough width for a 340px rail plus a usable list. Hoisting the detail here would leave a ~400px list column — worse than the accordion. |
| F, G | Unchanged order; wider measure | — |
| Touch | **Targets stay at mobile size.** 44px minimum. | A tablet is a touch device. Shrinking controls because there is room is the single most common tablet mistake. |

## 1024–1279 (`tablet-land`)

| Block | What changes | **Why** |
|---|---|---|
| E1 · Toolbar | The roster gains its **column header band** | At this width the row's three tiers resolve into columns, and a header is what makes a columnar row readable rather than arbitrary. Below this it is furniture. It stays `aria-hidden`: there is no sorting, and a header that looks sortable and isn't is a lie. |
| E2 · Row | Media tile grows toward 56px; chips return | — |
| Everything else | As `tablet` | **The detail is still inline.** The rail arrives at desktop, not here, because `isWideBp` already treats `tablet-land` as sidebar-capable and adding a *second* rail inside the content would be two rails on one screen. |

## 🔴 THE INHERITED TABLET DEFECT

**The app shell clips at tablet widths, independently of People.** This was
proven with a flag-off control frame (`M0-tablet-LEGACY-dark.png`) showing
identical clipping on the pre-redesign surface.

**It is a shell fix, not a People fix.** People must not work around it with a
local override — that would hide a shell defect behind one domain and leave
every other domain broken. It is reported here and belongs in a shell slice.

---

# PART THREE — DESKTOP (≥ 1280px)

The reference's caption: *"full planning experience with side-by-side
comparisons and detailed information."*

## The governing principle

> **Desktop's extra width buys exactly one thing: the host can see a person and
> the whole list at the same time. Everything else about the surface is
> unchanged.**

## The layout

```
┌─────────────── plate, full bleed ────────────────────────┐
├──────────────────────────────┬───────────────────────────┤
│  MAIN  (fluid, ≥ 720px)      │  ASIDE (340px, sticky)    │
│                              │                           │
│  B  attendance               │  ┌─── AT A GLANCE ─────┐  │
│  C  one move                 │  │ Wanda's 50th        │  │
│  D  ask                      │  │ Feb 22 · Maryland   │  │
│  E  list                     │  │                     │  │
│  F  needs                    │  │ Invited        75   │  │
│  G  tools                    │  │ Said yes       52   │  │
│                              │  │ Haven't replied 23  │  │
│                              │  │ Children        6   │  │
│                              │  │                     │  │
│                              │  │ ACCOUNTED FOR       │  │
│                              │  │ ✓ Step-free — 2     │  │
│                              │  │ STILL UNKNOWN       │  │
│                              │  │ ○ "my aunt uses…"   │  │
│                              │  │                     │  │
│                              │  │ See who hasn't      │  │
│                              │  │ replied →           │  │
│                              │  └─────────────────────┘  │
└──────────────────────────────┴───────────────────────────┘
```

| Decision | **Why** |
|---|---|
| **The aside's job is context, not navigation and not settings** | A navigation rail would duplicate the shell's own; a settings panel would promote G above E. Context is the only thing that earns permanent screen space next to a list. |
| **Selecting a guest replaces the aside's content with the detail** | The list does not move. At mobile the accordion pushes rows down and that is acceptable because there is no alternative; at desktop it is not, because the host is scanning. |
| **The main column opts out of the 820px prose cap** | Per that ruling's own stated exception — *"the row lists below opt back out."* Without it the main column computed 460px inside an 1150px sheet. |
| **`peopleRailUp = peopleMode && railUp && bp === 'desktop'`** | All three terms are load-bearing. The flag term was missing once and the *pre-redesign* desktop surface was silently recomposed, losing 340px to a permanently empty column — with every test green, because every test passes the flag explicitly. This is now a permanent source-level ratchet. |
| **The row is the same object** | Smaller media tile, more facts per line, same grammar. Not a table row. Not a divider. |
| **The `.people-roster` opts out of the data-tier column model** | The shell's positional selectors (`.grow > button:first-of-type > span:first-child`) seize any new spans rendered in those positions, which produced 350px-tall rows with centred names and floating avatars. The opt-out is the fix and it is deliberate. |

## ≥1536 (widescreen, *within* desktop)

A refinement, not a new breakpoint — adding an enum value would break every
`bp === 'desktop'` check in the codebase.

| Change | Why |
|---|---|
| The aside may grow to ~400px | The needs block's verbatim quotes stop wrapping to four lines. |
| The main column gains gutter, not content | A 1400px list row is not more readable than a 900px one. Width past a point should become margin. |

## DESKTOP — THE THREE THINGS THAT MUST NOT REGRESS

1. **Selecting a guest must not blank the surface.** It did once: a person
   header called a helper declared 650 lines below it, and nineteen browser
   tests passed through the ReferenceError. What caught it was a screenshot step
   failing to find a roster. This is now a permanent test.
2. **The pre-redesign surface must still render at desktop without the flag.**
   The negative control is the guarantee that `?people=1` is genuinely opt-in
   and the baseline is genuinely runnable.
3. **No new row atom ships without a `parity/MANIFEST.md` row and a
   `check-parity.mjs` rule.** A new atom without a manifest row is not an atom.

---

# PART FOUR — CROSS-CUTTING

## Light and dark

| Surface | Light | Dark | Why |
|---|---|---|---|
| Plate | **dark** | dark | It is photographic and has its own luminance regime. Nine reference frames in both themes agree. |
| Operational field | the theme's own light surface | the theme's own dark surface | The reference shows only an ivory field; a dark-body variant does not exist in the family, so the theme's own surface is used rather than inventing one. Recorded, narrow, and not a doctrine change. |
| Surface ladder | page → panel → card must get **lighter** in light mode | and darker-to-lighter in dark | This was inverted once: the content panel computed darker than the page behind it, and on a phone the panel and sheet were both pure white, so the operational field had no plane at all. |

**Light mode is the mode to judge against the reference sheets.** The family
never shows a dark body, so dark-mode evidence cannot settle a composition
argument.

**🔴 Unresolved:** the reference's action accent in dark theme is brass/amber
(`≈#E8C07A`); the owner's standing decision is steel blue `#4c6675`, with the
`palette.js` ban on `#f0bc44` / `#e08c38` in force. Three palette variants exist
as a review instrument (A production, B the reference's own brass, C steel on a
warm neutral field); all three measured AA-clean in both themes from the live
DOM. **This spec does not choose. It is an owner decision.**

## Motion

Disclosure and accordion transitions only. Nothing animates on data arrival —
replies landing must not make the list move under the host's finger. All motion
respects `prefers-reduced-motion`.

## Accessibility, as acceptance criteria

1. 44×44px minimum tap target, every breakpoint, including the row's name button.
2. Visible focus ring on every control. (`outline:none; box-shadow:none` on a
   21px target shipped once and was invisible in a screenshot — this is a test,
   not a look.)
3. 11px type floor (`nothingIsBelowTheFloor`).
4. AA contrast on every text token, both themes.
5. `aria-pressed` reflects the field it claims to reflect (G10 is a live
   violation).
6. Display-only chips are `aria-hidden` where the row is the control.
7. Disclosure labels say what is inside — *Why this number*, *Who's counted* —
   never *More*.
8. Reply state carries a **word**, never colour alone.
9. An emptied filter announces a recovery **control**.
10. Spacing stays on the ladder (0,1,2,4,8,12,16,20,24,32,40,48,56,64,80).

## What this spec forbids

- A second attendance authority. `attendanceBand()` is it.
- A second prioritiser. `eventPlan()` ranks; People reads.
- A write path other than `patchEvent`.
- Business truth in component state.
- Host-shell code reaching the `?rsvp=CODE` chunk.
- An estimate rendered as a confirmation, or reaching money or outward copy.
- A roster row created from a need; a diagnosis inferred from one.
- A person inferred where ownership is unknown.
- Optimistic UI claiming a write landed when it has not.
- Sorting controls on the roster (there is no sorting, by design).
- A completion percentage, gauge, score or KPI row anywhere on the surface.
- Retiring any old door.

---

# PART FIVE — IMPLEMENTATION SEQUENCE

Ordered so that nothing is built on top of a known lie.

| # | Work | Why first |
|---|---|---|
| **1** | **Fix `kidsCount`'s two writers** (G2) | The only defect that produces a wrong number in the physical world — a host states 6 kids of 40, adds one name, and the protein engine resizes for full adults. Rebuilding the surface over silent data loss makes it harder to see. |
| **2** | **Add guest name editing** (G1) | A daily, obvious failure whose workaround destroys the row's reply, meal, children, contact and group. Small, local, one existing writer. |
| 3 | Render `guestCountNotice()` on the People surface (G4) | Pure exposure; the honesty promise currently rests on a disclosure instead of the engine's own words. |
| 4 | Make headcount mode reachable on roster events (G6) | A capability that exists and cannot be reached. |
| 5 | Fix the counting chips' `aria-pressed` (G10) | An accessibility lie, one line. |
| 6 | Decide undo coverage for the detail's fields (G12) | Make it a ruling instead of an accident of which call sites pass a message. |
| 7 | Conform the existing surface to Parts One–Three | The composition work this spec describes. |
| 8 | Tablet layout (640–1279) | The band that has never had one — **after** the shell clipping defect is fixed, not around it. |
| 9 | Convert the six WIRED capabilities to PROVEN | Browser tests, not arguments: the `lockcount` raise, the desktop rail, the live reply round trip, the seating drag. |
| — | **Not in this slice** | The media pipeline (G11), the `accessNeedsFor` dedupe (G7, engine), a host writer for structured diet tags (G3), `headsFor` adoption (G8), `partyNotes` (G9), the shell's tablet clipping, any retirement of any door. |
