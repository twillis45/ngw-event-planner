# Sprint 50 — Vendor Workspace Audit (inventory, read-only)

Date: 2026-06-07 · Branch: main (`c3d5785`) · No code/Figma changed.

## Headline
Like the Command Center, the **Vendor Workspace already exists and is deep.**
`VendorPlanningWorkspace.jsx` = **3,425 lines / 147 KB**, ~35 sub-components, backed by
four libs: `vendorIntelligence.js` (887), `vendorCopilot.js` (440), `vendorQuestions.js`
(217), and a full **`vendorAccountability/` module** (promiseModel, derive, conflicts,
playbooks, followUpDrafts, fixtures). It is the canonical Vendors tab (lazy-loaded in
App.js as EventVendorsTab). **The work is surfacing, not building.**

## 1. Existing functionality inventory
P = Present · ◑ = Partial · ✗ = Missing

**Vendor Header** (CommandHeader, ReachActions)
- Contact P · Category P · Status P (+ lifecycle stage) · Event Association P
- Reach Actions P — Call `tel:`, Email `mailto:`, WhatsApp `wa.me`, Zoom/Meet/Teams URLs

**Readiness Brief** (PhaseSection ×3 Planning/Day-Of/Wrap-Up, ReadinessSnapshot, vendorIntelligence)
- Contract P · Payment P · Arrival P · Timeline P · Communication ◑ (last-contacted + link to Comm tab)
- Deliverables ◑ (engine exists; not a dedicated section — see Hidden)

**Open Items** (LinkedWorkSection, RequiredQuestionsSection)
- Requests P · Questions P · Approvals P · Decisions P (all linked + routable)

**Communication Context**
- Messages ◑ (last-contacted summary + route to Communication tab — inline thread intentionally not duplicated)
- Notes P (NotesSection) · Outstanding Questions P · Recent Activity P (ActivityLogSection)

**Deliverables**
- Vendor Deliverables ◑ · Status Tracking ◑ · Approval Tracking ◑
  (promiseModel computes rich statuses but they drive list tier/next-action, not a per-deliverable UI)

**Contract + Payment** (ContractFlow, PaymentFlow, payLinks.js, stripeApi.js, docusign.js)
- Contract Status P (attach URL / mark received / email-for-signature / file upload / DocuSign)
- Deposit P · Balance P · Due Dates P (`depositAmt`/`balancePaid`/`payDueDate`)
- Payment rails P (Venmo/PayPal/Zelle deep-links + Stripe Checkout links)
- Invoice Awareness ◑ (referenced in intelligence/playbooks; no invoice object/upload)

**Timeline Impact**
- Arrival P (ArrivalTimeFlow) · Setup ◑ · Dependencies ◑ (conflicts.js cross-vendor) · Milestones ◑ (Stripe milestones; no vendor event-milestone graph)

**Documents** (DocumentsSection)
- Contracts P · Insurance P · COI P (`insuranceStatus`) · Attachments P (Supabase Storage upload) · Reference Files P

**Quick Actions**
- Call P · Email P · Upload P (ContractFlow/Documents)
- Request ◑ · Decision ◑ (linked + route to Communication/Decisions; not one-tap create inside the cockpit)

## 2. Gap matrix
**A — Exists but hidden / under-exposed**
- Vendor **accountability promise model** (`promiseModel.js`): statuses requested → promised →
  evidence_needed → confirmed → due_soon → overdue → at_risk → completed. Drives list tier
  (`missed_promise`/`at_risk`), ConflictsStrip, and next-action — but **no per-deliverable tracker UI** in VendorDetail.
- **Per-promise follow-up draft generator** (`generateVendorFollowUpDraft`) — built, only lightly surfaced.

**B — Exists but weak**
- Deliverables/promise section (engine present, UI absent in detail)
- Inline Messages (links out by design) · Invoice awareness (no object) · Timeline dependencies/milestones (light)
- One-tap Request/Decision creation from inside the cockpit

**C — Truly missing**
- A dedicated **Deliverables section** rendering per-promise status + "request proof / mark confirmed"
- An explicit **invoice** object (received/amount/due) — currently inferred only
- Vendor dependency/milestone timeline view

**D — Should NOT exist (kill / don't build)**
- Inline full message thread in the cockpit (would duplicate the Communication tab — keep the link)
- Any auto-send to vendors (honesty rule — drafts are copy/deep-handoff only)
- Residual retired-Overview action-band remnants (verify removed)

## 3. Reuse percentage estimate
**~90% already built.** Every inventory AREA exists; the deltas are ◑ surfacing/strength,
not absent capability. Sprint 50B is wiring existing engines into UI + minor strengthening.

## 4. Hidden functionality discovered (the gems)
1. **Full vendor accountability engine** — playbooks of per-category common promises, promise
   status lifecycle, cross-vendor conflict detection, and follow-up draft generation. Today it
   only powers tiers/next-action/conflicts; the per-deliverable richness is invisible to planners.
2. **Per-promise follow-up drafts** (`generateVendorFollowUpDraft` / `generateAllFollowUpDrafts`).
3. **ReadinessCopilotSection** — BYOK AI readiness brief (honest fallback) already in the detail.
4. **ConflictsStrip** — cross-vendor timeline/promise conflicts at the list level.

## 5. Recommended Sprint 50B scope (surface, don't redesign)
1. **Deliverables / Promise Tracker section** in `VendorDetail`: render `inferPromisesFromVendor(v,event)`
   as status-chipped rows (Promised · Evidence needed · Confirmed · Overdue · At risk) with
   "Mark confirmed" / "Request proof" affordances. Engine exists — this is one new section + handlers.
2. **Surface per-promise follow-up drafts**: a "Draft follow-up" `CopyableDraft` on each
   at-risk/overdue promise (honest: copy / deep-handoff, never auto-send).
3. (If cheap) light **invoice awareness**: record "invoice received / amount / due" as honest record-only.
Keep Messages routing to the Communication tab. No new Figma concepts — this surfaces shipped code.

## 6. Features to kill
- Do **not** add an inline message thread (duplicate of Communication).
- Do **not** add auto-send to vendors.
- Remove any dead retired-Overview action-band code if still present.

## 7. Features to expose
- The **accountability deliverables/promise tracker** (#1 priority) and **per-promise follow-up drafts**.
  These are the highest-value planner wins and are already written — they just aren't on screen.

## Figma
No new pages created. The audit proves the gap is **surfacing existing code**, not new design —
consistent with "only create pages if the audit proves meaningful [design] gaps." Defer any
Figma until Sprint 50B scope (deliverables section) is confirmed.
