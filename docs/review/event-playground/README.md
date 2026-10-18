# No Guesswork — Gathering Playground 05

Separate creative prototype requested after the Studio Matte v4 review. The user
explicitly lifted the old layout, navigation and motion constraints for this concept.
No production imports, shared engines, global doctrine or deployed app were changed.

Open `events-playground-v5.html`. It is self-contained, requires no network assets,
and uses original inline SVG illustrations rather than photographs of real venues.

## What to try

1. Browse Feeling with arrow buttons, mouse dragging, touch gestures or keyboard arrows.
2. Choose “This feels right.” The card transforms, the canvas changes and Undo is immediate.
3. Continue through Place, Food and Moment. Selected items change the estimate.
4. Shape it shows the choices together, with direct Change links.
5. Build a draft fills open choices with local sample rules while preserving chosen items.
6. Adjust guest count/target to see estimate changes and over-target feedback.
7. Personalize the name, occasion, must-have moment and photograph. Your day uses the selections.

## Deliberate differences from v4

Cream/purple/coral/lime palette, an illustrated event canvas, editorial typography,
three purpose-based destinations, tactile cards, explicit selection, visible completion
and an optional brief confetti response. The primary actions work with a mouse.
System reduced-motion preference and an in-app motion switch suppress movement.

## Truth boundaries

All prices, capacity assumptions and timing are invented planning examples. The
estimate is $600 essentials plus chosen items; unchosen items are excluded. Food
uses sample unit price × guest count. Nothing is booked, sent, paid or researched.
The draft builder is deterministic, not live AI and not the production DIFM engine.
Photographs are read into this tab only, never uploaded; all edits reset on reload.

## Verification

60 checks passed in Chromium at 390×844, 768×1024, 1024×768 and 1440×900, including
mouse drag, keyboard browse, choose/undo, completion, canvas updates, estimate math,
draft retention of choices, timeline carry-through, photo upload/removal, cancel,
budget warning, Escape and reduced motion. No script errors were observed.
Screenshots were reviewed at desktop, tablet and phone sizes. This is not a physical
device, assistive-technology or user-enjoyment study. This prototype is not a full
replacement for operational guest, supplier, messaging or financial workflows.

Run from repository root with Playwright available:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium node docs/review/event-playground/verify.cjs
```

The v1–v4 prototypes remain in `docs/review/studio-matte-ground-up/` for comparison.
