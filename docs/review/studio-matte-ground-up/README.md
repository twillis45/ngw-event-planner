# No Guesswork Events — host experience redesign

Review-only carbon and light concepts. No production imports, routing, backend,
entitlements, analytics, prompts, sending, bookings, or payment changes.

## Scope and source truth

Based on `main` at `57707876316f226f6dcf20102916af289e57d3b5` (13 October 2026).
The active development target is the **host shell**, not the professional planner
shell. The two-shell/shared-core decision remains intact. The pro Studio →
Portfolio → Event Command → Specialist hierarchy is not redesigned here.

Inspected sources:

- `hostv2/src/main.jsx`: shipping host entry, separate invite/vendor routes and existing offline registration.
- `hostv2/src/theme.js`, `src/theme/palette.js`: September light-mode implementation, de-blued carbonNeutral ramp and flat steel primary.
- `src/lib/presentationNav.js`: host-specific Your event / Plan / Guests / Budget / The Day vocabulary and reveal-when-data rule.
- `src/lib/doItForMe.js`: existing draft helpers for invites, RSVP chase, vendors, helpers, dietary notes, shopping, day-before details and more.
- `src/lib/decisionMemory.js`: existing decision records, exact-word rationale payoff and outcome functions.
- `src/lib/nextActionRenderer.js`: persona-native action presentation.
- `docs/product-os/PRODUCT_OS.md`, `HOST_SHELL_DECISION.md`.
- `docs/product-os/engine-audit/PHASE_HERO_1.md`, `HOST_DIFM_AUDIT_1.md`, `BRIEF_ASSIST_1.md`, `DM_PAYOFF_1.md`.
- `docs/claude-skills/01_PRODUCT_ARCHITECTURE_GUARDRAILS.md`, `02_STUDIO_MATTE_UI_STANDARD.md`, `ui-ux/UX_01_STUDIO_MATTE_VISUAL_LANGUAGE.md`.

Older dark-only prose conflicts with newer palette/runtime light support. This
proposal follows the newer runtime plus the owner's explicit light-version request.
The palette snapshot is copied verbatim from that pinned source; build.mjs reads
its exports. This is a portability snapshot, **not** a second production token source.

## What is redesigned

| Surface | Host benefit | Boundary |
|---|---|---|
| Your event | One consequential next move, then ordered work | Triage links to the concrete task; no all-in-one editor |
| Plan | Related decisions grouped by part of the event | Illustrative grouping, not a replacement priority/workstream engine |
| Venue task | Terms, unknowns, confirmation and rationale together | Local sample confirmation is not a booking |
| Decision review | Swipe, tap or keyboard through choices; tradeoffs stay visible | Swipe only browses; shortlist and defer require explicit buttons; undo available |
| Prepare this for me | Editable venue-question draft alongside its evidence boundary | Demonstrates DIFM interaction grammar, does not invoke a model or send |
| Guests | Search/reply filters and reminder draft | Six clearly labeled sample records; no recipient sends |
| Budget | Estimates, allowance and unknowns | Host spending plan, never planner AR; no payments |
| The Day | Time, owner and handoff | Draft, never fake live status or acknowledgement |

Phone: labeled five-lane bottom navigation. Tablet portrait: stacked task with a
two-column supporting section. Tablet landscape/desktop: task and context side by
side. Short-laptop height has its own density adjustment; no phone-sized minimum
height stretched over desktop. No custom fonts, dependencies, photo assets or CDN.

## Try it

Open `events-dark.html` or `events-light.html`. Theme links preserve the route,
but intentionally reset in-memory sample edits.

1. Your event → Review venue → Record confirmation → enter reason → record sample.
2. Return to Your event: priority becomes the food decision. Open Food: prerequisite agrees.
3. Venue → Prepare this for me → edit → keep → reopen: the edited draft remains.
4. Your event → Review your options → swipe horizontally or use Previous/Next or arrow keys.
5. Shortlist / Not now → Undo: the previous choice is restored. Nothing is booked.
6. Search with Ctrl/Cmd+K; search guests; draft a message (explicitly not sent).
7. Review controls: first-run, simulated failure/recovery, event-day priority.

## Interaction technology and production recommendation

The differentiator should be the decision-to-outcome loop, not a gesture library
or a chatbot pasted onto the app. Reuse the existing React/shared-core architecture.

| Priority | Proposal | Production implementation boundary |
|---|---|---|
| First | Grounded DIFM at the point of need | Existing doItForMe exports + current draft/edit/share surface; allowlisted facts, missing-field asks, explicit recipient review |
| First | Decision explanations and memory | Existing priority producer + rationale read/write seam; do not generate unsupported confidence or competing rankings |
| First | Dependency-aware next action | Read canonical engine output; completion must agree across Home, Plan and task detail |
| Next | Swipe review with button parity | Pointer Events, horizontal threshold, vertical scroll preserved, pointercancel handling; never gesture-only commitments |
| Next | Editable preview of change consequences | Derive cost/count/timeline changes before applying; source and assumptions visible; no irreversible operation through optimistic UI |
| Later | Voice capture → structured proposal | Explicit mic consent, transcript review, field-level acceptance; not automatic event mutation |
| Preserve | Offline/event-day continuity | Extend the existing host offline shell; do not add a second service worker or claim guaranteed sync |

This concept implements the first interaction examples with deterministic sample
data. It does not prove actual engine integration, accuracy, time savings, or ROI.
No new AI engine is warranted from this design pass. Native view transitions are
an optional future enhancement, not necessary for the task and not added against
the current instant-navigation doctrine.

Accessibility references consulted:
- https://www.w3.org/WAI/WCAG22/Techniques/general/G215 (gesture alternatives)
- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements (non-drag alternatives)
- https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p02-back-undo/ (back/undo)
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events (input implementation)

## Verification

Run `node build.mjs`, then `node verify.mjs` with PLAYWRIGHT_MODULE and
CHROMIUM_PATH pointing at installed tools. Run `node capture.mjs` after verification.
`verification.json` contains actual checks, dimensions and source hashes.
Screenshots in `events-dark-devices.png` and `events-light-devices.png` are rendered
captures, not image-generation mockups. The `screens/` matrix is reproducible and
not all intermediate captures need be committed.

Matrix: 390×844, 430×932, 768×1024, 1024×768, 1280×654, 1440×900, 1920×1080.
Checks cover headings, overflow, above-fold primary action, dialogs, keyboard,
sample confirmation propagation, search, guest filtering, draft persistence,
pointer browsing, explicit choice/undo, empty/error recovery, and script errors.

Limits: Chromium emulation only, not physical touch/iPad/Safari validation; not a
full contrast/screen-reader/200% zoom audit. No production suite or backend run.
The monolithic shipping HostShell was not fully inspected or mounted; this is a
separate concept informed by the listed source seams, not a production UI audit.
No competitive score, 10+ verdict, user study or conversion improvement is claimed.

## Production gate (not launched)

Hypothesis: contextual preparation plus evidence-led choices reduces the work
needed to complete a host decision without increasing errors or false confidence.
Measure task success, elapsed time, correction/undo rate and comprehension of
draft-versus-sent in a baseline comparison. Stop on any wrong-recipient exposure,
false booking/payment claim, lost change or inaccessible essential action.
Only after review: wire a narrow internal host-only flag over the existing core,
then run regression and physical-device checks. Rollback is the existing host
render path; do not replace the pro shell or alter shared engine outputs.

The attached Cognitive Load, Frontend Review, Coding/QA, Truthfulness and Feature
Flag standards informed the hierarchy, sample labels, evidence and rollout gate.
This preview is a design proposal, not a measured product experiment.
