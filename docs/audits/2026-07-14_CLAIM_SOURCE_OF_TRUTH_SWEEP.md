# CLAIM-SSOT-SWEEP — every surface that turns a count into a claim

Date: 2026-07-14 · Mode: AUDIT (zero code changed) · Trigger: the vendor SSOT #1 fix (`867af98`) and the risk it exposed.

## 1. Executive verdict

The vendor over-claim fixed this morning was **not an isolated defect**. It is one instance of a systemic class, and **the two worst instances are materially more damaging than the one that was fixed.**

The class:

> **A predicate that establishes PRESENCE is used to license a claim of COMPLETION.**
> Its twin: **an empty collection is read as a finished one.**

`isVendorBooked` answers *"is this vendor secured for the day?"* It was used to license *"there is nothing left to do with this vendor."* Those are different questions. The same substitution recurs across money, guests, food, shopping and tasks.

The generalized lesson from POP-1.1 holds and is now evidenced four more times:

> **Consolidating a number does not consolidate the sentence built on it.**

Every finding below was traced to a line and verified against current code. Findings are ranked by host harm, not by domain.

---

## 2. The critical four

### C1 — `hostSpending()` has no vendor term at all. The host is told they have money they do not have.

- **Predicate:** `src/lib/hostSpending.js:131` — `committed = spent + foodRemaining + suppliesRemaining + capacityRemaining + crabRemaining`. **The string `vendor` does not occur anywhere in the file** (grep: 0 hits).
- **Claims it licenses:** `ALL SET` + *"You've got about $39,700 left."* (`App.js:42502`); V2 `SheetHero` eyebrow *"Left to spend"*, green (`HostShellV2.jsx:~8556`); *"$39,700 of headroom against the $40,000 plan"* (`HostShellV2.jsx:4909`); Budget tile *"$300 spoken for · $300 spent"* (`:3875`); CommandCenter **Budget · ON TRACK** green (`CommandCenter.jsx:456`, predicate `:411` — `billedActual = totalActual + _foodSpent`, no vendor term).
- **The app already knows how to do this.** `App.js:2241-2243` defines `vendorIsCommitted` / `vendorPaid` / `vendorBalance`, with a comment stating *"Every 'balance due / owed to vendors' figure in the app should route through these so the numbers always reconcile."* The **planner** budget views do (`App.js:28135`, `36935`, `37256`). **No host surface does.**
- **Failure scenario:** wedding seed (`App.js:4622-4670`), vendors xv1–xv7, ~$32,200 contracted, ~$18,400 in unpaid balances. Host sets `totalBudget: 40000`, enters one row (`actual: 300`). `hostSpending` → `committed = 300` → **"ALL SET — you've got about $39,700 left."** Real headroom ≈ **$7,800**.
- **Perverse detail:** `unpricedVendorCount` (`budgetCopy.js:20`) only flags vendors with **no** cost. A precisely-priced vendor contributes nothing to `committed` *and* suppresses the caveat. **The more carefully the host prices their vendors, the more invisible the money becomes.**
- **Severity: CRITICAL.** Misstates money by five figures on the exact screen where the host decides whether to spend more.

### C2 — The tasks that tell the host to pay are auto-checked-off because a vendor has a *name*.

- **Predicate:** `src/lib/taskEngine.js:51,56` — `if (/cater/.test(s)) return hasVendors || cateringSelfProvided(event);` and `if (/vendor|photograph|\bdj\b|florist|hire|book a /.test(s)) return hasVendors;` where `hasVendors = hasNamedVendor(event)`. **There is no payment, deposit, or balance guard anywhere in the file.**
- **Real seed tasks that this silently completes** (not hypotheticals):
  - `App.js:4689` — *"Confirm all vendors — check balance due status"* → matches `/vendor/` → **done**
  - `App.js:4684` — *"Negotiate vendor payment plans where possible"* → matches `/vendor/` → **done**
  - any *"Pay the caterer balance…"* → matches `/cater/` → **done**
  - any *"Sign venue contract and pay deposit"* → matches `/venue/` → **done**
- **Why it's worse than a green chip:** `effectiveDone` (`taskEngine.js:64`) is documented as *"the value every 'what's left' surface should use"*, and the host checklist is a **current-only projection that drops every `effectiveDone` row**. The task does not merely turn green — **it disappears.**
- **Severity: CRITICAL.** The app hides the bill.

### C3 — `guestCountResolved` cannot see the RSVP value the app itself writes.

- **Predicate:** `src/lib/playbooks/index.js:268-271` — a guest counts as pending only if `rsvp` is `'maybe'` or `''`. **`'Pending'` is not in the allow-list**, so it falls through to `{ resolved: true }`.
- **The value is real and the app writes it:** `src/lib/csvParsers.js` maps blank / `no response` / `awaiting` / `invited` → **`'Pending'`** in *every* platform's `rsvpMap` (lines 20, 36, 51, 66, 100, 123, 145). Legacy import writes it straight through (`App.js:31910`).
- **Claim chain:** `App.js:23445` → Guests area `state: 'done'` → green ✓ (`:23457`) → `allProgDone` (`:23459`) → the exhale card at **`App.js:24113`**: *"**You're all set for {event}. Everything that needs you is done — the rest is in motion.**"*
- **Failure scenario:** host imports an 80-row The Knot CSV. Nobody has replied. All 80 land as `rsvp: 'Pending'` → `pending: 0, resolved: true` → Guests goes green → the app congratulates the host. **Eighty people have never been asked.**
- **Note the two importers disagree:** V2 normalizes the poison away (`HostShellV2.jsx:2510` maps `'Pending'` → `''`); legacy does not.
- **Severity: CRITICAL.**

### C4 — A **persisted write** marks supply-shopping steps done using a food-only count.

- **Predicate:** `hostv2/src/HostShellV2.jsx:2615-2624` — when `foodPlan.boughtCount >= foodPlan.itemCount`, it writes `done: true` to **every** timeline task matching `/\b(buy|shop)\b|shopping/i`, and toasts *"…completed themselves — everything on the spread is bought."*
- **The counts are food-only:** `playbooks/index.js:2469` — `const isFood = (i) => i.group !== 'Supplies';` — used by both `boughtCount` (`:2503`) and `itemCount` (`:2550`). **Ice, charcoal, cups, plates and foil are excluded from both.**
- **Failure scenario:** crab feast. Crabs, corn and sausage ticked → `boughtCount === itemCount`. Supplies (ice, charcoal, paper goods) untouched. The step **"Buy ice, charcoal and paper goods"** matches `/buy/` → is **written `done: true` to the event** and disappears. The host never buys ice.
- **Aggravating:** the same file's *display* predicate `isTimelineStepResolved` (`HostShellV2.jsx:947-953`) is **stricter** — it requires `active.every(...)` over all non-skipped items **including Supplies**, and explicitly returns `false` on an empty list. **The looser predicate is the one that persists.** Two predicates for one concept; the wrong one writes.
- **Severity: CRITICAL.** It is a write, not a render. It is silent, and it is irreversible from the host's point of view.

---

## 3. The structural twin — empty reads as complete

UX_08 already bans this: **"Zero is a value, null is missing."** Five confirmed violations:

| # | Claim the host sees | Predicate | Why it fires on nothing |
|---|---|---|---|
| E1 | *"Shopping — all in hand · Everything's bought or in hand."* (`dayBefore.js:123`, `HostShellV2.jsx:4144`) | `stillToGet = unboughtFood + unboughtSupplies` (`dayBefore.js:75`) | `playbookFoodPlan` returns **null** for any event type with no playbook (`playbooks/index.js:1964`) → counters stay 0 |
| E2 | *"Plan steps — nothing open. **Stop worrying about the plan.**"* (`dayBefore.js:111`) | `openTasks = timeline.filter(!effectiveDone)` (`dayBefore.js:44`) | **no `timeline.length` guard** → an event whose checklist was never generated is "calm" |
| E3 | *"Wrap-up · **All wrapped up**"* at a **full progress bar** (`phaseProgress.js:210-211`) | `progress: total ? done / total : 1` | `total === 0` → literally `1` (100%). Backyard cookout, no vendors, no roster, no rentals → "all wrapped up". Thank-yous never sent. |
| E4 | *"N of N · areas handled and the checklist is clear — **ready for the day**"* (`HostShellV2.jsx:3817`) | `essDone === essTotal && openTasks === 0` (`:3793`) | no-playbook event → food + shopping essentials never enter the denominator → *"3 of 3 · ready for the day"* on an event with only a date, city and headcount |
| E5 | *"**You're ready. Nothing left that matters — rest up.**"* (`dayBefore.js:201`) | `openCount = Σ section.open` (`:182`) | the **guests row is a hard-coded `open: 0`** (`dayBefore.js:174-179`). Telling the guests can never block "you're ready." |

**E2 is currently locked in by a test I wrote.** `src/lib/__tests__/dayBefore.test.js:32-35` asserts that an event with **no timeline** produces `calm.detail` matching `/Stop worrying/`. The test encodes the bug. It must change with the fix — exactly the mistake POP-1.1 §5 warned about ("the old pin encoded the bug").

---

## 4. Inference laundering itself into "done"

`taskEngine.js`'s `taskSatisfied` is a **regex heuristic**, and `effectiveDone` promotes it to fact. Beyond C2's money case:

| line | rule | over-claim |
|---|---|---|
| `taskEngine.js:36,53` | `hasGuests = guestCount \|\| guestEstimate \|\| guests.length > 0` satisfies `/invite\|rsvp\|guest\|head\s?count/` | Host typed `guestEstimate: 40`. **"Send the invitations"** and **"Chase the RSVPs"** both read as done. Nothing was sent. |
| `taskEngine.js:39,56` | `hasVendors = any named vendor` satisfies `/vendor\|photograph\|\bdj\b\|florist/` | Host added a caterer. **"Book the DJ"** reads as done. There is no DJ. |
| `taskEngine.js:40,57` | `hasFood = Object.keys(foodChoices).length > 0` satisfies `/menu\|food plan\|plan the food/` | Host set `sourcing: 'potluck'`. **"Plan the menu"** reads as done. There is no menu. |

Any of these being the last open rows produces E2's *"Stop worrying about the plan."*

The checklist hero compounds it: `HostShellV2.jsx:7122-7133` prints **"15 of 15 · Every step is handled"** in green when `openN === 0` — and the honest disclosure (*"N already handled by your plan — tap to confirm"*, `:7131`) lives **only in the `openN > 0` branch**. The one case where the entire claim rests on inference is the one case where the host is never told.

---

## 5. Aggregators — where my own SSOT #1 fix is still incomplete

The vendor fix corrected the six surfaces that **speak** the claim. It missed the two that **aggregate** it into a green state:

- **`CommandCenter.jsx:1481`** — `deriveRecommendationLifecycle` maps a workstream with `status === 'ready'` → **`Completed`**. But `statusFor()` (`workstreams.js:102`) sets `ready` when `booked === total` — the *booked* predicate. So an all-Deposit-Paid workstream counts as "handled", and since nothing is `Blocked`, the V2 hero prints **"N handled · all clear"** (`HostShellV2.jsx:3986`) with confirms outstanding. **Seventh surface.**
- **`positiveAttention.js:63`** — lists the vendor axis under **"You're Set On ✓"** (a green `p-ok` pill, `HostShellV2.jsx:3993`) whenever `r.vendor.status === 'ON_TRACK'` — which, post-fix, still fires with `toConfirm > 0`. It renders a green pill reading *"Vendors — all booked · 2 to confirm."* The note is honest; **the frame is not.** Its own comment ("every vendor confirmed AND contracts signed") is now factually stale.

Also: **`getEventReadiness`'s decision axis** (`CommandCenter.jsx:936`) prints *"No open decisions"* but derives it purely from **overdue timeline tasks** — it never calls `playbookDecisionBoard`, the actual open-decisions engine. Open-but-not-yet-overdue decisions read as none.

---

## 6. V2 parity gap — city autocomplete

`src/lib/usCitiesFull.js` exists explicitly for *"key-less city autocomplete"* (~29,738 entries, lazy-loaded). It is imported by **legacy** (`App.js:17187`, `plan/ClientIntakeFlow.jsx:213`) and by **hostv2: nowhere**.

V2's **Venue** field has autocomplete (Google Places → OSM fallback, `HostShellV2.jsx:4223`). V2's **City** field beside it (`:4246`, `:4564`) is a bare `onChange={e => setCityDraft(e.target.value)}` — no suggestions. The one field that **gates weather and maps**, and that the app *blocks* on, is the one with no help typing it. Free-text is its only input path, which plausibly feeds the `CITY-LEAK-1` class of bad city values.

---

## 7. The models to copy (do not "fix" these)

Negative results matter. These predicates ask the right question and should be the templates:

- **`attendanceBand()`** (`playbooks/index.js:293-326`) — four-state RSVP vocabulary whose `else` branch catches `'Pending'` and every unknown value as pending. Produces *"N confirmed · M replies still out"*. **It never says "everyone."** Every guest claim should be licensed by `band.maybe + band.pending === 0`.
- **`phaseProgress.js:189-191`** — the post-event `payments` item is genuinely vendor-aware (`handled: !unpaid`, checking `cost > 0 && balancePaid !== true`). **The one money predicate in the codebase that asks the right question.**
- **`isTimelineStepResolved`** (`HostShellV2.jsx:947`) — refuses the empty-list shortcut (`if (!active.length) return false`).
- **`HostShellV2.jsx:7645`** — `!gActive.length ? 'all skipped' : gDone ? 'all N bought' : …` — **distinguishes empty from complete.**
- **`App.js:29584`** — EditorialCover whisper: `done: yes >= band.invited` — explicitly refuses green until everyone invited has confirmed.
- **`dayBefore.js` helpers row** (`:157-173`) — suppressed when there are no helpers; status vocabulary matches the claim.

---

## 8. The rule to adopt

Two sentences, mechanically checkable:

1. **A presence predicate may never license a completion claim.** If a claim says *all / everyone / nothing left / handled / set / locked in / covered*, the predicate behind it must answer *"is there anything left for the host to do?"* — not *"does this thing exist?"*
2. **Zero may never read as done.** Every completeness claim needs a `total > 0` guard and a distinct "nothing planned yet" branch.

A grep-able convention would catch regressions cheaply: any surface printing an absolute claim must name the predicate licensing it in a comment, as the vendor surfaces now do.

---

## 9. Recommended fix order

| # | Fix | Why first |
|---|---|---|
| 1 | **C4** — gate the persisted write on the same predicate `isTimelineStepResolved` already uses | It's a *write*. Every day it runs, more events carry false `done: true` in storage. Stop the bleeding first. |
| 2 | **C2** — add a payment-verb guard ahead of the `/cater/` and `/vendor/` branches in `taskSatisfied` | Hides bills. One-file fix. |
| 3 | **C3** — add `'pending'` to the `guestCountResolved` allow-list (`playbooks/index.js:270`) | One-token fix that kills the whole "you're all set" chain for imported rosters. |
| 4 | **C1** — give `hostSpending()` a vendor term via the existing `vendorBalance`/`vendorPaid` helpers (needs extracting to a lib to avoid a cycle) | Corrects C1's five claims at once, since they all read through it. Largest blast radius, so it lands after the cheap kills. |
| 5 | **E1–E5** — `total > 0` guards + a "nothing planned yet" copy branch; **update `dayBefore.test.js` in the same commit** (it currently pins E2) | Systemic but mechanical. |
| 6 | **§5 aggregators** — finish SSOT #1: `positiveAttention` must require `toConfirm === 0`; lifecycle `Completed` must use `isVendorConfirmed` | Closes the fix I already shipped. |
| 7 | **§6** — port `usCitiesFull` autocomplete to V2's city field | Parity, small, no API key needed. |

No code was changed by this audit.
