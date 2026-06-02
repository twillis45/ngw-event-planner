# UX_08 — Source-of-Truth UX and Data Honesty

NGW Event Planner shows operational data that planners use to make real decisions — decisions that affect real events, real vendors, and real money. Every datum displayed must be traceable to a source, and the app must never present fabricated, inferred, or placeholder data as real.

## The Source-of-Truth Rule

### Rule: Every displayed value must come from one of these sources

1. **User-entered data** — the planner typed it, selected it, or toggled it.
2. **Computed from user-entered data** — derived via deterministic logic from #1 (e.g., countdown from event date, budget total from line items).
3. **External system data** — fetched from an integrated external service (e.g., Supabase auth, Resend delivery status).
4. **Rule-based inference** — derived from documented business rules applied to #1/#2/#3, with the rule visible to the user.

### Rule: No 5th source

If a value doesn't fit categories 1-4 above, it cannot be displayed. There is no category for "seems like it should be this" or "placeholder until we have real data."

## Data Display Rules

### Rule: Missing data says "missing," not nothing

If a vendor has no day-of contact, the field must show "Not added yet" or "Missing — add a day-of contact." Do not:
- Leave the field blank (user thinks it didn't load)
- Show a dash "-" (ambiguous — is it empty or not applicable?)
- Hide the field entirely (user doesn't know it exists)

### Rule: Computed values show their inputs

When displaying a computed result (readiness score, budget estimate, countdown), the user must be able to see or access the inputs:

- Budget estimate: show the per-head rate, guest count, and factor adjustments.
- Readiness status: show which checks passed and which failed.
- Countdown: show the event date it's counting down to.

### Rule: Zero is a value, null is missing

- "0 vendors" = the planner has not added vendors yet → show "No vendors added" (empty state).
- "$0 estimated" = the estimate computes to zero → show "$0" with explanation ("No guests entered" or "No line items").
- "0 days" = event is today → show "Today" (not "0 days").

Distinguish between "the value is zero" and "the value was never entered."

## The "Where Did This Come From?" Test

For every number, status, or claim displayed in the UI, you must be able to answer: "Where did this come from?"

If the answer is:
- "From the event object's `guestCount` field" → OK
- "Computed: `event.budget.lineItems.reduce(sum)` → OK
- "Returned from `getEventReadiness()` which checks vendor.contract, vendor.dayOfContact, etc." → OK
- "I put it there because the screen looked empty" → NOT OK
- "It's a placeholder we'll replace later" → NOT OK
- "It looks about right for this type of event" → NOT OK

## Readiness and Risk Data Rules

### Rule: Readiness status requires checkable evidence

The three-state readiness model (ON_TRACK / ATTENTION / AT_RISK) must be derived from specific, enumerable checks:

```
Vendor readiness: AT_RISK because:
  ✗ Contract not attached
  ✗ Day-of contact missing
  ✓ Primary contact exists
  ✓ Category assigned
```

### Rule: Never display a readiness percentage

"85% ready" implies precision that doesn't exist. What does 85% mean? Which 15% is missing? The planner needs to know WHAT is missing, not a fake confidence number.

Use categorical states (ON_TRACK / ATTENTION / AT_RISK) with specific evidence, not percentages.

### Rule: Risk assessments cite the triggering condition

"At Risk" by itself is anxiety without direction. Always pair with the trigger:

Good: "AT RISK — final guest count not confirmed, 5 days until caterer deadline"
Bad: "AT RISK"
Bad: "AT RISK — multiple issues detected"

## Budget and Financial Data Rules

### Rule: Never fabricate financial figures

- Estimated budget: derived from `PER_HEAD[category] × guestCount × factors`. The formula and inputs are visible.
- Actual budget: sum of user-entered line items. Only shown when line items exist.
- Payment status: user-attested (they marked it paid). Not verified against bank records.
- Vendor amounts: user-entered contract values. Not verified against vendor invoices.

### Rule: Distinguish estimates from actuals

| Data Type | Label | Style |
|---|---|---|
| User-entered actual | "$12,500" | Standard `C.fg` text |
| Computed estimate | "~$12,500 est." | `C.muted` text with "est." suffix |
| No data | "Not entered" | `C.muted` italic |

Never display an estimate without the "est." marker. The planner must always know whether they're looking at a real number or a computed guess.

## AI and Inference Data Rules

### Rule: AI output is always labeled as AI output

When an AI model generates content (vendor follow-up draft, readiness summary, suggested questions), the output must be visually marked:

- Label: "AI-generated" or "Rule-based readiness preview"
- Visual: subtle border or background tint distinguishing AI content from user/system data
- Evidence: "Based on: [list of inputs]"
- Limitations: "This analysis may miss factors not tracked in the app."

### Rule: AI suggestions require explicit user action

AI never auto-applies. Every AI suggestion shows a review UI:
- Copy Draft (to clipboard)
- Create Task from Suggestion
- Dismiss
- Edit Draft

No silent mutations. No auto-sends. No background changes.

### Rule: When AI backend is not connected, say so

```
Rule-based readiness preview · AI connection not enabled yet
```

This is the required fallback when the Anthropic API is not configured. Never show fake AI output — show honest rule-based analysis with an honest label.

## Persistence and Sync Honesty

### Rule: Show save state

When data is saved, the user must know:
- **Saved locally**: data lives in localStorage (icon: device)
- **Saved to cloud**: data synced to Supabase (icon: cloud)
- **Saving**: sync in progress (icon: spinner)
- **Save failed**: sync error (icon: warning, with retry)

### Rule: Never claim cloud save when it's localStorage

If `isSupabaseConfigured()` returns false, the app runs on localStorage. The UI must not claim "Saved" in a way that implies cloud durability. Show "Saved locally" or "Saved to this device."

### Rule: Sync conflicts are surfaced, not hidden

If localStorage data conflicts with cloud data during migration, surface the conflict: "Local changes found — would you like to keep local data, cloud data, or review both?"

Never silently overwrite.

## Single Source of Truth for Each Data Domain

| Domain | Source of Truth | Location |
|---|---|---|
| Event list | `events` state (App.js) | localStorage or Supabase |
| Client list | `clients` state (App.js) | localStorage or Supabase |
| Vendor data | `event.vendors[]` | Within event object |
| Timeline | `event.tasks[]` | Within event object |
| Decisions | `event.decisions[]` | Within event object |
| Budget | `event.budget` | Within event object |
| Communication | `event.messages[]` (local) or commApi (backend) | localStorage or API |
| Profile / settings | `profile` state | localStorage or Supabase |
| Readiness | Computed: `getEventReadiness(event)` | No persistence — recomputed each render |
| Next action | Computed: `selectEventNextAction(event)` | No persistence — recomputed each render |

### Rule: Never duplicate a source of truth

If vendor data lives in `event.vendors[]`, do not create a second vendor store, a vendor cache, or a separate vendor state. One source. One write path. One read path.

### Rule: Computed values are never persisted

Readiness status, next action, attention counts, budget estimates — these are always recomputed from current data. Never save a computed value and display the stale cached version. If the inputs change, the output changes on the next render.

## Data Honesty Checklist

Before shipping any surface, verify:

1. Every number traces to user-entered data or a documented computation.
2. Missing data says "missing" or "not added yet" — never blank, never a dash.
3. Estimates are labeled "est." and show their inputs.
4. AI content is labeled and requires user action.
5. Readiness states cite specific evidence.
6. No percentages for readiness/confidence.
7. Save state accurately reflects persistence layer (local vs. cloud).
8. No values fabricated for visual completeness.
