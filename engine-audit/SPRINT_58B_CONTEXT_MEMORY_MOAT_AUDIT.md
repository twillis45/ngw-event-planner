# Sprint 58B — Context, Memory & Human Understanding (audit)

*Strategy audit. No build. The question is no longer "can NGW plan?" (yes) — it's "can NGW understand people, outcomes, and its own history, and does it get smarter with each event?" Every claim traced to runtime. Date: 2026-06-18.*

## The one-sentence finding (read first)
NGW is an **amnesiac**: it touches stakeholder, outcome, rationale, and vendor-performance signal on every event and **throws almost all of it away**. The 57 presentation stack made it *feel* intelligent; nothing yet makes it *get* smarter. The category-defining move is **memory** — and a surprising amount of the scaffolding already exists (the Vendor Bank reliability engine) waiting for a capture loop.

---

## Part 1 — Stakeholder Intelligence
| Tier | What exists (runtime) |
|---|---|
| **Observable & rich** | `event.guests[]` — per-person `rsvp · meal · needs · group · plusOne · kids · giftReceived · thankYouSent · email · phone · address`. `event.crew[]` with roles (`summarizeCrew`). `event → client` via `clientId` (App.js:17373) — the client is a modeled stakeholder (approvals flow through `commClient`). |
| **Dark (captured, not synthesized)** | guest `group`s, `plusOne` links, `needs` patterns, gift/thank-you state — a latent relationship graph that nothing reads as *people intelligence*. The honoree is a single free-text string (`event.honoree`), not a person record. |
| **Observable, not captured** | who the **decision-makers** are, **whose approval matters**, who must be pleased. The approval flow proves the *client* is the approver, but within the guest list there's no influence/role model. |
| **Missing** | a stakeholder **role/influence** model (celebrated · payer · approver · runner · VIP · attendee), and the social graph. |

**Stakeholder Intelligence v1 (cheap, no engine):** a pure *reader* that classifies the people **already in the event** into roles — honoree → "the celebrated", `clientId` → "the approver/payer", host → "the runner", guests → attendees — plus **one** new captured field: a `vip`/`keyStakeholder` flag on guests. Low effort, modest value, **low moat alone**.

## Part 2 — Outcome Intelligence — **the biggest dark hole**
**Can NGW identify why the event exists / who success is for / how success is measured? → NO.** Intake captures *logistics* (type, date, venue, budget, guest count, market, time-of-day, audience). "Goals / objectives / KPIs" appear only as **template task TEXT** ("Define event goals and KPIs", App.js:1388; "Define theme, objectives", 2488) — prompts the planner reads and answers *offline*; the answer is **never stored**. There is no `event.why` / `event.successFor` / `event.successLooks`.

**What's missing:** three captured fields. **Why it matters:** outcome is the orienting context for *every* recommendation — "you said this is about honoring Grandma's 50 years, so prioritize the toast and the photo wall" vs generic task lists. **Cost:** 3 intake questions + persistence (a *data* build — the first to add persisted fields). **Leverage: highest single dark-intelligence unlock in the product.**

## Part 3 — Decision Memory — rationale is **discarded**
At runtime, **no decision rationale is captured** (grep: zero `rationale`/`decisionLog`). Decisions record *what* (overdue task cleared, vendor `status='Confirmed'`, approval sent) but never *why*. Rationale **already exists and is thrown away** at: **vendor selection** (picked X over Y — reason lost), **budget allocation**, **date choice**, and the **approval thread** (`commClient` holds the discussion but it's not linked to the decision it resolved). Playbook `decisions[].why` is *authored-generic*, not the planner's actual reason.

**Decision Memory v1:** an optional `rationale` note captured at the moment of choice (vendor pick, budget set, date lock) + linking the resolving `commClient` thread. **The single cheapest moat seed** — one field, compounds forever.

## Part 4 — Event Memory (a planner runs 10 events)
| Should be remembered | Compounds? | Becomes proprietary? |
|---|---|---|
| **Vendor performance** (showed on time? quality? incidents?) | **Yes — every event** | **Yes** — the studio's private reliability dataset |
| **Actual vs estimated cost** (real $ vs the estimate) | Yes | Yes — *this planner's* true baselines |
| **Real timelines** (what actually slipped) | Yes | Yes |
| **Decision patterns** (what they choose & why) | Yes | Yes |
| **Client history** (`clientId` links exist) | Yes | Yes — relationship depth |
Today each event is an **island**; almost none of this carries forward. **The scaffold already exists** for the first row: `vendorReliabilityScore(v)`, `vendorSpecialtiesFromHistory(v, events)`, `vendorScoreBreakdown`, and the track fields `eventsCompleted · onTimeRate · avgResponseHours · plannerRehireCount · successfulEventCount · incidentCount` (App.js:12194+). **What's missing is the auto-capture loop** — completed events do **not** write back to the vendor record; those fields are planner-maintained / sample today.

## Part 5 — Knowledge Capture — what's lost forever (ranked by value)
1. **Vendor performance per event** — directly feeds the moat *and* the scaffold exists. **#1.**
2. **Actual-vs-estimated cost & timeline** — turns generic playbook estimates into *this studio's* numbers (kills the weakest part of today's estimator).
3. **Lessons / what-worked** (this venue's parking is bad; this caterer over-delivers) — pure tribal knowledge, lost at event end.
4. **Client/guest preferences across events** (always veg-heavy, hates DJs) — relationship intelligence.
5. **Day-of incidents** — the rarest, highest-signal failures; currently evaporate.

## Part 6 — Moat Analysis — Head Start vs Moat
**HEAD START (great on day 1, *copyable*, does NOT compound with volume):** the playbooks, the next-action engine, the entire 57 presentation/trust stack (voice, labels, nav, attention, confidence, because, operator, decisions, value-confidence), the templates. These win the demo; a funded competitor can replicate them in a quarter.

**MOAT (stronger with *each* event, private, hard to replicate):**
1. **Vendor reliability data** — the studio's own performance history. **Strongest; scaffold exists.**
2. **The planner's cost/timeline baselines** — their real numbers as the estimate engine.
3. **Decision memory** — accumulated "why-they-chose" patterns.
4. **Client relationship history.**
These compound per-event, are **private per studio**, and create a within-account data network effect + switching cost. **What does NOT moat with volume:** playbook content, UI, the confidence layers — all head start.

> **The brutal line:** today NGW is **all head start, no moat.** Every sprint so far sharpened the head start. Zero have built the moat.

## Part 7 — Roadmap (EXECUTE / TEST / PARK / KILL)
Scored on User Value · Moat Value · Effort · Dependency Risk.
| Capability | UserV | MoatV | Effort | DepRisk | Verdict | Why |
|---|---|---|---|---|---|---|
| **Decision Memory** | Med | **High** | **Low** (1 field) | Low | **EXECUTE 1st** | cheapest moat brick; seeds Event Memory |
| **Knowledge Capture (vendor perf loop)** | Med | **High** | Med | Low | **EXECUTE 2nd** | completes the *existing* Vendor Bank scaffold → strongest moat |
| **Outcome Intelligence** | **High** | Med | Med (3 fields + intake) | Low | **EXECUTE 3rd** | biggest dark-intelligence unlock; orients everything |
| **Event Memory** | High | **Highest** | High | **Med** (needs #1+#2 feeding it) | **TEST → EXECUTE** | the compounding layer; build *after* its inputs exist |
| **Stakeholder Intelligence** | Med | Low | Low (reader) | Low | **TEST** | cheap reader now; role/VIP capture later |
| **Venue Foundation** | High | Low–Med | **High** | **High** (data sourcing) | **PARK** | real value but NOT the moat path; don't scale a forgetful product |
| **Experience Intelligence** | Vague | — | — | — | **KILL as separate** | undefined; subsumed by Outcome + Event Memory — fold in, don't build standalone |

## Final Question — the shortest path to a category-defining platform
**It is not more planning, and it is not Venue.** It is closing the **capture → compound → express** loop on the signal the product already touches and discards:

1. **CAPTURE the three things thrown away today:** the **outcome** (why / for-whom / success), the **rationale** (why each decision), and **vendor performance** (how each vendor did) — the last via the auto-write-back the Vendor Bank is already built to receive.
2. **COMPOUND** them per-event into: the **Vendor Bank** (scaffold ready), the planner's **own cost/timeline baselines**, and **decision/outcome patterns**.
3. **EXPRESS** them back through the engine that already exists: estimates become *"your typical $X"* not generic; vendor suggestions cite *"you've rehired them 5× with zero incidents"*; the next event opens **pre-informed by the last nine**.

That loop converts each event from a disposable project into a **deposit in a private, compounding asset** — precisely the line between a *tool* (head start, copyable) and a *platform* (moat, per-studio data network effect).

**Ruthless sequencing:** `Decision Memory (1 field)` → `Vendor-performance capture loop (completes existing scaffold)` → `Outcome capture (3 fields)` → `Event Memory (compound + express)`. Each is small; together they are the moat. **Park Venue and kill "Experience Intelligence" as a standalone** — both are expansion, and scaling a product that forgets only multiplies the amnesia. The 57 stack made NGW *feel* like it understands; this loop is what makes it *remember* — and remembering, per studio, is the only thing here a competitor cannot copy.

*Confidence: High — grounded in the live data model (`event.guests[]`/`crew[]`/`clientId`, `vendorReliabilityScore`/`vendorSpecialtiesFromHistory`/track fields App.js:12194+, outcome-as-template-text App.js:1388/2488, zero runtime rationale capture). Weakest assumption: that the vendor-bank track fields are planner-maintained today rather than auto-fed — confirmed by the absence of any event-completion → vendor-record write path. The capture loop is a real, scoped build, not a flip of a flag.*
