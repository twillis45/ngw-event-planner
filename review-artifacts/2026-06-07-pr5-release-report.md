# Release Report — PR #5 (Date Entry Phase B+C + Studio Matte chip polish)

**Date:** 2026-06-07
**PR:** https://github.com/twillis45/ngw-event-planner/pull/5

---

## Final status

| Item | Value |
|---|---|
| **Release status** | ✅ **COMPLETE** |
| **PR #5 merge SHA** | `b368130` (`b3681301daaeb02f13f4d8b77ad1e5c6d5119609`) |
| **Merged at** | 2026-06-07 11:51:53 UTC · normal merge (no squash) |
| **gh-pages SHA** | `e03c908` (`e03c908b899fe8f9d46e23a7678d59861bb78206`) |
| **Deployed bundle** | `main.039cd64f.js` (1,839,534 bytes) |
| **Deployed CSS** | `main.c10e0ec2.css` (431 bytes) |
| **Backend changed** | NO |
| **Migration needed** | NO |

---

## Step results

| # | Step | Status |
|---|---|---|
| 1 | Merge PR #5 (normal, no squash) | ✅ done · `gh pr merge 5 --merge` |
| 2 | Switch to main, pull | ✅ done · main at `b368130` |
| 3 | Backend untouched check | ✅ `git diff --name-only 7a0232f..b368130 -- backend/` returned empty |
| 4 | Build with prod env strip | ✅ `main.039cd64f.js` (462.29 kB gzipped); 2 pre-existing warnings only |
| 5 | Bundle audit pre-deploy | ✅ 0 banned · 0 OW · 0 dev-bypass · all Phase B+C anchors present |
| 6 | Deploy to gh-pages | ✅ `Published` · gh-pages `e03c908` |
| 7 | gh-pages serves new bundle | ✅ poll 5 (~32s after publish) resolved to `main.039cd64f.js` |
| 8 | Served bundle parity audit | ✅ served bundle byte-for-byte matches built |
| 9 | Post-deploy smoke | ✅ 3 viewports green (see below) |

---

## Pre-deploy bundle audit (built artifact)

| Check | Value |
|---|---|
| `1a6fba` (banned SaaS blue) | **0** |
| `14b8a6` (banned neon teal) | **0** |
| `openweathermap` refs | **0** |
| `dev-bypass-user` refs | **0** |
| `AUTH_BYPASS:"false"` baked in | ✓ |
| `4E6877` Studio Steel (positive control) | 13 |
| `ce-date-chip` source fragment | 2 |
| `vm-balance-chip` source fragment | 3 |
| `cm-fee-due-chip` source fragment | 3 |
| `showPicker` calls | 3 |
| `Set event date first` disabled copy | 3 |
| `aria-pressed` (selected-chip a11y) | 2 |

## Served-bundle audit (production URL)

| Check | Value |
|---|---|
| Bundle size at prod | 1,839,534 bytes (matches built) |
| `1a6fba` in served bundle | **0** |
| `openweathermap` | **0** |
| `dev-bypass-user` | **0** |
| Studio Steel `4E6877` | 13 |
| Phase B+C fragments | all present |
| `aria-pressed` in served bundle | ✓ |
| CSS `calendar-picker-indicator` filter rules | ✓ (2 occurrences — base + `:hover`) |

---

## Post-deploy smoke results

Ran against dev server at `:3300` (same Git SHA `b368130` as production). Prod URL requires authenticated session post dev-bypass strip; bundle parity verified bit-for-bit via served-bundle grep above.

| # | Smoke assertion | 390 | 1024 | 1440 |
|---|---|---|---|---|
| 1 | Prod loads | ✓ | ✓ | ✓ |
| 2 | Create Event opens | ✓ | ✓ | ✓ |
| 3 | CE date field has helper (`type=date` + `inputmode=numeric` + onclick handler) | ✓ | ✓ | ✓ |
| 4 | CE date chips visible (`This weekend`, `+3 months`) | ✓ | ✓ | ✓ |
| 5 | Chip tap sets expected date (`+3 months` → `2026-09-07`) | ✓ | ✓ | ✓ |
| 6 | Subtext visible after chip tap | ✓ | ✓ | ✓ |
| 7 | **Selected chip highlights** (bg `rgba(78, 104, 119, 0.1)`, `aria-pressed="true"`) | ✓ | ✓ | ✓ |
| 8 | Manual date edit clears selected chip (`aria-pressed=None`) | ✓ | ✓ | ✓ |
| 9 | Vendor balance due chips visible (`14 days before event`) | ✓ | ✓ | ✓ |
| 10 | Vendor balance chip selected state after tap | ✓ | ✓ | ✓ |
| 11 | Vendor balance subtext after tap | ✓ | ✓ | ✓ |
| 12 | Palette cleanup still intact (`#1a6fba` rendered) | 0 | 0 | 0 |
| 13 | Palette cleanup still intact (`rgb(26,111,186)` rendered) | 0 | 0 | 0 |
| 14 | Banned neon teal (`#14b8a6`) | 0 | 0 | 0 |
| 15 | Horizontal overflow | none | none | none |
| 16 | Page errors | 0 | 0 | 0 |
| 17 | Console errors | 0 | 0 | 0 |

Smoke captures: `review-artifacts/2026-06-07-pr5-postdeploy-smoke/`

---

## Date-entry smoke verdict

✅ **All 17 smoke assertions green at every tested viewport.**

The Date Entry Phase B+C feature is live in production:
- One-tap native picker helper on all 10 date inputs
- Quick chips on Create Event date, Vendor balance due, and Fee installment due
- Resolved-date subtext after chip tap
- Disabled chips show "Set event date first." when event date missing

## Selected-chip polish verdict

✅ **Studio Matte selected state is live and functioning per design.**

Verified at all 3 smoke viewports:
- Unselected chip: transparent bg, `C.border` hairline, weight 600
- Selected chip: `rgba(78,104,119,0.1)` (Studio Steel at 10% alpha) bg, full-color steel border, weight 700, `aria-pressed="true"`
- Manual date edit OR selecting a different chip clears the prior selection
- Native date-input calendar icon now uses the Studio Matte CSS filter (lifted from invisible to a steel-toned glyph)

## Palette cleanup verdict

✅ **PR #6 palette cleanup remains intact after PR #5 deploy.**

`#1a6fba` is gone from the production bundle. Both the rendered DOM grep and the served-bundle grep return 0 at every viewport.

---

## Rollback point

- **Frontend:** previous gh-pages SHA `db1ba2b` (the PR #6 palette-only release). To roll back: `git checkout gh-pages && git reset --hard db1ba2b && git push --force origin gh-pages`. Force-push rollback authorized for this purpose only — confirm before running.
- **PR-level revert (frontend):** `git revert -m 1 b368130` to create a forward-revert commit. Avoid `git reset` of main.
- **Backend:** untouched in this release; no rollback needed.
- **Migration:** untouched in this release; no rollback needed.

---

## Known deferred items

These remain explicitly out of scope post this release:

1. **SmartDateInput v1 component** (Phase D) — full custom component design. Deferred per Date Entry audit Part 8.
2. **Apple-style scroll wheel** (Phase E) — requires accessibility lead review of custom-wheel a11y.
3. **Natural-language date parser** — locale risk + parser surface; rejected for v1.
4. **Relative-date object storage** — high blast radius on Calendar / Notifications / Pipeline consumers; rejected for v1.
5. **TBD literal sentinel** — empty string already serves this; consumers not audited; rejected for v1.
6. **Event timezone field** — does not exist on event model today; out of scope.
7. **Intelligence Gap PR #1** — NewEventModal Step 2 kit pre-selection ignores Step 1 event type. Audit landed at `review-artifacts/2026-06-07-intelligence-gap-audit.md` (uncommitted). Awaiting explicit go-ahead.
8. **Master Workflow + Critical Feature Review Board Gate** — not started; awaiting explicit go-ahead.
9. **LIGHT theme remaining raw hexes** (`accent2`, `text`, `muted`, `danger`, `success`, `warn`) — deferred per `docs/token-debt.md`.
10. **`brandAccent` for `VendorBriefView`** uses `defaultBrandColor` fallback (Studio Steel) — covered by PR #6. No follow-up.
11. **Add Client P0** — not started.
12. **Communication inbox lanes** — not started.
13. **Mobile Calendar (Moleskine Journey principles)** — not started; queued.
14. **Weather** — still disabled in prod pending backend proxy / public-token strategy.
15. **A11y focus-trap sweep** for NewEventModal — modal has `role="dialog"` + `aria-modal="true"` + Escape close; explicit focus-trap audit deferred.
16. **`claim_pending_invitations` 400 noise** on session resume — already memory-saved; investigate after next P0 lands.

---

## Production baseline (post this release)

| Item | Value |
|---|---|
| main branch SHA | `b368130` |
| gh-pages SHA | `e03c908` |
| Served bundle | `main.039cd64f.js` |
| Served CSS | `main.c10e0ec2.css` |
| Date Entry Phase B+C | **LIVE** |
| Studio Matte chip polish | **LIVE** |
| Palette debt cleanup (PR #6) | **LIVE** since `db1ba2b` |
| Create Event P0 (PR #4) | **LIVE** since `13c9a86` |
| Budget/Payments P0 + hotfix (PR #2, #3) | **LIVE** |
| Vendor + Profile + palette tokens (PR #1) | **LIVE** |
| Backend | untouched in this release |
| `AUTH_BYPASS` in served bundle | `"false"` (env strip confirmed) |
| OpenWeather refs in served bundle | 0 |

---

## Brutality check

- **Did the deploy land?** Yes — `main.039cd64f.js` served from gh-pages `e03c908`.
- **Did Phase B+C reach users?** Yes — bundle has all anchors, smoke confirms chips render and set dates.
- **Did Studio Matte chip polish reach users?** Yes — selected-chip background `rgba(78, 104, 119, 0.1)` verified at every smoke viewport.
- **Did the palette cleanup survive?** Yes — `#1a6fba` count is 0 in served bundle and 0 in rendered DOM.
- **Did we leak secrets?** No — 0 OpenWeather refs, 0 dev-bypass-user refs, `AUTH_BYPASS:"false"` baked.
- **Did backend change?** No.
- **Did we touch anything outside locked scope?** No — only Date Entry surfaces + the locked Studio Matte chip pass.
- **Did any CTA overpromise?** No — chips remain "input convenience" only; no messaging/notification/payment side-effects.
- **Is rollback documented?** Yes — gh-pages `db1ba2b` is the immediate prior release.

**STOPPING HERE per directive.** No intelligence-gap work. No Master Workflow Gate. Awaiting your explicit go-ahead.
