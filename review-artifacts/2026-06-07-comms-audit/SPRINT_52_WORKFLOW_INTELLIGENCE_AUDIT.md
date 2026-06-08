# Sprint 52 — Workflow Intelligence Readiness Audit

Date: 2026-06-08 · Read-only audit (one 1-line truthfulness copy fix applied) · Evidence grounded in code with file:line citations.

Audit rule applied throughout: **an intelligence feature that cannot explain (1) what it used, (2) what it produced, (3) what the planner should do next is not beta-safe.**

---

## 1. Workflow intelligence map

| Step | Intelligence | Source of truth | Explains used→produced→next? | Connects forward |
|------|--------------|-----------------|:---:|---|
| **Signup/Login** | Supabase magic-link + Google OAuth; admin via app_metadata.role | Supabase auth | n/a (auth, not intelligence) | → portfolio/dashboard |
| **Create Event** | NewEventModal 3-step guided flow | Planner input | ✅ | → Estimator (Step 3) |
| **Estimator** | Range (per-head × guests × date/market/time/rush/service-tax/contingency), rule-based confidence 0–100, missing-input checklist, apply-to-budget | PER_HEAD tiers, METRO_MARKETS, date factors; all formula-based | ✅ "Based on …" line + range + "Use estimate as budget" | → Budget (seeds rows, labeled estimate) |
| **Command Center** | Next-best-action 8-tier ladder, open decisions, approvals, requests, Planning Health rail | Live event state (timeline, commClient, vendors, budget) — recomputed each render | ✅ every element cites signal + CTA + route | → Decisions/Vendors/Comms tabs (all exist) |
| **Vendor Workspace** | Readiness brief (9 challenge categories), promise tracker (playbook-inferred), status lifecycle (state machine), copy-only follow-up drafts, cross-vendor conflict detection (9 types) | Vendor record fields + playbooks; honest `not_tracked` when field absent | ✅ | → Follow-up draft → Communications |
| **Promise Tracker** | inferPromisesFromVendor + per-promise status/evidence | Vendor fields (arrivalTime, contractSigned, cost…) | ✅ (inferred, honestly un-persisted in Phase A) | → Draft follow-up |
| **Budget** | Status strip (ON TRACK/ATTENTION/AT RISK), neutral dollar values, payment alerts, cash-flow by month, vendor-payment source-of-truth lock, reconcile-drift card | Budget rows (manual/estimator) + vendor records (canonical for committed/paid) | ✅ money glossary explains every term | → Vendor cockpit / payment follow-ups |
| **Communications** | Event-context inheritance (51B), recipient identity (name·role·company·email), copy/draft honesty, honest delivery states | Event + client/vendor records | ✅ (Sprint 51B) | → event Communication tab |
| **Documents** | Real Supabase upload, AI extraction (backend), contract status (file/signed/missing) | Storage + manual fields | ✅ for contracts ("✨ AI-EXTRACTED · Verify against original"); ⚠️ insurance is manual, unsourced | → vendor readiness (contract drives tier) |
| **Day-of Mode** | 4 focused tabs (Now/Arrivals/Run-of-Show/Comms), state-aware task hero, vendor arrival tracking | Live event.ros / vendors / timeline | ✅ for what exists; no fake orchestration/notifications | → in-day coordination |

---

## 2. Truthfulness scorecard

| Subsystem | Truthful | Source clear | Reduces work | Confusion risk | Beta-safe | Notes |
|-----------|:---:|:---:|:---:|:---:|:---:|-------|
| Estimator | ✅ | ✅ | ✅ | low | ✅ | "Not a quote" disclaimers; confidence is honest rule-based score; apply is reversible, "no payment created" |
| Command Center | ✅ | ✅ | ✅ | low | ✅ | Pure rule-based, zero AI/vanity metrics; routes resolve (Decisions/Vendors/Comms tabs exist) |
| Vendor Workspace | ✅ | ✅ | ✅ | low–med | ✅ | Copy-only drafts (never auto-send); real conflict detection; copilot honest about BYOK/rule-based fallback |
| Promise Tracker | ✅ | ✅ | ✅ | med | ✅ | Inferred (not persisted in Phase A) but honestly so |
| Budget | ✅ | ✅ | ✅ | low | ✅ | Neutral $ values; color only on status/due-date; vendor = payment source of truth; safe merge |
| Communications | ✅ | ✅ | ✅ | low | ✅ | Fixed in 51B: no silent event switch, real recipient identity, no auto-send |
| Documents | ◑ | ◑ | ✅ | med | ◑ | Contracts honest + graceful failures; **insurance/COI manually entered, no proof, labeled "verified"** |
| Day-of Mode | ◑→✅ | ✅ | partial | med→low | ✅ (after fix) | **"guest check-in" copy claimed a non-existent feature — FIXED this sprint**; no fake orchestration otherwise |

---

## 3. Beta blocker list

**1 blocker found and fixed this sprint:**

- **[FIXED] Day-of Mode "guest check-in" false claim.** `CommandCenter.jsx:805` told the planner "Day-of Mode gives you arrivals, messages, **guest check-in**, and the run-of-show in one place." Guest check-in is not in the data model (`vendorIntelligence.js:25`, `vendorCopilot.js:330` — "Sprint 54+ work"). This violates the no-fake-intelligence rule. **Corrected to** "vendor arrivals, messages, and the run-of-show in one place."

No other beta-blocking intelligence gaps. Every other intelligence feature passes the used→produced→next test.

---

## 4. "Do not build yet" list

These are real gaps but **not** beta-blocking — surfacing/honesty is already correct; building them now would be premature without planner evidence:

- **Guest check-in / day-of actuals** (check-in time, setup-complete, closeout). Honestly marked `not_tracked`. Defer to post-beta (Sprint 54+).
- **Promise-tracker persistence** (Phase B). Promises are inferred live and honestly un-persisted; persisting + manual state transitions can wait for evidence.
- **COI/insurance extraction pipeline.** No auto-extraction; don't build OCR for insurance yet.
- **Document types beyond contract** (invoice/menu/rider/floorplan upload flows). Honestly "Not attached."
- **Vendor-drift detection beyond catering.** Caterer headcount drift exists; generalizing to other categories can wait.
- **Cross-signal cascade in Planning Health** (vendor-unconfirmed → timeline risk → budget). Nice-to-have, not blocking.
- **Auto-escalation / notifications / real-time orchestration.** Deliberately absent; keep it that way for beta.

---

## 5. Minimum fixes before Planner #1

| # | Fix | Severity | Status |
|---|-----|----------|--------|
| 1 | Remove "guest check-in" from Day-of consequence copy | Blocker (honesty) | ✅ Done this sprint |
| 2 | Insurance/COI: relabel "Insured & verified" so a green badge reads as a **planner-entered note**, not system-verified fact (e.g. "Insurance: marked insured — planner note"). It's a manual `<select>` field with no proof/source. | Recommended (P1) | ⏳ Proposed — needs your OK (touches a status enum) |
| 3 | Command Center vendor rows with overdue payment: deep-link to the payment section (`vendorSection:'payment'`) like the next-best-action already does. Pure convenience. | P1 (not blocking) | ⏳ Proposed |
| 4 | Empty state for event with no date (Command Center phase logic). | P2 | ⏳ Proposed |

Only #1 is a true blocker, and it's done. #2 is the next-most-valuable honesty nicety; #3–#4 are convenience/edge-case polish.

---

## 6. Final verdict

### ✅ READY FOR PLANNER #1 (with the guest-check-in copy fix already applied)

The product intelligence is **coherent, rule-based, and honest across the entire core workflow.** Every intelligence feature can explain what it used, what it produced, and what to do next. There is no fake AI, no fabricated confidence, no auto-send, no silent context switching, and no vanity metrics. Source-of-truth is clear (and vendor records are correctly canonical for payments).

The single beta-blocking honesty defect (Day-of "guest check-in") is fixed. The one remaining honesty nicety (insurance "verified" label) is low-severity because the planner sets it themselves; recommend fixing but it does not block Planner #1.

**Recommendation:** proceed to admin activation + planner recruitment. Apply minimum-fix #2 opportunistically.
