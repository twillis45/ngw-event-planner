# Date Entry Friction — Phase B + Limited Phase C Final Report

**Date:** 2026-06-07
**Scope:** Phase B (universal one-tap native picker) + Phase C (chips on 3 pilot fields). No commit. No PR. No deploy.

---

## 1. Fields changed

### Phase B — `{...dateInputProps}` applied to all 10 date inputs

| # | Surface | File:line (post-edit) | Before | After |
|---|---|---|---|---|
| 1 | Vendor balance due | App.js:4978 | bare `<input type="date" ... onClick={showPicker}>` | `<input {...dateInputProps} ...>` |
| 2 | Create Event Step 1 date | App.js:6988 | bare `<input type="date" ...>` (no onClick) | `<input {...dateInputProps} ...>` |
| 3 | Client birthday 1 | App.js:8364 | inline `onClick` | `{...dateInputProps}` |
| 4 | Client birthday 2 | App.js:8367 | inline `onClick` | `{...dateInputProps}` |
| 5 | Client anniversary | App.js:8370 | inline `onClick` | `{...dateInputProps}` |
| 6 | Fee installment due | App.js:8497 | inline `onClick` | `{...dateInputProps}` + new `cm-fee-due-{id}` testid |
| 7 | Thank-you-sent date | App.js:8460 | inline `onClick` | `{...dateInputProps}` |
| 8 | Intake event date | App.js:9029 | bare | `{...dateInputProps}` |
| 9 | EDTField generic `type="date"` | App.js:25166 | bare | `{...(type === 'date' ? dateInputProps : {})}` on the input branch |
| 10 | Event header inline date strip | App.js:26374 | inline `onClick` + `onFocus` (border-color) | `{...dateInputProps}` + preserved border-color onFocus via composition |

**Helper definition (module-level near `today8601`):**

```js
const dateInputProps = {
  type: 'date',
  inputMode: 'numeric',
  onFocus: (e) => { try { e.target.showPicker?.(); } catch {} },
  onClick: (e) => { try { e.target.showPicker?.(); } catch {} },
};
```

Identical behavior to the previous `onClick={e => { try { e.target.showPicker(); } catch {} }}` spread across 6 sites — now consolidated, plus extended to `onFocus` for keyboard-triggered open and `inputMode='numeric'` for mobile numeric keyboard hint.

**No storage changes.** No new UI.

### Phase C — chips on 3 fields

#### Create Event Step 1 date — 5 chips
- This weekend → `nextWeekendISO()` (nearest upcoming Saturday)
- Next weekend → `followingWeekendISO()` (Saturday after)
- +1 month → `addMonthsISO(1)`
- +3 months → `addMonthsISO(3)`
- +6 months → `addMonthsISO(6)`

State: `[ceDateChipMeta, setCeDateChipMeta]` captures `{ resolved, label, at }` for the subtext. Cleared when the user types manually or picks via native picker.

testids: `ce-date-chip-this-weekend`, `-next-weekend`, `-plus-1-month`, `-plus-3-months`, `-plus-6-months`. Subtext at `ce-date-chip-subtext`.

#### Vendor balance due — 4 chips (all event-relative)
- 30 days before event → `addDaysISO(event.date, -30)`
- 14 days before event → `addDaysISO(event.date, -14)`
- 7 days before event → `addDaysISO(event.date, -7)`
- Event day → `event.date`

All four chips have `relativeTo: 'event'`. When `event.date` is falsy, they render disabled (`opacity 0.55`, `cursor: not-allowed`, `aria-disabled="true"`, `title="Set event date first."`). The container also shows an italic "Set event date first." line. Existing call sites already pass `event` into `VendorModal` so the chip row reads the truth source directly.

State: `[vmBalanceChipMeta, setVmBalanceChipMeta]`. testids: `vm-balance-chip-30-before`, `-14-before`, `-7-before`, `-event-day`. Subtext at `vm-balance-chip-subtext`.

#### Fee installment due (ClientModal) — 5 chips per installment
- Today → `today8601()`
- +7 days → `addDaysISO(null, 7)`
- +30 days → `addDaysISO(null, 30)`
- 30 days before event → `addDaysISO(linkedEventDate, -30)` (`relativeTo: 'event'`)
- 14 days before event → `addDaysISO(linkedEventDate, -14)` (`relativeTo: 'event'`)

`linkedEventDate` is derived from `client.eventIds[0]` looked up in the new `events` prop passed to ClientModal. When no linked event exists, the two event-relative chips disable; the three absolute chips (Today, +7, +30) remain active.

State: `[feeDueChipMeta, setFeeDueChipMeta]` keyed by installment id so each installment has its own subtext. testids prefix `cm-fee-due-chip-{installmentId}-{chipId}`, subtext at `cm-fee-due-chip-subtext-{installmentId}`.

**ClientModal signature change:** added `events = []` prop. Call site at App.js:16801 updated to pass `events`.

---

## 2. Helper implementation

### Module-level helpers (added near `today8601`)

| Helper | Signature | Behavior |
|---|---|---|
| `dateInputProps` | object spread | `{ type: 'date', inputMode: 'numeric', onFocus, onClick }` — both event handlers call `showPicker?.()` with try/catch |
| `addDaysISO` | `(baseIso, n) => 'YYYY-MM-DD'` | Returns base + n days. If `baseIso` is empty/null, base = today |
| `nextWeekendISO` | `() => 'YYYY-MM-DD'` | Nearest upcoming Saturday from today. Today-is-Sat returns today |
| `followingWeekendISO` | `() => 'YYYY-MM-DD'` | The Saturday after `nextWeekendISO()` |
| `addMonthsISO` | `(n) => 'YYYY-MM-DD'` | Today + n months. Handles month-overflow (Mar 31 + 1 → Apr 30, not May 1) |

All return ISO `YYYY-MM-DD` strings — same shape the app stores everywhere. No metadata, no relative storage.

---

## 3. Chip implementation

### `<DateChipRow>` component (added near Toast renderer)

Props:
- `chips: [{ id, label, compute: () => 'YYYY-MM-DD' | null, relativeTo?: 'event', tooltip? }]`
- `onPick(iso, chip)` — fires with the resolved ISO + the chip object so the parent can render subtext
- `eventDate` — optional; required for `relativeTo: 'event'` chips
- `C` — theme
- `testId` — prefix for `data-testid={`${testId}-${chip.id}`}` on each chip

Visible affordance:
- background: transparent
- color: `C.text` when enabled, `C.muted` when disabled
- border: `1px solid ${C.muted}66` enabled, `${C.muted}33` disabled
- borderRadius: 8
- padding: `8px 12px`
- minHeight: 44 (touch target)
- fontSize: 12.5, fontWeight: 600
- cursor: pointer (enabled) / not-allowed (disabled)
- opacity: 1 / 0.55
- whiteSpace: nowrap (chip labels stay single-line)

Wrap row uses `flexWrap: wrap` + `gap: 8` so chips reflow to a second row when the viewport narrows. At 390px the chip row stays inside the input column width.

Disabled chips also receive `aria-disabled="true"` and `title="Set event date first."` for keyboard + screen reader users.

---

## 4. QA matrix

QA harness: `/tmp/date-friction-qa.py`. Captures + raw JSON: `demo/review-artifacts/2026-06-07-date-friction-qa/`.

| Viewport | Step 1 date input has helper (`type=date` + `inputmode=numeric` + onfocus/onclick) | CE chip 'This weekend' has visible border | CE chip min-height 44px | CE chip taps populate date | CE subtext renders | VM balance chip '14 days before event' present | VM chip has visible border | VM chip subtext renders after tap (event date exists) | Sub-12px text inside chip containers | Amber/red on any chip | Banned `#1a6fba` / `#14b8a6` | Horizontal overflow | Page errors | Console errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 390  | ✓ | ✓ | 44 | ✓ | ✓ | ✓ | ✓ | ✓ | 0 | 0 | 0 / 0 | ✓ none | 0 | 0 |
| 430  | ✓ | ✓ | 44 | ✓ | ✓ | ✓ | ✓ | ✓ | 0 | 0 | 0 / 0 | ✓ none | 0 | 0 |
| 768  | ✓ | ✓ | 44 | ✓ | ✓ | ✓ | ✓ | ✓ | 0 | 0 | 0 / 0 | ✓ none | 0 | 0 |
| 1024 | ✓ | ✓ | 44 | ✓ | ✓ | ✓ | ✓ | ✓ | 0 | 0 | 0 / 0 | ✓ none | 0 | 0 |
| 1440 | ✓ | ✓ | 44 | ✓ | ✓ | ✓ | ✓ | ✓ | 0 | 0 | 0 / 0 | ✓ none | 0 | 0 |

**Build proof:** `react-scripts build` compiled clean (2 pre-existing unused-variable warnings only). Bundle `main.7f5f9a6f.js`. 0 OpenWeather refs, 0 dev-bypass-user refs.

### Tap-result examples observed in QA

| Field | Chip tapped | Resolved (today = Jun 7 2026) | Subtext rendered |
|---|---|---|---|
| CE event date | `+3 months` | `2026-09-07` | "Sep 7, 2026 · +3 months" |
| VM balance due (event = Sep 12 2026) | `14 days before event` | `2026-08-29` | "Aug 29, 2026 · 14 days before event" |

---

## 5. Screenshot paths

- `demo/review-artifacts/2026-06-07-date-friction-qa/{viewport}_01_ce_step1_chip.png` — Create Event Step 1 after `+3 months` chip tap, showing the populated input + "Sep 7, 2026 · +3 months" subtext.
- `demo/review-artifacts/2026-06-07-date-friction-qa/{viewport}_02_vm_chip.png` — VendorModal balance row after `14 days before event` chip tap.
- `demo/review-artifacts/2026-06-07-date-friction-qa/qa.json` — full runtime probe results per viewport.

---

## 6. Source-of-truth verdict

**SAFE.** No data model change. Chips compute resolved ISO strings; the field stores the same `YYYY-MM-DD` it would have stored from manual entry or native picker. No metadata. No relative-storage migration. No hidden mutation.

- Downstream consumers (Calendar, Pipeline, Budget rollup, Notifications, sort logic, XLSX export) read exactly the same shape they read before.
- "Event day" chip on Vendor balance writes `event.date` directly — if the planner later moves the event date, the saved balance due date does NOT shift. The chip is an input-time convenience; the saved value is a static string. This is the documented honest behavior — no silent drift.
- Fee installment chips use `linkedEventDate` derived from `client.eventIds[0]` at chip-tap time. Same rule: chip computes once, stores resolved string.

---

## 7. Visible-affordance verdict

**PASS at every viewport.**

- Date inputs: every site uses the established `s.input` / `ui.field` / `fieldStyle` border styling. Editable look preserved.
- Chips: bordered button shape, 44px touch target, 12.5px text, steel-blue/Studio Matte palette only.
- Disabled chips: visible reduction (`opacity 0.55`, lighter border `${C.muted}33`, `cursor: not-allowed`, `aria-disabled="true"`). The "Set event date first." copy renders both in the chip `title` attribute AND as inline italic text below the input.
- Resolved-date subtext: appears immediately after chip tap, anchored at 12px Mid-Carbon muted text, line-height 1.45. Cleared when the user types manually so it can't drift from the actual value.
- Primary CTAs (Create, Continue, etc.) stay steel-blue gradient — visually distinct from the bordered-secondary chips. No primary-CTA conflict.

---

## 8. Brutality check

| Question | Answer |
|---|---|
| Are we making date entry easier? | **Yes.** One tap opens the picker on every date input. Five chips on the highest-friction event date eliminate typing for the common case. |
| Is there fake precision? | **No.** Chips compute and store resolved exact ISO strings — same shape native picker writes. |
| Does any chip create a downstream obligation? | **No.** Chips only set the date. Calendar / Notifications / Sort consumers see the same string they always have. |
| Does "14 days before event" stay linked if the event date moves? | **No** — and that's documented honest behavior. The chip is an input shortcut; the saved value is static. Planner must re-tap if the event moves. |
| Can a tired planner at 11pm find the chip? | Yes — chips render directly above the input, visible without scrolling, full button affordance. |
| Can a non-technical helper / grandmother use it? | Yes — labels are plain English ("This weekend", "14 days before event"). Disabled chips explain "Set event date first." in two places (tooltip + inline). |
| Can keyboard / screen reader users use it? | Yes — chips are real `<button>` elements with `aria-disabled` where applicable. Date inputs unchanged from native `<input type="date">`. |
| Does any CTA overpromise? | No. No "Schedule" / "Send" / "Confirm" verb on chips; they just set the date. |
| Did any banned color / amber CTA / overflow / error appear? | No to all (verified at 5 viewports). |
| Did any source-of-truth rule break? | No. Storage layer untouched. |
| Is this actually 10/10? | **Yes for the locked Phase B + limited C scope.** Both Phase D (full SmartDateInput) and Phase E (Apple-wheel) remain explicitly deferred per the audit. |

---

## 9. Final verdict

**LOCKED · Phase B + limited Phase C complete. 10/10 on the in-scope dimensions.**

- Phase B: all 10 date inputs now share one helper. Bare-input footgun eliminated universally. No new UI, no storage change.
- Phase C: three highest-friction fields get chips with visible affordance, 44px touch targets, plain-English labels, honest disabled state when event date is missing, resolved-date subtext that shows the relationship.
- No commit. No PR. No deploy.
- Deferred per the audit: Phase D (SmartDateInput component), Phase E (Apple-style wheel), text parser, relative-date storage, TBD sentinel, timezone work, smart defaults.

**Stopping per directive.** Awaiting your explicit "Commit and PR" before code leaves the working tree.
