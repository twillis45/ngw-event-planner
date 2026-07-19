> ⚠️ **SUPERSEDED 2026-07-17 by [`2026-07-17_THE_PLAN.md`](2026-07-17_THE_PLAN.md)** — the single consolidated
> source. This file is kept as history (it holds the reversal notes and the fuller narrative), but for current
> status read THE_PLAN. The deletion row here is now **CLOSED** by host ruling; the grounding row was corrected
> from "enforces" to "warns."

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

**The verdict (corrected twice on 2026-07-17):** Sprints 0, 1 and 2 are done — the orchestrator exists, streams,
**checks** grounding (it warns with a soft caveat; it does **not** block — corrected 2026-07-17, see §3), and answers live. **Sprint 3–4 is not a build. It is a PORT.** Four of its five payloads
already have working capability; the fifth ("order the crabs") **was never buildable honestly**. The real gap is narrower than
this board first claimed: **two** host capabilities are stranded in the frozen CRA (the attendance-memory *apply*,
and the virality loop). The communication stack and the AI features are the **planner's**, not the host's.

> **This line previously read "four of its five payloads don't exist yet." That was wrong**, and it was published
> in two docs and two commit messages. It came from grepping two directories for function names I invented, while
> 16 backend routers sat unexamined. A grep proves a *string* absent, never a *capability*. See §1's reversal note.

---

## 0 · ⛔ STOP — do not delete the CRA

> **Found 2026-07-17 while starting the harvest. This supersedes every "delete legacy" row in every plan.**

**`src/App.js` is not "the legacy host shell." It is the legacy host shell AND THE ENTIRE PLANNER APP, in one
47k-line file.** Its own freeze header says *"FROZEN — legacy CRA host shell"* — and that sentence is the trap
every reasoning step today inherited, including all of mine.

| | |
|---|---|
| `/` (CRA) | `index.js` mounts `<App />` → **the planner app**: `CommandCenter` (L3, imported `App.js:137`, 17 refs), `EventCommTab` (L4), `DailyBriefing` (L2) — **plus** the legacy host shell |
| `/hostv2/` (Vite) | its **own `index.html`** → `HostShellV2` — **host only** |
| **plannerv2** | **DOES NOT EXIST.** hostv2 is the only v2 shell. |

**Deleting the CRA deletes the planner product.** There is no replacement and no port. The plan schedules this
deletion "post-Sprint-2 — which is now reachable," and this board called it *"mechanical… slot it anywhere."*
**Both are wrong and would be destructive.**

**The deletion row has now reversed three times in one day**, each time revealing something worse: ① "unblocked,
donor role spent" → ② "two live organs still inside" → ③ **"the planner app lives here."** It is the single
most dangerous row in the plan, and it was the one most confidently marked safe.

**Before anyone touches it, the real question is a product one:** does the planner app live or die? If it lives,
the CRA cannot be deleted until a plannerv2 exists — which is a **program**, not a chore. If it dies, that is a
business decision (Planner Pro is already commercially parked), not a cleanup.

> **✅ HOST RULING 2026-07-17: "legacy is not going to be deleted any time soon."** The deletion row is **closed
> as not-scheduled**. Remove it from every plan's active queue; it returns only if a `plannerv2` program is
> chartered. **A second, independent reason it was never safe (found 2026-07-17):** `hostv2/vite.config.js`
> aliases `@app` → `../src` and the go-forward host shell imports **103 modules** from that tree — including
> `CommandCenter` itself and ~90 `lib/` engines. So deleting the CRA source doesn't just delete the planner; it
> **breaks hostv2 too.** hostv2 is a Vite front end riding on the CRA's source, not a standalone app.

---

## 1 · The order — what to build, in sequence

> ⚠️ **REBUILT 2026-07-17, after the order's own rows were proven false.** The first version of this table was
> wrong on **four of six rows**. It told you to build three things that were already built or unbuildable, and
> to delete a shell holding five live capabilities. Details in "How this table reversed" below — it is kept, not
> quietly fixed, because the failure is the most useful thing on this page.

**Sprint 3–4 is not a build. It is a PORT.** Four of its five payloads already have working capability; the gap
is that it's stranded in the **frozen** CRA and reaches the host through nothing. The plan said "build the
surfaces" because it was written before anyone checked what already existed.

| # | Do this | Why it's here | Size |
|---|---|---|---|
| **1** | **HARVEST — but only TWO items, not five** | ⚠️ **This row said five. Three of them were the PLANNER's, not the host's** (found while starting it — see §0). **Genuinely host, genuinely stranded:** ① **the attendance-memory *apply* + revert** (`App.js:10399,10426`) — legacy sizes food off learned turnout; **V2 displays the learning and never applies it**, so V2's gap isn't the missing revert, it's that the learning is **inert**; ② **the virality loop** — 5-event funnel, `PLAN_YOURS_TAPPED`, "make one free" recruit CTA (`App.js:22982…`), zero `track()` calls in hostv2. **NOT harvest — the planner's, and correctly absent from the host:** ~~comms one-tap~~ (`communication.py` channels are **CLIENT / INTERNAL_TEAM**, `author_role: planner|client|system`, message type `approval_request`, a `portal-respond` route; `EventCommTab` is the **L4 planner specialist**. A DIY host has no client — **they ARE the client**); ~~AI feature calls~~ (every `callAiFeature` consumer is a planner surface: `event_brief` in `DailyBriefing` — L2 portfolio, takes events **plural** — and `vendor_followup` in `EventCommTab`); ~~Instacart deep link~~ (a `window.open` search URL in legacy `FoodPlan`, not a capability). **hostv2's `mailto:`/`sms:`/share is very likely CORRECT for a DIY host** — their own address book, their own outbox, no deliverability or "who is events@example.com" problem. Prove that before "fixing" it. | **M** |
| ~~**2**~~ | ~~**THEN delete legacy**~~ **CLOSED — not scheduled** | **Host ruling 2026-07-17: "legacy is not going to be deleted any time soon."** Not mechanical and not catastrophic-if-deferred: it holds the planner app, and hostv2 imports 103 modules from the same `../src` tree (`@app` alias) — deletion breaks both products. The `~25 MB CRA still ships` / `react-scripts` build cost is real but is a **bundle-weight** concern, not a deletion one; it returns only with a `plannerv2` program. | — |
| **3** | **Defuse the $39 pass** | **Money landmine, one env var from live.** Real Stripe + webhook signature verification ship today, but **nothing reads pass-purchase state** — the perk copy *"Every tab, fully unlocked"* describes a gate that doesn't exist (`require_planner` is auth-only). Either fix the copy or build the entitlement, **before** anything sets `REACT_APP_BILLING_LIVE=1`. | S |
| **4** | **Delete the prompt-caching claim** | It's a no-op: a ~765-token prefix under Anthropic's 1024 floor, silently doing nothing, invisible because no code reads `usage`. At ~$0.01/ask the win is ~$0.001. **Delete the claim, don't chase the saving.** | XS |
| **5** | **Sprint 5–6 — collaboration + genUI** | The only genuinely-absent payloads left. Commerce is built-and-gated; social proof is live. | — |

### Rows that were on this list and shouldn't be

| Was | Verdict |
|---|---|
| **0 · Decide the parser fork** | ✅ **DECIDED & SHIPPED** — *one model, two guards, on purpose.* `groundingCheck` is built for answers grounded in **engines**; the parser's truth lives in the **vendor's message**, guarded by `evidenceVerified` (verbatim substring per field, human review, unverified rows default `accepted:false`) — strictly stronger for extraction. The two-**model** fork collapsed (`fa8a360f`, live-verified); the two **paths** stay, deliberately. |
| **2 · Order the crabs** | ⛔ **UNBUILDABLE — the plan asked for a lie.** Instacart returns a *deep link to a pre-filled list*; the human still checks out (`instacart.py:77,89`). Kroger's own docstring calls cart-add "a future step" and demands *"no fake matches, no broken cart promise"* (`kroger.py:21-30`). **Neither sells crabs by the bushel from a crab house** (`crabPlan.js:1-22`). Under **UX_07** the button is a truthfulness violation. The honest ceiling — *"here's what to order"* — **already ships** (`recommendCrabOrder` → `HostShellV2.jsx:7920`). |
| **3 · Invitations generate** | ✅ **ALREADY LIVE.** `draftInvite` (`doItForMe.js:147`) → `HostShellV2.jsx:29`, rendering "Use the invite we wrote" (`:3201`) and "Copy the invite" (`:10676`). |
| **4 · RSVP parse** | ✅ **BUILT, and "parse" was never needed.** Full public stack (`rsvp.py:219,239,374`) reaching the host at `HostShellV2.jsx:3094`. `RsvpSubmit` is a **structured form** (`rsvp.py:152`), not free text — there is no NLP to build. "Predict" is met by `attendanceAdjustment`. |
| **Tier 2 · call-sheet** | ⚪ Parked. Real diagnosis, self-assigned redesign of a working surface. |
| The three score-climbs | ⚪ Demoted to **diagnostics** — they generate sprint candidates, never a parallel plan. |

> ### ⚠️ How this table reversed — twice, within two hours, both times mine
>
> **Reversal 8 — "delete legacy, the donor role is spent."** I grepped legacy for prior art on the four Sprint
> 3–4 payloads, found **zero**, and generalized. The grep was right; **the question was wrong.** Legacy holds
> organs no plan row ever named — the virality loop, the attendance-memory apply. *"Zero prior art for the four
> payloads"* is a **fact**. *"The donor role is spent"* is a **prescription**. The gap between them is where
> every reversal lives.
>
> **Reversals 9 & 10 — "four of five payloads don't exist."** I searched **two directories** (`src/lib`,
> `hostv2/src`) for **function names I invented** (`orderCrabs`, `placeCrabOrder`, `parseRsvp`). They weren't
> there — so I concluded the *features* weren't. Meanwhile **16 backend routers** sat unexamined, including a
> complete communication stack with real email delivery. **Invitations-generate was live in the shell the whole
> time.** I published that claim in two docs and two commit messages before checking it.
>
> **The method that catches this:** a grep proves a **string** absent, never a **capability**. Reason from
> capability — "can the app send a message?" — not from a name you guessed. And search the whole repo: the
> backend was invisible to every check I ran.

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
| ✅ **Sprint 2** | The orchestrator | 9-tool typed layer, tool-calling loop, SSE streaming, "ask the plan" live. `groundingCheck` **checks** every-number-from-a-tool and appends a soft caveat when one doesn't trace — but it **warns, it does not block** (corrected 2026-07-17: `orchestrator.js:28` returns a flag; `HostShellV2.jsx:7743` renders the answer regardless). Passed live against a real key. Deviation: tools run **client-side** (§04 — engines are pure JS already in the browser). |
| ✅ **Tier 0** | Paced-board honesty | The board that promised pacing now paces. Tile D de-dupe. (`88d064ae`) |
| ✅ **Tier 1** | The invented noun | "areas" → "parts of your plan". **Only actually finished 2026-07-17** — the swap had reached the shell but not the two engines feeding it. Queue cap + `difficultyBand` also live. (`8bdce6fa`, `4ba76799`, `b2f46a9b`) |

### Left — the real remaining build

| | | |
|---|---|---|
| 🟠 **Sprint 3–4** | **It's a PORT, not a build** (corrected) | ~~"Four of five payloads return zero hits"~~ — **that claim was FALSE.** Real state: **invitations-generate is LIVE** (`draftInvite` → `HostShellV2.jsx:29`, two buttons). **RSVP is BUILT** (full public stack → `:3094`) and "parse" was never needed — it's a structured form (`rsvp.py:152`), not free text. **Comms one-tap is one of the most complete things in the repo** (11 routes, real Resend email, delivery webhooks) — and **stranded in frozen `App.js`**; hostv2 uses `mailto:`/`sms:`. **Reply-parse is live.** **"Order the crabs" is the only true absence — and it's correctly absent** (see §1: no integration can transact, and none sells bushels; UX_07 forbids the button). The work is a **port across the frozen seam**, not five new builds. |
| ✅ **Sprint 3–4** | **"All on the orchestrator" — clause retired** | The sprint's defining clause was written before the orchestrator existed and doesn't survive contact: **one guard does not fit every AI job.** `groundingCheck` ("every number traces to a tool result") is right for answers grounded in **engines**; the parser's truth lives in the **vendor's message**, guarded by `evidenceVerified` — verbatim substring per field, human review, unverified rows default `accepted:false` — which is *strictly stronger* for extraction. **Settled: one model, two guards, on purpose.** The two-model fork collapsed (`fa8a360f`, live-verified `parse_model: claude-sonnet-5`). |
| ⚪ **Sprint 1** | Delete the legacy shell — **CLOSED, not scheduled** | Frozen 2026-07-16, donor-only, 46,988 lines. ~~What's left is **mechanical**: a pre-delete field diff + a dated note.~~ **Host ruling 2026-07-17: not deleting legacy any time soon.** It is the planner app, and hostv2 rides on its `../src` tree (103 `@app` imports). Returns only with a `plannerv2` program. |
| ⚪ **Tier 2** | Call-sheet hierarchy — **recommend PARK** | Real diagnosis (weight tracks component type, not rank). But a self-assigned redesign of a working surface while four planned surfaces don't exist. The card wall is ugly and *honest*. |
| 🟠 **Sprint 5–6** | **"NOT STARTED" was wrong** — proven 2026-07-17 | One red hid **three different truths**. **Commerce: BUILT.** Real Stripe backend (`stripe_payments.py` — checkout, verify, webhook w/ signature verification), client, and the **$39 One-Event Pass live in hostv2** (`:7556`), held off by two deliberate gates that degrade to an honest *"Free while Event Boss is in preview."* Built and consciously switched off ≠ not started. **Social proof: LIVE** — anonymized `goingCount` renders today (`InviteV2.jsx:796`). **Virality loop: STRANDED** in frozen legacy. **Collaboration + genUI: genuinely absent** — the red is right for those two. |
| 🔴 **MONEY** | **The $39 pass takes payment and unlocks nothing** | **Nothing reads pass-purchase state.** The only repo references to the pass are the sheet that *sells* it. Its own perk copy — *"Every tab, fully unlocked"* — describes **a gate that does not exist**; `require_planner` is auth-only (its docstring: *"this is not a role gate"*). Not an incident: it's gated off. It is a **landmine one env var from live** (`REACT_APP_BILLING_LIVE=1`). Fix the copy or build the entitlement **before** anything flips that flag. |
| 🔴 **Caching** | **Implemented, tested, and doing nothing** | `cache_control: ephemeral` is set correctly (`ai.py:350,354`) and asserted in tests — but the cached prefix is **~765 tokens**, under Anthropic's **1024 minimum**, so it **silently no-ops** (no error, `cache_creation_input_tokens: 0`). Invisible because **no code reads `usage`**. §04 sells it as "~90% cheaper." At ~$0.01/ask the saving is ~$0.001 — **delete the claim, don't chase it.** |

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

## 5 · Proving the plan — the method

> **The host's diagnosis, 2026-07-17:** *"we keep getting to steps in plan that are reversed after investigated."*
> Eight reversals in one day. That's not bad luck; it's the plan's construction.

**The plan has two kinds of rows, and only one kind reverses.**

- **FACTS** (status, architecture, counts) — these go **stale**. They were true once. Cheap to refresh.
- **PRESCRIPTIONS** (route to Haiku · all on the orchestrator · delete legacy after Sprint 2 · edge functions ·
  gate genAI behind paid events) — these **reverse on contact**, because they were **reasoned in advance**,
  before the code they describe existed. A plan is a set of predictions written in the indicative mood.

**Every prescription carries a hidden premise. The premise is the thing to test — not the prescription.**

| Prescription | Hidden premise | Premise proved? |
|---|---|---|
| "Route parse to Haiku" | Per-parse cost matters | ❌ It's a nickel an event |
| "All on the orchestrator" | One guard fits every AI job | ❌ Extraction ≠ answering |
| "Delete legacy post-Sprint-2" | Its donor value is spent | ❌ Two live organs still inside |
| "Edge functions — low latency globally" | We deploy to an edge runtime | ❌ Render free, single region, cold starts |
| "Prompt caching — ~90% cheaper" | The prefix is cacheable | ❌ ~765 tok, under the 1024 floor |
| "Gate genAI behind paid events" | An entitlement boundary exists | ❌ Auth ≠ payment; no gate exists |
| "Margin 85–95% at $39" | The pass gates something | ❌ It unlocks nothing |

**The standard, going forward:** before sequencing work on any plan row, **extract its premise and test it** —
at planning time, not at the moment of action, which is the most expensive place to find out. A row that cannot
name a testable premise isn't a plan row; it's an intention. **The eighth reversal was this document's own row 6,
written an hour before it fell** — the method catches its author too, which is the only real evidence it works.

## 6 · The other pattern

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
