# Host venue workspace — implementation review

The large photographic banner stays. This is a default-off addition to the real host shell, with the complete venue decision flow connected to existing event state. It replaces the venue sheet when opted in and adds a photo-led entry point on the plan. It is not another standalone demo, and it does not replace the other host sections or the pro shell.

## Open the implementation

Run `npm ci` at the repository root and in `hostv2`, then `cd hostv2 && npm run dev`. Open the printed local URL with `?venueWorkspace=1&theme=light` (or `theme=dark`). Open an event and choose **Choose the place** / **Revisit your venue** in its banner. Existing Venue routes also open the workspace. Removing `venueWorkspace=1` restores the original UI. No persistent flag assignment is stored.

Real events start with their own facts and an empty shortlist. The screenshot event, prices and places are test fixtures. `sample-photo.png` is an AI-generated fictional celebration photograph for review only; it is not shipped as a default customer photo. Hosts can add their own JPG, PNG or WebP under 1 MB. The image lives with the event through the existing save path.

## Annotated flow

| Screen | What to inspect |
| --- | --- |
| [Desktop banner](desktop-banner.png) | Large photograph, host's event name, occasion and must-have moment. The existing navigation stays in place. |
| [Venue-type guidance](desktop-guidance.png) | Existing playbook suggestions, their rationale and a choice persisted through the real decision setter. These are types of venue, not invented local listings. |
| [Preview and shortlist](desktop-preview.png) | Select a named place on the left; its facts and notes appear on the right. Visible previous/next buttons, mouse drag and touch swipe all browse without making a decision. Edit notes without removing and re-entering a place. |
| [Compare](desktop-compare.png) | Side-by-side host-supplied quotes, capacity, location and notes. Unknown facts remain visibly unknown. Comparison scrolls horizontally on small screens. |
| [Prepare for me](desktop-inquiry.png) | Calls the existing `draftVendorOutreach` engine and opens the existing editable draft sheet. No message is sent automatically. Derived headcounts and times retain the engine's withholding rules. |
| [Selection and next action](desktop-complete.png) | Writes through `setVenue` and `patchEvent`, optionally records the host's reason through Decision Memory, offers immediate undo and opens the existing food workspace next. “On your plan” is deliberately distinct from “booked.” |
| [Mobile banner](mobile-banner.png) / [mobile preview](mobile-preview.png) | Large banner retained; horizontal shortlist, single preview, stacked primary actions, persistent sheet navigation. |
| [Tablet banner](tablet-banner.png) / [tablet preview](tablet-preview.png) | Full tablet workspace with shortlist beside preview, replacing the cramped inherited floating form panel for this experiment only. |
| [Landscape tablet](tablet-landscape-preview.png) | Existing navigation rail and side-by-side venue layout at 1024 px. |
| [Dark theme](desktop-dark.png) | Uses the existing theme's surface and text tokens; the same event and interactions remain available. |
| [Empty/error state](empty-shortlist.png) | No fabricated local listings. Entry form appears; malformed location text has a specific corrective message. |

Venue-type suggestions come from `playbookDecisionOptions`; choosing a type uses the existing `settleDecision` path. These are planning recommendations, not a new local venue-search engine. Actual places are entered by the host. Availability, accessibility and quotes need direct confirmation.

## Integration and motion

- `hostVenueWorkspace` stores the photo and shortlist on the event's existing JSON data; no migration or new backend service.
- Selection uses the canonical venue writer. A replacement clears the previous street address and venue location fields before applying the chosen location, so an old address cannot silently travel with a new venue.
- The host's optional reason uses the existing Decision Memory writer. Undo restores the fields touched by selection; the in-panel undo becomes unavailable if those fields have since changed.
- DIFM drafts preserve the existing editable/share handoff and save/sync status handling. This change does not send messages, make reservations or process payments.
- Scoped visual exception approved by the host: sans-serif titles, muted teal primary actions, tangible preview movement and completion feedback. Global doctrine, pro surfaces and other host flows are unchanged. Reduced-motion disables the workspace's transitions and movement.
- Browsing never commits a choice. Explicit **Use this place** is the commit action. Existing navigation destinations stay stable.

## Verification

- `npm run release`: passed the host parity/build, artifact sync and CRA production build. CRA emitted warnings; this is not a warning-free build. No deployment was run.
- Host Vitest: 24 passing tests across workspace boundary tests and the module import/parse gate.
- Focused Jest regression checks: 5 suites / 141 tests passed (`venueSourceProof`, `venueFor`, `doItForMe`, `decisionPayoff`, `responsiveSurface`).
- Browser: [22 checks](verification.json) passed in the actual host shell with a local test event: selection, host rationale, undo, next action, reload, add/edit/remove, mouse dragging, native touch input, keyboard controls, photo-size error, invalid location, empty shortlist, reduced motion, dark theme, flag removal and zero uncaught browser errors.
- Responsive geometry checked at 320×740, 390×844, 768×1024, 1024×768 and desktop 1440×1000. No document or sheet horizontal overflow in the checked phone/tablet states. Comparison has intentional internal horizontal scrolling.

Reproduce browser checks from the repo root with `CHROMIUM_PATH=/path/to/chromium node hostv2/scripts/verify-venue-workspace.mjs`. The script starts a local Vite server, uses an isolated browser context, seeds fictional data, intercepts the fixture photo URL, writes screenshots and exits. It never uses a signed-in customer session.

### Review verdict and limits

The implemented flow and inspected responsive layouts pass the local functional review. The large banner is intact, and the workspace has visible controls rather than hidden demonstration triggers. The tablet panel issue found during review was fixed.

This is not evidence that hosts find it enjoyable or faster. No usability study or new competitive score has been performed. Cloud round trips, real device Safari, assistive technology and live venue availability were not tested. The existing cloud saving path is reused, not independently recertified. Full repository suites have not been rerun. Do not promote the flag on the strength of screenshot polish alone.

## Experiment and rollout

Hypothesis: a photo-led, single-place preview with explicit comparison and an editable prepared inquiry helps hosts reach a confident venue choice with fewer navigation reversals.

Audience: manual internal review first, then a small explicitly opted-in host cohort after the draft PR is reviewed. No automatic rollout or production default change.

Primary measure: moderated completion of shortlist → comparison → inquiry review → selection, without assistance. Record task time and navigation reversals against the current venue flow. Success criteria before promotion: at least 8 of 10 representative hosts complete the flow unaided; at least 8 correctly distinguish selecting from booking; median task time improves over the current flow without increased correction errors. These are proposed criteria, not results.

Guardrails: no wrong-event writes, lost edits, hidden send/book actions, misleading booking claims, inaccessible primary controls or additional save failures. Stop immediately for data loss, mistaken booking expectations, or a blocked keyboard/touch path. Observe load responsiveness and image-storage failures during review; the 1 MB photo cap limits event-blob growth.

Rollback: remove `venueWorkspace=1` from review links. Existing event facts remain readable by the original shell; new shortlist/photo fields are inert. Do not delete host data as part of rollback. For code rollback, revert the feature commit.

Decision/cleanup: owner reviews task evidence and guardrails before any default-on change. After a decision, either remove the experiment UI or promote it with a separate reviewed change and retire the URL flag. Review this flag within 30 days of the PR; no auto-promotion.
