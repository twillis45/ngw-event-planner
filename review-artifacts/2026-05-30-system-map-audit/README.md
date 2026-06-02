# System Map Audit — Pages 00–94
**Date:** 2026-05-30  
**File:** Figma `CYlmJqDCXEaacCuz9wW3bd` · Page `00_FIGMA_SYSTEM_MAP`  
**Scope:** Full review of all 44 documented pages against doctrine + Sprint 45/46 alignment check + icon audit. Rows 54–94 added to Figma system map frame on 2026-05-30. Pages 45–53 corrected from erroneous PLAN layer content to actual Sprint 15 doctrine stubs.

---

## Verdict

**Icon audit: CLEAN.** Zero emoji, zero vectors, zero images anywhere in the system map file. 968 total nodes — 616 text, 307 rounded rectangles, 44 frames. Pure typography + color. Nothing to remove.

**Doctrine alignment: HOLDING.** All 9 locked doctrines are intact and uncontradicted by Sprint 45 or Sprint 46 work.

**Gap identified (original):** System map covered pages 00–44. Sprints 45 and 46 were not documented.

**Gap resolved:** System map frame extended to 94 rows on 2026-05-30. Pages 45–53 are Sprint 15 doctrine stubs (empty, correct). Pages 54–81 are documented in the Figma frame but not yet written up in this README. Pages 82–94 are Sprint 45 alpha gate flows and Sprint 46 PLAN layer — documented below.

---

## Page-by-Page Status (00–44)

| # | Page | Type | Runtime | Status |
|---|------|------|---------|--------|
| 00 | `00_Cover` | COVER | CONCEPT | File cover. Aesthetic only. |
| 01 | `01_Foundations` | DOCTRINE | PROVEN | Token foundations. Mirrored in `src/design/tokens.js`. |
| 02 | `02_Design_System` | COMPONENT | HYBRID | Card/button primitives. Many live in code; not fully unified. |
| 03 | `03_Mobile_Doctrine` | DOCTRINE | PROVEN | Mobile coordination doctrine. Validated at 390px. |
| 04 | `04_Onboarding` | FLOW | CONCEPT | Not implemented. Deferred. |
| 05 | `05_Identity_And_Accounts` | DOCTRINE | CONCEPT | Studio tenancy model, command tone tiers, identity ≠ branding. Updated Sprint 11D. |
| 06 | `06_Event_Operations` | FLOW | HYBRID | Desktop Command View. App has localStorage equivalents; full flow not rendered. |
| 07 | `07_Communication_Workflows` | DOCTRINE | HYBRID | Severity → channel routing, channel narrowing under stress. Runtime-proven in EventCommunication. Updated Sprint 11D. |
| 08 | `08_Vendor_Operations` | DOCTRINE | PROVEN | Severity-aware vendor card anatomy, cascade selection, trust mechanics. Updated Sprint 11D. |
| 09 | `09_Settings_And_Studio` | DOCTRINE | CONCEPT | Calibration categories. No checkbox forests. Updated Sprint 11D. |
| 10 | `10_Tiering_And_Trust` | STUB | CONCEPT | Empty placeholder. |
| 11 | `11_Archived_Explorations` | DOCTRINE | CONCEPT | Memory record shape, recall surfaces, debrief over archive tables. Updated Sprint 11D. |
| 12 | `12_Operational_Modes` | DOCTRINE | PROVEN | pre-event/live/recovery/post-event state machine. Mirrored in `OperationalModeContext`. |
| 13 | `13_Escalation_Choreography` | DOCTRINE | PROVEN | 6 escalation scenarios. Validated in `?slice=vendor`. |
| 14 | `14_Live_State_Hierarchy` | DOCTRINE | PROVEN | UI surface matrix. Mirrored in `surfacePriority.js`. |
| 15 | `15_Mobile_Stress_UX` | STUB | CONCEPT | Empty placeholder. |
| 16 | `16_Desktop_Command_Architecture` | DOCTRINE | PROVEN | Layout system. Mirrored in `?slice=desktop-density`. |
| 17 | `17_Workflow_Orchestration` | STUB | CONCEPT | Empty placeholder. Slice is the proxy. |
| 18 | `18_Communication_Command` | DOCTRINE | HYBRID | Channel priority. Partially mirrored in EventCommunication. |
| 19 | `19_Risk_State_Visualization` | DOCTRINE | FIGMA-ONLY | Probability × Impact matrix. Not in app. |
| 20 | `20_Recovery_Protocols` | STUB | CONCEPT | Empty placeholder. |
| 21 | `21_Command_Surface_Doctrine` | STUB | PROVEN | EMPTY but surface roles ARE proven via `surfacePriority.js`. |
| 22 | `22_Adaptive_Surface_Rules` | STUB | PROVEN | EMPTY but density IS proven via `DensityContext`. |
| 23 | `23_Operational_Typography` | STUB | PROVEN | EMPTY but type scale IS in `tokens.js`. |
| 24 | `24_Escalation_State_Variants` | STUB | PROVEN | EMPTY but variants ARE in `EscalationContext`. |
| 25 | `25_Mobile_Stress_States` | STUB | CONCEPT | Empty placeholder. |
| 26 | `26_Live_Event_Command_Screen` | STUB | CONCEPT | Slice is the proxy. |
| 27 | `27_Hierarchy_Transition_Maps` | STUB | PROVEN | EMPTY but motion transitions ARE validated. |
| 28 | `28_Toolbar_Compression_Rules` | STUB | CONCEPT | Empty placeholder. |
| 29 | `29_Action_Priority_Systems` | STUB | PROVEN | EMPTY but Button priority IS proven. |
| 30 | `30_Operational_Density_Rules` | DOCTRINE | PROVEN | Density rules. Mirrored in `DensityContext`. |
| 31 | `31_Components_Bottom_Sheet` | COMPONENT | PROVEN | Runtime in slices. |
| 32 | `32_Components_Alert_Banner` | COMPONENT | PROVEN | AlertBanner primitive. |
| 33 | `33_Components_Vendor_Card` | COMPONENT | HYBRID | Used in slices; not in App.js vendors view. |
| 34 | `34_Components_Action_Buttons` | COMPONENT | PROVEN | Button priority hierarchy runtime-validated. |
| 35 | `35_Components_Status_Badge` | COMPONENT | PROVEN | EscalationBadge primitive. |
| 36 | `36_Interaction_Choreography` | DOCTRINE | PROVEN | Motion matrix. Mirrored in `motion.js`. |
| 37 | `37_Live_Command_Center` | FLOW | FIGMA-ONLY | Desktop 1440. Slice is the proxy. |
| 38 | `38_Vendor_Escalation_Flow` | FLOW | PROVEN | 16-frame flow. Validated by `?slice=vendor`. |
| 39 | `39_Mobile_Event_Day` | FLOW | FIGMA-ONLY | Not in app. |
| 40 | `40_Tablet_Orchestration` | FLOW | HYBRID | Slice reflows; full screen not in App.js. |
| 41 | `41_Form_Systems` | COMPONENT | CONCEPT | App.js forms still localStorage-era. |
| 42 | `42_S6_Color_Doctrine` | DOCTRINE | PROVEN | Color tokens in `tokens.js`. Teal = atmosphere only. |
| 43 | `43_S7_Interaction_System` | DOCTRINE | PROVEN | Interaction system. Mirrored in primitive interactive states. |
| 44 | `44_Desktop_Containment_Rules` | DOCTRINE | PROVEN | Containment matrix. Heavier-not-wider. Updated Sprint 11D. |

---

## Doctrine Alignment Check — Sprint 45 and 46

### 9 Locked Doctrines vs. Recent Work

| Doctrine | Sprint 45 | Sprint 46 | Status |
|---|---|---|---|
| Escalation = reduction | N/A (no live-event UI) | N/A (Tier 0, not live event) | ✓ Not contradicted |
| Authority from structure | Alpha gate uses typography + placement | PLAN uses left-border priority + weight | ✓ Aligned |
| Studio Matte | Dark theme on gate screens | `#0A0A0A` bg, `#E8E0D0` accent | ✓ Exact match |
| Motion matrix (locked timings) | No animation changes | No animation changes | ✓ Unchanged |
| Calm under pressure | Gate is low-pressure by design | PLAN is planning mode — calm appropriate | ✓ Aligned |
| Structural P1 / no competing CTAs | Single CTA per gate screen | Single approval action per decision | ✓ Aligned |
| Studio tenancy | Facilitator-assigned tester IDs | Not applicable | ✓ |
| Heavier not wider | Not applicable | Not applicable at Tier 0 | ✓ |
| Teal = atmosphere only | Not introduced | Not introduced | ✓ |

---

## New Doctrine: PLAN Layer (Tier 0)

Sprint 46 introduced a new tier of the product. The locked doctrines cover **Tier 1–2 (day-of-event orchestration)**. The PLAN layer is **Tier 0 (planning mode)** and has a legitimately different interaction model:

| Characteristic | Orchestration (Tier 1–2) | PLAN Layer (Tier 0) |
|---|---|---|
| Primary surface | Full-screen slices, bottom sheets | Sidebar nav, cards, tables |
| Navigation | Minimal — 2 zones | 220px sidebar, 8 sections |
| Information density | Intentionally collapsed under stress | Intentionally rich, editorial |
| Motion | Reduction choreography | Transition only, no escalation motion |
| Typography | Emergency compresses to 10px | Hierarchical: Display 22 / Body 12 |
| Status communication | Surface role + escalation class | Color-coded left borders + status pills |

**This is not doctrine drift. It is a different tier with different requirements.** The Studio Matte language and zero-icon rule apply across both.

### PLAN Layer Design Tokens (Sprint 46 — must not drift from these)

```
bg:      #0A0A0A
surface: #141414
card:    #1C1C1C
border:  #2A2A2A
accent:  #E8E0D0  (warm off-white — NOT cool gray)
muted:   #666666
dim:     #3A3A3A

green:   #4B8C5A  (confirmed, complete, on track)
amber:   #C8982A  (pending, approaching deadline)
red:     #C84B31  (overdue, rejected, critical)
blue:    #4B7BC8  (client, active, primary action)
purple:  #7C5FC8  (client category in checklists)
```

**Color rules for PLAN layer:**
- Green/Amber/Red priority borders: left-border only (3px), never background flood
- Blue = client-facing content and active states
- Purple = client category only (checklist)
- No additional colors to be introduced without doctrine review

---

## Risk Register — Things That Could Drift

| Risk | Severity | What to Watch |
|---|---|---|
| PLAN Event Dashboard becoming analytics theater | HIGH | Numbers on the dashboard must serve actions, not be scorecard tiles. Guard: "what action does this number enable?" |
| PLAN sidebar becoming SaaS nav | MEDIUM | 220px sidebar is the PLAN-specific pattern. Must not introduce icons into sidebar items. Text-only labels, active state = blue left border only. |
| Communication Hub becoming a chat app | MEDIUM | Every message thread must expose linked planning objects (decisions, approvals, timeline items). Never a standalone inbox. |
| Approval workflow becoming modal-heavy | LOW | Inline approve/decline. No approval modals that detach from context. |
| Icon creep back into PLAN layer | MEDIUM | The "low class icons" removal applies permanently. No emoji, no generic SVG icon libraries. Status = color + text. |

---

## Pages 45–53 — Sprint 15 Doctrine Stubs

These pages were created during Sprint 15 as placeholder frames. None were populated. They appear in the system map as empty stubs. The content previously written in this section (PLAN layer Sprint 46 pages) was incorrect — that content belongs at pages 87–94.

| # | Page | Type | Runtime | Status |
|---|------|------|---------|--------|
| 45 | `45_Operational_Toggle_Doctrine` | STUB | CONCEPT | Empty. Sprint 15 placeholder — toggle/override doctrine never formalized as a standalone page. Rules folded into `12_Operational_Modes`. |
| 46 | `46_Operational_Authority_System` | STUB | CONCEPT | Empty. Sprint 15 placeholder — authority assignment model deferred. Addressed implicitly in `14_Live_State_Hierarchy`. |
| 47 | `47_Operational_Runtime_System` | STUB | CONCEPT | Empty. Sprint 15 placeholder — runtime mode taxonomy not finalized as separate doctrine. Covered by `12_Operational_Modes` + `OperationalModeContext`. |
| 48 | `48_Sprint15_Emergency_Densification` | STUB | CONCEPT | Empty. Sprint 15 placeholder — emergency density rules folded into Tier 2 slice work. `30_Operational_Density_Rules` is the proven equivalent. |
| 49 | `49_Procedural_Unevenness_Runtime` | STUB | CONCEPT | Empty. Sprint 15 placeholder — unevenness handling addressed in OrchestrationSlice state machine (`calm/building/active/recovery`) rather than as Figma doctrine. |
| 50 | `50_Runtime_Language_System` | STUB | PROVEN | Empty frame, doctrine proven. Sprint 18A validated "calm language under pressure" via real copy decisions in slice UI. The pattern — declarative, no urgency words unless pressure ≥ 0.7 — lives in runtime behavior. |
| 51 | `51_Human_Validation_Findings` | STUB | CONCEPT | Empty. Sprint 15 placeholder — no real coordinator sessions existed at creation. Sprint 45 alpha gate (`?slice=orchestration&observe=1`) is the actual human validation surface. |
| 52 | `52_Planner_OS_Doctrine` | STUB | CONCEPT | Empty. Sprint 15 placeholder — Planner OS concept deferred pending PLAN layer design. Sprint 46 pages 87–94 are the realization. |
| 53 | `53_Planner_OS_Explorations` | STUB | CONCEPT | Empty. Sprint 15 placeholder — exploration surface superseded by Sprint 46 PLAN layer pages 87–94. Retain as historical marker only.

---

## Updated System Status — What Moved This Sprint

| Area | Before | After |
|---|---|---|
| Human validation | 18% — no real sessions | Sprint 45 deployed. Gate live at `?slice=orchestration&observe=1`. Ready for testers. |
| App.js icon quality | Emoji in 35+ UI locations | Clean. All decorative emoji removed. Zero icons anywhere. |
| PLAN layer | Not designed | Sprint 46: 8 implementation-grade frames (desktop + mobile). Doctrine-aligned. |
| System map page count | 44 pages | 94 pages (44 existing + 50 new rows added to Figma frame 2026-05-30) |

---

## What the System Map Confirmed Is Safe to Build Next

Based on the current map state, these are unblocked and doctrine-aligned:

1. **Wire AlphaTesterGate sessions** — technical infrastructure is proven, testers not yet recruited
2. **PLAN layer implementation** — Sprint 46 designs spec the component structure; App.js implementation follows from this
3. **Vendor Planning Workspace** — extends proven doctrine (08_Vendor_Operations), App.js vendor management is the runtime proxy
4. **Communication Hub** — extends proven doctrine (07, 18), EventCommunication tab is the runtime proxy

These are blocked or deferred:
- Desktop containment in App.js — slice proven, but App.js grafting requires migration sprint
- Tablet portrait mode — after human validation begins
- Light mode — deferred until customer demand signals it
- Full App.js → DB migration — ongoing, 52% done, not a blocker for PLAN layer work

---

## Pages 82–94 — Alpha Gate + PLAN Layer (Sprint 45/46)

These pages represent Sprint 45 (alpha validation infrastructure) and Sprint 46 (PLAN layer — Tier 0 planning surfaces). All appear in the Figma system map frame as of 2026-05-30.

### Sprint 45 — Alpha Gate Flows (Pages 82–86)

| # | Page | Type | Runtime | Status |
|---|------|------|---------|--------|
| 82 | `82_Alpha_Gate_Register` | FLOW | PROVEN | AlphaTesterGate.jsx — name + role capture screen. Live at `?slice=orchestration&observe=1&tid=TEST-###`. |
| 83 | `83_Alpha_Gate_Consent` | FLOW | PROVEN | AlphaTesterGate.jsx — consent + screen-record instructions. Content matches TESTER_INSTRUCTIONS.md verbatim. |
| 84 | `84_Alpha_Gate_Session` | FLOW | PROVEN | OrchestrationSlice.jsx in observe mode. observationKit active: tap tracking, scroll depth, absence detection, pressure state logging. |
| 85 | `85_Alpha_Gate_Feedback` | FLOW | PROVEN | AlphaTesterGate.jsx — 9-question post-session survey + copy-to-clipboard export. Export format matches FACILITATOR_GUIDE.md parsing expectations. |
| 86 | `86_Alpha_Dashboard` | FLOW | CONCEPT | Facilitator aggregate view — not built. FACILITATOR_GUIDE.md + manual export review is the operational proxy until ≥5 sessions complete. |

### Sprint 46 — PLAN Layer (Pages 87–94)

All PLAN pages have desktop (1440px) + mobile (390px) variants. Studio Matte: `#0A0A0A` bg, `#E8E0D0` accent. Zero icons, zero emoji. Status via color + text only.

| # | Page | Type | Runtime | Status |
|---|------|------|---------|--------|
| 87 | `87_PLAN_Architecture_Overview` | DOCTRINE | CONCEPT | Source of truth for Tier 0 structure. PLAN reads → Orchestration executes. Three-tier model: Tier 0 always-on, Tier 1 dayMode pre-start, Tier 2 dayMode + event tick. Figma ID `547:2`. |
| 88 | `88_Event_Dashboard` | FLOW | CONCEPT | Central status hub. Timeline health, vendor status, active decisions count, recent comms preview, unread counts. Action-oriented: every number enables a decision. Figma ID `548:2`. **Priority 1 implementation target.** |
| 89 | `89_Client_Intake_Workflow` | FLOW | CONCEPT | 7-step operational intake: vision, priorities, must-haves, deal-breakers, VIP guests, comms preferences (channel/response time/decision authority/do-not-contact). Extends ConsultScriptModal. Figma ID `549:2`. **Priority 2.** |
| 90 | `90_Timeline_Builder` | FLOW | CONCEPT | Milestones, dependencies, buffers, vendor arrival windows. Desktop = Gantt view, Mobile = list view. Milestone data feeds Orchestration Run of Show at event day. Figma ID `549:152`. |
| 91 | `91_Checklist_Generator` | COMPONENT | CONCEPT | Auto-generated task lists by category: Planning / Vendor / Venue / Client / Event Day. Tasks feed Tier 1 disruption cards when overdue. Figma ID `551:2`. |
| 92 | `92_Vendor_Planning_Workspace` | FLOW | HYBRID | Profile, contract status, deliverables, communication history inline. Extends `08_Vendor_Operations` at Tier 0. App.js vendor management is the runtime proxy. Communication shown inline per vendor — not isolated in hub. Figma ID `551:187`. |
| 93 | `93_Communication_Hub` | FLOW | HYBRID | Consolidated thread view: Client / Vendor / Internal. Every thread links to planning objects (decisions, approvals, timeline items). Open questions sidebar surfaces all unresolved items. Extends `07_Communication_Workflows` + `18_Communication_Command`. Figma ID `554:2`. **Priority 4.** |
| 94 | `94_Decision_Approval_Center` | FLOW | CONCEPT | Open decisions tracked by state: open / resolved / deferred. Approval workflow: pending / approved / rejected / revision_needed. Approve/Request Revision/Reject inline — no detached modals. Tracked via Supabase (not localStorage). Figma ID `554:211`. **Priority 3.** |

**Note on PLAN layer implementation gate:** Pages 87–94 are unblocked for Track A (App.js) implementation. No coordinator session gate required for Tier 0. Track B (OrchestrationSlice) remains gated until `engaged: true` + `firstOrchestrationTapMs < 10000` confirmed across real sessions.

---

## Files

| File | Description |
|---|---|
| `demo/review-artifacts/2026-05-30-system-map-audit/README.md` | This document |
| Figma `CYlmJqDCXEaacCuz9wW3bd` page `00_FIGMA_SYSTEM_MAP` | System map — 94 rows, frame extended to 8212px on 2026-05-30 |
