# NGW PRODUCT EXPERIENCE REFERENCE

**Phase D of the First Production Calibration Slice. Written 2026-10-20.**

A durable interpretation of the owner-supplied concept-image family. Its job is
to say what the family **means** as a product, so that later work argues against
a written principle instead of re-squinting at a JPEG.

Its second job is to refuse to turn accidents into doctrine. Every section below
is split into **INVARIANT** (holds across the family and is therefore a rule),
**VARIANT** (the family does it more than one way, so the choice is open), and
**ACCIDENT** (appears once or twice and carries no authority).

### Required records — where each one lives

| Record | § |
|---|---|
| Product thesis | 1 |
| Creation journey | 12 |
| Your Event role | 8, 13 |
| Domain-journey pattern | 3 |
| One Move pattern | 4 |
| Reasoning pattern | 14 |
| Decision / consequence pattern | 5 |
| Photography rules | 15 |
| Typography hierarchy | 16 |
| Colour / material rules | 17 |
| Light / dark relationship | 2, 17 |
| Responsive principles | 18 |
| Navigation principles | 19 |
| Density principles | 20 |
| Action hierarchy | 21 |
| Anti-patterns | 22 |
| Precedence rules | 23 |

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

---

## 12 · THE CREATION JOURNEY

Five sheets render it (1, 3, 4, 6, 7), in both themes, at every breakpoint. It
is the most heavily repeated thing in the whole family, which is how you know it
is the product's spine rather than one exploration.

```
CREATE → UNDERSTAND → CLARIFY → REVEAL / INITIAL PLAN → YOUR EVENT
```

### 12.1 · CREATE is natural-language first

**INVARIANT — the primary input is a paragraph, not a form.** Every single
Create frame leads with *"Tell me about your event"* and a free-text area
pre-filled with prose the way a person would actually say it:

> *"Wanda's 50th birthday and 30-year Army retirement, about 75 guests in the
> Maryland/DC area, black and gold, formal Army recognition followed by a
> celebration, food, bar, DJ and photography, budget $5,000."*

**INVARIANT — the deck gives permission**: *"Share it however you'd describe it
to a friend. You don't need to know all the details yet."* The product's first
sentence to a new host removes a precondition rather than imposing one.

**INVARIANT — structured entry is a fallback, and is visibly subordinate.**
It appears as *"Or enter the details yourself"* / *"I'd rather enter the details
myself"* — a quiet text link under the primary button, never a peer tab.

**INVARIANT — the supporting affordances are three and only three**: a filled
primary (*Build my event →*), an attach control (*Add a file or inspiration*),
and a microphone. Plus a row of event-type chips (Birthday · Wedding ·
Retirement · Reunion · Cookout · Something else) which **seed** the paragraph
rather than replacing it.

**ACCIDENT — the chip list's exact membership.** It differs between sheets
(`Corporate` appears in sheet 4, `Cookout` in sheets 1 and 7). The count and the
*Something else* escape hatch are the invariants.

### 12.2 · UNDERSTAND shows its work

**INVARIANT — four things are distinguished, and the distinction is the
feature:**

| | How it renders |
|---|---|
| What NGW understood | the `Your event` fact list — event type, date, guests, location, budget, style, summary |
| What is still unknown | the `Still unknown` column, hollow icons, named in plain language |
| What the host wants | the `You want` column, filled icons |
| What the host can correct | an `Edit` affordance on the fact block, and *Not quite right* / *Make changes* beside *Looks right →* |

**INVARIANT — the two-column `You want` / `Still unknown` layout is the
product's native way of holding a gap** (§6), and `More?` is a real row, because
the product admits its own list may be incomplete.

**INVARIANT — the confirm action is a judgement, not an acknowledgement.**
*Looks right →* asks the host to agree, and *Not quite right* is its equal peer,
not a cancel.

**[TRANSFERRED] — "what was heard but could not be applied" is the one of the
four that the family does NOT show** as a distinct zone. The repository has the
capability (`heardNotUsedFor`, rendered at the plan stage as *"You said this,
and the plan doesn't hold it"*). Its absence from the reference is an absence,
not a prohibition.

### 12.3 · CLARIFY asks only consequential questions

**INVARIANT — every question states why it is being asked.** *"The date changes
venue availability, pricing and how quickly you need to start."* / *"This helps
us find the right venues, plan the schedule and match the right vendors."*

**INVARIANT — the frame is short and says so.** Sheet 6 shows `3 of 6`; sheet 3
shows two questions total. It is never a questionnaire.

**INVARIANT — a question's options are photographic where the answer is a
feeling** (Formal / Balanced / Casual rendered as three images) **and plain
where the answer is a fact** (a date picker). Tone is shown; data is typed.

**INVARIANT — Back is always present and is quiet.**

### 12.4 · REVEAL gives a plan, not a congratulation

**INVARIANT — the reveal is a plan with priority next steps**, not a success
screen. Even where a check mark appears (sheet 3), the content below it is
`Top Priorities` / `Priority next steps` — four or five concrete actions, the
first tagged `Highest impact`.

**INVARIANT — the event's own identity leads**: name, date, guest count,
location, budget, style — the facts the host just gave, handed back.

**INVARIANT — one filled primary out**: *Open Your Event →* / *View full plan →*.

---

## 13 · THE ROLE OF "YOUR EVENT"

**INVARIANT — Your Event is the command centre and the product's home.** It is
where every journey returns and where the next move lives.

Its anatomy, constant across sheets 1 ·5, 3 ·6, 4 ·5, 6 ·4 and 7 ·6:

1. **Event identity** — name, date, guest count, area, and a `View details →`.
2. **The next move**, in a dark photographic band: `YOUR NEXT MOVE` eyebrow,
   serif statement, one deck line, a filled CTA and a quiet *See why this
   matters*.
3. **The domains**, each with name, status and a one-line *what's next here*.

**INVARIANT — Your Event never duplicates a domain's interior.** It states each
domain's status and routes. It is a table of contents with intelligence, not a
dashboard that reproduces the pages beneath it.

**INVARIANT — the One Move at Your Event level is the same single authority as
the One Move inside a domain.** Sheet 7's ladder makes this explicit: `Your
Event` is the first card of the same seven-card strip as `Food`, `People`,
`Team`. One prioritiser, consulted at two altitudes.

---

## 14 · THE REASONING PATTERN

The family exposes its reasoning in four named forms, and they are all the same
object at different moments:

| Label | Where | What it does |
|---|---|---|
| **Why we're recommending this** | after a recommendation | justifies the option set |
| **Why we're asking** | beside a question | justifies the interruption |
| **Why this works** | after a selection | justifies the fit, as a checklist |
| **Why:** | on every One Move card | names the domains the move unblocks |

**INVARIANT — reasoning is a quiet tinted band with a glyph, never a card and
never a modal.** It sits directly under or beside the thing it explains and
carries no action of its own.

**INVARIANT — reasoning is one or two sentences.** *"Your event needs enough
structure to keep planning manageable without making the celebration feel
generic."* It is not a derivation and not a confidence score.

**INVARIANT — reasoning references the host's own inputs**, not the system's
internals: guest count, priorities, style, budget. No model talk, no percentages,
no "based on similar events" without evidence.

**🔴 THE RULE THAT OVERRIDES THE PATTERN:** reasoning may only be shown where
existing intelligence actually supports it. **Fabricating a rationale to fill
this band is the single most tempting failure this family invites**, and it is
forbidden outright by `06_AI_GROUNDING_NO_FAKE_INTELLIGENCE`. Where the engine
has a `because`, show it. Where it does not, show nothing — not a plausible
sentence.

---

## 15 · PHOTOGRAPHY RULES

**INVARIANT — photography is structural, not decorative.** It appears in exactly
four roles, and nowhere else:

| Role | Example |
|---|---|
| The **plate** behind a domain's statement | every domain hero |
| The **subject** of a list row | a venue's own photograph |
| A **choice between tones** | Formal / Balanced / Casual |
| The **event's identity** at Your Event | the cover |

**INVARIANT — the plate's photograph is always dark enough to carry type**, and
the type sits in the frame's quietest third.

**INVARIANT — a photograph always depicts the thing it labels.** A venue row
shows that venue. A tone choice shows that tone. There is no stock imagery used
as texture.

**INVARIANT — photographs are warm, low-key, candle-lit or dusk.** The palette
of the imagery and the palette of the interface are the same palette.

**🔴 THE CONSTRAINT THE FAMILY CANNOT SEE.** The family's rows carry photographs
of *venues*. A People row would, by the same grammar, want a face. **No guest
image may be inferred, and no photograph may be attached to a named guest
unless the data explicitly establishes that relationship.** This is a permanent
product rule, not a gap to close. The implementation's initials treatment is a
reasoned substitution and this document does **not** promote it to doctrine.

**Bounded gap:** `event.coverImageUrl` has no writer in the repository. Until
the media pipeline is authorized, a plate's photograph is a visibly-labelled
review fixture or nothing — and a fixture must never masquerade as persisted
truth.

---

## 16 · TYPOGRAPHY HIERARCHY

Four registers, and they never trade jobs:

| Register | Used for | Treatment |
|---|---|---|
| **Caps eyebrow** | the domain or state name — `VENUE`, `YOUR NEXT MOVE`, `COMPARE`, `INITIAL PLAN` | small, letterspaced, quiet; **11px floor** |
| **Serif display** | the statement — *"Find the right setting for the event"*, *"Freedom Hall is your venue"* | two lines maximum, generous leading, never a sentence of utility text |
| **Serif name** | the identity of a listed thing — a venue, a person | one weight, one size, inside the row |
| **Sans utility** | everything operational — decks, meta lines, chips, labels, buttons, tables | restrained, one or two weights |

**INVARIANT — the serif is for identity and statement only.** A serif button, a
serif chip or a serif table cell would break the system.

**INVARIANT — emphasis is made with size and space, not with weight.** The
family almost never uses bold sans for hierarchy; it uses a bigger serif and more
room around it.

**INVARIANT — a figure is a display-register object**, not a bold number in a
paragraph.

**ACCIDENT — the exact serif.** The sheets are generated imagery; the production
register is already fixed (`--serif-read` Newsreader for the host's human voice,
`--serif` Playfair reserved for guest stationery and doctrine-locked). Matching
the mock's letterforms is not a goal; matching its *role assignment* is.

---

## 17 · COLOUR AND MATERIAL RULES

**INVARIANT — two planes, and the relationship between them is the system.**
A dark photographic plate over an operational field. The plate is dark in both
themes; the field takes the theme.

| | Light | Dark |
|---|---|---|
| Plate | dark photographic | dark photographic |
| Field | warm ivory / paper | near-black / charcoal |
| Panels | lighter than the field | lighter than the field |
| Text | near-black | warm off-white |
| Primary action | near-black fill, light label | brass fill, dark label |
| Accent | restrained brass / warm gold | restrained brass / warm gold |
| Borders | thin, warm, low opacity | thin, warm, low opacity |

**INVARIANT — the surface ladder only ever goes one way**: page → panel → card
gets lighter, in both themes. Inverting it was shipped once and produced a phone
screen where the panel and the sheet were both pure white and the operational
field had no plane at all.

**INVARIANT — one accent system.** Brass is the accent. A second decorative
accent alongside it is forbidden — that prohibition is what the `palette.js` ban
on `#f0bc44` / `#e08c38` exists to enforce, and it survives whichever single
accent is chosen.

**INVARIANT — colour never carries state alone.** Every status chip carries a
word.

**INVARIANT — material is flat.** Thin warm borders and quiet separators do the
dividing. Shadows are not a hierarchy device; there are no gradients used as
"intelligence" styling.

**🔴 Recorded supersession.** The 2026-10-20 decisions (*steel blue `#4c6675` is
the identity accent*; *do not force warm ivory*) are contradicted by the
calibration-slice assignment's own §5 and §7 (*warm ivory working surfaces*,
*restrained brass / warm gold accents*). The newer instruction is written into
the table above; the conflict is flagged in `PEOPLE_PRODUCT_CONTRACT.md`
Appendix B rather than resolved silently.

---

## 18 · RESPONSIVE PRINCIPLES

The family states its own, in captions, on sheet 2:

> **Desktop** — *"Full planning experience with side-by-side comparisons and detailed information."*
> **Tablet** — *"Focused planning with the same core experience, optimized for touch."*
> **Mobile** — *"Key actions and next steps, beautiful and easy to use on the go."*

**INVARIANT — mobile is a composition, not a reduction.** Sheets 5, 8 and 9 draw
mobile at full size beside desktop, not as a thumbnail. The phone frames are
labelled `390 × 844` and the tablet frames `1024 × 1366`; these are designed
viewports.

**INVARIANT — no capability disappears at a narrower width.** What changes is
what *leads* and what is *disclosed*.

**INVARIANT — comparison is the thing desktop earns.** The side-by-side matrix
exists only at desktop and tablet; at mobile the same information becomes a
sequence of cards. That is the clearest statement in the family about what width
is actually for.

**INVARIANT — the order of the argument never changes.** Plate, orientation,
next move, working content. Every breakpoint tells the same story; wider ones
tell more of it at once.

---

## 19 · NAVIGATION PRINCIPLES

**INVARIANT — one domain, one door.** The top-nav item, the mobile tab and the
command-centre tile all lead to the same surface. There is no second entry to a
domain anywhere in the family.

**INVARIANT — the top nav is the domain list**: `Your Event · Place · People ·
Food & Drink · Team · Money · Schedule · The Day`. It is flat. There are no
sub-menus and no nesting.

**INVARIANT — the domain's own journey is navigated by the stepper**, not by the
global nav. Global nav moves between domains; the stepper moves within one.

**VARIANT — the nav's exact membership and labels.** Sheets 2 and 8 show a
shorter `Overview · Venue · Planning · Vendors · Timeline`; the rest show the
eight-domain form. The eight-domain form is the product's own and the shorter
one is an exploration.

**ACCIDENT — `✦ Ask NGW` in the top bar** (sheets 2, 8). **This must not be
built.** No such capability exists, and rendering the chrome for one would be
exactly the failure `06_AI_GROUNDING_NO_FAKE_INTELLIGENCE` names.

**🔴 RECONCILIATION REQUIRED — bottom navigation.** Sheets 2, 5 and 8 put a
persistent bottom tab bar on mobile (`Home · Plan · Chat · Progress · More`, or
`Event · Place · People · More`), with People as a destination. **Host V2 ships
Nav B, which the owner ruled is the mobile navigation authority and which does
not have one.** The assignment's own instruction is to reconcile, not copy.

> **The reconciliation:** adopting a bottom bar is a **shell** decision taken
> once for every domain. People does not get to introduce one for itself. What
> People *does* require is that it is reachable as a first-class destination
> from whatever Nav B exposes — which it already is.

---

## 20 · DENSITY PRINCIPLES

**INVARIANT — one screen makes one argument.** Every frame in the family has a
single dominant statement and everything else is subordinate to it. There is no
frame in which four things compete.

**INVARIANT — generous spacing is the premium signal.** The family's rhythm is
large: ~32px content margins at desktop, 8px between rows, substantial air
around every statement. Density is bought with hierarchy, never with compression.

**INVARIANT — information is tiered, not flattened.** A row has three tiers; a
screen has a lead, a working body and a tail. A grid of twelve equal-weight
cards does not appear anywhere in the family — the command centre's tile grid is
the closest thing, and every tile there carries the same three fields in the
same order, which makes it a *list in two columns*, not a card wall.

**INVARIANT — chips are nouns, and few.** One evaluative badge per row at most;
the rest are facts. No chip is a verb and no chip is a count.

**INVARIANT — empty is calm.** `Still unknown` is a first-class column at equal
weight with `You want`, not a warning. The product's posture toward its own
ignorance is the opposite of an alert.

---

## 21 · ACTION HIERARCHY

**INVARIANT — exactly one filled primary per screen.** Across every frame in the
family, there is never a second filled button competing with the first.

| Tier | Treatment | Example |
|---|---|---|
| **Primary** | one filled button, high contrast, often full width at mobile | `Build my event →` · `Explore this direction →` · `Open Your Event →` |
| **Secondary** | outlined or quiet text, side by side | `See why this matters` · `Not quite right` · `View details →` |
| **Tertiary** | plain text links, inside folds | `Or enter the details yourself` |
| **Destructive** | its own register, never adjacent to the primary | `Remove ×` on the comparison columns |

**INVARIANT — the primary is the One Move whenever a move exists.** The
product's recommended action and the screen's dominant button are the same thing.

**INVARIANT — a row's action is on the right edge** and is the same affordance
for every row (`View details →` at width, a circular arrow at mobile).

**INVARIANT — Back is always quiet and always present** in a journey.

---

## 22 · ANTI-PATTERNS

Absent from the family by construction. Their absence is as informative as
anything present, and each one is a thing a well-meaning implementation would
otherwise add:

| Not in the family | Why it would break it |
|---|---|
| A progress bar or completion percentage | The product states *what is unknown*, not *how done you are* |
| A score, gauge, rating dial or health meter | Manufactures certainty the runtime does not have |
| A grid of equal-weight cards | Every frame makes one argument |
| Endless boxed widgets | Material is flat and tiered |
| Excessive pills and badges | One evaluative chip per row, the rest are facts |
| Neon, gradients-as-AI-styling, glow | The palette is warm, low-key and photographic |
| Random shadows | Shadows are not a hierarchy device |
| "AI assistant" chatter | Reasoning is one quiet band attached to one decision |
| A sortable data table | A list of things, not a database view |
| Two filled primaries | §21 |
| A desktop layout scaled into a phone | §18 |
| Information density without prioritization | §20 |
| A zero-card (*"No needs yet"*) | Empty is absence, not a card |
| A modal for reasoning | Reasoning sits beside its subject |
| Generic startup / admin-dashboard aesthetic | The target is a premium editorial planning service |

---

## 23 · PRECEDENCE WHEN THE CONCEPTS DISAGREE

The family contains intentional exploration and real contradictions. They are
not averaged. This is the order, and it is the assignment's own:

| Rank | Authority | Beats |
|---|---|---|
| **1** | **Runtime truth / accepted architecture** | every mockup assumption |
| **2** | **Accepted NGW product doctrine** | a concept's behaviour |
| **3** | **Creation: natural-language-first** | any structured-entry-first reading |
| **4** | **The domain-journey pattern** — Venue's `Direction → Discovery → Compare → Inquiry → Selected → Operational` is the strongest mature reference, **but stages must fit the domain** | a stage imposed to complete a stepper |
| **5** | **The cinematic / editorial responsive Venue family** | any other visual treatment in the set |
| **6** | **Dedicated desktop / tablet / mobile compositions** | a scaled desktop |
| **7** | **Intelligence — One Move, reasoning, consequence** | conventional dashboard or progress UI |

**And one rule that sits above all seven:** a capability the runtime does not
have is not created to satisfy any of them. A stepper stage with no capability
behind it, a reasoning band with no `because`, a consequence the engine does not
produce — each is a concept winning an argument it is not entitled to win.
