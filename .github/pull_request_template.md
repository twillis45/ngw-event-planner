## Summary

<!-- what & why -->

## Schema / migration checklist (required if this PR changes the database)

- [ ] **This PR does NOT change database schema.** *(if checked, skip the rest)*
- [ ] If it adds/changes **shared Supabase schema** (any of: `studios`,
      `studio_members`, `events`, `clients`, `studio_invitations`,
      `studio_settings`, `preferred_vendors`, or any table the app/data layer reads):
      the migration is in **`demo/supabase/migrations`** (the canonical,
      integration-watched folder) — **NOT** `backend/migrations`.
- [ ] **Which migration directory owns this table?** ▶ _______________________
- [ ] `npm run check:migrations` passes (no new shared table under `backend/migrations`).

> Canonical rule: `supabase/migrations` owns all shared Supabase schema.
> `backend/migrations` is frozen legacy / manual. See each folder's `README.md`.

## QA

<!-- how verified -->
