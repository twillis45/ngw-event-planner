# UX Program Alpha — Host Experience Transformation

**Date:** 2026-06-18 · **Branch:** `main` @ `d94a9a5` · **Mode:** Design program + decision-grade flag verdict (no screen mockups)

**Pivot:** from "can NGW be smarter" to "can a real host succeed." This program owns
onboarding, navigation, host/mobile experience, activation, and the Phase-1 Figma architecture.
No new intelligence/memory/recommendation systems.

**The single most important fact, sharpened:** the host experience splits cleanly into
**built-but-off** and **never-built**:
- **Event-level (L4)** host experience — `presentationNav.js` (6-tab nav, relabels,
  reveal-when-data), host voice, labels, Positive Attention, Event Identity, Moments — is
  **fully built and tested**, gated only by flags (`hostNavActive = navOn() && audiencePersona==='host'`).
- **L1 host home** — the front door — is **not built**. Every user, host or planner, lands in
  the planner CRM (Pipeline / Clients / Client Events / Vendor Bank). This is the PP-3 violation.

So the fastest path is **enable the built 80%, build the missing 20% (one screen), retire the
flags.** This is an *activation* program, not a build-a-lot program.

---

## Part 1 — Host Mode Architecture

**The problem (rendered, `ux1_L1_home_OFF.png`):** a host's first screen is a CRM — Pipeline,
Client Events, Clients, Vendor Bank, "Name your studio." That is a sales funnel; PP-3 forbids it.

**What a host should see:**

| Moment | Host should see |
|---|---|
| **After login (no event)** | A **checklist front door**, not a CRM. One line: "Let's plan your event." One CTA: **Start your event**. No Pipeline/Clients/Vendor Bank/studio language. |
| **After event creation** | The **event Overview (host nav)** with **one Start-Here action** — not an empty Command saying "nothing urgent." |
| **On return** | Their **one event**, the **next thing to do**, and **what's already handled** (Positive Attention). Not a 36-event sample portfolio. |

**Host-first architecture (L1):** collapse L1→L2→L3 for a single-event host. A host has *an
event*, not a *portfolio of clients*. Host L1 = { the event(s) I'm hosting · my next step ·
what's done } — a checklist home. Planner L1 keeps the CRM. **Persona, not a shared home,
decides which L1 renders.**

## Part 2 — Navigation Redesign (three models, no shared compromise)

**Host (event nav)** — already authored in `presentationNav.js`; promote it:
- **Show (always):** Overview · Plan · Guests · Money · The Day · Details
- **Reveal-when-data:** Vendors · Paperwork · Messages
- **Hidden (still deep-linkable):** Decisions · Client Intake · Crew · Seating · Calendar
- **Relabels:** Command→Overview, Planning→Plan, Budget→Money, Event Day Schedule→The Day,
  Documents→Paperwork, Communication→Messages

**Operator** — host nav + program moments (keynote/award/recognition) + Vendors always shown;
business vocabulary ("Event Schedule," "Attendance & Supplies"). (Voice/labels exist; nav set
is a thin follow-on.)

**Planner** — the full 14-tab operational cockpit + the CRM L1. **Unchanged.** This is the
product they already succeed with; do not simplify it into a toy.

**L1 nav by persona:** Host = { Home(checklist), My Event, Settings }. Planner = { Home,
Pipeline, Client Events, My Events, Clients, Vendor Bank, Settings }. Operator = host L1 + Vendors.

## Part 3 — Mobile-First Host Workflow

**Today (rendered, `ux1_event_mobile_more.png`):** bottom lanes Overview/Plan/People/Money/
Messages, and **"More" dumps all 14 tabs incl. Decisions/Client Intake/Crew**; **The Day is
buried in More.**

**Host mobile model — thumb-driven, minimal depth:**
- **Primary lanes (5):** **Overview · Plan · The Day · Guests · Money** — *The Day is a lane,
  never "More"* (it's the host's #1 day-of surface).
- **"More" for hosts:** only the reveal-when-data extras (Vendors/Paperwork/Messages) +
  Details — **never** Decisions/Intake/Crew/Seating.
- **One primary action per screen**, thumb-reachable; Moments chips (60F) and Identity render
  inline; no horizontal overflow.

## Part 4 — Activation Funnel

```
Account → Create Event → FIRST VALUE → First Vendor → First Decision → First Schedule → Event Complete
```
- **Minimum path to first value:** Account → Create Event (**2 questions: what + when**) →
  land on a **scaffolded event with a Start-Here action**. *First value = "my event exists and
  it's telling me the one thing to do next,"* reached in **2 inputs**, not 5.
- **Remove from the critical path:** kit-archetype pick, the open budget estimator, type
  taxonomy depth, "name your studio." Defer all of it to *inside* the event.
- **Instrument the back half** (currently dark): `first_decision_captured`,
  `first_schedule_built`, **`event_completed`**, **`first_outcome_captured`**.

## Part 5 — Empty-State System (eliminate dead screens)

Every empty surface answers **one question: what's the single next action?**

| Surface | Today | Host empty-state |
|---|---|---|
| Command (new event) | "Nothing urgent right now" (dead) | **Start here →** the first scaffolded step |
| Vendors | category stubs, no guidance | "Add your first vendor — or pull from your saved ones" |
| Run of Show | seeded or blank | "Your day, hour by hour. **Add the first moment** →" (Moments chips) |
| Budget | "Add category" (circular) | "Set a total, or add vendors and we'll total it" |
| Guests | clear (keep) | — |

Principle: an empty state is a **Start-Here**, never a description of emptiness.

## Part 6 — Phase-1 Figma Architecture (structure first, polish second)

Structural specs (zones/hierarchy), ready to render in Figma:

1. **Host Home** — Hero: "Plan [event] / Start your event." · Next-step ribbon (one action) ·
   "Already handled" (Positive Attention) · the event card. *No CRM rail.*
2. **Event Dashboard (Overview)** — Hero = the one Start-Here/next action · evidence (Where
   things stand, whispered) · Identity block (when meaning captured) · 3 contrast tiers.
3. **Mobile Navigation** — 5 host lanes (Overview/Plan/The Day/Guests/Money) + host-scoped More.
4. **Event Overview (mobile)** — single-column hero + evidence; one primary action thumb-low.
5. **Vendors** — list + add-first + the honest recollection line (when history exists).
6. **Run of Show ("The Day")** — timeline rows + Moments chip row; mobile-native.
7. **Event Completion** — the missing finish line: "How did it go?" → Overall + must-have +
   vendor outcomes (the data the moat needs).
8. **Empty States** — the Start-Here pattern, one component, every surface.

*Sequence within Phase 1: #3/#4 (mobile nav + overview) and #1 (host home) first — they unlock
activation; #7 (completion) closes the data loop.*

## Part 7 — Feature-Flag Verdict (re-evaluated, not protected)

The "everything OFF" default was correct for safe building and is **now the primary barrier to
real users.** Disposition:

| Flag | Verdict | Rationale |
|---|---|---|
| `pi.voice` | **RETIRE → persona-driven** | Host events should *be* host voice, not opt-in. |
| `pi.nav` | **RETIRE → persona-driven** | The 6-tab host nav is the product for hosts. |
| `pi.labels` | **RETIRE → persona-driven** | Plain vocabulary is not an experiment. |
| `pi.attention` | **PROMOTE default-ON** | Safe reader; reassurance; graceful empty. |
| `pi.identity` | **PROMOTE default-ON (host)** | Degrades to nothing without meaning; pure upside. |
| `pi.moments` | **PROMOTE default-ON** | Additive ROS value; honest at n=0. |
| `pi.because` | **PROMOTE default-ON** | Honest explanations; safe. |
| `pi.confidence` | **PROMOTE default-ON** | Pattern-014 honesty for all personas. |
| `pi.valueConfidence` | **PROMOTE default-ON** | Derived-only; safe. |
| `pi.decisions` | **PROMOTE (host+planner)** | Reader over existing resolvers; useful, honest. |
| `pi.memory` | **KEEP experimental** | Honest but empty until real data (61A). Turn on with the cohort. |

**The one decision that needs your call (the only real fork):** *what persona does an
unset-audience event default to?* Today the audience selector is itself hidden behind `pi.voice`,
so **no event has an audience set** — a blunt default-on would flip planner demo events to host.
**Recommendation:** (a) **always capture audience at event creation** (un-hide the selector);
(b) resolve persona from it; (c) for unset/legacy events, default by **account type** — self-
serve signup ⇒ host, planner account ⇒ planner. This makes enablement safe without guessing.

## Part 8 — Activation Readiness Scorecard

| Area | Current | Target | Gap | Effort |
|---|---|---|---|---|
| Onboarding | C− | A− | Host home + 2-question create + cold-start CTA | M |
| Navigation | D+ | A− | Enable host event nav + build host L1 | **S (enable) + M (L1)** |
| Mobile | D+ | A− | The Day → primary lane; host-scoped More | **S** |
| Host Experience | D | A | Enable built L4 + build L1 home | **S + M** |
| Activation | D | B+ | Funnel trim + instrument back-half + cohort | M |

**Highest-ROI fixes (ranked):**
1. **Capture audience + retire voice/nav/labels → persona-driven host experience.** *Tiny code,
   converts both BLOCKERs.* (S)
2. **Mobile: The Day into the primary lane; host-scoped More.** (S)
3. **Cold start: Start-Here on empty Command + 2-question create.** (S–M)
4. **Build the host L1 home (checklist, not CRM).** The only real build. (M)
5. **Instrument `event_completed` + `first_outcome_captured`.** (S)
6. **Promote the safe readers default-on.** (S, with QA)

Four of six are **S** (small/enablement). One real screen to build.

---

## Final Question — fastest path from planner platform → product hosts adopt

**Enablement, not construction — and it's not close.** ~80% of the host product is built and
switched off. The fastest path, in order:

1. **Un-hide the audience question** at event creation, resolve persona from it (host default
   for self-serve). *(hours)*
2. **Retire `pi.voice`/`pi.nav`/`pi.labels`** → host-audience events get the 6-tab nav, plain
   labels, host voice automatically. *(hours; QA pass)*
3. **Promote the safe readers** (attention/identity/moments/because/confidence/value/decisions)
   to default-on. *(hours; QA pass)*
4. **Mobile:** put **The Day** in the primary lane; restrict host "More" to data-revealed
   extras. *(hours)*
5. **Cold start:** Start-Here on the empty Command; trim event-create to 2 questions. *(1–2 days)*
6. **Build the one missing screen — the host L1 home** (checklist front door, no CRM). *(2–4 days)*
7. **Instrument** the finish-line signals so the data loop closes. *(hours)*

**Steps 1–4 + 7 are days of *enablement*, not weeks of building.** Step 6 is the single genuine
new screen. **That is the entire transformation.**

Ruthlessly: the product does not need to get smarter to get adopted — it needs to **turn on the
host product it already has and build one front door.** Do not protect the everything-OFF
default; it has done its job. Optimize for activation: enable, simplify, and ship the host home.
**The smart product exists; make it a usable one — mostly by flipping it on.**

---

### Recommended next build — **Host Activation v1** (scoped, ready to execute)
- Capture audience at create + `hostExperienceOn(event)` persona resolver (host default for self-serve).
- Retire voice/nav/labels flags (persona-driven); promote the safe readers default-on (behind one QA gate).
- Mobile: The Day → primary lane; host-scoped More.
- Start-Here empty-Command CTA; 2-question create.
- Host L1 home (checklist).
- Instrument `event_completed` + `first_outcome_captured`.

No new engine. This is the activation milestone the whole 60C→UX-1 arc has been pointing at.
