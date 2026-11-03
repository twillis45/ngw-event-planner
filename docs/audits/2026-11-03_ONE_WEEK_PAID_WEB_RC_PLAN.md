# One-week plan: paid HostV2 web release candidate and stage 9 decision by Monday, November 9, 2026

**Source of truth:** `docs/audits/2026-11-03_HOSTV2_PATH_TO_PRODUCTION_RECERTIFICATION.md` and its matrix `docs/audits/2026-11-03_HOSTV2_RECERTIFICATION_MATRIX.json` (finding IDs below are that matrix's).
**Owner checklist (separate):** `docs/audits/2026-11-03_OWNER_CHECKLIST_WEEK_OF_11-09.md`.
**Constraint:** one week. This plan is the smallest safe path to a paid web release candidate, not a complete remediation.
**Boundaries:** no HostV2 redesign, no Legacy (`src/App.js`) edits, no HostV3, no cosmetic P2/P3 work, and no weakened gates or tests. `eventPlan()` stays the sole prioritizer and `patchEvent` the sole writer. Every new guard is red-proofed: reintroduce the fault, watch it fail, restore.
**Native this week:** clear the architectural and policy blockers and get packaging started. The web release candidate does **not** wait on app-store approval.

All times are EST.

---

## 0. What "done by 11/9" means, and what it cannot mean

| Achievable by 11/9 | Not achievable by 11/9, stated now |
|---|---|
| A tagged web release candidate with every P0/P1 engineering finding closed and tested | **External pentest report (`SEC-4`).** A pentest cannot be booked, run and reported in six days |
| Owner attestations: RLS, backup and restore, rate limits, telemetry arrival | **Attorney sign-off (`LEGAL-1`)** depends on the attorney's turnaround, and is a risk, not a certainty |
| One live-key Stripe purchase, refund and decline run on the release candidate | **App-store approval.** Packaging starts; submission follows the release |
| Two first-time human UAT sessions on the release candidate | — |
| A convened stage 9 board with seats and a recorded verdict | A board **GO** is not promised. The board rules; this plan only makes the evidence complete |

**The stage 9 board's real choice on 11/9.** If the pentest is the only open item, the board decides between two options:
- **Hold.** No paid launch until the pentest report.
- **Capped paid cohort.** For example, invited hosts only, with a numeric cap, compensating controls attested (RLS, route sweep 4/4, rate limits, restore drill), and the pentest booked with a date.

This plan does not pre-decide that. It is the board's call, and recording it is how the gate stays unweakened.

## 1. Owner rulings needed before engineering can finish (Todd, by Wed 11/4, 12 PM)

| # | Ruling | Why it blocks | Recommendation |
|---|---|---|---|
| **D1** | **The paid release candidate ships on the `live` release profile** (sign-in on) | The pass needs a signed-in studio: `createPassSession` sends `plannerAuthHeaders()` (`src/lib/stripeApi.js`), and the webhook writes the entitlement per studio. Today's `services` profile has no Supabase URL, so no sign-in and no paid path. The workflow itself says choosing `live` "CHANGES WHAT THE PRODUCT IS" (`.github/workflows/pages-from-source.yml:33`) | **Yes, `live` for the release candidate.** It is also what makes RSVP links real (C2). Keep `services` as the default until the release candidate is tagged |
| **D2** | Stage 1: rule the proposal and pre-register the kill gate (`STAGE1-1`) | Money must not be taken before the kill threshold exists (spine stage 1) | Rule `docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md` as drafted, or amend it |
| **D3** | Domain cutover timing (`NAT-6`) | Moving origin moves `localStorage`, so signed-out preview hosts would "lose" plans on the new domain | Configure DNS this week. **Cut the web app over after the release candidate**, with a moving notice. Use the domain now only for legal pages and the native association files |
| **D4** | The cut line, if engineering is behind at Thu 11/5, 6 PM | See §5 | Approve the cut order in §5 in advance |
| **D5** | Name clearance (`STAGE2-1`) | Brand fronting a revenue line | Clear, or rule a launch under the current name with a recorded risk. The store app records (§4) give the store collision check first |
| **D6** | iOS bundle ID and Android application ID, plus the store display name | Permanent once a build is published, and needed before signing and app records | Reverse-domain on the company domain, for example `com.noguessworksystems.<app>`. Todd picks; Claude records it |

## 2. Fix clusters (P0/P1 engineering, collapsed by root cause)

**Shown here:** each cluster's findings closed, root cause, exact code ownership, tests required, dependencies, estimated hours, and whether it can run in parallel.
**Pulled-in P2s:** a P2 appears only when it shares the root cause, or when leaving it would make a P0/P1 fix unsafe to ship. Each pull-in states its reason.

### C1 — Money truth (priority 1)

- **Closes:** `ATTN-6` (P0), `COMP-3`, `ATTN-2`, `FRIC-5` (P1, minimal form). Pulls in `TRUST-4` (P2): it is the same money claim, and leaving it makes the `FRIC-5` fix a contradiction.
- **Root cause:** one function, `hostSpending()`, sums every money source into `committed` without a per-category owner. The double counts:
  - A vendor's unpaid balance (`vendorOwed`, `src/lib/hostSpending.js:267`) is added on top of a budget line that already holds the same contract (`:290`). The header at `:20-26` claims this cannot happen.
  - NGW's own food and supply estimate counts as "spoken for" (`:290`).
  - Choosing "A caterer handles it" leaves grocery pricing in place.
  - Nothing writes a spent amount, while the reveal says "Track spending in real time" (`src/lib/assembleRevealEngines.js:560`).
- **Fix:** each category gets exactly one source of committed money, in this precedence:
  1. A vendor contract in that category.
  2. Else the host's budget line.
  3. Else NGW's estimate, **reported separately as an estimate, not as spoken for**.

  The caterer choice retires the grocery estimate for food. Add the minimal spent writer, "Log a payment" on an existing budget line, via `patchEvent`. Its copy states what it does.
- **Code ownership:**
  - `src/lib/hostSpending.js`, `src/lib/vendorMoney*`.
  - `src/lib/assembleRevealEngines.js:560` (copy only).
  - `hostv2/src/HostShellV2.jsx`: money sheet around `:11984`, and the caterer choice handler in the food decision.
- **Tests (red-proofed):**
  - jest `hostSpending` invariant: across fixtures, every dollar has exactly one category source, and committed ≥ spent.
  - jest: the default sample event is not over budget, and stays the same before and after "Mark caterer paid".
  - jest: "caterer handles it" removes the grocery estimate from committed.
  - jest: the estimate is reported apart from spoken-for.
  - Playwright 390px: money sheet on the sample event shows one spoken-for total, with no false overrun ranked by the One Move; log a payment and see spent move.
- **Depends on:** nothing. It goes first because C5's One Move rows read these numbers.
- **Hours:** 17 (ATTN-6, COMP-3 and ATTN-2 collapse to 12, FRIC-5 minimal 5, TRUST-4 inside). **Parallel:** yes, lane A.

### C2 — RSVP capability truth (priority 2)

- **Closes:** `RSVP-LIVE-1` (P1). Also the "RSVP tracking live" half of `TRUST-1`.
- **Root cause:**
  - The capability predicate checks configuration, not reality. `isRsvpApiConfigured = () => Boolean(BASE)` (`src/lib/api/rsvp.js:19`), and the copy toast keys on it (`hostv2/src/HostShellV2.jsx:5955-5999`).
  - The backend resolves only `public.events` rows (`backend/app/routers/rsvp.py:233`).
  - On the shipped `services` profile, no event ever reaches `public.events`, so the live invite probe returns 404.
- **Fix:** add `isRsvpLinkLive(event)`. It is true only when the API base is set, Supabase is configured, a session exists, and the event has a cloud id. The toast, invite sheet and reveal line key on it. When it is false, the copy says plainly that RSVP links work once you're signed in and the event is saved to your account, and the existing local outbox behavior stays.
- **Code ownership:**
  - `src/lib/api/rsvp.js`.
  - `hostv2/src/HostShellV2.jsx:5955-5999`.
  - `src/lib/assembleRevealEngines.js:535`, shared with C3; land C2 first or coordinate the line.
- **Tests:**
  - jest truth table for the predicate, red-proofed against the old `Boolean(BASE)`.
  - Playwright on the `services` harness: no "guests can RSVP" promise.
  - Playwright on the `live` harness: a signed-in synced event creates an invite.
  - Backend test: invite resolves for a synced event. Extend the existing one if present.
  - **Post-deploy live probe on the release candidate:** a signed-in event's invite returns 200.
- **Depends on:** **D1** for the live leg. The predicate fix ships regardless and makes `services` honest today.
- **Hours:** 5. **Parallel:** yes, lane C.

### C3 — Creation and reveal claims derive from the saved event (priority 3)

- **Closes:** `TRUST-1`, `COMP-1`, `FRIC-2` (P1). `COMP-4` (P2) falls out at no extra cost from the same change.
- **Root cause:** reveal and HostHome lines are printed from stage templates, not read from the saved event:
  - "Guest list built" prints over `guests: []` (`src/lib/assembleRevealEngines.js:535`, shown whenever a count exists, `:328`).
  - "Menu built" is followed by "plan the food."
  - "Backyard" counts as a named venue (`src/lib/phaseProgress.js:131-149`) while the reveal raises a venue blocker (`assembleRevealEngines.js:120-122`).
  - A correction leaves a compound flag with no second type (`:67-72`), producing "An anniversary + ." and a phantom second milestone.
- **Fix:** each reveal claim becomes a function of the saved event. A claim with no backing state prints the truthful pending form. Home-venue-without-town is one rule, shared by `phaseProgress` and the reveal. A correction recomputes the compound flag from the corrected types.
- **Code ownership:** `src/lib/assembleRevealEngines.js` (`:67-72`, `:120-122`, `:328`, `:535`, food line), `src/lib/phaseProgress.js:131-149`.
- **Tests:**
  - jest per claim: the claim prints only when its state exists. Cover the empty guest list, the backyard venue, and the honoree correction.
  - Playwright: correction flow shows one milestone and no "Ceremony Timing" decision.
- **Depends on:** C4's clause ledger for the "didn't make it" receipt wording. Run C3 after C4 in the same lane.
- **Hours:** 8. **Parallel:** yes, lane B, serial after C4.

### C4 — Creation provenance: every clause applied, disclosed, or reported (priority 4)

- **Closes:** `GOLD-F-1`, `GOLD-F-4` (minimal form), `GOLD-F-5`, `TRUST-2` (P1).
  - **Pulls in `GOLD-F-2` (P2):** it is the same ledger, and without it the "didn't make it" list claims a completeness it lacks.
- **Root cause:** the creation sentence is parsed once and its clauses have no ledger:
  - Detectors downstream read event fields, not the creation text, so the Army retirement detector never sees it (`src/lib/militaryRetirement.js:185-195`). A cold start yields branch `null` and 0 decisions, against 6 from the fixture.
  - Vendor intent gets "Noted" and creation writes empty vendors (`HostShellV2.jsx:8457-8458`).
  - A vendor possessive ("Tony's BBQ is catering") is taken as the honoree (`src/lib/smartParseEvent.js` and `src/lib/eventIdentity.js`), at "HIGH CONFIDENCE".
  - Two-letter clauses (DJ, AV, PA) are dropped silently.
- **Fix:**
  - **One clause ledger at creation.** Every clause is applied, disclosed but not applied (shown back to the host), or reported in "didn't make it". No silent drops.
  - **Army retirement.** The detector reads the ledger as well as the event.
  - **Vendor intent.** These clauses create vendor rows in "considering" status, using the categories already in `src/lib/vendorCategoriesByType.js:51`, through `patchEvent`.
  - **Vendor possessives.** A possessive followed by a vendor noun (BBQ, catering, DJ, photography) is a vendor, never the honoree. Confidence drops when the honoree is ambiguous.
  - **Minimal form of `GOLD-F-4`:** the program (timeline) clauses are **disclosed, not applied**. Building timeline writes is cut to after the release candidate.
- **Code ownership:** `src/lib/smartParseEvent.js`, `src/lib/eventIdentity.js`, `src/lib/militaryRetirement.js:185-195`, the creation write in `hostv2/src/HostShellV2.jsx:8457-8458`, `src/lib/vendorCategoriesByType.js` (read only).
- **Tests:**
  - **GOLD-01's own sentence, verbatim**, from `docs/redesign/NGW_PRODUCT_EXPERIENCE_REFERENCE.md:474`, as a jest fixture **and** a Playwright cold-start spec (closes `GOLD-F-5`). It asserts: 6 Army decisions, vendor rows, and all 13 clause units accounted for, with 0 silent.
  - jest: "Grad party for Jake… Tony's BBQ is catering" gives honoree Jake, a catering vendor, and "Tony's BBQ" not as the honoree.
  - jest: DJ, AV and PA are kept or reported.
- **GOLD re-ruling rule:** GOLD-01 moves from FAIL to **PASS WITH CONDITIONS** only if the verbatim spec passes. If the reference requires the program *applied* to the timeline, GOLD-01 stays at CONDITION and the board sees it. It is not relabeled.
- **Depends on:** nothing. Start first in lane B.
- **Hours:** 18 (sum 31, collapsed by the shared ledger; `GOLD-F-4` cut from 13 to 6). **Parallel:** yes, lane B.

### C5 — Core-journey workflow P1s (priority 5)

- **Closes:** `ATTN-3`, `FRIC-3`, `FRIC-4`, `COMP-2` (P1).
- **Root cause:** controls and lines that are not wired to state:
  - "Then, in order" rows call `onCta` without settling (`HostShellV2.jsx:11395`; its own comment at `:11323` names them as previously dead).
  - The attendance toast uses `confirmedCovers`, which returns the planned number in headcount mode (`:6668-6670`, `src/lib/confirmedCovers.js:60`), so "40 confirmed" appears after one Yes.
  - The venue can't be changed at 390px because its chips live in a hidden tile (`:11913-11915`).
  - "The rest can wait till <date>" uses the shopping-list date and ignores earlier due work (`:11271-11273`, `src/lib/phaseProgress.js:404-418`).
- **Fix:**
  - Each row settles to the exact control or is not rendered.
  - The toast reads the actual Yes count.
  - Venue gets an entry in "Everything in your plan", reusing the existing venue control. No new surface.
  - "Can wait till" takes the earliest due date across the plan, from `eventPlan()`'s output; no second prioritizer.
- **Code ownership:** `hostv2/src/HostShellV2.jsx` (`:6668-6670`, `:11271-11273`, `:11395`, `:11913-11915`), `src/lib/confirmedCovers.js`, `src/lib/phaseProgress.js:404-418`.
- **Tests:**
  - Playwright 390px, one per finding: every "then" row lands on a control; one Yes reads "1 confirmed"; venue is changeable from the plan list; a destination event with lodging due soon never says "the rest can wait" past that date.
  - jest for the `confirmedCovers` and `phaseProgress` changes.
- **Depends on:** C1, because ATTN-2's next One Move reads fixed money.
- **Hours:** 12. **Parallel:** yes, lane A after C1.

### C6 — Diagnose a paid-user failure (priority 6)

- **Closes:** `OBS-2` (P2, pulled in by priority 6). Pulls in `FRIC-7` (P2): it is the same save-failure seam, and a paid host's failed save must not be celebrated.
- **Root cause:** `customEventStore` has 0 `captureError` calls. Local save, provider and route failures never reach Sentry, and the One Move claims success after a refused save.
- **Fix:**
  - `captureError` on save refusal or failure, provider failure, route failure, pass-checkout failure and pass-verify failure, each with tags for release SHA, profile and event-id hash. No PII, consistent with `sendDefaultPii: false`.
  - One analytics event per failure class. Analytics stays opt-out-respecting.
  - The One Move reads save status and does not celebrate a failed write.
- **Code ownership:** `hostv2/src/` (`customEventStore`, the save path in `HostShellV2.jsx`), `src/lib/sentry.js` and `src/lib/analytics.js` (call sites only).
- **Tests:** vitest per failure class: a capture is called, with a mocked Sentry, and red-proofed. Extend the existing failed-save Playwright spec so the One Move does not claim success.
- **Depends on:** none. **`OBS-1` (owner) proves arrival in production.**
- **Hours:** 6. **Parallel:** yes, lane C.

### C7 — Regression and GOLD proof (priority 7)

- **Closes:** `VERIFY-1` (P2, pulled in). Every iPhone host is on WebKit, and a paid release that has never run its flagship platform's engine is not certifiable. Also proves C1–C6 together.
- **Work:**
  - **Add a Playwright WebKit project in CI** (installed in GitHub Actions; never `playwright install` in this container). Land it on **day 1** so every cluster PR runs on it. Start with the critical-journey specs, then widen.
  - **Paid-path end-to-end on the `live` profile in Stripe test mode:** sign in, buy the pass, webhook sets the entitlement, unlock, refund revokes. Use the existing pass webhook race spec as the base.
  - **GOLD rerun on the release candidate:** GOLD-01 verbatim (from C4) plus the existing gold specs. Record each row's ruling in the plan's §6 table.
  - **A full suite run on the release candidate SHA:** jest, vitest, backend 441+, Playwright Chromium and WebKit, `npm run gate:cra`. Any unevaluated row is re-run alone and recorded (Command Step 5n).
- **Code ownership:** `hostv2/playwright.config.*`, the CI workflow e2e job, `hostv2/e2e/`.
- **Depends on:** WebKit first; the rest after C1–C6 merge.
- **Hours:** 14. **Parallel:** WebKit on day 1 in lane C; the rest Friday.

### C8 — Release-candidate integration

- **Closes:** the engineering side of `LEGAL-1` and `PAY-1`, plus `NAT-3` (shared with web).
- **Work:**
  - Privacy, Terms, Refunds and Support links in Settings and on the pass sheet, pointing at the URLs Todd publishes. The first-open notice gains its Privacy link (consent draft §6).
  - **A single public-origin seam** (`NAT-3`). Public links, Stripe return URLs and the magic-link redirect take a configured public origin, falling back to `window.location.origin`. This is a prerequisite for both the domain move and the native shell. Sites: `HostShellV2.jsx:3850, 5955`; `src/lib/stripeApi.js:53, 135`; `src/lib/supabaseClient.js:73`.
  - A release-candidate build on `live` with `REACT_APP_BILLING_LIVE=1`, as a **deliberate dispatch, not the push default**.
- **Tests:**
  - jest: the origin seam is used at every listed site. Enumerate them with a grep-backed test so a new site can't bypass it.
  - jest: legal links render.
  - The release stamp test (`theStampSaysWhatShipped`) covers the `live` profile.
- **Depends on:** Todd's legal URLs for the link targets. The links can land with the URLs as configuration.
- **Hours:** 5 (`NAT-3` counted here, not in native). **Parallel:** yes, lane C.

### Totals

C1 17 + C2 5 + C3 8 + C4 18 + C5 12 + C6 6 + C7 14 + C8 5 = **85 h**, down from 111 h, across three engineering lanes.

## 3. Parallel workstreams

| Lane | Owner | Work, in order | Hours | Touches |
|---|---|---|---|---|
| **A** | Claude (this session) | C1 → C5 | 29 | `hostSpending`, money sheet, One Move rows |
| **B** | Codex, or a second Claude | C4 → C3 | 26 | parser, identity, militaryRetirement, reveal engines, creation write |
| **C** | Claude #2 | C7 WebKit (day 1) → C2 → C6 → C8 → C7 proof (Fri) | 30 | rsvp, observability, origin seam, CI |
| **N** | Claude #3 (native) | §4 below | about 30 | native branch, CORS, policy packet |
| **P** | Claude (lane A, Sat–Sun) | §7 command obligations | about 6 | gate records, artifact, HANDOFF |
| **T** | Todd | Owner checklist | — | dashboards, counsel, testers, board |

**Collision rules for `HostShellV2.jsx`.** Lanes A, B and C all touch it, in different line ranges.
- One PR per cluster, small.
- Merge to main only after Checks pass; rebase on main before each merge.
- Merge order when PRs are ready together: C1 → C2 → C4 → C3 → C5 → C6 → C8.
- No lane reformats or moves code outside its listed lines.

**Calendar**

| Day | Lanes A/B/C | Todd |
|---|---|---|
| **Tue 11/3** (tonight) | Plan committed. Lane C opens the WebKit PR | Rulings D1–D6 started. Attorney packet sent. Apple enrollment done; **Google organization enrollment submitted**. Pentest firms contacted |
| **Wed 11/4** | C1, C4 and C2 in flight. C6 starts | RUNBOOK §A (RLS), §C (rate limits), §D (telemetry). Testers recruited. **D1 ruled by noon** |
| **Thu 11/5** | C1 merged → C5. C4 merged → C3. C6 and C8 land. **6 PM: cut-line check (§5)** | RUNBOOK §B (restore drill). DNS configured. Pentest booked. If accounts have cleared: app records, IDs (D6) and signing set up |
| **Fri 11/6** | C3 and C5 merge. **Feature freeze 3 PM.** C7 proof runs on the release candidate SHA. Release candidate tagged and deployed on `live`. Re-score board (§7) | Legal pages published if the attorney has returned |
| **Sat 11/7** | Fix only release-blocking regressions | **Live-key Stripe lifecycle** on the release candidate. **UAT Tester A + B** |
| **Sun 11/8** | UAT P0/P1 → fix or block. §7 gate records, artifact, HANDOFF | UAT synthesis review. Board materials read |
| **Mon 11/9** | — | **Stage 9 board convenes.** Verdict recorded with `boardSeats` and `boardVerdict` |

## 4. Native this week: clear blockers, start packaging, never hold the web release candidate

| Item | Finding | This week | Owner |
|---|---|---|---|
| Billing policy | `NAT-1` (P0) | The four questions from the recertification §21 go to counsel or a store-policy check on Tue. **Interim:** native builds never open Stripe Checkout | Todd sends; Claude drafts the packet |
| Public-origin seam | `NAT-3` (P0) | **Done inside C8** (shared with web) | Lane C |
| Account deletion | `NAT-2` (P0) | Backend endpoint (deletes studio data, Supabase user, Stripe customer reference) plus an in-app control plus a web deletion URL. Design and backend this week; lands after the release candidate unless it is complete and tested by Thu | Lane N |
| Magic-link return | `NAT-4` (P0) | Design the deep-link handler against the domain (D3). The association files are hosted on the domain | Lane N; Todd DNS |
| Policies and support URL | `NAT-5` (P0) | The same pages as `LEGAL-1` | Todd |
| Shell gaps | `NAT-7` (P1) | CORS allowlist adds `capacitor://localhost` and the Android equivalent (`backend/app/config.py:35-42`). The analytics `IS_LOCAL` check must not match a shell origin (`src/lib/analytics.js:22`). Inventory the download and print calls (`HostShellV2.jsx:9002, 18289, 1262`; `InviteV2.jsx:1299`) for a native bridge | Lane N |
| Shell scaffold | — | Capacitor iOS and Android projects on a **separate branch**, wrapping the hostv2 build. A smoke run in a simulator is a CAPABILITY GAP in this container, so Todd or CI runs it | Lane N |
| Platform declaration | `STAGE2-2` (P1) | Declare iOS and Android surfaces (`facing: public`, `platform: ios` / `android`) in the workspace surfaces table at stage 2, with HIG/Material review criteria | Lane N |
| Privacy labels / Data safety | `NAT-8` (P1) | Draft both declarations. Guest dietary and allergy data counts as health data. Processors: PostHog, Sentry, Stripe, Supabase | Lane N drafts; Todd submits |
| Developer accounts | `NAT-9` | **D-U-N-S complete and Apple Developer enrollment submitted (11/3).** Google Play Console (organization) is the only enrollment left to submit. Remaining lead time is Apple's verification call and Google's organization verification, typically days. An organization Play account also avoids the closed-testing period Google requires of new personal accounts | Todd |
| Store records and identifiers | `NAT-9`, `STAGE2-1` | Once enrolled:<br>- Create the app record in App Store Connect and in Play Console. This reserves the store name, and the store collision check is the first step of name clearance (Command Step 3b), so it feeds D5.<br>- Fix the bundle ID and application ID (D6). They are permanent once published | Todd; Claude drafts the record fields |
| Signing | `NAT-9` | Apple distribution certificate and provisioning profile. Android upload key, with Play App Signing enrolled. **Keys and certificates never enter this public repo**; they go in the CI secret store or on Todd's machine | Todd |
| Internal test builds | — | **New this week if both accounts clear by Thu 11/5:** upload the scaffold build to TestFlight **internal** testing (no beta review for internal testers) and the Play **internal testing** track. These are packaging proof only:<br>- The purchase path is hidden in native builds (interim `NAT-1` ruling).<br>- They are not a store submission.<br>- They are not on the web release candidate's path.<br>If the accounts haven't cleared, this moves to the week after with nothing else blocked | Lane N builds; Todd uploads |
| Simulator and device smoke | — | A CAPABILITY GAP in this container. It runs on a macOS GitHub Actions runner for iOS and an Android emulator job, or on Todd's Mac with Xcode | Lane N (CI); Todd (fallback) |

**Native exit for the week:**
- All four policy questions are with counsel.
- `NAT-3` is merged, and `NAT-2` and `NAT-7` are in review.
- The scaffold branch builds and passes a simulator smoke run.
- Both developer accounts are enrolled, or verification is pending with no action left on our side.
- App records exist in both stores, and the bundle ID and application ID are fixed (D6).
- **Stretch, if the accounts clear by Thu:** an internal build on TestFlight and on the Play internal track, with purchase hidden.

Native work is **not** on the web release candidate's critical path.

## 5. Cut line (pre-approved by D4)

If engineering is behind at **Thu 11/5, 6 PM**, cut in this order. Each cut becomes a recorded owner ruling and an open row for the board; it is not silently dropped.

1. `FRIC-5` minimal "Log a payment". Ship the `TRUST-4` copy fix alone, so nothing claims tracking.
2. `FRIC-2` (the honoree-correction phantom milestone) is disclosed to the board as open.
3. `COMP-2` is disclosed to the board as open.

**Never cut:** C1's `ATTN-6`, `COMP-3` and `ATTN-2`; C2; `TRUST-1` and `TRUST-2`; `GOLD-F-1` and `GOLD-F-5`; C6; WebKit on the critical journeys.

## 6. Deferred until after the one-week release candidate

These are cosmetic, out of scope for the release, or already accepted. None blocks a core journey, and none prevents a P0/P1 fix from shipping safely.

| Finding | Severity | Why it is safe to defer |
|---|---|---|
| `TRUST-3`, `TRUST-5`, `COMP-5`, `COMP-8`, `FRIC-1` | P2 | Wording and recall friction. No wrong money, no dead control, no false capability |
| `GOLD-F-6`, `GOLD-F-11` | P2/P3 | Test-completeness gaps on rows that pass with conditions. Recorded for the board |
| `GOLD-F-3` | P2 | HostV3 (structural fact extraction) |
| `GOLD-F-7`, `GOLD-F-8`, `GOLD-F-10`, `GOLD-F-9` | P2/P3 | Accepted debt. The C7 paid end-to-end covers the server entitlement leg that `GOLD-F-8` names |
| `ATTN-4`, `ATTN-5`, `COMP-6`, `COMP-7`, `COMP-9`, `COMP-10`, `FRIC-6`, `FRIC-8` | P2/P3 | Accepted debt or HostV3 |
| `NIELSEN-1` | P2 | No ambient sync cue. C6 makes failures diagnosable, and the existing recovery surface passes |
| `SEC-5` | P2 | GitHub Pages cannot send headers. A meta CSP is possible but risky in a freeze week, so revisit with the domain cutover |
| `SEC-6` | P2 | Admin console reachable publicly, but read-only with writes refused (401). The board sees it as a reach/`facing` mismatch |
| `GOLD-F-4` timeline application | — | Disclosed instead of applied (C4 minimal form) |
| Native `NAT-2`, `NAT-4`, `NAT-7`, `NAT-10`, store submission | P0–P2 native | Not on the web path (§4) |
| Root CRA dependency audit (105) | stage 8 | Legacy, frozen. CRA deletion is scheduled post-Sprint-2 |

## 7. Workstream P: Path-to-Production command obligations for a valid stage 9

The recertification's erratum lists what it did not do. These close it, and none is optional for a stage 9 pass.

1. **Stage 4, three instruments, on the release candidate SHA (Fri):**
   - `nielsen-critique`: a **fresh full 10-heuristic pass** with file:line citations, not a re-check of earlier findings.
   - `measure-dont-look`: computed geometry at 390px and desktop on HostHome, the money sheet, the reveal and the pass sheet.
   - `red-proof` on every new guard from C1–C8.
2. **A re-score board.** The builder never scores its own work (spine stage 4, amended 9/6). A board re-scores C1–C8 on the code and credits nothing it has not opened.
3. **Step 1 and Step 2 gap table** with both halves: `requiredSkills[stage]` plus the standing obligations.
   - The Command Center gate API is not reachable from a cloud session. Record it as a **CAPABILITY GAP**, with Todd running `node scripts/read-gate-record.mjs` locally.
   - Meanwhile, use the workspace `docs/gate-records/2026-11-02/records.json`.
4. **Steps 5 and 5p.** Write gate records for stages 4, 5, 6, 7 and 9 in the workspace records, replacing in place with history kept. Then audit every required field and skill.
5. **Step 6.** Republish the gate artifact from the live copy. The `Recorded` stamp must equal `recordedAt` by `check-artifact-stamp.mjs`.
6. **Step 7 and 7a.** Update HANDOFF with the checked SHA, suite counts and the traps found this week.
7. **Stage 9.** The four retro public gates, as an explicit checklist:
   - Stage 2 activation/UX doctrine.
   - Stage 4 critique.
   - Stage 5 full review (RUNBOOK §A–C plus route sweep plus RLS gate plus the pentest status).
   - Stage 7 instrumentation plus tracker sync (`OBS-1` arrival plus C6).

   The server refuses a stage 9 pass without `boardSeats` and `boardVerdict`.

## 8. Exit criteria for the release candidate (checkable)

- [ ] Every P0/P1 engineering row above is merged, each with a red-proofed test, or cut by a recorded D4 ruling.
- [ ] The full suite is green on the release candidate SHA in Chromium **and** WebKit, with no unevaluated row.
- [ ] The release candidate is deployed on `live`. The live commit equals the tagged SHA, read from `RELEASE_SHA`, not the dashboard.
- [ ] The live probe of a signed-in event's invite returns 200.
- [ ] The paid end-to-end passes in test mode, and Todd's live-key purchase, refund and decline is recorded.
- [ ] Owner checklist items 1–4 are attested with evidence.
- [ ] UAT A and B are run, and every P0/P1 they find is fixed or put before the board.
- [ ] Workstream P items 1–7 are done.
- [ ] Legal pages are published and linked. If not, the board is told the release candidate cannot charge.
