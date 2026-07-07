# WCGW-ROUTE-1 — Per-Risk Deep Links on What Could Go Wrong

Date: 2026-07-07 · Slice type: CTA repair (last imprecise CTA class) · Status: SHIPPED

## 1. Verdict
WhatCouldGoWrongPanel rows could only Learn/Mark/Acknowledge/Dismiss — never GO to where the fix happens. Now every risk routes to its exact fix surface or stays honestly informational (no dead CTAs).

## 2. Router (`riskFixRoute`, App.js)
Tiered, deterministic:
1. weather/rain/storm/heat → "Add rain backup" → Event Details · rain-plan
2. parking/arrival directions → "Add parking details" → parking-notes
3. schedule/timing/run-of-show → "See the day plan" → Event Day Schedule · ros-now
4. **mitigation-first**: supplies-fix keywords (bug spray, citronella, shade, ice, cooler, canopy, tent, sunscreen, trash bags, extra chairs) → "Open supplies" → cap-hero anchor — the mitigation names the FIX, the trigger names the symptom (live-found: "Mosquitoes run guests off" was routing to the guest list; the fix is bug spray)
5. shared `milestoneActionRoute` on the mitigation, then trigger+mitigation (earliest-keyword-wins, first-undone vendor rule)
6. Timeline fallback → null = informational by design (CTA hidden, row keeps Learn/Mark/Dismiss).

## 3. Wiring
All 4 panel call sites (host shell Guests + NOW, EventPlanner Guests + NOW) pass `onNavTo`; vendor routes forward vendorId; buttons `data-testid="risk-fix-<id>"` with precise labels (Open supplies / Open the guest list / Open the vendor / Open the budget / Open the food plan).

## 4. Verification
Live: mosquito risk → "Open supplies →" → cap-hero anchor landed in-viewport; schedule risk → "See the day plan". Tests: `src/__tests__/wcgwRoute.test.js` (shared-router resolution + source contract: 4 wired call sites, weather/parking tiers, informational guard). Suites 2078/2078 · backend 97/97 · build clean.
