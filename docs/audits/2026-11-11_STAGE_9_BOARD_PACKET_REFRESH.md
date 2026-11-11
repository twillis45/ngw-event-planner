# Stage 9 — Promotion: board packet refresh for hostv2 (live, charging)

**Status: the board has NOT sat. This packet contains no verdict and must not be read as one.**
A stage 9 record needs `boardVerdict` and `boardSeats` from a sitting (`ngw-event-planner-workspace/docs/gate-records/2026-11-11/records.json`, `not_drafted_here."9"`). The sitting planned for Monday, November 9, 2026 (`docs/audits/2026-11-03_STAGE_9_BOARD_PACKET.md:6`) did not happen (11/11/2026 re-measurement).

Prepared November 11, 2026, on app branch `main-2utz0n` @ `a36f5073`. Production serves `main` @ `61cb1324` with `release_profile=live` (`HANDOFF.md:22`). This refreshes the 11/3 packet; read that one for the stage 9 definition (§1) and the `promote-surface` gate table (§4). Neither is repeated here.

**The sitting is now retroactive in a second sense.** On 11/3 the board was asked whether a paid release candidate could ship. Since 11/7 production has been `live` and selling the $39 pass to the public (`HANDOFF.md:94-102`; `PROMOTION-DEFERRED.md:5-12`). No gate has been ruled since 9/30 (`HANDOFF.md:610`). The board is ruling on a surface that already charges money.

---

## 1. What changed since November 3

| Change | Evidence | Status |
|---|---|---|
| Production went `live` on 11/7; every merge to `main` now deploys `live` | `HANDOFF.md:22`, `:100`; `PROMOTION-DEFERRED.md:10-11` | Measured |
| The $39 pass was sold, granted, refunded and revoked on live keys | Owner smoke test 11/8–11/10: `HANDOFF.md:76-78` (checkout 6.1–6.5, grant 6.6, refund 7.1–7.3) | **Owner-reported** (`PAY-1`) |
| Migrations 017–021 applied to production by hand, "12 checks true" | `HANDOFF.md:102` | **Owner-reported** (`SEC-1`); `schema_migrations` still ends at 016 |
| Support address `events@noguessworksystems.com` in the app (#114); the pass sheet names it before checkout | `HANDOFF.md:27`; `src/lib/brand.js:145`; commit `78e23479` | Shipped; inbox confirmed by owner |
| C1–C9 fix clusters landed (PRs #99–#115) | `records.json` stage 3 `buildNotes` | Merged to `main` |
| `S9-1`/`S9-2` (anon purge, anon RSVP insert) fixed in the repo | `supabase/migrations/019_browser_privilege_boundaries.sql:29-31`; `PROMOTION-DEFERRED.md:76-79` | Code: closed. Production: unreported (§2, stage 5) |
| `S9-3` (caller-priced checkout) and `S9-4` (refund revokes pass) fixed | `PROMOTION-DEFERRED.md:27-31`; `backend/app/routers/stripe_payments.py:67` | Closed in code with tests |
| `RP-1` (sweep counted a docstring as a gate) fixed, red-proofed again 11/11 | `PROMOTION-DEFERRED.md:22-26` | Closed |
| `S9-5`: the server now checks the pass where a live vendor-brief link is minted | `backend/app/routers/vendor_brief.py:240-283`; commit `423f8b11` (PR #116) | **On `main-2utz0n`, not in production.** The legacy self-contained brief URL cannot be gated (§3, D3) |
| `S9-6`: `PROMOTION-DEFERRED.md` rewritten for `live` | `PROMOTION-DEFERRED.md:1-16`; commit `a36f5073` | On `main-2utz0n`, unmerged |
| Rollback rewritten as four layers; never rehearsed | `docs/RUNBOOK.md:100-150` | Written only |
| Policy links wired, all null until a URL is published | `src/lib/brand.js:151`; commit `78e23479` | No policy is published (`LEGAL-1`) |
| Every "$39" shown is tied to the server's price | `src/lib/__tests__/thePassPriceIsTheServersPrice.test.js` (commit `78e23479`) | Closed (11/3 §5 row 1) |
| CI on `61cb1324` | jest 8,932 / 673 suites; e2e 3,780 passed, 0 failed; WebKit critical journeys 89/89; backend 497 (506 with `main-2utz0n`) | 11/11/2026 re-measurement; `HANDOFF.md:601`, `:603`, `:606` |

**Finding ledger (11/11/2026 re-measurement, `HANDOFF.md:610`).** 42 P0/P1 findings:
- 27 closed in code with passing tests.
- 2 closed by owner report only: `PAY-1` (live payment), `SEC-1` (live RLS).
- 5 open: `NAT-4` (native magic link), `NAT-7` (native shell gaps), `STAGE2-2` (iOS/Android undeclared), `S9-6` (fixed 11/11 on `main-2utz0n`, unmerged), `S9-5` (server check on `main-2utz0n`, PR #116; the legacy brief URL stays ungated).
- 8 owner actions: `NAT-1` store billing; `NAT-5`/`LEGAL-1` policies unpublished, no Terms draft; `UAT-1` no first-time users; `SEC-2` backups and restore drill; `SEC-4` pentest not booked; `NAT-6` domain; `NAT-8` store privacy labels.

**Stage 1 is still unruled.** No ruler, basis or pre-registered kill threshold (`ngw-event-planner-workspace/docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md:59`; recertification `STAGE1-1`, `docs/audits/2026-11-03_HOSTV2_PATH_TO_PRODUCTION_RECERTIFICATION.md:44`). The Madhavan Ramanujam seat's evidence (11/3 §3, seat 10) depends on it.

## 2. The four public gates, re-scored (11/11/2026)

| Public gate | 11/3 | 11/11 | Evidence | What changes it |
|---|---|---|---|---|
| **Stage 2: activation/UX doctrine** | FAIL | **NOT MET** | No first-time human has used the product (`UAT-1`). `docs/alpha/` holds only `README.md`, last changed 6/1/2026 (`e351c18a`); `docs/COORDINATOR_TEST_SCRIPT.md` never run (`PROMOTION-DEFERRED.md:53-57`). The five first-run P1s (`TRUST-1`, `TRUST-2`, `COMP-1/2/3`) are fixed in code with jest guards but not re-scored by seats who did not build them (`records.json` stage 2 `successCriteria`). Name clearance (`STAGE2-1`) open | Testers A and B on the live URL, notes in `docs/alpha/`; a re-score of the five P1s |
| **Stage 4: impeccable critique** | FAIL | **NOT MET; pending, run 11/11** | The last completed critique and measurement ran 11/3 (`docs/audits/2026-11-03_PTP_COMMAND_RUN.md`). A fresh run is in progress and has not reported (`records.json`, `not_drafted_here."4"`). No accessibility run (axe or Lighthouse) is in the repository; the 11/3 packet listed it as owed (11/3 §3, seat 6) | The 11/11 run reports; its P0/P1s resolved or ruled; an accessibility run on the live SHA |
| **Stage 5: full security & data review** | FAIL | **PARTLY MET** | **Code: met.** S9-1–S9-5 and RP-1 fixed and guarded; backend 506 passed; `everyPublicTableHasRls` 14/14; no secret strings in the live bundle's 7 chunks; signed-out tokens refused (`records.json` stage 5 `securityConsidered`). **Production: unreported.** The S9-1 privilege query has never been reported: `select has_function_privilege('anon','public.purge_old_rsvp_submissions(integer)','execute');` must read `false` (`PROMOTION-DEFERRED.md:80-84`). RUNBOOK §A (RLS), §B (backups, one restore), §C (rate limiting) unreported (`docs/RUNBOOK.md:174`, `:208`, `:230`). **Pentest: none, not booked** (`SEC-4`) | The owner runs and records the query and §A–C; a dated pentest booking, or a board ruling on selling without one (D2) |
| **Stage 7: instrumentation + tracker sync** | FAIL | **PARTLY MET** | Telemetry ships: the Sentry host and PostHog key are in the live bundle, and the pass funnel records `pass_sheet_viewed` and `pass_checkout_started` (`src/lib/analytics.js:155-156`). Arrival is unproven: no event seen arriving (RUNBOOK §D, `docs/RUNBOOK.md:244-256`). No alert route: no Sentry alert rule and no Render failure notification recorded; backend errors land in `admin_error_log`, which nothing watches (`PROMOTION-DEFERRED.md:106-111`). The Command Center tracker still shows the September state (`records.json` stage 7 `conditions`). No purchase-completed client event | RUNBOOK §D arrival recorded; one alert route; the 11/11 gate records posted from the owner's machine |

**Gates fully met: 0 of 4.** Stage 5 and stage 7 have moved from FAIL to PARTLY MET. Stage 2 is unchanged. Stage 4 awaits its run. This is a status of evidence, not a verdict.

## 3. Decisions the board must make

The packet presents options and consequences. It does not choose. Each decision is the board's or the owner's.

### D1. The four public gates

Pass, pass-with-conditions, or fail each gate in §2, on the evidence as it stands at the sitting. If the 11/11 stage 4 run has reported by then, the board rules on it. If not, stage 4 cannot be ruled.

### D2. Hold, or keep selling, while the pentest is unbooked

The 11/3 question was "hold the paid launch, or a capped invited cohort with the pentest booked" (11/3 §6, item 2). Selling started on 11/7, so the question is now what to do about sales already under way.

| Option | What it means today | Consequences |
|---|---|---|
| **A. Hold** | Stop selling until a pentest report exists. Mechanism: RUNBOOK rollback layer 3, remove `STRIPE_SECRET_KEY` on Render (`docs/RUNBOOK.md:129`) | No new charges. Existing passes stay valid (`event_passes` is read by the server). The pass sheet must stop offering checkout, or a buyer reaches an error. Removing the key also turns off the server's S9-5 check, which allows every brief when billing is not live (`backend/app/routers/vendor_brief.py:256-262`), so briefs become free for everyone. VERIFY before choosing: what the pass sheet shows when the backend reports Stripe unconfigured. No revenue until the test is booked, run and reported |
| **B. Capped invited cohort, pentest booked** | Keep selling to a named, limited group, with a dated pentest booking | **No code caps purchasers today.** Any signed-in user can open `create-pass-session` (`backend/app/routers/stripe_payments.py:275`), and sign-up is open. A cap is a promise unless engineering adds a control. The board should say whether a promise is acceptable or a control is required first |
| **C. Keep selling openly, pentest booked by a date** | The current state, plus a booking | The surface takes money and holds guests' health-adjacent data (§1 of `docs/native/STORE_PRIVACY_DECLARATIONS_DRAFT.md`) with no independent security test. The board records the risk by name and the date it expires |

The production attestations in stage 5 (the S9-1 query, RUNBOOK §A–C) are cheaper than any of these and bear on all three. The board may make any option conditional on them.

### D3. `S9-5`: the legacy self-contained brief URL

The server now refuses a live brief link for an unpaid second vendor (`backend/app/routers/vendor_brief.py:240-283`), but only on `main-2utz0n` (PR #116). The client still falls back to the legacy URL, which encodes the brief in the link, when minting fails. Anyone can build one, and no server sees it (`vendor_brief.py:252-255`; `PROMOTION-DEFERRED.md:32-37`).

| Option | Consequences |
|---|---|
| **A. Accept the legacy URL as a recorded risk** | Someone who skips the app can share a static brief without paying. They do not get live updates or vendor confirmations, which stay paid. Revenue leak is bounded by how many hosts find the bypass; it is not measured |
| **B. Require the client to stop falling back to the legacy URL** | Closes the bypass for in-app use. A host whose mint fails (network, server down) gets an error instead of a brief. Engineering work, not estimated here. The URL format still decodes for links already sent |
| **C. Require B before selling continues** | Combines B with D2 option A until it ships |

Separately: PR #116 must merge for the server check to reach production at all.

### D4. Selling without published policies (`LEGAL-1`)

No privacy policy, terms or refund policy is published. Drafts exist for privacy and refunds, with unfilled `[OWNER: …]` placeholders; **no Terms draft exists** (`docs/legal/README.md:9-26`; `PROMOTION-DEFERRED.md:93-98`). The app links each policy as soon as its URL is set and links nothing until then (`src/lib/brand.js:151`).

| Option | Consequences |
|---|---|
| **A. Stop selling until privacy and refund policies are published** (mechanism as D2-A) | No buyer pays without stated refund terms. Guests still reply on a live invite that collects dietary, allergy and access needs with no published privacy notice (`backend/app/routers/rsvp.py:190-198`). Stopping sales does not fix that half. Only publishing does |
| **B. Keep selling; publish by a dated deadline** | Buyers who pay before the date had no refund terms, only the support address shown before checkout (`HANDOFF.md:27`; commit `78e23479`). The board records the deadline and who owns it |
| **C. Keep selling; publish privacy first, terms and refunds after** | Covers guests' data soonest. Buyers still lack refund terms until the second publication |

Facts only the owner has: `[OWNER: refund rule from docs/legal/REFUND_POLICY_DRAFT.md]`, `[OWNER: whether counsel has reviewed or will review the drafts]`, `[OWNER: mailing address and governing state for the privacy draft]`. This packet draws no legal conclusion about obligations to buyers or guests.

Native store submission cannot proceed under any option until a privacy policy URL is public (`NAT-5`; `docs/audits/2026-11-05_NATIVE_STORE_POLICY_AND_SUBMISSION_PACKET.md:165`).

### D5. Open conditions carried from 11/3

Decide, for each, whether it is an open condition or a block:
- Rollback for `live` written, never rehearsed (`docs/RUNBOOK.md:106-107`).
- Backups and one restore (`SEC-2`).
- No alert route (stage 7).
- `schema_migrations` ends at 016 while production carries 017–021 (`PROMOTION-DEFERRED.md:63-66`).

### D6. `boardVerdict` and `boardSeats`

Record them, with dissent preserved per seat. Then `path-artifact` republishes.

**Out of scope for this sitting:** iOS and Android. They are undeclared at stage 2 (`STAGE2-2`). Their declarations are drafted in `docs/native/SURFACES_DECLARATION_DRAFT.md` for the owner, not for this board.

**The board may not be replaced by this packet, by the gate records, or by an assistant's summary.**

## 4. Seats

The 11/3 composition stands (11/3 §3: 11 seats, rules and rationale). The roster has not changed since 9/24/2026 (`docs/claude-skills/REVIEW_BOARD_ROSTER.md`, last commit `b988995b`).

**Still awaiting the owner:** seat 2 (**the paying host**, NEW) and seat 6 (**accessibility**, NEW as a stage 9 seat). No confirmation of either appears in `HANDOFF.md`, the audits, or the roster since 11/3 (11/11/2026 re-measurement). They need confirmation or replacement before the sitting. Seats 1, 3, 4, 5, 7, 8, 9, 10 and 11 are standing roster seats and need no confirmation (9/2 standing delegation, 11/3 §3).

Evidence each seat now receives, where it changed since 11/3:

| # | Seat | Changed evidence |
|---|---|---|
| 1 | "Grandmother": first-time host (decisive) | Still no UAT notes. This seat cannot rule on evidence that does not exist |
| 2 | The paying host (NEW, unconfirmed) | Owner smoke test 11/8–11/10 (`HANDOFF.md:64-92`); support address before checkout; still no refund policy (D4) |
| 4 | Don Norman | The 11/11 stage 4 run, when it reports |
| 5 | Luke Wroblewski | The invite redesign (#115) and its guards (`HANDOFF.md:31-56`) |
| 6 | Accessibility (NEW, unconfirmed) | Still no axe or Lighthouse run |
| 7 | Tanya Janca | `records.json` stage 5; the unreported production queries; pentest status (D2) |
| 8 | James Bach / Michael Bolton | RP-1 red-proof re-run 11/11; S9-5 tests red-proofed (commit `423f8b11`) |
| 9 | Dave Farley | `live` = `main` = `61cb1324`; four-layer rollback, unrehearsed |
| 10 | Madhavan Ramanujam | Stage 1 still unruled; S9-5 options (D3) |
| 11 | The Next Maintainer | `PROMOTION-DEFERRED.md` and RUNBOOK rewritten 11/11 |

Real-person credentials are as the roster records them. Re-verify any credential a seat's argument rests on at the sitting ("recall is not a source", `convene-review-board`).

## 5. Pre-reading, in this order

App repo (`twillis45/ngw-event-planner`), on `main-2utz0n` unless noted:

1. This packet.
2. `docs/audits/2026-11-03_STAGE_9_BOARD_PACKET.md` — §1 (what stage 9 is), §3 (seat rules), §4 (`promote-surface` table).
3. `PROMOTION-DEFERRED.md` — rewritten 11/11 for `live`; every open risk by gate.
4. `HANDOFF.md:20-108` — what shipped 11/6–11/11, including the owner's smoke test.
5. `HANDOFF.md:610` — the Path to Production row and the 42-finding ledger.
6. `docs/RUNBOOK.md:100-258` — rollback layers and owner attestations A–D.
7. `docs/audits/2026-11-03_PTP_COMMAND_RUN.md` — the last completed stage 4 instruments.
8. The 11/11 stage 4 run report — **pending; not yet in the repository**.
9. `docs/legal/README.md`, `PRIVACY_POLICY_DRAFT.md`, `REFUND_POLICY_DRAFT.md` — for D4.
10. `docs/native/STORE_PRIVACY_DECLARATIONS_DRAFT.md` §1 — what the app collects, from the code; for D2 and D4.
11. `backend/app/routers/vendor_brief.py:240-283` — for D3.

Workspace repo (`ngw-event-planner-workspace`):

12. `docs/gate-records/2026-11-11/records.json` — the redrafted stage records and what each waits on.
13. `docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md` — the unruled stage 1.

## 6. Evidence ledger, as of 11/11/2026

| Evidence the board needs | In the repository? |
|---|---|
| C1–C9 merged | **Yes**, PRs #99–#115 (`records.json` stage 3) |
| S9-5 server check in production | **No.** On `main-2utz0n`, PR #116 |
| Live-key Stripe lifecycle | **Owner-reported** 11/8–11/10 (`HANDOFF.md:76-78`) |
| S9-1 privilege query on production | **Not reported** |
| RUNBOOK §A–D attestations | **Not reported** |
| Rollback rehearsal | **Not run** |
| Legal pages published | **No** |
| UAT A and B | **Not run** |
| Accessibility run | **Not run** |
| Pentest | **Not booked**, as far as reported |
| Stage 4 run of 11/11 | **Pending** |
| Native builds, store confirmations | **None.** Out of scope for this sitting |

Every row reads "No", "Not run" or "Not reported" until evidence exists. None is assumed from a report that work is under way.
