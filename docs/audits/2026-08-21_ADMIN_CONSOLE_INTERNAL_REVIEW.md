# Admin console — internal stage-2/4 review + retirement decision

2026-08-21. Board: 3 seats per the stage-3-internal sizing rule — Tufte
(density/triage), Saarinen (operator workflow/speed), Norman (error
prevention on privileged actions). Confirmation waived by standing
directive. Surface: `?admin=1` console (facing: internal, platform: web).

## Gate records

- **Stage 2 (scope & design): PASSED.** Crisp enumerable scope (17 routes,
  14 tabs, 2 server writes), every claim checkable at file:line, honesty
  doctrine stated in code at every server-synced/browser-local seam.
  Caveat recorded: this is two products in one shell — support ops and the
  knowledge factory — and future reviews gate them separately.
- **Stage 4 (internal Nielsen-lite): PASSED after fixes** (was conditional
  on three items, all closed same sitting — below).

## Findings → what was done

| Sev | Finding | Disposition |
|---|---|---|
| P1 | Client-side corpus writes (publish/rollback/archive/campaign runs, ~20 sites) never reached `admin_audit_log` — operator trail split, browser half wipeable | **FIXED**: `POST /api/admin/audit` (require_admin, `corpus.*` namespace enforced so a console entry can never impersonate a server-verified action) + `adminApi.recordAudit`. Wired at the choke points: the KCR pipeline's single `run()` helper (covers publish, advance, reviews, evidence, proposal, archive), campaign run completion, batch-run summary, campaign delete. Fire-and-forget — audit trouble never blocks the act, same contract as the server's own `audit()` |
| P2 | Publish was one unconfirmed click | **FIXED**: confirm names the record and states "this becomes the value every host's plan reads; rollback exists, deletion does not" |
| P2 | Campaign ✕ hard-deleted with zero confirmation | **FIXED**: confirm names the campaign; delete is audited |
| P2 | No state between visits — reload lands on Overview, "user X in the console" unshareable | **FIXED**: `?atab=` + `?auser=` URL params, restored on mount, replaceState on change |
| P2 | Errors tab: backend `?source=` filter had no UI, no counts, no total | **FIXED**: total + per-source count chips that filter, computed from the fetched window |
| P2 | Audit writes are best-effort (a DB hiccup → unrecorded action, server-logs only) | **ACCEPTED, recorded**: blocking support actions on audit availability is the worse failure; server logs remain the backstop |
| P3 | `GET /metrics/posthog/status` is API-only (no UI caller) | **ACCEPTED**: diagnostic, curl-able; not worth chrome |
| P3 | No keyboard accelerators beyond Enter; 14 flat tabs; cards not tables; native confirm styling | **ACCEPTED at founder scale**: revisit if a second operator ever exists |

Norman seat's "keep these" list, for the record: archive requires a typed
reason before the button arms; rollback requires target + reason + confirm
and never deletes; every button is role-capability gated (`kcrCan`).

## Retirement decision (CRA deletion plan)

**Ruled: the console survives CRA deletion as a standalone lazy entry.**
Fact base: AdminConsole.jsx imports NOTHING from App.js — its graph is
react + `contexts/AuthContext` + `lib/adminApi` + ~35 `src/lib/*` modules
(all already designated shared) + its own files. When the CRA dies:

1. The `?admin=1` gate + lazy import move to whatever shell serves `/`
   (hostv2's main.jsx already routes by query param the same way).
2. `contexts/AuthContext` and the `lib/` tree ride along — they are the
   shared engine layer that survives the CRA by design.
3. The Analytics "local book" panels read the planner's `ngw-events`
   localStorage; post-CRA they go honestly empty (their own banners
   already say browser-local) rather than break. No action needed.

Enforcement: `admin.py` is inside `test_protected_routes_sweep.py`
(17/17 `require_admin` + the new audit route), so the console's server
surface stays gated through the migration regardless of which shell
hosts it.

## Verification

Backend 353/353 (sweep auto-covers the new route: gate in source + bare
401). Jest 423/423. CRA build gate green (242 ≤ 245). Live drive of the
authed console requires an admin-role sign-in, which only Todd has —
runbook: open `?admin=1&atab=Errors`, confirm the count chips; publish
path shows the new confirm; Audit tab should show `corpus.*` rows after
any pipeline action.
