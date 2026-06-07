# Intelligence Gap PR #1 — Pre-Review Board

**Date:** 2026-06-07
**Scope locked by user:** NewEventModal Step 2 kit pre-selection respects Step 1 type · Step 2 copy matches behavior · type-driven `timeOfDay` default · nothing else.

---

## 1. Risk table

| # | Risk | Owner | Severity | Mitigation |
|---|---|---|---|---|
| R1 | App still over-promises ("chooses based on your type") if the rail copy isn't updated alongside the logic | No Guesswork PO | **HIGH** | Rewrite Step 1 NO GUESSWORK rail copy to use "suggests" + "you can change it" — never the word "chooses" |
| R2 | User override silently gets reverted when they tab back to Step 1 to fix a typo and return to Step 2 | Skeptical paying planner / Tired planner at 11 PM | **HIGH** | `kitTouched` state flips to `true` on any manual card click and gates the auto-suggestion `useEffect`. Override survives type changes, step navigation, and modal scrolling |
| R3 | "Suggested for X" badge looks identical to "You picked X" — planner can't tell which state they're in | Mobile UX lead / Grandmother | **MEDIUM** | Two distinct copy variants gated on `kitTouched`. Wording explicitly says "Suggested for Wedding" vs "You picked …" — no shared phrasing |
| R4 | Auto-changing `timeOfDay` without UI feels like "magic" the planner can't undo | Source-of-truth judge / Trust & safety | **MEDIUM** | NewEventModal has no `timeOfDay` picker, so there's no UI override to violate. Default value is a stored-from-creation seed; planner edits via Event Details later (no concept of "override silently undone") |
| R5 | Defaulting `secondaryType` based on primary risks suggesting "Reception" when planner wants Wedding-only | Wedding planner / Corporate event planner | **HIGH** | **Skipped** in this PR. Audit listed P1; risk-to-value ratio is worse than kit + timeOfDay |
| R6 | Auto-suggestion creates an event record before Step 3 review | Trust & safety / Source-of-truth judge | **HIGH** | No new write paths. `createNow()` still only fires on Step 3 → Create. The `useEffect` only mutates local React state (`kit`, `form.timeOfDay`) |
| R7 | Auto-suggestion sends a notification or message | Trust & safety | **HIGH** | No notification/message code in the affected path. Existing trust block at Step 1 + Step 3 already states "Messages sent: None / Notifications sent: None" |
| R8 | Wedding → 'wedding' kit is obvious; but what's "the right kit" for `Other` or `Fundraiser / Gala`? | Wedding planner / Corporate event planner | **MEDIUM** | Mapping table documented explicitly. `Other`/unknown → `'simple'`. `Fundraiser / Gala`, `Networking Event` → `'corporate'` (vendor-heavy). User can override every case |
| R9 | Change might break PR #5's selected-chip state on Step 1 date | QA automation lead | **LOW** | Step 1 layout untouched. Only the rail copy text changes. Chips and selected state unaffected |
| R10 | A11y regression — selected kit card stops being announced when state-driven | Accessibility lead | **LOW** | Existing `data-testid` and visual treatment unchanged. Adding `aria-pressed` on the kit button mirrors what we did for Phase B+C chips |
| R11 | Mobile (390/430) — extra "Suggested for X" line eats vertical space | Mobile UX lead | **LOW** | One added line of ~13–14px text above the existing "Pick a starting point" copy. Negligible at the smallest viewport |
| R12 | Banned color creep — accent badge introduces new hex | UI lead | **LOW** | Use existing `steelTop` (= `C.accentTopGrad`) for any new visual emphasis. No raw hex literals |
| R13 | Forgetting to clear `kitTouched` on `resetForAnother` — next event opens with stale override | Frontend engineer | **MEDIUM** | Explicit `setKitTouched(false)` + `setTodTouched(false)` calls in `resetForAnother` |

---

## 2. Acceptance criteria (must ALL be true for 10+)

1. Open Create Event → pick Wedding in Step 1 → Step 2 highlights `Wedding · ceremony + reception` and copy says "Suggested for Wedding: Wedding · ceremony + reception. Tap a different card to change."
2. Pick Board Meeting in Step 1 → Step 2 highlights `Corporate event` and copy says "Suggested for Board Meeting: Corporate event…"
3. Pick Birthday in Step 1 → Step 2 highlights `Private celebration` and copy says "Suggested for Birthday: Private celebration…"
4. Pick Fundraiser / Gala in Step 1 → Step 2 highlights `Corporate event` (vendor-heavy archetype).
5. Pick Other in Step 1 → Step 2 highlights `Simple event` (a sensible empty-ish default rather than Wedding).
6. In Step 2, click `Start blank` — copy switches to "You picked **Start blank**. Tap a different card to change." Badge no longer references "Suggested for X".
7. Click "Back", change Step 1 type from Wedding → Birthday, click Continue → kit is STILL `Start blank` (override survived).
8. Don't touch Step 2 — change Step 1 type from Wedding → Birthday → kit auto-switches Wedding → Private celebration.
9. Step 1 NO GUESSWORK rail copy: "Event Boss **suggests** a setup structure next — timeline, vendor categories, budget, checkpoints — **based on your event type. You can change it before creating.**" (Word "suggests" replaces "chooses".)
10. Step 3 Review row "Setup choice" shows whichever kit is currently selected — automatic OR manual.
11. Success state's "Created for you" payoff matches whichever kit was selected at submit time — automatic OR manual.
12. `events.length` does not increase between Step 1 and Step 3 → Create. Verified via runtime probe at every viewport.
13. No new banned colors. No amber/red primary CTAs. No new raw hex literals. PR #6 palette cleanup stays intact (0 `#1a6fba` rendered, 0 `rgb(26,111,186)`).
14. Date Entry chips (PR #5) still render on Step 1 and the selected-chip state still works.
15. 0 horizontal overflow, 0 page errors, 0 console errors at 390 / 430 / 768 / 1024 / 1440.

---

## 3. Do-not-do list

- ❌ Do not touch Add Client, PublicIntakeForm, ClientModal, ROSModal, VendorModal, GuestModal, PreferredVendorDirectory, payment installment labels, Budget/Payments, Date Entry, Profile Settings, Communication, Calendar, backend, migrations.
- ❌ Do not change the `KITS` archetype list itself (titles, checklists, t/v/b flags).
- ❌ Do not change `EVT_CATEGORIES` or `EVT_PARENT`.
- ❌ Do not add new event types.
- ❌ Do not write to storage at Step 1 or Step 2.
- ❌ Do not send any message or notification.
- ❌ Do not auto-default `secondaryType`. (Risk > value; explicit skip.)
- ❌ Do not change the Step 1 layout beyond the rail copy text.
- ❌ Do not introduce new raw hex literals. Use `steelTop` / `C.*` tokens.
- ❌ Do not silently force the user back onto an auto-suggestion after they've picked a different kit.
- ❌ Do not remove the `Start blank` kit from the list — it remains user-selectable for every event type.

---

## 4. Required QA assertions

Runtime probe at 390 / 430 / 768 / 1024 / 1440 must verify:

**Suggestion correctness (per type)**
- Wedding → `ce-kit-wedding` is `aria-pressed="true"` after Continue
- Board Meeting → `ce-kit-corporate` is `aria-pressed="true"`
- Conference → `ce-kit-corporate` is `aria-pressed="true"`
- Birthday → `ce-kit-private` is `aria-pressed="true"`
- Quinceañera → `ce-kit-private` is `aria-pressed="true"`
- Holiday Party → `ce-kit-corporate` is `aria-pressed="true"`
- Fundraiser / Gala → `ce-kit-corporate` is `aria-pressed="true"`
- Other → `ce-kit-simple` is `aria-pressed="true"`

**Override behavior**
- After Wedding suggestion, click `ce-kit-blank` → `ce-kit-blank` becomes selected, `ce-kit-wedding` becomes unselected
- Step 2 copy contains the substring `"You picked"` when override is active
- Step 2 copy contains the substring `"Suggested for"` when override is NOT active

**Override persistence**
- After override → click Back → change Step 1 type → Continue → the OVERRIDE chip is still selected, NOT the suggestion for the new type

**Step 3 review fidelity**
- After override to `Start blank`, Step 3 review row "Setup choice" reads `Start blank`

**No premature write**
- `localStorage` events length before reaching Step 3 = before reaching Step 1 = before opening modal
- No `events` write fires between Step 1 → Step 2 → Step 3

**Step 1 NO GUESSWORK rail copy**
- Substring "suggests" present
- Substring "chooses" absent
- Substring "You can change it" present

**No regressions**
- Date Entry chips render on Step 1 (`ce-date-chip-this-weekend` present)
- Selected chip state still works (`+3 months` tap → `aria-pressed="true"` on that chip)
- 0 `#1a6fba` in rendered DOM
- 0 `rgb(26,111,186)` in rendered DOM
- 0 page errors / 0 console errors / 0 horizontal overflow

**Trust block**
- "Messages sent: None" still visible on Step 1 and Step 3
- "Notifications sent: None" still visible on Step 1 and Step 3
- "Event is not created until final review" still visible on Step 1

---

## 5. 10+ standard — what makes this 10+, not 8

| Dimension | 8 | 10+ |
|---|---|---|
| Wiring | Kit changes when type changes | Kit changes when type changes AND override survives AND copy distinguishes |
| Copy honesty | "Suggested" appears somewhere | Step 1 rail no longer says "chooses"; Step 2 copy switches state-by-state; Step 3 reflects truth |
| User trust | Override works once | Override survives Back-and-forth, modal scrolling, secondary type changes, and re-open via "Add another" |
| Mobile | No overflow at 390 | Visible-affordance check passes at 390/430 — added copy line doesn't eat the kit cards' fold |
| A11y | Cards remain clickable | Selected kit card has `aria-pressed="true"`; copy is real text (not aria-label-only) |
| Source of truth | `kit` is local state | Nothing writes to storage before Step 3; Step 3 review row shows the actual selected kit value, not "suggested for"; success state shows actual selected kit |
| Regression | Date Entry still works | Date Entry chips + selected-chip + palette cleanup all verified post-change at every viewport |
| Brutality | Wedding picks Wedding | Every audit-listed mapping (Wedding, Corporate, Birthday, Conference, Holiday Party, Fundraiser, Other) is verified individually in QA, not just spot-checked |

Anything below 10 on any dimension above = MODIFY, not LOCK.

---

## Implementation outline (locked before coding)

1. Add module-level helper `kitForEventType(type)` near `EVT_PARENT` definition.
2. Add module-level helper `timeOfDayForEventType(type)` next to it.
3. In `NewEventModal`:
   - Initial `kit` state derives from `kitForEventType('Wedding')`.
   - Add `kitTouched: useState(false)`.
   - Add `useEffect` keyed on `form.type` + `kitTouched`: if `!kitTouched`, `setKit(kitForEventType(form.type))`.
   - Add second `useEffect` for `timeOfDay`: if `!todTouched`, `upd('timeOfDay', timeOfDayForEventType(form.type))`. (`todTouched` always stays `false` in this modal — no UI to flip it — but the gate is in place for future use.)
   - Kit card `onClick`: `setKit(k.id); setKitTouched(true);`
   - Add `aria-pressed={kit === k.id || undefined}` to kit buttons.
   - Step 2 copy renders Suggested vs Picked based on `kitTouched`.
   - `resetForAnother`: also call `setKitTouched(false)`.
4. Step 1 NO GUESSWORK rail: rewrite the over-promise sentence.
5. No changes to `KITS`, `EVT_CATEGORIES`, Step 3 review structure, success payoff, `createNow`, or any other file.

Files touched: **`src/App.js` only.**
Lines of net code change estimated: ~30 LOC across helpers + state + effect + copy + 1 onClick + 1 aria attr.
