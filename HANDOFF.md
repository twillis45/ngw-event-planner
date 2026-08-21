# HANDOFF — NGW Event Planner

**Measured reality, not intentions.** Updated 2026-08-21 (dawn session).
The long-form architecture log stays `docs/architecture/WHERE_WE_ARE.md`;
this file is the short answer to "where is it, is it green, what's next."

## State

| Fact | Value |
|---|---|
| Branch / HEAD | `main` @ `63e812da` (local; push after CI on the prior batch) |
| Last pushed | `9cce835d` — CI green |
| Jest | **6044 passed**, 1 skipped, 424 suites |
| Backend pytest | **353 passed** |
| e2e (Playwright) | vendorCardFace 3/3, a11yFloor 8/8 desktop, rosterToolbar + wideCanvas green |
| Deploy | GitHub Pages from source; backend on Render |
| Billing | **DORMANT** — `REACT_APP_BILLING_LIVE` unset (Model D built, gated) |

## What shipped this session

1. **Path to Production audit** — all 10 stages, `docs/audits/2026-08-21_PATH_TO_PRODUCTION_AUDIT.md`.
   Stages 1–4/6/8 pass, 5 + 7 worked below, 9 pending (D-2 preconditions).
2. **Stage 5 hardened** — `backend/tests/test_protected_routes_sweep.py` is a
   standing per-route gate over 8 sensitive routers (source gate + reasoned
   PUBLIC allowlist + bare-401 sweep). It caught `verify-session`
   unauthenticated on its first run. DocuSign token moved out of the URL;
   all comm reads/writes gated. Checklist: `2026-08-21_SECURITY_TRACK_CHECKLIST.md`.
3. **Admin console** — 3-seat board, stage 2 + 4 passed after fixes
   (`2026-08-21_ADMIN_CONSOLE_INTERNAL_REVIEW.md`). Corpus actions now reach
   `admin_audit_log`; retirement ruled standalone-capable (zero App.js imports).
4. **Build queue** — "Your days" span-gated door; the **send ledger**
   (board 6-0, `2026-08-21_COMMS_OUTLET_RULING.md`): handed_off is
   host-attested, never "Sent"; vendor drafts log contact in the same
   gesture; email slice (b) records the SERVER's answer only.
5. **Vendors sheet** — 8-seat ruling (`2026-08-21_VENDORS_SHEET_RULING.md`):
   collapsed face is one band, one ranked chip, amber demoted from default.
6. **Desktop/widescreen parity** — one frame + one measure across all 13 rail
   sections; heroes added to the 3 that lacked them.

## Scores

`docs/audits/2026-08-21_NINE_DIMENSION_LEADER_RESCORE.md` — **72/90 (78→80%)**
vs 63.8% on 07-13. Decision engine 42/50.

## Next, in order

1. Push `63e812da` once the prior batch's CI is green (concurrency: never
   push over an in-flight run).
2. Vendors board items 2–6: `.frow` metrics, flip `.vc-chip` off `--warn`
   (red-proof it), settled fold, sheet toolbar, on-demand detail panel.
3. Collapsible left rail (host asked; not started).
4. Comms: prove the Resend webhook live before any `delivered` renders.
5. **User-side only:** D-2's five preconditions (domain + policies, demo
   account sign-in, stranger-proof onboarding test, live-keys Stripe run
   then flip billing, 3 non-founder hosts), pentest, device AT passes.

## Traps that cost time here

- The **browser pane** stops accepting clicks after a few interactions and
  never clicks at desktop widths. Drive with Playwright instead.
- **Four false-zero probes** in one session (grep missed a chunk; a class-name
  counter missed a quote style; `hit.contains(el)` counted ancestors; a raw
  token compared against computed `rgb()`). Red-proof every gate.
- `git checkout --` after a red-proof reverts the guarded edit too.
- Node 20 lives at `/usr/local/opt/node@20/bin`.
