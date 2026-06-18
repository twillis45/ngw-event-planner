# Sprint 60 — Human Intelligence Foundation (audit + unified design)

*Design only (all-analysis deliverables → one unified architecture + the final question). The decisive finding: NGW **already captures human intelligence and doesn't use it.** Like the 57 arc (planner-grade engine, unexpressed), the gap is **orientation, not capture or engines.** Every claim traced to runtime. Date: 2026-06-18.*

## The finding that reframes the sprint
The intake (`ClientIntakeFlow.jsx`) already captures, and the event already stores:
- **`meaning_why`** — *"What this milestone means — the heart of the night"* → **why the event exists** (intent).
- **`honoree` + `honoree_story`** — *"who they are, the milestone, the moment that matters most"* → **who it's for** (the primary stakeholder).
- **`must_have_moment`** — *"a video tribute from her unit at dinner"* → **what success looks like** (the one thing that must happen).
- **`feeling_words`** — *"proud · warm · elegant"* → **the emotional success target**.
These are read in the day-of **RunOfShow** (App.js:30875) and **nowhere else**. They do **not** orient the next-action engine, the priorities, the voice, or memory. **Human Intelligence is captured but inert.** This sprint is a *reader*, not an engine.

## Part 1 — Stakeholder Intelligence
| Already observable | Inferred | Missing |
|---|---|---|
| `honoree` (+ `honoree_story`), `clientId` (the approver/payer), `guests[]` (group/rsvp/needs/plusOne), `vendors[]`, `crew[]`, `audience` (host/operator/planner) | decision-maker = the **client** (approvals via `commClient`); host = `audience` | the **explicit role** "this person is who success is for" (honoree is a *name*, not a modeled success-anchor); guest VIP/key flags |
**Roles that actually matter (ruthless — 5):** **Honoree** (who it's for · the success anchor) · **Host/Owner** (who runs it · `audience`/`clientId`) · **Decision-maker/Approver** (the client) · **Guests** (attendees) · **Vendors** (delivery). **Do NOT create:** Secondary Stakeholder, Influencer, Sponsor, Internal Team, Family — noise or subsumed (a "couple" IS the honoree; "family" IS guests with a group).

## Part 2 — Relationship Intelligence
**Exist today:** planner↔client (`clientId`), host↔honoree (`audience`+`honoree`), vendor↔event (`vendors[]`), guest↔group (`g.group`). **Materially change planning:** *host↔honoree* (the event is **for** the honoree — orients every priority), *planner↔client* (the approval flow), *guest groups* (seating). **Noise:** modeling dyads (bride↔groom, parent↔graduate) as separate relationships — collapse them into **one honoree** + **one host**. Model the *anchor*, not the graph.

## Part 3 — Outcome Intelligence
**Can NGW answer Why / Who / Success / Failure? — the DATA already can:** Why = `meaning_why`; Who = `honoree`; Success = `must_have_moment` + `feeling_words`; **Failure = the must-have moment doesn't happen / the honoree isn't honored.** It simply isn't *used*. **Smallest architecture: derive, don't capture** — a reader surfaces these at planning and ties `must_have_moment` to the 58E outcome ("did the must-have happen?" → overall outcome). No new fields.

## Part 4 — Success Modeling
**Universal success (every event):** the honoree/host feels it landed (`feeling_words`), **the must-have moment happened** (`must_have_moment`), the day ran without a breakdown (readiness ON_TRACK + no day-of incident), guests showed (RSVP/attendance). **Event-specific anchor (one per type):** Wedding → the couple's day · Graduation → the graduate honored · Retirement → recognition + transition · Corporate → the objective met · Fundraiser → dollars raised · Community → turnout/engagement · Birthday → the guest of honor delighted. **Model:** success = *universal signals* + *one type anchor derived from `type` + the meaning fields.* No survey.

## Part 5 — Human Memory (persist / never)
**Persist across events:** the planner's **clients** (`clientId` history), **preferred vendors** (Vendor Bank + 58G Event Memory), **recurring concerns/lessons** (`event.lessons`), **success drivers** (which `must_have_moment`s + outcomes worked). **NEVER persist:** guest personal data as a cross-event profile · an honoree's private story beyond their event (privacy) · subjective opinions as facts · anything that becomes a cross-studio reputation.

## Part 6 — Event Identity
**NGW CAN identify what an event *really* is** — derivable from `type` + `meaning_why` + `honoree`: *"A graduation party"* → **"a celebration of achievement, for the graduate, where success = the must-have moment lands."* No new data — `Graduation` + `honoree` + `meaning_why` + `must_have_moment` already say it. **How it should influence planning:** Event Identity is a **lens**, not an engine — it (a) makes the **must-have moment a tracked priority** in the existing next-action ladder, (b) keys the **voice** on the honoree's name + the meaning, (c) orients **success** at completion. It re-weights and re-phrases the existing engine; it does not replace it.

## Part 7 — Unified Architecture (one model, not four engines)
**ONE reader: `eventIdentity(event)`** — a pure projection over the already-captured fields, exactly like `eventMemory`:
```
eventIdentity(event) → {
  reallyIs,        // derived: type + meaning_why + honoree  ("a celebration of achievement")
  forWhom,         // honoree (+ honoree_story) — the primary stakeholder / success anchor
  intent,          // meaning_why
  success,         // must_have_moment + feeling_words + the type anchor (universal + specific)
  stakeholders,    // {honoree, host:audience/clientId, approver:client, guests, vendors} — read, not new
  memory,          // decisionMemory + outcomes + lessons + cross-event (Event Memory)
}
```
- **One source of truth:** the **event blob** (`event.data`) — governance-canonical (58G-B), **no new tables, no new capture, no new engine.**
- **One decision flow:** the **existing** next-action engine + the **existing** presentation seam (Pattern 011). Event Identity is an **orienting lens** fed through the seam (priority hint + voice context) — Stakeholder / Outcome / Relationship / Memory are **facets read by this one reader**, never separate engines.
- **Avoids** a Stakeholder Engine, Outcome Engine, Relationship Engine, Memory Engine — there is one reader and one flow.

## Part 8 — Vendor Intelligence dependency
Requires: vendor **outcomes** (have — 58E), vendor **identity** (the Bank-id link — gap), the planner **relationship** (`clientId`), and *optionally* the success context (does the vendor serve the must-have?). **It does NOT need the full Human Intelligence layer.** **Verdict: Vendor Intelligence is INDEPENDENT — proceed** (data-gated on the vendor↔Bank-id link + N events from 58G), it does **not** wait on Human Intelligence.

## Part 9 — Venue Foundation dependency
Requires: **Event Identity** (what the event really is → what the venue must *enable*), **success signals** (the must-have moment → venue requirements: space/power/AV for "the video tribute"), and Experience Intelligence (later). **Sequencing: Venue comes AFTER Event Identity** — judge a venue against what *this* event needs, not generically. **PARK Venue until Event Identity exists**; it is strictly downstream.

## Part 10 — Activation & Moat
| Layer | Needs scale? | Type |
|---|---|---|
| **Event Identity** (the reader, meaning fields) | **No — works on event #1** | **Product Intelligence** (aids adoption: makes the *first* event better) |
| Cross-event human memory (clients, vendors, success drivers, lessons) | **Yes** | **Moat** (compounds; private per studio) |
| Meaning capture, engine, presentation | No | Head start (copyable) |
| A shareable guest/client artifact | — | **Acquisition (still missing)** |
**The "more intelligent than adopted" risk is small for THIS layer** — Human Intelligence is mostly *expression of data already captured at intake*, so it has **near-zero adoption cost and improves the first event** (it *aids* acquisition, not gated on scale). **Keep separate:** Product Intelligence (Event Identity — ship now) vs Moat (cross-event memory — needs scale) vs Acquisition (the shareable artifact — the real gap).

## Final Question — the smallest unified Human Intelligence architecture
**One model: the `eventIdentity(event)` reader.** People, Relationships, Intent, Success, and Memory are **five facets of one projection** over data the event **already holds** (`meaning_why` · `honoree`/`honoree_story` · `must_have_moment`/`feeling_words` · `audience`/`clientId`/`guests`/`vendors` · `decisionMemory`/`outcomes`/`lessons`), oriented through the **existing engine + seam**. No Stakeholder/Outcome/Relationship/Memory engine — one reader, one source of truth (the event blob), one flow.

**The ruthless line:** NGW already *understands* humans — it captures why the event exists, who it's for, and what success looks like — and then **forgets to act on it.** The Human Intelligence foundation is not five engines; it is the single reader that makes the event's own meaning **orient the planning** — the same move that turned a planner-grade engine into a trusted one in the 57 arc, now applied to the human layer. Prefer the one model that explains everything (the event *is* an intent for a stakeholder, measured by success, remembered as outcomes) over five overlapping engines.

## Roadmap
**EXECUTE (next, 60-B): the `eventIdentity` reader** — surface the must-have moment as a tracked priority + the Event Identity one-liner + tie must-have to the outcome. Reader-only, reuses existing fields, `pi.memory`/a new `pi.identity` flag, no new store. **TEST→EXECUTE Vendor Intelligence** (independent, data-gated). **PARK Venue** (downstream of Event Identity). **PARK Experience Intelligence / Learning Loop.** **The real acquisition gap (shareable artifact) is a separate track.**

*Confidence: High — grounded in the captured meaning fields (`ClientIntakeFlow.jsx:682–693`, used App.js:30875), the people fields (`honoree`/`audience`/`clientId`/`guests`/`vendors`/`crew`), and the 58C/E/G memory. Weakest assumption: that the meaning fields are populated often enough to orient on — they're optional at intake, so the reader must degrade gracefully when empty (no meaning ⇒ fall back to today's behavior).*
