# PAY-COPY-1 — Payment/deposit reminder copy (2026-07-07)

## 1 · Executive verdict
**Decision gate: BUILD — the vendor money model is explicit enough.** The
vendor record carries first-class, host-entered fields that distinguish every
state this copy needs: `cost` · `depositAmt` · `depositPaid` (bool) ·
`balancePaid` (bool) · `payDueDate` / `depositDueDate` · `contractSigned` ·
`status` — and BUD-1 already established the actuals-vs-estimates discipline.
A thin helper shipped with a hard booked-gate: **estimates and
considering/quoted vendors can never produce owed language** — they get the
confirm-the-details ask. Amount-bearing copy is always framed as a question
("Our notes show … can you confirm this is still correct"), never a status
claim, and the words paid/unpaid/overdue are test-banned.

## 2 · Payment Copy Safety Matrix

| Field | Explicit? | Vendor-specific? | Distinguishes states? | Trusted for copy? | Used |
|---|---|---|---|---|---|
| vendor.depositAmt + depositPaid | yes (host-entered + bool) | yes | deposit vs paid | yes, gated on booked | amount line (deposit pending) |
| vendor.cost + balancePaid | yes | yes | total vs balance-settled | yes, gated on booked + depositPaid | remaining balance = cost − deposit (arithmetic on two explicit fields) |
| vendor.payDueDate / depositDueDate | yes | yes | real due date | yes | "due by {date}" only when present |
| vendor.contractSigned / status | yes | yes | booked vs estimate tier | yes | THE GATE: no owed language without it |
| playbook/food $ estimates, budget rows, totalBudget | inferred/estimate | no | no | **NO** | never read by the helper |
| hostSpending committed | derived | no | mixes estimates | **NO** | never read |
| decision rationale / guest / planner notes | private | — | — | **NO** | never read (leak-pinned) |

## 3 · Files inspected
Vendor model fields across seeds/cockpit · hostSpending + budgetCopy (BUD-1
rules) · PaymentFlow (the cockpit's payment step: explicit target
deposit/balance + two-step mark-paid) · vendorBrief whitelist · doItForMe ·
all seven required doctrine/audit docs (TRUST_CONTRACT_1 absent — noted).

## 4 · Decision gate result
BUILD. All five gate questions answered yes: vendor name ✓ · explicit
payment fields ✓ · explicit amount or explicit absence ✓ · explicit due date
or explicit absence ✓ · reminder-ask framing (never status claim) ✓.

## 6 · Files changed
- `src/lib/doItForMe.js` — `draftVendorPaymentReminder(event, vendor)`.
- `src/plan/VendorPlanningWorkspace.jsx` — "Draft payment note" in
  PaymentFlow (the payment step the host is already in): local editable
  textarea + explicit Copy/Discard, BRIEF-ASSIST pattern.
- `src/lib/__tests__/payCopy.test.js` — 7 contract tests.

## 7 · Helper behavior
Booked + deposit pending → "Our notes show a deposit of $X [due by {date}]."
Booked + deposit paid + balance open → "…a remaining balance of $Y…" (cost −
deposit, both explicit). Anything else — estimate-only, unbooked, missing
fields — the four-bullet confirm ask (deposit/balance due · due date ·
preferred method · invoice on file). Closer is always the confirm question.
Event name degrades to "our event" (PaymentFlow doesn't hold the event
object — documented, graceful).

## 8 · UI behavior
Button inside the payment step only (the host is already acting on payment);
draft opens focused, editable, explicit Copy note / Discard, honest "the app
never sends for you" footer; button hides while a draft exists — overwrite
impossible. Mark-paid flow untouched.

## 9 · Data used / 10 · Never invented
Used: name, status/contractSigned, depositAmt/depositPaid, cost/balancePaid,
payDueDate/depositDueDate, event name when available. Never: overdue, paid/
unpaid claims, estimate-derived amounts, budget totals, other vendors, guest
names, rationale, collections/legal tone (all regex-banned in tests).

## 11–12 · Privacy + public brief
Helper reads only the named vendor's explicit money fields. Public brief
payload pinned free of the draft ("confirming payment details" / "Our notes
show"). Money fields were already excluded from the brief whitelist by
construction — unchanged.

## 13 · State
No "reminder sent" state exists → none faked; the draft is local to the
payment step and discards cleanly. Log-save parked (explicit-save affordance
needed).

## 14–18 · Tests & runs
7 new tests (missing-fields ask · explicit deposit + due date · explicit
remaining balance · estimate/unbooked refusal · banned-words sweep incl. a
past due date that still may not say overdue · budget/other-vendor/guest
leak ban · public-payload pin). Targeted money+difm+privacy: 110/110.
**Frontend 2003/2003 · backend 97/97 · build clean.**

## 19–20 · Preview
Desktop: contracted caterer, explicit $500 deposit, due in 3 days → draft
read exactly "Our notes show a deposit of $500 due by Friday, July 10. Can
you confirm this is still correct…" — focused, editable. Mobile: same flow
via Send deposit step, textarea 255px on 375px viewport, no overflow. Zero
console errors both; disposable event cleaned.

## 21 · Production smoke
Deployed after suites; bundle verified read-only (see commit). Protected
brief links untouched; no real data mutated.

## 22 · Parked
Log-save of the note · "overdue" phrasing forever (a due date in the past
still produces "due by {date}", never pressure) · surfacing outside the
payment step · any invoicing/Stripe/collections anything.

## 23 · Recommendation
**Accept.** The audit-first framing was warranted and the model passed it.
This completes the DIFM-MAGIC-AUDIT-1 execute list; the next highest-leverage
item on the board is the real-vendor Brief trial (packet ready).
