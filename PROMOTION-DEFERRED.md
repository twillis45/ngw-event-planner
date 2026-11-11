# Deferred at promotion — rewritten 11/11/2026 for the `live` profile

Surface: **hostv2 host shell** · facing: **public** · platform: **web**

**This is still the retroactive case, and the stakes changed on 11/7/2026.**
The 9/2 version of this file described the `demo` profile (localStorage only,
no accounts), and most of its "not binding today" answers rested on that. Since
11/7 production is `live`: real sign-in, the Supabase database holds hosts'
events and guests' replies, the Render backend serves them, and the $39
One-Event Pass takes real money through Stripe. Every merge to `main` now
deploys `live` (`RELEASE_SHA.txt` on `61cb1324` reads `release_profile=live`).
So nothing below is "blocks live": every open item is a risk carried **now**.

The 9/2 text is in git history (`e1498e09`). Status per item is as measured
11/11/2026 against `main` @ `61cb1324` plus this branch, and says so where it
rests on an owner report rather than a check.

---

## Gate 1 — Authorization is server-side and real

- [x] **Every route refuses an unauthenticated caller.** The sweep
      (`backend/tests/test_protected_routes_sweep.py`) walks every mounted
      router and detects the gate from real calls in the parsed code, not text,
      so a docstring can no longer stand in for a gate (RP-1, red-proofed
      11/3 and again 11/11). A live probe requires 401, not 422.
- [x] **Checkout can't be created for an arbitrary amount** (S9-3): the pass
      route takes no price from the caller; fee checkout needs the fee-planner
      role from `app_metadata`.
- [x] **Refunds and disputes revoke the pass** (S9-4): `pass_payment_blocks`,
      tested; the owner's live refund passed (11/10, owner-reported).
- [~] **The pass is enforced on the server where a live vendor-brief link is
      made** (S9-5, 11/11/2026, `vendor_brief.py`). **Risk accepted, for the
      board to confirm:** the legacy self-contained brief URL (the brief
      encoded in the link) involves no server and cannot be gated; anyone who
      skips the app can build one. What it lacks is the live updates and the
      vendor confirmations, which stay paid.

## Gate 2 — Secrets and error surface

- [x] **The live bundle carries no secret** — scanned 11/11/2026 across every
      chunk the live entry references (7 files); the scanner caught a planted
      key on a test copy. No `sk_`, `whsec_`, `re_` or `sk-ant` strings. The
      only JWT is the Supabase `anon` key, which is public by design and is why
      Gate 5 matters.
- [x] **Signing out revokes the session on the server**
      (`backend/tests/test_signed_out_token_is_refused.py`).
- [ ] **Login rate limiting — not reported.** Owner check: `docs/RUNBOOK.md`
      §C. Binding now: sign-in by emailed code is live.

## Gate 3 — The first-run path you have never seen

- [ ] **Stranger-proof first run — OWED, still the oldest debt here.** No one
      outside the project has used the product (UAT-1;
      `docs/COORDINATOR_TEST_SCRIPT.md` exists, never run). Owner-only.
      **Risk accepted: none.** This is outstanding on a surface that now
      charges money.
- [x] Empty and first-run states are gated in code and covered by e2e.
- [x] A failed save says so, persistently, and names the remedy.

## Gate 4 — Reversibility

- [ ] **Backups on, and one restore actually performed — OWED** (`docs/RUNBOOK.md`
      §B). **Binding now:** the database holds hosts' and guests' data, and the
      schema changes 017–021 were applied by hand on 11/7. `schema_migrations`
      still ends at 016, so the migration log does not describe production.
- [ ] **Rollback for `live` — written 11/11/2026, never rehearsed.** It is now a
      layered procedure (front end, back end, payments, database), in
      `docs/RUNBOOK.md` → Rollback. The front-end step has a trap the 9/2
      version walked into: a manual deploy defaults to `demo`, and `demo`
      hides every signed-in host's cloud events. Owner: rehearse layer 1 and
      layer 2 once, timed.

## Gate 5 — The database refuses the public key (new for `live`)

- [x] **In the repo:** every public table has row-level security
      (`everyPublicTableHasRls`), and migration 019 revokes the RSVP purge
      function and drops anonymous RSVP inserts (S9-1, S9-2), guarded by
      `securityDefinersHaveCallers`.
- [ ] **In production — owner-reported only.** 017–021 were applied by hand on
      11/7 with "12 checks true". The one query that settles S9-1 has not been
      reported:
      `select has_function_privilege('anon','public.purge_old_rsvp_submissions(integer)','execute');`
      must read `false`. Plus `docs/RUNBOOK.md` §A in full.

## Gate 6 — What a buyer is told (new for `live`)

- [x] **A person to ask, before checkout:** the pass sheet names
      `events@noguessworksystems.com` (11/11/2026); the inbox receives mail
      (owner-confirmed).
- [x] **The price shown is the price charged:** `thePassPriceIsTheServersPrice`
      ties every "$39" to `PASS_AMOUNT_CENTS`.
- [ ] **No privacy policy, terms or refund policy is published** (LEGAL-1).
      Drafts in `docs/legal/` carry unfilled owner placeholders, no Terms draft
      exists, and the refund rule is the owner's to pick. The app is wired to
      link each one the moment its URL is set in `BRAND.policies`
      (`src/lib/brand.js`); until then it links nothing rather than a draft.
      **Risk accepted: none.** This is the largest exposure on the list.

---

## Audit logging — explicitly NOT deferrable here

- [x] **Server side it exists:** `admin_audit_log` is written inside the same
      transaction as the write (`backend/app/routers/kcr.py`).
- [ ] **Backend errors go to `admin_error_log`, and nothing alerts on it.** The
      error middleware turns a route crash into a 500 with nothing in the
      Render log; read it with
      `select created_at, message from admin_error_log order by created_at desc limit 5;`.
      No alert route exists (no Sentry alert rule recorded, no Render failure
      notification recorded). Owner: set one up.
- The 9/2 findings about the local write log and the admin console's
  `This Browser` panels were not re-verified on 11/11 and are not restated.

---

*A deferral without a named risk is a decision nobody made — it is an omission
with better paperwork. Three items above decline the deferral outright (the
first run, the policies, and the restore drill behind a database that now holds
people's data) and are recorded as plainly outstanding instead.*
