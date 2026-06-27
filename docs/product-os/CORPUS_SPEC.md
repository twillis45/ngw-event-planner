# Corpus Spec — what "real data" must look like

> **Status:** Doctrine · created 2026-06-27 · owner: NGW
> **Why this exists:** Sprint 61B ("Reality Before Intelligence") froze all new intelligence until a real-event corpus exists. This doc defines *what that corpus must look like* so the frozen engines can later run **honestly**, not just *that 50 events happened*. Count is not the bar — **honesty + linkage** is. 50 planned-only, unlinked, outcome-less events teach the frozen engines nothing.

## The unlock target (61B)

**10 active hosts · 50 completed events · 100 captured decisions.**

At that line: vendor recollection becomes substantive, the 60D must-have classifier becomes re-runnable, outcome-driven calibration becomes possible, decision-memory recall starts to help.

## The four record types

A record only **counts toward the corpus** if it carries the required fields below.

| Record | Must contain to count | Feeds (frozen engine) |
|---|---|---|
| **Completed Event** | stable `eventId` · type (canonical taxonomy) · guest count **planned + `attended` (actual)** · budget **planned + actual** · vendors (**each with `bankId`**) · `must_have_moment` + **`outcomes.mustHave` (happened? y/n)** · what-went-wrong note | knowledge-capture loop · must-have classifier |
| **Captured Decision** | which of the 5 resolvers (guest count / seating / vendors / timeline / staffing) · **rationale ("why")** · **outcome ("what happened")** · linked `eventId` (+ `bankId` if vendor-related) | decision-memory recall |
| **Vendor (Bank)** | stable **`bankId`** · name · category · per-event links, each with **status (Booked/Confirmed) + factual outcome (on-time / no-show / incident)** | vendor recollection |
| **Host** | `accountType=host` · ran **≥1 event to completion** (outcome captured) | activation metric |

## The six quality bars

This is what makes the corpus *usable*, not merely present.

| # | Bar | Why it matters | Enforced by |
|---|---|---|---|
| 1 | **Identity integrity** — every event vendor carries `bankId` | else cross-event vendor history fragments → corpus is poison | the Vendor Bank-id stamp (ships first) |
| 2 | **Actuals, not just plans** — planned **and** actual on count + budget | the *delta* is the entire signal; planned-only teaches nothing | needs `attended` field (58D gap) |
| 3 | **Rationale captured** — decisions carry "why" | memory recall is empty without it | `pi.memory` ON for cohort |
| 4 | **Outcome captured** — must-have happened? + what broke | no learning loop without the close | OutcomeCapture wired |
| 5 | **Zero fabrication** — every stored number observed/entered, never inferred | one fabricated value contaminates calibration | the killed-rail guard |
| 6 | **Provenance** — derived values carry `{qty, unit, basis}` | lets later calibration compare estimate vs actual | already in playbook `provenance` |

## Per-engine unlock — what each ❄️ engine needs *from* the corpus

| Frozen engine | Unlocks at |
|---|---|
| Vendor recollection | ~50 events with `bankId`-stamped vendor **outcomes** |
| Must-have classifier (re-run 60D) | 30–50 real `must_have_moment` texts **+ outcomes to label** |
| Decision-memory recall | 100 decisions with **rationale + outcome** |
| Knowledge-capture (actuals→estimates) | planned-vs-actual **budget + quantity deltas** across events |
| Stakeholder / Relationship | ⚠️ *not collectable today* — honoree is one free-text string; needs a structured-capture change first |

## What does NOT count toward the corpus

- Demo / seed / sample events (auto-purged) — not real.
- Events created but never completed (no outcome).
- Planned-only events (no actuals).
- Decisions with no rationale.
- Vendors with no `bankId` (orphaned histories).

## Capture prerequisites (so the corpus is collectable at all)

Three small enablers must precede the activation cohort, or hosts generate events that *don't* count:

1. **`bankId` stamp** (the Vendor Bank-id fix) — satisfies bar #1.
2. **`attended` actual-headcount field** (58D gap: "no `attended` field today") — satisfies bar #2.
3. **`pi.memory` ON for the cohort + OutcomeCapture wired** — satisfies bars #3–4.

## The punchline

The corpus isn't something you *find* — it's something the app must be instrumented to **capture cleanly from event #1.** The vendor stamp + `attended` field + memory-on are the three cheap plumbing jobs that turn "10 hosts ran events" into "10 hosts produced a corpus that unfreezes the moat."

---
*Related: [[project_path_to_production]] · Sprint 61B `engine-audit/SPRINT_61B_REALITY_BEFORE_INTELLIGENCE.md` · 61A vendor identity `engine-audit/SPRINT_61A*.md`.*
