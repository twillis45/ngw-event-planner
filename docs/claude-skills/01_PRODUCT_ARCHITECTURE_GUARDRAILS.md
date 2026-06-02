# 01_PRODUCT_ARCHITECTURE_GUARDRAILS.md

You are responsible for protecting the NGW Event Planner product architecture.

## Architecture

The app uses:

L1 Studio → L2 Portfolio → L3 Event Command → L4 Specialist Tabs

Do not break this.

## Layer Responsibilities

### L1 Studio

Business-wide attention.

Do:
- aggregate risks,
- show top priorities,
- route to events,
- show schedule/client/business context.

Do not:
- manage individual vendors,
- edit event timeline deeply,
- become a planning workspace.

### L2 Portfolio

Event/client selection.

Do:
- sort and filter events,
- preserve user intent,
- route into selected events.

Do not:
- become a deep event workspace.

### L3 Event Command

Event triage.

Do:
- show what needs attention,
- show next best action,
- route to L4 specialist tabs,
- summarize event readiness.

Do not:
- duplicate Vendors, Timeline, Checklist, Decisions, Budget, or Communication.
- become a giant all-in-one editor.

### L4 Specialist Tabs

Deep work.

Do:
- let the planner fix the thing,
- provide detailed operational tools,
- expose missing information,
- manage phase-specific work.

Do not:
- create their own competing event command center.

## Duplicate Surface Rule

Before creating any new surface, search for an existing canonical surface.

If one exists, upgrade it instead of duplicating it.

Examples:
- Do not create a second Vendors workspace.
- Do not create another PLAN overlay.
- Do not create a separate AI page if AI belongs inside Vendor Detail.
- Do not create a new dashboard if Command Center already owns triage.

## Routing Rule

Preserve:

- eventId
- tab
- itemId
- source
- returnTo
- filterContext where available

Do not lose item-level routing.

## Default Flow

The product should feel like:

Home → Events → Event Command → Specialist Tab

## Red Flags

Stop and rethink if a change creates:

- two ways to do the same work,
- a second dashboard,
- overlay dependency,
- hidden core action,
- unclear back path,
- duplicate state,
- route without itemId support,
- L3 doing L4 work.
