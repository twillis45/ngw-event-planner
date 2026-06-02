# Sprint 41 — Orchestration Infusion Strategy
**Date:** 2026-05-28  
**Track:** B (OrchestrationSlice — R&D environment)  
**Mandate:** Strategy + architectural integration planning only. DO NOT force orchestration into production implementation yet.

---

## 1. Sprint Scope

Sprint 41 answers the question: **How does orchestration behavior integrate into the real production product?**

This is not an implementation sprint. It is a strategy sprint. No production code was changed. What was produced:

- Infusion tier model (Tier 0 / Tier 1 / Tier 2)
- Orchestration activation map (when orchestration turns on — trigger conditions + production hooks)
- Surface classification of all EventPlanner tabs by tier
- Boundary protection rules (surfaces where orchestration must never appear)
- Figma integration slices (pages 73–79 in file `CYlmJqDCXEaacCuz9wW3bd`)
- This README

---

## 2. Production Surface Audit

The EventPlanner production app (App.js) contains the following surfaces relevant to orchestration infusion:

### Standard Tabs (Tier 0 — Explicit Coordination)
| Tab | Purpose | Orchestration |
|---|---|---|
| Overview | Event summary, dates, venue | Never |
| Budget | Financial planning | Never |
| Guests | Guest list, RSVP | Never |
| Seating | Table assignments | Never |
| Vendors | Vendor contracts, contacts (admin) | Never |
| Planning Tasks | Checklist management | Tier 1 infusion on day-of |
| Calendar | Timeline view | Never |
| Communication | Comms log | Never in admin mode |
| Run of Show | Timeline sequence | Tier 1 infusion on day-of |
| Agenda | High-level schedule | Tier 1 infusion on day-of |

### Day Mode Tabs (active when `event.dayMode = true`)
| Tab | Purpose | Orchestration |
|---|---|---|
| "Now" (DayTaskView) | Live task priority | Tier 2 — full orchestration |
| "Arrivals" (VendorArrivalView) | Vendor arrival logging | Tier 2 — gravity-weighted |

**Key code locations:**
- `dayMode` toggle: App.js line ~15163 ("Event Day Mode" button)
- `?mode=event-day` URL param: App.js line ~15933
- DayTaskView: App.js line ~14814
- VendorArrivalView: App.js line ~14737
- RunOfShow: App.js line ~12199
- `generateChecklistFromIntake()`: App.js line ~4805

---

## 3. Infusion Tier Model

### Tier 0 — Explicit Coordination (no orchestration)
Administrative surfaces. User is in planning mode, not operational mode. The interface is a tool, not an environment. **No ambient signals, no hierarchy weighting, no tunneling, no disruption cards.**

Surfaces: Overview, Budget, Guests, Seating, Vendors (admin), Planning Tasks (pre-event), Calendar, Communication, Billing, Onboarding, Settings, RSVP, Error States.

### Tier 1 — Soft Coordination (subtle time-aware signals)
Surfaces where time-sensitive context improves coordination, without full orchestration engagement. **Light hierarchy only — no pressure tunneling, no disruption cards.**

Infusion behaviors:
- Checklist items within T-60m get urgency proximity badges (T-Xm markers, color-coded)
- Run of Show items gently weighted by upcoming relevance (subtle brightness differential, ≤20% opacity range)
- No reordering — only visual weight shift

Surfaces: Run of Show (day-of), Planning Tasks (day-of), Agenda (day-of), Vendor contacts (day-of mode only)

**Activation:** `event.dayMode = true`

### Tier 2 — Live Orchestration (full system)
Full orchestration engagement. The environment narrows attention to what matters now.

**Components active:**
- `cognitiveTunneling.js` — FOCAL / ADJACENT / PERIPHERAL / GHOSTED classification
- Hierarchy weighting by pressure scalar
- Disruption cards (600ms transition — urgency must land fast)
- Pressure escalation (calm → building → active → disruption-cascade)
- Recovery phase (pressure relaxes at 1200ms geological drift)

Surfaces: DayTaskView ("Now"), VendorArrivalView ("Arrivals"), OrchestrationSlice (Track B R&D)

**Activation:** `event.dayMode = true` AND event start tick reached in RunOfShow timeline

---

## 4. Orchestration Activation Map

```
T-7d to T-2h   →  Tier 0 (planning mode, no orchestration)
T-2h            →  dayMode activates (manual or time-triggered)
                   Tier 1 soft cues appear on Run of Show + Planning Tasks
T-1h to T-0    →  Tier 1 soft hierarchy live (time-proximity badges)
T-0 (event)    →  Tier 2 activates (full tunneling + hierarchy + disruption)
T+0 through    →  Full orchestration. Pressure scalar drives tunneling.
end of event       Disruption cascade mode available.
Post-event      →  Recovery phase → calm → orchestration off
```

### Trigger Conditions (Production Hooks)

| Transition | Code Signal | Location |
|---|---|---|
| Tier 0 → Tier 1 | `event.dayMode = true` | App.js line ~15163 (button toggle) |
| Tier 1 → Tier 2 | `event.startTick` reached | RunOfShow timeline tick engine |
| Tier 2 → Recovery | `pressureState = 'recovery'` | `cognitiveTunneling.js` classifyZone() |
| Recovery → Tier 0 | `event.dayMode = false` | Any surface navigation |

---

## 5. Boundary Protection Rules

Orchestration must **never** appear on these surfaces, regardless of `dayMode` state:

| Surface | Reason |
|---|---|
| Billing / Subscription | Financial decisions require full cognitive bandwidth. Zero ambient pressure. |
| Onboarding | New users need explicit guidance. Environmental inference fails without context. |
| Guest Import / RSVP | Bulk data operations with permanent consequences. Zero hierarchy pressure. |
| Settings / Account | Administrative config mode. Orchestration is meaningless here. |
| Error States / Modals | Errors need explicit recovery UI. Ambient signals compound confusion. |
| Empty States / First Use | No event data = no hierarchy context. Orchestration requires real event structure. |
| Any modal/overlay | Focus is already narrowed by the modal. Competing signals create noise. |

---

## 6. Dual-Track Constraint

This constraint is absolute and not subject to sprint-by-sprint re-evaluation:

- **Track A (App.js — Production):** Real coordinator-facing UI. Tier 0/1 orchestration only until live session gates pass. No OrchestrationSlice code touches this track.
- **Track B (OrchestrationSlice — R&D):** Full Tier 2 prototype. Alpha validation environment. Never merged to Track A until primary gates confirmed.

**Gate conditions before any Track A infusion beyond Tier 1:**
1. `engaged: true` — confirmed in a real facilitator-observed coordinator session
2. `firstOrchestrationTapMs < 10000` — on iPhone Safari, fresh session, no briefing

---

## 7. Figma Integration Slices (Pages 73–79)

All created in Figma file `CYlmJqDCXEaacCuz9wW3bd`.

| Page | Slice | Content |
|---|---|---|
| 73 | Strategy Overview | Tier model, activation map, boundary protection, dual-track constraint |
| 74 | Slice A: Live Event Dashboard | Desktop (1280px) + Mobile (375px) with full Tier 2 orchestration infusion |
| 75 | Slice B: Checklist Flow | Tier 1 soft hierarchy on Planning Tasks + Run of Show — pre-event vs day-of |
| 76 | Slice C: Live Vendor Coordination | Vendor gravity under pressure — flat list vs priority-order gravity field |
| 77 | Slice D: Mobile Interruption Recovery | 4-state iPhone sequence: active → locked → return (0-2s) → oriented |
| 78 | Slice E: Recovery Re-entry | Disruption peak → recovery begins → post-event — geological opacity relaxation |
| 79 | Slice F: Pressure Escalation Threshold | Tier 0→1→2 escalation ladder, trigger conditions, surfaces that never escalate |

---

## 8. Mobile Infusion Strategy

The primary deployment surface is **iPhone Safari at 375px**. Desktop and tablet are secondary coordination surfaces (war-room, multi-display scenarios).

Mobile-specific constraints:
- `pagehide`/`pageshow` (Sprint 40B) handles iOS lock/unlock detection. `visibilitychange` is unreliable on physical devices.
- Re-orientation on return: identity strip (event name + mode + T-minus) is the sole re-orientation signal. No toast, no spinner, no "you were away" UI.
- Controls strip de-emphasized: small (22px), dim (#444444), below identity strip. Operational content is the signal.
- FRAGILE signal (red border + red dot) is the sole visual outlier at PRE-EVENT/calm — verified in Sprint 40E mechanical data (8 of 20 operational taps on `seq-crossfade`).

---

## 9. Live-State Transitions (Doctrine)

All orchestration state transitions must drift, not snap. This is the **geological continuity doctrine** established in Sprint 40D.1.

| Surface | Transition | Speed |
|---|---|---|
| Tunneling opacity (all zones) | All pressure states | 1200ms |
| Mode label text crossfade | PRE-EVENT → LIVE → POST-EVENT | 400ms fade-out + 400ms fade-in |
| Mode text color | Phase change | 1000ms |
| Sticky header background/border | Phase change | 1200ms |
| Disruption card | Appears/resolves | 600ms — urgency must land fast |

The disruption card's 600ms is the **only** intentional deviation from geological timing. Urgency signaling must land fast. All ambient environment signals use 1200ms.

---

## 10. Infusion Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Tier 1 soft cues feel confusing without context | Medium | Only activate with `dayMode = true`. Coordinators explicitly enable day mode — they know they're on-event. |
| Tunneling on mobile causes missed items | High | PERIPHERAL items remain at 0.45 opacity minimum. GHOSTED at 0.20 minimum. Never invisible. |
| Disruption card causes panic | Medium | Card is informational + dismissible. Coordinator must tap to acknowledge — gives agency. |
| Tier 1 subtle signals go unnoticed | Low | That is acceptable. Tier 1 is soft — if coordinator misses it, they still have the full explicit view. |
| orchestration activates on wrong surface | High | `dayMode` flag is the gating condition. Admin surfaces never check `dayMode` for orchestration. |
| Track A/B contamination | Critical | All Track B code lives in `demo/src/slices/OrchestrationSlice.jsx`. No shared imports with App.js. Enforced by file separation. |

---

## 11. What Needs to Happen Next

**Before any production infusion (even Tier 1):**
1. Run a real coordinator alpha session (iPhone Safari, fresh URL, no briefing, facilitator silent)
2. Confirm `engaged: true` and `firstOrchestrationTapMs < 10000`
3. Only after both gates pass: add Tier 1 soft hierarchy to Run of Show + Planning Tasks in App.js

**Sprint 42 candidates (pending gate confirmation):**
- Tier 1: Add T-minus proximity badges to Planning Tasks (day-of mode only)
- Tier 1: Subtle brightness weighting on Run of Show items by time-to-relevance
- Track A: `generateChecklistFromIntake()` — add Anniversary, Bridal Shower, Baby Shower, Graduation paths

---

## 12. Files Changed

No production code was changed in Sprint 41. This sprint was strategy and documentation only.

| File | Change |
|---|---|
| `demo/review-artifacts/2026-05-27-orchestration-infusion-strategy/README.md` | This file |
| Figma file `CYlmJqDCXEaacCuz9wW3bd` | Pages 73–79 created |

---

## 13. Honest Assessment

Sprint 41 produced a clear, codified strategy for how orchestration enters the production product. The tier model gives a definitive answer to the question "what goes where and when." The Figma slices visualize each integration point at production fidelity.

What Sprint 41 did not do: run any more mechanical simulations. The next sprint that matters is not a strategy sprint — it is the real coordinator alpha session. Five sprints of environment building (40A through 40E) and one strategy sprint (41). The preparation is complete.

The environment is ready. The strategy is documented. The next step is a human being on a physical device.
