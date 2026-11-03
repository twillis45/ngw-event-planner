# Claude Handoff — HostV2 Path-to-Production Recertification

**Date:** 2026-11-03
**Owner direction:** Execute completely. This is a fresh certification, not an update of an old checklist.
**Repository:** `twillis45/ngw-event-planner`
**Production surface:** HostV2 remains the only customer-facing Host experience until HostV3 is ready.

## Hard boundaries

1. **Legacy is frozen.** Inspect only as historical evidence. Do not modify it.
2. **HostV2 is production.** Do not redesign it into HostV3. Fixes are authorized only after findings are reviewed/ranked, except where an existing Path-to-Production command explicitly performs non-destructive evidence generation.
3. **HostV3 is not part of this recertification.** Do not begin V3 implementation during this pass.
4. Treat prior audits, gate rulings, docs, tests and artifacts as **evidence, not truth**. Re-probe current `main`.
5. Runtime/code beats stale documentation. If artifact and implementation disagree, record the disagreement explicitly.
6. Do not weaken, delete or bypass gates to obtain green results.
7. Preserve the doctrine: `eventPlan()` is sole prioritization authority; `patchEvent` is sole writer; no second ranking engine; consequences live where their answers live.

## Governing evidence to read first

At minimum:

- `docs/artifact/the-first-recorded-gate.html`
- `docs/audits/2026-08-21_PATH_TO_PRODUCTION_AUDIT.md`
- `docs/audits/2026-08-21_SECURITY_TRACK_CHECKLIST.md`
- `docs/architecture/WHERE_WE_ARE.md`
- `docs/RUNBOOK.md`
- `HANDOFF.md`
- current GOLD / acceptance / UAT artifacts and tests
- current HostV2 source, readers/writers, routes, persistence, auth, analytics, payments and E2E suites
- current GitHub Actions/workflows and latest results
- legal/privacy/refund drafts and their product wiring

Also locate and use the existing Claude **Path-to-Production command/spine**. Do not substitute this handoff for that command. This handoff adds owner direction and additional gates; the existing Path-to-Production command remains the governing stage process.

# Mission

Run the **current application back through Path to Production from the beginning** as though prior certification does not exist.

Evaluate the product we are preparing to:

1. put in front of strangers,
2. charge real customers to use,
3. package for Apple App Store distribution,
4. package for Google Play distribution.

The question is not “did this pass before?” The question is:

> **Would current `main`, current production configuration and current HostV2 experience pass today if we were about to charge a stranger and submit the product to Apple and Google?**

# Required surfaces

Declare and evaluate these separately where the Path-to-Production doctrine requires a surface/platform distinction:

| Surface | Facing | Platform | Current state |
|---|---|---|---|
| HostV2 Web | public | web | production/customer-facing |
| HostV2 iOS | public | iOS | planned native distribution surface |
| HostV2 Android | public | Android | planned native distribution surface |
| Admin/demo surfaces | internal as appropriate | web/native as applicable | verify declaration and exposure |

For iOS/Android, do **not** pretend implementation exists if it does not. Classify every native requirement as existing/reusable, wrapper work, capability gap, policy decision, or blocker.

# Recertification method

For every Path-to-Production stage, produce:

- `PASS`
- `PASS WITH CONDITIONS`
- `FAIL`
- `OWNER ACTION`
- `NOT APPLICABLE`

For every finding include:

- severity: P0 / P1 / P2 / P3
- surface: Web / iOS / Android / shared
- exact evidence: file, route, test, workflow, runtime probe or owner-side configuration
- whether the evidence is current or historical
- reproduction steps where applicable
- customer consequence
- recommended disposition:
  - `FIX BEFORE PROD`
  - `OWNER ACTION BEFORE PROD`
  - `ACCEPTED HOSTV2 DEBT`
  - `DEFER TO HOSTV3`
  - `NATIVE PACKAGING WORK`
- confidence level

Do not use a green test as proof of a claim the test does not actually assert.

# Mandatory additional lenses

The prior Path-to-Production process is engineering-heavy. Add these explicit customer gates to the final promotion ruling.

## 1. Comprehension

Can a first-time host understand:

- what NGW understood about the event,
- what remains unknown,
- what NGW recommends next,
- why that action matters,
- what changed,
- whether an action actually saved/completed,
- the difference between planned/expected/committed/spent or analogous truth states?

Identify contradictory language or state transitions, especially Creation → reveal → HostHome.

## 2. Attention

Audit the existing attention architecture; do not invent another prioritizer.

For each attention/One Move item prove:

`truth → priority → exact destination → action → state change → reprioritization`

Check Studio Home, Command and domain surfaces. A correct domain but wrong control is not sufficient.

## 3. Friction

Audit these tasks end-to-end on current runtime:

1. Create an event.
2. Correct an NGW misunderstanding.
3. Add a guest.
4. Change attendance.
5. Send/get RSVPs.
6. Select/change venue.
7. Record an expense.
8. Add/change vendor.
9. See what needs attention.
10. Execute the One Move.
11. Recover from a failed save/provider/auth/payment state.

Record clicks, typing, modal/sheet transitions, dead ends, duplicated questions, premature questions, back behavior, confirmation and undo.

## 4. Trust

Audit every meaningful UI claim such as:

`confirmed`, `booked`, `paid`, `spent`, `available`, `recommended`, `selected`, `expected`, `final`, `live`, `current`, `verified`, `complete`.

No UI claim may outrun the evidence.

Specifically reproduce or re-rule the historical Creation/reveal contradiction where work could be described as complete and then appear dormant/not started on HostHome.

# Mandatory technical re-probes

Do not inherit prior rulings without current evidence.

## Security / live configuration

- Verify migration `018_research_tables_rls.sql` is represented in current main.
- Distinguish repo proof from **live Supabase attestation**.
- Re-run/inspect every-public-table RLS gate.
- Re-rule server route protection sweep.
- Re-run shipped dependency audit.
- Verify secret posture.
- Record external pentest status without pretending repo tests substitute for one.
- Verify current auth rate-limit posture or mark owner action with exact dashboard/query instructions.

## Data durability / sync

- Re-probe stale-write protection.
- Require a **two-real-session/device concurrency test**, not only unit/browser simulation.
- Verify user-visible save/sync honesty.
- Verify backup status and require an actual restore drill if still unattested.
- Verify undo/recovery boundaries.

## Observability

Prove not only that configuration ships, but that events arrive:

- Sentry production event arrival
- PostHog production event/pageview arrival
- save failures
- provider failures
- route failures
- parsing/unapplied-clause failures where instrumented

Mark owner-side checks explicitly.

## Error/recovery

Drive current runtime through at least:

- offline/save refusal
- full storage/local write failure
- invalid route
- configured provider failure
- auth failure/expired auth
- RSVP invalid/expired state where applicable
- payment failure/entitlement race
- stale concurrent write

Judge both technical correctness and whether a human knows what happened and what to do next.

# GOLD / product truth

Re-run or re-rule every GOLD row against current `main`.

Pay disproportionate attention to **GOLD-01 / cold-start Creation**, because first-run comprehension is a promotion concern even if earlier boards classified remaining gaps as refinements.

For WANDA-A and other current gold scenarios, distinguish:

- parsed
- persisted
- operationalized
- surfaced to host
- used by prioritization
- heard but not applied

Do not count “text was heard somewhere” as successful operationalization.

# Historical Nielsen findings — reproduce, do not assume

Re-test whether current HostV2 still has:

1. insufficient ambient queued/failed sync visibility,
2. host-edited `draftBody` loss on sheet close/reopen,
3. single-slot/nested sheet navigation that loses parent context,
4. run-it-again action without adequate Undo/recovery,
5. any overconfident crash-recovery wording.

Close a finding only with current evidence.

# Human validation — required promotion evidence

Do not mark Stage 9 complete from automated tests alone.

Require two first-time-human sessions:

### Tester A — ordinary host
A person who has never seen NGW and could realistically plan a milestone event.

### Tester B — coordinator
A person with event coordination/planning experience who has never used NGW.

Use the repo's current stranger/coordinator UAT artifact. Do not coach the tester through confusing UI. Capture every “huh?”, “where is…?”, wrong assumption, dead end and request for explanation.

The final report must identify the three largest friction points and whether each tester would use the product for a real event and whether they understand enough value to pay.

# Payments / legal / promotion

Re-rule Stage 9 requirements including:

- domain/support/privacy/refund/terms readiness
- legal copy wired into actual product where required
- demo/reviewer account readiness
- live-key Stripe end-to-end purchase
- entitlement unlock
- failure path
- refund lifecycle
- three non-founder hosts asked to pay
- final promotion board

Do not turn billing live merely to make the audit pass.

# Apple App Store + Google Play readiness track

Add a separate native-distribution appendix. This is a **readiness assessment**, not permission to implement native shells during this recertification.

Assess and classify:

- recommended minimal native architecture (e.g. whether current HostV2 can safely use a Capacitor-style shell versus needing deeper native work)
- iOS bundle/application identifiers
- Android application ID
- signing/certificates/provisioning
- universal links / app links / deep links
- Supabase magic-link auth return path
- native back behavior
- safe areas
- keyboard/form behavior
- file upload/download
- camera/photo access if applicable
- external-browser transitions
- share behavior
- offline/reconnect
- accessibility
- orientation/tablet/iPad behavior
- crash/analytics initialization
- push notification need now vs defer
- account deletion requirement/workflow
- privacy disclosures/data-safety declarations
- support/privacy/terms URLs
- app icons/splash/screenshots
- reviewer/demo credentials
- version/build/release strategy

## Billing policy — mandatory early ruling

The current product uses Stripe and a One-Event Pass. Before recommending native implementation, research/identify the exact current Apple and Google policy implications for selling this product inside native apps.

Do not assume the web Stripe flow can simply be embedded in iOS/Android. If policy interpretation requires external/current evidence unavailable to Claude, mark it `EXTERNAL POLICY VERIFICATION REQUIRED` and state the exact question to verify.

# Native implementation recommendation

At the end, recommend one of:

1. `CAPACITOR/THIN NATIVE SHELL IS APPROPRIATE`
2. `THIN SHELL WITH SPECIFIC NATIVE MODULES`
3. `NATIVE/REACT-NATIVE REARCHITECTURE REQUIRED`
4. `INSUFFICIENT EVIDENCE`

Give reasons based on current code, not preference.

# Required output artifact

Write the complete result to:

`docs/audits/2026-11-03_HOSTV2_PATH_TO_PRODUCTION_RECERTIFICATION.md`

The artifact must contain, in this order:

1. Executive verdict
2. Current commit/SHA and environment examined
3. Path-to-Production Stage 0–10 matrix
4. `FIX BEFORE PROD` matrix
5. `OWNER ACTION BEFORE PROD` matrix
6. `ACCEPTED HOSTV2 DEBT` matrix
7. `DEFER TO HOSTV3` matrix
8. GOLD rerun/re-ruling
9. Comprehension findings
10. Attention/One Move findings
11. Friction findings
12. Trust-language findings
13. Error/recovery findings
14. Security/live-config findings
15. Persistence/concurrency/backup findings
16. Observability findings
17. Human-UAT status and exact remaining protocol
18. Payments/legal/promotion findings
19. iOS readiness appendix
20. Android readiness appendix
21. Apple/Google billing-policy question/ruling
22. Native architecture recommendation
23. Stage-9 prerequisites remaining
24. Estimated closure effort by finding (engineering hours vs owner/human/external dependency)
25. Final recommendation: `NO-GO`, `CONDITIONAL GO`, or `GO`

# Required machine-readable summary

Also create:

`docs/audits/2026-11-03_HOSTV2_RECERTIFICATION_MATRIX.json`

Each finding should contain at least:

```json
{
  "id": "...",
  "stage": 0,
  "severity": "P0|P1|P2|P3",
  "surface": ["web", "ios", "android", "shared"],
  "status": "pass|condition|fail|owner_action|na",
  "disposition": "fix_before_prod|owner_action_before_prod|accepted_hostv2_debt|defer_hostv3|native_packaging_work",
  "evidence": [],
  "customer_consequence": "...",
  "reproduction": "...",
  "estimated_engineering_hours": 0,
  "external_dependency": false
}
```

# Stop condition

Do **not** stop because the existing artifact says Stage 8 passed.

Stop only when:

- every Path-to-Production stage has a current ruling,
- every open finding is classified,
- every claim cites current evidence or is explicitly labeled historical/unverified,
- native readiness is assessed,
- the remaining owner/human/external actions are explicit,
- the final promotion ruling is written.

If a required owner-side fact cannot be verified from the repo, do not guess and do not block the rest of the audit. Mark it `OWNER ACTION`, give the exact verification procedure, and continue.

## Final instruction

Be adversarial. Try to disprove readiness. The goal is not to preserve previous green rulings; the goal is to find what would embarrass us, lose customer data, confuse a first-time host, break payment, violate store policy, or create a support incident **before a customer finds it**.