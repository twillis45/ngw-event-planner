# PEOPLE / ATTENDANCE — PRODUCT CONTRACT

**Measured 2026-10-20.** Step 1 of the authorized slice. No JSX written yet, by
instruction.

| | |
|---|---|
| Branch | `main-2utz0n` |
| Accepted baseline | `132af4f` (Sprint 0.5) · CI run 917 green, 9/9 jobs, e2e 3,118 passed / 0 failed / 0 flaky |
| Visual inheritance | `e695c67` → `EXISTING_REDESIGN_INVENTORY.md` |
| Capability truth | `SPRINT_0_5_ARCHITECTURE_DECISIONS.md`, `SPRINT_0_MIGRATION_LEDGER.md` |
| Parity authority | **`hostv2/src/parity/MANIFEST.md`** — extended, not duplicated (owner decision 5) |

## Owner decisions in force

1. **Steel blue `#4c6675` is the identity accent.** The `palette.js` ban on
   `#f0bc44` / `#e08c38` stands. No second decorative accent system.
2. **No forced warm ivory.** The existing tokenized light/dark system is the
   production baseline; tonal refinement is judged later from rendered screens.
3. **Nav B** is the mobile navigation authority. The retired dock stays retired.
4. **Shipping Host V2 outranks the 95-page pre-hostv2 Figma system.** The
   grounded `guests` / `space` frames in the newer file are references **when
   accessible — Figma is not reachable from this session, so their contents are
   not invented and that limitation is recorded here and in the final report.**
5. **No second parity authority.** Extend `parity/MANIFEST.md`.
6. **Stale design doc corrected** — done, `docs/DESIGN_SYSTEM_HANDOFF.md`: the
   "dark-only app / white surface gated in CI" paragraph and the "Mode is dark…
   the shell does not ship them" line. Both were measured false (light has
   shipped since 2026-09-28; no white-surface CI gate exists). Scoped to those
   two passages — no broader cleanup.

---

## 0 · THE THESIS, AS THIS SLICE MUST DEMONSTRATE IT

Not *Guest Management CRUD*. The surface has to answer, in order:

> **Who is coming? · What do we actually know? · What are we still waiting to
> learn? · What does that change elsewhere? · What should the host do next?**

Three repository facts make that answerable today rather than aspirational:

- `attendanceBand()` already distinguishes **planning truth from confirmed
  truth** and, since Sprint 0.5 D1, **carries whose number it is**.
- `accessNeedsFor()` already holds **a known need with an unknown owner** without
  inventing a person.
- `eventPlan()` already ranks the one move, and `placeQuestions` already proves a
  consequence can be raised by People and **answered somewhere else**.

The redesign's job is to put those on screen honestly. The intelligence exists;
it is under-exposed.

---

## 1 · CLASSIFICATION SUMMARY

| ID | Capability | Class | Canonical reader | Writer | Current door |
|---|---|---|---|---|---|
| **A1** | Planning count (headcount mode) | PROVEN IN HOST | `guestCountFor` · `attendanceBand` | `patchEvent` | guests sheet stepper · hero |
| **A2** | Attendance band (low/high/planning/confirmed) | PROVEN IN HOST | `attendanceBand` · `attendanceBandLabel` | — | guests sheet · command hero (`gBand`) |
| **A3** | **Count provenance on screen** | **ENGINE ONLY** | `attendanceBand().countSource/countFromHost` · `guestCountFor` · `guestCountNotice` | — | **none — the gap this slice closes** |
| **A4** | Outward gate on an app-supplied count | PROVEN (engine) | `guestCountIsConfirmed` | — | `doItForMe`, `webhookService`, `conflicts.js` |
| **A5** | Lock / reopen the count | PROVEN IN HOST | `guestPlanningMode` | `patchEvent` | count chips (`:7420-7433`) |
| **A6** | Covers (plates ≠ rows) | PROVEN (engine) | `confirmedCovers` · `headsFor` | — | food/caterer surfaces |
| **A7** | "Are replies settled?" | WIRED (CRA only) | `guestCountResolved` | — | CRA progress rows |
| **B1** | Add names, one per line | PROVEN IN HOST | — | `addRoster` → `patchEvent` | guests sheet |
| **B2** | Couple pairing / splitting | PROVEN IN HOST | `event.guestPairs` · `bedroomsNeeded().basis` | `addRoster` | guests sheet, suggest-and-confirm |
| **B3** | CSV import + undo + history | PROVEN IN HOST | `lib/csvParsers` | `applyCsv` · `undoLastCsvImport` · `clearImportHistory` | guests sheet |
| **B4** | Edit a guest | PROVEN IN HOST | — | `writeGuest(i, …)` | roster row |
| **B5** | Remove a guest | PROVEN IN HOST | — | `removeGuest(i)` | roster row |
| **B6** | Kids per guest · total | PROVEN IN HOST | `kidsTotal` | `writeGuest({kids})` | roster row stepper |
| **B7** | Plus-one | PROVEN IN HOST | `attendanceBand` (a filled `plusOne` is a real adult) | `writeGuest` | roster row |
| **B8** | Roster search · lens · grouping | PROVEN IN HOST | `rosterQ` / `rosterLens` (UI state) | — | guests sheet toolbar |
| **B9** | Per-guest contact (text/email/call) | PROVEN IN HOST | drafts in `lib/` | — | roster row |
| **C1** | Public invite, isolated chunk | PROVEN IN HOST | `InviteV2` · `inviteShared` | guest-side | `?rsvp=CODE` |
| **C2** | Reply landing (2 sources, 1 merge) | PROVEN IN HOST | `fetchEventRsvps` + local outbox → `lib/guestMerge` | `announceReplies` → `patchEvent(…, {noUndo:true})` | background effect |
| **C3** | Reply-pressure suppression | PROVEN (engine) | `guestPlanningMode` · `showsReplyTracking` | — | gates chase UI |
| **C4** | Reply-by date | PROVEN IN HOST | `rsvpDeadlineFor` · `lib/replyBy` | `patchEvent({rsvpDeadline})` | guests sheet editor |
| **C5** | Nudge / chase | PROVEN IN HOST | `draftRsvpChase` · `rsvpChaseRaise` | — | roster row · share block |
| **D1** | Normalized access needs | PROVEN IN HOST | `accessNeedsFor` · `heardAccessNeeds` | `patchEvent({accessNeeds})` | creation seam · walker spec |
| **D2** | **Known need, unknown owner** | **ENGINE ONLY** | `accessNeedsFor().requirements[].who == null` | — | **not shown as such** |
| **D3** | Step-free → seating | PROVEN IN HOST | `guestNeedsStepFree` → `seatingPlan` | `patchEvent({guests})` | seating sheet |
| **D4** | Needs → lodging | PROVEN (engine) | `accessNeedsFor` → `lodgingIntel` | — | lodging |
| **E1** | Venue step-free question | PROVEN IN HOST | `placeQuestionsFor` | `answerPlaceQuestionPatch` | board + venue |
| **E2** | Permit question (provenance-gated) | PROVEN IN HOST | `placeQuestionsFor` | `answerPlaceQuestionPatch` | board |
| **E3** | Heard-but-unused clauses | PROVEN IN HOST | `heardNotUsedFor` | `acknowledgeClausePatch` | "Worth finding out" |
| **E4** | One Move | PROVEN IN HOST | `eventPlan` | — | command hero |
| **E5** | Reply → food/shopping/seating/money/rerank | PROVEN IN HOST | GOLD-07 chain | — | across domains |
| **F1** | Share link · QR · open invite | PROVEN IN HOST | `inviteLinkUrl` | — | guests sheet "Share & invite" |
| **F2** | Drafts: invite · brief · update · nudge | PROVEN IN HOST | `draftInvite` · `draftGuestBrief` · … | `openDraft` | guests sheet |

**Nothing is classified BROKEN.** Two items are **ENGINE ONLY** — A3 and D2 —
and they are the two the thesis most depends on. That is the finding of this
step: *the People redesign is mostly an exposure problem, not a capability
problem.*

---

## 2 · THE CAPABILITIES THAT CARRY RISK (detail)

### A3 · Count provenance — the slice's centre

| | |
|---|---|
| **User need** | "Is the number you are planning with mine, or did you make it up?" |
| **Current capability** | The fact exists and is correct. `attendanceBand()` returns `countSource` + `countFromHost`; `guestCountNotice()` returns the host-facing sentence; `because` already carries *"— not a number you gave, we filled that in from what this kind of event usually runs."* |
| **Canonical reader** | `attendanceBand(event)` → `{applicable, basis, low, high, planning, confirmed, maybe, pending, declined, kids, invited, band, because, countSource, countFromHost}` · `guestCountFor(event)` → `{count, known, source, fromHost}` · `guestCountNotice(event)` |
| **Canonical writer** | `patchEvent({ guestCount, guestEstimate, guestCountSource: 'host' })` — provenance written beside the number, pattern at `HostShellV2:7330` |
| **Current entry point** | None as provenance. The number renders; whose it is does not. |
| **New entry point** | The dominant first-viewport attendance statement — provenance is part of the headline, not a footnote |
| **Persistence** | `guestCountSource` on the event blob, `ngw-hostv2-custom-events` |
| **Provenance** | Legacy events carry no source field and are treated as the host's deliberately — *"treating unknown as derived would withhold real headcounts from real vendor briefs, a worse failure, and a silent one"* |
| **Existing coverage** | `thePlanningCountKnowsWhoseItIs` (16) · `anInventedCountDoesNotLeaveTheApp` (15) · `anInventedCountIsNotAVendorConflict` (7) · `theHeadcountHasOneCanonicalReader` (5) |
| **Required redesign test** | A browser test that the two events differing **only** in `guestCountSource` render **visibly different** attendance statements, and that the invented one never renders as confirmed |
| **Migration risk** | **Low on data, high on wording.** The engine is done. The risk is inventing vocabulary the readers do not support — see §4. |

### D2 · A known need with an unknown owner

| | |
|---|---|
| **User need** | "Someone coming uses a walker. The app should remember that without pretending it knows who." |
| **Current capability** | `accessNeedsFor()` returns requirements carrying `kind`, the host's **verbatim phrase**, `source`, and `who` — which is `null` when the sentence never named a person. `domainsFor()` then narrows reach: a requirement with no `who` reaches **lodging only**, not seating, because you cannot seat a person you cannot identify. |
| **Canonical reader** | `accessNeedsFor(event)` · `heardAccessNeeds(text)` · `guestNeedsStepFree(guest)` |
| **Writer** | `patchEvent({ accessNeeds })` at the creation seam |
| **Current entry point** | The requirement reaches lodging and the venue question. **It is never shown as "a need we hold, for a person we cannot name."** |
| **New entry point** | A needs zone that states the need, quotes her words, and says plainly that the person is not identified — with the only honest resolution being *tell us who*, never a guess |
| **Provenance** | `source: 'host-said'` + the verbatim phrase. **No diagnosis inference** — `healthNoted` owns health and a mobility aid is not evidence of a condition (`accessNeeds` has a test asserting no clinical term appears in its output) |
| **Existing coverage** | `oneAccessNeedOneAnswer` (29) · `theWalkerReachesThePlan.spec.mjs` (2) · `weNowNeedToKnow` (26 + 7) |
| **Required redesign test** | The walker sentence with no named person renders the need **and** the unknown owner; naming a guest moves it to that guest and unlocks the seating reach; no roster row is ever created from a need |
| **Migration risk** | **Medium — it is the easiest place in the product to accidentally invent a person.** Mitigation: the needs zone may read `accessNeedsFor` but may never write `guests`. |

### A6 / B7 · Rows are not plates, and a plus-one is a person

The repo has already paid for this once, and the record is at
`HostShellV2:3880-3900`: `countResolutionRows` offered *"Match confirmed yeses
(N)"* and patched that **row count** into `catererCount` —
> *"A host taking the app's own suggestion would have told the caterer 5 and left two children without a meal."*

Settled in three engines this shell imports: `attendanceBand` (*"a filled
plusOne is a real adult riding this row's answer"*), `crabPlan.rosterHeadcount`,
`seatingPlan.seatsFor`. Deliberately left as row counts: the past-event recap
and the reply-timing panel, because **both sides** of those are rows.

**Contract:** the People surface may show rows against rows, or plates against
plates. It may never put a row count where a cover count belongs. Reader for
plates is `confirmedCovers`; for per-head division, `headsFor`. Guarded by
`aRowIsNotACover.test.js` and `catererDriftCountsCovers.test.js`.

### C2 · Reply landing

Two sources, one merge, and a deliberate asymmetry worth preserving: replies
land via `patchEvent(…, { noUndo: true })` because *"real replies arriving isn't
a host edit to undo."* A redesign that routes replies through the generic undo
would offer the host an Undo that un-says what a guest said.

Name-match rules in `lib/guestMerge`: exact → last+first (≥3) → first-only
(≥4). Audit find 2026-07-08: without the backend pull, *"delivery success made
replies vanish."*

### C3 · Reply-pressure suppression

`guestPlanningMode` returns `count_only` / `rsvp_tracking` / `unknown`, and
`unknown` **defaults to count-first** — *"never assume RSVP mode from empty
data."* Its own rule: **suppression hides pressure, never data.** A count-only
host keeps the roster visible and simply stops being chased.

**Contract:** every attention/nudge element in the new People surface gates on
`showsReplyTracking(event)`. The roster itself does not.

---

## 3 · CAPABILITY PARITY MAP

Per owner decision 5 this is **recorded as rows to be added to
`hostv2/src/parity/MANIFEST.md`**, whose existing columns are *render family →
runtime location → Figma node → kit? → status* and which is enforced by
`check-parity.mjs`. The mapping below is the migration view of the same rows;
the manifest stays the machine-enforced truth and this document references it.

| Old capability | Old door | New door | Data authority | Test | Status |
|---|---|---|---|---|---|
| Headcount stepper | guests sheet, count mode | People · attendance zone | `guestCountFor` | `thePlanningCountKnowsWhoseItIs` + new browser | planned |
| Band readout | guests sheet + hero | People · attendance zone (dominant) | `attendanceBand` | new browser | planned |
| **Provenance** | — (none) | People · attendance zone | `attendanceBand().countFromHost` | **new browser, required** | planned |
| By list / By headcount | counting chips | People · attendance zone control | `guestPlanningMode` | `guestMode` (unit) | planned |
| Lock / reopen count | count chips | People · attendance zone | `guestPlanningMode` | `rsvpPendingIsNotSettled` | planned |
| Add names | guests sheet textarea | People · roster zone | `addRoster` | `guestSplit`, `theCouplesSheSaidReachTheList` | planned |
| Couple split | suggest-and-confirm line | People · roster zone, same pattern | `aCoupleIsTwoPeople` | `aCoupleIsTwoPeople` + existing spec | planned |
| CSV import / undo / history | guests sheet | People · roster zone (progressive) | `lib/csvParsers` | existing unit | planned |
| Guest edit / remove / kids | roster row | People · guest detail | `writeGuest` / `removeGuest` | `rosterDetailPanel.spec.mjs` | planned |
| Search / lens / grouping | roster toolbar | People · roster zone | UI state only | `rosterToolbar.spec.mjs` | planned |
| Contact actions | roster row | People · guest detail | drafts | `guestTold` | planned |
| Reply-by date | guests sheet editor | People · attention or attendance zone | `rsvpDeadlineFor` | `theInviteSaysWhenToBook` | planned |
| Nudge / chase | roster + share | People · attention zone (gated) | `draftRsvpChase` | `rsvpChaseRaise` | planned |
| Share link / QR / invite | "Share & invite" | People · share, on demand | `inviteLinkUrl` | `guestPayloadGate` | planned |
| Access needs | creation → lodging/seating | People · needs zone | `accessNeedsFor` | `oneAccessNeedOneAnswer`, walker spec | planned |
| **Known need / unknown owner** | — (engine only) | People · needs zone | `accessNeedsFor().who == null` | **new, required** | planned |
| Consequences (venue/permit) | board | People explains, board still ranks | `placeQuestionsFor` | `weNowNeedToKnow` | planned |
| Heard-not-used | "Worth finding out" | People · attention when People-owned | `heardNotUsedFor` | `theClauseGetsAnAnswer` | planned |
| Reply landing | background effect | unchanged | `guestMerge` | `gold07RsvpCascade` | **must not change** |
| `?rsvp=CODE` | own chunk | unchanged | `InviteV2` | `guestPayloadGate` | **must not change** |

**Rule:** no row moves to `done` until its test passes against the new door
**and** the old door still works. No old door is retired in this slice.

---

## 4 · VOCABULARY THE READERS ACTUALLY SUPPORT

The owner's instruction was to distinguish planning truth from confirmed truth
*"without using those exact strings unless runtime semantics support them."*
Measured, `attendanceBand().basis` takes exactly three values, and that is the
honest vocabulary:

| `basis` | What is true | What may be said | What may **never** be said |
|---|---|---|---|
| `'rsvp'` | A roster with replies; `confirmed` is real | the confirmed figure, and what is still out | that pending guests are coming |
| `'count'` | The host gave/locked a number | her number, as hers | that anyone has replied |
| `'estimate'` | A number exists, provenance decides whose | with `countFromHost` → her estimate · without → **the app's substitution, said as such** | the substituted number as hers, outward or as money |

### 🔴 `confirmed` HAS TWO MEANINGS, AND ONLY ONE OF THEM IS "PEOPLE REPLIED"

Measured at `playbooks/index.js:708-711` and `:721-723`:

| `basis` | `confirmed` | What it actually means |
|---|---|---|
| `'rsvp'` | `confirmed + kidsConfirmed` from real replies — a yes row counts `1 + plusOne`, and only a confirmed row's kids are locked in | **people said yes** |
| `'count'` | **`confirmed: n` — the host's own number, with nobody having replied at all** | **the number is firm** (locked, destination-committed, or no meaningful spread) |
| `'estimate'` | `confirmed: 0` | nothing is confirmed; only `planning` is worth showing |

A People surface that renders `band.confirmed` behind the words *"N have
confirmed they're coming"* would be **truthful on `rsvp` and a lie on `count`** —
one field, two meanings, which is this repository's named recurring defect.

**Contract:** the attendance zone branches on `basis` **before** choosing the
word for `confirmed`. On `'count'` the honest register is *firm / settled /
the number you set*; "confirmed" as a reply-word is reserved for `'rsvp'`.
This is a required assertion in the new browser test, not a style note.

Two further constraints, both measured:
- **`confirmed` is `0` on an estimate-basis event**, so the only number worth
  showing there is `planning` — and it must never wear a confirmed label.
- **A derived reply-by date is never stated as fact.** `source: 'derived'` is
  our own `event.date − 7d` guess; only a host-set date exists outwardly.

Developer words that must not appear on screen: `basis`, `countSource`,
`countFromHost`, `guestMode`, `planning`, `applicable`.

---

## 5 · PROPOSED INFORMATION HIERARCHY

Challenged against capability rather than assumed. One narrative, few strong
surfaces, no card grid:

```
PEOPLE

  ATTENDANCE TRUTH            A1 A2 A3 A5 — dominant first viewport.
                              The number, whose it is, how firm it is,
                              and what it is currently driving.

  WHAT NEEDS YOU              C5 E1 E2 E3 — gated on showsReplyTracking
                              for anything reply-shaped. Empty is a
                              legitimate, calm state, not a zero-card.

  THE PEOPLE                  B1 B4 B5 B8 — the roster, searchable,
                              grouped. The working surface.

  WHAT THEIR REPLIES CHANGE   D1 D2 A6 — needs and covers, stated as
                              consequences with their answers' owners
                              named, never re-decided here.

  DEEPER TOOLS                B3 F1 F2 — CSV, share, drafts. On demand.
```

**Why attendance and not a photograph in the hero:** Venue's dominant truth is a
place, so place can dominate. People's dominant truth is a number whose
trustworthiness is the whole question — and the precedent for reinterpreting the
hero per domain is already in the manifest, where the day-of board **demoted its
giant clock** so the moment's name stayed the hero. No decorative imagery.

**One Move:** if `eventPlan()`'s top action is People-owned, it is the one loud
thing in the attendance zone. If it belongs elsewhere, People shows no competing
primary — the zone states truth and the board keeps the move.

---

## 6 · WHAT THIS CONTRACT FORBIDS

- A second attendance authority. `attendanceFor()` is **not** to be created.
- A second count source, next-action engine, consequence ranker, or
  generalized `openQuestions`.
- Persistence writes anywhere but `patchEvent`.
- Business truth held in component state.
- Host-shell code reaching the `?rsvp=CODE` chunk.
- An estimate rendered as a confirmation, or reaching money or outward copy.
- A roster row created from a need, or a diagnosis inferred from one.
- Optimistic UI that claims a write landed when it has not.
- Retiring any old door in this slice.

---

## 7 · OPEN AND HONEST

1. **Figma is not reachable from this session.** The grounded `guests` and
   `space` frames are not inspected, and their contents are not guessed. Visual
   acceptance is therefore provisional on that inspection, and the final report
   will say so.
2. **Zone names above are provisional** until the surface boundary (step 2).
   The capability commitments are not.
3. **`guestCountResolved`** remains CRA-only and is deliberately not adopted by
   the new surface: it answers "are replies settled / did she give a number",
   which Sprint 0 proved is not a provenance gate.
4. **The roster row may be the one genuinely new pattern People introduces** —
   `askKit` converges display-ask atoms and a roster is a list. Any new atom
   gets a manifest row and a `check-parity.mjs` rule, or it is not an atom.
