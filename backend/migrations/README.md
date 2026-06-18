# `backend/migrations` — FROZEN LEGACY / manual (read first)

**This directory is NOT the canonical schema source and is NOT watched by the
Supabase GitHub integration.** Files here are applied **manually** in the Supabase
SQL Editor (see `../MIGRATIONS.md`). It exists for the Python backend's own
historical, backend-local tables.

## Ownership rule (Sprint 58G-B governance)
- **Do NOT add a new shared Supabase table here.** All shared / Supabase schema is
  owned by **`supabase/migrations`** (the canonical, integration-watched folder).
- **Canonical-owned tables — do not (re)define here:**
  `studios` · `studio_members` · `events` · `clients` · `studio_invitations` ·
  `studio_settings` · `preferred_vendors`.
- These files are **frozen as historical reference.** `0003_studios.sql` contains a
  legacy `studios`/`studio_members` definition that is **superseded** by
  `supabase/migrations/001`; it remains only for history. Do not edit it to change
  shared schema.
- Backend-local tables that genuinely belong only to the Python service
  (`event_channels`, `event_messages`, `event_owners`, `admin_*`, …) may stay here,
  but any **new** such file needs explicit approval, and may **not** create a
  canonical-owned table.

## Why
`studios`/`studio_members` were defined in both this folder and
`supabase/migrations` — two sources of truth that can silently diverge. Per **No
Guesswork doctrine**, one canonical folder (`supabase/migrations`) now owns shared
schema. See `supabase/migrations/README.md`.

## Guardrail
`npm run check:migrations` flags any **new** file here that creates a canonical-owned
table. Put new shared schema in `supabase/migrations` instead.

*Governance only — Sprint 58G-B did not move, rename, consolidate, or alter any
existing migration or production schema.*
