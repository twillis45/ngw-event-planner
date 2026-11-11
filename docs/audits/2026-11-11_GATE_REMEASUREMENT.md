# Gate re-measurement — 11/11/2026

**Scope:** hostv2 host shell (facing public, platform web), measured against `main` @ `61cb1324` (the live build, `release_profile=live`) and the live site, plus the work on `main-2utz0n` the same day (PR #116). A measurement, not a ruling: no gate was ruled. Redrafted records: `ngw-event-planner-workspace/docs/gate-records/2026-11-11/`.

Instruments ran as dispatched subagents, each in its own worktree, none scoring its own work:
1. every P0/P1 finding in `2026-11-03_HOSTV2_RECERTIFICATION_MATRIX.json` checked against current code, with the guarding tests run;
2. every spine stage re-tested against its gate text, with cheap instruments run and the live site probed;
3. an independent red-proof of 26 claimed fixes (34 fault reintroductions);
4. the stage 4 instruments on the live build: measurement at 390 and 1440, axe at 390, and a Nielsen ten-heuristic pass driven in a browser at 390.

## Headline

- **Production is ahead of its gates.** `live` and charging since 11/7; no gate ruled since 9/30; stage 9 has no record and the 11/9 board did not sit.
- **The earliest open stage is 1** (no ruler, basis or pre-registered kill threshold). **The earliest failing on evidence is 2** (no first-time user has used the product).
- **Engineering is largely done; the remaining blockers are mostly owner actions:** published policies, production attestations, first-time users, a pentest, and convening the board.

## Findings ledger (P0/P1, 42)

| | Closed in code, tested | Closed by owner report only | Open | Owner action |
|---|---|---|---|---|
| P0 (7) | 4 | 0 | 1 | 2 |
| P1 (35) | 23 | 2 | 4 | 6 |

Open or owner, in order of how much they block a paid web launch:

1. **LEGAL-1 / NAT-5.** No privacy policy, terms or refund policy published. A Terms draft now exists (`docs/legal/TERMS_OF_SERVICE_DRAFT.md`), along with the owner fill sheet. The app links each policy once its URL is set in `BRAND.policies`.
2. **SEC-1.** Production attestation behind S9-1/S9-2: the `has_function_privilege` query has never been reported.
3. **S9-5.** Fixed 11/11 for the live brief link (`vendor_brief.py`, server check). The legacy self-contained brief URL cannot be gated; that is the board's call.
4. **SEC-2** restore drill, **PAY-1** declined card, **UAT-1** first-time users, **SEC-4** pentest.
5. Native only: NAT-1, NAT-4, NAT-7 (analytics fixed 11/11; downloads open), NAT-8 (draft in `docs/native/`), STAGE2-2 (rows drafted in `docs/native/`).

## Independent red-proof of claimed fixes

34 fault reintroductions across 26 findings.

- **Every jest- or pytest-guarded finding:** at least one reintroduced fault turned its guard red.
- **Two guards stayed green when they should have failed.** Both are fixed on `main-2utz0n` (commit "Close two guard gaps…") and red-proofed:
  - **S9-1(b).** The security-definer check assumed new functions are executable only through PUBLIC. A migration revoking `from public, authenticated` would have passed while `anon` could still call the purge function. New functions now start executable by public, anon and authenticated, and removing `anon` from 019's revoke fails 2 of 6.
  - **S9-4(e).** The test's fake database re-implemented "a refund can't be downgraded by a dispute", so deleting the rule from production stayed green. The rule is now decided in the route under the lock, and the fake stores reasons as given; dropping the rule fails 1 of 12.
- **ATTN-2 cites the wrong guard.** `moneyHasOneOwner` stays green on its fault; the real guard is the jest `aChosenCatererReplacesTheGroceries`.
- **GOLD-F-4 is only partly closed.** The program clause is disclosed, not applied, and its test asserts exactly that.
- **E2e-only and not red-proofed here:** N4-3, N4-4, and the click half of ATTN-3.

## Stage 4 instruments on `61cb1324`

| Instrument | Surfaces | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| Measurement (390 isMobile DPR3, 1440) | 16 / 14 | 0 | 1 | 7 | 3 |
| axe-core 4.11.4 @390 | 16 | 0 | 0 | 1 | 3 |
| Nielsen heuristics @390 | 9 groups | 0 | 2 | 10 | 6 |

Raw counts:

- Page horizontal overflow: 0 of 30 renders.
- Tap targets under 44px by effective hit area at 390: 8.
- Contrast under 4.5:1, after a pixel check: 23 per viewport, 9 of them under 3:1.
- Text under 12px: 49 at 390.
- Every counter was red-proofed by injecting a known fault.

**P1s that block stage 6** (fixes in progress 11/11):

- **N1:** in roster mode the headcount disagrees across board, Guests, Money and Ask: 40 vs "likely 2–5" vs "sized for 2–5" vs 40.
- **N2:** six "Test — …" fixtures ship in the public sample list and Search (`hostv2/src/eventPool.js`).
- **M1:** the reveal's confidence labels are 9px at about 2.0:1 contrast on every new host's first screen (`hostv2/src/styles.css` ~2208–2231).

**Notable P2s:**

- The splash wordmark is cut off at 390.
- The splash takes 5 s.
- Search finds no guests or vendors.
- Create has no back control.
- A birthday DJ carries wedding obligations.
- The invite's social proof reads "Aunt + 1 going".
- The pass sheet leads with $39 where the current state is free.

Full tables, screenshots and scripts were kept in the session scratchpad, not the repo.

**Not covered** (needs a real backend): sign-in, live RSVP delivery, checkout.

## Stages, re-measured

| Stage | Drafted 11/11 | What decides it |
|---|---|---|
| 1 Problem | owner fields open | Ruler, basis, pre-registered kill threshold, then three outside hosts asked to pay $39 |
| 2 Scope & design | not-yet | UAT-1; name clearance; a board re-score of the first-run P1s |
| 3 Build | passed-with-conditions (board 11/2) | C3-1 live RLS attestation; C3-2 web-design-guidelines; C3-3 closed |
| 4 Verify | not-yet | The three P1s above; guard script run 11/11; WebKit covers the critical journeys only |
| 5 Security | not-yet | Code met. The production privilege query, RUNBOOK checks A–C, and a pentest booking are owed |
| 6 Deploy | not-yet (owner) | Stages 4 and 5 public P0/P1; rollback for `live` written 11/11, never rehearsed |
| 7 Observe | passed-with-conditions, no ruler | No alerting; telemetry arrival unproven; tracker unsynced |
| 8 Maintain | passed-with-conditions (board 11/2) | Backups and restore owed; root CRA advisories, report-only |
| 9 Promotion | no record | 0 of 4 public gates fully met; packet refreshed in `2026-11-11_STAGE_9_BOARD_PACKET_REFRESH.md` |

## What changed on `main-2utz0n` the same day

- **S9-5:** server-side pass check on vendor-brief minting.
- **Before checkout:** a support line on the pass sheet, and policy-link slots that stay hidden until a policy is published.
- **Price test:** every shown price is tied to the price the server charges.
- **Docs for `live`:** `PROMOTION-DEFERRED.md` and the RUNBOOK rollback rewritten, and the HANDOFF State table re-measured.
- **Legal:** a Terms draft, the owner fill sheet, and the stale deletion and refund statements corrected.
- **Telemetry:** analytics now reports from a native shell (NAT-7), and a `pass_purchase_confirmed` funnel step.
- **RUNBOOK:** an idempotent snippet to record migrations 017–021 in `schema_migrations`.
- **Guard gaps:** S9-1(b) and S9-4(e) fixed.
- **Docs:** the stage 9 packet refreshed, and the store privacy declarations and native surface rows drafted.
