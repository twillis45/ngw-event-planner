# Competitive Automation Teardown — Event Boss vs the field

_Last updated: 2026-06-30. Owner: Todd. Grounded in vendor sources (see bottom) + the Event Boss codebase/memory._

> **The one line:** Everyone else automates **templates you author** or **reminders off a date**. Event Boss automates **the plan itself** — derived from what the event _is_. That's the only kind of automation nobody can ship without the grounding, and the grounding is the company.

---

## 1. The battlefield — three arenas, three *kinds* of automation

HoneyBook/Dubsado are only one corner of the field. Mapping the full landscape reveals that there are really **three kinds of automation, and only one is defensible.**

| Arena | Players | What it automates | Automation *kind* |
|---|---|---|---|
| **A — Clientflow CRM** | HoneyBook, Dubsado | paperwork *around* the client (proposals, contracts, invoices, nurture) | **Authored** — you build templates + triggers |
| **B — Pro event suites** | Aisle Planner, Planning Pod, Cvent | the operational workflow (tasks, BEOs, floor plans, RFPs, payments) | **Authored** — templated workflows + checklists |
| **C — Host/guest invite apps** | Partiful, Evite, Joy | guest comms (reminders, text blasts, RSVP, waitlists) | **Scheduled** — time-based off the event date |
| **★ Event Boss** | — | the *plan itself* (what to do, how much, sized to the crowd, what fails) | **Derived** — generated from event semantics + a grounded playbook |

---

## 2. Arena A in detail — HoneyBook vs Dubsado (clientflow)

Both automate the lead → booked → paid → offboarded **clientflow**. Their automation operates on *communications and documents* — **neither knows anything about the event** (how much food, how many chairs, what fails if it rains).

| | HoneyBook | Dubsado |
|---|---|---|
| Trigger model | one main trigger / automation (contract signed, Smart File done) + basic yes/no branch | multiple triggers, conditional logic, delays, pause, **parallel flows** |
| Signature feature | **Smart Files** (interactive proposal+contract+invoice+questionnaire that walks the client through and triggers the next step) | deep branching workflows + **canned-email** library |
| Lead capture → auto-response | ✅ auto-create project, auto-tag, instant reply | ✅ via forms + workflows |
| Payment automation | ✅ reminders, milestones, autopay | ✅ same |
| Setup cost | **1–2 days** (intuitive, template-led) | **1–2 weeks** (powerful but steep) |
| Verdict | simpler, faster, approachable | more powerful, more control, power-user |

**Takeaway:** Dubsado is the more powerful *authored* engine; HoneyBook lowers the curve. It's the same kind of automation — the differentiation is only depth-vs-ease.

---

## 3. The three kinds, and why only one is a moat

**1. Authored automation** (Arena A + B). You build the templates and wire the triggers; the product executes them. Commoditized — the only differentiation left is depth-vs-ease, a feature-checklist arms race. **Not a moat.**

**2. Scheduled automation** (Arena C). Zero setup — the app knows the event date and fires reminders off it (Partiful: 1 week before to "Invited/Maybe," 2 hours before to "Going"; text blasts; auto-waitlists). *Dumb* (knows the date, nothing else about the event) but **free, consumer-grade, and now table-stakes** — Partiful became a TIME100 company on exactly this. **Not a moat — it's the floor.**

**3. Derived automation** (Event Boss). The system *generates the plan* from the event's meaning + a grounded corpus: `playbookChecklist` projects tasks, the attendance band sizes food/chairs/budget, the no-guesswork engine delivers the next step, Do-It-For-Me writes the invite/thank-yous from the facts. **Nobody else does this** — A and B make you author it, C doesn't know the event exists. The only kind that's hard to copy. **The candidate moat.**

---

## 4. Pressure-test: is "derived" a real moat — or just hand-authored playbooks?

| Claim | Reality check |
|---|---|
| "Derived = learned from data, compounds with use" | ❌ **Not yet.** Corpus is ~empty (~0 real events). Today "derived" = **pre-authored by us** — a few types wired (Dinner Party, Crab Feast, a few cookouts). A grounded *template*, not a flywheel. |
| "The grounding (sizing math, risk model, taxonomy) is defensible" | ✅ **Real.** BLS pricing, attendance-band research, `eventTaxonomy`, playbook provenance — genuine domain modeling a competitor can't scrape. **This is the actual asset.** |
| "No setup, unlike A/B" | ✅ **Real and rare** — the wedge is "no workflow to build," not "a better builder." |
| "Hosts will feel more automated than Partiful" | ⚠️ **Not on the axis they feel.** A host judges automation by *did it nag my guests for free?* Partiful does; Event Boss's guest-comms reminders/blasts are thin. On the one automation hosts viscerally notice, **a free app currently looks more automated.** |

**Verdict:** derived automation is a real moat **in principle**, but gated on two things not yet in hand: a **corpus** (needs activation) and **breadth of event types** (only a few wired). Today it's a promising thesis, not a defended position.

---

## 5. Where Event Boss should win / match / not play

| Axis | Stance | Why |
|---|---|---|
| **Derived planning automation** (sizing, tasks, risk, next-step) | **WIN — go all-in** | Only defensible kind. Lever = *breadth of types* + the *corpus flywheel*. |
| **Guest-comms scheduled automation** (auto reminders, text/email blasts off the date, RSVP) | **MATCH — table-stakes** | Partiful set the floor; not matching makes us look *behind a free app* to the host. Cheap to build. |
| **Clientflow depth** (Dubsado-style branching workflows) | **DON'T PLAY** | Betrays the "no-setup, derived" identity; 1–2-week-setup arms race; `comms-frozen` + persona-scope already say no. |
| **Operational suite breadth** (Cvent RFPs, 3D floor plans) | **DON'T PLAY** | Capital-heavy, incumbent-owned; `floorplans-parked` already ruled it out. |

---

## 6. The hinge

The "MATCH guest-comms" recommendation collides with the **`comms-FROZEN`** directive (no comms work until beta users generate evidence). Reading: that freeze is scoped to **planner-side messaging/CRM**, whereas *guest-side scheduled reminders* are an **activation lever** that drives the RSVP/share loop that feeds the corpus.

**Sequencing that resolves it:**

> Match the comms floor (guest reminders/blasts) → win hosts → generate real events → feed the corpus → derived automation compounds into the actual moat.

Guest comms here isn't the frozen planner-CRM work — it's the **fuel** for the only axis that defends us. **RESOLVED — see §7.**

---

## 7. Companion spec — minimum guest-comms scheduled-automation set

**Comms-frozen scope check (no hedge): the freeze does NOT block this.** The 2026-06-08 freeze was scoped to comms *redesign/audit* passes (speculative polish), and was explicitly **LIFTED 2026-06-10** for message-drafting *innovation* (capability adds). Guest-comms scheduled drafting is a capability add, not a redesign — and it's guest-side activation fuel, not planner-side CRM. **Confirmed: build it.**

**The design that matches the floor without becoming a sender.** Partiful auto-*sends* reminders (needs an SMS/email backend — heavy, and a sending product NGW isn't). NGW already owns the hard part — the **drafts** (`doItForMe.js`: `draftRsvpChase`, `draftInvite`, `draftDayBeforeDetails`, `draftThankYou`, `draftRecap`) + `shareOrCopy` (Web Share / clipboard). The only missing piece is **scheduling**: surface the right draft, at the right time, to the right guests, as a one-tap share. NGW does the *intelligence* (when + what + who); the host does the *send* (one tap to their own SMS / WhatsApp / group chat). That's "scheduled automation" in feel, reusing ~100% existing infra, with **no SMS/email backend** and **no in-app sending** — it stays inside the draft-and-share model + the Ruthless Host Lens.

**The minimum set** — each fires off `event.date` / `event.startTime` + the `attendanceBand` RSVP state, reusing an existing draft:

| When (off event date) | Condition | Prompt (one-tap share) | Reuses |
|---|---|---|---|
| **T-1 week** | replies still out | "Nudge the N who haven't replied" | `draftRsvpChase` |
| **T-1 day** | always | "Send everyone the day-before details" (time, place, what to bring) | `draftDayBeforeDetails` |
| **T-2 hours** | day-of | "Send the see-you-soon + address" | short day-of reminder draft (~10 new lines) |
| **T+1 day** | event passed | "Send your thank-yous" | `draftThankYou` / `draftRecap` |

**New code (small, all pure / reused):**
1. `guestCommsDue(event, asOf)` — a pure reader (sibling of `taskTimeStatus`): today vs `event.date`/`startTime` + RSVP state → the due prompt(s) `{ id, when, label, draftKind, audience }`. No side effects.
2. A **"Reach out" surface** — one host card / next-step rendering the due prompt with its one-tap `shareOrCopy`. Appears on the host home / next-step spine only when a prompt is due (Attention System: surface only when there's something to do).
3. A tiny **sent/dismiss flag** per prompt (`event.guestCommsSent[id]`) so a fired prompt recedes — single-source, exactly like `rosDone`.

**Explicitly NOT:** no SMS/email backend · no in-app inbox/thread · no auto-send · no planner-CRM. Scheduler + existing drafts + existing share. ~1 reader + 1 card + 1 flag.

**Why it matters (the hinge, resolved):** this is the one automation a host *viscerally notices* — *did it nag my guests, for free, on time?* — the single axis where free Partiful currently looks more automated than us (§4). Matching it (a) kills the "behind a free app" perception and (b) drives the RSVP/share loop that **generates real events → feeds the corpus → compounds the only defensible moat (derived planning)**. Not the frozen planner-CRM work — the **fuel** for the moat.

**Instrument:** SHARE RATE per prompt + RSVP-completion lift (does the T-1wk nudge move pending→replied?). That's the activation signal the corpus needs.

---

## Sources
- [HoneyBook — Automations](https://www.honeybook.com/automations) · [Automations 2.0](https://www.emakatiraee.com/blog/honeybook-automations)
- [Dubsado — Creating workflows](https://help.dubsado.com/en/articles/467074-creating-workflows) · [Workflow actions](https://help.dubsado.com/en/articles/3186297-workflow-actions-sending-content) · [Canned emails](https://www.emakatiraee.com/blog/dubsado-canned-emails)
- [Assembly — Dubsado vs HoneyBook (2026)](https://assembly.com/blog/dubsado-vs-honeybook) · [Plutio — HoneyBook vs Dubsado (2026)](https://www.plutio.com/compare/honeybook-vs-dubsado)
- [Planning Pod](https://planningpod.com/) · [Cvent — event management](https://www.cvent.com/en/event-management-software) · [Aisle Planner overview](https://checklistguro.com/blog/the-10-best-event-planning-management-software-of-2025)
- [Partiful reminders](https://help.partiful.com/hc/en-us/articles/24470120681115-What-event-reminders-do-you-send) · [Evite vs Partiful (2026)](https://blog.mixily.com/evite-vs-partiful/)
