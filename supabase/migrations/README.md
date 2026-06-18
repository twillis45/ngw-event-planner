# `supabase/migrations` — CANONICAL schema (read first)

**This directory is the single source of truth for all Supabase / shared database
schema.** It is the directory the **Supabase GitHub integration watches** and
applies. Migrations here are auto-tracked; this is where shared tables live.

## Ownership rule (Sprint 58G-B governance)
- **All Supabase / shared schema MUST live here.** Tables used by the app's data
  layer or by more than one service are *shared* and belong here.
- **Canonical-owned tables (do not redefine elsewhere):**
  `studios` · `studio_members` · `events` · `clients` · `studio_invitations` ·
  `studio_settings` · `preferred_vendors`.
- A **new shared Supabase table may only be added here** — never in
  `backend/migrations` (which is frozen legacy / manual; see its README).

## Why
The repo previously defined `studios` and `studio_members` in **both**
`supabase/migrations/001` and `backend/migrations/0003` — two sources of truth that
can silently disagree (both `create table if not exists`; the live shape is whoever
ran first; later edits in either folder are no-ops). Per **No Guesswork doctrine**,
the system must not be able to disagree with itself. One canonical folder closes that.

## How migrations are applied
- `supabase/migrations` → **Supabase GitHub integration** (auto).
- `backend/migrations` → **manual** in the Supabase SQL Editor (per `backend/MIGRATIONS.md`).

## Guardrail
`npm run check:migrations` (CI-friendly) flags any **new** `backend/migrations` file
that creates a canonical-owned table. Add new shared schema **here** to pass it.

*Governance only — Sprint 58G-B did not move, rename, consolidate, or alter any
existing migration or production schema.*
