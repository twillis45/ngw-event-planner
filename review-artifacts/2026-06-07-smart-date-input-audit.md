# Smart Date Input + Mobile Picker — Review Board Audit (Phase A only)

**Date:** 2026-06-07
**Scope:** Audit-only. No code changes. Board hole-poking → date field inventory → recommended phasing.

---

## Part 1 — Board hole-poking (challenges to the proposed ideas)

Direct answers to the 20 challenges:

| # | Challenge | Answer |
|---|---|---|
| 1 | Does text-first date entry create parsing risk? | **Yes, real risk.** Localized date formats (M/D vs D/M), 2-digit years, ambiguous "6/7" — all real footguns. Recommend NOT making text-first the default in v1. |
| 2 | Are we overbuilding natural-language parsing? | **Yes.** "next Saturday" / "in 3 weeks" is genuinely useful but adds parser surface, locale handling, and UX confusion when the parsed result lands somewhere unexpected. Defer to v2 with a small expression library (e.g., `chrono-node`) IF audit proves the friction. Do NOT roll a custom parser. |
| 3 | Does Apple-style wheel add friction for far-future dates? | **Yes.** Scrolling year wheels from 2026 → 2028 is slower than typing "8/15/27". Wheel is great for "this week" / "this month" planning; bad for event dates 12 months out. |
| 4 | Does the wheel hurt accessibility? | **Risk: HIGH.** Native `<input type="date">` is screen-reader-friendly. A custom wheel needs full ARIA + keyboard support or it becomes a barrier. Do not ship a wheel until accessibility lead has reviewed. |
| 5 | Are quick chips helpful or noisy? | **Helpful — when chips are context-relevant and ≤4 per row.** Five chips on a 390px viewport is too many. Must be contextual. |
| 6 | Does relative-date storage create hidden complexity? | **Yes — high risk.** Today the app stores `payDueDate: '2026-08-15'` as a string. Switching to `{ kind: 'relative', offset: -14, from: 'event' }` requires migration, downstream consumer updates (Calendar, Notifications, sort logic, export). Do NOT introduce relative storage in v1. |
| 7 | What happens when event date changes? | If we resolve relative on read, all linked due dates shift silently. That's a major Source-of-Truth surprise unless the UI says "linked to event date" explicitly. Risk: planner thinks they confirmed a vendor at Aug 15, then realizes the event moved and the vendor's due date also moved without a notification. |
| 8 | What happens when event date is missing? | Relative chips must be disabled with explanation ("Set event date first"). Otherwise computing event-date − 14 days produces garbage. |
| 9 | What happens when timezone is unknown? | Most current dates are date-only (no time). For time-bearing fields (Run of Show, vendor arrival), the app currently has no timezone field on the event. Risk: shipping timezone-aware date+time creates a problem the app doesn't have today. |
| 10 | What happens when user enters "6/7"? | Native `<input type="date">` doesn't accept that — it requires ISO `YYYY-MM-DD`. The browser parses MM/DD/YYYY in localized input on desktop only. iOS / Safari date inputs handle this internally. So "6/7" as free text would only matter if we ship the v2 text parser. |
| 11 | What happens when user enters a past date? | Today: no validation. Suggested addition (Phase B+): non-blocking warning ("This date is in the past — keep anyway?") with confirm. NOT a hard block — planners legitimately log past dates (thank-you-sent date, vendor onboarding). |
| 12 | What happens if a payment due date is TBD? | Today: empty string. Calendar / Pipeline / Notifications skip empty. Adding a literal `TBD` sentinel changes that contract — must audit Calendar before. |
| 13 | What happens if a vendor promise is event-relative but the event moves? | Promise tracker today uses fixed string dates. Event-relative promises need the planner to be told "this will shift" before confirm, and Calendar / Notification copy needs to reflect it. **High blast radius. Defer.** |
| 14 | What happens if Run of Show time is TBD? | Run of Show uses `time` strings (HH:MM). Sorting in RoS is by row order, not time. TBD value would need a UI label and downstream PDF/print considerations. **Out of scope for v1.** |
| 15 | Are we mixing date, time, and status too aggressively? | **Yes.** v1 proposal does this. Recommend strictly: date-only for v1 picker improvements. Time fields stay native. Don't conflate "TBD" status into the same field. |
| 16 | Does TBD break sorting, calendar display, notifications, or reminders? | **Today empty strings sort last and are skipped by Calendar.** A literal TBD sentinel that the app reads must be wired into every consumer. Not safe for v1. |
| 17 | Can QA reliably test exact / relative / TBD? | If we keep v1 to exact-date improvements only (Phase B), QA is straightforward — same `type="date"` semantics. Adding relative/TBD multiplies QA surface 3-4×. |
| 18 | Can support explain why a date changed after event date changed? | Only if the UI shows the relationship visibly ("Due 14 days before event · Aug 1, 2027"). Otherwise users will think a date changed silently. Risk fully avoided by NOT shipping relative storage in v1. |
| 19 | Does this create hidden automation? | Quick chips that auto-apply: yes — but the user is the one tapping. That's fine because the chip IS the action. Smart defaults that pre-fill require disclosure ("Suggested · tap to change"). |
| 20 | Does this violate No Guesswork anywhere? | Risk if we ship relative storage without explicit "linked to event date" labels. Risk if we ship TBD without explicit "you haven't set this yet" copy in downstream consumers. Phase B (one-tap picker) violates nothing. |

**Board verdict so far:** Phase B is safe and useful. Phase C is useful when scoped tightly. Phase D-E need a deeper design pass that explicitly answers Q6, Q7, Q13, Q15. Don't roll natural-language parsing or Apple-wheel in v1.

---

## Part 2 — Date field inventory

Source scan: `grep type="date"` and `type="time"` across `src/`.

### Date fields (10 instances)

| # | Field | File:line | Component | User label | Workflow | Required | Date/Time | Allowed values | SoT owner | Downstream consumers | Friction | Risk if changed | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Vendor balance due (modal)** | `App.js:4866` | VendorModal | "Balance Due Date" | Vendor payments | Optional | Date | Exact | `vendor.payDueDate` | Budget rollup, Pipeline, Calendar payments lane | LOW — `showPicker` already wired | LOW | **C** — one-tap + chips ("30/14/7 days before event", "Event day", "Today") |
| 2 | **Create Event date** | `App.js:6876` | NewEventModal Step 1 | "Event date" | Create event | Required | Date | Exact | `event.date` | Everything (timeline, budget anchor, vendor due dates, Calendar) | MEDIUM — no showPicker, no chips | MEDIUM (this date anchors many derived values) | **C** — one-tap + chips ("This weekend", "Next weekend", "+1/3/6/12 months", "Next Saturday") |
| 3 | **Client birthday 1** | `App.js:8252` | ClientModal | "Birthday" | Client identity | Optional | Date | Exact | `client.birthday1` | None significant | LOW — showPicker wired | LOW | **B** — one-tap only |
| 4 | **Client birthday 2** | `App.js:8255` | ClientModal | "Birthday (partner)" | Client identity | Optional | Date | Exact | `client.birthday2` | None significant | LOW | LOW | **B** |
| 5 | **Client anniversary** | `App.js:8258` | ClientModal | "Anniversary" | Client identity | Optional | Date | Exact | `client.anniversary` | None significant | LOW | LOW | **B** |
| 6 | **Fee installment due** | `App.js:8326` | ClientModal feeSchedule | "Due" | Planner-fee tracking | Optional | Date | Exact | `client.feeSchedule[i].due` | Budget surface, Stripe link timing, payment-due Calendar lane | LOW — showPicker wired | LOW-MEDIUM | **C** — one-tap + chips ("Today", "+7/30 days", "30/14 days before event") |
| 7 | **Thank-you sent date** | `App.js:8348` | ClientModal | "Thank you sent" | Client post-event | Optional | Date | Exact (often past) | `client.thankYouDate` | None significant | LOW | LOW | **B** |
| 8 | **Intake event date** | `App.js:8917` | ConsultScript / intake form | "Event date" | Client intake | Required-ish | Date | Exact | `intake.eventDate` | Downstream Create Event prefill | LOW-MEDIUM — no showPicker | LOW | **B** (intake usually happens 1× per client) |
| 9 | **Event details edit (modal row)** | `App.js:25201` | EDTField | "Date" | Edit existing event | Required | Date | Exact | `event.date` | Same as #2 — anchors everything | MEDIUM | MEDIUM | **C** — one-tap + chips for "Reschedule" intent |
| 10 | **Event header inline edit** | `App.js:26262` | Event header date strip | Inline date | Inline edit event date | Required | Date | Exact | `event.date` | Same | LOW — already inline, taps native picker | LOW | **B** |

### Time fields (5 instances)

| # | Field | File:line | Workflow | Risk | Recommendation |
|---|---|---|---|---|---|
| 11 | Vendor arrival time | `App.js:4598` | Vendor day-of arrival | LOW | **B** (one-tap not applicable for time — keep native) |
| 12 | Agenda item time | `App.js:6586` | ConsultScript agenda | LOW | **C-leave-alone** (one of many — defer) |
| 13 | Agenda meeting start | `App.js:22496` | Consult agenda total | LOW | **C-leave-alone** |
| 14 | RoS row time | `VendorPlanningWorkspace.jsx:1539` | Run of Show | MEDIUM (sorted display) | **C-leave-alone** until RoS-specific design pass |

---

## Part 3 — Principle check (reject / modify ideas)

| Original idea | Verdict | Reason |
|---|---|---|
| **1. Shared SmartDateInput component** | **MODIFY** — only the `dateInputProps` helper in v1, not a full custom component | Custom component opens API design surface (Part 5 confirms it). Helper is no new component. |
| **2. Text entry primary** | **REJECT for v1** | Parsing risk (Q1, Q10), locale handling, no clear win over native picker. |
| **3. Native date picker available** | **ACCEPT** | This is the right default everywhere. |
| **4. Quick chips for common planning dates** | **ACCEPT for 5 pilot fields only** | Reduce blast radius. Pilot fields: Create Event date, Edit event date, Vendor balance due, Fee installment due, (defer Payment due-because-it-overlaps). |
| **5. Apple-style scroll wheel as exact-date fallback on mobile** | **DEFER — needs accessibility review + design pass** | High risk (Q3, Q4). Native pickers handle this well today. |
| **6. Support exact dates** | **ACCEPT** — already what the app does | |
| **7. Support event-relative dates** | **REJECT for v1 storage** | Q6, Q7, Q13, Q18 — too much hidden complexity for v1. Chips can COMPUTE a relative date but store the resolved exact value. |
| **8. Support TBD / Not set yet** | **REJECT for v1** | Empty string already serves this in current consumers. Adding TBD sentinel breaks Q12, Q16. |
| **9. Preserve structured meaning: exact / relative / TBD** | **REJECT for v1** | Same reason as #7 + #8. |
| **10. Show parsed / resolved confirmation** | **ACCEPT for chips only** | Display chip = "30 days before event" → resolves to "Aug 1, 2027" right below the chip. Always show the resolved exact date when a relative chip is selected. |
| **11. Use event timezone where available** | **DEFER** | Q9 — timezone field doesn't exist on event today. Out of scope. |
| **12. Avoid broad natural-language parsing in v1** | **ACCEPT** | Q2 — defer to v2 with `chrono-node` if friction is proven. |

---

## Part 4 — Recommended phasing

### PHASE A (this audit) — DONE
No code. This document.

### PHASE B (recommended NEXT) — Universal one-tap native picker
Add a shared `dateInputProps` helper:

```js
const dateInputProps = {
  type: 'date',
  inputMode: 'numeric',
  onFocus: e => { try { e.target.showPicker?.(); } catch {} },
  onClick: e => { try { e.target.showPicker?.(); } catch {} },
};
```

Apply via `{...dateInputProps}` on every existing `<input type="date">`. **No new storage. No new UI.** Removes manual-typing footgun and the 2-tap-to-open mobile annoyance.

**Fields to update (all 10 date fields above):** vendor balance due (#1), CE event date (#2), client birthdays #3-4, anniversary #5, fee installment due #6, thank-you-sent #7, intake event date #8, EDT modal Date #9, event header inline #10.

**Estimated effort:** ≤1 hour including QA harness.

### PHASE C — Quick chips for highest-friction fields (pilot)
Add chip rows ABOVE these 3 fields only:

1. **Create Event date** (#2): chips = This weekend · Next weekend · +1 month · +3 months · +6 months. Snap "this/next weekend" → nearest Saturday.
2. **Vendor balance due** (#1): chips = 30 days before event · 14 days before · 7 days before · Event day. Disabled with "Set event date first" when `event.date` is missing.
3. **Fee installment due** (#6): chips = Today · +7 days · +30 days · 30 days before event · 14 days before event. Same disabled rule.

**Storage rule:** chips COMPUTE a date and store the resolved exact string. No relative-storage migration. The chip's relationship to the event date is purely an input convenience — once tapped, the date becomes a static string just like manual entry.

**Resolved-result display:** when a chip is tapped, the field updates AND a small subtext shows: "Saturday, August 1, 2027 (14 days before event)". Subtext fades after edit.

**Estimated effort:** ~3-4 hours including QA at 5 viewports.

### PHASE D — SmartDateInput v1 component design (DEFER)
Only run this phase if Phase B + C friction reports prove value. The proposed API is too large for v1 (15+ props, mode switching, source contexts). When/if we do this:

- Cut to ≤8 props: `value, onChange, mode='date', allowChips=false, eventDate, helperText, required, label`.
- Move source-context-aware chip lists into a separate `dateChipPresets[sourceContext]` map.
- No `allowRelative` / `allowTBD` until Calendar + Notifications team-up to consume them.

### PHASE E — Apple-style scroll picker (DEFER)
Only if (a) accessibility lead approves a custom-wheel design, (b) audit shows native picker friction is a real problem at scale, and (c) we have explicit Cancel/Apply visible-affordance guarantees baked in from the start. **Don't volunteer this for v1.**

---

## Part 5 — Storage / Source-of-truth review

### Current state
Every date field stores an **ISO `YYYY-MM-DD` string** (or empty string `""` for unset). Time fields store `HH:MM`.

### Backward compatibility
- All existing records expect strings. Switching to object storage requires a migration AND every consumer to handle both shapes during transition.
- Consumers that read date strings: Calendar (`src/App.js` calendar render), Pipeline lanes, Budget rollup (`vendorBalance`, `payDueDate` checks), VendorPlanningWorkspace status badges, RoS sort, Notification scheduling, export to XLSX/PDF.

### Safe v1 preference (Phase B + C)
- **Keep existing string storage for all exact dates.** No migration.
- **Chips compute → store resolved exact string.** From the consumer's perspective, no difference between a manually-typed date and a chip-applied date.
- **Add NO metadata.** No `kind`, no `relative`, no `tbd`. Empty string remains the only "unset" sentinel.

### Verdict
Storage layer is **safe to leave alone** for Phase B + C. Any future relative/TBD work requires a written migration plan that explicitly enumerates Calendar / Notifications / Sort consumers and how each handles the new shape.

---

## Part 6 — QA plan (for Phase B implementation when approved)

Run at **390 / 430 / 768 / 1024 / 1440** per the locked standard.

### Phase B QA (one-tap native picker)
Per-field assertions:
- Single tap on the input opens the native picker on Chrome / Edge / Safari macOS / Android.
- iOS Safari still opens the wheel on first tap (unchanged behavior — verify no regression).
- Keyboard focus still selects the input and allows manual entry; `showPicker` doesn't trap keyboard-only users.
- Existing value renders unchanged (string format preserved).
- After picking, `onChange` fires with the same ISO format.
- 0 horizontal overflow, 0 console errors, 0 page errors.

### Phase C QA (chips, when added)
Per-field assertions:
- Chip row is visible above the input.
- Each chip is ≥44px touch target.
- Each chip has visible button affordance (border or filled bg — same rule as B/P Cancel post-regression).
- Tapping a chip updates the input value to the resolved ISO string.
- A subtext "→ Saturday, Aug 1, 2027 (14 days before event)" appears for ~3 seconds after chip tap.
- When `event.date` is missing, event-relative chips are disabled with "Set event date first" tooltip + visibly disabled styling.
- Tab order: chips → input → next field.
- No chip row exceeds the input's column width (no horizontal overflow on 390).

---

## Part 7 — Visible-affordance pass

When Phase B+C ships, the runtime probe must verify:
- Date input itself reads as editable: border + 44px height + text-color contrast ≥4.5:1.
- Chips read as tappable: border or filled bg + 44px touch target + text-color contrast ≥4.5:1.
- Disabled chips read as disabled: opacity ~0.5, no hover state, cursor: not-allowed, `aria-disabled="true"`.
- Selected date visibly fills the input (native browser default — verify on each viewport).
- Resolved-date subtext is visible without scrolling.

---

## Part 8 — Final report (verdicts)

### 1. Executive verdict
**AUDIT FIRST → BUILD PHASE B → BUILD LIMITED C** — in that order. Defer D and E.

### 2. Ideas accepted
- Universal one-tap native picker (Phase B).
- Quick chips on 3 pilot fields (Phase C: Create Event date, Vendor balance due, Fee installment due).
- Resolved-date display below the field when a chip is tapped.
- Keeping string storage. No data model migration in v1.

### 3. Ideas rejected
- Text-first / natural-language parsing in v1 (parsing risk + locale headaches).
- Relative-date object storage (high blast radius; would change Calendar / Notification / Sort behavior).
- TBD literal sentinel (empty string already serves this; consumers haven't been audited).
- Apple-style scroll wheel for v1 (accessibility risk + slow for far-future dates).
- Timezone-aware date+time (no event-timezone field exists today).

### 4. Ideas modified
- "SmartDateInput component" → shrunk to a `dateInputProps` helper for v1; full component design deferred to Phase D pending Phase B/C friction data.
- "Suggested defaults" → out of scope for v1; can be revisited after chips ship if blank-field paralysis is a documented problem.

### 5. Date field inventory table
See Part 2 above. Total: **10 manual date inputs + 5 time inputs**.

### 6. Risk classification
- **Highest blast radius:** Create Event date (#2) and Edit event date (#9, #10) — these anchor derived due dates everywhere. Phase C chips on these get the biggest UX win but need the most QA.
- **Lowest blast radius:** Client birthdays (#3, #4), anniversary (#5), thank-you-sent (#7) — touch nothing downstream.
- **Quietly important:** Fee installment due (#6) — feeds Budget surface, Stripe link timing, Calendar payments lane.

### 7. Biggest risk if we over-build
Shipping relative-date storage in v1. It would require simultaneously updating Calendar / Notifications / Pipeline / Budget consumers, and a partial migration is worse than none. **REJECTED for v1.**

### 8. Least risky v1
Phase B alone. ≤1 hour of work. Zero new UI. Removes the manual-typing footgun universally.

### 9. Recommended Phase B fields
**All 10 date inputs.** No exclusions.

### 10. Recommended Phase C chip fields (pilot)
- **Create Event date** (#2): This weekend / Next weekend / +1 month / +3 months / +6 months.
- **Vendor balance due** (#1): 30 days before event / 14 days before / 7 days before / Event day.
- **Fee installment due** (#6): Today / +7 days / +30 days / 30 days before event / 14 days before event.

### 11. Fields to leave alone
- Client birthdays + anniversary (#3, #4, #5) — Phase B is enough.
- Thank-you-sent date (#7) — Phase B only.
- Intake event date (#8) — Phase B only (one-time per client).
- Time fields (#11–#14) — out of scope.
- Inline event header date strip (#10) — Phase B; chips would crowd the strip.

### 12. Fields requiring deeper SmartDateInput design
- **Run of Show row time** (#14) — needs its own design pass for time-only + sort-aware fields. Deferred.
- **Vendor arrival time** (#11) — same; defer with RoS.

### 13. SmartDateInput API recommendation
**Don't build it in v1.** If/when Phase D is approved, cut the proposed API to ≤8 props (`value, onChange, mode='date', allowChips=false, eventDate, helperText, required, label`) and move chip-preset lists into a sibling `dateChipPresets[sourceContext]` map.

### 14. Storage recommendation
**Keep ISO string storage.** No metadata. Empty string = unset. Chips compute and store resolved exact values. Reconsider only after Phase B + C are in production and there's documented planner demand for "this stays linked to the event date".

### 15. Files likely touched (Phase B)
- `src/App.js` — all 10 date input call sites + new `dateInputProps` helper (likely module-level near `s.input` or `makeS`).
- No backend changes.
- No migration.
- No new tests required beyond the 5-viewport runtime QA harness.

### 16. QA plan
See Part 6.

### 17. Source-of-truth verdict
**SAFE for Phase B + C.** No new SoT introduced. Chips are input-time conveniences only; output is the same ISO string.

### 18. Accessibility verdict
**SAFE for Phase B.** `showPicker` is a non-destructive enhancement; native `<input type="date">` keyboard / screen-reader behavior unchanged.
**SAFE for Phase C** if chips render as real `<button>` elements with `aria-disabled` + `aria-label` describing the resolved date.
**NOT YET SAFE for Phase E** (Apple wheel) — requires accessibility lead review of custom-wheel a11y.

### 19. No Guesswork verdict
- Phase B: no new guessing. Same data shape, easier entry.
- Phase C: no new guessing IF (a) chips visibly compute → store resolved exact date, (b) event-relative chips are disabled with "Set event date first" copy when missing, (c) the subtext shows the resolved date AND the relationship ("Aug 1, 2027 · 14 days before event") so the planner sees what the chip did.
- Phase D/E without modifications: **WOULD CREATE GUESSING** because relative storage shifts dates silently when the event date changes. Hence the rejection for v1.

### 20. Final recommendation
**BUILD PHASE B + LIMITED C** when you approve.

- Phase B (universal one-tap): ≤1 hour, 0 risk, 100% blast.
- Phase C (3 pilot fields with chips): ~3-4 hours including QA, low-medium risk, big UX win on the highest-friction fields.
- Phase D: deferred until Phase C friction data exists.
- Phase E: deferred until accessibility lead has reviewed a wheel design.

---

## Part 9 — Brutality check

| Question | Direct answer |
|---|---|
| Are we making date entry easier or just more complex? | Phase B + limited C: **easier**. Beyond that: complex. Stay at B + C for v1. |
| Is the Apple-style wheel actually helpful, or just familiar? | **Mostly familiar.** Native pickers already handle wheel UX on iOS. Wheel for far-future dates is slower than typing. Defer. |
| Does this avoid fake exact dates? | **Yes if we stick to B + C.** Chips compute exact dates. Relative/TBD storage would create fake-precision risk — rejected. |
| Does TBD create downstream problems? | **Yes** (Calendar / Sort / Notifications). Empty string is sufficient for v1. |
| Does relative date storage create hidden complexity? | **Yes — high.** Rejected for v1. |
| Can a tired planner enter dates faster? | **Yes** — Phase B is a one-tap improvement; Phase C chips remove typing entirely on the most-common patterns. |
| Can a grandmother / non-technical helper use it? | **Yes** — native picker, ≥44px chips, plain English labels. |
| Can keyboard / screen reader users use it? | **Yes for Phase B.** Native `<input type="date">` is the most accessible date entry method; we're not replacing it, just smoothing the open path. |
| Can Calendar / Notifications understand these values? | **Yes** — they receive the same ISO strings they already do. No consumer changes needed. |
| Which date field is worst today? | **Create Event date (#2).** No `showPicker`, no chips, anchors many derived values. Mobile users type ISO format from the keyboard. |
| Which date field is highest risk to change? | **Create Event date AND Edit event date.** Both anchor downstream timeline/budget/Calendar entries. Change carefully + test all 5 viewports. |
| Are smart defaults safe right now? | **No.** Defer until Phase B/C land and we have planner feedback. |
| Would quick chips reduce friction or add clutter? | **Reduce — when scoped to 3 fields** (Create Event, Vendor balance, Fee installment). |
| Should Apple-style wheel wait? | **Yes. Defer indefinitely.** Don't volunteer it; wait for a clear user need. |
| What should be cut from v1? | Text parsing, Apple wheel, relative storage, TBD sentinel, timezone, SmartDateInput component-with-15-props. |
| What must be built first? | Phase B (`dateInputProps` helper applied to all 10 date inputs). Then Phase C on 3 pilot fields. |
| Is this aligned with No Guesswork, or are we creating a clever feature that adds guessing? | **Phase B + C are aligned.** Phase D/E without modifications would add guessing — hence rejected. |

---

## Stopping per directive

No code touched. No PR opened. No deploy. Final verdict:

> **AUDIT FIRST → BUILD PHASE B → BUILD LIMITED C. Defer Phase D and E.**

Awaiting your explicit "Start Phase B" (or "Start Phase B + C") before any code change.
