# Sprint 61A — Vendor Intelligence Audit + Activation Reality Check

**Date:** 2026-06-18 · **Branch:** `main` @ `414747a` · **Mode:** AUDIT ONLY (no build)

**Question:** Can NGW honestly move `Decision → Reason → Outcome → Memory` to
`… → Recommendation` without inventing certainty?

**Verdict up front:** **No to "Recommendation" — but yes to "Recollection," and that's
already built.** The smallest honest Vendor Intelligence is a *factual private track-record
reader* — and it already exists (`vendorMemoryFor` + `summarizeVendorMemory`) and is already
wired into `VendorPlanningWorkspace.jsx:613` behind `pi.memory`. **The bottleneck is not
intelligence. It is activation + vendor identity.** With ~0 real completed events, every
track record reads "Limited history," and the cross-event key is a fragile normalized name.

---

## Part 1 — Vendor Identity Audit  →  **TEST (fragile today; do not call it a moat yet)**

**Current matching method:** cross-event vendor identity is a normalized **name** only —
`vendorKey(name) = name.trim().toLowerCase().replace(/\s+/g,' ')` (eventMemory.js:16). No
stemming, no fuzzy match, no id link.

**The split-brain (the core finding):**
- A real **Vendor Bank** exists with **stable per-studio ids** (`vendors` table + `ngw-preferred-vendors`; `loadVendors`/`saveVendor`, vendors.js).
- But pulling a bank vendor onto an event writes **"a snapshot, not a live reference"** (App.js:32581) — the event's `vendors[]` entry gets its **own** `v.id` and a **copied name**. There is **no foreign key** back to the Bank id.
- Cross-event memory therefore keys on the copied **name**, while the Bank dedups on **`name|category`** (App.js:32585), while per-event outcomes key on the **event-scoped `v.id`** (`event.outcomes.vendors[subjectId]`, decisionMemory.js:140). **Three different identity keys, none of them stable across events.**

**Duplicate / rename risk — HIGH.** Your own example proves it:
`Soul Daddy's Kitchen` · `Soul Daddy Kitchen` · `Soul Daddy Catering` → **three different
`vendorKey`s → three separate histories.** Any apostrophe, abbreviation, or "Kitchen vs
Catering" drift fragments the record. The track record is only as good as the planner's
naming discipline.

**Verdict: TEST.** Name-key is *fine for the demo* (consistent seed naming) and *unfit for a
moat*. The real fix — stamp the Bank id onto event vendors and key memory on it — is small,
deterministic, honest plumbing, but it is **premature today** (no real multi-event data to
de-fragment). Do it the moment real repeat-vendor data starts arriving, not before.

---

## Part 2 — Existing Vendor Signals

| Signal | Status | Source |
|---|---|---|
| Selected (vendor committed to event) | **Captured** (observable) | `event.vendors[]`, status Confirmed/Booked |
| Category | **Captured** | `v.category` |
| Status / lifecycle | **Captured** | `v.status`, vendorIntelligence challenge categories |
| **Rationale (why chosen)** | **Captured** | `decisionMemory[]` rationale (≤600 chars), `vendor_selection` |
| Alternatives considered | **Captured (optional)** | `makeRecord.alternativesConsidered` |
| Selection-time confidence | **Captured (optional)** | `record.confidence` |
| **Outcome: on_time / late / no_show / great / poor** | **Captured** (post-event) | `OUTCOME_SIGNALS.vendor_selection`, `event.outcomes.vendors[id]` |
| Rehired / times-used | **Derived** | `vendorMemoryFor` (counts Confirmed/Booked across events) |
| On-time rate | **Derived** | tally of outcome keys |
| Payment / COI / contract state | **Captured** | vendorIntelligence.js |
| Budget variance per vendor | **Derivable, not surfaced as memory** | `vendorBalance`, pay due dates |
| Incident count | **Missing** (only `no_show`/`poor` proxy) | — |
| Price / quote history | **Missing** | — |
| **Stable cross-event identity** | **Missing** (Part 1) | — |

**The good news:** the *reasoning + outcome* spine is genuinely captured. The two gaps are
**stable identity** and **price history** — and the binding one is identity.

---

## Part 3 — Recommendation Readiness  →  the highest honest statement is **recollection, not recommendation**

NGW **cannot** honestly say **"Recommended"** today: that is a ranking/scoring claim, and on
`n` of 0–3 it is invented confidence — a direct violation of *No Guesswork / No Fake
Intelligence* (CLAUDE.md). It **can** honestly say **factual private history**:

> **Used 4× · 3 on-time, 1 late · Rehired twice · Last used: Wanda Retirement**

That is pure recall — zero judgment, zero prediction, fully auditable. Confidence-tier it by
sample size, never by a score:

| History depth | Honest statement |
|---|---|
| 0 uses | *(say nothing)* |
| 1 use | "Previously used · 1 event · limited history" |
| 2+ uses | "Used N× · X on-time, Y late · rehired" |
| outcomes captured | append the factual tally |
| no outcomes yet | "Used N× · outcomes not yet recorded" |

The ceiling of honesty is **"here is what happened,"** never **"here is what you should do."**

---

## Part 4 — Vendor Memory Audit  →  built + surfaced, but dark and data-starved

**What the planner learns today:** technically, the private track-record line — because
`vendorMemoryFor`/`summarizeVendorMemory` is **already consumed** at
`VendorPlanningWorkspace.jsx:613–614`. **But:** (a) it's behind `pi.memory` (default OFF),
(b) it's keyed on the fragile name (Part 1), and (c) with ~0 real completed events it renders
nothing or "limited history."

**The trapped signal isn't unbuilt — it's unfed.** The highest-value surface is already the
right one (the moment of choosing/planning a vendor). The unlock is **data volume + stable
identity**, not another component. The one genuinely-trapped *captured* signal is **rationale
recall at the point of re-selection** ("last time you chose them because…") — that's
`latestRationaleForSubject`, cheap to surface, and honest at any `n`.

---

## Part 5 — Vendor Intelligence v1 (smallest honest version)  →  already ~90% built

Spec: reader-only · deterministic · confidence-tiered by sample size · grounded in actual
`event.vendors[]` + `event.outcomes` + `decisionMemory[]`. **No AI, no predictive model, no
ranking, no recommendation.** Output is exactly the Part-3 recollection line + the prior
rationale. This is `vendorMemoryFor` + `summarizeVendorMemory` + `latestRationaleForSubject`
— all of which **exist today**.

**Does that alone deliver value?** **Yes — conditionally.** "Used 4×, 3 on-time, last used
X, chosen because Y" is real private recall a planner cannot hold across dozens of events.
**But its value is strictly proportional to data volume**, and today that volume is ~0. v1
is a *carrot that compounds with usage*, not a feature that pays off on day one.

---

## Part 6 — Moat Analysis  →  real, but **dormant** (gated on identity + volume)

**Head start (copyable):** the engine, playbooks, Studio-Matte UX, the readers themselves.
A competitor can clone all of it.

**Moat (not copyable):** the **private, per-studio vendor track record** — *your* roster
judged by *your* outcomes. No competitor can see it.

| Events | What the track record is |
|---|---|
| 10 | Thin. Mostly "limited history." A few repeat vendors begin to show. |
| 50 | Per-vendor patterns emerge for core/repeat vendors. First honest "rehired, all on-time." |
| 100 | Reliable records for the studio's working roster. Genuinely useful at selection time. |
| 500 | A private dataset competitors structurally cannot replicate — the real moat. |

**Compounds:** outcome history bound to a **stable** vendor identity. **Does not compound:**
the readers (copyable), and **anything keyed on a fragile name** (it fragments instead of
accruing). **The moat therefore has two hard prerequisites — stable vendor identity (Part 1)
and event volume (Part 7) — and NGW has neither yet.** The moat is real and it is currently
**asleep.**

---

## Part 7 — Activation Reality Check  →  **this is the actual bottleneck**

Brutal honesty: the codebase shows a **feature-mature product with no evidence of real use.**

| Dimension | Evidence in repo / memory | Reality |
|---|---|---|
| Active host cohort | none | **~0** |
| Real event volume | seeds/demos only; 0 real `must_have_moment` (60D) | **~0 real** |
| Real decision volume | `decisionMemory[]` exists; no real data | **~0 real** |
| Real outcome volume | Outcome Capture is **post-event**; needs events that *happened* | **~0 real** |
| Memory volume | `vendorMemoryFor` runs on the above | **~0 real** |

Corroborating signals already on record: Comms **FROZEN** "until beta users generate
evidence" ([[project_comms_frozen]]); rc2 verification left "auth-gated prod smoke" as a
non-blocker — i.e., couldn't fully smoke prod because there's no real-user traffic
([[project_rc2_production_verified]]); 60C/60D both terminated on "no real corpus."

**Future audits BLOCKED by lack of real data:** Event Identity classifier (60D), Stakeholder
Intelligence, Relationship Memory, Experience-Intelligence calibration — **and Vendor
Intelligence's moat itself.** Every one of these is speculative until events actually run.

**Plainly: the product's biggest bottleneck is activation, not intelligence.** NGW has built
roughly a generation ahead of its evidence.

---

## Part 8 — Roadmap (EXECUTE / TEST / PARK / KILL)

| Initiative | Verdict | Why |
|---|---|---|
| **Vendor Intelligence v1** (factual recollection reader, tiered by sample size) | **EXECUTE (smallest)** | Already ~90% built; honest at any `n`; it's the carrot that rewards usage and seeds the moat. Enable + tier it; don't expand it. |
| Vendor **recommendations** | **KILL** | "Recommended" on tiny `n` = invented confidence. |
| Vendor **scoring** | **KILL** | A number implies a model we don't have. |
| Vendor **rankings** | **KILL** | Ordering is a recommendation in disguise. |
| Vendor **identity → Bank-id linkage** | **TEST → EXECUTE when data flows** | Small honest plumbing; the moat's prerequisite; premature with 0 real events. |
| Event Identity classifier | **PARK** | 60D — no corpus. |
| Stakeholder Intelligence expansion | **PARK/KILL** | No data; speculative. |
| Relationship Intelligence | **PARK/KILL** | No data; speculative. |
| **Activation efforts** | **EXECUTE — top priority** | The single highest-leverage work in the product. |
| **Host cohort recruitment** | **EXECUTE** | Without it, all intelligence work stays speculative. |

---

## Final Question

**Smallest honest Vendor Intelligence shippable today:** a **reader-only private
track-record line** at the vendor selection/detail surface —
*"Used N× · X on-time, Y late · rehired · last used <event> · last chosen because <rationale>"* —
**confidence-tiered by sample size, silent at n=0, never a score/rank/"recommended."** It is
already implemented (`vendorMemoryFor` + `summarizeVendorMemory` + `latestRationaleForSubject`)
and already surfaced behind `pi.memory`; v1 is *enable + tier*, not *build*.

**Minimum real-user cohort before next-gen intelligence is evidence-based:** outcomes are
captured **after** events occur, so the gating quantity is **completed events with captured
outcomes**, not signups. Grounded estimate:
- **First real per-vendor track records:** ~**50–100 completed events** with outcomes — realistically **~10–15 active planners** each running several events to completion.
- **Classifier / identity audits (60D) re-runnable:** ~**30–50 real events** populating the fields.
- **Moat visibly compounding:** **100+ completed events** on a **stable vendor id**.

Below that, every intelligence claim is speculation dressed as a feature.

**Be ruthless:** ship the one honest recollection reader (it costs almost nothing and it
*rewards* the behavior you actually need), then **stop building intelligence and go get real
events.** The next sprint that matters is not Vendor Intelligence v2 or Stakeholder anything —
it is **activation**. Coverage before consumption; **usage before intelligence.**
