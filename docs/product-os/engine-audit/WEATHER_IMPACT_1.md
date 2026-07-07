# WEATHER-IMPACT-1 — Event-Phase Weather Impact Intelligence

Date: 2026-07-07 · Slice type: build · Status: SHIPPED

## 1. Objective
Weather copy must answer the host's real question — *will it hit prep, arrival, the event, or after?* — not just "rain is likely on your day."

## 2. What was built
`weatherImpactByEventPhase(event, wx)` in `src/lib/weather.js`, wired into `WeatherAlert` (both mounts: host shell Command + EventPlanner Command).

## 3. Output contract
`{ hasImpact, confidence: 'hourly'|'daily'|'unknown', primaryPhase, affectedPhases[{phase,label,windowLabel,riskType→severity,summary,actionLabel,route}], headline, shouldPromptRainPlan, shouldPromptGuestUpdate, hourlyWindowUsed }`.

## 4. Data honesty rules enforced
- Real hourly windows only — `computeRainWindow` (48h coverage); beyond it → daily fallback.
- **No end-time field exists** → copy says "during or after the event (no end time is set)", never a bounded event window.
- **No setup/load-in/arrival/breakdown fields exist** → cautious phase language: "before your 2 PM start", "around arrival/start" — never "setup will be wet".
- No `startTime` → event-day copy: "Your start time isn't set, so it can't be matched…" while still showing the real window label.
- Daily-only → "hourly timing isn't available yet — confirm the rain plan without assuming when it will hit."
- Non-rain risks (heat/cold) keep the existing summary; no rain-phase claims.

## 5. Phase classification (hourly path)
Window fully before start−1 → `prep` (severity demoted to medium — lower urgency, stated). Window touching [start−1, start+1] → `arrival` (+ parking CTA). Window starting after start+1 → `event` ("during or after"). No start time → `event_day`.

## 6. CTAs (deep-link doctrine)
- Rain plan: `RAIN_PLAN_TARGET` (Event Details / rain-plan anchor). Label state-aware: "Add rain backup" ↔ "Review rain plan"; with a saved plan the alert echoes the plan text instead (pre-existing path).
- Arrival affected → "Confirm parking/arrival note" → parking-notes anchor.
- Arrival/event affected → "Draft guest update" → `guests-invites-<eventId>` (GUEST-UPDATE-1 consumer).
- All routes land on existing consumers; no dead CTAs.

## 7. UI wiring
Phase headline replaces the generic day summary (testid `weather-phase-headline`) whenever impact is available; extra phase CTAs render as a flex-wrap row (testids `weather-phase-cta-<focusField>`), gated on `hourlyWindowUsed` and `onNavTo`.

## 8. Tests
New `src/lib/__tests__/weatherImpact.test.js` — 9 contract tests covering: daily says timing unknown; after-start = during-or-after with no bounded window; arrival overlap + parking CTA; prep = before-start, demoted severity, no event-window claim; missing start time never invents a window; rain-plan state flips CTA + `shouldPromptRainPlan`; guest-update CTA routes to guests card; no setup/load-in/breakdown vocabulary in any payload; day always named; clear = no impact. Full suites: **2019/2019** frontend, build clean.

## 9. Live verification (local preview, disposable event `wi1-test-weather`, cleaned after)
- Daily-fallback headline rendered verbatim against the REAL forecast (57% rain, 1d out): "Rain risk is on Wednesday (your event day), but hourly timing isn't available yet…".
- "Add rain plan →" CTA landed the rain-plan field in-viewport (deep-link doctrine).
- Saved plan → CTA replaced by "Your rain plan:" echo; Day-Before card agreed ("Rain plan saved").
- Mobile (375px): no horizontal overflow, copy intact.
- Hourly-overlap branches verified by unit tests (real forecast had no hourly rain window — helper honestly fell back to daily; no window invented).

## 10. Live-discovered defect (flagged, out of slice)
`venueCity` on the fresh test event was found polluted with another event's venue string ("VFW Post 3150 — Alexandria, VA"), which `eventGeoQuery` prefers → garbage geocode → WeatherAlert silently absent. Spawned follow-up task (cross-event venueCity leak + defensive eventGeoQuery). Not caused by this slice.

## 11. Guardrails honored
No new weather API, no backend change, no geocoding change, no notifications, no invented times, no generic copy when phase impact is available.

## 12. Files changed
- `src/lib/weather.js` — new exported helper + `fmtHour`.
- `src/App.js` — import + phase headline + phase CTA row in WeatherAlert.
- `src/lib/__tests__/weatherImpact.test.js` — new.

## 13. Risks
Phase copy depends on `computeRainWindow` fidelity (already contract-tested); arrival window ±1h is a heuristic stated in cautious language. Guest-update CTA appears only with hourly confidence — deliberate (daily-only risk shouldn't push guest messaging).

## 14. Next
BUDGET-RECOVERY-AUDIT-1 (audit-only).
