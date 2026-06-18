# Sprint UX-F1 — Host Home Flagship Frame

**Date:** 2026-06-18 · **Mode:** Product-definition (Figma)
**Figma:** `Event Boss — Host Home (Flagship)` — file `TmlcPCgRIzrXhti5B4e7Tm`, frame node `1:2`
[open](https://www.figma.com/design/TmlcPCgRIzrXhti5B4e7Tm/Event-Boss-%E2%80%94-Host-Home-(Flagship)?node-id=1-2)
**Screenshot:** `review-artifacts/ux_f1_host_home_flagship.png`
**Spec:** 390px-first · single column · Studio Matte · thumb-friendly · no overflow · ≤5-second comprehension.

This is the **definitive** Host Home, not a wireframe — built from the Host Activation /
UX-2 / ACT-1 / UX-3 findings, with Studio Matte tokens pulled from the shipped code
(`canvas #070809 · card #1c2227 · text #e8edf2 · steel #849eb8 · green #3a8a62 · amber
#d4904a · steel-blue #4E6877`). It is allowed to break the old layout where the audits
demand it.

## The frame, top to bottom (rationale per section)

1. **Header bar — "Event Boss · + New event · ⚙"**
   *Why:* one line of identity + the only two studio-level actions a host needs (start
   another event; settings). **No CRM rail** — no Pipeline / Clients / Vendor Bank /
   "studio." Resolves the PP-3 violation at the front door.

2. **Event Header — "Maya's Graduation Party / July 15 · 27 guests · 27 days away"**
   *Why:* answers *"what event is this?"* in one glance. Title is the loudest thing on the
   screen; the countdown ("27 days away") is the one emphasized fact because time is the
   host's real pressure. No type taxonomy, no planner metadata.

3. **Next Step (hero) — "Add your guest list."**
   *Why:* answers *"what do I do next?"* — and it is a **simple win**, not a "Decide:"
   prompt (ACT-1's #1 finding, now shipped in the spine). Steel-blue accent + single CTA =
   one unambiguous action. The consequence line ("the first domino — it sizes the budget,
   the food, and the schedule") earns the action without nagging. **One action only** — no
   competing buttons.

4. **What Matters Most — identity statement + the must-have moment**
   *Why:* answers *"what matters?"* — the emotional core (Event Identity, 60B). "This is a
   celebration of Maya's achievement" + "The one thing that must happen: her whole family
   there for the diploma walk." **Conditional:** renders only when meaning was captured at
   intake; absent otherwise (no empty shell).

5. **Progress — honest, percentage-free**
   *Why:* "How it's coming along" with **Done / In progress / Not started** only — no fake
   percentages, no vanity completion (UX-3). Green ✓ for Done, amber for In progress, steel
   for Not started. Coherent with the next step: Guests is *Not started* (hence the hero),
   Venue *Done*, Schedule *In progress*.

6. **View Event Day — prominent, reachable**
   *Why:* the host's #1 day-of surface gets a dedicated, elevated full-width row with a
   forward arrow — always one tap away, never buried in a "More" drawer (the UX-1 mobile
   failure).

## What was REMOVED (and why)

- **The entire planner CRM L1** — Pipeline, Client Events, Clients, Vendor Bank, "Name your
  studio." A host has *an event*, not a *book of business* (PP-3).
- **Competing create entry points** — collapsed to one hero CTA in the body (the header
  "+ New event" is for *additional* events, not the primary action).
- **Type/kit/budget-estimator from the first glance** — those are creation-time decisions
  (ACT-1 #1/#3), not Host-Home furniture.
- **Percentages / readiness scores** — replaced with honest 3-state progress.

## What remains HIDDEN until it earns a place (UX-3 progressive disclosure)

- **Vendors** — no card until a vendor exists.
- **Documents / Paperwork** — no card until a document exists.
- **Decisions** — no "decisions" surface on a brand-new event.
- **Planning Health / "Where things stand"** — no all-empty readiness rail.
- **"Needs You" / "Nothing needs you yet"** — no empty-state noise of any kind.

No placeholders. No "nothing here yet." A surface appears the moment it has something true
to say — and not before.

## Why this is the correct front door

In **≤5 seconds** a first-time host reads, in order: **what this is** (header), **what
matters** (identity), **what to do next** (one hero action) — then can reach **Event Day** in
one tap. Everything competing for that attention has been removed or deferred. It cannot be
mistaken for planner software because there is no planner software on the screen: no pipeline,
no clients, no jargon, no empty operational cockpit. It is *the host's one event, and the one
next move* — which is exactly what activation requires.

The shipped product already implements the behaviors this frame depends on (host-default
experience, "Add your guest list" first step, hidden empty Stage-1 cards, Host Home with these
five sections). This frame is the **canonical target** those surfaces converge on.

## Challenge log (every element justified)

| Element | Kept? | Justification |
|---|---|---|
| Header brand + New event + settings | ✓ | Minimum studio chrome; no CRM |
| Event title + countdown | ✓ | "What is this?" in one glance |
| Next Step hero (single CTA) | ✓ | "What next?" — the activation pivot |
| Identity statement + must-have | ✓ (conditional) | "What matters?" — the human core |
| Progress (3-state) | ✓ | Honest orientation; no vanity metrics |
| View Event Day | ✓ | The host's day-of destination, reachable |
| Vendors / Docs / Decisions / Health | ✗ (hidden) | Nothing true to say yet → no card |
| Percentages / CRM / type taxonomy | ✗ (removed) | Noise or planner-only |
