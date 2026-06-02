# Sprint 45 — Alpha Test Distribution
**Date:** 2026-05-30  
**Sprint mandate:** Prepare the application for external alpha testing. Not a feature sprint — a distribution sprint. At the end: send a URL, recruit 3–5 coordinators, collect recordings, collect exports, collect feedback, and analyze results without needing another architecture sprint.

---

## 1. What Was Built

### AlphaTesterGate (new component)

`demo/src/AlphaTesterGate.jsx` — React component implementing the full alpha session flow:

```
register → consent → session → feedback → complete
```

**Registration screen:** Name, email, role (7 options), years experience, primary event type. Tester ID sourced from `?tid=TEST-###` URL param (facilitator-assigned) or auto-generated as `TEST-{timestamp}`.

**Consent screen:** What the tool collects, screen recording instructions (iPhone + Android), what to expect during the session, and a Begin button.

**Session screen:** Renders `{children}` (OrchestrationSlice) with an End Session button fixed at bottom. The session is live — observationKit is recording throughout.

**Feedback screen:** 9 questions:
- What drew your attention first? (text)
- What felt confusing? (text)
- Did you know where to begin? (1–5 scale)
- Did the environment help you stay oriented? (1–5 scale)
- Did transitions feel easier than a static list? (1–5 scale)
- Did anything feel distracting? (text)
- Would you use this during a real event? (1–5 scale)
- Rate usefulness 1–10 (rating)
- Rate trust 1–10 (rating)
- Additional comments (text, optional)

**Complete screen:** Session export displayed in a scrollable code block, Copy Export button, instructions to email the export + recording.

### observationKit.js (extended)

Two new exported functions:
- `setTesterProfile(profile)` — attaches registration data to session before export
- `setSessionFeedback(feedback)` — attaches feedback responses to session before export

Session object now includes `testerProfile` and `sessionFeedback` fields.

### index.js (wired)

`AlphaTesterGate` lazy-loads when `?slice=orchestration&observe=1`. Wraps `SliceHarness` in gate. No gate when observe param is absent — facilitator/developer can still access raw slice at `?slice=orchestration`.

---

## 2. Deployment Architecture

### Frontend: GitHub Pages (existing)

URL: `https://twillis45.github.io/ngw-event-planner/`

The React demo already deploys to GitHub Pages. No new hosting is needed. Alpha testers use the existing domain with URL parameters:

```
?slice=orchestration&observe=1&tid=TEST-001
```

**Deploy command (when ready to push):**
```bash
cd demo && npm run build && gh-pages -d build
```
*(or via the existing GitHub Actions workflow, if configured)*

### Backend: Render (Python FastAPI)

`render.yaml` covers only the Python backend at `ngw-events-api.onrender.com`. The alpha test does not require any backend API calls — all session data is stored client-side in localStorage and exported manually. No backend changes needed for Sprint 45.

### Data flow

```
Tester device (iPhone Safari)
  └── AlphaTesterGate: registration + consent
  └── OrchestrationSlice: session (observationKit recording to localStorage)
  └── AlphaTesterGate: feedback (setSessionFeedback → localStorage)
  └── exportSession() → JSON string → clipboard
  └── Email to facilitator
        └── facilitator saves export.json + recording.mp4
              └── Sprint 46: aggregate analysis → Tier 1 verdict
```

### Why no backend for data collection

3–5 testers. One export per tester. Manual email collection is sufficient and has zero infrastructure risk. A backend collection endpoint would add complexity (auth, storage, CORS, schema) with no analytical benefit at this scale.

If the alpha expands beyond 10 testers, revisit. At 3–5, the email-paste method is the right call.

---

## 3. Session URL Architecture

| URL | Who uses it | What loads |
|---|---|---|
| `?slice=orchestration&observe=1&tid=TEST-001` | Alpha tester | Gate → Register → Consent → Slice → Feedback → Complete |
| `?slice=orchestration&observe=1` | Tester without pre-assigned ID | Same flow, auto-generated ID |
| `?slice=orchestration` | Facilitator/developer preview | Raw slice, no gate |
| `?slice=orchestration&observe=1&tid=TEST-001&name=Jane` | Tester with name pre-fill | Gate pre-fills name field |

---

## 4. Data Collection Architecture

### Per-session data

**What the export contains:**
```json
{
  "id": "obs_1748600000000_abc123",
  "started": "2026-05-30T14:00:00.000Z",
  "viewport": { "w": 375, "h": 812 },
  "testerProfile": {
    "id": "TEST-001",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "Wedding Coordinator",
    "yearsExp": "5-10",
    "eventType": "Weddings",
    "registeredAt": "2026-05-30T14:00:15.000Z"
  },
  "sessionFeedback": {
    "attention": "The red border on the lighting item",
    "confusing": "Wasn't sure if I was supposed to tap things",
    "knew_begin": 3,
    "oriented": 4,
    "transitions": 3,
    "distracting": "The time counter at the top",
    "use_real": 4,
    "usefulness": 7,
    "trust": 6,
    "comments": "Interesting concept"
  },
  "events": [ ... ],
  "summary": {
    "participation": {
      "engaged": true,
      "firstOrchestrationTapMs": 4823,
      "operationalRatio": 0.52,
      "vendorZoneReached": true,
      "firstScrollMs": 2100,
      "maxScrollY": 843
    },
    "interruptions": {
      "count": 1,
      "avgAbsenceSec": 12.4,
      "maxAbsenceSec": 12.4,
      "longAbsences": 1
    }
  }
}
```

### Storage

```
demo/review-artifacts/2026-05-27-alpha-test-distribution/
  sessions/
    TEST-001/
      export.json
      recording.mp4
      notes.md         (optional — for in-person facilitation)
    TEST-002/
      ...
  AGGREGATE_FINDINGS.md  (written after all sessions)
```

---

## 5. Primary Validation Gates

| Gate | Threshold | Consequence of failure |
|---|---|---|
| `engaged: true` | All 5 sessions | NO-GO — operational content is invisible |
| Median `firstOrchestrationTapMs` | < 10,000ms | CONDITIONAL GO — entry cues needed |
| Median `use_real` score | ≥ 7/10 | CONDITIONAL GO — perceived value gap |
| `vendorZoneReached` | ≥ 3 of 5 sessions | Watch signal — vendor zone visibility |
| `confusing` field | No systemic theme | CONDITIONAL GO — investigate theme |

**Minimum sessions for verdict:** 3. Do not render verdict at 1–2.

---

## 6. Recruitment Profile

**Target:** Working event coordinators. 3–5 people.

**Must have:**
- Runs live events (not planning-only)
- iPhone (preferred) — Android acceptable
- 10–15 uninterrupted minutes available

**Ideal profile distribution:**
- 1–2 wedding coordinators (high-pressure, familiar with vendor coordination)
- 1–2 corporate event managers (deadline-driven, expects clear hierarchy)
- 1 production coordinator or DOC (maximum operational intensity)

**Disqualify:**
- Event industry but only client-facing sales (no day-of ops experience)
- No smartphone
- Not willing to screen record

---

## 7. Alpha Readiness Checklist

### Technical readiness

- [x] AlphaTesterGate component built (registration → consent → session → feedback → complete)
- [x] observationKit extended (setTesterProfile, setSessionFeedback)
- [x] index.js wired — gate loads on `?slice=orchestration&observe=1`
- [x] Export includes testerProfile and sessionFeedback fields
- [x] GitHub Pages deploy verified live with gate URL
- [x] TEST-001 URL tested end-to-end on iPhone Safari (fresh localStorage)
- [x] Export copy-to-clipboard tested on mobile Safari

### Distribution readiness

- [x] Invitation email written (INVITATION_EMAIL.md)
- [x] Tester instructions written (TESTER_INSTRUCTIONS.md)
- [x] Facilitator guide written (FACILITATOR_GUIDE.md)
- [x] Alpha checklist written (ALPHA_CHECKLIST.md)
- [ ] 3–5 coordinator contacts identified and willing
- [ ] sessions/ directory created

---

## 8. Files

| File | Status |
|---|---|
| `demo/src/AlphaTesterGate.jsx` | Created |
| `demo/src/orchestration/observationKit.js` | Extended (setTesterProfile, setSessionFeedback) |
| `demo/src/index.js` | Modified (AlphaTesterGate wired) |
| `INVITATION_EMAIL.md` | Created |
| `TESTER_INSTRUCTIONS.md` | Created |
| `FACILITATOR_GUIDE.md` | Created |
| `ALPHA_CHECKLIST.md` | Created |
| `README.md` | This document |

**No production App.js was touched. Dual-track constraint preserved.**

---

## 9. What Happens Next

1. Build and deploy to GitHub Pages
2. Verify end-to-end on physical iPhone Safari (fresh URL, full gate flow)
3. Recruit 3–5 coordinators using invitation email
4. Send personalized URLs (TEST-001 through TEST-005)
5. Collect exports + screen recordings
6. Analyze with FACILITATOR_GUIDE.md gate criteria
7. Write AGGREGATE_FINDINGS.md
8. Render Tier 1 Go/No-Go verdict in Sprint 46
