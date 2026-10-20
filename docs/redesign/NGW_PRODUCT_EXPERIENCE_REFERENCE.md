# NGW PRODUCT EXPERIENCE REFERENCE

**Phase D of the First Production Calibration Slice. Written 2026-10-20.**

A durable interpretation of the owner-supplied concept-image family. Its job is
to say what the family **means** as a product, so that later work argues against
a written principle instead of re-squinting at a JPEG.

Its second job is to refuse to turn accidents into doctrine. Every section below
is split into **INVARIANT** (holds across the family and is therefore a rule),
**VARIANT** (the family does it more than one way, so the choice is open), and
**ACCIDENT** (appears once or twice and carries no authority).

---

## 0 · THE CORPUS, STATED EXACTLY

Twelve sheets are on disk at `review-artifacts/_fixtures/reference/`
(gitignored — owner reference imagery is review-only and is not committed).

| File | What it is | Themes | Breakpoints shown |
|---|---|---|---|
| `sheet-1.png` | Creation → Your Event, 5 steps | light + dark | desktop primary, tablet + mobile thumbnails |
| `sheet-2.png` | Venue, one screen | dark | desktop + tablet + mobile, full size, captioned |
| `sheet-3.png` | Complete Journey, 6 steps | light + dark | mobile only |
| `sheet-4.png` | Creation → Your Event, 5 steps, with product chrome | light + dark | desktop primary, tablet + mobile thumbnails |
| `sheet-5.png` | Place — find and confirm your venue, 5 steps | light + dark | mobile 390×844 + tablet 1024×1366, labelled |
| `sheet-6.png` | Complete Planning Journey, 7 steps (adds Next Domains, The Day) | light + dark | desktop primary, tablet + mobile |
| `sheet-7.png` | Journey, 6 steps + **One Move ladder** + **cross-screen consequence** | light + dark | desktop |
| `sheet-8.png` | Venue journey, 6 steps | dark | desktop + mobile per step |
| `sheet-9.png` | Venue selection journey, 6 steps | light + dark | desktop + tablet + mobile per step |
| `ref-place-responsive.webp` | Place, responsive set | — | three |
| `ref-team-responsive.webp` | Vendors / "Build your team", responsive set | — | three |
| `ref-place-journey.webp` | Place, six states | — | three |

### 0.1 · THE FINDING THAT GOVERNS EVERYTHING BELOW

> **Twelve sheets. Zero People screens.**

People appears in the family **twelve times, and never once as an interior
surface**. Catalogued exhaustively, because this is the limit on every
People-specific claim anyone makes from these images:

| # | Sheet | How People appears |
|---|---|---|
| 1 | all | a top-nav item, `People`, between `Place` and `Food & Drink` |
| 2 | 2, 5, 8 | a mobile bottom-tab destination, `People`, with a two-person glyph |
| 3 | 1 ·5 | command-centre tile — `People` / `Not started` / `Guest list` |
| 4 | 4 ·5 | the same tile, with photography filling it |
| 5 | 6 ·4 | command-centre **list row** — `People` / `Not started` / `›` |
| 6 | 6 ·6 | Next Domains — `People` / `In progress` / `Invitations and RSVPs` |
| 7 | 3 ·6 | operational checklist row — `People — 52 confirmed` |
| 8 | 7 strip | One Move card — `People` / `Track invitations` / **One Move: Build guest list →** / **Why: Drives RSVPs, seating and final headcount** |
| 9 | 7 strip | cross-screen consequence — `People` / `Seating capacity can now be planned` |
| 10 | 8 ·5, 9 ·5 | "this decision updates your plan" chip — `People` / `Seating capacity confirmed` |
| 11 | 1 ·2, 4 ·2 | "Still unknown" list item — `Guest list and RSVPs` |
| 12 | 1 ·4, 4 ·4 | priority next step — `Create guest list and send invitations` |

Nothing in the family shows a guest list, a reply, an attendance figure, an
access need, an RSVP state, or a guest detail. **Everything this document says
about People's interior is transferred grammar, not measured design**, and every
such claim is marked **[TRANSFERRED]** below.

The structural analogue remains `ref-team-responsive` (Vendors / "Build your
team"): a list of named people with status chips, a context rail and a
recommendation band. Place is the analogue for journey and composition. Neither
is People, and the difference matters — Place chooses one thing from many,
Vendors fills a small fixed set of slots, and People accumulates an open list
whose truth arrives from outside the host.

---

## 1 · WHAT THE PRODUCT IS, IN ITS OWN WORDS

The family states its thesis four times, in four registers, and they agree:

- **Masthead strap:** *"Natural language in. Intelligent plan out. No guesswork."*
- **Sign-off:** *"NGW — No Guesswork. Just great events."*
- **Pillar strip (sheet 3):** Natural Language Input · Intelligent Understanding · Actionable Next Steps · Unified Experience.
- **Device captions (sheet 2):** desktop = *"full planning experience with side-by-side comparisons and detailed information"*; tablet = *"focused planning with the same core experience, optimized for touch"*; mobile = *"key actions and next steps, beautiful and easy to use on the go."*

**INVARIANT — the product's promise is the removal of guesswork, and the
interface is the proof.** Every screen in the family is answering *what do we
know, what don't we know yet, and what should you do about it.* That is the same
sentence the repository's own thesis already uses. The reference and the engine
agree on what this product is; the gap has always been exposure.

**INVARIANT — the device captions are a product decision, not a layout note.**
Desktop earns *comparison*. Tablet keeps the whole experience but for touch.
Mobile keeps *key actions and next steps*. Nothing in the family hides a
capability on mobile; it changes what leads.

---

## 2 · THE MACRO COMPOSITION

Confirmed across all nine new sheets and both themes:

```
DARK CHROME BAR            wordmark · domain nav · search · Ask NGW · account
      ↓
DARK PHOTOGRAPHIC PLATE    CAPS EYEBROW
                           Serif statement, two lines
                           One deck sentence, sans, quieter
      ↓   hard edge, no dissolve
OPERATIONAL FIELD          stepper · "YOUR NEXT MOVE" band · content · rails
```

**INVARIANT — the plate is dark in BOTH themes.** In light theme the field is
warm ivory and the plate is still a dark photograph. In dark theme the field is
near-black and the plate is the same dark photograph. The plate is not "the hero
in dark mode"; it is a photographic surface with its own luminance regime. This
confirms, from nine more frames, the narrow reconciliation already recorded in
`docs/architecture/redesign/PEOPLE_VISUAL_PARITY.md §4`.

**INVARIANT — the edge between plate and field is hard.** No gradient dissolve,
no rounded joint, no floating card straddling the seam. The seam is the
product's single strongest compositional signal: above it the event is a
feeling, below it the event is work.

**INVARIANT — the plate carries three text elements in a fixed order**: a
letterspaced caps eyebrow naming the domain (`VENUE`, `CREATE`, `INQUIRY`,
`DISCOVERY`, `COMPARE`, `VENUE SELECTED`, `VENUE OPERATIONS`, `INITIAL PLAN`,
`UNDERSTANDING`, `CLARIFY`), a serif statement of two lines, and one sans deck
sentence. Never two statements, never a statistic in the plate.

**VARIANT — where the statement sits at mobile.** Sheets 2 and 5 overlay the
statement on the photograph at phone width; the earlier `ref-place-responsive`
set stacks it below the photograph on the same dark ground. Both are in the
family. **The invariant is "dark plate, eyebrow + serif + deck, hard bottom
edge"; overlay-versus-stack is an open choice** and must be decided on legibility
against a real photograph, not by picking a frame.

**VARIANT — plate height.** Measured as a share of the frame it ranges roughly
24–34% at desktop and 25–40% at mobile depending on how much the step needs to
say. It is not a fixed token. What *is* invariant: **operational content is
reachable in the first viewport at every breakpoint.** No frame in the family
spends a whole phone screen on photograph and statement.

**ACCIDENT — the specific photograph.** Candle-lit tablescapes and dusk
exteriors are the Wanda scenario, not a rule. The rule is that the plate is
photographic and the photograph is the event's own, which is why host-supplied
cover media is a product requirement and why a fixture must be visibly labelled
as a fixture.

---

## 3 · THE JOURNEY SPINE

Every domain in the family is a **numbered journey with a visible stepper**,
rendered immediately under the plate as a horizontal row of numbered pills, each
with a label and a sub-label:

| Domain | Steps |
|---|---|
| Creation | Create · Understand · Clarify · Initial Plan · Your Event |
| Place / Venue | Direction · Discovery · Compare · Inquiry/Select · Selected · Operational |
| (whole product, sheet 6) | Creation · Understanding · Reveal · Your Event · Place · Next Domains · The Day |

**INVARIANT — a domain is a journey with named states, and the host can always
see which state they are in.** The stepper is orientation, not navigation
chrome: it answers *how far through this am I*, which is exactly the question a
guessing host is asking.

**INVARIANT — the step sub-labels are plain-language questions or outcomes**
(`What fits?`, `Find options`, `See side by side`, `Make it official`,
`Confirm details`), never nouns like "Step 2" or system words.

**VARIANT — step count.** Five, six and seven all appear. The count follows the
domain's real decision structure.

**[TRANSFERRED] — People's journey is not in the family and must be derived from
People's own truth, not copied from Place's.** Place's spine is a funnel:
*many options → one choice → operations*. People is not a funnel. Its truth
arrives from outside the host (guests reply), so its spine is an *accumulation
with an outstanding balance*. Copying Direction→Discovery→Compare→Select onto a
guest list would be the clearest possible case of turning a visual accident into
doctrine. §9 of this document says what People's shape actually is.

---

## 4 · "YOUR NEXT MOVE" AND THE ONE MOVE LADDER

Sheet 7's lower strip is the single most product-defining artifact in the
family, and it is explicit: **THE ONE MOVE — UPDATED, AS YOU GO.** *"NGW always
tells you what to do next. Here's how it evolves."* Seven cards, one per domain:

| Domain | State | One Move | Why |
|---|---|---|---|
| Your Event | Wanda's 50th + Army Retirement | Lock the food approach → | Catering affects budget, timeline and venue logistics |
| Food | Food approach needed | Choose menu → | Locks pricing, sets headcount and dietary needs |
| **People** | **Track invitations** | **Build guest list →** | **Drives RSVPs, seating and final headcount** |
| Team | Book photographer | Compare & select → | Captures the moment and builds your story |
| Money | Track commitments | Review budget → | Keeps you on track and prevents surprises |
| Schedule | Confirm timeline | Build run of show → | Keeps vendors and guests aligned |
| The Day | Final readiness | Event checklist → | Ensures everything runs smoothly |

**INVARIANT — a next move is never shown without its consequence.** Every single
card carries a `Why:` line, and every `Why:` names *other domains* the move
unblocks. The move is justified by what it changes elsewhere, never by urgency,
never by a score, never by a percentage.

**INVARIANT — there is exactly one move per domain at a time.** Not a ranked
list of three. The ladder's whole premise is singularity.

**INVARIANT — the in-screen treatment is a band, not a card.** `YOUR NEXT MOVE`
caps eyebrow → serif H2 → one deck line → content → one filled CTA. It sits
*above* the domain's working content, directly under the stepper. In the
Place frames it is literally the first thing in the operational field.

**INVARIANT — the move's label is a verb phrase in the host's language**
(`Build guest list`, `Choose menu`, `Review budget`), never a system action.

This is a precise match for the repository's existing `eventPlan()` contract:
one prioritizer, one final next-action authority, raises carrying a `domain`.
The reference does not ask for a second ranking engine; it asks for the existing
one to be *spoken* with its consequence attached.

---

## 5 · THE CONSEQUENCE SURFACE

Sheet 7's second strip: **THE CROSS-SCREEN CONSEQUENCE — "It's not just a venue.
It changes everything."** The same pattern appears in-screen on sheets 8 ·5 and
9 ·5 as **"This decision updates your plan"** and sheet 7 ·5 as **"This changes
your plan"**, with a `Continue with what this unlocks →` CTA.

Its anatomy, invariant everywhere it appears:

```
✦  This changes your plan
   ┌──────────────────────────────────────────┐
   │ 🍽  Food & Drink   Outside catering allowed│
   │ 💰  Money          Venue commitment added  │
   │ ✦   Experience     Recognition layout …    │
   │ 👥  People         Seating capacity …      │
   │ ✈   Travel         Lodging search can now …│
   │ 📅  Schedule       Venue access time needed│
   │ 🛡  The Day        Parking and vendor …    │
   └──────────────────────────────────────────┘
        [ Continue with what this unlocks → ]
```

**INVARIANT — a consequence names the affected domain and states the effect in
one clause.** It does not re-decide the thing. It does not link to a modal. It
is an *announcement that another surface's question changed*.

**INVARIANT — consequences are stated as unlocks, not as new chores.** The
language is `can now be planned`, `is now available`, `unlocked`, `confirmed` —
the host gained something. Compare the repository's existing `placeQuestions`
behaviour, where People raises a question answered in Venue; same mechanic,
already shipped, currently unspoken.

**ACCIDENT — seven rows.** The count is whatever the decision actually touched.

**[TRANSFERRED] — People's outbound consequences exist and are measured**
(replies → food, shopping, seating, money, re-rank; needs → lodging; needs →
venue question). The reference supplies the *form* for saying so. It supplies no
People-specific content.

---

## 6 · "YOU WANT" / "STILL UNKNOWN" — THE PRODUCT'S NATIVE WAY OF HOLDING A GAP

Sheets 1 ·2 and 4 ·2, the Understanding screen, are the most directly
transferable thing in the family for People, and the only place the family shows
how NGW holds something it does not know:

```
You want                        Still unknown
 ✓ Food & catering               ○ Exact date
 ✓ Bar service                   ○ Venue
 ✓ DJ / MC                       ○ Catering approach
 ✓ Event photography             ○ Timeline / run of show
 ✓ Possibly a photo booth        ○ Guest list and RSVPs
                                 ○ More?
```

**INVARIANT — known and unknown are shown side by side, at equal weight, as two
plain lists.** Not a progress bar. Not a completeness percentage. Not a red
warning. The unknown column is a legitimate, calm, first-class part of the
screen.

**INVARIANT — an unknown is named in the host's words, as a thing, not as a
missing field.** `Guest list and RSVPs`, not `guests: null`.

**INVARIANT — the icon carries the state** (filled check versus hollow ring),
and the type weight does not change between the columns. Unknown is not
de-emphasised; it is differently marked.

**INVARIANT — `More?` is a real row.** The product admits its own list may be
incomplete. That is the opposite of a dashboard that implies it has counted
everything.

This is the strongest single piece of evidence that the current implementation's
**"Accounted for" / "Still unknown"** split is family-resembling rather than
invented — and the strongest argument that People's needs block belongs in this
grammar rather than in a warning register.

---

## 7 · LIST-ROW GRAMMAR

Measured off Place and Vendors, where the family actually renders lists of
things:

```
┌────────────────────────────────────────────────────────┐
│ ┌────────┐  Freedom Hall                               │
│ │ photo  │  Charleston, WV · 90–200 guests             │   [View details →]
│ │ 56–64  │  [Indoor] [Full service] [Parking]          │
│ └────────┘                                             │
└────────────────────────────────────────────────────────┘
```

**INVARIANT — a row is a bordered card, not a hairline divider.** ~76px at
desktop, ~85px at mobile, 8px gaps between rows.

**INVARIANT — the name is serif.** Everything else in the row is sans.

**INVARIANT — a row carries exactly three tiers**: identity (media + serif
name), one meta line of facts separated by `·`, and chips for qualities. A
right-hand affordance (`View details →` button at desktop/tablet, circular arrow
at mobile) is the fourth element and is always on the right edge.

**INVARIANT — chips are nouns or short qualities, never verbs and never
counts.** `Best overall fit`, `Scenic setting`, `Most distinctive`, `Indoor`,
`Full service`. One chip per row may be an evaluative badge; the rest are facts.

**INVARIANT — the row is the same object at every breakpoint.** Mobile shrinks
the media tile and drops chips; it does not become a different row type. (The
implementation already learned this the hard way: stripping desktop rows to
dividers gave one object two row grammars, and the parity loop caught it.)

**ACCIDENT — the numbered `01 / 02 / 03` treatment** on sheet 2's direction
cards. That is a three-option *choice* presentation, not list grammar.

**[TRANSFERRED] — a guest row is a row of this family.** What a guest row's
media tile is, when there is no photograph of a guest, is **not answered by the
family and must not be invented**: no guest image may be inferred, and no
photograph may be attached to a named guest unless the data establishes it. The
implementation's initials treatment is a reasoned substitution, not a reference
match, and this document does not promote it to doctrine.

---

## 8 · THE COMMAND CENTRE AND DOMAIN STATUS

"Your Event" is the product's home, and it appears in three forms across the
family — a photographic tile grid (sheet 4 ·5), a flat tile grid (sheet 1 ·5),
and a vertical list with chevrons (sheet 6 ·4).

**INVARIANT — every domain shows three things: its name, a status, and a
one-line "what's next here".** `People · Not started · Guest list`;
`People · In progress · Invitations and RSVPs`; `Money · On track · Set budget`.

**INVARIANT — status vocabulary is small and plain**: `Not started`,
`In progress`, `On track`, `Confirmed`, `Ready`, `Active`. Plus one quantified
form when a real count exists: `People — 52 confirmed`.

**INVARIANT — the command centre never shows a completion percentage, a score,
or a gauge.** It shows states and a next line.

**VARIANT — tile grid versus list.** Both ship in the family. The grid is a
desktop treatment; the list is what the smaller frames use.

**INVARIANT — one domain, one door.** There is no second entry to People
anywhere in the family — the nav item, the bottom tab and the command-centre
tile all lead to the same place. This is the reference agreeing with the
repository's existing Duplicate Surface Rule.

---

## 9 · WHAT THE FAMILY IMPLIES ABOUT PEOPLE  *(all [TRANSFERRED])*

Derived from §§1–8 plus People's own measured truth. Stated as implications so
that a later reader can see the inference rather than mistaking it for a
measurement.

1. **People is a domain of the same rank as Place**, with a plate, a statement,
   a stepper-or-equivalent orientation, a `YOUR NEXT MOVE` band and a working
   field. It is not a settings screen and not a CRM table.
2. **People's dominant truth is a number whose trustworthiness is the question.**
   Place's dominant truth is a place, so Place's plate can carry the decision.
   People's decision cannot live in a photograph, so the attendance statement is
   the first thing in the operational field, not in the plate. (The family has a
   precedent for a domain re-weighting its own hero: the day-of board demotes its
   clock so the moment's name stays the hero.)
3. **People's unknowns belong in the "Still unknown" grammar** (§6), calm and
   co-equal with what is known — not in a warning or alert register.
4. **People's One Move carries its consequence**, in the ladder's own idiom:
   the measured `Why` for People in the family is *"Drives RSVPs, seating and
   final headcount"*, which is exactly what the engine's cascade already does.
5. **People's outbound effects are announced as unlocks** (§5), not as new work.
6. **A guest is a row of the family's row grammar** (§7), with the open question
   of what fills the media tile left open rather than invented.
7. **People's journey is accumulation-with-a-balance, not a funnel** (§3).

Anything beyond these seven is judgement against an analogous domain and should
be labelled as such wherever it is asserted.

---

## 10 · OPEN CONFLICTS BETWEEN THE FAMILY AND PRODUCTION DOCTRINE

Recorded, not resolved. Resolving any of these is an owner decision.

| # | The family does | Production doctrine says | Status |
|---|---|---|---|
| 1 | **Brass / amber (`≈#E8C07A`) is the action accent in dark theme**; light theme's primary button is near-black | Owner decision 2026-10-20: *steel blue `#4c6675` is the identity accent*; the `palette.js` ban on `#f0bc44` / `#e08c38` stands | **Unresolved.** Palette variants A/B/C exist as a review instrument; Variant B is the reference's own brass, Variant C is production steel on a warm neutral field. All three measured AA-clean in both themes. |
| 2 | The operational field is **warm ivory in every light frame** | *"Do not force warm ivory light surfaces"* (2026-10-20); *"warmer light neutral is the preferred direction… do not change production doctrine until the evidence is complete"* | **Narrowly reconciled:** plate dark in both themes, field takes the theme's own surface. Recorded in `PEOPLE_VISUAL_PARITY.md §4`. |
| 3 | A persistent **`✦ Ask NGW`** affordance sits in the top nav (sheets 2, 8) | No such capability exists, and `06_AI_GROUNDING_NO_FAKE_INTELLIGENCE` forbids a surface that implies one | **Out of scope and must stay out.** Rendering this chrome without the capability behind it would be the exact failure the AI-grounding skill names. |
| 4 | Every plate is a **photograph of this event** | Host-supplied cover media is a product requirement; the media pipeline is **not** authorized for implementation | **Bounded gap.** Fixtures are review-only and must be visibly labelled; no fixture may masquerade as persisted truth. |
| 5 | Rows carry **photographs of venues**; by extension a People row would want a face | *No guest image may be inferred*; no photograph may be attached to a named guest without data establishing it | **Permanently constrained.** This is a product rule, not a gap to close. |
| 6 | Mobile shows the statement **over** the photograph (sheets 2, 5); the earlier set stacks it **below** | — | **Open choice** (see §2 VARIANT). |

---

## 11 · HOW TO USE THIS DOCUMENT

- A claim marked **INVARIANT** may be cited as a rule. Breaking one needs a
  recorded reason.
- A claim marked **VARIANT** may not be cited to settle an argument. It means
  the family left the choice open; decide it on the product's own grounds.
- A claim marked **ACCIDENT** may not be cited at all.
- A claim marked **[TRANSFERRED]** is an inference from an analogous domain. It
  is good enough to build against and **not** good enough to call parity.

**The limit, restated so it cannot be lost:** there is still no People sheet.
Visual acceptance of a People surface against this family is acceptance of
*family resemblance*, never of parity, until a People sheet exists. That
distinction belongs in every report that scores People against these images.
