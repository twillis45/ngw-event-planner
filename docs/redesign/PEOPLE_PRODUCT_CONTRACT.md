# PEOPLE — PRODUCT CONTRACT

**Phase A of the First Production Calibration Slice. Written 2026-10-20.**

What People **is**, in product terms, before anyone argues about pixels. Every
claim here is either measured against the code at `d36740f` or marked as a
judgement.

| | |
|---|---|
| Branch | `main-2utz0n` |
| Stated baseline | `132af4f` (Sprint 0.5 close) |
| Actual HEAD | `d36740f` — **19 People commits past the stated baseline** (see §23) |
| Capability evidence | `docs/redesign/PEOPLE_CAPABILITY_PARITY.md` (Phase B), measured at HEAD |
| Visual evidence | `docs/redesign/NGW_PRODUCT_EXPERIENCE_REFERENCE.md` (Phase D), 12 sheets |
| Supersedes | `docs/architecture/redesign/PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md`, which is stale at HEAD (§22) |

---

## 1 · THE USER OUTCOME

**A host stops guessing how many people are coming, and knows which part of that
number she can act on.**

Not "manage guests." Not "track RSVPs." The outcome is a *defensible number*
plus a *clear boundary around what is still unknown*, because every downstream
commitment the product makes — food, seats, beds, money, the caterer's brief —
divides by that number, and a number of unknown provenance is how a host ends up
telling a caterer 40 when she meant *maybe 40*.

People has succeeded when the host can say out loud, without opening anything:

> *"Seventy-five, give or take. Fifty-two of them have actually said yes. Three
> people need step-free access and I know who two of them are. The thing I
> should do next is send the list to the people who haven't answered."*

People has failed — regardless of how it looks — if the host would say any of:

- *"I don't know if that number is mine or the app's."*
- *"It says confirmed, but nobody's replied."*
- *"I set the kids count and it disappeared."*
- *"It told me someone needs a walker. Who?"*
- *"I typed the name wrong and now I have to delete the whole person."*

Three of those five are measured defects at HEAD (§20).

---

## 2 · JOBS TO BE DONE

Ranked by how often the measured engine is asked for them.

| # | Job, in the host's words | Triggered when | Done when |
|---|---|---|---|
| J1 | *"How many should I plan for?"* | Any time money, food or space is being decided | A single figure is on screen with its basis and its owner |
| J2 | *"Is that number real?"* | Before committing to anything outward | Provenance is stated without being asked for |
| J3 | *"Who hasn't answered?"* | After invitations go out | The quiet ones are one tap away, counted |
| J4 | *"Get me more replies."* | Whenever the balance is non-zero | A specific, truthful route to asking — not a claim of having asked |
| J5 | *"Who's bringing whom?"* | Seating, catering, lodging | Plus-ones and children are visible per person and counted as people |
| J6 | *"What do people need?"* | Access, diet, logistics | Needs listed, with named owners where known and *no owner invented* where not |
| J7 | *"Did I tell everyone?"* | Between send and reply | A told/not-told rollup over reachable guests |
| J8 | *"Fix this one person."* | Typos, changes, removals | Any field editable in place, reversibly |
| J9 | *"What does this change?"* | After replies land | The affected domains are named, not re-decided here |
| J10 | *"What should I do next?"* | Always | Exactly one move, with its consequence |

**J8 is partially unserved at HEAD**: a guest's *name* cannot be edited
(§20 G1). **J5's children path is actively lossy** (§20 G2).

---

## 3 · THE NATURAL PEOPLE JOURNEY

The reference family gives every domain a numbered journey. **People's journey
is not Place's.** Place is a funnel — many options narrow to one choice. People
is an *accumulation against an outstanding balance*, and its truth arrives from
outside the host.

Measured against the engine, People has five real states, and the host can be in
more than one at once because a roster and a headcount can coexist:

```
1  NOBODY YET          no roster, no count
       ↓   she states a number, or we substitute one
2  A NUMBER            a figure exists; provenance decides whose
       ↓   she adds names
3  A LIST              rows exist; the count can come from them
       ↓   she asks
4  ASKED, WAITING      invitations are out; a balance is outstanding
       ↓   replies land
5  SETTLING            yeses accumulate; the balance shrinks toward zero
```

**This is a ladder, not a wizard.** The host can enter at any rung, skip rungs,
and go backwards (reopening a locked count). Nothing in People may *block* on a
prior state, and nothing may present these as steps to complete. A host who will
only ever count heads and never collect names is at rung 2 forever and that is a
legitimate finished state — the engine already encodes this as
`guestPlanningMode: 'count_only'`, and its own rule is **suppression hides
pressure, never data**.

**Judgement, flagged:** whether this ladder is *drawn* (a stepper, per the
reference's domain spine) or merely *implied* by what the surface says is a
design decision deferred to Phase C. Drawing it risks implying a wizard that
does not exist; not drawing it costs People the family's orientation device.

---

## 4 · ENTRY STATES

People is reached from five measured doors, all of which land on the same single
surface (`sheet.kind === 'guests'`). The entry decides what is *focused*, never
what is *available*.

| Door | Measured at | What the host was doing | What must lead |
|---|---|---|---|
| Nav — "Guest list · guests & RSVPs" | `HostShellV2:25018` | Deliberate navigation | The attendance truth |
| Command-centre tile / domain list | `:11779` | Surveying the whole event | The attendance truth |
| One Move CTA from elsewhere | `:7142` | Acting on the plan | The thing the move named |
| Voice — "guests" | `:8609` | Hands-free | The attendance truth |
| Deep link `sheet.focus: 'entry' \| 'invites'` | `:4657-4682` | Returning to a specific job | The focused block, scrolled to |

**Contract:** there is **one People door.** Five routes, one surface. No second
guest screen, no modal variant, no "quick add" surface that becomes a parallel
list. This is the Duplicate Surface Rule and the reference agrees with it (§8 of
the Experience Reference: nav item, bottom tab and tile all lead to one place).

**Contract:** an entry may scroll and may open a disclosure. It may never
*remove* a block from the surface, because a host who arrives by one door and
then wants the other job must not have to leave and re-enter.

---

## 5 · ATTENDANCE TRUTH STATES

The single most important semantics in People. `attendanceBand(event).basis`
takes exactly three values, measured at `src/lib/playbooks/index.js:600`.

| `basis` | Reached when | What is true | What the host may be told |
|---|---|---|---|
| `'estimate'` | A figure exists, nobody has replied, it is not locked | A planning figure, provenance decides whose | *"We'd expect N on the day"* — and, when it is not hers, that we filled it in |
| `'count'` | The host gave or locked a number | **Her** number, firm | *"The number you set"* / *firm* / *settled* |
| `'rsvp'` | A roster with real replies | `confirmed` is genuinely people who said yes | *"N have said yes"*, and what is still out |

### 🔴 THE FIELD THAT MEANS TWO THINGS

Measured at `playbooks/index.js:708-711` and `:721-723`:

| `basis` | `band.confirmed` is | Which actually means |
|---|---|---|
| `'rsvp'` | yeses + their plus-ones + confirmed rows' kids | **people replied** |
| `'count'` | **`n` — the host's own number, with nobody having replied at all** | **the number is firm** |
| `'estimate'` | `0` | nothing is confirmed |

A surface that renders `band.confirmed` behind *"N have confirmed they're
coming"* is **truthful on `rsvp` and a lie on `count`.** This is the
repository's named recurring defect — one field, two meanings — and it is the
single assertion most worth a permanent test.

**Contract:**

1. The attendance block **branches on `basis` before choosing the word for
   `confirmed`**. "Confirmed" as a reply-word is reserved for `'rsvp'`.
2. On `'estimate'`, `confirmed` is `0`, so the only figure worth showing is
   `planning`, and it may never wear a confirmed label.
3. There is **one** attendance authority. `attendanceBand()` is it. No
   `attendanceFor()`, no per-surface re-derivation. *(At HEAD the legacy hero
   violates this with a third derivation at `:23470-23472` — §17 G5.)*
4. Developer words never reach the screen: `basis`, `countSource`,
   `countFromHost`, `guestMode`, `planning`, `applicable`.

---

## 6 · PROVENANCE STATES

Provenance is *whose number it is*, and it is orthogonal to basis.

| State | Field | Measured meaning | Outward gate |
|---|---|---|---|
| Host-given | `guestCountSource: 'host'`, `countFromHost: true` | She said it or adopted it | **May** leave the app |
| App-substituted | `guestCountSource: 'playbook-typical'`, `countFromHost: false` | We filled it in from what this kind of event usually runs | **May not** leave the app |
| Unknown (legacy) | field absent | Pre-dates the field | Treated as **hers**, deliberately |

The legacy ruling is recorded and stands: *"treating unknown as derived would
withhold real headcounts from real vendor briefs, a worse failure, and a silent
one."*

**Contract:**

1. **Provenance is part of the attendance statement, not a footnote.** A host
   must not have to open anything to learn the number is not hers.
2. **An app-substituted number may never reach money, a vendor brief, an
   invitation, or a webhook.** The gate is `guestCountIsConfirmed()` and it is
   already honoured by `doItForMe`, `webhookService`, `hostSpending`,
   `budgetRecovery` and `vendorAccountability/conflicts`.
3. **Adopting a substituted number is a single, explicit act** that writes
   `guestCountSource: 'host'`. After it, the number is hers and the gate opens.
   There is no silent promotion.
4. `guestCountNotice()` — the sentence written for exactly this — **must be
   rendered on the People surface.** At HEAD it is computed and discarded there,
   and only the vendor draft sheet renders it (§20 G4).

---

## 7 · ROSTER SEMANTICS

| Concept | Measured rule |
|---|---|
| A row is a **person**, not a plate | `confirmedCovers` counts covers; `rosterHeadcount` and `seatsFor` agree |
| A filled `plusOne` is **a real adult** riding that row's answer | `attendanceBand` |
| A couple stated as "Denise & Ray" is **two rows** sharing a `coupleId` | `detectCoupleNames` → `addRoster`; suggest-and-confirm, never silent |
| Children are **counted, not listed** — `kids` per row, `kidsTotal` over rows | `writeGuest({kids})` |
| Only a **confirmed** row's children are locked in | `attendanceBand` |
| Groups are host-chosen free text with four suggestions, and grouping appears automatically at ≥2 distinct groups | `:24618-24625` |

**Contract — the one the repo has already paid for.** Recorded at
`HostShellV2:3880-3900`: `countResolutionRows` once offered *"Match confirmed
yeses (N)"* and patched that **row count** into `catererCount` — *"A host taking
the app's own suggestion would have told the caterer 5 and left two children
without a meal."*

> **People may show rows against rows, or plates against plates. It may never
> put a row count where a cover count belongs.** Reader for plates is
> `confirmedCovers`; for per-head division, `headsFor`.

**Contract:** a roster row is never created from anything but an explicit add —
not from a need, not from a reply that doesn't match, not from a CSV without a
preview the host confirmed.

---

## 8 · RSVP STATES

Per guest, measured: `Yes` · `Maybe` · `No` · *(none)*. Four states, and the
fourth is not a fifth thing called "pending" — it is the absence of an answer.

| State | May be counted toward | May never be counted toward |
|---|---|---|
| `Yes` | confirmed covers, seats, meals | — |
| `Maybe` | the **high** end of the band | the confirmed figure |
| `No` | the declined tally | anything else |
| *(none)* | the outstanding balance | any claim that they are coming |

**Contract:**

1. **A pending guest is never spoken of as coming.** Not in a total, not in a
   chip, not in a vendor-facing number.
2. **Reply pressure is gated on `showsReplyTracking(event)`; the roster is
   not.** A count-only host keeps her list visible and simply stops being
   chased. The engine's own rule: *suppression hides pressure, never data.*
3. **Replies that arrive are not a host edit.** They land via
   `patchEvent(…, { noUndo: true })` — *"real replies arriving isn't a host edit
   to undo."* A redesign that routes them through generic undo would offer the
   host an Undo that un-says what a guest said.
4. **A derived reply-by date is never stated as a date she set.**
   `rsvpDeadlineFor().source === 'derived'` is our own `event.date − 7d` guess;
   only `'override'` is hers. The product may *offer* to set one; until she
   taps, the invite stays silent.
5. **Nothing in this product ever claims to have sent.** Drafts open in the
   host's own composer; `sms:` / `mailto:` / `tel:` hand off to the OS. "Mark it
   sent — I sent it myself" is a host assertion, stored as one.

---

## 9 · NEEDS SEMANTICS

`accessNeedsFor(event)` returns requirements carrying `kind`, the host's
**verbatim phrase**, `source`, and `who` — which is `null` when the sentence
never named a person. `domainsFor()` then narrows reach: a requirement with no
`who` reaches **lodging only**, not seating, because you cannot seat a person
you cannot identify.

**Contract:**

1. **A known need with an unknown owner is a first-class, displayable state.**
   The product says what it holds, quotes her words, and says plainly that the
   person is not identified.
2. **No person is ever inferred.** The needs block may *read* `accessNeedsFor`
   and may **never write** `guests`.
3. **No diagnosis is ever inferred.** `healthNoted` owns health; a mobility aid
   is not evidence of a condition. `accessNeeds` has a test asserting no
   clinical term appears in its output.
4. **Needs are grouped by need, not repeated per person.** Five guests needing
   step-free access is one row with a "who" disclosure, not five identical
   sentences.
5. Dietary needs are free text per guest *and* structured allergen/diet tags.
   **The structured tags have no host writer at HEAD** — they arrive only from
   the guest's own reply or a CSV import (§20 G3).

---

## 10 · EXCEPTION STATES

States the surface must hold without breaking or lying.

| Exception | Measured behaviour required |
|---|---|
| A roster with 200+ rows | The list virtualises or paginates; the attendance block and One Move never move below the fold because the list is long |
| Names that are one character, or 80 | The row's three tiers hold; no overflow into the meta line |
| A guest with no contact details | Contact actions are absent, not disabled-looking; the told-rollup counts only reachable guests |
| Every guest has replied | The balance is zero; the chase block becomes a settled statement, not an empty card |
| Nobody has been invited yet | The ask is the dominant action; the balance is not framed as people ignoring her |
| A count-only event with no roster | The roster block is absent; the attendance block is the whole surface |
| A roster event counting by headcount | **Currently unreachable** — the stepper is hidden and "Use a different number" is suppressed (§20 G6) |
| A CSV with malformed rows | The preview states what read cleanly, what is new, what is a duplicate, *before* anything is written |
| The reply backend is unreachable | The share toast downgrades honestly; replies queue locally and merge on next read |
| A legacy event with no `guestCountSource` | Treated as hers, deliberately, per §6 |
| Two needs of the same kind from two sources | **Currently double-counts in lodging** (§20 G7) |

---

## 11 · ONE MOVE BEHAVIOUR

`eventPlan()` is the sole final next-action authority. People filters its output
for `domain === 'guests'`.

**Contract:**

1. **People never ranks.** It reads the plan and shows the first guest-domain
   action. There is no second prioritiser.
2. **One move, not three.** The reference's ladder is explicit about singularity.
3. **The move carries its consequence.** The reference's own People row is
   *"One Move: Build guest list → · Why: Drives RSVPs, seating and final
   headcount."* A move shown without its *why* is incomplete.
4. **A CTA is rendered only when there is a real destination.** If the move
   resolves to People itself, the statement stands without a button rather than
   offering a link to where the host already is.
5. **If the top action belongs to another domain, People shows no competing
   primary.** The surface states truth; the board keeps the move.
6. **A dismissed nudge stays dismissed** (`contextNudges`).

---

## 12 · CONSEQUENCE BEHAVIOUR

People's outbound effects are measured and real: replies drive food, shopping,
seating, money and re-ranking (the GOLD-07 chain); access needs reach lodging;
a step-free need raises a venue question answered in Venue.

**Contract:**

1. **A consequence names the affected domain and states the effect in one
   clause.** It does not re-decide the thing here.
2. **Consequences are stated as unlocks, not chores** — *"seating capacity can
   now be planned"*, matching the reference's own idiom.
3. **People explains; the board still ranks.** A consequence surfaced in People
   never becomes a second to-do list.
4. **No consequence is claimed that the engine does not produce.** In
   particular, an unowned need reaches lodging only, and People must say so
   rather than implying seating.

---

## 13 · EDITING AND UNDO

`patchEvent` (`HostShellV2:6844`) is the single write path. When a toast message
is passed and `opts.noUndo` is unset, it snapshots the pre-patch value of every
key it writes and offers an Undo that replays them.

| Covered by undo today | Not covered today |
|---|---|
| Add names · remove a guest · set a reply · meal · kids ± · CSV apply · import undo · counting mode · invite rules · gift wish · invite look · reply-by · mark-told | **Every `writeGuest(i, patch, null)`** — plus-one, dietary needs, phone, email, group, gift-received (no toast, so no undo) · incoming replies (deliberate) · `clearImportHistory` (localStorage, not an event write) · `setPatch({})` at `:17716` (bypasses `patchEvent` entirely) |

**Contract:**

1. **Every host edit goes through `patchEvent`.** No component state holds
   business truth; no write bypasses the path.
2. **Every *destructive or surprising* host edit is undoable.** Removing a
   person is. Changing a phone number arguably need not be — but the current
   split is an accident of which call sites pass a message, not a decision.
   **Phase C must make it a decision.**
3. **No optimistic UI.** Nothing claims a write landed that has not.
4. **A guest's reply is theirs.** The host may change it; the product must not
   present that as correcting the guest.

---

## 14 · MOBILE BEHAVIOUR (< 640px)

Mobile is the flagship. The reference's own caption: *"key actions and next
steps, beautiful and easy to use on the go."*

**Contract:**

1. **Order is fixed and is the product's argument**: the plate → the attendance
   truth → the one move → the ask → the list → the needs → the tools.
2. **Operational content is reachable in the first viewport.** The plate may not
   consume the whole screen.
3. **No capability is removed.** Depth collapses into disclosures and folds; it
   does not disappear. (The administrative tail — invite look, counting mode,
   CSV, past imports — is subordinated into one fold, not deleted.)
4. **A guest's detail opens inline, in place**, because there is nowhere else
   for it to go. It does not become a route.
5. **Tap targets are real.** 44px minimum on every control, including the row's
   own name button.

---

## 15 · TABLET BEHAVIOUR (640–1279px)

Two bands exist and the product currently has layout for neither: `tablet`
(640–1023) and `tablet-land` (1024–1279). The reference's caption: *"focused
planning with the same core experience, optimized for touch."*

**Contract:**

1. **Tablet is not a wide phone and not a narrow desktop.** It keeps mobile's
   single narrative order and gains measure, not columns, until there is
   genuinely a second thing worth putting beside the first.
2. **Touch targets stay at mobile size.** Tablet is a touch device.
3. **At `tablet-land` the roster may gain its column header band**, because the
   row's facts finally fit on one line.
4. **Measured defect, inherited:** the app shell clips at tablet widths
   independently of People — proven with a flag-off control frame
   (`M0-tablet-LEGACY-dark.png`, identical clipping). **That is a shell fix, not
   a People fix**, and People must not work around it with a local override.

---

## 16 · DESKTOP BEHAVIOUR (≥ 1280px)

The reference's caption: *"full planning experience with side-by-side
comparisons and detailed information."*

**Contract:**

1. **Desktop earns a second column, and the second column's job is context** —
   at-a-glance figures, the needs ledger, the route to who hasn't replied. It is
   not a navigation rail and not a settings panel.
2. **Selecting a guest fills the second column** rather than pushing the list
   down. The list stays where the host's eye left it.
3. **The main column opts out of the 820px prose cap**, per that ruling's own
   stated exception (*"the row lists below opt back out"*).
4. **The row is the same object as at mobile** — smaller media tile, more facts
   on the line, same grammar. Not a table row, not a divider.
5. **Every desktop-only structural switch carries the People flag.** The audit
   that found `peopleRailUp = railUp && bp === 'desktop'` recomposing the
   *pre-redesign* surface is why this is a contract clause and a permanent test.

---

## 17 · LIGHT THEME

Light is not the secondary mode. The reference family's operational field is
**warm ivory in every light frame**, and the assignment's own visual authority
names *"warm ivory working surfaces in light mode"* and *"restrained brass /
warm gold accents."*

| Surface | Rule |
|---|---|
| **The plate** | **Dark, even in light mode.** It is a photographic surface with its own luminance regime, and nine reference frames in both themes are unanimous. It is not "the hero in dark mode". |
| **The operational field** | Warm ivory / paper-like. This is the plane the work happens on. |
| **The surface ladder** | page → panel → card must get **lighter**, step by step. This was inverted once: the content panel computed darker than the page behind it, and on a phone the panel and the sheet were both pure white, so the operational field had no plane at all. |
| **Text and actions** | Near-black. The dominant action is a near-black filled button, not a coloured one. |
| **Accent** | Restrained brass / warm gold, used for state and emphasis — never as a second decorative system, never as a gradient, never as "AI styling". |
| **Borders** | Thin, warm, low-opacity. Separators are quiet. Shadows are not a hierarchy device. |

**Light mode is the mode to judge composition against the reference sheets**,
because the family never shows a dark body. Most prior People evidence was
captured dark, which is the one mode the reference cannot settle.

**🔴 This section records a superseded decision — see Appendix B.**

---

## 18 · DARK THEME

Dark is the same product, not a second one. One tokenized system; both modes
derive from the same tokens.

| Surface | Rule |
|---|---|
| **The plate** | Dark — unchanged from light mode. This is the one element that does not move between themes. |
| **The operational field** | Near-black / charcoal foundation, with warm-tinted panels above it. |
| **The surface ladder** | page → panel → card gets **lighter**, same direction as light mode, from a darker floor. |
| **Photographic highlights** | Controlled. The photograph is the brightest thing on the screen and nothing competes with it. |
| **Accent** | Restrained gold / brass. |
| **Contrast** | AA on every text token, measured from the live DOM, not estimated from hex values. |
| **Forbidden** | Glow, neon, cyberpunk saturation, gradient "intelligence" styling. |

**The theme switch changes the field, never the plate, and never the
information.** No capability, figure, provenance line or control appears in one
theme and not the other.

---

## 19 · EMPTY STATES

Every one of these is a legitimate state of a well-run event, not a failure.

| State | What leads | What must not happen |
|---|---|---|
| No roster, no count | The ask: *tell us roughly how many* | A zero. A "0 guests" figure. An error register. |
| A count, no names | The number and whose it is | Framing the absent list as incomplete work |
| Names, nobody asked | The invite route | *"0 replies"* as though people are ignoring her |
| Asked, nobody replied yet | The balance, with the reply-by if she set one | A derived date spoken as hers |
| All replied | A settled statement | An empty chase card |
| No access needs | **Nothing.** The block is absent | A "no needs" card, which is a zero-card |
| Filter empties the list | *"Show everyone"*, as a control | A dead end |
| No contactable quiet guests | One grounding line explaining why no contact actions appear | Disabled-looking buttons |

**Contract:** an empty state is a sentence, not a card. The reference's own
"Still unknown" column proves the register: calm, named, co-equal with what is
known.

---

## 20 · KNOWN CAPABILITY GAPS

Measured at HEAD. Each is named, with its evidence, and none is to be papered
over by the redesign.

| ID | Gap | Evidence | Severity |
|---|---|---|---|
| **G1** | **A guest's name cannot be edited.** No name input exists in `hostv2`; a typo requires remove-and-re-add, which destroys the row's reply, meal, kids, contact and group | no `writeGuest(…{name…})` anywhere | **High** — a daily, obvious failure |
| **G2** | **`kidsCount` has two writers that overwrite each other.** The headcount stepper writes `event.kidsCount`; `writeGuest`/`removeGuest`/`applyCsv`/`undoLastCsvImport`/`announceReplies` all recompute it from the roster. A host who states "6 of my 40 are kids" and then adds one name silently drops to 0, and the protein engine resizes for full adults | `:24757-24775` vs `:6549`, `:6556`, `:6533`, `:6462`, `:6911` | **High — silent data loss reaching food** |
| **G3** | **Structured allergens/diets have no host writer.** They render on the row and can only be set by the guest's own reply or a CSV import | display `:24531-24534`; writer `InviteV2.jsx:623` | Medium |
| **G4** | **`guestCountNotice()` is never rendered on the People surface.** The one sentence written to tell a host we withheld an invented number appears only on the vendor draft sheet | `guestCountFor.js:104`; `:18709` | Medium — the honesty promise is made by a disclosure instead of by the engine's own words |
| **G5** | **The legacy hero derives "confirmed" a third way** (`yes.length + plusOnes`) rather than reading `attendanceBand` or `confirmedCovers` | `:23470-23472` | Medium — a second authority, on the baseline surface |
| **G6** | **On a roster event, headcount mode is unreachable from the People composition.** The stepper is `display:none` until "Use a different number", and that control is suppressed whenever a roster exists | `:24724`, `onAdjust` null at `:24122` | Medium |
| **G7** | **An unowned access need cannot be assigned to a roster person.** `accessNeedsFor` merges intake and roster sources with no dedupe, so assigning would make lodging say two people asked about one | `accessNeeds.js`; `lodgingIntel.js:2073`; declared in-code at `PeopleSurface.jsx:260-272` | Medium — **engine work, not a control on a screen** |
| **G8** | **`headsFor` has no consumer in `hostv2`.** Per-head division and "is the host in the count" are engine-only | `src/lib/perHead.js:40` | Low |
| **G9** | **`partyNotes` round-trips through CSV only.** Never rendered, never editable | `:6486`, `:6517` | Low |
| **G10** | **The counting chips answer two different questions.** "By list" is `aria-pressed={showsReplyTracking(event)}`; "By headcount" is `aria-pressed={event.guestMode === 'count'}` | `:23355` | Low — but it is an a11y lie |
| **G11** | **`PeopleHero` reads `event.coverImageUrl`, which no writer in the repo produces.** Host-supplied cover media is a product requirement; the pipeline is not authorized | `:24040-24047` | **Declared, bounded** — fixtures are review-only and must be visibly labelled |
| **G12** | **Undo coverage is an accident of which call sites pass a message**, not a decision | §13 | Medium |

**None of these is a reason to delay the redesign.** G2 and G1 are the two that
cost a host something real, and both are small, local fixes with existing
writers. They belong in the implementation slice, sequenced first, because
rebuilding a surface on top of silent data loss makes the loss harder to see.

---

## 21 · EXPLICIT NON-GOALS

People is **not**, and this redesign will not make it:

- A CRM. No lead stages, no pipeline, no activity feed, no "last contacted."
- An admin dashboard. No completion percentage, no gauge, no score, no KPI row.
- A table. The roster is a list of people, not a spreadsheet with sortable
  columns. (There is no sorting anywhere in the roster today, by design.)
- A messaging product. Nothing in NGW ever sends. Drafts open in the host's own
  composer; links hand off to the OS.
- A second prioritiser. `eventPlan()` ranks; People reads.
- A second attendance authority. `attendanceBand()` is it.
- The guest's experience. `?rsvp=CODE` owns its own chunk and the host shell is
  unreachable from it by construction (`main.jsx:72-95`).
- A seating tool. Seating is its own surface; People shows the consequence.
- A place where a need becomes a person, or a mobility aid becomes a diagnosis.

---

## 22 · ACCESSIBILITY EXPECTATIONS

1. **Every control is reachable and operable by keyboard**, with a visible focus
   ring. (The row's name button shipped with `outline:none; box-shadow:none` and
   a 21px target; neither was visible in a screenshot. Both are fixed; both are
   now things to test rather than things to look at.)
2. **Minimum tap target 44×44px** at every breakpoint.
3. **Type floor 11px**, enforced by the `nothingIsBelowTheFloor` ratchet.
4. **AA contrast for every text token in both themes.** All three palette
   variants were measured from the live DOM and pass.
5. **`aria-pressed` reflects the field it claims to reflect.** G10 is a live
   violation.
6. **Display-only chips are `aria-hidden`** when the whole row is the control,
   so a screen reader hears one actionable thing, not two.
7. **A disclosure's label says what is inside it** — "Why this number", "Who's
   counted" — never "More".
8. **Status is never conveyed by colour alone.** Reply state carries a word.
9. **Motion respects `prefers-reduced-motion`.**
10. **A list that filters to empty announces the recovery route**, and the
    recovery route is a control, not prose.

---

## 23 · "COMPLETE ENOUGH TO MOVE FORWARD"

### 23.1 · What this contract claims

People is defined well enough to implement when all of the following are true,
and they are:

- [x] The outcome is stated in the host's words, with named failure modes (§1).
- [x] Every job is traced to a measured engine reader (§2).
- [x] The journey is derived from People's own truth, not copied from Place (§3).
- [x] Every entry door is enumerated and lands on one surface (§4).
- [x] The attendance semantics are stated with the two-meanings defect named and
      contracted against (§5).
- [x] Provenance is separated from basis and gated outward (§6).
- [x] Rows-versus-covers is contracted, with the incident that paid for it (§7).
- [x] RSVP states are four, and pending is never counted as coming (§8).
- [x] Needs may be held without an owner and never invent a person (§9).
- [x] Exception states are enumerated, including the ones currently broken (§10).
- [x] One Move reads the single prioritiser and carries its consequence (§11).
- [x] Consequences announce, they do not re-decide (§12).
- [x] One write path; undo coverage measured and its gaps named (§13).
- [x] Behaviour is specified per breakpoint, mobile first (§§14–16).
- [x] Twelve capability gaps are named with evidence and severity (§20).
- [x] Non-goals are explicit (§21).
- [x] Accessibility expectations are testable, not aspirational (§22).
- [x] Every empty state is a sentence and none is a zero-card (§19).
- [x] The vocabulary is fixed and its forbidden forms listed (Appendix A).
- [x] The stale predecessor is identified (Appendix B).

### 23.2 · 🔴 WHAT THIS CONTRACT CANNOT CLAIM — AND THE OWNER MUST RULE ON

**1. There is still no People reference sheet.** Twelve sheets, zero People
screens, catalogued exhaustively in the Experience Reference §0.1. Every
People-specific visual claim is transferred grammar. **Visual acceptance against
this family is acceptance of family resemblance, never of parity.**

**2. The stated baseline is not the actual HEAD.** This assignment names
`132af4f` as the baseline. The branch is at `d36740f`, **19 People commits
past it**, and those commits contain a built, rendering, test-covered People
surface behind `?people=1` — the very thing this contract is supposedly
specifying before implementation. The relationship has to be stated, not
glossed:

> This contract is **not a specification for work that has not started.** It is
> the first written specification of work that is **already 19 commits old**,
> measured against what that work actually does. Where the implementation
> already satisfies a clause, the clause is a *ratchet*. Where it does not
> (§20), the clause is a *defect list*.

Which of those two framings the owner wants is a decision only the owner can
make, and it changes what the implementation slice is:

| If the owner rules | Then the implementation slice is |
|---|---|
| **The 19 commits stand** | Close G1 and G2 first, then conform the existing surface to §§14–16 and the Phase C spec |
| **The 19 commits are a prototype** | Reset to `132af4f` and rebuild to the spec, losing 19 commits of measured, tested work and the three regressions the parity loop already caught |
| **Hold** | Nothing proceeds; the surface stays flag-gated and the baseline stays runnable, which it already is |

**3. The brass-versus-steel accent conflict is now RESOLVED BY SUPERSESSION,
and the owner should confirm that is what was meant.** The calibration-slice
assignment's own visual authority (§5, §7) names *"warm ivory working surfaces
in light mode"* and *"restrained brass / warm gold accents"* in both modes. That
is a **later and more specific** owner statement than the 2026-10-20 decisions
it contradicts (*"steel blue `#4c6675` is the identity accent"*, *"do not force
warm ivory light surfaces"*). §§17–18 and Appendix B are written to the newer
instruction. **Flagged rather than applied silently**, because flipping an
accent system on an inference is exactly the kind of thing that should be said
out loud.

**4. The tablet clipping defect belongs to the app shell**, not to People, and
fixing it is outside this slice's scope (§15.4).

**5. `event.coverImageUrl` has no writer.** Host-supplied cover media is a
product requirement; the media pipeline is explicitly not authorized. Until it
is, the plate's photograph is a visibly-labelled review fixture or nothing.

**6. Bottom navigation is a reconciliation, not a copy.** The reference puts a
persistent bottom tab bar on mobile and tablet, with People as a destination.
Host V2 ships Nav B, which the owner ruled is the mobile navigation authority
and which does not have one. The assignment says to reconcile rather than copy.
**People does not get to change the shell's navigation**, so the contract is:
People is reachable as a first-class destination from whatever Nav B exposes,
and adopting a bottom bar is a shell decision taken once for every domain — not
something People introduces for itself.

---

## APPENDIX A · THE VOCABULARY, AND WHAT IT FORBIDS

| Say | Never say | Because |
|---|---|---|
| *N have said yes* | *N confirmed* on a `count`-basis event | §5 |
| *The number you set* | *Confirmed* | §5 |
| *We'd expect N on the day* | *N are coming* | §6 |
| *We filled that in from what this kind of event usually runs* | *Estimated* (a system word) | §6 |
| *Who's coming* | *Attendees* / *invitees* | planner language |
| *Hasn't answered yet* | *Non-responder* / *pending* | §8 |
| *Who they're bringing* | *Plus-one count* | §7 |
| *Someone needs step-free access — we won't guess who* | *Unassigned requirement* | §9 |
| *Send the link* | *Send invitations* (we don't send) | §8.5 |

**Hosts do not have teams.** "Team" in this product is the vendor domain —
photographer, DJ, caterer. It is not the host's people and People must never
borrow Vendors' language for guests.

---

## APPENDIX B · SUPERSEDED DOCUMENTS AND DECISIONS

### B1 · Two colour decisions, superseded by the calibration-slice assignment

| Superseded decision | Dated | Replaced by | Status |
|---|---|---|---|
| *"Steel blue `#4c6675` is the identity accent. The `palette.js` ban on `#f0bc44` / `#e08c38` stands. No second decorative accent system."* | 2026-10-20 | Calibration-slice assignment §5 and §7: *"restrained brass / warm gold accents"*, *"restrained gold/brass"* | **Superseded — flagged for confirmation** (§23.2 item 3) |
| *"Do not force warm ivory light surfaces."* / *"warmer light neutral is the preferred direction… do not change production doctrine until the evidence is complete"* | 2026-10-20 | Calibration-slice assignment §5 and §7: *"warm ivory working surfaces in light mode"*, *"warm ivory / paper-like work surfaces"* | **Superseded — flagged for confirmation** |

**What this changes in practice.** The three palette variants built as a review
instrument stop being a question and become an answer: Variant B — the
reference's own brass on ivory — is the direction the newer instruction
describes. Variant C (production steel on a warm neutral field) becomes the
fallback if the owner confirms the earlier steel decision instead. All three
measured AA-clean in both themes from the live DOM, so the choice is a product
decision, not a contrast one.

**What it does not change.** The `palette.js` ban exists to stop a *second
decorative accent system*, and that purpose survives intact. Brass as **the**
accent is one system; brass *plus* steel would be two, and that remains
forbidden either way.

### B2 · The predecessor contract

`docs/architecture/redesign/PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md` was written
2026-10-20 at the start of the authorized slice and says, on line 3, *"No JSX
written yet, by instruction."* It classifies **A3 (count provenance on screen)**
and **D2 (known need, unknown owner)** as ENGINE ONLY with "none" as the door.

**Both now have doors** — `AttendanceDecision` and `StillUnknown`, behind
`?people=1`. That document is stale at HEAD. It is not deleted, because its
reasoning about vocabulary, covers-versus-rows and reply landing is sound and
still cited here. **Where it disagrees with the code, the code is right.** This
contract is the current one.

---

