# DM-PAYOFF-1 — Decision Memory visible payoff loop (2026-07-07)

## 1 · Executive verdict
The loop is now closed for the highest-value path with ~30 lines of runtime
code and zero new engines: **the app asks "Why this vendor?" at confirm time,
and the answer now comes back on the vendor's own detail header** — the user's
exact words, truncated at a word boundary, full text on hover, internal-only,
rendering nothing when no rationale exists. The read side reuses the existing
`event.decisionMemory[]` store and `latestRationaleForSubject`; the only new
code is one pure helper (`decisionPayoffSummary`) and one display block.

## 2 · Decision Payoff Matrix

| Decision type | Captured at | Stored | Displayed BEFORE | Displayed NOW | Changes clarity/action | Fix | Test |
|---|---|---|---|---|---|---|---|
| vendor_selection | status→Confirmed prompt ("Why this vendor?", App handleVendorPatch) + Mark-confirmed (2B-1) | event.decisionMemory[] | vendor LIST row one-liner (58C) + DecisionHistory (Event Details) | + **vendor DETAIL header "Why this vendor: …"** — where the host actually reads/acts on the vendor | yes — the reason is present at follow-up/pay/brief decisions | applied | decisionPayoff.test.js 1–4, 10 |
| budget_reallocation | swap/reallocation prompt (App 27701) | same | DecisionHistory only | unchanged | marginal — history is adjacent to budget review | **parked** (avoid rationale spam; revisit if budget trust feedback asks) | — |
| planner_override | task override prompt (App 39432) | same | DecisionHistory only | unchanged | marginal | **parked** (same reason) | — |

## 3 · Files inspected
lib/decisionMemory.js (all exports) · App.js capture sites (38239 vendor,
27701 budget, 39432 override) + DecisionHistory (41412) + OutcomeCapture ·
VendorPlanningWorkspace list-row rationale (58C) + detail header ·
lib/vendorBrief.js + backend vendor_brief.py (whitelists) · doItForMe.js
(no decision-note drafting exists — nothing to reuse, nothing built) ·
doctrine + both audits (all present).

## 4 · Files changed
- `src/lib/decisionMemory.js` — `decisionPayoffSummary(event, subjectId, max)`
  pure helper: exact-words prefix truncation, null when empty/absent.
- `src/plan/VendorPlanningWorkspace.jsx` — "Why this vendor:" line in the
  vendor detail header (memoryOn-gated, title-attr full text).
- `src/lib/__tests__/decisionPayoff.test.js` — 6 contract tests.

## 5 · Rationale capture paths found
Three (vendor/budget/override) — all non-blocking prompts, all already
shipped (Sprint 58C); Mark-confirmed (2B-1) routes into the vendor path.
The "Why this vendor?" prompt opens capture when no rationale exists —
no dead-end found; in-modal edit of past rationale does not exist and was
NOT added (parked; DecisionHistory shows the record).

## 6 · Payoff surfaces
Added: vendor detail header. Verified pre-existing: vendor list-row
"Rationale:" one-liner, DecisionHistory read surface, cross-event vendor
Memory line (58G, distinct feature). Deliberately NOT added anywhere else —
no spam, no new tab.

## 7 · Audience safety verified
`buildVendorBriefPayload` is whitelist-by-construction and contains no
decisionMemory field — now PINNED by test (serialized payload must not
contain the rationale text, "decisionMemory", or "rationale"). Guest copy
(draftGuestBrief + draftInvite) pinned rationale-free. Backend resolve
payload mirrors the frontend whitelist (unchanged, 97/97).

## 8–13 · Tests & runs
6 new tests (payoff present / null-when-absent / truncation / never-rewrites /
brief privacy / guest privacy). Targeted decisionMemory+vendorBrief+payoff:
60/60. Full frontend **1977/1977**. Backend **97/97**. Build clean.

## 14 · Preview verification
Live on preview (tablet + mobile): rationale written the way the confirm
prompt writes it → "Why this vendor: They did my brother's retirement at the
VFW and the post quartermaster already trusts…" renders in the detail header,
truncated with full text on hover; 316px wide on a 375px viewport (no
overflow); renders nothing without a rationale; zero console errors.
Disposable event cleaned.

## 15 · Production smoke
Deployed after suites; bundle hash verified (see commit). Read-only checks
only; protected brief links untouched.

## 16 · Parked
Budget/override payoff surfaces (rationale-spam risk, low action value) ·
in-modal rationale editing (no existing edit affordance) · any DIFM
"rationale → note" generator (audit found none existing; building one is
out of scope) · cross-event memory (already a separate 58G feature).

## 17 · Recommendation
**Accept.** Decision Memory's audit score should move on the next scorecard
pass: the CTA/state dimension gap (capture-without-payoff) is closed for the
vendor path, which is where the capture volume is. Next candidate from
DIFM-MAGIC-AUDIT-1: PLACE-DIFM-1.
