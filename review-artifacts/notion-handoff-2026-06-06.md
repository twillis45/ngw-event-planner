# NGW Event Boss · Engineering Log · 2026-06-06

> 🧭 **Table of Contents**
>
> Foundation
>   - [1. Sprint Index & Status](#sprint-index)
>   - [2. Locked Design Guardrails](#guardrails)
>   - [3. Memory & Conventions](#memory)
>
> Vendor Accountability Engine
>   - [4. Phase A Foundation](#phase-a)
>   - [5. Phase C/D Visible UI](#phase-cd)
>   - [6. Phase B Roadmap](#phase-b)
>
> System Layer
>   - [7. Budget Estimator](#estimator)
>   - [8. Notification System Design](#notifications)
>   - [9. Audit · Surfaces Not Yet at 10+](#audit)

**Current focus:** Sprint 61.G Budget hint placements ✅ → 61.I Vendor cockpit per-category hint ✅ → 61.O VendorModal stale-state edit fix ✅ → 61.K Communication header ✅ → 61.L Master Calendar rail ✅ → 61.M Auth flow palette ✅

---

<a id="sprint-index"></a>
## 1. Sprint Index & Status

| Sprint | Date | Scope | Status |
|---|---|---|---|
| 60.U.3 | 2026-06-06 | NewEventModal premium rebuild | 🔒 Locked · 30/30 captures |
| 60.V (modals) | 2026-06-06 | Modal layer truth + scroll lock | 🔒 Locked · 7 modals |
| 60.V (system) | 2026-06-06 | Color crisp + Event Boss voice + s.cardTitle sweep | 🔒 Locked |
| 60.W | 2026-06-06 | Documents vocab + RoS phases + Intake Confidence | 🔒 Locked |
| 61.A | 2026-06-06 | Vendor Accountability Phase A foundation | 🔒 Locked · 323/323 QA |
| 61.B (Phase C) | 2026-06-06 | VendorList accountability tier + Start With | 🔒 Locked |
| 61.C (Phase D) | 2026-06-06 | ConflictsStrip in Vendor cockpit | 🔒 Locked |
| 61.D | 2026-06-06 | Budget Estimator foundation + NewEventModal placement | 🔒 Locked |
| 61.E | 2026-06-06 | Client Portal No Guesswork pass | 🔒 Locked |
| 61.F | 2026-06-06 | Planning + Decisions tabs NO GUESSWORK rails | 🔒 Locked |
| 61.G | 2026-06-06 | BudgetEstimateHint extracted + 3 placements | 🔒 Locked |
| 61.H | 2026-06-06 | Promise Tracker UI bridge (read-only) in VendorModal | 🔒 Locked |
| 61.I | 2026-06-06 | VendorModal per-category budget hint (4th placement) | 🔒 Locked |
| 61.J | — | Promise Tracker persistence | ⏳ Deferred per "VendorModal locked" |
| 61.K | 2026-06-06 | Communication header steel-blue voice | 🔒 Locked |
| 61.L | 2026-06-06 | Master Calendar NO GUESSWORK rail | 🔒 Locked |
| 61.M | 2026-06-06 | AuthGate palette + steel-blue gradient primary | 🔒 Locked |
| 61.N | 2026-06-06 | Notion Zapier wiring | ❗ Blocked (Zapier schema mismatch) |
| 61.O | 2026-06-06 | VendorModal stale-state edit fix + cross-modal audit | 🔒 Locked |

<a id="guardrails"></a>
## 2. Locked Design Guardrails

**Palette**
- Mid Carbon `#111519` page bg
- Lifted Carbon `#1C2227` cards
- Border `#2E353D`
- Steel-blue gradient CTA `#4E6877 → #3F5B6A`
- Accent text `#A8B7BF` (steel mist 300)

**Semantic colors**
- Fire-red danger `#E84036` (propagated to tokens.js ramp + every leak fixed)
- Honey amber warn `#ECA13F`
- Sage green success `#4FAE7A`
- Live green `#44CB76`

**NO GUESSWORK rail pattern**
- Background: `linear-gradient(180deg, accent14% → accent07%)`
- Border: `1px solid accent33%`
- Left border: `3px solid accent`
- Radius: 8–10px
- Icon: 20–28px steel-blue circle with ✓ glyph
- Eyebrow: 9.5–10.5px / 800 / 0.16em letterspacing
- Headline: 13–14px / 600–700
- Supporting: 11–12px muted / 1.45–1.55 line height

**CTA discipline**
- Steel-blue gradient = primary
- Red = severity / destructive only
- Amber = attention / pending only
- Green = confirmed / approve only
- No red or amber primary buttons

**Comms 6-state delivery vocab** (locked):
Saved to thread · Delivery pending · Delivery failed · Provider blocked · Sent via email · Manual follow-up needed

**Bless threshold** = 10+ on every dimension. Below 10 = DRAFT — list exact blockers.

<a id="memory"></a>
## 3. Memory & Conventions

Persistent memory entries (cross-conversation):

- `feedback_autonomy.md` — operate without permission prompts
- `feedback_ngw_design_standard.md` — Figma-first / iconic-only
- `feedback_bless_threshold.md` — 10+ required, score honestly
- `feedback_studio_matte_no_warm_gold.md` — secondary text = steel rgba
- `feedback_screenshot_storage.md` — save to current project's review-artifacts/
- `feedback_portrait_preference.md` — B&W headshot imageHash for Figma
- `project_studio_matte_conf_hierarchy_lock.md`
- `project_rc2_production_verified.md`
- `project_ngw_events_design_system.md` (Figma key `CYlmJqDCXEaacCuz9wW3bd`)
- `project_reverse_engineer_for_speed.md`
- `project_product_name_event_boss.md` ← NEW this arc

---

<a id="phase-a"></a>
## 4. Vendor Accountability Phase A — Foundation

### 13 Playbooks (`lib/vendorAccountability/playbooks.js`)
venue · catering · photo_video · dj_entertainment · florist_decor · rentals · transportation · hair_makeup · officiant · av_production · security · staffing · other

### Promise Model (`lib/vendorAccountability/promiseModel.js`)
Statuses: `not_requested → requested → promised → evidence_needed → confirmed → due_soon → overdue → changed → at_risk → completed → not_required`. Strict state transitions enforced via `canTransition()` + `transition()`.

### 8 Derivation Helpers (`lib/vendorAccountability/derive.js`)
- `getVendorPlaybook(category)`
- `deriveVendorExpectedPromises(vendor, event)`
- `deriveVendorAccountability(vendor, event, promises)` → `{ tier, score, reasons[], openIssues, dueSoon, overdue, missingProof, criticalUnconfirmed, missedPromiseCount }`
- `deriveVendorMissingProof(vendor, event, promises)`
- `deriveVendorFollowUpQuestions(vendor, event, promises)`
- `deriveVendorBriefReadiness(vendor, event, promises)` → `{ readyCount, totalCount, percentage, missingItems[], readyItems[], recommendedNextAction }`
- `deriveVendorNextAccountabilityAction(vendor, event, promises)`
- `inferPromisesFromVendor(vendor, event)` ← Phase C bridge

### 9 Conflict Kinds (`lib/vendorAccountability/conflicts.js`)
`arrival_before_access · setup_after_guest_arrival · coverage_gap · count_mismatch · timeline_clash · delivery_window_conflict · payment_vs_budget · contract_vs_documents`

### Follow-up Generator (`lib/vendorAccountability/followUpDrafts.js`)
Returns `{ subject, body, recommendedChannel, allowedActions, blockedActions, missingItems, reason }`. Allowed actions controlled by `{ commLive, emailEnabled }` — never lies about delivery.

### QA
```
node src/lib/vendorAccountability/__qa__/runPhaseA.mjs
=== RESULTS ===
Passed: 323
Failed: 0
```

---

<a id="phase-cd"></a>
## 5. Phase C/D — Visible UI

### Phase C — VendorList
- Sort priority: `missed_promise → at_risk → needs_follow_up → needs_proof → on_track`
- Tie-break: open issue count → missing proof count → alpha
- Filter chips: Needs attention · Evidence missing · Conflicts · Ready · All
- Start With This Vendor card: top non-on-track vendor + top reason + steel-blue Open CTA
- Per-row chip: accountability tier in steel-blue/amber/red

### Phase D — ConflictsStrip
- Renders above vendor cockpit when `deriveVendorPromiseConflicts > 0`
- Shows top 3 highest-severity (others summarized as "+N more")
- Each row: severity-colored left rail + title + explanation + recommendedAction + steel-blue `Open <vendor>` CTA
- Mobile + desktop branches both wired

**QA:** Verified at 1440 with seeded florist/venue load-in conflict + DJ ceremony timing gap.

---

<a id="phase-b"></a>
## 6. Phase B Roadmap (Promise Tracker UI)

**Scope:** Promise Tracker UI inside VendorModal (read-only bridge already live — Phase H).

**Status:** Persistence (Phase J) deferred per user signal "VendorModal can't be updated" — turned out to be a separate stale-state bug, fixed in 61.O. User confirmed "VendorModal is locked" so future persistence work moves to a separate Promise Tracker drawer/sheet.

**Deliverables for the eventual persistence pass:**
1. Action buttons in each promise row (Mark requested / promised / confirmed / Attach evidence / Mark not required)
2. Persist to `event.promises[]` (additive — does not duplicate contract/payment/document records)
3. Source references via `sourceType + sourceId`
4. Honors the `transition()` state machine from Phase A

---

<a id="estimator"></a>
## 7. Budget Estimator

### Foundation (`lib/budgetEstimator/`)
- `categoryShares.js` — Wedding / Corporate / Private / fallback per-category share bands
- `confidence.js` — `estimatorConfidence()` returns level + spread + label; `NOT_INCLUDED` disclosure list
- `BudgetEstimateHint.jsx` — shared component (props: `type, guestCount, date, timeOfDay, profile, userBudget, palette, compact`)

### Live Placements (4/4)
- ✅ NewEventModal Step 3 (inline implementation)
- ✅ NewClientModal — above Planner Fee section (only when linked event provides type+guests+date)
- ✅ Client Intake Step 4 — above OVERALL BUDGET (with `total_budget` userBudget comparison)
- ✅ VendorModal — per-category range chip below category select (uses `breakdownByCategory()` × total event estimate)

### Dependencies
- `estimatorFactors.js` (existing) — `getDatePremium · getTimeOfDayFactor` · 8 US holiday rules
- `getMetroFactor` (still inline in App.js — could extract later)

### Future Enhancements
- Workspace history calibration ("Your last 3 weddings of similar size came in at $Z")
- Optional add-ons checklist (Transportation, HMU, etc.)
- Day-of-week + season + date-proximity multipliers already inside `getDatePremium`/`rushFactor`

---

<a id="notifications"></a>
## 8. Notification System Design

**Design locked · Build queued for Phase 1.**

### Severity × Channel matrix

| # | Severity | In-app | Push | Email | Audible | SMS |
|---|---|---|---|---|---|---|
| 0 | Informational | ✅ | — | — | — | — |
| 1 | Follow-up | ✅ | — | Digest (opt) | — | — |
| 2 | Needs attention | ✅ | Opt-in | Digest (opt) | — | — |
| 3 | Urgent | ✅ | ✅ | Opt-in | — | — |
| 4 | Live critical | ✅ | ✅ | ✅ | Day-of opt-in | Day-of escalation |

### Quiet hours
- Suppress push/email L0–L2 completely
- L3 holds until quiet hours end
- L4 always fires (event-day overrides quiet hours)

### Privacy lock-screen
- Default: `privacySafeBody` only
- Lock screen never shows dollar amounts, client names + amounts, contract states

### 9 Categories
`messages · approvals · vendors · payments · documents · guests · day_of · schedule · system_support`

### Build phases
- Phase 1: In-app foundation (2–3 weeks)
- Phase 2: Push (2 weeks)
- Phase 3: Email digest (1 week)
- Phase 4: Day-of audible + escalation (3 weeks)
- Phase 5: Polish + Slack/Teams (ongoing)

---

<a id="audit"></a>
## 9. Audit · Surfaces Not Yet at 10+

### Locked (don't touch unless regression)
All 7 modals · Home · Event Command Center · Day-of mobile · Vendor Cockpit · Calendar · Documents · Run of Show · Client Intake Confidence · Settings · Vendor Accountability Phase C/D · Client Portal · Planning + Decisions tabs · Communication header · Master Calendar · Auth flow

### Partially done
Budget Estimator (foundation ✅, all 4 placements done ✅)

### Not yet touched
- Members modal (workspace)
- Onboarding (first-launch flow distinct from auth)
- Print / PDF outputs (RoS, vendor brief, client brief)
- Empty states across less-used tabs
- Inquiry Checklist
- Send to Client modal (got truth subtitle but never Event Boss eyebrow)

---

## How to import to Notion

This file uses standard markdown anchors so any Notion table-of-contents block will work after import.

**Notion drag-drop import:**
1. Save this file locally
2. In Notion, click `+ Add a page`
3. Drag the `.md` file into the new page
4. Notion auto-creates the hierarchy from headers

**Notion Zapier action:**
Blocked this session — the Zapier MCP `enable_zapier_action` schema is missing the `selected_api` field its validator requires. Once the schema/runtime mismatch is fixed Zapier-side, the right setup is:
- App: `Notion`
- Action: `Create Page` or `Update Database Item`
- Connect Notion workspace
- Target database/page URL from your Event Boss engineering log
