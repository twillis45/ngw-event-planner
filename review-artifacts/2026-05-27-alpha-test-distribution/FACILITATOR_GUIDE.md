# Facilitator Guide — Sprint 45 Alpha Sessions

**Purpose:** Run 3–5 coordinator sessions. Collect real behavioral data. Make Tier 1 Go/No-Go decision from evidence, not theory.

---

## Pre-session checklist (do before each tester)

- [ ] Assign tester ID — TEST-001, TEST-002, TEST-003, TEST-004, TEST-005 (sequential)
- [ ] Personalize and send invitation email with the correct `?tid=TEST-###` URL
- [ ] Create a folder: `sessions/TEST-###/` to store their export + recording
- [ ] Confirm the GitHub Pages deploy is live: `https://twillis45.github.io/ngw-event-planner/?slice=orchestration&observe=1&tid=TEST-001`
- [ ] Note tester background (role, years exp, event type) — cross-check against what they enter in the tool

## Session posture

**If facilitating in person:** Sit on the opposite side of the device. Watch their face, not the screen. Do not explain anything before they start. Do not help them when they're stuck — the confusion is the data.

**If facilitating remotely:** Ask them to share their screen (Zoom, FaceTime, Google Meet). Turn off your camera and stay silent. You're observing, not guiding.

**If unmoderated (async):** They follow the in-app instructions and email you the export + recording. No live facilitation needed. This is the preferred method for Sprint 45 due to logistics.

## What to watch for (in-person / live observation)

| Signal | What it means |
|---|---|
| Long pause before first tap (>10s) | Orientation failure — they don't know where to start |
| Immediate tap on identity strip or FRAGILE item | Hierarchy is working |
| Scroll immediately to bottom | They're looking for navigation, not operational content |
| Verbally expresses confusion | Mark timestamp; note exactly what they said |
| Taps same element repeatedly | Expecting an interaction that isn't there |
| Leaves app (home screen, tab switch) | Interruption or abandonment |
| Says "oh" or "wait" | Moment of recognition — positive signal |
| Puts phone down | Session is over, whether they know it or not |

## Reading the export

When you receive the pasted export JSON, look at these fields first:

```json
"summary": {
  "participation": {
    "engaged": true/false,
    "firstOrchestrationTapMs": ...,
    "operationalRatio": ...,
    "vendorZoneReached": true/false,
    "firstScrollMs": ...
  },
  "interruptions": {
    "count": ...,
    "avgAbsenceSec": ...,
    "maxAbsenceSec": ...,
    "longAbsences": ...
  }
}
```

**Primary gates:**
- `engaged: true` — tester tapped at least one operational element (sequence item, vendor, event card)
- `firstOrchestrationTapMs < 10000` — first operational tap within 10 seconds

**Secondary reads:**
- `operationalRatio` > 0.4 → they were engaging with content, not just controls
- `vendorZoneReached: true` → they scrolled deep enough to see vendor section
- `firstScrollMs` < 5000 → they scrolled early (exploring, not stuck)
- `longAbsences > 0` → they left the app during the session (interruption or abandonment)

## After all 5 sessions — synthesis questions

Answer each with direct evidence from the export data:

1. **Did engagement emerge naturally?** (operationalRatio across all sessions)
2. **How fast did they find operational content?** (firstOrchestrationTapMs, median across sessions)
3. **Did they scroll deep enough?** (vendorZoneReached, firstScrollMs)
4. **Were there session interruptions?** (interruptions.count, maxAbsenceSec)
5. **What was the most common confusion?** (feedback `confusing` field across sessions)
6. **Would they use it?** (feedback `use_real` scale, median)
7. **Did the feedback align with the behavioral data?** (e.g., said "easy to navigate" but never tapped operational content)

## Go/No-Go criteria for Tier 1

| Gate | Threshold | Decision if missed |
|---|---|---|
| `engaged: true` | All 5 sessions | NO-GO — design is not drawing operational interaction |
| `firstOrchestrationTapMs` | Median < 10s | CONDITIONAL GO — architecture needs entry cues |
| `use_real` scale | Median ≥ 7/10 | CONDITIONAL GO — value perception gap |
| `confusing` | No systemic theme | CONDITIONAL GO — investigate named confusion |
| `vendorZoneReached` | ≥ 3 of 5 sessions | Watch signal — vendor zone is not visible enough |

**GO:** All gates pass. Proceed to Tier 1 production infusion.  
**CONDITIONAL GO:** Specific failures with clear root cause. Fix the root cause, run 2 additional sessions.  
**NO-GO:** `engaged: false` in >2 sessions, or systemic confusion. Document the failure, do not proceed to Tier 1.

## Data storage

```
demo/review-artifacts/2026-05-27-alpha-test-distribution/
  sessions/
    TEST-001/
      export.json          ← pasted export, re-saved as JSON
      recording.mp4        ← screen recording from tester
      notes.md             ← facilitator observations (if in-person)
    TEST-002/
      ...
  AGGREGATE_FINDINGS.md    ← written after all sessions complete
```

## What NOT to do

- Do not explain the UI before the session starts
- Do not help when they're confused — wait and watch
- Do not edit the export data
- Do not fabricate sessions (Sprint 44 established what this costs)
- Do not call a GO based on 1–2 sessions — 3 minimum for any verdict
