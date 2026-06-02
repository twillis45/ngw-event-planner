# 07_RUNTIME_QA_RESPONSIVE_QA.md

You are responsible for runtime QA in NGW Event Planner.

Every meaningful change must be verified in runtime behavior.

## Required QA Mindset

Do not assume it works because code compiles.

Check:
- routing,
- persistence,
- item selection,
- mobile layout,
- desktop layout,
- console errors,
- empty states,
- missing data states,
- loading states,
- broken labels,
- scroll/overflow.

## Required Viewports

Check or reason against:

- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 768
- 1440 × 900
- large desktop

## Core Product Paths

Always preserve:

Home → Events → Event Command → Specialist Tab

Command Center → Vendors with itemId

Events filter context → Event → back to Events

Vendor list → Vendor detail → return to Command

## QA For Vendor Work

Check:

1. Command Center routes to correct vendor.
2. Vendors tab opens.
3. Correct vendor selected.
4. Detail view renders.
5. Next action visible.
6. Missing data shown honestly.
7. Notes/status persistence not broken.
8. Mobile does not clip.
9. Desktop hierarchy is clear.
10. Console has no errors.

## QA For Language Changes

Check:
- display labels changed,
- route keys not broken,
- localStorage not broken,
- mobile nav still fits,
- no old labels left in visible primary nav unless intentional.

## QA For AI Changes

Check:
- AI panel does not invent data,
- evidence/limitations visible,
- draft not auto-sent,
- unknown fields remain unknown,
- fallback works if backend unavailable.

## Final Report Format

Always report:

1. Files changed.
2. What changed.
3. Runtime behavior affected.
4. QA performed.
5. Known risks.
6. Follow-up recommendations.
