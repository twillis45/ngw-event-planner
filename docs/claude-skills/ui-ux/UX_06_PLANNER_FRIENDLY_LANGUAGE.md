# UX_06 — Planner-Friendly Language and Copy

Every word in the UI is a product decision. Language in NGW Event Planner must do three things: (1) tell the planner what's happening, (2) tell them why it matters, (3) tell them what to do. If copy doesn't do at least one of these, cut it.

## Voice Principles

### Calm, competent, direct

The app speaks like an experienced lead coordinator briefing a planner. Not like a tech startup ("Awesome! You're crushing it!"), not like a robot ("Item 47 status: pending"), not like a worried intern ("WARNING! URGENT! IMMEDIATE ACTION REQUIRED!").

Good: "Final guest count not confirmed — caterer needs this 7 days before the event."
Bad: "URGENT: Guest count data is missing from the system!"
Bad: "Hey there! Looks like you haven't added your guest count yet."

### Consequence over status

The word "pending" communicates nothing. What's pending? Why should the planner care? What breaks if they ignore it?

| Bad | Better |
|---|---|
| Pending | Waiting on signed contract |
| Missing contact | Day-of contact missing — no one to call if setup is delayed |
| 3 issues | 3 vendor items are blocking event readiness |
| Documents missing | Contract not attached — booking record is incomplete |
| Overdue | 5 days past due — vendor payment at risk |
| Incomplete | Timeline has 3 items without assigned vendors |
| Active | Planning in progress — 14 days until final confirmation window |

### Rule: Never use "pending" as a status label

"Pending" is meaningless. Replace with what the planner is actually waiting for:
- Waiting on client approval
- Waiting on signed contract
- Waiting on vendor confirmation
- Waiting on final count
- Waiting on deposit payment

## Label Rules

### Navigation Labels

L1 (sidebar): Home, Events, Clients, Schedule, Studio Setup.
L4 (tabs): Command, Vendors, Decisions, Timeline, Checklist, Communication, Calendar, Run of Show, Budget, Guests, Seating, Manage Event.

Rule: Display labels may differ from route keys. `route: 'calendar'` → display: "Schedule". `route: 'settings'` → display: "Studio Setup". Never change route keys to match display labels — that breaks persistence.

### Section Headers

Format: `[What This Section Is]` — no articles, no verbs, noun phrases only.

Good: "Vendor Readiness", "Planning Phase", "Day-Of Control", "Start Here"
Bad: "Your Vendor Readiness Status", "Manage the Planning Phase", "Here Are Your Day-Of Items"

### Rule: No greeting text in section headers

"Welcome back!" is not a section header. "Your events" is not a section header. "Here's what's happening" is not a section header. Just: "Events", "Start Here", "Today's Command".

## Status and State Language

### Three-State Vocabulary

Use this vocabulary consistently across all surfaces:

| State | Visual | Example Labels |
|---|---|---|
| ON_TRACK | Green | On Track, Confirmed, Complete, Booked, Safe |
| ATTENTION | Amber | Needs Attention, Approaching, Incomplete, Waiting |
| AT_RISK | Red | At Risk, Overdue, Blocking, Critical, Missing |

### Rule: State labels are always paired with context

Never show "AT RISK" alone. Always: "AT RISK — final count missing, 5 days to event."
Never show "ON TRACK" alone. Always in a context where the user understands what's being measured.

### Time-Relative Language

| Condition | Format |
|---|---|
| Today | "Today" |
| Tomorrow | "Tomorrow" |
| Within 7 days | "In X days" or "Xd" (compact) |
| Within 30 days | "In X days" |
| Past due | "X days ago" or "Xd ago" (compact) |
| Far future | Date format "Mon DD" or "Mon DD, YYYY" |

Rule: Show countdown for upcoming events within 60 days. Show absolute date for events further out. Show "X days ago" for past events within 30 days. Show "Mon DD, YYYY" for older past events.

## CTA Language

### Rule: CTAs are verbs that describe what happens next

Good: "Confirm Vendor", "Send Follow-up", "Add Guest Count", "Review Timeline"
Bad: "Go", "View", "Open", "Manage", "Details"

"View" is acceptable only when the CTA literally opens a read-only view. For any action surface, use the specific verb.

### Rule: Destructive CTAs name the destruction

Good: "Delete Event", "Remove Vendor", "Cancel Booking"
Bad: "Delete", "Remove", "Cancel"

The user must know what they're destroying without reading the surrounding context.

### CTA Truthfulness

Every CTA must accurately describe what happens when tapped. The truthfulness taxonomy:

| Level | Definition | Label Rule |
|---|---|---|
| DONE | Action is fully wired end-to-end | Use the real verb: "Send Email", "Save Changes" |
| DEEP HANDOFF | Opens a real external tool/flow | "Open in [Tool]", "Call [Name]" |
| LIGHT HANDOFF | Copies or prepares, user completes elsewhere | "Copy Draft", "Copy to Clipboard" |
| RECORD-ONLY | Records user intent in local state | "Mark as Sent", "Confirm Arrival" |
| DRAFT-ONLY | Creates a draft the user must review | "Generate Draft", "Preview Message" |
| STUB | Route/view exists but feature is minimal | Must show "(coming soon)" or "Preview" |
| PLANNED | No code exists yet | Do not show the button |

### Rule: Never show a fully-styled CTA for a PLANNED feature

If the feature doesn't exist yet, the button doesn't exist. No "coming soon" buttons styled as primary actions. If you must indicate a future feature, use muted text: "Email delivery coming soon" — not a button.

### Rule: Record-only CTAs must be honest

"Mark as Sent" records that you sent it — it does NOT actually send anything. The label must make this clear. Bad: "Send Payment" (when it actually records a payment as sent). Better: "Mark Payment Sent" or "Record Payment".

## Empty State Language

### Rule: Empty states explain what goes here and how to start

Bad: "No items."
Bad: "Nothing to show."
Good: "No vendors added yet — add your first vendor to start tracking booking and readiness."
Good: "No events this week. Your next event is [Event Name] on [Date]."

### Rule: Empty states have a CTA when appropriate

If the empty state can be resolved by the user (add a vendor, create an event), include a CTA button:
"No vendors yet" + [Add Vendor] button.

If the empty state is informational (no events this week), no CTA needed — just the helpful context.

## Error and Warning Language

### Rule: Errors describe what happened and what to do

Bad: "Error"
Bad: "Something went wrong"
Good: "Could not save — check your internet connection and try again."
Good: "Vendor name is required."

### Rule: Warnings describe consequence, not just presence

Bad: "Warning: Missing information"
Good: "Day-of contact missing — without this, no one can be reached if setup is delayed."

## Tone Calibration

### What the app is NOT

- A coach: No "Great job!", "You're doing amazing!", "Keep it up!"
- A friend: No "Hey there!", "Oops!", "Uh oh!"
- A bureaucrat: No "Please be advised that the following items require your attention."
- A robot: No "Item_47 status: PENDING_REVIEW. Action required."

### What the app IS

A lead coordinator's briefing book. Factual, specific, consequential, calm. It respects the planner's expertise and time. It doesn't explain what a vendor is. It tells the planner which vendor needs attention and why.

## Copy Checklist

Before shipping any UI text, verify:

1. Does every visible status label explain WHY, not just WHAT?
2. Does every CTA use a specific verb?
3. Are empty states helpful, not blank?
4. Is the tone calm and professional (not excited, not robotic)?
5. Does every warning describe a consequence?
6. Is "pending" used anywhere? (If yes, replace it.)
7. Are button labels truthful about what happens when tapped?
8. Does the copy make sense to a first-time planner?
