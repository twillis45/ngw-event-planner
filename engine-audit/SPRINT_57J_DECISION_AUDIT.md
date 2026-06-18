# Sprint 57J — Decision Point Audit (readiness + confidence inventory)

*Audit only. No build, no engine change. Grounds the Decision Confidence reader: for each decision, can we tell — from data that already exists — whether the user has enough to lock it? Every claim traced to runtime. Date: 2026-06-18.*

## How to read this
A **Decision Confidence reader** would output, per decision, one of: `blocked` (a prereq isn't met) · `gathering` (still collecting) · `ready` ("you have enough — lock it") · `done`. The question is whether each state is **observable from existing event fields** (presentation-only) or needs **new persisted state** (out of scope — that's data/engine work).

Legend: **READY** = readiness + confidence both computable today from existing fields/predicates · **PARTIAL** = readiness computable, but the "locked/final" state isn't persisted · **MISSING** = key signal absent from the data model.

---

## 1 · Guest Count — **READY** ✅ (the strongest case; a live predicate already exists)
1. **Data exists:** `event.guestCount`, `event.guestEstimate`, `event.guests[].rsvp` ('Yes'/'No'/'Maybe'/''), `event.catererCount`.
2. **Readiness signals:** `guestCountResolved(event)` (`playbooks/index.js:119`) → `{resolved:true}` when a count exists **and** no pending RSVPs. `yesGuestsCount`, RSVP %.
3. **Uncertainty signals:** pending RSVPs (`maybe`/blank) → `{resolved:false, pending, reason:'pending-rsvps'}`; estimate-only (no list); **caterer drift** `event.catererCount !== yesGuestsCount` (`CommandCenter.jsx:276`).
4. **Readiness computable today?** **Yes** — `guestCountResolved` is exactly this.
5. **Confidence computable today?** **Yes** — it returns `{resolved, pending, reason}` already; the live caterer-drift banner is a working proof.
6. **Missing:** only an explicit "locked" timestamp would harden the word "final" — not required for a reader.

## 2 · Venue Selection — **PARTIAL** ⚠️
1. **Data exists:** `event.venue` (string), a `Venue`-category vendor (`eventSolve.mjs:751,759` `!!event.venue || booked('Venue')`).
2. **Readiness signals:** venue string set **or** a Venue vendor `Confirmed`/`Booked`.
3. **Uncertainty signals:** venue empty **and** no Venue vendor; or named but the Venue vendor's `contractSigned` is false.
4. **Readiness computable today?** **Yes** (binary present/absent).
5. **Confidence computable today?** **Partial** — "a venue is named" is computable; "**this is the final, contracted venue**" is not cleanly observable (`event.venue` can be a placeholder; there is no `event.venueLocked`).
6. **Missing:** a distinct **venue-locked / contract-signed** signal beyond the free-text string.

## 3 · Budget Approval — **READY (approval) / MISSING (adequacy)** ⚠️
1. **Data exists:** `event.budgetApproved` (boolean **gate**, `eventSolve.mjs:770`), `event.budget[]` (`budgeted`/`actual`), `totalBudgeted` (`CommandCenter.jsx:315`).
2. **Readiness signals:** `budgetApproved === true`; separately `totalBudgeted > 0` = "a budget exists."
3. **Uncertainty signals:** budget exists but not approved; `totalBudgeted === 0` (none set).
4. **Readiness computable today?** **Yes** — `!!event.budgetApproved` + `totalBudgeted`.
5. **Confidence computable today?** **Yes for the *approval gate*** (clean boolean; "exists" vs "approved" already modeled). **No for *adequacy*** — whether the budget is *enough* is the banned adequacy claim (Pattern 014 / AP-005).
6. **Missing:** budget **adequacy** (is it realistic for the type/guests/market?) — not modeled; do not infer.

## 4 · Vendor Selection — **READY** ✅
1. **Data exists:** `event.vendors[]` (`status`: Confirmed/Booked/Considering…, `category`, `contractSigned`), `proposedVendorCategories(type)` (`vendorCategoriesByType.js:88`).
2. **Readiness signals:** all needed categories addressed; `confirmedVendors === vendors.length` **and** `confirmedNoContract === 0` (`getEventReadiness().vendor`, `CommandCenter.jsx:773,787`).
3. **Uncertainty signals:** unconfirmed vendors; confirmed-but-no-contract; missing categories (proposed − booked).
4. **Readiness computable today?** **Yes** — `getEventReadiness().vendor`.
5. **Confidence computable today?** **Yes** — per-category gap + contract state both computable.
6. **Missing:** vendor **fit/quality** ("is this the *right* vendor / quote-fit") — only booking state is modeled, not suitability.

## 5 · Menu Finalization — **PARTIAL** ⚠️ (prereqs observable; the lock isn't)
1. **Data exists:** `dietaryResolved(event)` (`guests[].needs`, `guests[].meal`; `playbooks/index.js:134`); playbook `format` + `menu` decisions (`menu` `dependsOn:['format','dietary']`, dinnerParty).
2. **Readiness signals:** dietary collected **and** format chosen **and** guest count resolved (`menu` blocks on these).
3. **Uncertainty signals:** dietary not collected (the **safety gate** — "lock the menu only after allergies are in", `playbooks/index.js:285`); format undecided; count unresolved.
4. **Readiness computable today?** **Partial** — `dietaryResolved` + `guestCountResolved` are computable; **`format` chosen and `menu` finalized have no event field** (they live in the playbook decision graph, not on the event).
5. **Confidence computable today?** **Partial** — the *prerequisites* are computable; the *menu-locked* state is not persisted.
6. **Missing:** persisted **`format` choice** and **menu-finalized** flags on the event.

## 6 · Seating Lock — **READY** ✅
1. **Data exists:** `event.guests[].table`; `confirmed = rsvp 'Yes'` (`App.js:1539` `unseated = confirmed.filter(g => !g.table)`).
2. **Readiness signals:** every confirmed guest has a `table` (`unseated === 0`).
3. **Uncertainty signals:** `unseated > 0`; **prereq** — guest count not yet resolved (seating depends on the final count; playbook `seating` `dependsOn:['format']`).
4. **Readiness computable today?** **Yes** — `confirmed.every(g => g.table)`.
5. **Confidence computable today?** **Yes** — unseated count + the guest-count prereq are both observable.
6. **Missing:** nothing material (it correctly chains off Guest Count).

## 7 · Timeline Lock — **READY (as readiness, not a discrete "lock")** ✅
1. **Data exists:** `event.timeline[]` (`task.done`, `task.week`, `isTaskOverdue` `CommandCenter.jsx:119`).
2. **Readiness signals:** `getEventReadiness().timeline` `ON_TRACK` (≥80% done, 0 overdue).
3. **Uncertainty signals:** overdue tasks; low % complete.
4. **Readiness computable today?** **Yes** — `getEventReadiness().timeline`.
5. **Confidence computable today?** **Yes** — % done + overdue count.
6. **Missing:** "timeline" is **continuous progress, not a lock-point** — the "ready to lock" framing fits it least; present it as momentum/readiness, not a gate.

## 8 · Staffing Decisions — **READY (when staffed) / N-A (host)** ✅
1. **Data exists:** `event.crew[]` (`status`: confirmed/needs_confirmation/assigned; `summarizeCrew` `studioTeam.js`); playbook `help` decision (`blocks:['vendors']`).
2. **Readiness signals:** `summarizeCrew` `severity:'none'` (`confirmed === crew.length`).
3. **Uncertainty signals:** `needsConfirmation > 0` (attention); assigned-not-confirmed (watch); **no crew at all** ⇒ staffing is **N/A** (host events have none).
4. **Readiness computable today?** **Yes** — `summarizeCrew` severity.
5. **Confidence computable today?** **Yes** — confirmed/needs/assigned counts.
6. **Missing:** a **required-roles-vs-filled** model (the crew list is flat — no role-gap), and a signal for *whether staffing is needed at all* (host ⇒ skip the decision entirely).

---

## Classification matrix
| Decision | Readiness today | Confidence today | Verdict | Blocker (if any) |
|---|---|---|---|---|
| **Guest Count** | ✅ `guestCountResolved` | ✅ `{resolved,pending,reason}` | **READY** | — (live banner already proves it) |
| **Seating** | ✅ `every(g.table)` | ✅ + count prereq | **READY** | — |
| **Vendor Selection** | ✅ `getEventReadiness.vendor` | ✅ category gap + contract | **READY** | fit/quality not modeled (don't infer) |
| **Timeline** | ✅ `getEventReadiness.timeline` | ✅ %+overdue | **READY** | it's readiness, not a "lock" |
| **Staffing** | ✅ `summarizeCrew` | ✅ counts | **READY** | N/A for host; no role-gap model |
| **Budget Approval** | ✅ `budgetApproved` gate | ◑ gate yes / adequacy no | **PARTIAL** | adequacy unmodeled (AP-005) |
| **Venue** | ✅ present/absent | ◑ named yes / locked no | **PARTIAL** | no `venueLocked`/contract signal |
| **Menu** | ◑ prereqs yes | ◑ prereqs yes / lock no | **PARTIAL** | no persisted `format`/`menu-final` field |

## The structural finding
- **The dependency graph already exists** — playbook `decisions[]` carry `dependsOn`/`blocks`/`when` (e.g. `menu dependsOn ['format','dietary']`, `format blocks ['menu','rentals','seating']`, dinnerParty). It is **authored, not persisted on the event** — so cross-decision prereq state must be **re-derived from observable fields** (guest count, dietary, table assignments, vendor status). Where a decision's state has **no observable field** (`format`, `menu-final`, `venue-locked`), confidence is **PARTIAL** and must say "still gathering," never fabricate "ready."
- **5 of 8 are fully buildable today** as a presentation-only reader (Guest Count, Seating, Vendor, Timeline, Staffing) — all readiness + confidence predicates already exist. **Guest Count is the flagship** (the caterer-drift banner is a working instance).
- **3 are gated by missing persisted state** (Budget *adequacy*, Venue *lock*, Menu *finalization*) — these are **data-model gaps, not presentation gaps**; a reader must degrade honestly to "gathering."

## Recommendation for Sprint 57J (the build that follows this audit)
- **EXECUTE — scoped reader** over the **READY** set, **Guest Count first** (wrap `guestCountResolved` → "You have enough — lock the guest count" vs "Still gathering — waiting on N RSVPs"), then Seating / Vendor / Timeline / Staffing. Pure presentation; route every read through the existing resolvers (`guestCountResolved`, `getEventReadiness`, `summarizeCrew`) — never raw fields (the field-name-drift risk from 57F/57G).
- **DEFER — the PARTIAL set.** For Venue / Budget-adequacy / Menu, the reader shows the **prerequisite** state honestly ("waiting on dietary", "no budget approved") but must **not** claim "ready to lock" — they need new persisted fields (`venueLocked`, `format`, `menuFinal`) which are a future *data* sprint, not this one.
- **AP-005 / Pattern 014 hold:** never assert adequacy/safety as "ready." Menu specifically gates on dietary (a safety prereq) — keep that gate.

*Confidence: High — every signal traced to runtime (`guestCountResolved`/`dietaryResolved`/`purchaseGate` playbooks/index.js:119–155, `getEventReadiness` CommandCenter.jsx:754, `summarizeCrew` studioTeam.js, `event.budgetApproved`/`event.venue` eventSolve.mjs:751–770, seating `g.table` App.js:1539, playbook decision graph dinnerParty.js). Weakest assumption: that `format`/`menu`/`venue-lock` truly have no persisted field — confirmed by grep; if a future migration adds them, those three move from PARTIAL to READY.*
