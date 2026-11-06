# Stage 9 — Promotion: board packet for hostv2 (paid web release candidate)

**Status: the board has NOT sat. This packet contains no verdict and must not be read as one.**
Stage 9's verdict *is* the gate (`commands/path-to-production.md` Step 4: the board "Rules only where a gate routes to it — currently stage 9"). The server refuses a stage 9 pass without `boardVerdict` and `boardSeats` (`skill-index/server.js`, the stage 9 route).

Prepared November 3, 2026, by the Path-to-Production command run (`docs/audits/2026-11-03_PTP_COMMAND_RUN.md`), on app repo HEAD `01e56f4d`. The live site serves `d22a9683`, release profile `services`. Target sitting: **Monday, November 9, 2026**.

**Sources.** The spine (`ngw-os/docs/path-to-production.md`, "### 9. Promotion"), `convene-review-board`, `promote-surface`, and this project's roster `docs/claude-skills/REVIEW_BOARD_ROSTER.md`.

---

## 1. What stage 9 is, in the spine's words

> Triggered when a surface's `facing` flips. Retroactively runs every public-only gate the surface skipped while it was internal:
> - Stage 2 public gate — activation/UX doctrine.
> - Stage 4 public gate — impeccable critique.
> - Stage 5 public gate — full security & data review.
> - Stage 7 public gate — instrumentation + tracker sync.
>
> **Gate:** all four, explicitly, as a checklist.

hostv2 has had reach **public** since August 3, 2026 (stage 6 record, 8/29). The spine applies stage 9 *retroactively* to every public gate skipped on the way. The paid release candidate adds money to that surface. It does not create the obligation; it makes the obligation urgent.

**Required skills at stage 9** (`REQUIRED_SKILLS[9]`):

| Order | Skill | Status |
|---|---|---|
| 1 | `promote-surface` | **Ran 11/3/2026**; results in §4 |
| 2 | `readiness` | **NOT RUN as written.** It scores through `localhost:4321/api/readiness`, and the Command Center is unreachable from a cloud session. Substituted by the CLAUDE.md Rule 10 claim check (§5) |
| 3 | `convene-review-board` (first-timer seat mandatory) | **NOT YET**: Monday, November 9 |
| 4 | `path-artifact` | After the board sits |

## 2. The four public gates — current status (measured 11/3/2026, before any C1–C9 fix)

| Public gate | Status | Evidence | What changes it |
|---|---|---|---|
| **Stage 2: activation/UX doctrine** | **FAIL** | No first-time human has used the product (`UAT-1`). The first-run path carries P1 truth defects: `TRUST-1` (reveal claims a guest list that is empty, reproduced again 11/3), `TRUST-2` (vendor read as honoree; again 11/3, "Joe's Steakhouse" read as the honoree), `COMP-1/2/3`. Stage 1's kill gate is not ruled (`STAGE1-1`) and the name is not cleared (`STAGE2-1`) | C3 and C4 merged; two UAT sessions on the release candidate SHA; owner rules D2 and D5 |
| **Stage 4: impeccable critique** | **FAIL** | Fresh 10-heuristic pass 11/3 (`N4-*`): 4 new P1s on top of the recertification's P0 `ATTN-6` and 15 P1s. Red-proof found one escape (`RP-1`). The full Playwright matrix was NOT EVALUATED (port collision) | C1–C7 merged and red-proofed; a re-score by seats who did not build it (spine stage 4, amended 9/6); the matrix green on the release candidate SHA including WebKit |
| **Stage 5: full security & data review** | **FAIL** | New P0 `S9-1`: the RSVP purge function is callable by the anon key. New P1s `S9-2`, `S9-3`, `S9-4`, `RP-1`. Owner attestations `SEC-1/2/3` open; pentest `SEC-4` not run | C9 merged; RUNBOOK §A–C attested; pentest report, **or** a board-recorded decision on a capped cohort with the pentest booked (plan §0) |
| **Stage 7: instrumentation + tracker sync** | **FAIL** | Telemetry arrival unproven (`OBS-1`). Local save, restore and provider failures unreported (`OBS-2`, `N4-3`). **No analytics event for the pass funnel** (`S9-7`/`NEW-2`). The tracker record is drafted, not posted (the Command Center is unreachable from the cloud) | C6 merged with pass-funnel events; RUNBOOK §D arrival proof; the 11/3 gate records posted from the owner's machine |

**Gates passing today: 0 of 4. Gates the evidence cannot yet judge: none.** All four have measured failures. This is a status of evidence, not a verdict; the board rules.

## 3. Seats

**Composition rules applied:**
- **First-timer seat is mandatory and decisive** (`convene-review-board`, stage table).
- **Public cannot skip the first-timer or accessibility seats.**
- **Mobile-flagship** pulls the mobile-first seat up.
- **Every board seats players**, including the person who pays (roster standing amendment, 8/27/2026).
- **Seat the principal** (Step 4a). The product is the owner's own work and is built on no one else's program, so Todd is the principal; the seat is filled by the owner's presence as ruler, not by a board voice.

**Seat-stop.** Re-convening existing roster seats is waived by the standing delegation (9/2/2026). Seats marked **NEW** are additions: they are **proposed and need the owner's confirmation** before the sitting (Step 4, "Adding seats").

Real-person credentials below are as the project roster records them. Per `convene-review-board`, "recall is not a source", so re-verify any credential a seat's argument rests on at the sitting.

| # | Seat | Kind | Lens (roster) | Evidence this seat receives | Status |
|---|---|---|---|---|---|
| 1 | **"Grandmother": the first-time host** | archetype, not a real person | Non-technical first-time user; "shuts the laptop when confused"; **decisive on onboarding** | **UAT Tester A** session notes (`docs/alpha/`), run on the release candidate SHA. Reveal and HostHome screenshots at 390px. The `TRUST-1/2`, `COMP-1/2/3` fixes | Roster (standing). **Mandatory, decisive** |
| 2 | **The paying host** | archetype | The person who pays $39. Would they ask for a refund? | Pass sheet copy and every buyer claim (§5). Live-key purchase, refund and decline evidence (`PAY-1`). Money truth after C1 (`ATTN-6`, `N4-1`, `N4-2`). Restore after C6 (`N4-3`). Published refund policy (`LEGAL-1`) | **NEW**, proposed. Player seat required by the 8/27 amendment |
| 3 | **Practitioner / coordinator** | archetype, voiced by **Mindy Weiss**'s lens | High-volume planner; lived-practice override | **UAT Tester B** notes. Vendor flows (`N4-4`, `FRIC-6`), guest edits (`N4-6`) | Roster (standing) |
| 4 | **Don Norman** | real person (roster) | Affordances, error prevention; "is this button lying?" | The fresh 10-heuristic report (`N4-*`), trust-language findings, the re-score of C1–C7 | Roster (standing) |
| 5 | **Luke Wroblewski** | real person (roster) | Mobile-first, forms, progressive disclosure | The measurement-pass report (390px device emulation, desktop frame), the WebKit results (`VERIFY-1`), form-input findings (`N4-1`, `N4-10`) | Roster (standing). Weighted up for mobile-flagship |
| 6 | **Accessibility** | archetype (function seat), voiced by **Liz King Caruso**'s lens | Inclusive and accessible events; assistive-technology use of the app itself | Measurement report (tap targets, clipping), an axe or Lighthouse accessibility run on the release candidate (**owed**, not yet run), `COMP-8` (access needs heard but not shown back) | **NEW as a stage 9 seat**, proposed. Public cannot skip it |
| 7 | **Tanya Janca** | real person (roster, Engineering & Delivery) | Appsec: secrets in bundles, auth surface | `S9-1..S9-4`, `RP-1`, RUNBOOK §A–C attestations, route sweep and RLS gate results, pentest status or booking, the `live` bundle secret re-scan | Roster (standing) |
| 8 | **James Bach / Michael Bolton** | real people (roster) | "A test that cannot fail is not a test" | The red-proof report (8 gates, the `RP-1` escape), verify:all on the release candidate SHA, the unevaluated rows re-run | Roster (standing) |
| 9 | **Dave Farley** | real person (roster) | Deployment pipeline as the single path; rollback | `RELEASE_SHA` of the release candidate, rollback-to-private rehearsal (**owed**, never run), the `live` profile dispatch record | Roster (standing) |
| 10 | **Madhavan Ramanujam** | real person (roster, Pricing) | Price before product; willingness to pay | Stage 1 kill gate as ruled (`STAGE1-1`), $39 claims, `S9-5` (entitlement enforced only in the client) | Roster (standing) |
| 11 | **The Next Maintainer** | archetype | Reads it cold at 2am with a red build | HANDOFF (re-stamped 11/3), RUNBOOK, `PROMOTION-DEFERRED.md` (stale, `S9-6`), `docs/ADMIN-CONSOLE.md` | Roster player seat (standing). A build board without it is incomplete |

**Recommended size: 11 seats.** Rationale: stage 9 is both a product and a security/money decision, so the first-timer, paying host and accessibility seats are non-negotiable. The cap is lifted by the 8/27 standing override; the practitioner-override and player seats are weighted, and dissent is preserved per seat.

**Owner action before the sitting:** confirm or replace NEW seats 2 and 6.

## 4. `promote-surface`: the four non-negotiable gates (code checked 11/3/2026)

| Gate item | Status | Evidence / check owed |
|---|---|---|
| Admin routes role-checked server-side | **PASS (code)** | All admin routes `require_admin` (`backend/app/routers/admin.py`); route sweep 70/70 security tests. Console chunk still publicly fetchable (`SEC-6`, accepted debt) |
| Privileged *planner* routes role-checked | **FAIL** | `require_planner` is authentication only (`backend/app/auth.py:80-90`). On `live`, any self-signed-up user can create Stripe Checkout sessions for a caller-chosen amount (`backend/app/routers/stripe_payments.py` `create-checkout-session`) → **`S9-3`** |
| Every query scoped (pass, webhook) | **PASS (code)** | Event → studio → membership checks; grant takes `studio_id` from signed metadata only |
| Every query scoped (RSVP/invite) | **FAIL** | `purge_old_rsvp_submissions` is SECURITY DEFINER with no revoke (`supabase/migrations/009_rsvp_submissions.sql:111`) → **`S9-1` (P0)**. Anon insert policy `with check (true)` (`:86-90`) → **`S9-2`** |
| No stack traces in production errors | **PASS** | Generic 500 handler (`backend/app/main.py`) |
| Secrets absent from bundle | **PASS for `services`; UNVERIFIED for `live`** | All 10 live hostv2 chunks plus `sw.js` plus the CRA bundle scanned 11/3, planted-key red-proof. Re-scan the release candidate `live` build |
| Session and logout | **UNVERIFIED** | Backend caches token validity 300s (`backend/app/auth.py:39`). Check: sign out, replay the token at t+60s |
| Login rate limit | **UNVERIFIED** | `SEC-3`, RUNBOOK §C |
| Clean-profile first run | **FAIL / owed** | `UAT-1` |
| Backup plus verified restore | **FAIL / owed** | `SEC-2`, RUNBOOK §B |
| Rollback in under a minute | **UNVERIFIED** | Procedure in `PROMOTION-DEFERRED.md` covers Pages only, never rehearsed, and has no backend, DB or webhook rollback for `live` |
| Deferrals written down | **FAIL** | `PROMOTION-DEFERRED.md` (9/2) assumes the `demo` profile → **`S9-6`** |

## 5. Claims that reach a buyer about the pass (Rule 10: a readiness claim needs a check)

| Claim (where) | Check behind it |
|---|---|
| "$39" (`hostv2/src/HostShellV2.jsx` pass sheet and four other sites) | Server charges 3900. **No test ties copy to the constant** |
| "No monthly fee, no auto-renew, nothing to cancel" | Code only (`mode="payment"`); no test |
| "Every vendor brief and the destination toolkit unlocked" | **Client-side gate only.** Server mints vendor-brief links without checking the pass → `S9-5` (board question: is the honor system acceptable?) |
| "Your next events … the pass covers each event after it" | Client-side stamp; no test |
| "Yours to keep … invite link and recap stay live" | **No check.** `RSVP-LIVE-1`; no published retention policy (`LEGAL-1`) |
| "Your vendors pay us nothing" | Board commitment; no check |
| "Secure checkout on Stripe. We never see your card." | True by construction (hosted Checkout) |
| Refund terms | **Not shown to a buyer, and no code revokes a refunded pass** → `S9-4` |

## 6. What the board decides on November 9

1. **The four public gates (§2):** pass or fail, each with its evidence as it stands on the release candidate SHA.
2. **If the pentest is the only open stage 5 item:** hold the paid launch, or a capped invited cohort with the pentest booked. Plan §0 deliberately leaves this to the board.
3. **`S9-5`:** client-only entitlement. Accept as an honor system for the release candidate, or require server enforcement first.
4. **Any cut taken under plan §5 (D4):** accept each as an open condition, or block on it.
5. **`boardVerdict` and `boardSeats`,** recorded with dissent preserved per seat. Then `path-artifact` republishes.

**The board may not be replaced by this packet, by the recertification, or by an assistant's summary.**


## 7. Evidence ledger, as of 11/5/2026, 1 PM EST (updated as evidence lands)

| Evidence the board needs | In the repository? |
|---|---|
| C9 merged (`S9-1` to `S9-4`, `RP-1`) | **No.** Probe 0 of 6 C9 criteria |
| C1–C8 merged | **No.** `main` unchanged since 11/3 |
| Native builds (iOS, Android) | **No.** No native project pushed |
| RUNBOOK §A–D attestations | **Not reported** |
| Legal pages published | **Not reported** |
| Live-key Stripe lifecycle | **Not run** |
| UAT A and B | **Not run** |
| Pentest | **Not booked, as far as reported** |
| Store confirmations | **None.** Nothing may be called submitted without one |

Every row reads "No" or "Not run" until evidence exists. None is assumed from a report that work is underway.
