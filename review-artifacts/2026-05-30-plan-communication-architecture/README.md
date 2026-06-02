# Sprint 46 — PLAN + Communication Architecture
**Date:** 2026-05-30  
**Sprint mandate:** Design the true product core. The PLAN layer is where planners spend 70–80% of their time. Communication is NOT a separate module — it is embedded throughout planning. Create implementation-grade Figma slices. No concept art. Real production workflows.

---

## 1. What Was Built

8 Figma pages (87–94) in file `CYlmJqDCXEaacCuz9wW3bd`. Each page contains desktop (1280px) and mobile (375px) production-grade variants.

| Page | Figma | Slice | Variants |
|---|---|---|---|
| A — PLAN Architecture Overview | 87 | System map: Plan → Communication → Orchestration | Desktop only |
| B — Event Dashboard | 88 | Central status hub | Desktop 1280 + Mobile 375 |
| C — Client Intake Workflow | 89 | Vision, priorities, must-haves, deal-breakers, VIP, comms prefs | Desktop + Mobile |
| D — Timeline Builder | 90 | Milestones, dependencies, buffers, vendor arrivals | Desktop (Gantt) + Mobile (list) |
| E — Checklist Generator | 91 | Auto-generated tasks by category: Planning, Vendor, Venue, Client, Event Day | Desktop + Mobile |
| F — Vendor Planning Workspace | 92 | Profile, contract status, deliverables, communication history | Desktop + Mobile |
| G — Communication Hub | 93 | Client, vendor, and team threads embedded in planning context | Desktop + Mobile |
| H — Decision + Approval Center | 94 | Open decisions tracked + approval workflow with direct links to timeline, tasks, vendors, budget | Desktop + Mobile |

---

## 2. Communication Architecture

Communication is embedded at every layer — not a separate tab or future module.

### Where communication lives in the PLAN layer

| Surface | Embedded communication |
|---|---|
| Event Dashboard | Recent communication preview + unread count. Link to active threads. |
| Client Intake | Communication preferences captured (channel, response time, decision authority, do-not-contact windows) |
| Vendor Planning | Full communication history per vendor. Reply inline. Links to contract, deliverables, approvals. |
| Communication Hub | Threaded by: Client, Vendor, Internal. Each thread links to: decisions, approvals, timeline items, attachments. Open questions surfaced as a persistent sidebar. |
| Decision Center | Each decision has a "Message" action — opens the linked thread. Decisions route approvals. |
| Approval Workflow | Approvals link directly to: timeline milestones, tasks, vendors, budget allocation. Approve / Request Revision / Reject inline. |

### Why this is not a chat app

A generic messaging interface detaches communication from context. In NGW:
- Every thread knows what event it belongs to
- Every thread exposes its open questions, pending approvals, and linked planning objects
- A message about the floral proposal surfaces the approval. A message about the catering contract surfaces the overdue deliverable.
- The Communication Hub right panel shows ALL open questions across ALL threads — the coordinator never loses track of what's unresolved

This is operational communication, not social communication.

---

## 3. Design Language

**Studio Matte:** Warm near-black (#0A0A0A) background. Off-white accent text (#E8E0D0). No pure white, no cool gray. Everything has temperature.

**Premium:** Generous negative space. Typography does the hierarchy work. Cards are dark, not white-on-gray.

**Operational:** Real data throughout — actual vendor names, real decision language, realistic message content. No "Lorem ipsum."

**Editorial:** Section headers in uppercase small caps. Clear typographic scale: Display 22–24 / Heading 14–16 / Body 12–13 / Caption 10–11.

**Trustworthy:** Consistent sidebar navigation across all 8 slices. Same status color system everywhere. Priority indicators (red/amber/muted left border) used consistently.

---

## 4. Status Color System

| Color | Hex | Meaning |
|---|---|---|
| Green `#4B8C5A` | Confirmed, complete, on track |
| Amber `#C8982A` | Pending, needs attention, approaching deadline |
| Red `#C84B31` | Overdue, rejected, critical priority |
| Blue `#4B7BC8` | Client, active, selected, primary action |
| Purple `#7C5FC8` | Client category in checklists |
| Muted `#666666` | Secondary info, not-started, low priority |

---

## 5. Navigation Architecture

All 8 slices share a consistent 220px left sidebar:
- NGW Events wordmark
- PLAN section label
- 8 nav items with active state (blue left border, card background)
- Event name + date at bottom

Mobile uses a bottom navigation bar (5 tabs: Home, Timeline, Vendors, Comms, More).

---

## 6. How PLAN Connects to Orchestration

The PLAN layer captures everything the Orchestration layer needs to function:

| PLAN captures | Orchestration uses |
|---|---|
| Timeline milestones + vendor arrival windows | Live Run of Show sequence, FRAGILE signals |
| Vendor confirmation status | Vendor Arrival Tracking, delay escalation |
| Decision + approval state | Disruption card content ("Catering contract still unsigned") |
| Communication preferences | Alert routing on event day |
| Client VIP concerns | Context for pressure-state responses |

The Orchestration layer does not create new data. It surfaces the PLAN layer data in a time-pressured, event-day-appropriate format. PLAN is the source of truth.

---

## 7. Connection to Tier Model (Sprint 41)

| Tier | When active | What it uses from PLAN |
|---|---|---|
| Tier 0 | Always (admin/setup) | Client Intake, Checklist, basic Vendor setup |
| Tier 1 | dayMode = true, pre-event-start | Timeline status, vendor confirmations, open decisions |
| Tier 2 | dayMode = true + event start tick | Live Run of Show, arrival windows, disruption response |

---

## 8. Implementation Notes

### No new architecture required

- PLAN surfaces extend the existing App.js `EventPlanner` component pattern
- Communication threads can be modeled as typed conversation objects on the event record
- Approval state is a field on the approval object: `pending | approved | rejected | revision_needed`
- Decision state: `open | resolved | deferred`
- All PLAN data is available to OrchestrationSlice via the existing event context

### What this sprint does NOT do

- No App.js code was changed
- No backend schema was changed
- This sprint defines the design language, workflow, and component structure
- Implementation (connecting to the live app) follows from this specification

---

## 9. Files

| File | Description |
|---|---|
| `demo/review-artifacts/2026-05-30-plan-communication-architecture/README.md` | This document |
| Figma `CYlmJqDCXEaacCuz9wW3bd` pages 87–94 | All 8 slices, desktop + mobile |

**No production code changed. Dual-track constraint preserved.**

---

## 10. What Happens Next

1. Alpha coordinator sessions (Sprint 46B) — validate orchestration gates
2. PLAN layer implementation sprint — wire Client Intake, Timeline, Checklist into App.js
3. Communication threading — add conversation objects to event model
4. Decision/Approval workflow — add state machines to task/vendor objects
5. Once PLAN is implemented: Orchestration Tier 1 infusion (Run of Show + Planning Tasks)
