# Sprint UX-3 — Progressive Disclosure Architecture (Stage Intelligence)

**Date:** 2026-06-18 · **Branch:** `main` · **Mode:** AUDIT (no build)

Persona Intelligence (who) is shipped. This audit defines **Stage Intelligence (when):** the
host interface should adapt to where the event is in its lifecycle, so a surface must **earn
its way onto the screen** by stage + data. Grounded in the real surfaces (Host Home 5
sections; Command cards: *What this is · Decisions · You're Set On · Needs You · Next Up ·
Vendors · Documents · Planning Health · Team*) and ACT-1's observed "too much, too early."

**Note:** partial Stage Intelligence already exists — reveal-when-data nav
(`presentationNav` adds Vendors/Documents/Messages only with data), the empty-event Start-Here
tier (CommandCenter:1448), and Positive Attention (only shows what's *set*). UX-3 formalizes
and extends it.

## Part 1 — Event Lifecycle Model

| Stage | Trigger | Decisions that become relevant |
|---|---|---|
| **1 · Created** | event exists, ~no data | What is it · when · roughly who's coming |
| **2 · Early Planning** | >30d out; guests/budget forming | Guest list · budget frame · venue |
| **3 · Active Planning** | ~14–30d; vendors/contracts | Vendors · contracts/COI · key decisions · the must-have moment |
| **4 · Final Prep** | <14d | Run of show · confirmations · seating · headcount lock |
| **5 · Event Day** | day-of | Arrivals · timeline cues · day-of board |
| **6 · Complete** | past date | Outcomes · thank-yous · lessons |

## Part 2 — Surface Inventory (stage classification)

Legend: ●=Always · ◑=Reveal Later (stage/data) · ◇=Conditional (data-gated) · ✕=Hide for hosts.

| Surface | 1 Created | 2 Early | 3 Active | 4 Final | 5 Day | 6 Done |
|---|---|---|---|---|---|---|
| Host Home: Event Summary | ● | ● | ● | ● | ● | ● |
| Host Home: **Next Step** | ● | ● | ● | ● | ● | ◑(recap) |
| Host Home: Progress | ◑ | ● | ● | ● | ◑ | ◑ |
| Host Home: What Matters (identity) | ◇ | ◇ | ● | ● | ● | ● |
| Host Home: View Event Day | ◑ | ◑ | ● | ● | ● | ◑ |
| Command: Up Next hero | ● | ● | ● | ● | ● | ◑ |
| Command: Needs You | ✕(empty) | ◇ | ◇ | ● | ● | ✕ |
| Command: You're Set On | ✕ | ◇ | ◑ | ● | ● | ◑ |
| Command: Decisions | ✕ | ◇ | ● | ● | ◑ | ✕ |
| Command: Planning Health / Where things stand | ✕(all empty) | ◑ | ● | ● | ◑ | ◑ |
| Command: Next Up (timeline) | ◇ | ◑ | ● | ● | ◑ | ✕ |
| Command: Vendors | ◇ | ◇ | ● | ● | ◑ | ◑(outcomes) |
| Command: Documents/Paperwork | ◇ | ◇ | ◑ | ● | ◑ | ◑ |
| Command: Team | ✕ | ✕ | ✕ | ✕ | ◇ | ✕ |
| Outcome capture | ✕ | ✕ | ✕ | ✕ | ◇ | ● |

**Key reads:** at **Stage 1**, almost everything on the Command Center is empty or premature —
only the Event Summary + one Next Step are honestly earned. "Needs You" rendering *"nothing
needs you"* and "Planning Health" showing all-empty are **noise that should not appear yet**
(✕). Identity ("What matters") is ◇ — show it the moment meaning is captured, hide otherwise.

## Part 3 — Navigation Audit

| Tab | Immediately | After data | Near Event Day | After completion |
|---|---|---|---|---|
| Overview | ● | ● | ● | ● (becomes recap) |
| Plan (Planning) | ● | ● | ● | ◑ recede |
| Guests | ● | ● | ● | ◑ (thank-yous) |
| Money (Budget) | ◑ | ● | ● | ◑ (final spend) |
| **The Day** | ◑ | ● | **● primary** | ◑ |
| Vendors | — | ◑ when added | ● | ◑ outcomes |
| Paperwork | — | ◑ when docs | ● | ◑ |
| Messages | — | ◑ when comms | ● | ✕ |
| Details | ◑ (in More) | ◑ | ◑ | ◑ |
| Decisions / Client Intake / Crew / Seating / Calendar | ✕ host | ✕/◇ | ◇ | ✕ |

**Today:** the reveal-when-data nav already does most of column 2 (Vendors/Documents/Messages
appear with data). **Missing:** *near-event-day promotion* (The Day → the primary surface
<14d / day-of) and *post-completion recession* (planning tabs fade, recap/outcome surfaces).
These are the two Stage-Intelligence gaps in nav.

## Part 4 — Command Center Card Audit ("would a first-time host benefit today?")

| Card | Stage-1 verdict | Rule |
|---|---|---|
| Up Next hero | **Keep** | The one action — always earns its place |
| Needs You | **Hide when empty** | Don't render "nothing needs you" on a new event |
| You're Set On | **Hide until something is set** | Reassurance needs a real ✓ first (Stage 2+) |
| Decisions | **Hide until Active** | No real decision exists at creation |
| Planning Health / Where things stand | **Hide until data** | All-empty rows read as broken, not calm |
| Next Up | **Conditional on timeline** | Show when milestones exist |
| Vendors / Documents | **Conditional on data** | Already gated in nav; gate the cards too |
| Team | **Hide for hosts** | Planner concept |
| What this is (identity) | **Conditional on meaning** | Already degrades to null — correct |

**One rule covers most of it:** *a card that has nothing to say should not appear.* The hero +
identity(if any) is the entire honest Stage-1 Command Center.

## Part 5 — Cognitive Load Score

- **Today, Stage 1 (new event), Command Center:** up to ~8 sections render (hero + Needs You
  "nothing" + You're Set On empty + Decisions + Planning Health all-empty + Next Up empty +
  Vendors empty + Documents empty). Most carry **zero information** but full visual weight.
- **Progressive disclosure, Stage 1:** **2 surfaces** — Event Summary + one Next Step (+
  identity if captured). Host Home already does this; the Command Center does not yet.
- **Estimated reduction at Stage 1: ~70–75%** of visible sections. The reduction shrinks each
  later stage (by Final Prep almost everything is earned) — Stage Intelligence is *front-loaded*
  exactly where activation lives.

## Part 6 — Activation Impact

- **Decisions removable from the first session:** ~4 — event **type**, **kit** archetype, the
  open **budget estimator**, and the **audience** question can all defer out of creation
  (ACT-1 #1/#3/#10). First session = name + date + "add your guests."
- **Screens that disappear at Stage 1:** the multi-card Command Center collapses to Host Home +
  one action; the 3-step create modal collapses toward 1 (name + date).
- **Actions deferred:** budget setup, vendor entry, decisions, seating, schedule — all surface
  when their stage/data arrives, not on day 0.

## Final Question — minimum interface for a host at creation

**Host Home, Stage 1:**
```
Maya's Graduation Party
Jul 15 · 27 days to go
─────────────────────────────
Your next step:  Add your guests        [Add guests →]
─────────────────────────────
View Event Day →
```
Event name · date · days remaining · **one** next step (a *simple win*, not "Decide…") · a way
to peek at Event Day. **Nothing else** — no progress grid of empties, no Decisions, no Planning
Health, no Needs-You-is-empty. Every other surface (progress, vendors, decisions, paperwork,
the readiness rows) **earns its way on** the moment its stage or data arrives.

**Build implication (for a later sprint, not now):** a single `eventStage(event)` reader
(derived from days-to-event + data presence — no new storage) that the Command Center cards and
nav promotion/recession consult, exactly as `audiencePersona` does for persona. Most of the
plumbing (reveal-when-data, empty-event Start-Here, collapse-on-track) already exists; Stage
Intelligence is the small unifying reader on top. **Subtraction first: hide the empty cards at
Stage 1 — that alone is most of the activation win.**
