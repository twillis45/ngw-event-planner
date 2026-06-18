# Sprint 58E-B — Events Persistence 400 Fix

*The highest-priority blocker: Decision Memory (58C) + Outcome Capture (58E) didn't survive reload because the events cloud write returned 400. Root cause found from the RESPONSE BODY, not the status code. Smallest real fix. Date: 2026-06-18. Branch: `sprint-58eb-events-400-fix`.*

## 1 · Root cause
Under **`REACT_APP_AUTH_BYPASS=true`** (dev/localhost), `currentStudioId()` returns the synthetic placeholder **`'dev-studio'`** (`studio.js:24,34`). The app still attempts a cloud upsert to the real prod Supabase, whose `events.studio_id` is a **`uuid`** column. Postgres rejects the non-uuid string:
```
POST .../rest/v1/events?on_conflict=id   →  400
{"code":"22P02","message":"invalid input syntax for type uuid: \"dev-studio\""}
```
It is **not** the memory fields — `data` is `jsonb` and accepts `decisionMemory[]`/`outcomes` fine. It is the **studio_id**. And it is **dev/localhost-only**: in prod `AUTH_BYPASS=false`, so `currentStudioId()` resolves a real **uuid** studio and this never fires.

## 2 · Evidence (captured live via response interception)
| | |
|---|---|
| URL | `https://ewoggzxarpcwesqxsdoz.supabase.co/rest/v1/events?on_conflict=id` |
| Method | `POST` (upsert) |
| Request payload keys | `["id","studio_id","data"]` · `studio_id: "dev-studio"` |
| Status | **400** |
| Response body | `{"code":"22P02","details":null,"hint":null,"message":"invalid input syntax for type uuid: \"dev-studio\""}` |
| Postgres code | **22P02** (invalid_text_representation) |
Hypotheses tested & **rejected** by the body: schema-missing-field (all 3 columns sent), payload size, RLS (would be 403/42501), non-serializable JSON, `updated_at` (trigger-managed). **Confirmed:** non-uuid `studio_id` from dev-bypass (hypotheses #5 owner-id mapping + #10 localhost-on-prod-env).

## 3 · Files changed
| File | Change |
|---|---|
| `src/lib/api/studio.js` | export `isCloudStudioId(sid)` — true only for a real uuid |
| `src/lib/api/events.js` | gate `loadEvents` / `saveEvent` / `deleteEvent` / `flushPendingEvents` / `migrateLocalToCloud` on `isCloudStudioId(sid)` — non-uuid ⇒ local-only |
| `src/lib/api/clients.js` | same guard at all 4 boundaries (same latent bug) |
| `src/lib/api/__tests__/studioGuard.test.js` | 3 tests |

## 4 · Fix explanation
A non-uuid studio has **no cloud row** — so cloud data-sync must be **local-only** for it (the localStorage write already happened). The guard stops `'dev-studio'` from ever reaching a uuid column (kills 22P02), and makes load/flush skip the doomed round-trip. **No schema change, no migration, no new table, no persistence rewrite, no memory-model change.** Real (uuid) studios are unaffected — `isCloudStudioId(uuid)===true`, so the cloud path runs exactly as before.

## 5 · Persistence verification (puppeteer, live, with the memory feature)
| Matrix item | Result |
|---|---|
| **No 400** — events requests after fix | **PASS** — `[]` (dev-bypass sends no cloud request; 0 × 400) |
| **Decision Memory** — confirm vendor → capture rationale → **reload** → persists | **PASS** (`reason:true` after full reload) |
| **Outcome Capture** — capture vendor outcome → **reload** → persists | **PASS** (`outcome:true` — "Ran late") |
| Decision History renders after reload | **PASS** |
| No console / page errors | **PASS** |
| Unit (guard) + full suite | **3/3 · 167/167** |
*On localhost (dev-bypass) memory persists via **localStorage** and survives reload (loadEvents → readLocal for a non-uuid studio). On real prod the path is a real uuid studio — unblocked, and the `jsonb data` column accepts the memory fields by schema.*

## 6 · Solstice safety check
**Safe — untouched.** Every events write from my earlier QA ran on localhost (dev-bypass) and therefore **400'd at the uuid check before reaching Postgres** — nothing persisted to the real prod `events` row. The QA mutations lived only in the ephemeral headless-browser localStorage and never reached the cloud. No real Solstice data was modified. *(I can't query prod without a session token to show the row directly; the proof is logical — all writes 400'd. Offer to confirm with a token if you want certainty.)*

## 7 · QA matrix — regression
No data loss (localStorage write unchanged) · no duplicate events (upsert `on_conflict=id` unchanged) · no auth regression (only the data-sync boundary gated) · no RLS bypass (we send **fewer** requests, never more; real-uuid path identical) · 0 console/page errors · build compiles.

## 8 · Merge recommendation
**MERGE — independent infra fix, safe to land first.** It touches only the `api/` cloud boundary, is orthogonal to the memory PRs, prod-behavior-identical for real users, and unblocks persistence. Recommended order: **this (#57) → #55 (Decision Memory) → #56 (Outcome Capture).**

## 9 · Are #55 / #56 now safe to merge?
**Yes — with this fix landed first.** Verified live: with the guard in place, captured decisions + outcomes survive a full reload. A memory feature that doesn't persist would be worse than none; persistence is now proven (locally end-to-end; the real-uuid cloud path was never the blocker — only the dev placeholder was). Land #57, then #55, then #56.

*Confidence: High — root cause is the verbatim response body (22P02 on `studio_id: "dev-studio"`); fix verified by zero post-fix events requests + reload-survival of both the reason and the outcome. Residual: the real-uuid cloud round-trip isn't exercised here (no prod session) — but it was never broken by this bug, and the `jsonb` column accepts the memory shape by schema.*
