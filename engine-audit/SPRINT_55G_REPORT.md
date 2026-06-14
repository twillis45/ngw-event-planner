# Sprint 55G — Report

*Decision-First Runtime (55F Phase A) implemented + NGW Product OS pattern capture. The Event Planner now tells a host "Confirm final guest count" instead of "Buy protein" when the count is unresolved — using the existing runtime, no new engine/dashboard/UI/readiness/brain.*

## 1. Pattern artifacts created
`engine-audit/NGW_PRODUCT_PATTERNS.md` — the NGW-POS pattern library, with five entries captured as portable IP:
- **001 Decision-First Runtime** — prerequisite decisions outrank dependent actions (the principle this sprint implements).
- **002 Next Action Spine** — every screen answers what matters / why / what next.
- **003 Trust Before Intelligence** — never show uncertainty as truth; escalate only after certainty.
- **004 One Meaning, One Label** — one concept, one label.
- **005 Operational Intelligence Layer** — tracking dates ≠ planning; carry decisions/purchases/quantities/readiness/contingencies/recovery.

Each entry states principle · rule · anti-pattern · origin · future products (Event Planner, Lighting OS, Photography Business OS, Studio Operations OS, FCR Command Center).

## 2. Runtime changes (existing systems only — no new architecture)
| File | Change |
|---|---|
| `src/lib/playbooks/index.js` | Added decision-state helpers (`guestCountResolved`, `dietaryResolved`, `playbookHasDietaryDecision`, `purchaseGate`); `playbookTasks` now **suppresses purchases blocked by an unresolved prerequisite decision**; new export **`topPlaybookDecision(event, asOf)`** returns the blocking decision to surface. |
| `src/CommandCenter.jsx` | `_selectEventNextActionInner`: new **Tier 6.4 decision branch** inserted *between* the reactive tiers and the purchase tier (6.5) — preserves solve/vendor/readiness priority, only inserts decision-before-purchase. `selectStudioCommand` Tier 6.7 delegate broadened to surface `category === 'decision'` (so it reaches the Home Spine via the existing `selectStudioCommand → selectEventNextAction` path). |

Reused: `selectStudioCommand`, `selectEventNextAction`, the playbook reader. No new command system, engine, dashboard, or readiness system.

## 3. Decision gating logic
- **Guest-count gate** (master quantity input): every per-guest purchase (`qtyPerGuest`/`qtyPer`) is blocked unless the count is *final*. Resolved = a count signal exists AND no still-pending RSVPs (`Maybe`/blank) in the guest list. An **estimate-only** event (a number, no guest list) is treated as resolved — we never falsely block a host who already gave a number.
- **Dietary gate** (food only, and only for playbooks that model a `dietary` decision — Dinner Party, Baby Shower): `food`-category purchases are blocked until dietary is collected. Resolved = at least one guest has a recorded `needs`/non-standard `meal`; an empty guest list is treated as resolved (nothing to collect from).
- **Surfacing:** `topPlaybookDecision` returns a decision **only when it actually blocks an in-window purchase** — no nagging about a fuzzy count when nothing is imminent to buy. Priority: guest count (master input) before dietary.
- **Honesty / done-state inference:** decisions are gated on observable event state. Where a decision's done-state can't be observed (e.g. "alcohol strategy chosen"), it is **not** hard-blocked — the gate only fires on signals we can actually read (per the 55F design + Pattern 001's enforcement note).

## 4. Screens affected (identical behavior, verified)
- **Home Spine** (`selectStudioCommand` → `NextStepSpine`)
- **Event Command Center** next action (`selectEventNextAction` → `NextBestActionPanel`)
- **Client Event detail** next action (same selector)

All three route through `selectEventNextAction`, so decision-first ordering is enforced once and rendered identically everywhere.

## 5. QA results
**Unit — 45/45 pass** (`src/lib/playbooks/__tests__/reader.test.js`): unresolved headcount → decision + per-guest buys suppressed; no-count → count decision; resolved → buy unlocks; dietary unresolved → dietary decision + food suppressed; dietary resolved → no decision; estimate-only not falsely blocked; gate only fires when a buy is in-window; non-playbook → null; count-before-dietary priority. (One pre-55G test was updated to the new decision-first behavior, intentionally.)

**Runtime (local prod bundle, headless Chrome) — 0 page errors:**
| Scenario | Home Spine | Command Center |
|---|---|---|
| Unresolved headcount (1 Maybe) | **Confirm final guest count · Chase RSVPs →** | **identical** |
| Resolved (all Yes + dietary recorded) | Buy main protein — 4.8 lbs today | identical |
| Unresolved dietary (no needs recorded) | **Collect dietary restrictions & allergies** | identical |
| Non-playbook (Wedding) | Your next event is on track | identical |

**Regression:** build passes (`main.51cb5313.js`, +1.6 kB); 45/45 tests; prod bundle loads clean; no console/page errors; existing non-playbook events unaffected; solve/vendor/readiness tiers untouched.

## 6. Risks
- **Behavior change (intended):** an event with no guest count, or with pending `Maybe` RSVPs, now surfaces "Confirm final guest count" instead of a sized buy. This is the success condition, but it *is* a visible change for in-window events. Blast radius is small: the gate fires only inside the buy window (≤2 days from a purchase's date), so events weeks out are unaffected. **The shipped sample Dinner Party ("Friendsgiving", 1 Maybe) now demonstrates this live.**
- **Done-state inference (medium):** dietary resolution is heuristic (guest list present + zero recorded needs → unresolved). A party where nobody has allergies but the host has confirmed so has no field to record "confirmed none" — it would read as unresolved. Mitigation today: dietary only gates playbooks that model the decision, and only blocks `food` (not the whole event). **Recommended follow-up:** a lightweight "dietary collected" acknowledgement so the host can clear it explicitly (the 55F "TEST" item).
- **Readiness precedence:** an unscaffolded event still shows readiness "needs follow-up" above the decision (priority preserved per spec). The decision surfaces once the event is otherwise on-track — correct ordering, but worth noting the decision won't appear on a very-incomplete event until its readiness clears.

## 7. Recommendation
**SHIP.** Phase A is the highest-leverage, lowest-risk slice of the 55F design: ~80% routing of authored data + one bounded gate, fully covered by unit + runtime QA, identical across all three surfaces, with the solve/vendor/readiness ladder preserved. It converts the core anti-pattern ("Buy protein" before the count) into planner behavior ("Confirm final guest count"). **TEST** the dietary done-state with a real host before widening the gate; **PARK** 55F Phase B (run-of-show/capacity surfacing) and Phase C (authority merge) as the next steps.

**Success condition met:** the system no longer says "Buy protein" when it should say "Finalize guest count." Every lesson is captured as reusable NGW-POS IP in `NGW_PRODUCT_PATTERNS.md`.
