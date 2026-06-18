# Sprint 58G-B — Supabase Migration Governance Fix

*Governance + documentation + guardrail only. No schema migration, no file move/rename, no history rewrite, no production schema change. Closes the "two sources of schema truth" risk from 58E-C. Date: 2026-06-18. Branch: `sprint-58gb-migration-governance`.*

## 1 · Migration inventory (per file)
| File | Tables | Purpose | Owner | Shared? | Status |
|---|---|---|---|---|---|
| `supabase/001_initial_schema` | studios, studio_members, **events**, **clients** | core app schema | **supabase (canonical)** | studios/studio_members | watched/auto |
| `supabase/002_rls_policies` | — (RLS) | RLS for the above | supabase | — | watched/auto |
| `supabase/003_studio_provisioning` | — (fn/trigger) | studio auto-provision | supabase | — | watched/auto |
| `supabase/004_studio_invitations` | studio_invitations | invites | supabase | no | watched/auto |
| `supabase/005_preferred_vendors` | preferred_vendors | Vendor Bank | supabase | no | watched/auto |
| `supabase/006_studio_settings` | studio_settings | settings | supabase | no | watched/auto |
| `supabase/007 · 008` | — (claim-invites fixes) | RPC fixes (55N) | supabase | — | watched/auto |
| `backend/0001_communication` | event_channels, event_messages, channel_read_state, pinned_decisions | comms ledger | backend | no | **manual / legacy** |
| `backend/0002_event_owners` | event_owners | backend ownership | backend | no | manual / legacy |
| `backend/0003_studios` | **studios, studio_members** | studios + RLS helpers | backend | **YES (duplicate)** | manual / legacy |
| `backend/0004_email_delivery` | — (GIN index) | delivery index | backend | no | manual / legacy |
| `backend/0005_admin_support` | admin_support_notes, admin_audit_log | admin console | backend | no | manual / legacy |
| `backend/0006_admin_errors` | admin_error_log | admin errors | backend | no | manual / legacy |
**Duplicated ownership:** `studios` + `studio_members` — defined in **both** `supabase/001` and `backend/0003`. (Column-identical today, so no live drift *yet*; the risk is structural.) `events`/`clients` live only in `supabase/`. The backend's own tables (comms/admin/event_owners) live only in `backend/`.

## 2 · Canonical ownership rule (declared)
- **`supabase/migrations` is canonical** for all Supabase / shared database schema — it is the **integration-watched** folder (auto-applied).
- **Canonical-owned tables:** `studios`, `studio_members`, `events`, `clients`, `studio_invitations`, `studio_settings`, `preferred_vendors`.
- **`backend/migrations` is frozen legacy / manual** (per `backend/MIGRATIONS.md` — applied by hand in the SQL Editor). Its `0003_studios` definition is **superseded** by `supabase/001` and kept only for history.
- **No new shared Supabase table may be introduced in `backend/migrations`.**

## 3 · README updates
- **`supabase/migrations/README.md`** (new) — declares canonical ownership, the owned-table list, the apply mechanism, and the guardrail. Read-first.
- **`backend/migrations/README.md`** (new) — declares frozen-legacy/manual status, forbids new shared tables, notes `0003` is superseded.
Both make the rule impossible to miss at the point of editing.

## 4 · PR checklist / contribution note
- **`.github/pull_request_template.md`** (new) — every PR that changes the DB must answer **"Which migration directory owns this table?"** and confirm shared schema lives in `supabase/migrations` + that `npm run check:migrations` passes.

## 5 · Guardrail (lightweight, CI-friendly)
- **`scripts/check-migrations.mjs`** + `npm run check:migrations` (added to `package.json`). Pure Node, no deps. **Fails (exit 1)** if any **non-grandfathered** file under `backend/migrations` creates a canonical-owned table; passes clean today. Verified: clean ⇒ exit 0; a temp `backend/migrations/9999` creating `studios`/`events` ⇒ exit 1 + a clear message. Existing `0001`–`0006` are grandfathered (frozen legacy).

## 5b · Risk assessment
| Before | After |
|---|---|
| HIGH — "believed shipped but didn't" (backend is manual) | **Documented** in both READMEs + PR checklist |
| MED-HIGH — silent divergence on duplicated `studios`/`studio_members` | **Rule + guardrail**: no new shared table in backend; supabase canonical |
| MED — wrong-folder placement of new shared tables | **Caught by `check:migrations`** (exit 1) + PR checklist |
**Residual:** the *existing* duplicate `0003_studios` remains (frozen, by design — no history rewrite); it is column-identical to `supabase/001` so there is no live drift, and it is explicitly marked superseded. No production schema was touched.

## 6 · PR #58 confirmation
**PR #58 (Event Memory v1) contains NO migration / `.sql` files** (verified via `gh pr view 58 --json files`). It is a reader + `event.lessons` blob field — **no schema change, no migration-governance concern.** The GitHub alert on #58 is the standard PR notification, not a schema warning.

## 7 · Merge recommendation
1. **Merge this governance PR first** (docs + guardrail; no runtime/schema impact).
2. **Then merge #58** — confirmed clean (no migration files), flag-gated default-OFF.

## Success condition — met
A future developer **cannot** reasonably add a shared Supabase migration to the wrong folder without hitting an explicit rule: two READMEs at the point of edit, a PR-template question, and a `check:migrations` guardrail that **fails the check**. No production schema change, no history rewrite, no file moves. Governance fixed first.

*Out-of-scope confirmations: no old files moved/renamed/deleted; no migration history rewritten; no Supabase schema changed; no new migration created; no Event Memory / #58 feature code touched; no production data modified.*
