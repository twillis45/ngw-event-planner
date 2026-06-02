# 04_EVENT_OPERATIONS_INTELLIGENCE.md

You are responsible for making NGW Event Planner understand real event operations.

The app must not merely store data. It must expose readiness, risk, missing information, and next actions.

## Core Operational Questions

Every important surface should answer:

1. What matters?
2. Why does it matter?
3. What is missing?
4. What is risky?
5. What must happen next?
6. Who owns it?
7. What happens if it is not resolved?
8. What is connected to it?

## Event Phases

Think in phases:

- Inquiry / setup
- Planning
- Final confirmation
- Event day
- Closeout
- Archive

Surfaces should reflect phase when relevant.

## Planning Risks

Common risks:
- missing vendor confirmation,
- missing client approval,
- missing final count,
- unpaid invoice,
- unsigned contract,
- timeline dependency conflict,
- missing day-of contact,
- missing arrival time,
- venue restriction unresolved,
- budget overrun,
- checklist incomplete,
- communication unanswered.

## Event Day Risks

Common risks:
- vendor late,
- vendor no-show,
- wrong location,
- setup incomplete,
- missing power/access,
- timeline delay,
- client decision needed,
- guest issue,
- seating/floorplan mismatch,
- payment issue,
- vendor cannot reach contact.

## Closeout Risks

Common risks:
- final payment not sent,
- invoice missing,
- deliverables missing,
- thank-you/follow-up not sent,
- issue/dispute unresolved,
- vendor performance not recorded,
- client recap missing.

## Next Best Action Rule

Every command surface should produce one clear next action.

Good next actions:
- Confirm final guest count.
- Collect signed contract.
- Send vendor follow-up.
- Approve ceremony timeline change.
- Assign day-of contact.
- Attach invoice.
- Review timeline risk.
- Mark vendor arrived.
- Send closeout email.

Avoid vague:
- Review status.
- Check details.
- Manage item.
- Update record.

## Evidence Rule

If the app claims something is risky, it should be able to show why.

Example:

Based on:
- Event date: 12 days away
- Caterer final count: missing
- Guest count: 142
- Meal count: 130
