# ET-1 / HI-1 / CS-1 Continuation — Vendor-Heavy Host Audit & Overlap Report

Mode: Audit First · Runtime Truth · No Duplicate Work
Builds on: `HQ3_PLATFORM_INTELLIGENCE_AUDIT.md`, `ET1_HI1_CS1_TRUST_CONTINUITY_REPORT.md`
Flagship validation event (canonical going forward): **"30-Year United States Army Retirement Celebration at the VFW"** — type Retirement Party, 120 guests, 92 days out, created and walked live this sprint.

---

## 1. Overlap Report (Mandatory Pre-Flight)

Ran `git status`, `git log --oneline -20`, `git branch`, `git diff --stat`, `git stash list` before any implementation. Tree clean, `main` up to date with `origin/main`, HEAD at `e22cc0e`. All 5 local `worktree-agent-*` branches have zero unique commits vs `main` (stale). No unmerged branches overlap this sprint's scope.

| Item | Status | Evidence |
|---|---|---|
| Event Identity classification | **Implemented, wired** | `resolveEventIdentity()` fired live: "We recognized Retirement Party. Guests span immediate-family and military-colleagues." High confidence. |
| Experience Context (`ctx`) | **Implemented, partially wired** | Confirmed consumers: `ExperienceContinuityNote`, `HostSpendingPlan`/`Budget`, `FoodPlan`, `HostRunOfShowTimeline`, `WhatCouldGoWrongPanel`. Confirmed non-consumers: `EventVendorsTab`, Guests, Tasks, Decisions panel, Day-Of Focus Mode. |
| `experienceContext.human` | **Not implemented** — only proposed in prior ET-1/HI-1 report | Grep confirms `experienceContext.js` exports only `buildExperienceContext`; no `.human` sub-object exists in code. |
| Decision Memory (`lib/decisionMemory.js`) | **Exists, orphaned** — separate system, never wired into `ctx` | Confirmed again this sprint; unchanged from prior audit. |
| `resolvePersona`/`resolveShell` | **Exists, fully orphaned** | Zero non-test callers via `grep -rln`, unchanged from prior audit. |
| Vendor cockpit (per-vendor readiness) | **Implemented, rich** | Live-verified this sprint (see §7) — "What This Vendor Delivers / Money & Contract / The Day-Of & After" sections, readiness banner, blockers. |
| Vendor cross-sequencing / dependency / workflow | **Not implemented — Actual Missing Capability** | No `dependsOn`-style relationship between vendor categories anywhere in `EventVendorsTab` or `vendorCategoriesByType.js` (confirmed prior sprint, reconfirmed live this sprint — see §7). |
| Military-specific playbook content (VFW, honor guard, flag ceremony, recognition ceremony, portrait-before-event) | **Not implemented — Actual Missing Capability** | `retirementParty.js` has real generic `dependsOn` sequencing (tribute/speeches/slideshow/signing card) but zero military-specific terms (confirmed via grep, unchanged from prior sprint). |
| Day tab 3-state empty clarity | **Implemented, shipped, deployed** | Commit `7e065d0` + crash fix `e22cc0e`, both live, 806 tests passing. |

**Conclusion of pre-flight**: nothing in this sprint's required scope is a duplicate of existing work. The Vendor-heavy Host Audit and the military-specific content gap are the two genuinely new findings this continuation sprint needed to confirm live — both confirmed below.

---

## 2. Runtime Call Chain (Vendors surface)

```
EventPlanner (or HostEventShell)
  → tab "More" / vendor entry point
    → EventVendorsTab({ event, setEvent, setVendors, budget, openId, openSection,
                         sectionPing, ros, profile, allEvents, isMobile, onBack,
                         onRouteToLinked, onSaveVendorToBank, promptDecision })
        — NOT passed: ctx
        → renders vendor list (9 auto-seeded categories for Retirement Party:
          Mobile Bar, Catering, Photography, Venue, DJ, AV/Tech, Florals, Rentals, Cake)
        → tap a vendor → per-vendor detail cockpit
            (readiness banner, "What this vendor delivers", "Money & Contract",
             "The Day-Of & After", blockers, next action)
            — each vendor's cockpit reasons ONLY about that vendor in isolation
```

No node in this chain reads `ctx.compound`, `ctx.eventIdentity`, or any cross-vendor relationship. The per-vendor cockpit is genuinely good (readiness/explainability at the single-vendor level — matches the `05_VENDOR_READINESS_DETAIL_COCKPIT` skill), but it is architecturally blind to the other 8 vendors.

---

## 3. Wiring Diagram (delta from prior audit)

No change to the wiring diagram published in `ET1_HI1_CS1_TRUST_CONTINUITY_REPORT.md`. Reconfirmed this sprint: `ctx` fans out to 5 consumer families; Vendors/Guests/Tasks/Decisions/Day-Of remain outside the fan-out, unchanged.

---

## 4. Continuity Audit (delta)

No regressions found. The flagship event's identity ("Retirement Party" + military-colleagues guest signal) held consistently across Reveal → Host Home → Food Plan → Vendors entry point during the live walkthrough — but note "military-colleagues" is a guest-relationship inference, not a military-*event* recognition. Nothing surfaced a VFW-specific or military-ceremony-specific signal anywhere, because no such engine exists (see §1).

---

## 5. Human Intelligence Audit (delta)

No change from the prior report's finding: `experienceContext.human` remains unbuilt (7/11 fields buildable, still not implemented). Nothing in this sprint's live walkthrough surfaced host-entered "why this matters" content on the Vendors surface — confirming that even if `.human` were built today, Vendors would need to be added to the ctx-consumer list to benefit (it currently receives no `ctx` at all).

---

## 6. Explainability Audit (delta)

The per-vendor cockpit is a **positive, previously under-credited explainability example**: "This vendor is on track" comes with a stated reason ("No critical blockers. Payments are current, contract is in place, arrival is set") — this satisfies What/Why/Status cleanly at the single-vendor grain. It does **not** satisfy Confidence/Evidence/Next-Decision/Assumptions at the cross-vendor or event-wide grain, because no such reasoning exists to surface.

---

## 7. Vendor-Heavy Host Audit (the flagship validation — live-verified)

Live-walked the flagship "30-Year United States Army Retirement Celebration at the VFW" (120 guests, Oct 5) through Reveal → Host Home → Vendors → one vendor detail (Photography).

**Findings, answering the sprint's exact questions:**

| Question | Answer |
|---|---|
| Vendor sequencing? | **No.** 9 categories are listed with no order, no phase grouping (e.g. "before ceremony" vs "during reception"). |
| Vendor dependencies? | **No.** No vendor's readiness or copy references another vendor. |
| Portrait-before-event workflow? | **No.** The system auto-seeded a single generic "Photography" category — no distinction between a portrait photographer (pre-event) and an event photographer (day-of), which the flagship's named ecosystem explicitly requires. |
| Recognition workflow? | **No.** No "Recognition Slideshow" or formal military-recognition concept exists anywhere in the seeded categories or the retirement playbook. |
| Ceremony workflow? | **No.** No ceremony-sequencing concept distinct from the generic ROS timeline. |
| Reception workflow? | **No.** Same — reception is just "the event," not a modeled phase. |
| Photography workflow? | **No**, beyond the single generic "Photography" category. No Photo Booth category was auto-seeded either (the flagship names it explicitly). |
| Are vendors simply independent checklist items? | **Yes — confirmed.** Each vendor gets a genuinely good *individual* readiness cockpit (deliverables, contract, day-of, after, blockers, explainability), but there is zero cross-vendor intelligence. Vendors are 9 parallel, isolated tracks. |

**Additional gap found live, not previously documented**: the auto-seeded vendor set for "Retirement Party" (Mobile Bar, Catering, Photography, Venue, DJ, AV/Tech, Florals, Rentals, Cake) does not include several categories the flagship explicitly names — Dessert Caterer, Full Bar (as distinct from Mobile Bar), MC (distinct from DJ), Portrait Photographer (distinct from Event Photographer), Photo Booth, Decorations (as distinct from Florals), Military Display, Guest Book, Recognition Slideshow. This is a **Missing Knowledge** gap in `vendorCategoriesByType.js`'s Retirement Party seed list, separate from the sequencing gap.

---

## 8. Gap Classification

| Gap | Category |
|---|---|
| Vendors tab doesn't receive `ctx` | **Missing Wiring** |
| No cross-vendor sequencing/dependency model | **Actual Missing Capability** |
| Retirement Party vendor seed list lacks military-specific categories (Military Display, Guest Book, Recognition Slideshow, Portrait vs Event Photography split, MC, Full Bar, Dessert Caterer) | **Missing Knowledge** |
| No ceremony/reception phase concept anywhere in the product | **Actual Missing Capability** |
| `experienceContext.human` unbuilt | **Missing Continuity / Missing Human Intelligence** (unchanged from prior report) |
| Decision Memory orphaned | **Missing Wiring / Missing Continuity** (unchanged from prior report) |
| Guests/Tasks/Decisions/Day-Of don't consume `ctx` | **Missing Wiring** (unchanged from prior report) |

---

## 9. Recommendation (Execute / Integrate / Consolidate / Park / Delete)

1. **Integrate** — Wire `ctx` into `EventVendorsTab` (same pattern already used for `Budget`/`FoodPlan`/`WhatCouldGoWrongPanel`). Cheap, no new engine, closes the Missing Wiring gap and lets the existing `ExperienceContinuityNote` render on Vendors too.
2. **Execute (small)** — Expand the Retirement Party vendor seed list in `vendorCategoriesByType.js` to include the military-specific categories named by the flagship. This is data, not a new engine — matches the "prefer composition over new architecture" standard.
3. **Park** — Cross-vendor sequencing / ceremony / reception workflow modeling. This is a genuine new capability (not a wiring gap), meaningfully larger than a sprint, and was explicitly out of scope for "DO NOT BUILD new engines/architecture" unless nothing existing can support it — nothing existing can. Flag for a dedicated future sprint, not built here.
4. **Park** — Military-specific playbook content (VFW venue type, honor guard, flag ceremony authored content). Same reasoning as #3 — genuine missing knowledge, not a wiring fix, deliberately not built this sprint per guardrails.
5. **Unchanged from prior report** — `experienceContext.human` (Execute, cheap), Decision Memory wiring (Test first), remaining ~14 CS-1 scenarios (Test), professional multi-client scale (Test) — still the standing next-sprint priority list.

---

## 10. Implementation Plan (only for genuinely-missing, in-scope work)

No code was changed this sprint. Per the "Audit First" mode, the two Integrate/Execute items above (#1 wiring `ctx` into Vendors, #2 expanding the Retirement Party vendor seed list) are ready to implement in a follow-up pass but were not built now — this sprint's explicit deliverable was the audit itself. Recommend those two as the next actionable sprint, in that order.
