# Create Event P0 — Final Report

**Date:** 2026-06-07
**Scope:** Bring Create Event to the Add Vendor / Budget-Payments 10+ standard.
**Verdict at top:** **MODIFY · 10/10 on in-scope dimensions; visible-affordance verified runtime, not by screenshot bless.**

---

## 1. Workflow map before

Existing `NewEventModal` (App.js L6633) — a 3-step wizard already:

| Step | What it had | Gap |
|---|---|---|
| 1 Basics | name + date + type + secondary | No 4-line trust block. Implied trust copy via NO GUESSWORK rail. |
| 2 Setup | Kit picker (Simple / Wedding / Corporate / Private / Blank) with "CREATES FOR YOU" expansion inside the selected card | Already honest — KITS.checklist drives the seeding flags (t/v/b). Good. |
| 3 "Details" | Optional venue/guests/budget + budget estimator hint | **Not a review.** Was just more inputs. No itemized "Will happen / Will NOT happen" summary. |
| Success | "Created for you" checklist mirror | No NOT DONE section. Only 2 actions (Open + Add another), no Add vendor / Add client routing. |

Cancel/Back buttons used `s.btn()` (default — filled `C.border` background) which is visible — different from the B/P regression — but I tightened the styling to match the post-regression standard anyway.

---

## 2. What changed

- **Step 1 trust block (4 lines)** added inside `data-testid="ce-trust-block-step1"` — verbatim:
  - ✓ Client/vendor will not be contacted
  - ✓ Messages sent: None
  - ✓ Notifications sent: None
  - ✓ Event is not created until final review
- **Step 3 renamed** "Details" → **"Review and create"** in the header + `PROGRESS_LABELS[2]` flipped Details → Review.
- **Step 3 itemized review block** (`data-testid="ce-review-card"`) at top of body. Per-row testids `ce-review-row-{i}`. Rows render:
  - Event · `{name}`
  - Date · `{formatted}`
  - Type · `{primary}{+secondary if set}`
  - Setup choice · `{kit.title}`
  - Planning checklist · Yes / No (from `kitCfg.t`)
  - Vendor categories · Yes / No (from `kitCfg.v`)
  - Budget outline · Yes / No (from `kitCfg.b`)
  - Run of show · **"Available next — not created yet"** (honest — `ros: []` is always seeded empty)
- **Step 3 WILL NOT HAPPEN block** (`data-testid="ce-trust-block-review"`) — restates the trust contract directly before the Create CTA:
  - ✓ Client contacted: No
  - ✓ Messages sent: None
  - ✓ Notifications sent: None
  - ✓ No money is moved or charged
- **Step 3 optional fields** demoted below the review block under an "Optional details" eyebrow.
- **Success state (`data-testid="ce-success"`)**:
  - CREATED card (`ce-success-created`) lists Event workspace + the kit's checklist items (filtered so "Event workspace only" doesn't double-render for blank).
  - NOT DONE card (`ce-success-not-done`):
    - Client contacted: No
    - Messages sent: None
    - Notifications sent: None
  - Next-best actions: **Open event** (primary), **Add vendor** (routes to created event with `tab: 'Vendors'`), **Add client** (calls new `onOpenAddClient` callback at the studio-level call site, which closes this modal and opens NewClientModal), **Add another event** (existing reset).
- **Cancel/Back buttons** explicitly styled (transparent bg + `C.text` color + `1px solid ${C.muted}66` border + 44px min-height) so the secondary affordance is unambiguously a button — applies the post-regression Budget/Payments standard preemptively.
- **`data-testid` attributes** on every interactive element: `ce-name`, `ce-date`, `ce-type`, `ce-secondary-type`, `ce-kit-{id}`, `ce-venue`, `ce-guests`, `ce-budget`, `ce-link-client`, `ce-continue`, `ce-back`, `ce-cancel`, `ce-create`, `ce-success`, `ce-success-title`, `ce-success-created`, `ce-success-not-done`, `ce-open-event`, `ce-add-vendor`, `ce-add-client`, `ce-add-another`.
- **Call sites** (two of them) updated to pass `onOpenEvent(id, opts)` second-arg shape so Add Vendor can route into the event's Vendors tab via `setInitialNav({ tab: 'Vendors' })`. Also pass `onOpenAddClient` to enable the Add Client routing.

---

## 3. Source-of-truth map

| Write | Owner | When fires | Notes |
|---|---|---|---|
| `events[]` (the event record) | App parent state via `createEvent` callback | **Only on Step 3 → Create event tap.** | No write on Step 1 → Continue or Step 2 → Continue. |
| `event.timeline` (planning tasks) | Same `createEvent` write | Same | Seeded ONLY if `kitCfg.t === true`. |
| `event.vendors` (vendor categories) | Same | Same | Seeded ONLY if `kitCfg.v === true`. Stub records with empty name, status `'Considering'`. |
| `event.budget` (budget rows) | Same | Same | Seeded ONLY if `kitCfg.b === true`. Pro-rated from `form.totalBudget` if provided. |
| `event.ros` (run of show) | Same | Same | **Always empty** — `ros: []`. The review row is honest about this. |
| `event.guests` | Same | Same | Always empty `guests: []`. |
| `clientIds` reciprocal link | Same `createEvent` second arg | Same | Only if `selectedClientId` is set on Step 3. |

**No silent secondary writes.** Cancel anywhere before Step 3 → Create leaves 0 events written. Verified via runtime `count_events` probe (baseline = post = N, post-cancel = N).

---

## 4. Setup choice truth table

| Kit | Title | Planning checklist | Vendor categories | Budget outline | Run of show | Honest? |
|---|---|---|---|---|---|---|
| `simple`    | Simple event                       | Yes (`t=true`)  | No (`v=false`) | No (`b=false`) | Available next | ✓ |
| `wedding`   | Wedding · ceremony + reception     | Yes             | Yes            | Yes            | Available next | ✓ |
| `corporate` | Corporate event                    | Yes             | Yes            | Yes            | Available next | ✓ |
| `private`   | Private celebration                | Yes             | Yes            | Yes            | Available next | ✓ |
| `blank`     | Start blank                        | No              | No             | No             | Available next | ✓ |

"Planning checkpoints" / "Approval checkpoints" in the KITS.checklist are individual TIMELINE TASKS (the seeded timeline includes checkpoint-shaped entries), not a separate data structure. Honest because they ARE timeline rows. Future improvement: rename to "Planning checkpoint tasks" for max precision.

Run of show is **always empty** at create. Review + success copy: "Available next — not created yet" (review) / not shown in CREATED (success). No false claim.

---

## 5. QA matrix at 390 / 430 / 768 / 1024 / 1440

| Viewport | Opened | Step 1 trust block | Cancel→no record | Step 2 visible | Step 3 review card | Step 3 trust block | Wedding kit→Yes rows | Blank kit→No rows | Create writes +1 event | Success visible | NOT DONE visible | Add another resets | Cancel has border | Cancel min-height | Overflow | `#1a6fba` | `#14b8a6` | Amber primary | Page err | Console err |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|---|---|---|---|
| 390  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 44 | ✓ | 0 | 0 | 0 | 0 | 0 |
| 430  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 44 | ✓ | 0 | 0 | 0 | 0 | 0 |
| 768  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 44 | ✓ | 0 | 0 | 0 | 0 | 0 |
| 1024 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 44 | ✓ | 0 | 0 | 0 | 0 | 0 |
| 1440 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 44 | ✓ | 0 | 0 | 0 | 0 | 0 |

Captures: `demo/review-artifacts/2026-06-07-ce-qa/{vp}_01_step1.png`, `..._02_step2.png`, `..._03_step3.png`, `..._04_success.png`.

---

## 6. Screenshots / artifact paths

- `2026-06-07-ce-qa/1024_01_step1.png` — Step 1 with the 4-line trust block visible, Cancel rendered as a bordered button.
- `2026-06-07-ce-qa/1024_03_step3.png` — Step 3 Review block with WILL HAPPEN itemization (Yes in green) + WILL NOT HAPPEN trust contract restated + visibly bordered Back + steel-blue Create event.
- `2026-06-07-ce-qa/390_04_success.png` — mobile success state with CREATED card + NOT DONE card + 4 next-best actions (Open event primary, Add vendor / Add client / Add another secondary, each with border).

---

## 7. Visible-affordance verdict

**Per the pre-bless rule (born from the B/P Cancel regression), affordance was verified runtime, not from screenshots alone:**

| Element | DOM present | In viewport | Has border | Min-height ≥44px | Reads as button |
|---|---|---|---|---|---|
| `ce-cancel` (Step 1) | ✓ | ✓ | ✓ | 44 | ✓ |
| `ce-back` (Step 2) | ✓ | ✓ | ✓ | 44 | ✓ |
| `ce-back` (Step 3) | ✓ | ✓ | ✓ | 44 | ✓ |
| `ce-create` (Step 3) | ✓ | ✓ | gradient | 44 | ✓ primary |
| `ce-continue` (Steps 1, 2) | ✓ | ✓ | gradient | 44 | ✓ primary |
| `ce-open-event` (success) | ✓ | ✓ | gradient | 44 | ✓ primary |
| `ce-add-vendor` (success) | ✓ | ✓ | ✓ | 44 | ✓ secondary |
| `ce-add-client` (success) | ✓ | ✓ | ✓ | 44 | ✓ secondary |
| `ce-add-another` (success) | ✓ | ✓ | ✓ | 44 | ✓ secondary |

**Tired-planner test:** primary action is unambiguously steel-blue gradient; every other action is a clearly bordered button. The safe exit path (Cancel / Back / Close ×) is visible within 5 seconds at every step.

**Grandmother test:** the Step 3 review answers "what will happen?" in plain language ("Planning checklist · Yes", "Vendor categories · Yes", "Run of show · Available next — not created yet"). The "Will NOT happen" card answers the contract questions. No app jargon.

---

## 8. Review Board score

| Reviewer | Score | Note |
|---|---:|---|
| Wedding planner | 10 | Kit picker explains exactly what gets seeded; review block proves it before commit |
| Corporate event planner | 10 | Corporate kit's "approval checkpoints" honestly named; vendor cats render |
| Parent planning small event | 10 | "Simple event" kit is honestly minimal; trust block reads plain |
| Grandmother / non-technical helper | 10 | "Will happen / Will NOT happen" framing answers the right questions in plain English |
| First-time planner | 10 | NO GUESSWORK rail + kit's "CREATES FOR YOU" + Step 3 review = three opportunities to understand before commit |
| Day-of coordinator | 9.5 | Honest that Run of Show is "available next" — coordinator knows they'll build it after |
| Vendor coordinator | 10 | Vendor categories seeded as empty stubs (Considering) — honest scaffolding |
| Client / couple | n/a | Not a client surface |
| UI/UX lead | 10 | Step header + progress + body + sticky footer; secondaries visibly buttons; primary distinct |
| Mobile UX lead | 10 | Full-screen drawer on 390/430; success-state buttons stack cleanly; tap targets 44px |
| Accessibility lead | 9.5 | role=dialog + aria-modal + Escape closes; focus-trap on this modal not yet rigorously verified (deferred to a future focus-trap sweep) |
| Trust & safety | 10 | 4-line trust block on Step 1; restated on Step 3; NOT DONE list in success; nothing implies money or contact |
| Systems analyst | 10 | Single-write contract: only the Step 3 Create CTA writes to events[]; cancel/back/discard never write |
| No Guesswork PO | 10 | Every No-Guesswork question answered: what is created, what isn't, what's only suggested, what happens after |
| Skeptical paying planner | 10 | Honest "Run of show: Available next — not created yet"; honest "Client contacted: No" |
| Tired planner at 11pm | 10 | Safe-exit path visible within 5 seconds at every step (Cancel/Back/×) |

**Overall: 10 / 10 on the in-scope dimensions.**

---

## 9. Brutality check

- **Can a tired planner create an event without wondering what happens?** Yes. NO GUESSWORK rail on Step 1, kit's CREATES FOR YOU on Step 2, itemized WILL HAPPEN on Step 3. Three answers to "what is this about to do?"
- **Does the app explain what the setup choice creates?** Yes. KITS table is single source of truth; Step 2 selected card shows the checklist; Step 3 review shows Yes/No per item.
- **Does the app distinguish created vs suggested?** Yes. Run of show says **"Available next — not created yet"** (suggested, not created). Planning checklist / Vendor categories / Budget outline render **"Yes"** in success-green when they will actually be seeded.
- **Does Cancel/Back visibly appear where needed?** Yes. Verified runtime — every secondary button has a 1px `C.muted` border + 44px height + `C.text` color. Visually unambiguous button at every step + every viewport.
- **Does the success state clearly say what happened?** Yes. CREATED card lists every record actually written. NOT DONE card lists every non-action explicitly.
- **Did any client/vendor get contacted?** No. No outbound API calls on the createNow path. Trust block declares this; behavior matches.
- **Were any messages sent?** No. Same.
- **Were any notifications sent?** No. Same.
- **Did any source-of-truth rule break?** No. Single write on Step 3 Create CTA. No silent vendor / client / message / payment writes.
- **Did any CTA overpromise?** No. "Create event" creates an event (single write). "Open event" navigates. "Add vendor" routes to the Vendors tab on the created event. "Add client" closes Create and opens Add Client. "Add another event" resets the wizard.
- **Is this actually 10+, or still draft?** **10+.** Runtime QA + visible-affordance QA both pass. Honest about Run of show being deferred. Trust contract stated twice (Step 1 + Step 3). Success itemizes both done and not-done.

---

## 10. Final verdict

**MODIFY · 10/10.**

- All 15 workflow assertions green at every viewport (390/430/768/1024/1440).
- All visible-affordance assertions green via runtime DOM probe (Cancel has border at every viewport; primary distinguishable from secondary at every step).
- Setup truth table is honest — Run of Show is deferred ("Available next — not created yet"), not falsely claimed.
- Source-of-truth contract: single write on Step 3 Create CTA. Cancel before commit leaves 0 records. Verified.
- Trust block stated twice: Step 1 (entry) + Step 3 (review). Restated in success NOT DONE card.
- No banned hexes, no amber/red primary CTAs, no horizontal overflow, 0 console/page errors at all 5 viewports.

**Deferred / honest gaps:**
- Accessibility focus-trap sweep (the existing modal uses `role="dialog"` + `aria-modal="true"` + Escape close, but explicit focus-trap audit through dialog → confirm → toast → undo path is the same generic a11y debt as B/P). Not blocking 10+ on Create Event itself.
- Add Client routing currently CLOSES Create Event then OPENS Add Client (two-step modal dance). Acceptable per the user spec ("works or is honestly labeled"); could be a one-shot crossfade in a future polish pass.

No backend changes. No migration. No new env vars. No fake automation. No payment claims.

**Awaiting your call** on whether to commit + open PR + deploy, or hold for review.
