# HostV2 Path-to-Production Recertification — November 3, 2026

Executed from `docs/handoffs/2026-11-03_CLAUDE_HOSTV2_RECERTIFICATION.md`. Earlier audits and gate rulings were used as evidence, not as inherited truth. Every claim below cites current code, a current run, or a current live probe. Anything older is labeled **historical** or **unverified**. The machine-readable companion is `docs/audits/2026-11-03_HOSTV2_RECERTIFICATION_MATRIX.json` (66 findings — P0 6, P1 25, P2 30, P3 5).

Boundaries kept: Legacy CRA (`src/App.js`) was not modified, HostV2 was not redesigned, and no HostV3 work began. No gate was weakened, and billing was not turned live. This audit changed no runtime code.

---

## 1. Executive verdict

**NO-GO** for promotion (stage 9 entry, charging money, recruiting strangers, or app-store packaging).

- **The web free preview may continue as is.** It is a public URL, and it is not promoted.
- **Taking money requires** every `FIX BEFORE PROD` row (§4) closed, plus every `OWNER ACTION BEFORE PROD` row (§5) closed or attested.
- **The verdict rests on two P0 classes:**
  - **One P0 shows wrong numbers in the product today.** `ATTN-6` double-counts caterer money and raises a false over-budget alarm, and the One Move then ranks that alarm first.
  - **Five P0s block native packaging.** These are `NAT-1` to `NAT-5`: store billing policy, account deletion, links derived from the app origin, magic-link return, and unpublished policies.
- **The P1s split two ways:**
  - **Product truth (15).** A dead RSVP promise on the live site, a reveal that overclaims, a vendor misread as the honoree, money counted as committed that is not, and dead rows.
  - **Owner and external work (8).** Human UAT, the live Stripe lifecycle, legal, RLS attestation, backups, and a pentest.
- **Several earlier "passed" rulings do not survive re-measurement on current main:**
  - **Stage 4.** It now fails on comprehension, attention and trust.
  - **Stage 6.** It fails because a public P1 is open.

## 2. Commit, SHA and environment examined

| Item | Value |
|---|---|
| Repo / branch | `twillis45/ngw-event-planner`, `main-2utz0n` |
| Examined | `5f97a1a` (main `d22a968` plus one docs commit). Runtime under audit: `9ccbaaf`, live on GitHub Pages and stamped `RELEASE_SHA` by the gated `pages-from-source.yml` deploy |
| CI | Checks green on `9ccbaaf` (run 41483097916). Deploy run 41487968398 live. Scheduled dependency audit ran 11/2/2026 |
| Live profile `services` | API `https://ngw-events-api.onrender.com`. **No Supabase URL in the shipped bundle**, so there is no sign-in and data is localStorage only. `REACT_APP_BILLING_LIVE` is empty. The PostHog key and Sentry DSN ship |
| Backend tests | 441 pass on the pinned FastAPI 0.115 venv |
| Frontend tests | jest (CRA shared lib) and vitest (hostv2). Playwright Chromium only; there is **no WebKit project** (`VERIFY-1`) |
| Error/recovery and persistence specs re-run on current main | 9 specs, **36/36 pass**: refused save, failed save, cross-device sync, pass webhook race, words stay with their event, recovery surface, analytics opt-out, no-forecast, gold07 |
| Known flake (not a code failure) | `customEventsAreVisible` vitest cold-import 5s timeout. Passes alone |
| Method | Static reading of current code, live probes of the deployed site and API, current spec runs, and four scoped audit passes run independently on current main: comprehension/trust, attention/friction, GOLD, and native. Each pass's findings were re-checked against code before entering the matrix |

## 3. Path-to-Production stage 0–10 matrix

| Stage | Ruling (current) | Basis | Earlier record (historical) |
|---|---|---|---|
| 0 Surface declaration | **N/A — satisfied** | Surfaces table in workspace `CLAUDE.md` declares `facing` and `platform` for hostv2, admin, demo bar and CRA. *iOS/Android are undeclared* (see stage 2) | Passed |
| 1 Problem/wedge | **OWNER ACTION** (`STAGE1-1`) | `docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md` drafted (wedge basis; GO at ≥2 of 3 at $39, no discount; $0 spend cap). The kill threshold is not pre-registered and no ruler is recorded | Passed |
| 2 Scope/platform | **CONDITION** (`STAGE2-1`, `STAGE2-2`) | Web scope declared. Name not cleared. No iOS/Android scope, HIG/Material review, or criteria | Passed |
| 3 Build to spec | **CONDITION** (`RSVP-LIVE-1`) | Engine and shell build green. The live RSVP path is promised but cannot work on the shipped profile | Passed |
| 4 Usability (guard + measurement + Nielsen) | **FAIL** | P0 `ATTN-6`. P1s: `TRUST-1/2`, `COMP-1/2/3`, `ATTN-2/3`, `FRIC-2/3/4/5`, `GOLD-F-1/4/5`. Historical Nielsen #2–#5 re-verified closed; #1 partly open (`NIELSEN-1`) | Passed |
| 5 Enumerating (security/legal/consent) | **CONDITION** | RLS gate 14/14 in the repo, route sweep 4/4, hostv2 `npm audit` 0, consent toggle and notice live. Owner attestations are open (`SEC-1/2/3/4`) | Passed |
| 6 Reach | **FAIL** | The spine requires public P0/P1 resolved before reach. Public P0/P1 rows are open (§4) | Passed with conditions |
| 7 Instrumentation | **CONDITION** (`OBS-1`, `OBS-2`) | Sentry initializes and reports from the error boundary, chunk load and cloud libs. Production arrival is unproven, and local save failures are not reported | Passed with conditions |
| 8 Pre-launch hardening | **CONDITION** | Error/recovery specs 36/36. No WebKit (`VERIFY-1`), no restore drill (`SEC-2`), no security headers (`SEC-5`, accepted debt) | Passed with conditions |
| 9 Promotion (four retro gates) | **FAIL** | No human UAT (`UAT-1`), no live-key payment run (`PAY-1`), no published legal (`LEGAL-1`), no pentest (`SEC-4`), and §4 open. The board has never convened | Entry refused |
| 10 Operate | **N/A** | Not reachable before 9 | — |

## 4. `FIX BEFORE PROD` matrix

Engineering only, total **111 h** (about three focused weeks). Each closes with a red-proofed test, per the coding rules.

| ID | Sev | Finding | Stage | Eng h | What the customer gets |
|---|---|---|---|---|---|
| `ATTN-6` | P0 | Over-budget alarm from double-counted caterer money | 4 | 6 | The One Move ranks a budget overrun that is not real and tells the host to trim food; two different 'spoken for' totals on one sheet. |
| `ATTN-2` | P1 | Choosing a caterer leaves money wrong and prompts nothing | 4 | 6 | Headroom overstated and the key booking (the caterer) is never prompted. |
| `ATTN-3` | P1 | 'Then, in order' rows that do nothing | 4 | 3 | An arrow row that does nothing on the core attention surface. |
| `COMP-1` | P1 | HostHome contradicts itself about the location | 4 | 3 | The first HostHome says 'Add the location' while the plan parts say 'Where it happens · handled'. |
| `COMP-2` | P1 | 'The rest can wait till Jun 7' on a destination event with near-term lodging work | 4 | 3 | Host reads permission to wait months while the room block is due in weeks. |
| `COMP-3` | P1 | 'Spoken for' counts NGW's own estimate as committed money | 4 | 4 | Planned/expected/committed/spent collapse: NGW's own guess shown under a commitment word on day 0. |
| `FRIC-2` | P1 | Correcting the honoree creates a phantom second milestone | 4 | 4 | Correcting NGW's misunderstanding makes the plan worse and invents a second milestone. |
| `FRIC-3` | P1 | Attendance toast says '40 confirmed' after one Yes | 4 | 2 | The attendance confirmation reports the wrong count. |
| `FRIC-4` | P1 | Venue cannot be changed once set at 390px | 4 | 4 | A host on a phone cannot change a venue once set; a city counts as an address. |
| `FRIC-5` | P1 | No way to record an expense | 4 | 10 | A deposit or store run cannot be logged, so 'spent' is fiction — on a product sold on money truth. |
| `GOLD-F-1` | P1 | Army retirement guidance silently lost on a real cold start | 4 | 5 | Honor guard, shadowbox and uniform guidance appear in demos but not on the real Army retirement. |
| `GOLD-F-4` | P1 | Vendor intent and program heard but never applied | 4 | 13 | Her stated vendors and program neither shape nor rank the plan. |
| `GOLD-F-5` | P1 | No test runs GOLD-01's own sentence | 4 | 5 | GOLD-01 was never measured on its own input — which is how GOLD-F-1/F-2 shipped. |
| `RSVP-LIVE-1` | P1 | Live RSVP links are dead but the app promises they work | 3 | 4 | On the live site the copy toast says 'anyone who opens it can RSVP themselves, no app needed' and the native share sends the link; every guest gets a dead link. The 2026-08-06 board fix assumed demo profile = no API base; the services profile (2026-09-23) broke that assumption. |
| `TRUST-1` | P1 | Reveal says guest list built and RSVP tracking live over an empty list | 4 | 2 | Host believes guests exist and replies are being collected; neither is true. |
| `TRUST-2` | P1 | Vendor name taken as honoree, labeled high confidence | 4 | 6 | Invite and event carry the wrong person's name; the caterer is silently lost, under a 'nothing made up' claim. |
| `COMP-4` | P2 | Reveal says menu built; HostHome says plan the food | 4 | 2 | The historical reveal-vs-HostHome contradiction persists for food. |
| `COMP-5` | P2 | Type guess admitted, then stated as certain | 4 | 2 | A guess becomes certainty one screen later. |
| `COMP-8` | P2 | Access and health needs heard but not shown back | 4 | 2 | The host cannot see that NGW heard the most personal thing she said. |
| `FRIC-1` | P2 | City in the sentence dropped then asked again | 4 | 3 | Duplicated question; a stated fact discarded. |
| `FRIC-7` | P2 | Failed save leaves the One Move claiming success | 4 | 3 | A failed save is celebrated as progress. |
| `GOLD-F-2` | P2 | Two-letter clauses silently dropped | 4 | 2 | 'DJ', 'AV', 'PA' vanish without a receipt; the didn't-make-it list claims completeness. |
| `GOLD-F-6` | P2 | GOLD-05 absence check incomplete | 4 | 2 | The no-venue-nag guard can stay green while nagging. |
| `OBS-2` | P2 | hostv2 local save, provider and route failures not reported | 7 | 4 | Support is blind to local save failures, provider failures and route failures in production. |
| `TRUST-3` | P2 | Headcount marks an after-party task done | 4 | 1 | A real task silently disappears on day 0. |
| `TRUST-4` | P2 | 'Budget … live. Track spending in real time.' | 4 | 1 | Overclaims a feed that does not exist (and FRIC-5: no entry). |
| `TRUST-5` | P2 | 'Vendors assigned' at any status | 4 | 1 | 'Considering' reads as assigned. |
| `VERIFY-1` | P2 | No WebKit/Safari engine in the matrix | 4 | 6 | Safari/WebKit (every iPhone, every iOS app web view) untested. |
| `GOLD-F-11` | P3 | GOLD-04 proof starts after intake | 4 | 2 | Intake-to-plan path for access needs not browser-proven. |

## 5. `OWNER ACTION BEFORE PROD` matrix

These cannot be verified or done from the repo. Each row is marked **OWNER ACTION**, and §17, §18 and §23 give the exact procedure.

| ID | Sev | Finding | Stage | Eng h | External? | What the customer gets |
|---|---|---|---|---|---|---|
| `NAT-1` | P0 | Store billing policy for the $39 pass | 9 | 0 | yes | Store rejection, or removal, if the $39 pass is sold via Stripe inside the app. |
| `NAT-5` | P0 | Policies and support URL unpublished | 9 | 0 | yes | Store listings require privacy policy and support URLs. |
| `LEGAL-1` | P1 | Privacy/refund/terms/support not published or linked | 9 | 2 | yes | Charging without published refund/privacy/terms and a support address. |
| `NAT-6` | P1 | No custom domain | 9 | 2 | yes | No universal links / app links possible; brand URL absent. |
| `NAT-8` | P1 | Privacy labels / Data safety declarations | 9 | 0 | yes | Mis-declared privacy labels are a rejection and a legal exposure. |
| `PAY-1` | P1 | Live-key Stripe purchase/refund lifecycle never run | 9 | 4 | yes | Cannot charge a stranger: purchase, entitlement, failure and refund never exercised with live keys. |
| `SEC-1` | P1 | Live RLS applied-status unattested | 5 | 0 | yes | If 018 is not applied, six tables are readable/writable with the public anon key. |
| `SEC-2` | P1 | Backups on + one restore drill | 5 | 0 | yes | A data-loss incident with an untested restore. |
| `SEC-4` | P1 | External pentest not run | 5 | 0 | yes | No independent test of a public, paid surface. |
| `UAT-1` | P1 | Two first-time-human sessions never run | 9 | 0 | yes | Nobody has watched a stranger use the product; every comprehension finding above was found by a script, not a person. |
| `NAT-9` | P2 | Developer accounts, signing, store assets, reviewer login | 9 | 8 | yes | Cannot submit. |
| `OBS-1` | P2 | Sentry/PostHog production arrival unproven | 7 | 0 | yes | Telemetry may be silently dark in production. |
| `SEC-3` | P2 | Auth rate-limit posture unverified | 5 | 0 | yes | Unknown brute-force/abuse posture on auth. |
| `STAGE1-1` | P2 | Stage 1 basis, kill gate and ruler unrecorded | 1 | 0 | yes | Money taken before the kill threshold is pre-registered. |
| `STAGE2-1` | P2 | Name not cleared | 2 | 0 | yes | Brand fronting a revenue line without clearance. |

## 6. `ACCEPTED HOSTV2 DEBT` matrix

These are real findings that do not block a paid web launch. They are recorded so they are not rediscovered. Total about **43 h** if ever paid down.

| ID | Sev | Finding | Stage | Eng h | What the customer gets |
|---|---|---|---|---|---|
| `ATTN-4` | P2 | Right section, wrong control | 4 | 2 | One extra tap; one mislabeled step. |
| `COMP-6` | P2 | Two 'handled' counts | 4 | 1 | Two numbers for one idea. |
| `COMP-7` | P2 | 'Guests · handled' for an estimate | 4 | 1 | A rough estimate reads as done. |
| `FRIC-6` | P2 | Vendor flow limited | 4 | 3 | Vendor setup friction. |
| `GOLD-F-10` | P2 | GOLD-02/08 lack acceptance specs | 4 | 8 | Two rows untested end-to-end. |
| `GOLD-F-7` | P2 | GOLD-07 backend leg mocked | 4 | 8 | Server-side RSVP storage bug would pass. |
| `GOLD-F-8` | P2 | GOLD-09 shell-only | 4 | 7 | Server entitlement fault unseen in CI. |
| `NIELSEN-1` | P2 | Historical Nielsen #1: ambient sync visibility (partly fixed) | 4 | 4 | Queued/failed sync noticed late. |
| `SEC-5` | P2 | No security headers on the static host | 5 | 2 | Clickjacking/injection hardening absent; matters more once money is taken. |
| `SEC-6` | P2 | Admin console facing internal, reach public | 5 | 4 | Internal console reachable by the public (read-only shell, writes refused). |
| `COMP-10` | P3 | Reveal Skip clipped | 4 | 1 | Skip partly hidden. |
| `COMP-9` | P3 | Generic venue question under 'handled' | 4 | 1 | Minor contradiction. |
| `GOLD-F-9` | P3 | GOLD-10 doc contradiction | 4 | 1 | Doc says closed and open. |

## 7. `DEFER TO HOSTV3` matrix

These need structural change, which the handoff rules out of scope for HostV2 (no redesign).

| ID | Sev | Finding | Stage | Eng h | What the customer gets |
|---|---|---|---|---|---|
| `ATTN-5` | P2 | Events list shows nothing urgent | 4 | 6 | Cross-event urgency invisible. |
| `GOLD-F-3` | P2 | Facts inside used clauses absorbed silently | 4 | 10 | '30-year', 'Army', 'Maryland/DC' unreported. |
| `FRIC-8` | P3 | Polish set | 4 | 3 | Polish. |

**Native packaging work** (a separate disposition; needed only if iOS/Android proceeds) totals **86 h** before store assets and review cycles:

| ID | Sev | Finding | Stage | Eng h | What the customer gets |
|---|---|---|---|---|---|
| `NAT-2` | P0 | No account deletion | 9 | 20 | Mandatory rejection reason. |
| `NAT-3` | P0 | Public links derive from the app origin | 9 | 6 | Inside a shell every RSVP/vendor/QR/return link becomes capacitor://localhost — dead for guests. |
| `NAT-4` | P0 | Magic-link sign-in cannot return to the app | 9 | 14 | Sign-in cannot return into the app; App Review has no usable demo login. |
| `NAT-7` | P1 | Shell-specific gaps (origin, CORS, downloads, storage) | 9 | 30 | Silent analytics loss, blocked API calls, dead exports, possible data eviction in the app. |
| `STAGE2-2` | P1 | iOS/Android surfaces undeclared at stage 2 | 2 | 8 | Native surfaces have no stage-2 record; every later native gate inherits wrong defaults. |
| `NAT-10` | P2 | Guideline 4.2 risk | 9 | 8 | Rejection as a repackaged website. |

## 8. GOLD rerun and re-ruling

Each row was re-run against current main, not read from earlier rulings.

| Row | Ruling 11/3/2026 | Reason |
|---|---|---|
| GOLD-01 (WANDA-A, Army retirement cold start) | **FAIL** | Of 13 clause units in the GOLD-01 sentence, 6 are applied, 4 are disclosed but not applied, and 4 are silently dropped. A cold-created event yields branch `null` and 0 Army decisions, against 6 from the fixture (`GOLD-F-1`). Vendor intent and program are answered only with "Noted" (`GOLD-F-4`). No test runs the actual sentence (`GOLD-F-5`) |
| GOLD-02 | **NOT TESTED** | No acceptance spec exists (`GOLD-F-10`). Earlier pass rulings are historical and unverified |
| GOLD-03 | PASS WITH CONDITIONS | Silent drop of two-letter clauses (`GOLD-F-2`) |
| GOLD-04 | PASS WITH CONDITIONS | Browser proof starts after intake (`GOLD-F-11`) |
| GOLD-05 | PASS WITH CONDITIONS | Absence check incomplete (`GOLD-F-6`) |
| GOLD-06 | PASS WITH CONDITIONS | Facts inside used clauses absorbed silently (`GOLD-F-3`, deferred) |
| GOLD-07 | PASS WITH CONDITIONS | The backend leg is mocked (`GOLD-F-7`); gold07 spec passes |
| GOLD-08 | PASS WITH CONDITIONS | No acceptance spec (`GOLD-F-10`) |
| GOLD-09 | PASS WITH CONDITIONS | Proven at shell level only (`GOLD-F-8`) |
| GOLD-10 | PASS WITH CONDITIONS | The doc both closes and reopens it (`GOLD-F-9`) |

**Re-ruling:** the GOLD set does **not** pass as a whole. GOLD-01 fails and GOLD-02 is untested.

- **`GOLD-F-1` (P1, fix_before_prod) — Army retirement guidance silently lost on a real cold start.** Honor guard, shadowbox and uniform guidance appear in demos but not on the real Army retirement.  
  Evidence: src/lib/militaryRetirement.js:185-195 detector never reads the creation sentence; probe: cold-created WANDA-A -> branch null, 0 Army decisions; fixture -> 6  
  Reproduce: Create WANDA-A from the sentence → no Army decisions.
- **`GOLD-F-4` (P1, fix_before_prod) — Vendor intent and program heard but never applied.** Her stated vendors and program neither shape nor rank the plan.  
  Evidence: HostShellV2.jsx:8457-8458 creation writes empty vendors and timeline; 'Noted' is the only response to vendor intent and the program; src/lib/vendorCategoriesByType.js:51 already lists the categories  
  Reproduce: WANDA-A sentence → vendors/timeline empty.
- **`GOLD-F-5` (P1, fix_before_prod) — No test runs GOLD-01's own sentence.** GOLD-01 was never measured on its own input — which is how GOLD-F-1/F-2 shipped.  
  Evidence: grep: the WANDA-A sentence exists only in docs (docs/redesign/NGW_PRODUCT_EXPERIENCE_REFERENCE.md:474) and shortened jest strings  
  Reproduce: n/a
- **`GOLD-F-10` (P2, accepted_hostv2_debt) — GOLD-02/08 lack acceptance specs.** Two rows untested end-to-end.  
  Evidence: no acceptance spec for GOLD-02, GOLD-08  
  Reproduce: n/a
- **`GOLD-F-2` (P2, fix_before_prod) — Two-letter clauses silently dropped.** 'DJ', 'AV', 'PA' vanish without a receipt; the didn't-make-it list claims completeness.  
  Evidence: src/lib/smartParseEvent.js:1741,1882 drops clauses of <=2 characters  
  Reproduce: WANDA-A sentence.
- **`GOLD-F-3` (P2, defer_hostv3) — Facts inside used clauses absorbed silently.** '30-year', 'Army', 'Maryland/DC' unreported.  
  Evidence: facts inside a 'used' clause absorbed silently by design (smartParseEvent.js:1857-1859,1913)  
  Reproduce: WANDA-A.
- **`GOLD-F-6` (P2, fix_before_prod) — GOLD-05 absence check incomplete.** The no-venue-nag guard can stay green while nagging.  
  Evidence: hostv2/e2e/ryanWay.spec.mjs:31-38 VENUE_ASKS omits 'Pick the place in {town}'  
  Reproduce: n/a
- **`GOLD-F-7` (P2, accepted_hostv2_debt) — GOLD-07 backend leg mocked.** Server-side RSVP storage bug would pass.  
  Evidence: gold07RsvpCascade.spec.mjs mocks the backend  
  Reproduce: n/a
- **`GOLD-F-8` (P2, accepted_hostv2_debt) — GOLD-09 shell-only.** Server entitlement fault unseen in CI.  
  Evidence: thePassSurvivesTheWebhookRace covers the shell only  
  Reproduce: n/a
- **`GOLD-F-11` (P3, fix_before_prod) — GOLD-04 proof starts after intake.** Intake-to-plan path for access needs not browser-proven.  
  Evidence: theWalkerReachesThePlan.spec.mjs:22-31 seeds accessNeeds  
  Reproduce: n/a
- **`GOLD-F-9` (P3, accepted_hostv2_debt) — GOLD-10 doc contradiction.** Doc says closed and open.  
  Evidence: GOLD_E2E_ACCEPTANCE_MATRIX.md:76 vs :119 contradiction; producer failure tested for weather only  
  Reproduce: n/a

## 9. Comprehension findings

The historical Creation → HostHome contradiction **partly persists** (`COMP-1`, `COMP-4`).

- **`COMP-1` (P1, fix_before_prod) — HostHome contradicts itself about the location.** The first HostHome says 'Add the location' while the plan parts say 'Where it happens · handled'.  
  Evidence: src/lib/phaseProgress.js:131-149 counts 'Backyard' as a named venue; src/lib/assembleRevealEngines.js:120-122 raises the venue blocker for a home venue without a town; runtime agentA c_home.txt  
  Reproduce: Create 'backyard' event with no town → HostHome.
- **`COMP-2` (P1, fix_before_prod) — 'The rest can wait till Jun 7' on a destination event with near-term lodging work.** Host reads permission to wait months while the room block is due in weeks.  
  Evidence: hostv2/src/HostShellV2.jsx:11271-11273 renders 'the rest can wait till <date>'; src/lib/phaseProgress.js:404-418 date = shopping list opens (7 days out); runtime: destination event with lodging task due within weeks (agentA a_5_home.txt)  
  Reproduce: Create the Santa Fe destination seed → HostHome horizon line vs checklist dates.
- **`COMP-3` (P1, fix_before_prod) — 'Spoken for' counts NGW's own estimate as committed money.** Planned/expected/committed/spent collapse: NGW's own guess shown under a commitment word on day 0.  
  Evidence: src/lib/hostSpending.js:290 includes NGW's food/supply estimate in 'spoken for'; hostv2/src/HostShellV2.jsx:11984; runtime: '$1,932 spoken for (est.) · $0 spent' with no vendors or food choices  
  Reproduce: Create Seed J → HostHome money line.
- **`COMP-4` (P2, fix_before_prod) — Reveal says menu built; HostHome says plan the food.** The historical reveal-vs-HostHome contradiction persists for food.  
  Evidence: src/lib/assembleRevealEngines.js:509-529 'Menu is built … READY'; HostHome 'Plan the food — other steps wait on this'  
  Reproduce: Create any event → compare.
- **`COMP-5` (P2, fix_before_prod) — Type guess admitted, then stated as certain.** A guess becomes certainty one screen later.  
  Evidence: HostShellV2.jsx:9712-9718 admits a type guess; reveal says 'HIGH CONFIDENCE · READY'  
  Reproduce: 'Grad party…' seed.
- **`COMP-6` (P2, accepted_hostv2_debt) — Two 'handled' counts.** Two numbers for one idea.  
  Evidence: two different 'handled' counts on HostHome; comment drift at HostShellV2.jsx:12201  
  Reproduce: Any event.
- **`COMP-7` (P2, accepted_hostv2_debt) — 'Guests · handled' for an estimate.** A rough estimate reads as done.  
  Evidence: src/lib/phaseProgress.js:159-162 any estimate = 'Guests · handled'  
  Reproduce: Any event with a headcount.
- **`COMP-8` (P2, fix_before_prod) — Access and health needs heard but not shown back.** The host cannot see that NGW heard the most personal thing she said.  
  Evidence: walker/altitude saved and tasked but not shown on chips, reveal or first HostHome (agentA a_2,a_4,a_5)  
  Reproduce: Santa Fe seed.
- **`COMP-10` (P3, accepted_hostv2_debt) — Reveal Skip clipped.** Skip partly hidden.  
  Evidence: agentA a_3_mid.png: Skip clipped at 390px during reveal  
  Reproduce: Reveal at 390px.
- **`COMP-9` (P3, accepted_hostv2_debt) — Generic venue question under 'handled'.** Minor contradiction.  
  Evidence: venue card asks 'Where is the event?' under 'handled'  
  Reproduce: Santa Fe seed.

## 10. Attention / One Move findings

`eventPlan()` remains the sole prioritizer, and none of these findings requires a second one. The faults are inputs that are wrong (`ATTN-6`, `ATTN-2`) and rows that do not settle (`ATTN-3`).

- **`ATTN-6` (P0, fix_before_prod) — Over-budget alarm from double-counted caterer money.** The One Move ranks a budget overrun that is not real and tells the host to trim food; two different 'spoken for' totals on one sheet.  
  Evidence: src/lib/hostSpending.js:267,290 (unpaid vendor balance added on top of a budget line that already holds the full contract); src/lib/hostSpending.js:20-26 header claims the overlap cannot happen; runtime: sample event money sheet '$16,627 spoken for … $3,027 over' then $13,477 after Mark as paid; agentB shots  
  Reproduce: Default sample event → money sheet (note over) → Mark caterer paid → over disappears; vendor conflicts gains 'Reconcile vendor payment with budget line'.
- **`ATTN-2` (P1, fix_before_prod) — Choosing a caterer leaves money wrong and prompts nothing.** Headroom overstated and the key booking (the caterer) is never prompted.  
  Evidence: runtime: choosing 'A caterer handles it' leaves grocery pricing in budget, creates no vendor, next One Move 'Nothing needs you until Feb 28' (agentB 23-after-caterer.png, 25-budget-sheet.png)  
  Reproduce: New event → One Move food step → 'A caterer handles it'.
- **`ATTN-3` (P1, fix_before_prod) — 'Then, in order' rows that do nothing.** An arrow row that does nothing on the core attention surface.  
  Evidence: hostv2/src/HostShellV2.jsx:11395 openThen -> onCta(a,key) without settling; its comment :11323 names the rows as previously dead; runtime: 'Confirm the start time →' and 'Is there a step-free way…? →' do nothing (agentB 92-*.png)  
  Reproduce: Sample/new event → 'Then, in order' → tap those rows.
- **`ATTN-4` (P2, accepted_hostv2_debt) — Right section, wrong control.** One extra tap; one mislabeled step.  
  Evidence: food/vendor One Move lands at sheet top, not the control; dietary heading mismatch is the exception (fix)  
  Reproduce: Sample event.
- **`ATTN-5` (P2, defer_hostv3) — Events list shows nothing urgent.** Cross-event urgency invisible.  
  Evidence: 'Your events' shows type and days-out only, no needs-you mark  
  Reproduce: Events list with an overdue payment.

## 11. Friction findings

Across the 11 tasks, the top three friction points are: (1) wrong money, (2) a reveal contradicted after a correction, and (3) controls that go nowhere or cannot be reached at 390px.

- **`FRIC-2` (P1, fix_before_prod) — Correcting the honoree creates a phantom second milestone.** Correcting NGW's misunderstanding makes the plan worse and invents a second milestone.  
  Evidence: src/lib/assembleRevealEngines.js:67-72 compound flag with no second type; runtime agentB 41-reveal-after-correction.png: 'An anniversary + . Two milestones, one event' and a required 'Ceremony Timing' decision  
  Reproduce: 'Mom and Dad 50th anniversary…' → fix 'Who's it for?' chip → reveal.
- **`FRIC-3` (P1, fix_before_prod) — Attendance toast says '40 confirmed' after one Yes.** The attendance confirmation reports the wrong count.  
  Evidence: hostv2/src/HostShellV2.jsx:6668-6670 toast uses confirmedCovers; src/lib/confirmedCovers.js:60 returns planned number in headcount mode; runtime: 'Aunt Carol → Yes — 40 confirmed' while the sheet says 1  
  Reproduce: Headcount-mode event → add a guest → set Yes.
- **`FRIC-4` (P1, fix_before_prod) — Venue cannot be changed once set at 390px.** A host on a phone cannot change a venue once set; a city counts as an address.  
  Evidence: hostv2/src/HostShellV2.jsx:11913-11915 venue chips sit in a tile hidden at 390px; runtime: 'Everything in your plan' has no Venue entry; search 'venue' → 'Nothing matches' (agentB 51-search-venue.png); city alone marks 'Venue address · handled'  
  Reproduce: Phone, event with a venue set → try to change it.
- **`FRIC-5` (P1, fix_before_prod) — No way to record an expense.** A deposit or store run cannot be logged, so 'spent' is fiction — on a product sold on money truth.  
  Evidence: no writer of a budget line's spent amount in hostv2/src (agentB search); src/lib/hostSpending.js:20-26 vendor 'paid in full' deliberately not counted as spent; runtime money sheet: no entry control  
  Reproduce: Any event → money sheet → try to record an expense.
- **`FRIC-1` (P2, fix_before_prod) — City in the sentence dropped then asked again.** Duplicated question; a stated fact discarded.  
  Evidence: 'in Austin' saved as empty city; HostHome then asks 'Add the location'  
  Reproduce: '…dinner in Austin…' seed.
- **`FRIC-6` (P2, accepted_hostv2_debt) — Vendor flow limited.** Vendor setup friction.  
  Evidence: only suggested vendor roles addable; nameless card; blank arrival field (blank field is a fix)  
  Reproduce: Vendor sheet.
- **`FRIC-7` (P2, fix_before_prod) — Failed save leaves the One Move claiming success.** A failed save is celebrated as progress.  
  Evidence: runtime storage-full: correct 'didn't save' toast, but One Move says 'Handled — 4 of 7' (agentB 80-failed-save.png); payment overdue again after reload  
  Reproduce: Fill storage → Mark as paid.
- **`FRIC-8` (P3, defer_hostv3) — Polish set.** Polish.  
  Evidence: Mark as paid shows no amount first; shifting plan-parts denominator; '4 days out' copy at 43 days; span-as-button  
  Reproduce: Sample event.

## 12. Trust-language findings

- **`RSVP-LIVE-1` (P1, fix_before_prod) — Live RSVP links are dead but the app promises they work.** On the live site the copy toast says 'anyone who opens it can RSVP themselves, no app needed' and the native share sends the link; every guest gets a dead link. The 2026-08-06 board fix assumed demo profile = no API base; the services profile (2026-09-23) broke that assumption.  
  Evidence: src/lib/api/rsvp.js:19 isRsvpApiConfigured = Boolean(API base); hostv2/src/HostShellV2.jsx:5955-5999 copy toast keys on it; backend/app/routers/rsvp.py:233 resolves only public.events rows; live: REACT_APP_SUPABASE_URL empty in shipped bundle (services profile, no sign-in) so no event reaches public.events; live probe 2026-11-03: GET https://ngw-events-api.onrender.com/api/public/invite/<22-char code> -> 404 'invite not found'  
  Reproduce: Live site → any event → Share/copy the invite → open the link on another device → invite not found.
- **`TRUST-1` (P1, fix_before_prod) — Reveal says guest list built and RSVP tracking live over an empty list.** Host believes guests exist and replies are being collected; neither is true.  
  Evidence: src/lib/assembleRevealEngines.js:535 'Guest list built. RSVP tracking live.' printed unconditionally (stage shown when a guest count exists, :328); runtime: guests: [] in saved event; agentA a_4_reveal.txt, b_reveal.txt  
  Reproduce: Create any event with a headcount → read the reveal's Guest Planning line.
- **`TRUST-2` (P1, fix_before_prod) — Vendor name taken as honoree, labeled high confidence.** Invite and event carry the wrong person's name; the caterer is silently lost, under a 'nothing made up' claim.  
  Evidence: runtime: 'Grad party for Jake… Tony's BBQ is catering' -> name 'Tony's Graduation', honoree 'Tony', vendors [] (agentA c_ev.json); reveal: 'HIGH CONFIDENCE · READY' and 'nothing made up'; 'Tony's BBQ' absent from the didn't-make-it list  
  Reproduce: Create with the Seed J sentence in the report → read the chips and reveal.
- **`TRUST-3` (P2, fix_before_prod) — Headcount marks an after-party task done.** A real task silently disappears on day 0.  
  Evidence: src/lib/taskEngine.js:182 'guest list\b' marks a day-after gift task done at creation  
  Reproduce: Create with a headcount → 'Checklist 1 of 26 done'.
- **`TRUST-4` (P2, fix_before_prod) — 'Budget … live. Track spending in real time.'.** Overclaims a feed that does not exist (and FRIC-5: no entry).  
  Evidence: src/lib/assembleRevealEngines.js:557-560 'Track spending in real time'  
  Reproduce: Create with a budget → reveal.
- **`TRUST-5` (P2, fix_before_prod) — 'Vendors assigned' at any status.** 'Considering' reads as assigned.  
  Evidence: src/lib/assembleRevealEngines.js:443-448,565-568 'N vendors assigned' for any named vendor at any status  
  Reproduce: Vendor at 'Considering' → reveal.

## 13. Error and recovery findings

On current main the 9 specs pass, 36/36. They cover refused save, failed save, cross-device sync, the pass webhook race, words staying with their event, the recovery surface, analytics opt-out, no-forecast, and gold07. Undo exists (`HostShellV2.jsx:3469`; historical Nielsen #4 closed).

Open:
- `FRIC-7` — a failed save still leaves the One Move claiming success.
- `NIELSEN-1` — there is no ambient cue for queued or failed sync (accepted debt).

## 14. Security and live-config findings

**Repo-verified 11/3/2026:**
- **RLS:** migration `018` present (7 RLS enables); RLS gate `everyPublicTableHasRls` 14/14.
- **Routes and backend:** route sweep 4/4; backend 441 pass.
- **Dependency audit:**
  - hostv2: 0 vulnerabilities.
  - Root CRA (Legacy): 105 (3 critical, 25 high, 65 moderate, 12 low). The xlsx advisory is gone after #97, and the rest is Legacy dependency debt.
- **Live probes:**
  - The live bundle secret scan is clean.
  - `/api/admin/*` returns 401 and `/api/stripe/pass` returns 401.
  - No CORS for foreign origins.
  - Capabilities report email, stripe and `can_honour` true.
- **No security headers:** GitHub Pages serves no security headers or CSP (`SEC-5`).
- **No auth rate limits in the repo:** there is no `supabase/config.toml`, so rate limits are dashboard-side (`SEC-3`).

- **`SEC-1` (P1, owner_action_before_prod) — Live RLS applied-status unattested.** If 018 is not applied, six tables are readable/writable with the public anon key.  
  Evidence: supabase/migrations/018_research_tables_rls.sql present; everyPublicTableHasRls 14/14 (repo); live application unattested — RUNBOOK §A  
  Reproduce: RUNBOOK check A query.
- **`SEC-2` (P1, owner_action_before_prod) — Backups on + one restore drill.** A data-loss incident with an untested restore.  
  Evidence: no restore ever performed; RUNBOOK §B  
  Reproduce: RUNBOOK check B.
- **`SEC-4` (P1, owner_action_before_prod) — External pentest not run.** No independent test of a public, paid surface.  
  Evidence: no engagement report exists  
  Reproduce: Engage a firm; scope in §14.
- **`SEC-3` (P2, owner_action_before_prod) — Auth rate-limit posture unverified.** Unknown brute-force/abuse posture on auth.  
  Evidence: no supabase/config.toml in repo; posture lives only in the dashboard; RUNBOOK §C  
  Reproduce: RUNBOOK check C.
- **`SEC-5` (P2, accepted_hostv2_debt) — No security headers on the static host.** Clickjacking/injection hardening absent; matters more once money is taken.  
  Evidence: live response headers 2026-11-03: no CSP, HSTS-only-by-host, no X-Frame-Options/Referrer-Policy (GitHub Pages cannot set headers)  
  Reproduce: curl -D - the live URL.
- **`SEC-6` (P2, accepted_hostv2_debt) — Admin console facing internal, reach public.** Internal console reachable by the public (read-only shell, writes refused).  
  Evidence: gate artifact sf-admin-reach; docs/ADMIN-CONSOLE.md:82; admin writes gated server-side (require_admin); probe /api/admin/* -> 401  
  Reproduce: ?admin=1 on the live site.

## 15. Persistence, concurrency and backup findings

- **Sole writer:** `patchEvent` remains the sole writer.
- **Conflict hold:** the hold (`src/lib/api/events.js`, `ngw-cache-conflict-hold`) keeps the held version unless the carried version is newer. Resolve, keep-mine and use-theirs each have undo.
- **Specs:** the cross-device sync and refused-save specs pass.
- **Export:** export carries `writeLog` (#99).
- **Live profile:** the live profile is **localStorage only** (no Supabase URL). A host's plan exists only in one browser, and iOS can evict it (`NAT-7`).
- **Backups:** no restore drill has ever been run. **OWNER ACTION `SEC-2`**, RUNBOOK §B.

## 16. Observability findings

Sentry initializes in `hostv2/src/main.jsx`. The ErrorBoundary and chunk-load errors report, and so do the cloud libs. `customEventStore` has 0 `captureError` calls, and no analytics event fires on failures. PostHog is hashed and opt-out-able (live 11/2/2026, 12:10 PM EST).

- **`OBS-1` (P2, owner_action_before_prod) — Sentry/PostHog production arrival unproven.** Telemetry may be silently dark in production.  
  Evidence: Sentry ingest host and PostHog key present in live bundle (2026-11-03 scan); arrival never observed — RUNBOOK §D  
  Reproduce: RUNBOOK check D.
- **`OBS-2` (P2, fix_before_prod) — hostv2 local save, provider and route failures not reported.** Support is blind to local save failures, provider failures and route failures in production.  
  Evidence: src/lib/customEventStore.js: 0 captureError calls (hostv2's real store); no analytics event for save/provider/route/clause failures (src/lib/analytics.js EVENTS)  
  Reproduce: n/a

## 17. Human UAT — status and exact remaining protocol

**Status: NOT RUN (`UAT-1`, P1). HUMAN ACTION.** Automated tests do not satisfy stage 9; the handoff forbids marking it from automation alone.

**Protocol (owner runs; about 2 × 60 min plus about 1 h of synthesis):**
1. Recruit **Tester A**, a first-time host who is not a planner, and **Tester B**, a coordinator or planner. Neither may have seen the app.
2. Start each on a fresh browser profile at the live URL, on their own phone at about 390px. Do not use `?demo=1`.
3. Run `docs/COORDINATOR_TEST_SCRIPT.md` verbatim. Observe silently, think aloud, and give no help unless they are stuck for more than 2 minutes, and log every assist.
4. Record for each task: success or failure, time, assists, and their own words for what the One Move is telling them.
5. Pass bar: every core task done without assist by both testers, and no misread money or RSVP state. Every misread becomes a P1 row in this matrix.
6. File the notes under `docs/alpha/` with the date. Re-run this matrix's §4 rows they touch.

Run it **after** the §4 P0/P1 fixes. Running it before only re-finds `ATTN-6`, `TRUST-1` and the rest.

## 18. Payments, legal and promotion findings

- **`PAY-1` (P1) — OWNER ACTION, live-key Stripe lifecycle.** Billing stays off until §4 closes. Then, on a staging profile with live keys:
  1. Buy the $39 pass with a real card.
  2. Confirm the webhook marks the entitlement.
  3. Refund it from the Stripe dashboard and confirm the entitlement is revoked.
  4. Run a declined card (Stripe test card in test mode, or an expired real card) and confirm the copy.
  5. Rotate the keys afterward if they were exposed in any log.
  6. Record the evidence in the gate artifact.
- **`LEGAL-1` (P1) and `NAT-5` (P0 for stores) — OWNER plus EXTERNAL (attorney).** Send `docs/legal/*` and `docs/legal/CONSENT_AND_TRACKING_COPY_DRAFT.md` with its §3 question. Fill the placeholders, publish Privacy, Terms, Refunds and Support at stable URLs, then link them from Settings and the pass sheet.
- **`STAGE1-1` — OWNER ACTION.** Rule the stage 1 proposal and pre-register the kill gate before any charge.
- **`STAGE2-1` — OWNER ACTION.** Name clearance (USPTO search, or counsel).
- **`NAT-6` — OWNER ACTION.** `noguessworksystems.com` is registered but not serving. Point it at Pages, or at the eventual host.
- **Promotion: refused.** Stage 9 is not enterable (§23).

## 19. iOS readiness appendix

**Not ready.** Blockers:
- `NAT-1` billing (IAP question, §21).
- `NAT-2` no account deletion (Guideline 5.1.1(v)).
- `NAT-3` links built from `window.location.origin` would emit `capacitor://localhost` links.
- `NAT-4` magic link cannot return to the app (no universal links; needs `NAT-6` domain for `apple-app-site-association`).
- `NAT-5` no privacy policy URL.
- `NAT-7` the CORS allowlist lacks `capacitor://localhost`; PostHog is silently disabled on a localhost-like origin; downloads and print no-op in WKWebView; localStorage is evictable.
- `NAT-8` App Privacy labels must declare guest dietary/allergy data as health data, plus the PostHog, Sentry, Stripe and Supabase processors.
- `NAT-10` Guideline 4.2 (minimum functionality) risk for a wrapped website.
- `VERIFY-1` no WebKit engine in CI, and every iOS web view is WebKit.

Prerequisites: an Apple Developer account, signing, a reviewer login and screenshots (`NAT-9`, OWNER ACTION).

## 20. Android readiness appendix

**Not ready.** It shares `NAT-2`, `NAT-3`, `NAT-4`, `NAT-5`, `NAT-7` and `NAT-8`. Android-specific items:
- **Billing:** Google Play Billing for in-app digital goods (`NAT-1`, §21).
- **Account deletion:** Google requires both in-app deletion **and** a web deletion URL.
- **Data safety:** Play Data safety form (`NAT-8`).
- **App links:** `assetlinks.json` needs the `NAT-6` domain.
- **Account and assets:** Play Console account and store assets (`NAT-9`).

The Chromium-based WebView is covered by the existing Playwright Chromium matrix, which is better coverage than iOS has.

## 21. Apple/Google billing-policy question and ruling

**EXTERNAL POLICY VERIFICATION REQUIRED.** I did not rule this from memory.

The $39 pass unlocks in-app features (`HostShellV2.jsx:3582, 14987, 16353, 16536`). It is a digital good consumed in the app, bought through Stripe Checkout opened in-app (`:17452`). Under Apple Guideline 3.1.1 and the Google Play Payments policy as retrieved 11/3/2026, that pattern ordinarily requires IAP or Play Billing. US-storefront external-link entitlements exist (post *Epic v. Apple*; Google's US user-choice and external-offers programs), and their current terms must be confirmed.

Exact questions for counsel or a store-policy check:
- **(a)** For a US-only app, may the iOS build link out to Stripe for the $39 pass under the current US storefront rules? Which entitlement, disclosure sheet and commission apply?
- **(b)** Does Google's current US program allow Stripe for this pass without Play Billing, and at what service fee?
- **(c)** If the native apps are "reader"-style or sell nothing, with purchase on the web only, is that compliant for both stores, and what may the app say about buying?
- **(d)** Does selling to event *hosts* for a one-time event change the classification (digital vs. a service consumed outside the app)?

**Interim ruling:** do not ship native builds that open Stripe Checkout until (a)–(d) are answered. Stripe on the web is unaffected.

## 22. Native architecture recommendation

**`THIN SHELL WITH SPECIFIC NATIVE MODULES`**, based on current code:
- **Why a shell works:**
  - The app is a single React shell with an offline-capable local store, and `patchEvent` is the single writer, which is a clean seam for a native storage adapter.
  - No feature needs native rendering performance.
- **Specific modules required** (`NAT-7`, `NAT-4`):
  - Durable storage, replacing evictable localStorage on iOS.
  - Deep links for magic-link return.
  - A share/print/download bridge (current calls no-op in web views).
  - A configurable public-link origin (`NAT-3`).
  - Possibly store billing (`NAT-1`).
- **Not a React Native rewrite:** no evidence requires one. That would also violate "do not redesign HostV2."
- **Estimate:** about **125–170 h** in total, including the 86 h itemized in §7. It starts only after §21 is answered and `NAT-5` and `NAT-6` exist.

## 23. Stage 9 prerequisites remaining

1. Every §4 row closed with a red-proofed test (P0 `ATTN-6` first, then the P1s).
2. `UAT-1`: two human sessions passed (§17).
3. `PAY-1`: live-key purchase, refund and decline run, with evidence.
4. `LEGAL-1`: attorney-reviewed policies published and linked.
5. `SEC-1`: live RLS attested (`docs/RUNBOOK.md` §A, line 134; §B–§D follow at 168, 190, 204: run the listed `pg_tables`/`pg_policies` queries in the Supabase SQL editor; every public table `rowsecurity = true`).
6. `SEC-2`: backups confirmed on, plus one restore drill (RUNBOOK §B).
7. `SEC-3`: auth rate limits confirmed in Supabase Dashboard → Authentication → Rate Limits (RUNBOOK §C), with values recorded.
8. `OBS-1`: one deliberate production error seen in Sentry and one event in PostHog (RUNBOOK §D).
9. `SEC-4`: external pentest engagement report with no open high or critical findings.
10. `STAGE1-1`: stage 1 ruled with the kill gate pre-registered.
11. The stage 9 board convened on the four retro gates, and its ruling recorded in the gate artifact.

## 24. Estimated closure effort by finding

| Bucket | Engineering | Owner / human / external |
|---|---|---|
| FIX BEFORE PROD | 111 h (about 3 focused weeks) | — |
| OWNER ACTION BEFORE PROD | about 16 h of supporting engineering | RUNBOOK A–D about 1 day; UAT about 1 week of calendar time; Stripe lifecycle about ½ day; attorney 1–3 weeks; pentest 2–6 weeks external; stage 1 ruling and name clearance owner-paced |
| Native (if pursued) | 86 h itemized, 125–170 h total | Policy verification (§21), developer accounts, review cycles |
| Accepted debt | 43 h, unscheduled | — |

**Critical path to a paid web launch:** about 3 weeks of engineering, run in parallel with attorney review and the pentest. The external pentest dominates at **about 4–7 weeks** of calendar time.

Per finding:

| ID | Sev | Finding | Eng h | External? |
|---|---|---|---|---|
| `ATTN-6` | P0 | Over-budget alarm from double-counted caterer money | 6 | no |
| `NAT-1` | P0 | Store billing policy for the $39 pass | 0 | yes |
| `NAT-2` | P0 | No account deletion | 20 | no |
| `NAT-3` | P0 | Public links derive from the app origin | 6 | no |
| `NAT-4` | P0 | Magic-link sign-in cannot return to the app | 14 | no |
| `NAT-5` | P0 | Policies and support URL unpublished | 0 | yes |
| `ATTN-2` | P1 | Choosing a caterer leaves money wrong and prompts nothing | 6 | no |
| `ATTN-3` | P1 | 'Then, in order' rows that do nothing | 3 | no |
| `COMP-1` | P1 | HostHome contradicts itself about the location | 3 | no |
| `COMP-2` | P1 | 'The rest can wait till Jun 7' on a destination event with near-term lodging work | 3 | no |
| `COMP-3` | P1 | 'Spoken for' counts NGW's own estimate as committed money | 4 | no |
| `FRIC-2` | P1 | Correcting the honoree creates a phantom second milestone | 4 | no |
| `FRIC-3` | P1 | Attendance toast says '40 confirmed' after one Yes | 2 | no |
| `FRIC-4` | P1 | Venue cannot be changed once set at 390px | 4 | no |
| `FRIC-5` | P1 | No way to record an expense | 10 | no |
| `GOLD-F-1` | P1 | Army retirement guidance silently lost on a real cold start | 5 | no |
| `GOLD-F-4` | P1 | Vendor intent and program heard but never applied | 13 | no |
| `GOLD-F-5` | P1 | No test runs GOLD-01's own sentence | 5 | no |
| `LEGAL-1` | P1 | Privacy/refund/terms/support not published or linked | 2 | yes |
| `NAT-6` | P1 | No custom domain | 2 | yes |
| `NAT-7` | P1 | Shell-specific gaps (origin, CORS, downloads, storage) | 30 | no |
| `NAT-8` | P1 | Privacy labels / Data safety declarations | 0 | yes |
| `PAY-1` | P1 | Live-key Stripe purchase/refund lifecycle never run | 4 | yes |
| `RSVP-LIVE-1` | P1 | Live RSVP links are dead but the app promises they work | 4 | no |
| `SEC-1` | P1 | Live RLS applied-status unattested | 0 | yes |
| `SEC-2` | P1 | Backups on + one restore drill | 0 | yes |
| `SEC-4` | P1 | External pentest not run | 0 | yes |
| `STAGE2-2` | P1 | iOS/Android surfaces undeclared at stage 2 | 8 | no |
| `TRUST-1` | P1 | Reveal says guest list built and RSVP tracking live over an empty list | 2 | no |
| `TRUST-2` | P1 | Vendor name taken as honoree, labeled high confidence | 6 | no |
| `UAT-1` | P1 | Two first-time-human sessions never run | 0 | yes |
| `ATTN-4` | P2 | Right section, wrong control | 2 | no |
| `ATTN-5` | P2 | Events list shows nothing urgent | 6 | no |
| `COMP-4` | P2 | Reveal says menu built; HostHome says plan the food | 2 | no |
| `COMP-5` | P2 | Type guess admitted, then stated as certain | 2 | no |
| `COMP-6` | P2 | Two 'handled' counts | 1 | no |
| `COMP-7` | P2 | 'Guests · handled' for an estimate | 1 | no |
| `COMP-8` | P2 | Access and health needs heard but not shown back | 2 | no |
| `FRIC-1` | P2 | City in the sentence dropped then asked again | 3 | no |
| `FRIC-6` | P2 | Vendor flow limited | 3 | no |
| `FRIC-7` | P2 | Failed save leaves the One Move claiming success | 3 | no |
| `GOLD-F-10` | P2 | GOLD-02/08 lack acceptance specs | 8 | no |
| `GOLD-F-2` | P2 | Two-letter clauses silently dropped | 2 | no |
| `GOLD-F-3` | P2 | Facts inside used clauses absorbed silently | 10 | no |
| `GOLD-F-6` | P2 | GOLD-05 absence check incomplete | 2 | no |
| `GOLD-F-7` | P2 | GOLD-07 backend leg mocked | 8 | no |
| `GOLD-F-8` | P2 | GOLD-09 shell-only | 7 | no |
| `NAT-10` | P2 | Guideline 4.2 risk | 8 | no |
| `NAT-9` | P2 | Developer accounts, signing, store assets, reviewer login | 8 | yes |
| `NIELSEN-1` | P2 | Historical Nielsen #1: ambient sync visibility (partly fixed) | 4 | no |
| `OBS-1` | P2 | Sentry/PostHog production arrival unproven | 0 | yes |
| `OBS-2` | P2 | hostv2 local save, provider and route failures not reported | 4 | no |
| `SEC-3` | P2 | Auth rate-limit posture unverified | 0 | yes |
| `SEC-5` | P2 | No security headers on the static host | 2 | no |
| `SEC-6` | P2 | Admin console facing internal, reach public | 4 | no |
| `STAGE1-1` | P2 | Stage 1 basis, kill gate and ruler unrecorded | 0 | yes |
| `STAGE2-1` | P2 | Name not cleared | 0 | yes |
| `TRUST-3` | P2 | Headcount marks an after-party task done | 1 | no |
| `TRUST-4` | P2 | 'Budget … live. Track spending in real time.' | 1 | no |
| `TRUST-5` | P2 | 'Vendors assigned' at any status | 1 | no |
| `VERIFY-1` | P2 | No WebKit/Safari engine in the matrix | 6 | no |
| `COMP-10` | P3 | Reveal Skip clipped | 1 | no |
| `COMP-9` | P3 | Generic venue question under 'handled' | 1 | no |
| `FRIC-8` | P3 | Polish set | 3 | no |
| `GOLD-F-11` | P3 | GOLD-04 proof starts after intake | 2 | no |
| `GOLD-F-9` | P3 | GOLD-10 doc contradiction | 1 | no |

## 25. Final recommendation

**NO-GO.**

- **The web free preview continues.** Do not take money and do not recruit strangers.
- **Re-certify when:**
  - every §4 row is closed with tests;
  - the §23 owner and external items are attested; and
  - the stage 9 board has convened.
- **That would be CONDITIONAL GO for web.** The condition is that the four retro gates are live-measured.
- **HostV2 is not ready to begin iOS/Android packaging.** Five P0s block it (`NAT-1` to `NAT-5`), and billing policy requires external verification first.
