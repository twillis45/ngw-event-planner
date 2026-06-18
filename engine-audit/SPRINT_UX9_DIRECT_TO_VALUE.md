# Sprint UX-9 — Direct To Value · Final Report

**Date:** 2026-06-18 · **Branch:** `main` @ `f9a2737` · Suite **250/250** · build compiles.
Implements the UX-8 recommendation. **Host accounts only; planner workflow untouched.**

## 1. Files changed
- `src/App.js`:
  - `createNow` — host branch creates + lands on **Host Home directly** (`onClose()`), sets a
    one-time welcome flag; planner keeps `setStep('success')`.
  - `step1Valid` / `hostMode` moved above it; **name optional for hosts**; auto-name
    `My {Type}` when blank.
  - Event-name label/error → "optional" for hosts.
  - **Date chips gated off for hosts** (picker only); planner keeps chips.
  - `HostWelcomeCard` component + render on Host Home (the relocated receipt).

## 2. Screenshots
- `review-artifacts/ux9_direct_to_value.png` — host: **"My Graduation"** (auto-named) Host Home
  with the **"DONE FOR YOU — We've already started planning for you"** card (✓ timeline ✓ budget
  outline ✓ vendor categories ✓ event-day schedule, dismissible) → "Add your guest list". **No
  success modal.**
- `review-artifacts/ux9_host_*` / planner QA confirms chips + required name + 3-step preserved.

## 3. Before vs after — click count
| | Before | After |
|---|---|---|
| Path | Create → **Success modal** → Start planning → Host Home | Create → **Host Home** |
| Clicks to first value | **3** (Start event · Create · Start planning) | **2** (Start event · Create) |
| Required fields | **3** (name · type · date) | **2** (type · date) |
| Screens before value | 2 (create + success) | 1 (create) |
| Date paradigms | 2 (chips + picker) | 1 (picker) |

## 4. Time-to-value
One fewer screen, one fewer click, one fewer required field, one fewer date paradigm. The
confidence signal (the create receipt) is **preserved** — relocated onto the first Host Home
view instead of gating it. Net: a host reaches their scaffolded event + named next step in **2
taps and 2 fields**, with the "look what we built for you" proof intact and dismissible.

## 5. Risks
- **Auto-name** uses the raw type ("My Graduation", "My Birthday Party"). Reads naturally; the
  host can rename anytime in Event Details. Low.
- **Welcome flag** is a single global key (`ngw-host-welcome`) — only the most-recently-created
  event shows the card; matched by id, cleared on dismiss. Correct for the "shown once" intent.
- **Success-modal extras gone for hosts** ("Add another event" / "Add vendor" buttons) — hosts
  use Host Home's "+ New event" + the next-step flow instead. Intended.
- **Chips removed for hosts** — a host who wanted a quick relative date loses the shortcut, but
  hosts know their exact event date; the picker is the honest single paradigm. Low.

## 6. Recommendation
**Ship.** The remaining friction between creation and first value is gone: a host now goes
**type → date → Create → Host Home** in 2 taps, with the create receipt preserved as a
one-time card and the named next step ("Add your guest list") immediately in front of them.
Planner accounts keep their full create + success + intake. The product reads "**start planning
now**," not "fill out a questionnaire first."

**Stop after UX-9.**
