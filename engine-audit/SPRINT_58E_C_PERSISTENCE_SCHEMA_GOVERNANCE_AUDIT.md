# Sprint 58E-C — Persistence & Schema Governance Audit

*Audit only — no feature work. Verify the memory foundation is genuinely stable before Event Memory (58F). Every claim traced to evidence. Date: 2026-06-18.*

## Part 1 — Persistence Assessment (Proven / Likely / Unknown)
| Claim | Status | Evidence |
|---|---|---|
| The events 400 root cause is the dev-bypass non-uuid `studio_id` | **PROVEN** | Captured response body: `22P02 "invalid input syntax for type uuid: \"dev-studio\""`; payload `studio_id:"dev-studio"`; `studio.js:24,34` returns it under `AUTH_BYPASS` |
| The memory model itself is **not** the cause | **PROVEN** | `events.data` is `jsonb` (001_initial_schema:47); the 400 is on `studio_id`, not `data` |
| The fix (uuid guard) eliminates the 400 | **PROVEN** | Post-fix interception: **0 events requests, 0 × 400** |
| Decision Memory + Outcome survive **reload** (dev/local path) | **PROVEN** | Live: capture → full reload → `{reason:true, outcome:"Ran late", history:true}`, 0 errors, 167 tests |
| Real prod (uuid studio) was never affected by this bug | **PROVEN (by construction)** | prod runs `AUTH_BYPASS=false` ⇒ real uuid ⇒ `isCloudStudioId===true` ⇒ guard passes ⇒ path unchanged |
| Memory `jsonb` round-trips through the **real uuid cloud path** | **LIKELY** | schema accepts arbitrary JSON in `data`; `loadEvents` maps `row.data → event` so `decisionMemory`/`outcomes` would survive hydration — but not exercised live |
| RLS lets a real member upsert events with memory fields | **LIKELY** | policies `events: studio insert/update with check is_studio_member(studio_id)` (002_rls); a real member passes — unverified live |
| The actual real-uuid cloud **round-trip + hydration** | **UNKNOWN** | not exercised — **no prod session token provided**; localhost is dev-bypass (no real studio), so this path cannot be tested there |

## Part 2 — Real Production Risk Assessment → **MEDIUM**
- **Dev/local persistence: LOW** — proven end-to-end (reload survival, no 400).
- **Real-prod cloud persistence: MEDIUM.** The path is architecturally sound (jsonb `data` accepts the shape; RLS should pass for a member; the dev bug never touched it) — but it is **unverified live**. The failure probability is low (no schema/RLS reason it would reject), but it is **not proven zero**.
- **Verdict:** evidence justifies shipping **behind the flag to a controlled cohort**; a **real-uuid round-trip verification is recommended before broad enablement.** A single temp-event upsert+readback with a real session token closes this (offered; pending a token).

## Part 3 — Migration Governance — Truth Table
Two histories, different numbering, **applied by different mechanisms**:
| | `supabase/migrations` | `backend/migrations` |
|---|---|---|
| Files | `001`–`008` (4 cols: studios/events/clients/invitations/vendors/settings/claim-fixes) | `0001`–`0006` (comms/event_owners/studios/email/admin) |
| Apply mechanism | Supabase GitHub integration convention path (`supabase/migrations`) — **auto-watched** | **MANUAL** in the SQL Editor — *"no automated migration runner yet"* (`backend/MIGRATIONS.md`) |
| Authoritative for | **events · clients · studios · studio_members · invitations · preferred_vendors · settings · RLS** | event_channels/messages · **event_owners** · comms · email_delivery · admin_audit/error/support |
| Owns the app's core persistence (`events`) | **YES** (001) — the 22P02 path | no (`event_owners` is a separate table) |
| Last maintained | **2026-06-14** (Sprint 55N) | 2026-06-12 |
| **Overlap** | `studios` + `studio_members` | `studios` + `studio_members` ← **defined in BOTH** |
**Why both exist:** `supabase/migrations` is the Supabase-native app schema (events/clients/studios + RLS); `backend/migrations` is the **Python backend's** schema (comms/admin/event_owners) which also (re)declares `studios`/`studio_members` for its own RLS helpers. **Currently authoritative & watched: `supabase/migrations`.** **Legacy/manual: `backend/migrations`.** **Both are applied to the same live DB** (different feature areas), so both are "used" — but only one is auto-applied.

## Part 4 — Schema Drift Risk (ranked)
1. **[HIGH] "Believed shipped but didn't."** `backend/migrations` is **manual** (no runner) — a dev who drops a file there and assumes it auto-applies ships nothing. The doc itself warns this.
2. **[MEDIUM-HIGH] Silent divergence on the duplicated tables.** `studios`/`studio_members` are in **both** folders, both `create table if not exists`. The live shape is whichever ran **first**; a later column change in **either** folder is a **no-op** (table exists) — so the two SQL sources can disagree with the DB and each other without erroring. *(Today they are column-identical — id/name/plan/created_by/created_at — so no live drift yet; the risk is structural, not yet realized.)*
3. **[MEDIUM] Wrong-folder placement of NEW shared tables.** A future shared table (e.g. a memory/outcomes table) could land in `backend/` (manual, easy to miss) or `supabase/` (auto) with no rule to disambiguate.
4. **[LOW] Numbering collision** — different schemes (`00N` vs `000N`) reduce literal filename clashes but increase "which order, across both?" confusion.

## Part 5 — Canonical Migration Strategy (governance only — NO file moves/rewrites)
**Single source of truth: `supabase/migrations`.** Rationale: it's the integration-watched convention path, owns the core app schema (`events`/`clients`/`studios` + RLS), and is the more recently maintained. Recommended **rules** (documentation, not refactor):
1. **All NEW schema → `supabase/migrations`** (one auto-applied source). Never add a *new shared* table to `backend/migrations`.
2. **`backend/migrations` is frozen-legacy** for the Python backend's own tables (comms/admin/event_owners). Do not edit the duplicated `studios`/`studio_members` there — `supabase/migrations` owns them.
3. **No table is defined in two folders going forward.** A short header note in each `MIGRATIONS.md`/`README` stating ownership ("studios/studio_members/events/clients → supabase/migrations; comms/admin → backend, manual").
4. **Future state:** when the backend gets an automated runner, fold its still-needed tables into the canonical history (a later consolidation sprint — explicitly out of scope here).

## Part 6 — Memory Foundation Readiness for 58F → **NEEDS ONE FIX**
| Pillar | State |
|---|---|
| Decision Memory (`event.decisionMemory[]`) | sound — **no schema** (rides `data` jsonb) |
| Outcome Capture (`event.outcomes`) | sound — **no schema** |
| Persistence | dev-proven; real-uuid **likely, unverified** |
| Schema governance | **two sources of truth (unresolved)** |
**58F Event Memory is blob-based** (aggregates existing `decisionMemory`/`outcomes` across loaded events) ⇒ it needs **no migration**, so the schema split does **not block** 58F directly. But shipping memory to real users with (a) an unverified real-uuid round-trip and (b) an unresolved schema-source ambiguity is a real, if low, risk. **Grade: Needs One Fix** — adopt the Part-5 governance rule (cheap, doc-only) **and** run the real-uuid persistence verification before broad enablement. With those, the foundation is Ready.

## Part 7 — Merge Recommendation
**Order: #57 → #55 → #56. None blocked.** #57 (the uuid-guard fix) **first** — it enables persistence and is independent infra (only the `api/` cloud boundary; prod-identical for real users). Then #55 (Decision Memory), then #56 (Outcome Capture, stacked on #55). All three are flag-gated default-OFF, so merging is production-identical; enabling the memory cohort waits on the real-uuid verification.

## Part 8 — Final Verdict
The memory **foundation** is sound and the dev-path persistence is proven; the **fix is correct and minimal**. Two open items gate *broad* enablement (not merging): an unverified real-uuid cloud round-trip, and an unresolved dual schema source. Neither blocks 58F (blob-based) or the flag-OFF merge.

## Final Question — the single highest-risk architectural issue remaining
**Two sources of schema truth.** `studios` and `studio_members` are defined in **both** `supabase/migrations/001` and `backend/migrations/0003`, and `backend/migrations` is applied **manually with no runner** (`backend/MIGRATIONS.md`), while only `supabase/migrations` is integration-watched. **Evidence:** both folders `create table … studios/studio_members`; the backend doc states "applied **manually** … there is **no automated migration runner yet**"; the events/22P02 path lives in `supabase/001`. This outranks the unverified cloud round-trip because the round-trip is *architecturally sound and merely unproven* (low probability, closeable by one token test), whereas the dual schema source is a **standing structural ability for the system to disagree with itself** that **compounds with every future schema change** — and memory's own future (Vendor Bank write-back, real outcome tables) will eventually need schema. Per No Guesswork doctrine, that is the one to close first: declare `supabase/migrations` canonical and forbid new shared tables in `backend/migrations` (governance, no moves).

*Confidence: High — migration inventory, overlap, apply-mechanism, and authority are read directly from the files (`supabase/migrations/001`, `backend/migrations/0003`, `backend/MIGRATIONS.md`) and git recency. Weakest point: whether the Supabase GitHub integration is *currently active* (vs. dashboard-configured) can't be seen from the repo — but it doesn't change the recommendation (one canonical, no new shared tables in backend/).*
