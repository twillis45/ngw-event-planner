# PEOPLE / ATTENDANCE — REVIEW BOARD RECOMMENDATION

**Prepared 2026-10-21. For the owner's ruling. Nothing here is decided.**

Three decisions are open and are blocking the implementation slice. This paper
takes a position on each, with the reasoning, the conditions, and what it costs
to rule the other way.

| | Decision | Recommendation |
|---|---|---|
| **D1** | Concept 1 (The Understanding) vs Concept 2 (The Working View) | **Neither as drawn.** The Working View is the surface; Counted / Still unknown is a block inside it. |
| **D2** | Do the concept sheets supersede Studio Matte? | **Split the ruling.** Studio Matte keeps structure, density and truth. The sheets win the light ground and the display register. **Steel keeps the accent.** |
| **D3** | The 19 People commits past `132af4f` | **Stand**, with four conditions. |

---

## D1 · THE UNDERSTANDING vs THE WORKING VIEW

### Recommendation: the Working View, carrying the Understanding's best block

I drew these as alternatives. Reviewing them against `UX_04` says they are not
alternatives — **one is a surface and the other is a component.**

**The Understanding is a review screen.** Its grammar comes from the Creation
journey, where it does one job once: confirm an extraction before the plan is
built. It has a Zone 1 and a Zone 3 and no Zone 2, which is why the first
version had no action above the fold.

**People is not a review screen.** A host returns to it over weeks as replies
land. The question on the fifth visit is not *did you understand me* — it is
*what changed, and what do I do now*. That is a command board, and `UX_04`
already specifies its shape.

**But Counted / Still unknown is the single most valuable thing transferred from
the sheets.** It is the product's native way of holding a gap: known and unknown
side by side, equal weight, calm, with `More?` as a real row. It belongs in
People — as a **block**, not as the screen.

### What to build

| Zone | Content |
|---|---|
| 1 · Command header | *People* · the attendance figure with its basis and provenance · 3–4 stat cards (invited / said yes / haven't replied / confirmed covers) |
| 2 · Start here | The one move from `eventPlan()` filtered to `domain === 'guests'`, with the *why* that names other domains |
| 3 · Working list | The roster: search, lens chips, rows |
| 3b · Truth block | **Counted / Still unknown**, two columns, from `accessNeedsFor` and the band |
| 3c · Consequence | What replies changed elsewhere — stated as unlocks, never re-decided here |
| 4 · Right rail | Desktop only. Context, or the selected guest's detail. |

### Cost of ruling the other way

Choosing the Understanding as the surface means a host who visits weekly meets a
confirmation screen every time, and the roster — the thing she came to work in —
sits below it.

---

## D2 · THE SHEETS vs STUDIO MATTE

### First, the honest map: they disagree about less than it looks

| | Studio Matte | The sheets | Real conflict? |
|---|---|---|---|
| Editorial hierarchy | required | required | **no** |
| One dominant action per screen | required | required | **no** |
| Status carries its consequence | required | the `Why:` lines | **no** |
| No fabricated data | required | — | **no** |
| Photography | silent | central | **no — an addition, not a conflict** |
| Light ground | *"no white backgrounds anywhere"* | warm ivory | **yes** |
| Accent | steel blue | brass / warm gold | **yes** |
| Density | *"denser, not wider"* | generous | **yes** |
| Serif reach | display tier only | rows, names, heads | **yes** |

Four genuine conflicts. The rest is either agreement or addition.

### Recommendation, conflict by conflict

#### ① Light ground — **the sheets win. Warm ivory.**

`UX_01`'s *"no white backgrounds anywhere… Studio Matte is dark-on-dark"* is
**factually stale**: light mode has shipped since 2026-09-28. That line has to be
corrected whichever way this rules. Given it is being corrected anyway, correct
it to the warmer neutral the sheets use — it is a better ground for photography
and it is what you commissioned.

#### ② Accent — **Studio Matte wins. Steel stays. This is the one I would not trade.**

Not a taste argument. A functional one:

> **Brass *is* amber.** `UX_02` assigns amber to **ATTENTION** — *needs
> attention, approaching deadline, incomplete.* The sheets' brass sits in the
> same hue family as `C.warn`. Make brass the structural accent and the host can
> no longer tell *"this is a button"* from *"this needs you."*

`UX_02` allows five semantic channels — accent, warn, crit, safe, muted — and
caps a viewport at three. Collapsing accent into warn takes it to four channels
with the two most-used ones indistinguishable. **That is this repository's own
named recurring defect — one field, two meanings — expressed in colour.**

Steel as structure plus amber as attention is a working two-channel system.
Brass as both is one channel doing two jobs.

**Ruling the other way is legitimate** if you accept the cost: attention state
must then be carried by something other than hue — a left border, an icon, or a
word — on every surface in the product, not just People.

#### ③ Density — **Studio Matte wins. Unchanged.**

*"Desktop is denser, not wider"* is product reasoning, not styling. The host is a
planner triaging an event, and the sheets' spacing is a brochure's. The sheets
are the right **register**; they are not the right **data rate**.

#### ④ Serif reach — **Studio Matte wins. Display tier only.**

Also functional. `UX_04`'s row anatomy is a fixed-height grid that truncates
rather than expands. Serif at 16px inside a 60px row is exactly what produced
the truncated names in the live renders — *Tonya Broo…*, *Desmo…*, *Joe Ok…* —
where the status chip stole width from the row's identity.

Serif stays for the domain statement and the display figure. It leaves rows,
labels, chips and controls, per `UX_01` as written.

#### ⑤ Photography — **adopt, bounded**

Not a conflict; Studio Matte is simply silent. Two conditions:

1. **The surface must look correct with no image.** `event.coverImageUrl` has no
   writer; in production today there is nothing to put there. A design that
   needs the photograph to read is broken in production. A thin masthead band
   degrades gracefully; a 240px plate does not.
2. **A fixture is visibly labelled and never masquerades as persisted truth.**

### ⑥ The consequence the board must not skip

Under `UX_07`, **almost nothing in People earns a filled primary button**: the
share link is a light handoff, every draft is draft-only, *"I told them myself"*
is record-only. The sheets put one filled brass CTA on every screen.

**If UX_07 holds, most People screens have no filled button at all.** That is a
real and visible departure from the sheets, and it should be ruled on
deliberately rather than discovered in review.

---

## D3 · THE 19 COMMITS

### Recommendation: **STAND**, with four conditions

| Why | |
|---|---|
| Capability | 50 of 67 capabilities proven and reachable; 19 browser tests; three self-inflicted regressions already caught and reverted by the parity loop |
| The defects are not the redesign's | `kidsCount`'s double writer (G2) and the missing name editor (G1) exist on the **baseline** too. Resetting does not fix them; it only hides them again |
| Risk is bounded by construction | The surface is opt-in behind `?people=1`; the pre-redesign baseline is runnable at the same URL, guarded by a source-level ratchet |
| Cost of reset | 19 commits of measured, tested work, and the three regressions re-incurred |

### Conditions

1. **G2 first.** `kidsCount` is silently destroyed by the next roster write and
   the loss reaches the protein engine. It is the only defect in the ledger that
   produces a wrong number in the physical world. Nothing is rebuilt on top of it.
2. **G1 second.** A guest's name cannot be edited; the workaround destroys that
   row's reply, meal, children, contact and group.
3. **A conformance pass is part of the slice, not after it** — the DRAFT-ONLY
   nudge labelling, the serif leaving rows, the counting chips' `aria-pressed`,
   and `guestCountNotice()` reaching the surface.
4. **Parity tests 1–5 green before any composition work.** The flag ratchet, the
   negative control, `kidsCount` survival, name-edit preservation, and
   provenance rendering.

**Ruling *prototype* is legitimate** if the composition is judged unsalvageable.
It is not cheap: the rebuild re-earns 19 browser tests and re-encounters the
three regressions, and it does not close G1 or G2.

**Ruling *hold* costs nothing and decides nothing.** The baseline is already
runnable and the surface is already flag-gated, so a hold is the status quo with
a label.

---

## THE PROCESS POINT THE BOARD SHOULD RECORD

Whichever way D2 rules, **the losing document must be corrected in the same
session.**

`CLAUDE.md` already carries the scar: its gate-status table *"had read stages 1–4
passed, 5 and 7 open since 2026-08-21 — true when written, false from
2026-09-03, and wrong here for six weeks while this file was the first thing read
every session."*

`UX_01` is that bug, live, right now: *"no white backgrounds anywhere"* has been
false since 28 September, and it is mandatory reading for every UI task. A
ruling that leaves the standard and the sheets contradicting each other in
writing will produce the same failure again, and the next person to read it will
not know which one to believe.

---

## WHAT THE BOARD IS BEING ASKED

| | Question | Recommendation |
|---|---|---|
| D1 | Which concept? | Working View as the surface; Counted / Still unknown as a block |
| D2a | Light ground | **Warm ivory** — and `UX_01`'s stale line corrected either way |
| D2b | Accent | **Steel.** Brass collides with the attention channel |
| D2c | Density | **Studio Matte**, unchanged |
| D2d | Serif reach | **Display tier only** |
| D2e | Photography | **Adopt**, must read correctly with no image |
| D2f | Primary buttons | Accept that `UX_07` leaves most People screens without one |
| D3 | The 19 commits | **Stand**, G2 and G1 first |

**Overall recommendation: PROCEED, WITH CONDITIONS.**

The blocking items are two data defects and a conformance pass, none of which is
a design question. The design questions are real but none of them blocks starting
on G2.
