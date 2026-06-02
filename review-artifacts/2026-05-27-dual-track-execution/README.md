# Sprint 39 — Dual-Track Execution
## NGW Events: Revenue Product + Orchestration R&D Separation

**Date:** 2026-05-27
**Status:** Sprint start — operational separation formalized

---

## The Strategic Split

NGW Events is now two products sharing a codebase.

They are related. They are not the same product yet.

Treating them as one is the primary execution risk at this stage.
This sprint formally separates them.

---

## Track A — Production EventPlanner (Revenue + Launch)

### What it is

`demo/src/App.js` — 16,032 lines.

The real production application. Features: multi-client, multi-event, 8 event types,
full vendor system, metro market pricing, CSV import/export, Supabase auth,
guest management, budget tracking, comms log, RSVP portal foundation, Sentry,
multi-tenant studio members.

**Note:** `EventPlanner.jsx` at the repo root is an old 491-line prototype.
It is NOT the product. Do not confuse these two files.

### Current state

Feature-complete enough to launch.
Not yet deployed to production.
Not yet listed on any sales channel.

### What's missing before launch

| Gap | Priority | Effort |
|---|---|---|
| Checklist auto-gen from intake | P1 | Medium |
| RSVP collection link (needs backend) | P1 | Medium–High |
| Render alpha/prod deployment | P1 | Medium |
| Mobile QA pass | P1 | Low |
| Gumroad/Etsy/Stan Store listings | P1 | Low |
| Onboarding clarity | P2 | Low |
| Failure handling (offline, error states) | P2 | Low |
| Screenshots + positioning copy | P2 | Low |

### Launch strategy

Lead with: **clarity + usefulness.**

Do NOT lead with orchestration philosophy.
Do NOT mention adaptive cognitive systems publicly.

The market buys "event planner app for professionals."
That's what this ships as.

Pricing:
- $29 Starter
- $47 Complete
- $67 Boss

Channels: Gumroad (primary), Etsy (template), Stan Store (mirror)

---

## Track B — Orchestration Environment (R&D + Cognition Validation)

### What it is

`demo/src/slices/OrchestrationSlice.jsx` — Sprint 38 proving ground.
`demo/src/orchestration/` — 7-file pure-JS cognition engine.

The hypothesis: subconscious operational environments reduce coordination fatigue.

Not a feature. A different paradigm for how operational software works.

### Current state

Sprint 38 complete. Alpha-ready for facilitated human testing.

What's been validated in simulation:
- 5-layer cognitive pipeline (hierarchy → tunneling → memory → continuity → compression)
- Adaptive density responding to temporal proximity + pressure state
- Environmental memory from past events reshaping current surface
- Trust compression with behavioral consequence, not annotation
- Disruption/recovery psychological arc

What has NOT been validated with real coordinators: everything.

### Sprint 39 Track B priorities

1. **Facilitated human testing** — 2–5 sessions using `?slice=orchestration&sim=wedding&observe=1`
2. **Observation synthesis** — hesitation patterns, orientation loss, trust responses
3. **Restraint refinement** — continue removing visible narration, preserve behavioral outcomes
4. **Recovery psychology** — decompression arc should feel human and earned
5. **Mobile interruption recovery** — lock/unlock, vendor switch, rapid return orientation

### Testing URL

```
http://localhost:3000/?slice=orchestration&sim=wedding&observe=1
```

Facilitator workflow:
1. Record before handing device
2. 2× playback speed
3. "You're the planner. Event is in 45 minutes. Just do what you'd do."
4. Don't narrate. Capture hesitations.
5. Stop → Export → paste JSON to notes

---

## Boundary Rules

### Cross-contamination risks

| Risk | Direction | Guard |
|---|---|---|
| Orchestration complexity leaks into production UX | B→A | Hard boundary on App.js scope |
| Launch pressure forces premature orchestration port | A pressure on B | Separate sprint backlogs |
| R&D polish consumes launch capacity | B consuming A time | Track B is timebox-limited to testing only right now |
| Production "smartness" hunger pulls orchestration engine in before it's ready | A pulling B | No orchestration code in App.js until Track B completes human validation |

### What can change

- **Track A files:** `demo/src/App.js`, `demo/src/components/`, `demo/src/lib/`
- **Track B files:** `demo/src/slices/OrchestrationSlice.jsx`, `demo/src/orchestration/`

### What stays clean

- No orchestration engine code in App.js until human validation is complete
- No production feature pressure applied to the proving ground
- No merging tracks prematurely to make the product "feel smarter"

---

## Deployment Strategy

### Track A — Production

Target: Render (separate alpha + prod services)

Structure:
```
render-alpha  → demo branch  → for internal testing
render-prod   → main branch  → for paying customers
```

Environment vars needed:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_SENTRY_DSN` (optional but recommended)

Static site build:
```
cd demo && npm run build
```
Output: `demo/build/` — already exists from prior run.

### Track B — No deployment

Orchestration environment stays local.
Never deployed publicly.
Facilitator sessions run on localhost.
Observation data never leaves the device.

---

## Monetization Path

### Immediate (Track A)

1. Ship App.js to Render
2. List on Gumroad ($47 complete tier first)
3. Etsy digital download (Google Sheets template + App.js export)
4. Collect operational usage data from early users

### Medium-term (when Track B validates)

If human testing confirms the cognition model:
- Event-day coordination mode as a premium tier feature
- Operational intelligence as differentiator from spreadsheet tools
- Potential B2B licensing path for venues/coordination studios

### Never

Do not sell the orchestration system as "AI" or "smart."
It is an environment, not a feature.
That positioning would be wrong and would set wrong expectations.

---

## Orchestration Validation Goals

The questions that facilitated testing must answer:

1. Does the environment reduce the need to consciously scan for what matters?
2. Do coordinators trust the compression model without needing to see all vendors at once?
3. When disruption appears, does it surface early enough to feel useful, not alarming?
4. After pressure passes, does the recovery feel earned rather than artificial?
5. On mobile, can a coordinator return from an interruption and re-orient within 3 seconds?

If the answer to all five is yes across 2–5 coordinators: the model is real.
If the answer is inconsistent: the model needs another iteration before production contact.

---

## Operational Risks

| Risk | Severity | Mitigation |
|---|---|---|
| App.js never ships — indefinite polish | High | Hard launch deadline required |
| Track B validation never happens — sessions keep getting deferred | High | Book sessions this week |
| Checklist auto-gen scope creep | Medium | Simple intake→task mapping only. No AI. No inference. |
| RSVP backend dependency blocks launch | Medium | Ship without RSVP link. Mark as Phase 2. |
| Supabase misconfiguration on Render | Medium | Test magic-link flow on alpha before any listing goes live |
| Orchestration engine port attempted before human validation | Medium | Explicit boundary rule — not until Track B produces findings |

---

## Scope-Protection Strategy

Track A scope is frozen at:
- Checklist auto-gen (simple)
- RSVP MVP (minimal)
- Deployment + mobile QA
- Listing assets

Track A scope is closed to:
- New event types
- New vendor features
- New comms features
- Any orchestration thinking

Track B scope is frozen at:
- Human testing sessions
- Observation synthesis
- Minor behavioral refinements based on findings

Track B scope is closed to:
- New simulation scenarios
- Engine architecture changes
- Production integration

---

## Brutally Honest Assessment

### What's real

The production app (`App.js`) is genuinely feature-complete for a solo event coordinator.
It has more capability than most competitors at this price point.
The problem is it has never been used by a real coordinator in a real event.
All feedback so far is internal.

### What's not proven

The orchestration model is intellectually coherent and behaviorally interesting.
It has never been tested under actual coordination pressure.
Every claim about reducing cognitive fatigue is currently theoretical.
The simulation is not the same as a coordinator managing 8 vendors 45 minutes before ceremony start.

### What the split achieves

It prevents the worst failure mode: building something sophisticated and shipping nothing.

Track A ships something real, generates revenue, and creates a feedback channel with actual users.
Track B gets protected time to validate the model without being contaminated by product pressure.

If Track B validates: there is a defensible premium product here.
If Track B doesn't validate: Track A still exists and generates value.

The split is not a compromise. It is the only disciplined path forward.

---

## Files

| File | Track | Status |
|---|---|---|
| `demo/src/App.js` | A | Production — 16,032 lines |
| `demo/src/components/` | A | Extracted modules |
| `demo/src/lib/` | A | Auth, CSV, API, severity |
| `EventPlanner.jsx` (root) | — | Old prototype — ignore |
| `demo/src/slices/OrchestrationSlice.jsx` | B | Sprint 38 proving ground |
| `demo/src/orchestration/` | B | 7-file cognition engine |
| `demo/src/design/` | Shared | Token system — already production-aligned |
| `demo/src/contexts/` | B→A | Contexts ready; not yet wired to App.js |
