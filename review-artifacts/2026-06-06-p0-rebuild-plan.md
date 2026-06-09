# P0 Workflow Rebuild Plan — using the Add Vendor 10+ Standard

**Created:** 2026-06-06
**Status:** Planning only. No implementation, no Notion writes, no polish.
**Pattern source:** Add Vendor 3-step wizard (`src/App.js` `AddVendorWizard` at L22684, `VendorCreatedSuccess` at L23072) — the locked 10+ reference.

---

## 1. Executive summary

Four P0 workflows remain to rebuild after Add Vendor: **Add Client**, **Create Event**, **Communication send/save**, **Budget/Payments**.

The good news is two of them already partially follow the pattern — `NewEventModal` is already a 3-step wizard with success state, and the Comms `Composer` already obeys the 6-state contract honestly. They need spec-compliance polish, not full rebuild. **Add Client** needs MODIFY (success-state itemization, trust block, optional Save-to-bank parity if it's adopted as a pattern). **Budget/Payments** is the only one needing meaningful structural work — payment-write flows currently fire on a single tap with no review gate, and the source-of-truth for `depositPaid` / `balancePaid` lives on the vendor record (correct) but the same flags are read through budget surfaces that don't always agree (risk).

Brutal honest read:
- **Add Client** — confusing because it does too much in one modal (identity + fee structure + event link + intake fast-path). Misses the explicit trust block and the "nothing has been written" affirmation that Add Vendor locked.
- **Create Event** — closest to bless already; needs the 4-line trust block and the explicit "what will NOT happen" line on Step 1, plus mobile reachability data-testids.
- **Communication send/save** — the COMPOSER is honest. The INBOX is the failure: the planner can't tell at a glance who needs reply, and the 6 lane vocabulary isn't surfaced as a column or filter.
- **Budget/Payments** — has the biggest SoT risk. Marking a vendor balance "paid" through the vendor modal vs through a budget surface needs to converge on one path with a review gate, or it'll drift.

Implementation order, ruthlessly: **Budget/Payments → Add Client → Create Event → Communication**. Budget first because it has the largest source-of-truth risk; the others are essentially polish + trust-block additions.

---

## 2. P0 workflow table

| # | Workflow | Current shape | Spec recommendation | SoT risk | Mobile risk | Implementation size |
|---|---|---|---|---|---|---|
| 1 | Add Client | Single modal + "Create & Start Intake" fast path | **MODIFY** — single modal + review gate | Low — single write to clients[] | Medium — no `data-testid` on entry | Medium |
| 2 | Create Event | 3-step wizard + success | **MODIFY** — adopt 4-line trust block + testids | Medium — kit checkbox controls 4 silent writes (timeline / vendors / budget / vendorCats) | Low — already responsive | Small |
| 3 | Communication send/save | Composer honest, inbox lanes weak | **MODIFY** — inbox lanes + 6-state surfaced as filter chips | Low — composer always saves to thread, never silent | Medium — needs lane filter + testids | Medium |
| 4 | Budget / Payments | Direct tap-to-mark on vendor flags + Stripe layer | **REBUILD** — review-gate the deposit/balance mark; converge vendor + budget read paths | **High** — two surfaces can write to depositPaid/balancePaid | Medium — payment table dense on mobile | Large |

---

## 3. Per-workflow plan

### 3.1 — Add Client

**Current workflow map**
- Entry: `+ Client` button in MainDashboard / Home Quick Actions (`onNewClient` callback).
- Modal: `NewClientModal` at `src/App.js:8870`. Single-pane form with all fields visible: name, email, phone, referral, status, planner fee, fee structure, contact pref, guest estimate, venue status, style notes, init notes. Event link via `selectedEventId`. Two CTAs: **Create client** and **Create & Start Intake**.
- `submit(openIntake)` writes a full client object via `onCreate(...)` with `eventIds`, `log`, `feeSchedule` populated. The fast path additionally navigates to the intake flow.
- Sprint 60.U.3 added a `submitted` payoff receipt state that shows AFTER a plain Create. Already present, partial.

**User confusion points**
1. Form opens with planner-fee section collapsed (good) but the form is still ~12 fields without grouping into steps. A grandmother test fails.
2. "Create & Start Intake" implies *something starts an intake on behalf of the client* — could read as "an intake email goes out". It doesn't, but the label doesn't disclose that.
3. No explicit "no messages will be sent" line.
4. Event link is one dropdown with no visual scope chip — user doesn't know if linking creates a new vendor on the event or just attaches the client.
5. Fee section is collapsed — when expanded, the four fee structures (flat / hourly / percentage / none) appear at once with no plain-language gloss.

**Trust risks**
- "Create & Start Intake" — risk of implying outbound intake email/SMS. Resolution: rename and disclose.
- The `log` entry "Client created. Preferred contact: X. ..." auto-populates on save. The user doesn't see this happen and can't approve it. Low risk but worth surfacing.

**Source-of-truth owner**
- `clients[]` array in App.js parent state.
- Single writer: `submit` → `onCreate(payload, eventId, openIntake, navigate)`.
- Optional secondary write: linkage to an event via the `eventIds` array on the client + reciprocal entry on the event (need to verify the reciprocal write isn't double-writing; see SoT warnings §7).

**What writes happen today**
- On submit: a new entry in `clients[]`. If `selectedEventId` is set, the new client's `eventIds` includes it. If reciprocal sync exists, the event's `clientId` may also be set — verify.

**What writes should happen only after final review**
- The client record itself.
- The event linkage.
- The `log` entry.
- No write happens on Step 1 or Step 2 navigation.

**Required trust block language** (Step 1, Add Vendor parity)
```
✓ Messages sent: None
✓ Notifications sent: None
✓ Client will not be contacted
✓ Client is not created until final review
```

**Required success state**
"[Client name] added."
- Added to clients
- Linked to event: [event name | None]
- Fee structure: [flat | hourly | percentage | none]
- Estimated fee: [$amount | not set]
- Intake link generated: [Yes | No]
- Messages sent: None
- Notifications sent: None

**Actions**
- Open client (opens `ClientModal` at L7413 for the created client)
- Start intake (only after create — same as today's fast path but honest about it)
- Add another client
- Done

**Required mobile path**
- Top-bar `+ Client` or sidebar `+ New Client`. Already reachable.
- `data-testid="add-client-btn"` needs to be added to the entry CTA.
- Wizard data-testids: `add-client-wizard`, `acl-name`, `acl-email`, `acl-phone`, `acl-event-link`, `acl-fee-structure`, `acl-continue`, `acl-create`.

**Required failure / recovery paths**
- Cancel from Step 1 → drop everything, no write.
- Cancel from Step 2/3 → confirm-discard dialog (mirroring the existing `confirmDiscard` pattern from NewEventModal).
- Network/save failure on Create → preserve form state, show error inline, no half-written client.
- Duplicate detection (same email already in clients[]) → warn in Step 3 review; let user choose to add anyway with a note.

**Required QA assertions @ 390 / 430 / 768 / 1024 / 1440**
- Entry button reachable (data-testid resolves)
- Step 1: name required, email format optional but validated when typed, phone format optional but validated when typed
- Continue disabled until name present
- 4-line trust block visible verbatim
- Step 2: fee-structure preview shows what `feeSchedule` will be generated (3-installment breakdown for flat, etc.) — preview only, no write
- Step 3: itemized review matches spec
- Create button fires `onCreate` exactly once
- Cancel before Create leaves `clients.length` unchanged
- Success state shows itemized confirmation
- Open client opens the existing ClientModal pointed at the new id
- No banned hexes, no horizontal overflow, 0 page/console errors, no amber/red primary CTA

**Review Board expected objections**
- Wedding planner: "Where is fee schedule preview?" → Step 2 must show the generated `feeSchedule` table before commit.
- Skeptical paying planner: "Did you store my credit card stuff?" → Trust block must say "No payment information collected".
- Grandmother: "What does 'percentage' mean?" → 1-line explainer per fee structure radio.
- Trust & safety: "Did the intake link go out?" → success state confirms "Intake link generated" (yes/no), not "Intake email sent".

**Exact recommendation: MODIFY** — keep `NewClientModal` but wrap the existing form in a 3-step shell. Step 1 = identity + event link. Step 2 = fee + intake preference + planner notes. Step 3 = review. Existing `submit()` becomes the Step 3 commit. The fee-structure preview (already partly built) becomes a Step 2 derived preview without writes. **Shape: B — single modal with review gate** (vs. C wizard). The modal is already mounted; we add the review gate. Lower risk than a full rebuild.

---

### 3.2 — Create Event

**Current workflow map**
- Entry: `New Event` button (sidebar `navActions` at L13497, also Home Quick Actions).
- Modal: `NewEventModal` at `src/App.js:6237`. **Already a 3-step wizard with success state.**
  - Step 1: Basics — name, type (primary + optional secondary), date, time of day.
  - Step 2: Setup — "kit" picker (Simple / Wedding / Corporate / Private / Blank) with `checklist` of what each kit creates.
  - Step 3: Details — venue, guest count, total budget.
  - Success: shows the created event id + the "Created for you" payoff.
- `createNow()` writes a full event with `timeline / vendors / budget / vendorCats / guests / ros`. KITS table at L6267 controls which sub-arrays seed.

**User confusion points**
1. Step 2's kit picker is the only "what does this kit create?" exposure point. Excellent in concept; needs to render the checklist as a Step 1-style trust contract: "Here's exactly what we'll create when you tap Create event."
2. No explicit "no messages will be sent / no notifications will be sent" line.
3. "Create event" CTA on Step 3 — fine, but no "this is the last chance" callout.
4. Discard confirmation works (`confirmDiscard` at L6260) but mobile QA must verify reachability.

**Trust risks**
- Lowest of the four. KITS already disclose what they'll create. Just needs the trust block applied for consistency.

**Source-of-truth owner**
- `events[]` array in App.js parent state.
- Single writer: `onCreate(payload, clientId, navigate)` at L6317.

**What writes happen today**
- One write to events[] with all sub-arrays populated.
- If `selectedClientId` is set, client's `eventIds` is updated reciprocally (verify).

**What writes should happen only after final review**
- The event + all template-seeded sub-arrays.
- No write until Step 3 → Create event.

**Required trust block language** (Step 1)
```
✓ Messages sent: None
✓ Notifications sent: None
✓ No client or vendor will be contacted
✓ Event is not created until final review
```

Plus a kit-specific contract on Step 2: "This kit will create: [N timeline tasks · N vendor categories · N budget lines · planning checkpoints]."

**Required success state**
Already mostly built. Spec-compliance adds:
- Messages sent: None
- Notifications sent: None
- (existing) Created for you: [checklist items]

**Required mobile path**
- `data-testid="add-event-btn"` on the entry CTA.
- Wizard testids: `add-event-wizard`, `aev-name`, `aev-type`, `aev-date`, `aev-kit-<id>`, `aev-continue`, `aev-create`.
- Verify 390/430 success state isn't cut off by browser chrome (existing modal uses bottom-sheet pattern on mobile — confirm with screenshot).

**Required failure / recovery paths**
- Cancel mid-wizard → confirm-discard (already there).
- Create failure → preserve form state, no half-written event.
- Date validation: don't allow past dates by default; warn but allow with confirmation.

**Required QA assertions @ 5 viewports**
- All existing assertions from Add Vendor v2 QA, plus:
- `aev-create` writes exactly one event to events[]
- Kit-specific checklist matches actual seeded sub-array counts (assertion: if kit `wedding`, then `vendors.length === N` per `mergeVendorStubs('Wedding').length`)
- Success state surfaces the same itemized text the trust block promised
- No banned hexes, no horizontal overflow, 0 page/console errors, no amber/red primary CTA

**Review Board expected objections**
- Corporate event planner: "Where do I put the cost center / approval chain?" → Either add a Step 3 optional field or defer to event-detail edit.
- Tired planner at 11pm: "Why did it create 24 tasks I didn't ask for?" → Already disclosed via KITS.checklist; ensure the count appears on Step 2 *and* Step 3.
- No Guesswork PO: "If I pick Blank, what happens?" → KITS row already says "Event workspace only" — confirm Step 3 review echoes "Created for you: Event workspace only".

**Exact recommendation: MODIFY** — small. Add 4-line trust block to Step 1, add explicit "what will NOT happen" line, add data-testids, ensure success state itemizes count-by-count. No structural change. **Shape: A — 3-step wizard, already correct.**

---

### 3.3 — Communication send/save

**Current workflow map**
- Composer: `src/plan/CommunicationHub.jsx:519`. Already honest — 4 composer states (`email-live`, `email-draft`, `backend`, `local`) drive 4 different CTA labels (`Send email` / `Open email draft` / `Save to thread` / `Log to thread`) with title tooltips disclosing what each will do.
- 6-state vocabulary lock (per memory): Saved to thread / Delivery pending / Delivery failed / Provider blocked / Sent via email / Manual follow-up needed.
- Inbox: surfaces threads by event/client/vendor, but no clear lane filter for "who needs my reply" vs "I sent, waiting on them" vs "delivery failed".

**User confusion points**
1. Inbox doesn't have a "Needs reply" lane filter — planner has to scan every thread. This is the biggest workflow gap, not the composer.
2. The 6 state labels exist as badges in the inbox but no chip filter at the top.
3. Mobile inbox dense — needs collapse-by-day or collapse-by-thread pattern.
4. "Open email draft" — when provider blocked, what happens? The mailto: handoff works but the user might not know their email client will open.

**Trust risks**
- Composer: zero trust risk — already honest.
- Inbox: showing "Sent" without disclosing channel is a risk. The badge needs to say "Sent via email" or "Saved to thread" honestly per the 6-state contract.

**Source-of-truth owner**
- `event.commClient` array.
- Composer writes via `onSend(thread, text, { deliverEmail, subject })`. Backend or local fallback. Already converged.

**What writes happen today**
- `onSend` appends a message to the thread. Always saves locally, optionally delivers via email when provider live.
- No silent writes elsewhere.

**What writes should happen only after final review**
- Composer is single-tap by design (it's a chat). NO review gate on send.
- The honest disclosure on the CTA label IS the review.
- One assertion: the user must always see the chip + label that says what will happen, BEFORE clicking. The composer already does this.

**Required trust block language**
For the inbox lane filter (NEW):
```
✓ Filter shows what needs your reply
✓ Filter shows what's awaiting external delivery
✓ Filter shows what failed and needs manual follow-up
✓ Filter does NOT auto-send anything
```

For the composer (existing): the `stateHint` line below the CTA already does this. Just verify it renders verbatim at every viewport.

**Required success state**
- Composer: after send, surface the SAME chip + label as a confirmation: e.g. "✓ Saved to thread · No external send (backend not connected)". 4-second auto-dismiss with explicit dismiss control.

**Required mobile path**
- `data-testid="inbox-needs-reply-filter"`, `data-testid="inbox-thread-<id>"`, `data-testid="composer-cta"`.
- On mobile, the inbox should default-collapse to "Needs reply" lane. Bottom nav already routes to Comms.

**Required failure / recovery paths**
- Send failure when commLive: keep draft in composer, show "Could not save — try again" status, preserve subject + body.
- Mailto handoff: after `window.open(mailto)`, show "Email draft opened in your mail app. The message is also copied to your clipboard." — already partly there; verify.
- Provider blocked state: explicit chip "Provider blocked — choose Manual follow-up" with a one-tap action that opens the mailto draft.

**Required QA assertions @ 5 viewports**
- Inbox renders 3+ lane filters (Needs reply / Awaiting them / Delivery issue)
- Filter click changes visible thread set
- Open a thread → composer state chip matches the resolved (commLive, emailEnabled, recipientEmail) tuple
- CTA label changes when toggling deliverEmail
- After send, success chip matches the actual write
- No banned hexes, no horizontal overflow, 0 page/console errors, no amber/red primary CTA

**Review Board expected objections**
- Tired planner at 11pm: "Which thread do I open first?" → Needs-reply lane is the answer.
- Skeptical paying planner: "When the CTA says 'Send email', does it actually send?" → Live SMTP confirmation via backend status. Already honest.
- Trust & safety: "Can a vendor be emailed accidentally?" → No — the `deliverEmail` opt-in is per-send and the CTA label changes with it. Already locked.

**Exact recommendation: MODIFY** — small composer polish + medium inbox-lane addition. The composer is already 10+. **The inbox needs lane filters as a separate workstream.** **Shape: C — existing screen with confirmation gate already present in composer; add filter chips to inbox surface.**

---

### 3.4 — Budget / Payments

**Current workflow map**
- Budget surface: `Budget` function at `src/App.js:16205`. Renders budget lines + vendor cost rollups + Stripe payment link generation per fee installment (`stripeOn` gated).
- Vendor surface: `VendorModal` and `VendorPlanningWorkspace` write `depositPaid` / `balancePaid` directly on the vendor record via `onPatchVendor` (cockpit one-tap CTA) and via per-field inline edits in the modal.
- Payment status is OWNED by the vendor record. Budget reads vendor rollups via `vendorPaid(v)` at L1008.

**User confusion points**
1. **Two surfaces can write the same payment status.** Cockpit "Mark balance paid" CTA at line 22540 (`onPatchVendor`) and VendorModal autosave both write to the same vendor record. No conflict in practice (they target the same record) but no review gate.
2. Marking paid via one tap with no review surfaces a real trust risk — a tired planner could accidentally tap "Mark balance paid" on the wrong vendor.
3. Stripe integration: when `stripeOn` is false, the "Create payment link" CTA must NOT render or must explicitly say "Stripe not configured — copy link manually". Need to verify current behavior.
4. Budget surface shows "balance due" math — must always agree with the vendor record. If a planner manually overrides `actual` on the budget line but the vendor `balancePaid` is true, the surfaces disagree.

**Trust risks** (highest of the four)
- Stripe `createCheckoutSession` writes a `stripeUrl` to `client.feeSchedule` — the planner needs explicit confirmation that "no charge was made yet, this is a payment link your client can use".
- "Mark deposit paid" / "Mark balance paid" — single-tap commits that change the financial source of truth. **No review gate. No undo dialog.** This is the workflow's most fragile point.
- Cross-surface drift: vendor.depositPaid vs budget.actual disagreement.

**Source-of-truth owner**
- Vendor record (`event.vendors[i].depositPaid`, `event.vendors[i].balancePaid`, `event.vendors[i].depositAmt`, `event.vendors[i].cost`).
- Budget lines (`event.budget[i].budgeted`, `event.budget[i].actual`) are PLAN values. They should derive `committed` and `spent` from the vendor rollup, not be edited independently.
- Stripe state (`client.feeSchedule[i].stripeSessionId`, `client.feeSchedule[i].stripeUrl`) — owned by client record.

**What writes happen today**
- Vendor cockpit "Mark deposit paid" → `onPatchVendor(vendorId, { depositPaid: true })`. **One tap. No review.**
- VendorModal payment field edits → autosave per keystroke. **No review.**
- Budget line `actual` field edit → autosave. **No review.**
- Stripe payment link create → writes `stripeUrl` to client.feeSchedule. **Single CTA.**
- Stripe payment verify (`verifySession`) → writes `paid: true` to the fee schedule entry. **Triggered by URL callback.**

**What writes should happen only after final review**
- "Mark deposit paid" and "Mark balance paid" — both need an inline confirmation gate ("This will mark $2,000 deposit as paid. Continue?") or an undo affordance (toast with 5-second undo).
- Stripe payment link CREATE — needs review gate ("This will create a payment link for $X. Your client can pay through it. Nothing is charged yet.").
- Stripe payment VERIFY (the URL callback) — must be atomic and surface a confirmation toast with the amount.

**Required trust block language** (for any "mark paid" action)
```
✓ This updates payment status on the vendor record only
✓ No charge is made
✓ No notification is sent to vendor
✓ No notification is sent to client
✓ Use Undo within 5 seconds to revert
```

For Stripe payment-link creation:
```
✓ Creates a hosted payment URL via Stripe
✓ Nothing is charged
✓ No email is sent — copy the link and share it manually
✓ Use Cancel to revert the link
```

**Required success state**
For "Mark paid":
- "$2,000 deposit recorded as paid for [Vendor Name]"
- Updated on: Vendor record
- Updated on: Budget rollup (auto-derived)
- Charges processed: None
- Notifications sent: None
- Undo (5s)

For Stripe link create:
- "Payment link created: $4,800 for [Fee installment]"
- Charges processed: None
- Link is live: Yes (client can use it)
- Notifications sent: None
- Copy link / Open link / Cancel link

**Required mobile path**
- `data-testid="vendor-mark-deposit-paid"`, `data-testid="vendor-mark-balance-paid"`, `data-testid="budget-create-stripe-link-<id>"`.
- Mobile budget surface needs payment rows that aren't 11px wide. Consider an expandable row pattern.

**Required failure / recovery paths**
- Mark paid → toast with Undo (5s). Undo reverts the flag.
- Stripe API failure → preserve UI state, surface the error inline, do NOT mark the link as created.
- Stripe verify failure → flag the row as "Verification pending — refresh in 30s" rather than silently leaving it unpaid.
- Cross-surface drift detection: if vendor.balancePaid and budget.actual disagree, surface a "Reconcile" CTA that explains which is authoritative (vendor record wins).

**Required QA assertions @ 5 viewports**
- Mark deposit/balance paid renders confirmation OR Undo toast
- Stripe link CTA disabled or labeled "Stripe not configured" when `isStripeConfigured()` returns false
- Stripe link CTA when configured: shows the trust block before creating
- After link create: success state lists "Charges processed: None"
- Undo within 5s reverts the flag
- Mobile budget row not horizontally clipped
- No banned hexes, no horizontal overflow, 0 page/console errors, no amber/red primary CTA, no muddy amber wash

**Review Board expected objections**
- Skeptical paying planner: "When I tap 'Mark balance paid', does the vendor see anything?" → No, but the trust block must say so.
- Systems analyst: "Vendor + budget can disagree. Who wins?" → Vendor wins. Surface a Reconcile CTA.
- Trust & safety: "Did Stripe charge anything?" → Never on create. Must be explicit.
- Tired planner at 11pm: "I tapped the wrong vendor's balance paid." → Undo toast for 5s.
- Caterer (vendor persona): "Did I get an email saying I was paid?" → No. Pay-status is internal-only until a follow-up message is drafted.

**Exact recommendation: REBUILD** — the Mark-paid actions need a review gate (Undo toast OR confirm dialog) and the cross-surface drift needs a Reconcile affordance. Stripe flow needs the trust block on create. **Shape: C — existing screen with confirmation gate**, NOT a full wizard. Wizards on payment actions would be excessive UI for a frequent action. A 5-second Undo toast is the right shape.

---

## 4. Shared workflow standard (locked from Add Vendor)

Every P0 rebuild must obey ALL of these. They are NOT negotiable for a 10+ claim.

1. **No SoT write before final review.** Step 1 and Step 2 are pure local state. The first write to the event/client/vendor/budget array is exactly at the Create/Save/Mark CTA on the final step.
2. **Every create/edit/mark flow needs a plain-language step header** ("Who is this vendor?" / "What should Event Boss track?" / "Review and create").
3. **Every workflow must say what will NOT happen** with the 4-line trust block:
   - Messages sent: None
   - Notifications sent: None
   - [Client / Vendor / Recipient] will not be contacted
   - [Record] is not created until final review
4. **Every success state itemizes what changed** — itemized list, not a generic "Saved" toast.
5. **Every flow has Cancel, Back, Review, Create/Send/Save, and a recovery affordance** (Undo for destructive-feeling actions; Confirm-discard for dirty forms).
6. **No amber/red primary CTA.** Steel-blue gradient only. Severity colors are for status badges and accent strips, never for action buttons.
7. **No banned colors:** `#1a6fba`, `#14b8a6`, `#f0bc44`, `#e08c38`. Use palette tokens.
8. **No screenshot bless.** Runtime QA assertions must pass before any 10+ claim.
9. **No 10+ claim unless every QA assertion passes at every viewport** (390/430/768/1024/1440).
10. **All entry CTAs and step controls carry stable `data-testid` hooks** for mobile-reachable harness verification. "Harness couldn't reach X" is not acceptable.
11. **No fake automation.** If the app can't actually do something (e.g., send when no provider), the CTA label must reflect that.

---

## 5. Shared QA harness contract

Every P0 QA harness has the same skeleton. We standardize so we don't repeat the same mistakes.

**Shape:** `/tmp/<workflow>-qa.py`. Sync Playwright. Runs each viewport in a fresh persistent context to isolate state.

**Required entry assertions:**
- `data-testid` for the entry CTA resolves at every viewport (mobile path runtime-detected, not hard-coded).
- Wizard root data-testid is present after entry CTA click.

**Required Step 1 assertions:**
- Primary inputs are addressable by `data-testid` (e.g., `acl-name`, `acl-email`).
- The 4-line trust block is detectable verbatim — each line must match.
- Continue/Next disabled until required fields valid.

**Required Step 2 assertions (where applicable):**
- Preview/checklist/playbook rendered.
- Editing count or selection updates an observable counter element.
- Back returns to Step 1 with all values preserved.

**Required Step 3 (Review) assertions:**
- Itemized review matches the source-of-truth values from Step 1 + Step 2.
- "Messages sent: None" and "Notifications sent: None" present.

**Required commit assertions:**
- Pre-Create record count of the target array.
- Click Create.
- Post-Create count = pre + 1 (or specifically: the wizard's intended write).
- No other arrays mutated beyond the intended writes.

**Required success-state assertions:**
- Success modal data-testid resolves.
- Itemized confirmation lines present.
- Action chips (Open / Add another / Done / Draft follow-up if applicable) all data-testid resolvable.

**Required color/SoT/error assertions (all viewports):**
- DOM scan for banned hexes (`#1a6fba`, `#14b8a6`) → 0 matches.
- Computed color scan on primary CTAs (`av-continue`, `av-create`, etc.) → 0 amber/red hits.
- `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal overflow).
- `page.on('pageerror')` and `page.on('console', m.type === 'error')` → 0 each.

**Required cancel/recovery assertions:**
- Cancel from each step → no record written.
- Discard-confirm appears when form is dirty.

**Captures saved to:** `review-artifacts/2026-06-06-wave1-p0/<workflow>/<viewport>_<step>.png` + `qa.json` summary.

---

## 6. Implementation order

Ranked by **risk reduction per hour**, not by visible polish.

1. **Budget / Payments first (largest SoT risk).** Add Undo toast to Mark-deposit-paid / Mark-balance-paid. Wire Stripe link CTA behind the trust block + `isStripeConfigured()` gate. Add Reconcile affordance for vendor/budget drift. Estimated session: 4–6 hours. **High value, high risk** — get the destructive paths gated before another P0 ships.
2. **Add Client (highest confusion per session).** Wrap NewClientModal in 3-step shell (single modal with review gate). Add 4-line trust block. Add data-testids. Spec-compliance success state. Estimated session: 3–4 hours. **Medium value, low risk.**
3. **Create Event (smallest delta to 10+).** Add 4-line trust block to Step 1. Itemize Step 2's kit checklist on Step 3 review. Add data-testids. Estimated session: 1.5–2 hours. **High value per hour.**
4. **Communication send/save (composer already 10+; needs inbox lane filters).** Add Needs-reply / Awaiting-them / Delivery-issue filter chips to inbox surface. Surface 6-state chip on every thread row. Mobile-collapse pattern. Estimated session: 3–4 hours. **Medium value, medium scope.**

**Why Budget first, not Create Event first:** Create Event is fastest to bless but lowest trust risk. Budget has the highest blast radius (financial source of truth). The right move under a No-Guesswork philosophy is to gate destructive paths before polishing creative ones.

---

## 7. Risks and source-of-truth warnings

| # | Risk | Workflow | Severity | Mitigation in plan |
|---|---|---|---|---|
| 1 | Mark deposit/balance paid is one-tap with no Undo | Budget/Payments | **HIGH** | Add 5s Undo toast (§3.4) |
| 2 | Vendor.balancePaid vs Budget.actual can disagree | Budget/Payments | **HIGH** | Reconcile CTA; vendor record is authoritative (§3.4) |
| 3 | Stripe create writes to client.feeSchedule with no trust block | Budget/Payments | MEDIUM | Add trust block to link-create CTA (§3.4) |
| 4 | "Create & Start Intake" label could imply outbound send | Add Client | MEDIUM | Rename + disclose (§3.1) |
| 5 | Add Client modal links to event without scope chip | Add Client | LOW | Add scope chip on event-link dropdown (§3.1) |
| 6 | Create Event writes 4 sub-arrays silently per kit | Create Event | LOW | Already disclosed via KITS.checklist; spec-compliance only (§3.2) |
| 7 | Comms inbox doesn't surface 6-state vocab as filter | Communication | LOW | Add lane filters (§3.3) |
| 8 | Composer "Send email" requires commLive AND emailEnabled — could mislead | Communication | LOW | Already honest via composerState; verify QA (§3.3) |
| 9 | Mobile entry CTAs missing data-testids | All four | LOW | Add testids on entry CTAs (§5) |
| 10 | Duplicate detection (same email/name) not present in any flow | Add Client, Create Event | MEDIUM | Add Step 3 duplicate warning with "Add anyway" affordance (§3.1, §3.2) |

**Cross-workflow SoT rule:** When two surfaces can write the same field (Budget/Vendor payment is the only documented case), the SECOND writer must show a Reconcile affordance referencing the authoritative source. No exceptions.

---

## 8. Final recommendation

**Build Budget / Payments first.**

Rationale:
- It has the largest source-of-truth blast radius (financial state).
- The current Mark-paid actions are one-tap with no recovery — this is the most fragile workflow in the app today.
- Stripe integration writes that look benign (link create) without a trust block could mislead a paying planner into thinking they charged a client.
- Cross-surface drift between Vendor.balancePaid and Budget.actual is a latent class of bugs we can resolve with the Reconcile CTA pattern.

Second: **Create Event** (highest value per hour). Third: **Add Client** (highest user confusion). Fourth: **Communication inbox lane filters** (highest UX gain but lowest trust risk).

Brutal observation: my prior P0 sequencing put Add Vendor first because "the workflow is the current failure". That was right. Now the next-largest failure isn't a creative workflow — it's a *destructive* one (Mark paid). Trust beats polish. Build Budget first.

---

## 9. Out of scope for this plan

- Notion writes (explicitly forbidden by directive).
- Visual polish on screens unrelated to the four P0s.
- Refactoring the legacy raw-hex callsites (covered by `docs/token-debt.md`).
- The deferred Add Vendor items (full 3-step wizard adopted; remaining: keyboard tab-order, desktop centered-modal vs right-drawer decision — both flagged in prior commit).
- The remaining 15 workflows from the 20-workflow audit (Wave 2+).

## 10. Verification

Before any P0 implementation begins:
- Confirm this plan addresses the user's spec line-by-line.
- Verify the implementation order ranking matches the user's risk model.
- Get explicit go-ahead on Budget-first vs Create-Event-first sequencing.
