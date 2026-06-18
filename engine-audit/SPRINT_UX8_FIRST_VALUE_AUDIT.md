# Sprint UX-8 — First Value Audit

**Date:** 2026-06-18 · **Mode:** AUDIT ONLY · Flow audited: the shipped host path after UX-7.
Ruthless lens: **every click before value is suspect.**

## The observed path (launch → momentum), click by click
| # | Screen / action | Clicks | Fields | What the host gets |
|---|---|---|---|---|
| 0 | Launch → **Host Home (empty)** — "Let's plan your event / Start your event" | 0 | — | A front door, not a CRM |
| 1 | **"Start your event"** | 1 | — | Opens create |
| 2 | Create Step 1 — **name · type · date** | — | 3 | The only questions asked |
| 3 | **"Create event"** (host fast-create — no kit, no review) | 2 | — | The engine scaffolds the event |
| 4 | **Success modal** — CREATED receipt + "Nothing was sent or charged" | — | — | *First confidence:* "it already did the work" |
| 5 | **"Start planning →"** | 3 | — | Closes to Host Home |
| 6 | **Host Home (event)** — summary · **"Add your guest list"** · progress · "What matters most" · rail | 3 | — | **FIRST VALUE** — a scaffolded event + a named next step |
| 7 | **"Add guests"** → Guests | 4 | — | The planning surface |
| 8 | **"Add a guest"** → name | 5 | 1 | **FIRST MEANINGFUL ACTION / momentum** |

**Today: ~3 clicks + 3 fields to first value; ~5 clicks to momentum.**

## The five measures
- **First action:** "Start your event."
- **First meaningful action:** adding the first guest (step 8).
- **First planning value:** Host Home showing the event scaffolded **for** the host with a named next step (step 6) — the engine produced a timeline-to-date, vendor categories, a typical budget, and "Add your guest list" from just type + date.
- **First moment of confidence:** the **CREATED receipt** on the success modal — "Planning timeline · Vendor categories · Budget outline · Event-day schedule · Seating tables" — the visible proof the product did the work.
- **First moment of confusion:** the **type picker** ("What are you celebrating?" — *which one am I?*); secondarily, **"Budget: In progress"** on Host Home before anything is entered (mild overstatement), and the **success modal as an extra screen** between "Create" and the event.

## The six questions
1. **Earliest moment of progress:** the success-modal CREATED receipt (step 4) — before the host has done anything, the product shows it already built the plan.
2. **Action that most reliably creates momentum:** **adding the first guest** — it's the first domino (sizes budget/food/schedule) and the surfaced next step.
3. **Screens still visited before value:** one suspect — the **success modal** (an interstitial requiring a "Start planning" tap; the same confirmation already appears as a Host Home toast).
4. **Unnecessary decisions remaining:** the **name** field (required; should be optional/auto-default), the **kit was already removed** (good); the date's dual paradigm (chips + manual picker) is one decision too many.
5. **If a host has only 5 minutes:** create the event + add a few guests (or name the must-have moment). They should leave feeling "it's handling the plan, and I've started."
6. **Shortest path to first success:** Start your event → type + date → Create → Host Home → Add guests. **Target: 4 taps, 2 fields.**

## Map + verdicts

**Create Event → First Value → First Confidence → First Habit**

| Step | Verdict | Why |
|---|---|---|
| Host Home empty → "Start your event" | **EXECUTE** | Minimal, correct front door. Keep. |
| Create — **type** | **EXECUTE** | The one true prerequisite (drives the engine). |
| Create — **date** | **EXECUTE** (input **TEST**) | Required; but collapse the chips + mm/dd dual paradigm to one. |
| Create — **name** | **TEST** | Make optional / auto-default "My {type}". One fewer field before value. |
| "Create event" (fast-create) | **EXECUTE** | The no-intake win from UX-7. |
| **Success modal — CREATED receipt** | **TEST** (relocate) | The confidence is gold; the *modal* is an interstitial. Fold "here's what we set up" into Host Home's first view (a one-time dismissible card), not a gating screen. |
| **Success modal — NOT DONE line** | **PARK** | Already host-framed to one line; cheap, low-harm. Leave for now. |
| **Success modal — "Start planning" tap** | **KILL** (the interstitial) | Removing the modal removes this click — Create lands on Host Home directly (the toast already confirms). |
| Host Home — summary + **"Add your guest list"** | **EXECUTE** | This *is* first value. Protect it. |
| Host Home — "What matters most" prompt | **EXECUTE** | Optional, contextual, well-placed. |
| Host Home — "Coming up later" rail | **EXECUTE** | Calm reachability; no attention tax. |
| "Budget: In progress" (pre-data) | **TEST** | Should read "Not started" until a number exists — small honesty fix. |
| Guests → Add a guest → momentum | **EXECUTE** | The habit anchor. Instrumented (`first_guest_added`). |

## Recommendation (ruthless)
The host path is already short. The **single highest-leverage cut is the success modal**:
fold its "look what I built for you" receipt into Host Home's first visit and let **Create land
directly on Host Home**. That removes one screen + one click before value while *keeping* the
first-confidence signal — net first value drops from ~3 clicks to ~2. Pair it with **name →
optional** (one fewer field) and the **date single-paradigm** fix, and the shortest path is
**type + date → Create → Host Home → Add guests = 4 taps, 2 fields.**

Everything else is EXECUTE (keep) — the no-intake flow, Host Home, the named next step, and the
guest-add habit anchor are the product working as intended. Nothing here needs new
intelligence; the win is removing one interstitial and one field.

*(Audit only — no changes made. This is the spec for a UX-9 "Create → Host Home, no
interstitial" cut if approved.)*
