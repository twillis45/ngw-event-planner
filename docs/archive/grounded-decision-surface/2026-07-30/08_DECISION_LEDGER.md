# 08 — Decision Ledger (Phase 9)

Decisions evident in the current code. Rationale is marked **[inferred]** wherever it is not
stated in repo documentation or a code comment.

| Decision | Current status | Evidence | Why it appears to exist | Reversible? | Confidence |
|---|---|---|---|---|---|
| Two front-ends: CRA is donor/frozen, hostv2 is where host features are built | **In force** | `CLAUDE.md` "A1 freeze 2026-07-16"; hostv2 imports ~100 modules from `../src` via `@app` alias | Stated in CLAUDE.md: build in `hostv2/`, never in `App.js` | Yes, but costly | High |
| No router library in either app | In force | CRA uses URL-param branches + `tab` string ladder; hostv2 uses `stage` + `sheet` state | **[inferred]** — incremental growth from a single-file app | Yes | High |
| `playbookDecisionBoard` is the real ranking engine | In force | `src/lib/playbooks/index.js:2268-2787`; all host consumers call it | **[inferred]** | Hard | High |
| `decisionIntelligence.js` is NOT on the host path | In force (likely unintended) | Imported only by `experienceComposer` → admin console, and its own test | Contradicts `DECISION_SCHEMA_SPEC` §4.A/§6 — **[inferred]** regression or aspiration | Yes | High |
| Priority metadata is hand-authored per playbook | In force | `weight`/`reversibility`/`emotionalWeight`/`priorityBasis.rationale` at **215/215** | **[inferred]** — in-code doctrine at `index.js:2093` still says the opposite | Yes | High |
| 39 playbooks author independently; no shared spine | In force | 132 unique ids over 215 decisions; 28 of 29 recurring ids deviate; `venue` spans T-18d…T-365d | **[inferred]** | Yes | High |
| `dependsOn` is the only real gate | In force | 53 edges, 0 dangling, 0 cycles; only `dependsOn` produces `waiting` | **[inferred]** | Yes | High |
| `blocks` is a free-text category tag | In force | 380 values, 109 tokens, 52% match no consumer; only 38 name a sibling | **[inferred]** — drifted from an intended graph | Yes | High |
| Timing provenance computed but never rendered | In force | 0/215 authored; 24/215 resolved by `effectiveTimingProvenance()`; no renderer reads it | **[inferred]** | Yes | High |
| Solemn tone via a hardcoded type-name regex | In force | `src/lib/solemn.js:29` `SOLEMN_RE`; consumed by `planHeroCopy` + hostv2 | Repast harm found and patched per-site | Yes | High |
| Elegant mode default-ON; stage dock retired | In force | `q.get('elegant') !== '0'`; `.dock` computes `display:none` | Host ruling recorded in `styles.css` comments (2026-07-21 v2→v3 cut) | Yes | High |
| Analytics disabled locally + opt-out honoured | In force | `analytics.js:24,31-32,42` | Privacy/local-noise control — stated in file header | Yes | High |
| PostHog key hardcoded as source fallback | In force | `analytics.js:19` | **[inferred]** convenience | Yes | High |
| Releases built on a developer machine | In force | `checks.yml` has no CRA build; `pages.yml` publishes `gh-pages` | **[inferred]** — `pages.yml` header explains only the Pages pipeline change | Yes | High |
| Auth bypass available and active in dev | In force | `REACT_APP_AUTH_BYPASS`; badge rendered in running app | Dev convenience — labelled in UI | Yes | High |
| Parity kit: ask atoms locked, drift gated in CI | In force | `hostv2/src/parity/check-parity.mjs`, runs inside `npm run build` | Stated in the file header: stop the re-inlining treadmill | Yes | High |
| Migration governance gate | In force | `scripts/check-migrations.mjs`, `npm run check:migrations` passes | Stated: no new shared-table migrations | Yes | High |
| Playbook pricing largely ungrounded | In force | `grounding:audit` → 4% cited (8 of 541 priced) | **[inferred]** — grounding ladder exists, coverage lags | Yes | High |

## Not determinable from this repository
- Product positioning and pricing strategy — `REACT_APP_BILLING_LIVE` exists; no conversion instrumentation was found.
- Admin architecture intent — an admin console exists (`src/admin/AdminConsole.jsx`) but was not exercised.
- Whether the CRA freeze is permanent or a migration step. CLAUDE.md says "CRA deletion is scheduled post-Sprint-2"; no evidence in this tree confirms that schedule.
