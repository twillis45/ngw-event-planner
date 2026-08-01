# Blink ExperienceOS — Addendum to the 29 July Gap Board

> Published as artifact https://claude.ai/code/artifact/f7dfd4c1-b5bc-472a-802c-1c190d0cfa2c.
> Keep the two in sync.

Date: 2026-08-01 · **Addendum to** [`2026-07-29_MOBBIN_COMPETITIVE_READ.md`](2026-07-29_MOBBIN_COMPETITIVE_READ.md),
which already carries a full Blink ExperienceOS section.

Question driving this read: **when a host satisfies an ask, what does the product show — and does the confirmation
survive?**

---

## ⚠ Read this first: most of this was already known

This addendum exists because a fresh 2026-08-01 search **rediscovered findings the 29 July board already
carried.** The board is not indexed anywhere a repo grep or a Mobbin query could reach it, so it was invisible
to the search that went looking. Recorded rather than hidden.

| Finding | Status against the board |
|---|---|
| Two independent status columns | **Already on the board** — named there as *"Status is two dimensions, not one"*, with the full chip list |
| `Send Failed` must be its own state | **Already on the board** — *"a boolean will not do"*. It is already step 6 of the board's recommended sequence |
| No readiness engine, no proposed action | **Already on the board** — *"It configures… that is an admin console"* |
| The unified agenda as the multi-day model | **Already on the board** — the reading-model reference for the keystone gap |
| The amber-tinted "now" row | **Already acted on** — flagged as a trap, found in our own phase spine, repointed to `--progress` |
| ⭐ The operator completion loop, in their labels | **NEW** — knowledge-base sourced, not visible in any screenshot |
| ⭐ AI auto-fill does not mark what it filled | **NEW** — and it silently drops data |
| The analytics inventory, itemised | **NEW** — turns the board's posture claim into a checkable absence |

**Source upgrade over the board.** That page drew only on marketing material and published screenshots. This
pass adds Blink's own help centre — author-stated and far more specific. It is still documentation, not the
running product.

---

## Evidence limits — read this before citing anything below

Three tiers of evidence, and they are not equal:

| Source | What it proves | What it cannot show |
|---|---|---|
| **Mobbin** (Blinkist, Partiful, Apple Invites, Luma, BFF, GroupMe) | real captured screens, real flows | nothing captured after the flow ended |
| **blink.global** marketing site | real product UI, curated | transitions, pending states, failure paths |
| **help.blink.global** knowledge base (12 collections, 10 articles read) | exact UI labels and sequences, author-stated | whether the described UI matches shipped code |

**Blink is not indexed on Mobbin.** Six probes: iOS flow search, iOS screen search, a deliberately off-topic probe
(home-security), an event-planning-vocabulary probe, a `Bl!nk` literal probe, and a web-platform probe (0 results).
The event-planning probe correctly surfaced BFF / Apple Invites / Luma / Partiful / GroupMe and Blink was not among
them — so this is a real absence, not a query miss. Mobbin indexes consumer apps; Blink is credential-gated B2B.

**Nothing below was driven live.** No claim here meets the [Check the Surface](../../CLAUDE.md) bar.

---

## Blink ExperienceOS — who they are

Enterprise / government event orchestration: "from major conferences and NBA events to prestigious international
competitions." Positioning is near-identical to ours — *"Before guests arrive, Blink becomes your command center"* and
*"Precision Meets Luxury."* Two iOS apps (`bl:nk`, `bl:nk Leadership`) plus a driver app (`Blink Drive`) and a guest
portal (`Blink Welcome`). Built by Evolve. Site: blink.global · KB: help.blink.global

**This is the closest positional competitor found to date.** Treat it as the benchmark for ops-side, not the invite
apps.

---

## FINDING 1 — two status axes on one row

The `All Attendees` table carries **`Application Status`** and **`Invitation Status`** as separate columns, weighted
differently on purpose:

| | Application Status | Invitation Status |
|---|---|---|
| Treatment | icon + plain text, monochrome | filled colour pill |
| Observed values | `Feedback Sent`, `Updated`, `Approved`, `Pending Review` | `Approved`, `Denied`, `Pending`, `Not Sent`, `Send Failed` |
| Reads as | quiet — where the item *is* | loud — what you must *act on* |

`Approved` appears in **both** columns with different visual weight — quiet as text on the left, loud as a green pill
on the right. They decided which completion you scan for and demoted the other.

Where invitation status does not yet apply they print an explicit **em dash `–`**, not a blank cell. Blank reads as
"unknown"; the dash reads as "not applicable at this stage."

---

## FINDING 2 — three distinct kinds of not-done

The Invitation axis separates states most products collapse into one:

| Value | Colour | Meaning | Who owns it |
|---|---|---|---|
| `Not Sent` | neutral grey outline | we have not asked yet | **host** |
| `Pending` | amber | we asked, no answer | **them** |
| `Send Failed` | red | we tried, the mechanism broke | **system** |
| `Denied` | red | a real no | them |
| `Approved` | green | done | — |

`Denied` and `Send Failed` share the red token but are separated by glyph — a real no versus a broken pipe.

**This is the single most portable finding in the document.** A readiness engine that treats all three not-dones as
"incomplete" will keep proposing actions the host cannot take.

---

## FINDING 3 — the Blink Drive completion loop (exact labels)

The knowledge base documents the full ask-satisfaction loop with real vocabulary:

```
Clock In  (tap, then SWIPE to confirm)  ->  "Submitted, your location is shared!"
Navigate to location  ->  Begin Ride Navigation
Mark As Complete  ->  [optional comments]  ->  Finish Trip  ->  status "Trip Completed"  ->  organizers notified

exception path (peer, not fallback):
Report a Problem  ->  [photo + comment]  ->  End Trip  |  Continue Trip
```

Four deliberate choices:

1. **Completion is two-step.** `Mark As Complete` declares; `Finish Trip` commits. `Clock In` requires a *swipe*, not
   a tap. Friction sits only on state changes that are expensive to undo — nowhere else.
2. **The completion carries a comment.** Optional, but it means the record holds why/how, not a boolean. A completed
   trip is a small document.
3. **The exception is a peer of the completion, and non-terminal.** `Report a Problem` sits at the same level as
   `Mark As Complete`, and forks to `End Trip` **or** `Continue Trip`. A problem does not force termination. The same
   adjacency appears on the check-in screen: `Check In` stacked directly above `Flag Attendee`.
4. **The confirmation crosses the role boundary.** Driver finishes; *organizers are notified*. The satisfied ask
   propagates back to whoever asked it.

---

## FINDING 4 — ephemeral and durable, always paired

Blink pairs a success message with a status change on the same act. From the KB, verbatim:

- Invitations: *"a success message will confirm the process"* **and** *"the status of the attendees will be updated"*
- AI upload: **"Ticket Uploaded Successfully"**
- Clock in: **"Submitted, your location is shared!"** — note the message names the *consequence*, not the act

Two more guards worth stealing:

- **Redundant-ask guard.** *"If any attendees have already been invited, a notification will appear. Choose whether to
  send them another invitation or exclude them."* The system knows an ask was already made and refuses to silently
  repeat it.
- **Confirm-before-commit on bulk.** `Save & Continue` -> review summary -> `Send`.

---

## FINDING 5 — named thresholds beat bare percentages

Sessions report capacity as **`Empty, Filling Up, Almost Full, Full`** rather than a raw percentage.
Four named states beat a number nobody calibrates.

---

## What Blink does NOT have — the strategic finding

**Blink counts inventory, not readiness.**

The entire Statistics layer is commerce and capacity: `Printed vs. Unprinted`, `Badge Print Rate`,
`Ticket Utilization Rate`, `Orders (Completed vs. Abandoned)`, `Total Revenue`, `Average Order Value`,
`Target Badge Sold`. There is **no "X of Y outstanding items resolved"** anywhere in the product.

Completion aggregates for things *sold and printed* — never for *work owed*.

Three supporting gaps:

1. **Journeys and convoys have no documented status.** The trip lifecycle exists on the *driver* side; the
   organizer-side journey object has no state machine in the docs. Convoy docs explicitly do not cover delays,
   disruption, or sequencing when one vehicle slips — coordination is capacity-based only
   (*"vehicles remain available until they reach full capacity"*). This is the same defect our own vendor audit found
   in Event Boss: isolated cockpits, no cross-item sequencing.
2. **Table Views has no completion concept.** Filters, saved views, a filter-count badge, a 2,000-row limit — but
   status is just another filterable column. No grouped "done" bucket, no counts. GroupMe's `Pending (1)` tab is more
   advanced than Blink's enterprise table on this one axis.
3. **`Application Status` is never documented.** Four values are visible in the live UI; the KB defines none of them.

---

## Where we are AHEAD — AI provenance

Blink's AI flight extraction tells the user *"Be sure to review the auto-filled details to confirm that all
information is correct"* — but **the UI does not distinguish AI-filled fields from human-entered ones.** It asks for a
review without marking what to review.

Worse, it silently collapses connections: it *"automatically fills in the total travel hours, including any transits
or connections, without listing them individually. The system captures only the start and end destinations."*

That is inference presented as fact, with silent data loss, in a travel record an ops team will act on.

Our `*_SOURCES` registry and `06_AI_GROUNDING_NO_FAKE_INTELLIGENCE.md` discipline are **ahead of a funded enterprise
competitor here.** Do not trade this away chasing their table density.

---

## The consumer cohort — five confirmation idioms

From Mobbin (Blinkist, iOS), a complete ladder, lightest to heaviest:

1. **In-control transform** — `Copy` becomes `✓ Copied` in green, in place. No overlay.
2. **Toast** — dark pill, outline check, one sentence, above the tab bar. Used for reversible acts. Notably the *same*
   component and colour for constructive and destructive: "You're now following…" and "Extract deleted from My
   Library."
3. **Persistent inline chip** — a green `✓ Finished` under the title of a finished book, permanently. Not a
   notification; a property of the object.
4. **Full-screen ceremony** — reserved for the one act that moves a tracked goal (a ring gauge counting the weekly
   goal up).
5. **Blocking modal** — irreversible only ("Account successfully deleted").

Blinkist also makes completion **data**: library filters read `Not started / In progress / Finished (3)`.

### The event apps, by contrast, almost never use a toast

| App | How a satisfied ask reads |
|---|---|
| **BFF** | three chips (`Next time` / `Interested` / `I'm going`); answered rows show `2 going`, unanswered keep a standing `RSVP` button |
| **Partiful** | hearts that break progressively across `Going` / `Maybe` / `Can't Go`; the count sits centre-stage in the host action bar; RSVPs become a **running activity feed** with Reply |
| **Apple Invites** | roster grouped `GOING (7)` / `MAYBE (1)` / `NOT GOING (1)`, each response carrying **the person's own sentence** |
| **GroupMe** | attendee tabs `Going (1) / Not Going (0) / Pending (1)` — *Pending* tracked as hard as the answers |
| **Luma** | `Register` pinned; green check + "Event Created!" on creation |

**A satisfied ask never produces a notification — it mutates the roster.**

---

## CONVERGENT FINDING — state as identity, not parameter

Three independent sources reached the same conclusion:

- **Mobbin read (2026-07-29):** "Wise/Booking.com state-named surfaces — `Transaction detail (canceled)`,
  `Booking detail (canceled)`, Luma's `Event detail (invited)/(hosting)/(guest)`; **we carry state as params
  instead.**"
- **Blink (2026-08-01):** dual status columns with deliberate weight hierarchy; status is a first-class column, not a
  derived flag.
- **Blinkist (2026-08-01):** every ephemeral confirmation is backed by a durable state marker on the object.

**Event Boss carries completion state as a parameter; the leaders carry it as an identity.**

The row that scores this is **Feedback & affordance** in
[`2026-07-13_EVENT_BOSS_VS_MARKET_LEADERS.md`](2026-07-13_EVENT_BOSS_VS_MARKET_LEADERS.md), currently **8/10**
(moved 7→8 in the ninth wave). The sixth wave's hold note reads directly onto this research:
*"consequence-confirmation on the new write surface is real and credited, but the row's recorded affordance-audit gap
is unchanged."*

---

## Recommended pulls, ranked

1. **Own the three not-dones.** Split "incomplete" into *host owes* / *they owe* / *system broke*. `Not Sent` is a
   hero-ask candidate; `Pending` is a wait, not an ask; `Send Failed` is a defect. This is the highest-value, lowest-
   cost item here, and it directly serves `feedback_propose_dont_ask`.
2. **Declare then commit, with a note.** `Mark As Complete` -> comment -> `Finish`. Provenance for free, and it
   satisfies `feedback_glyph_only_when_navigates` — an in-place settle that earns weight without a route.
3. **Make the exception a peer, and non-terminal.** `Report a Problem -> Continue` is the move. Resolve-or-ignore
   makes hosts mark things done that are not.
4. **Guard against re-asking.** Check whether an ask was already issued before the hero ask proposes it. Blink guards
   at the send boundary; ours should guard at the propose boundary.
5. **Build the readiness rollup they do not have.** Blink's analytics can report 400 badges printed and 12 orders
   abandoned. It cannot tell a host whether the event is ready. **That is the moat.**

---

## Open — needs access we do not have

- The actual transition: what happens the instant an ask is satisfied (animation, focus, list re-sort)
- Whether `bl:nk Leadership` confirms differently by role
- Whether `Application Status` has values beyond the four observed
