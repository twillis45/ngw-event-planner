# Where We Actually Are

_Status board · **2026-07-17** · Twin of artifact `58b1193b-88b8-40ef-a3d9-99d9bbee0f2c`
(https://claude.ai/code/artifact/58b1193b-88b8-40ef-a3d9-99d9bbee0f2c). **The artifact is the readable
original** — if you change one, change the other, or this file starts lying too (the [audit
INDEX](../audits/INDEX.md)'s own rule)._

> **Why this exists:** the host said "I'm confused." The cause is structural, not personal: **five roadmaps are
> running at once and only one is written down as authoritative.** They use different units — sprints, tiers,
> waves, scores out of 10, 50 and 420 — none reference each other, and their numbers disagree. This board
> reconciles the *plans*. It does not index the 36 docs in `docs/architecture/` + `docs/audits/`; that's what
> the audit INDEX is for.

**The verdict:** Sprints 0, 1 and 2 are done. The orchestrator exists, streams, enforces grounding, and answers
live. **The remaining build is Sprint 3–4 — and four of its five payloads don't exist yet.** Everything else in
flight is either polish on a shell that already works, or a scoreboard measuring the same app on a different axis.

---

## 1 · The order — what to build, in sequence

Ordered by **what unblocks what**, not by size. The rails are built, so every item is a payload rather than an
architecture problem — this is the cheapest that work will ever be.

| # | Do this | Why it's here | Size |
|---|---|---|---|
| **0** | **Decide the parser fork** | A **fork, not a task.** Whether payloads ride the orchestrator changes how all four get built. Answer it and everything below has one shape. | minutes |
| **1** | **Parser → orchestrator** | The smallest possible test of the rails, on code that **already works**. Proves the pattern before four new things get built on it — migrating known-good beats debugging greenfield. | S |
| **2** | **Order the crabs** | **Closes the vendor loop**, already half-built: send → reply → *parse (exists)* → apply → order. Highest value per unit of work, and it's the flagship's own moment. | M |
| **3** | **Invitations generate** | Opens the guest loop, and `InviteV2` already exists as a surface to build on. Must precede RSVP-parse — you can't parse replies to invites you never sent. | M |
| **4** | **RSVP parse** | Closes the guest loop. Feeds guest count → food, budget, capacity. `attendanceAdjustment` already *predicts* deterministically — this is parsing real replies, not forecasting. | M |
| **5** | **Comms one-tap** | Last because it's the **biggest greenfield**: `commApi` isn't imported by the host shell at all. It also rides on both loops above, so it's cheapest once they exist. | L |
| **6** | **Delete legacy** | **Now unblocked** — verified 2026-07-17: legacy holds **zero** prior art for all four payloads, so its donor role is spent. Slot anywhere; earlier means 46,988 fewer lines to search while building. | S |
| **7** | **Sprint 5–6** | Only after the surfaces exist. Re-verify its status first — the red is inherited. | — |

**Not on this list:** Tier 2 (parked) and the three score-climbs (demoted to diagnostics). If either earns a
slot, it earns it by **displacing a numbered row above, in writing**.

## 2 · The five roadmaps

Only the first is authoritative. The rest are real work, but none is a build plan — and the density tiers aren't
written down anywhere at all.

| Roadmap | Unit | Where it lives | Verified? |
|---|---|---|---|
| **Execution Plan** ✳ | Sprint 0–6 | [`2026-07-11_EXECUTION_PLAN_AND_COST.md`](2026-07-11_EXECUTION_PLAN_AND_COST.md) — the build plan | ✅ re-verified 2026-07-17 |
| **Density tiers** | Tier 0–2 | **Nowhere.** From a review board + a Higgsfield detour | ✅ re-verified 2026-07-17 |
| **Decision Engine climb** | 40/50 | Memory + artifact — 5 dims, 8 waves | 🔴 not re-checked |
| **Master Audit → 10+** | 8 waves | [`2026-07-14_MASTER_AUDIT_TO_10PLUS.md`](../audits/2026-07-14_MASTER_AUDIT_TO_10PLUS.md) | 🔴 not re-checked |
| **vs Market Leaders** | ?/420 | [`2026-07-13_EVENT_BOSS_VS_MARKET_LEADERS.md`](../audits/2026-07-13_EVENT_BOSS_VS_MARKET_LEADERS.md) | 🔴 **numbers disagree** |

**The disagreement is not cosmetic.** For vs-Market-Leaders, session memory says `249/420`; the doc itself
contains `226/420` **and** `237/420`. Not reconciled here — that's a job, not a footnote, and guessing would
add a sixth number.

## 3 · The ledger

### Done — verified in code & live

| | | |
|---|---|---|
| ✅ **Sprint 0** | Stop the lies | Overdue-on-creation, contradictions, input guardrails. Shipped 2026-07-10. |
| ✅ **Sprint 1** | One app | Legacy honesty transplanted into V2. Undo is universal via the single `patchEvent` path — **it was already done when the ledger called it partial**. |
| ✅ **Sprint 2** | The orchestrator | 9-tool typed layer, tool-calling loop, SSE streaming, "ask the plan" live. `groundingCheck` **enforces** every-number-from-a-tool. Passed live against a real key. Deviation: tools run **client-side** (§04 — engines are pure JS already in the browser). |
| ✅ **Tier 0** | Paced-board honesty | The board that promised pacing now paces. Tile D de-dupe. (`88d064ae`) |
| ✅ **Tier 1** | The invented noun | "areas" → "parts of your plan". **Only actually finished 2026-07-17** — the swap had reached the shell but not the two engines feeding it. Queue cap + `difficultyBand` also live. (`8bdce6fa`, `4ba76799`, `b2f46a9b`) |

### Left — the real remaining build

| | | |
|---|---|---|
| 🟠 **Sprint 3–4** | **The surfaces — this is the work** | **Four of five payloads return zero hits**: invitations-generate, RSVP-parse, comms one-tap, order-the-crabs. "RSVP predict" is arguably already met *deterministically* by `attendanceAdjustment` — no tokens spent, the cost rule working. |
| 🟠 **Sprint 3–4** | **The parser rides its own route** | The sprint's clause is *"all on the orchestrator."* The one AI surface that shipped uses `/api/ai/parse-vendor-reply` and never touches `/api/ai/orchestrate` — inheriting neither the tool layer nor the grounding guard. Real AI **beside** the orchestrator, not on it. |
| 🟠 **Sprint 1** | Delete the legacy shell | Frozen 2026-07-16, donor-only, 46,988 lines. Migrate/drop audit complete. What's left is **mechanical**: a pre-delete field diff + a dated note. |
| ⚪ **Tier 2** | Call-sheet hierarchy — **recommend PARK** | Real diagnosis (weight tracks component type, not rank). But a self-assigned redesign of a working surface while four planned surfaces don't exist. The card wall is ugly and *honest*. |
| 🔴 **Sprint 5–6** | Collaboration, genUI, commerce | Untouched. Its red is **inherited, not verified** — out of scope for the 2026-07-17 pass. |

## 4 · Blocked on a ruling

1. **Does the vendor parser move onto the orchestrator, or do two AI paths stay on purpose?** Ties to the
   `aiProxy`-consolidation backlog item. Unanswered, Sprint 3–4's defining clause can never be true.
   **Rec:** move it — otherwise the grounding guard protects one surface and the rails were built for nothing.
2. **Tier 2 — a sprint with a written why, or parked?** **Rec: park.** If wanted anyway that's legitimate, but
   it goes in the ledger as a sprint rather than staying the thing work drifts toward whenever a plan question
   gets answered.
3. **Which scoreboard is authoritative?** Five ladders, one app, incomparable units, disagreeing numbers.
   **Rec:** the Execution Plan is the build plan; the rest are **diagnostics** — they generate sprint
   candidates, never a parallel plan.

## 5 · The pattern

Three times on 2026-07-17 alone, the same shape: **built, then one wire short of the host.** The paced board
that didn't pace. The orchestrator marked "doesn't exist" after it existed. A noun swap that reached the shell
and stopped at the engines feeding it. Each was found by **driving the live surface** — never by a passing
test, a clean build, or a green deploy. The `phaseProgress` test asserted the *old* noun and stayed green the
whole way.

The ledger drifts in **both** directions — it undersold Sprint 1's undo and Sprint 2's orchestrator, and
oversold Sprint 3–4 by writing "partial" over a row whose defining clause nothing met. **A row is only as true
as its last check. Date every change here.**

---

_Verified 2026-07-17 against the code, and live for anything marked live. Sprints 0–4 and Tiers 0–1 were
re-checked this session; **Sprint 5–6 and the three score-climbs were not**._
