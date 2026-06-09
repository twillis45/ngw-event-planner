# Release-Readiness Gate — PR #1

**Date:** 2026-06-06
**PR:** https://github.com/twillis45/ngw-event-planner/pull/1
**Verdict at top:** **Option A — Merge as-is, with a strict pre-merge migration order.** Splitting backend out (Option B) is impractical because backend + frontend were squashed together in commit `3fa7b28`.

---

## 1. PR risk classification

| Bucket | Files | Lines | Risk |
|---|---:|---:|---|
| Frontend product/UI (src/App.js, src/plan/*, src/components/*, src/CommandCenter.jsx) | ~20 | +9,800 / -1,840 | **HIGH surface, LOW SoT** — App.js monolith touched, but all writes follow existing event/profile/vendor patterns; no payment/notification policy changes |
| Frontend architecture/theme (src/theme/palette.js, src/lib/vendorAccountability/promiseModel.js) | 3 | +500 / -10 | **LOW** — new modules, additive only |
| Backend admin/API (backend/app/auth.py, main.py, routers/admin.py) | 3 | +288 | **LOW-MEDIUM** — read-only routes + audit append; new router gated by `require_admin` (Supabase `app_metadata.role`); cannot affect non-admin requests |
| Database migration (backend/migrations/0005_admin_support.sql) | 1 | +56 | **LOW** — additive only (`create table if not exists`, `create index if not exists`); requires manual application before admin endpoints work |
| Review artifacts (demo/review-artifacts/2026-06-06-*) | 700+ | +screenshots+JSON | **ZERO** — not bundled to prod build; repo hygiene only |
| Docs (docs/token-debt.md, P0 plan, READMEs) | ~3 | +250 | **ZERO** — non-shipping artifacts |

---

## 2. Backend gate

### Endpoints added (`backend/app/routers/admin.py`)
All routes mounted under `/api/admin/*`. All require `require_admin`. All non-mutating except note-create.

| Method | Path | Effect | Auditable |
|---|---|---|---|
| GET  | `/whoami` | Returns resolved admin principal | ✓ audited |
| GET  | `/audit?limit=N` | Read last N admin actions (max 500) | — |
| GET  | `/users?q&limit` | Search auth.users by email/name/id | ✓ audited |
| GET  | `/users/{user_id}` | Full account + workspaces + event count | ✓ audited |
| GET  | `/users/{user_id}/notes` | List support notes for user (append-only history) | ✓ audited |
| POST | `/users/{user_id}/notes` | **The only write endpoint.** Appends to `admin_support_notes` | ✓ audited |

### `require_admin()` safety

- **Auth source:** Supabase `app_metadata.role` — server-controlled. A signed-in user **cannot** set this from the browser; only the service-role JWT can update `auth.users.raw_app_meta_data`.
- **Behavior:**
  - No bearer token → **401 Authentication required**.
  - Valid Supabase token + role in `{'admin', 'support'}` → returns principal dict.
  - Valid token, no admin role → **403 Admin role required** (distinct from 401).
  - Dev-token bypass exists but is gated by `ALLOW_DEV_TOKEN=true` env var — must NOT be set in production.
- **Caching:** valid tokens cached 300s in `verify_supabase_token` (auth.py L24, L62). Revocation requires waiting up to 5 min.
- **Production assertion:** as long as `ALLOW_DEV_TOKEN` is unset (or false), the only auth path is Supabase JWT introspection.

### Normal users
- A non-admin signed-in user hitting any `/api/admin/*` route: **403 Forbidden** (after 401 check passes).
- Unsigned requests to `/api/admin/*`: **401 Unauthorized**.
- Normal app traffic does not touch admin routes (frontend only loads admin surface behind `?admin=1` query param + auth-gate).
- **No risk to existing planner/vendor/event flows.**

### Migration safety
- **Additive only.** Statements:
  - `create extension if not exists pgcrypto;` — already enabled on Supabase by default.
  - `create table if not exists admin_support_notes (...)` — new table.
  - `create table if not exists admin_audit_log (...)` — new table.
  - `create index if not exists ...` ×3 — additive.
  - `alter table ... enable row level security;` — turns RLS on for the new tables.
  - `drop policy if exists ...; create policy ...` ×2 — idempotent.
- **No DROP TABLE. No ALTER COLUMN. No backfill. No data migration.**
- **Manual application required.** Migration is not auto-run by backend startup. SQL must be executed via Supabase SQL editor (service role) before admin endpoints can succeed. Header comment in the SQL file walks through the exact command.

### RLS policies
- Only SELECT policies are defined, both gated on `(auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support')`.
- No INSERT/UPDATE/DELETE policies → under RLS, no anon/authenticated client can write directly. Only the privileged service-role API (which bypasses RLS) can write.
- **Defense-in-depth:** even if the API key leaked, browser-direct access can't read or write these tables without an admin JWT.

### Could this break Render startup?
- **No.** The only startup-time change is `app.include_router(admin.router)` in main.py. Router import succeeds because `..auth` and `..db` already exist.
- If the migration **has not run yet**, the admin router still loads — only the endpoint queries will 500 when an admin actually calls them. No effect on planner/vendor/event traffic.

### Tests / smoke checks
- **No backend tests exist.** `find demo/backend -name "test_*.py" -o -name "*_test.py"` returns empty.
- **No smoke script.** Verification path is: deploy backend → admin user hits `/api/admin/whoami` from browser → expect 200 if migration ran and role is set, else 500 / 403.

### Should backend be split into a separate PR?
- **Recommended: no, because it's impractical** — commit `3fa7b28` squashed +16,440 lines (frontend) and +344 lines (backend) into one commit. Splitting would require git surgery (cherry-pick + revert across 38 commits) which itself carries risk.
- **Acceptable mitigation:** merge as-is, but apply migration BEFORE merging so the admin endpoints work the moment the backend redeploys.

---

## 3. Frontend gate

### Build
- **Result:** `Compiled with warnings.` — no errors.
- **Bundle size:** `main.b9bebf96.js` = 453.64 KB gzip (`+30.73 KB` vs prior baseline, attributable to Add Vendor wizard + Profile Settings + theme/palette.js + supporting modules).
- **Warnings:** 2 unused-variable warnings only (`isObserving`, `focal`) — pre-existing, not from this session.
- **Homepage:** `https://twillis45.github.io/ngw-event-planner` (built with PUBLIC_URL `/ngw-event-planner/`). Correctly resolved.

### Parse check
- `src/App.js` parses clean (verified earlier via @babel/parser).
- `src/CommandCenter.jsx` parses clean.
- `src/plan/VendorPlanningWorkspace.jsx` parses clean.
- `src/theme/palette.js` parses clean.

### Add Vendor wizard QA — `demo/review-artifacts/2026-06-06-wave1-p0/add-vendor-wizard-v2/`
**All 5 viewports green** (390/430/768/1024/1440):
- Nav reachable (mobile bottom-nav People → Vendors path works)
- Website field present
- 4-line trust block visible verbatim
- Draft follow-up label correct, Copy follow-up label gone
- Step 1 empty validation works
- Step 2 promise uncheck decrements count
- Step 3 review itemized correctly
- Create writes exactly one vendor; cancel writes zero
- Success state shows itemized confirmation
- Open vendor opens VendorModal for the new record
- 0 horizontal overflow, 0 banned hexes, 0 amber/red primary CTA, 0 page/console errors

### Profile Settings QA — `demo/review-artifacts/2026-06-06-profile-settings-after/`
5/5 viewports clean: no banned hexes, no overflow, no errors, Continue setup + See all toggle work, 6 anchors fire on scroll.

### Home/Event/Vendor/Comms smoke
- HomeHero amber regression fix verified (DOM color-band probe at 390 + 1440 returns 0 amber active-page hits).
- Up Next CTA verified steel-blue at 1440 event view.
- Sidebar `⚠` glyph stripped — verified zero amber on event-level sidebar nav.
- Composer 6-state contract code-reviewed: `Composer` at `src/plan/CommunicationHub.jsx:519` — no logic changes in this session, contract intact.
- Budget surface code-reviewed: no payment/Stripe writes touched in this session.

### Banned color scan
- DOM scan at every QA viewport: `#1a6fba` = 0, `#14b8a6` = 0.
- Confidence-warm-gold (`#f0bc44`, `#e08c38`) — not introduced.

---

## 4. Deployment gate

### How GitHub Pages is currently built/pushed
- `package.json` scripts:
  ```
  "build": "react-scripts build"
  "deploy": "gh-pages -d build"   ← uses the gh-pages npm package
  ```
- `homepage`: `https://twillis45.github.io/ngw-event-planner`
- **There is no `.github/workflows/` folder in this repo.** The `gh-pages` branch is updated by running `npm run build && npm run deploy` from a developer's machine (or a CI somewhere outside this repo). The "Updates" commit messages on `gh-pages` are generated by the `gh-pages` npm package's default commit template.
- **Merge to `main` does NOT trigger a frontend rebuild.** Someone must run the deploy command manually.

### Render backend auto-deploy
- No `render.yaml` in repo. No `Procfile`. Render config is set in the Render dashboard (out-of-repo).
- **Cannot confirm from this repo whether Render auto-deploys on push to `main`.** Render's default for connected GitHub repos IS auto-deploy on push to the watched branch, but this should be verified in the Render dashboard before assuming.

### Migration auto-run vs manual
- **Backend does not auto-run migrations.** No migration runner in `app/main.py` startup hooks.
- Migration must be applied manually in the Supabase SQL editor (with service-role privileges) by an operator.

### Exact post-merge deploy actions required
1. **Apply migration** (run BEFORE or right after merge):
   - Supabase Dashboard → SQL Editor → paste contents of `backend/migrations/0005_admin_support.sql` → Run.
   - One-time grant: `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where email = 'todd@toddwillisphoto.com';` (or another admin email).
2. **Backend redeploy** (Render):
   - If auto-deploy is enabled: happens automatically on push to `main` after merge.
   - If not: trigger manually from Render dashboard.
3. **Frontend deploy** (manual):
   ```
   cd demo
   CI=false npm run build
   npm run deploy
   ```
   This builds React app and pushes `build/` to the `gh-pages` branch. GitHub Pages then serves it within ~1 minute.

---

## 5. Release options

| Option | What it means | Trade-off |
|---|---|---|
| **A. Merge PR as-is after checks (RECOMMENDED)** | Apply migration → merge → backend redeploy → manual frontend deploy | Cleanest given the squashed `3fa7b28` commit. Mitigation: apply migration BEFORE merge so backend admin endpoints work the moment Render redeploys. |
| B. Split backend admin/migration into separate PR | Cherry-pick backend paths from `3fa7b28` to a new branch | **Impractical** — `3fa7b28` mixes 16k frontend + 344 backend in one commit; surgery is itself risky. |
| C. Split review artifacts out | Move `demo/review-artifacts/` to a separate branch or external store | Optional. Artifacts don't ship to the prod build (not in `build/` output). They inflate the PR diff but are zero risk. Defer to a repo-hygiene sprint. |
| D. Merge frontend only, defer backend | Skip backend in merge | Requires the same surgery as B — same impracticality. Plus backend has been shipping in dev for days; reverting it here would diverge prod from dev. |
| E. Do not merge; continue on feature branch | Hold for Budget/Payments + other P0 work | Acceptable only if you want to bundle everything into one larger ship. Adds time-decay risk on the frontend audit findings. |

---

## 6. Required final report

### Release verdict
**Option A — merge as-is with a strict pre-merge migration order.**

### Build / test status
- Frontend `npm run build`: ✅ **PASS** (compiled with 2 pre-existing unused-variable warnings; no errors).
- Frontend parse check: ✅ **PASS** (all changed source files parse clean).
- Add Vendor wizard QA: ✅ **PASS** at all 5 viewports.
- Profile Settings QA: ✅ **PASS** at all 5 viewports.
- Banned color scan: ✅ **PASS** (0 instances of `#1a6fba`, `#14b8a6`).
- Amber active-page check: ✅ **PASS** (0 amber hits after HomeHero + Up Next + sidebar fixes).
- Backend tests: ⚠️ **NONE** (no test files exist for backend; verification is post-deploy via `/api/admin/whoami` from an admin browser).

### Backend risk status
- **Code:** LOW. `require_admin` is well-designed (Supabase `app_metadata.role`, server-controlled, distinguishes 401/403, dev-token gated by env var). Endpoints are read-only except a single append-only POST. Every action is audit-logged.
- **Operational:** LOW-MEDIUM. Migration must be applied manually before admin endpoints work. If migration is skipped: admin endpoints 500 on query; non-admin traffic unaffected. Render startup unaffected (router loads regardless of DB state).
- **Production data:** ZERO risk to existing tables. Admin tables are net-new.

### Migration risk status
- **Additive only.** `create table if not exists`, `create index if not exists`, `enable row level security`, `drop policy if exists` (idempotent) + `create policy`.
- **No destructive statements.** No DROP TABLE, no ALTER COLUMN, no data backfill.
- **Idempotent.** Safe to re-run.
- **Manual application required.** Backend does not auto-run.
- **Rollback path:** drop new tables (`drop table if exists admin_support_notes; drop table if exists admin_audit_log;`). Backend admin endpoints will then 500 until tables are recreated, but non-admin traffic stays clean.

### Deployment plan
**In order:**
1. **Pre-merge** — apply migration in Supabase SQL editor; grant your user the `admin` role.
2. **Merge PR #1** — green button only (no force-merge, no auto-merge configured).
3. **Backend** — Render redeploys (verify in Render dashboard whether auto-deploy is configured; if not, trigger manually).
4. **Backend smoke** — hit `/api/admin/whoami` from a browser with the admin user signed in. Expect 200 with `{"ok": true, "principal": {...}}`. If 500: check Render logs for migration-not-applied or env var issue.
5. **Frontend** — from the repo's `demo/` directory: `CI=false npm run build && npm run deploy`. This pushes the build to `gh-pages`. Wait ~1 minute for GitHub Pages to serve.
6. **Frontend smoke** — visit `https://twillis45.github.io/ngw-event-planner`, verify Add Vendor wizard fires from `+ Add` on the Vendors tab.

### Rollback plan
- **Frontend:** `gh-pages` previous SHA was `db1ba2b` (the live one today). To roll back the deploy: `git checkout gh-pages && git reset --hard db1ba2b && git push --force origin gh-pages`. **This is the only force-push that's authorized for rollback** — confirm before running.
- **Backend:** in Render dashboard, redeploy the previous commit (sha `8043243` — Backend hotfix). Render keeps deploy history.
- **Migration:** `drop table if exists admin_support_notes; drop table if exists admin_audit_log;` in Supabase SQL editor. Idempotent. Re-applying the migration restores tables empty.
- **PR:** if everything looks wrong post-merge, the `main`-to-prerelease revert is `git revert -m 1 <merge-commit-sha>` to create a forward revert. Avoid resetting `main`.

### Merge recommendation
**Approve and merge after applying the migration first**, in this order:
1. You apply migration manually in Supabase.
2. You verify (in Supabase SQL editor) that `admin_support_notes` and `admin_audit_log` exist.
3. You merge PR #1 via the GitHub UI.
4. You verify Render auto-redeployed (or trigger manually).
5. You run `npm run build && npm run deploy` from the `demo/` directory to push the frontend.

### Exact next command if approved
**You run** (not me):
```
# Step 0 — pre-merge migration (Supabase SQL editor, paste this):
\i backend/migrations/0005_admin_support.sql
update auth.users set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where email = 'todd@toddwillisphoto.com';
```

```
# Step 1 — merge (after migration confirmed):
gh pr merge 1 --merge   # or --squash if you prefer; I recommend --merge to preserve history
```

```
# Step 2 — frontend deploy (after merge):
cd /Users/toddwillis/Code/ngw-event-planner/demo
CI=false npm run build
npm run deploy
```

### What NOT to do
- **Do NOT** `git push --force` to `main`.
- **Do NOT** run the migration with destructive flags (`DROP TABLE ... CASCADE`, etc.).
- **Do NOT** trigger backend deploy before migration application.
- **Do NOT** auto-merge the PR via GitHub's auto-merge feature without applying the migration first.
- **Do NOT** start the Budget/Payments rebuild before this gate is closed.
- **Do NOT** set `ALLOW_DEV_TOKEN=true` on Render (it's the only env var that would weaken admin gating).
- **Do NOT** edit the new admin tables directly via Supabase dashboard SQL editor for routine operations — go through `/api/admin/*` so every action is audit-logged.
