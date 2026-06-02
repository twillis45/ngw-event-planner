# Alpha Test Checklist — Sprint 45

Use this before sending to any tester. One checklist per session.

---

## Pre-flight (do once, not per tester)

- [ ] GitHub Pages deploy is live and loads clean at `https://twillis45.github.io/ngw-event-planner/`
- [ ] `?slice=orchestration&observe=1` loads OrchestrationSlice with AlphaTesterGate registration screen (NOT the main app)
- [ ] `?tid=TEST-001` parameter pre-fills tester ID in registration form
- [ ] observationKit records events and `exportSession()` returns valid JSON with `testerProfile` and `sessionFeedback` fields
- [ ] Ctrl+Shift+E copies export JSON to clipboard (desktop fallback)
- [ ] `sessions/` folder created in artifact directory for storing exports

## Per-tester setup

- [ ] Tester ID assigned: TEST-0__
- [ ] Invitation email sent with correct `?tid=TEST-0__` URL
- [ ] Tester confirmed receipt
- [ ] Sessions folder created: `sessions/TEST-0__/`

## Session verification (after receiving export)

- [ ] Export JSON received and saved as `sessions/TEST-0__/export.json`
- [ ] Screen recording received and saved as `sessions/TEST-0__/recording.mp4` (or `.mov`)
- [ ] `testerProfile` field populated (name, email, role, yearsExp, eventType)
- [ ] `sessionFeedback` field populated (all 9 questions)
- [ ] `summary.participation.engaged` value recorded: ___________
- [ ] `summary.participation.firstOrchestrationTapMs` value recorded: ___________
- [ ] `summary.participation.operationalRatio` value recorded: ___________
- [ ] `summary.participation.vendorZoneReached` value recorded: ___________
- [ ] `summary.interruptions.count` value recorded: ___________

## Gate tracking (fill after each session)

| Session | engaged | firstOpTapMs | opRatio | vendorZone | use_real |
|---|---|---|---|---|---|
| TEST-001 | | | | | |
| TEST-002 | | | | | |
| TEST-003 | | | | | |
| TEST-004 | | | | | |
| TEST-005 | | | | | |
| **Required** | all true | median <10000 | — | ≥3/5 true | median ≥7 |

## Post-sessions synthesis

- [ ] All exports collected (minimum 3 to render verdict)
- [ ] Gate tracking table complete
- [ ] `feedback.confusing` responses reviewed for systemic patterns
- [ ] `feedback.attention` responses reviewed — what did they see first?
- [ ] `AGGREGATE_FINDINGS.md` written with direct evidence citations
- [ ] Tier 1 verdict rendered: GO / CONDITIONAL GO / NO-GO
- [ ] Notion updated — Build Scorecard, Update Log, Decisions Log

---

## Quick reference — test URL formats

**Basic (tester-assigned ID):**
```
https://twillis45.github.io/ngw-event-planner/?slice=orchestration&observe=1&tid=TEST-001
```

**With name pre-fill (optional convenience):**
```
https://twillis45.github.io/ngw-event-planner/?slice=orchestration&observe=1&tid=TEST-001&name=Jane
```

**Observation-only (no gate, for developer use):**
```
https://twillis45.github.io/ngw-event-planner/?slice=orchestration&observe=1
```
*Note: this still triggers AlphaTesterGate — it's wired on observe=1+orchestration. Use `?slice=orchestration` alone for gate-free access.*

**Gate-free orchestration slice (developer/facilitator preview):**
```
https://twillis45.github.io/ngw-event-planner/?slice=orchestration
```
