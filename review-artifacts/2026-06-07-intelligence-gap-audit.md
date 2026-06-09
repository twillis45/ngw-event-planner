# Intelligence Gap Audit — Where Earlier Choices Don't Flow Into Later Defaults

**Date:** 2026-06-07
**Scope:** Read-only audit. No code changes. No commit. Awaiting your direction on which (if any) to implement.

The trigger case (yours):
> "If I choose Birthday in Step 1, Step 2 should not default to Wedding."

The principle:
> An earlier choice should propagate into the next screen's defaults, copy, and options whenever there's an obvious causal relationship. When it doesn't, the system feels like an inert form instead of an intelligence layer.

---

## Severity legend

| Level | Meaning |
|---|---|
| **P0** | The next screen actively contradicts the user's prior choice. Looks broken/dumb. |
| **P1** | Default is unhelpful for the chosen type; user has to override almost every time. |
| **P2** | Field renders for a type that can never have it (e.g., birthday for a Corporate client). |
| **P3** | Downstream options/copy could be richer; not wrong, just generic. |

---

## 1. NewEventModal Step 2 — kit pre-selection ignores Step 1 type · **P0** · The bug you named

**Location:** `App.js:6794` (`const [kit, setKit] = useState('wedding');`) and `App.js:6793` (`type: 'Wedding'` default).

**Behavior:** Step 2 highlights "Wedding · ceremony + reception" no matter what was picked in Step 1.

**Why this is P0:** Step 2's heading literally claims "*Event Boss chooses the setup structure next — timeline, vendor categories, budget, checkpoints — based on the event type you picked*" (`App.js:7006`). The picker then ignores the type and defaults to wedding. The system is openly contradicting itself.

**Why it's not "just a default":** The whole No-Guesswork philosophy is that NGW makes the obvious call so the planner doesn't. If a planner picks Birthday → Wedding kit, NGW is making the obvious call **wrong**.

**Proposed mapping (illustrative — for your approval):**

| Step 1 `form.type` | Step 2 `kit` default |
|---|---|
| Wedding | `wedding` |
| Vow Renewal / Engagement / Bridal Shower | `wedding` |
| Corporate / Board Meeting / Conference / Summit / Offsite / Holiday Party | `corporate` |
| Birthday / Anniversary / Quinceañera / Sweet 16 / Graduation / Baby Shower / Retirement | `private` |
| Gala / Fundraiser / Nonprofit Event | `corporate` (or its own `nonprofit` if we add one) |
| Other / Blank / unknown | `simple` |

The planner can still tap into another kit — but the default reflects their Step 1 answer.

**Honesty footnote:** the planner-facing copy at line 7006 should also weaken from a promise ("chooses … based on … the event type") to a reflection ("you picked X, so we're suggesting Y") so the wording matches behavior.

---

## 2. NewEventModal — Step 2 description over-promises · **P0** · paired with #1

**Location:** `App.js:7006`.

Copy currently says: *"Event Boss chooses the setup structure next — timeline, vendor categories, budget, checkpoints — based on the event type you picked."*

Until #1 ships, this is a false claim. Either fix #1, or temporarily weaken the copy to "*Pick a setup kit. Each one seeds a different starting structure.*" (Not recommended — fix the underlying behavior.)

---

## 3. NewEventModal — `secondaryType` has no anticipation · **P1**

**Location:** `App.js:6793` (defaults to `''`).

When a planner picks Wedding, the **vast** majority of events are Wedding + Reception. Same for Corporate + Conference. The dropdown sits empty.

**Proposed (for approval):** suggest the most common pairing per primary type. Pre-select, don't lock. Planner can clear it.

| Primary | Suggested secondary |
|---|---|
| Wedding | Reception |
| Corporate | Conference (or none if Board Meeting / Offsite chosen) |
| Birthday | (none — single-purpose) |
| Gala / Fundraiser | Auction (when present) |
| Holiday Party | (none) |

---

## 4. NewEventModal — `timeOfDay` always defaults to "afternoon" · **P1**

**Location:** `App.js:6793` (`timeOfDay: 'afternoon'`).

Sample events show the system actually knows what's typical:
- Wedding samples → `evening` (lines 3077, 3140, 3376)
- Anniversary samples → `late` (line 3202)
- Corporate samples → `morning` / `afternoon` depending
- Baby Shower → `afternoon`

The Create Event modal ignores all of this and starts at "afternoon" for every type.

**Proposed:** time-of-day default derived from event type (Wedding → evening; Anniversary → evening; Brunch / Baby Shower → morning; Corporate Board Meeting → morning; Conference → all-day or morning; etc.). Planner can override.

---

## 5. NewEventModal — Step 1 primary type defaults to Wedding regardless of planner specialty · **P1**

**Location:** `App.js:6793` (`type: 'Wedding'`).

A studio that has done 47 Corporate events and 0 Weddings sees "Wedding" pre-selected every single time they open the modal.

**Proposed:** derive default from either (a) the planner's `profile.specialties` if set, or (b) the most common `type` across `events[]` (last 5–10). Fall back to Wedding if no signal.

---

## 6. NewClientModal — POSITIVE example (call out, don't change) · ✓

**Location:** `App.js:9707–9722`.

This modal does the right thing:
- Reads `linkedEvent` from the selected event ID
- Detects `isCorporateType(linkedType)`
- **Auto-switches** `feeStructure` to `'none'` for internal corporate events
- Pulls fee range from `FEE_RANGES[linkedType]` adjusted by `getMetroFactor(profile)`

This is the pattern every other modal should follow. **Use this as the design reference**, not as something to change.

---

## 7. PublicIntakeForm — type collected, downstream questions identical · **P1**

**Location:** `App.js:9023+`.

The form asks "Event type" (12 options including Conference / Summit, Wedding, Bridal Shower, Gala / Fundraiser…). Then every type gets the same six questions: date, venue, guest count, budget, notes.

A Conference / Summit inquiry asking for a single "venue" string is wrong — multi-day, multi-room. A Wedding inquiry has implicit "ceremony venue + reception venue" that a single field flattens. A Gala / Fundraiser typically needs a target-raise number that "budget" doesn't capture.

**Proposed (sketch — for approval):** after the eventType picker, render 1–2 type-specific follow-up fields:

| Event type | Extra question(s) |
|---|---|
| Wedding | "Ceremony + reception in one place?" yes/no |
| Conference / Summit | "How many days?" / "Approx number of sessions?" |
| Gala / Fundraiser | "Fundraising target ($)" |
| Quinceañera / Sweet 16 | "Honoree's name" (since "Your name" is the inquirer) |
| Birthday Party | "Who's the celebrant?" (so it doesn't get confused with inquirer) |

Keep the form short. 1 extra field, not a wizard.

---

## 8. ClientModal — birthday / anniversary fields render for corporate clients · **P2**

**Location:** `App.js:8364–8370`.

Fields rendered: `birthday1`, `birthday2`, `anniversary`. For a Hartwell-Legal-type corporate client, these are nonsense — the "client" is an organization, not a couple.

ClientModal now has `events` prop (added during Date Friction work). We can detect:
```js
const linkedEvent = events.find(ev => ev.id === client.eventIds?.[0]);
const isCorporateClient = linkedEvent && isCorporateType(linkedEvent.type);
```

**Proposed:** hide birthday/anniversary section when `isCorporateClient`. Replace with a "Primary contact role" field (e.g., "Board Chair", "Marketing Director"). Don't break existing clients — gate purely on render.

---

## 9. PreferredVendorDirectory — hardcoded category list, ignores studio specialty · **P3**

**Location:** `App.js:10321`.

`VENDOR_CATS = ['Venue', 'Catering', 'Florals', 'Photography', 'Entertainment', 'AV / Tech', 'Hair & Makeup', 'Transportation', 'Lighting', 'Décor', 'Officiant', 'Other']`.

A studio that does only corporate doesn't need "Officiant" or "Hair & Makeup" surfaced as primary options; a wedding studio doesn't need "AV / Tech" as #1.

**Proposed:** sort or filter the dropdown by studio specialty (read from `profile.specialties` or derive from past events' types). Don't hide — sort. Always show "Other".

---

## 10. GuestModal / meal options — likely hardcoded, no type-awareness · **P3**

**Status:** Not deeply inspected yet — flagged for future review.

The seeded data shows meals consistently labeled `Standard / Vegetarian / Vegan / Gluten-Free / Halal / —`. For a Board Meeting / Conference / Summit, "Standard" reads strangely (it's catered lunch boxes, not plated dinner). Wording could shift by event type, but this is cosmetic — punt unless a tester complains.

---

## 11. ROSModal segments — same template for every event type · **P2**

**Location:** `App.js:6669` (`function ROSModal`).

ROS = Run of Show. A wedding ROS has Ceremony / Cocktail Hour / Reception / Send-off. A corporate ROS has Registration / Keynote / Breakouts / Networking. A birthday ROS has Arrival / Activity / Cake / Send-off. Right now the ROS modal almost certainly offers the same blank segment list regardless of type.

**Proposed:** at ROS creation, seed 3–5 type-appropriate segment stubs (planner can rename/delete/add). Don't lock the template — just save the planner one minute of typing.

---

## 12. VendorModal — category dropdown likely not type-filtered · **P3**

**Location:** `App.js:4063`.

VendorModal receives `event` as a prop. The vendor category dropdown source likely shows the union of all categories. For a Conference, the planner doesn't need "Officiant" in the dropdown; for a Wedding, they probably don't need "AV / Tech" as the top option.

**Proposed (light touch):** sort categories by event-type relevance. Don't hide — sort. Same approach as #9.

---

## 13. Fee installment labels are static ("Payment") · **P2**

**Location:** `App.js:8250, 18006`.

Every installment is `label: 'Payment'`. Real planners label by schedule position:
1. **Deposit** (signing)
2. **Mid-payment** (50% mark or contract milestone)
3. **Final balance** (before event)

**Proposed:** when `addInstallment()` fires, auto-suggest the next label based on how many installments already exist:
- 0 existing → "Deposit"
- 1 existing → "Mid-payment"
- 2 existing → "Final balance"
- 3+ existing → "Payment" (no smart name)

Planner overrides freely. This is a 3-line change but very visible payoff.

---

## Cross-cutting pattern observations

1. **The codebase already has the taxonomy** (`EVT_PARENT`, `isCorporateType`, `BUDGET_TEMPLATES`, `VENDOR_STUBS`, `TABLE_SIZE`, `FEE_RANGES`). The intelligence isn't missing — it's just not wired into the modal defaults.
2. **`NewClientModal` is the pattern.** Reuse its shape: read the linked event's type, derive defaults via a small map, allow override.
3. **Avoid the over-promise trap.** Don't write copy like "Event Boss chooses the structure based on your event type" until the behavior actually does that. Either implement, or downgrade copy.
4. **Honesty is keeping the override.** Every proposed default should remain user-editable. We are suggesting, not enforcing — that preserves source-of-truth honesty and matches what `NewClientModal` already does.

---

## Recommended ordering (for your approval)

| Order | Item | Why this order |
|---|---|---|
| 1 | **#1 + #2** (kit pre-select + Step 2 copy) | The bug you named. Largest perceived-intelligence win, smallest patch. Single PR. |
| 2 | **#13** (installment labels) | 3-line change, immediately visible to anyone with fee schedules. |
| 3 | **#8** (hide birthday/anniversary for corporate clients) | Stops obvious-nonsense fields from rendering. Pure render gate. |
| 4 | **#4** (time-of-day per type) | Small map, no UX rework. |
| 5 | **#3** (secondaryType suggestion) | Small map, no UX rework. |
| 6 | **#11** (ROS template per type) | Bigger lift — needs per-type segment lists. |
| 7 | **#7** (Intake form per-type follow-up) | Bigger lift — affects public form. Stage separately. |
| 8 | **#5** (primary type default from profile/history) | Requires profile field or analytics. Worth scoping as its own audit. |
| 9 | **#9 + #12** (vendor category sorting) | Polish — defer until a tester complains. |
| 10 | **#10** (meal copy by type) | Skip unless requested. |

---

## What I am NOT doing

- No code changes.
- No commits.
- No PRs.
- No build.
- No deploy.

Waiting on your call: **which items to implement, in what order, and as one PR or several.** If you say "ship #1 + #2 only," I will treat that as the locked scope and stop there for QA + final report.
