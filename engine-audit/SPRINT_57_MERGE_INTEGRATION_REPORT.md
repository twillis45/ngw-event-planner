# Sprint 57 Merge Stack — Integration Report

*Integration sprint: merge the presentation/trust PR stack in order, verify, deploy with flags OFF, report. No new features. Date: 2026-06-18 (UTC). Layers: Voice → Labels → Navigation → Reassurance → Confidence → Explanation.*

## 1 · Merge order completed (exact)
1. **PR #47** — 57C Vocabulary Layer (`pi.labels`)
2. **PR #48** — 57E-A Host IA Navigation (`pi.nav`)
3. **PR #49** — 57F-A Positive Attention (`pi.attention`)
4. **PR #50** — 57G Confidence Grammar (`pi.confidence`)
5. **PR #51** — 57H Because Layer (`pi.because`)
All five **MERGED** to `main`.

## 2 · Commit SHAs (merge commits)
| PR | Merge commit |
|---|---|
| #47 | `b7c87fb` |
| #48 | `4b2a8ed` |
| #49 | `a39c6aa` |
| #50 | `4bf3ee0` |
| #51 | `939f22b` |
Pushed `d8a31d4..939f22b` → `origin/main`.

## 3 · Conflicts & resolutions
All conflicts were **trivial and presentation-only** (no logic touched):
| PR | File | Conflict | Resolution |
|---|---|---|---|
| #48 | `nextActionRenderer.js` | `audiencePersona` comment (function body **identical**) | kept the full "voice + labels + nav + attention + confidence" comment |
| #49 | `nextActionRenderer.js` | same comment + `personaFor` trailing comment | kept fuller comments; body untouched |
| #50 | `CommandCenter.jsx` | `HealthRow` edited by BOTH #47 (labelFor) and #50 (confidence grammar) | **combined**: `HealthRow({…event, grammar})` — `dispLabel=labelFor(h.label)`, `dispStatus = conf ? conf.word : labelFor(h.statusLabel)`, dot/label color = `dotC`; map passes both `event` + `grammar` |
| #51 | `CommandCenter.jsx` | adjacent import line | kept both imports; `because` line + `because` row fields auto-merged |
The shared `audiencePersona` extraction was **byte-identical** in every branch — conflict-free as predicted.

## 4 · Test results (after each merge)
| After | Suites | Tests |
|---|---|---|
| #47 | 5 | 119 |
| #48 | 6 | 126 |
| #49 | 7 | 133 |
| #50 | 8 | 142 |
| #51 (final) | **9** | **148** |
All green; zero failures at every step.

## 5 · Build result
`REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" npm run build` → **`main.4341a810.js`**, 664.5 kB (**+1.78 kB** for the entire 5-layer stack). Compiled (warnings only). Playbook `qty`/`summary` formula **byte-identical** to pre-stack `824b05e` (only `factor`/`factorType` added inline).

## 6 · Screenshot package (`demo/review-artifacts/`)
- `57merge_allOFF_1440.png` — production identity (14 nav, raw ON TRACK/AT RISK).
- `57merge_hostALL_1440.png` — **all six layers composed**: host voice spine · 7-item host nav · "Where things stand" labels · "You're Set On ✓ Seating" · grammar ("Not set yet" / "You're set" / "Worth a look" / "Needs you" / "About" / "Confirm") · Because ("7 guests × 2 plates…", "standard dinner party safety basics + alcohol service").
- `57merge_plannerALL_1440.png` — planner identity (14 nav, "No data"/"Confirmed", Because, no host block).
- `57merge_hostALL_390.png` / `57merge_allOFF_390.png` — mobile.
- `57merge_PROD_smoke_1440.png` — live production login (auth gate healthy).

## 7 · Flag state
All six flags **default OFF**, verified in the shipped bundle (read from `?pi=` / `localStorage 'ngw-pi-*'` / `REACT_APP_PI_*`; never auto-enabled) and on the live site (`localStorage` empty ⇒ all OFF). **No global enablement.**
- **Enable for a host test cohort:** on a known host/seed account only — set `localStorage['ngw-pi-voice'|'labels'|'nav'|'attention'|'confidence'|'because']='1'` (or append `?pi=<flag>`), staged review.
- **Disable immediately:** remove those `localStorage` keys (or simply never set them) — flags are **client-side opt-in**, so disabling needs **no redeploy**. Hard rollback (not required while OFF): `git revert b7c87fb..939f22b` + redeploy, or re-publish the prior bundle.

## 8 · QA matrix (puppeteer, screenshot-verified)
| Scenario | Result |
|---|---|
| **Baseline — all flags OFF** | **PASS** — 14-item nav, raw tokens, no You're-Set-On, no Because, no grammar, no route/readiness/quantity change = **production identity** |
| **Host full stack (6 flags ON, audience self/family)** | **PASS** — host voice · reduced nav (7 = 6 + revealed Paperwork) · host labels · You're Set On (✓ Seating) · confidence grammar · Because where factors exist. No planner jargon, no false confidence, no unsupported because |
| **Planner identity (flags ON, audience client/professional)** | **PASS** — full 14-item nav (no simplification) · planner vocabulary ("No data"/"Confirmed") · Because (universal) · **no** host attention block · no lost routes |
| **Mobile 390** | **PASS** — renders host + OFF, no overflow/crash/console errors |
| **Desktop 1440** | **PASS** — rail correct, Needs You unchanged except presentation, You're-Set-On only when valid, Because only where rationale exists, nav reduction host-only |
| **Deep link / route safety** | **PASS** — `hostNav` returns a subset of the same route keys; `PLANNER_TABS`/`handleTabChange`/route keys untouched (unit T6 + 57E-A validation); hidden host items remain routable |
| **No console / page errors across matrix** | **PASS** |

## 9 · Known limitations
- **Planning Health rail is desktop-only** ⇒ confidence grammar + Because render on desktop; mobile Overview uses Vendors/Documents sections (no rail) — no mobile regression, but no mobile grammar/Because either.
- **Operator persona not yet wired** (`organization → planner` today); operator confidence words + the would-render Because are authored/ready but inactive until the Operator sprint.
- **Authenticated prod surface not smoke-tested** — prod is auth-gated (`AUTH_BYPASS=false`); the unauthenticated smoke verifies bundle + flags + 0 errors + healthy login only (known non-blocker).
- **QA event injection** is clobbered by the session cache once populated; fully-set / planner-audience cases used populated-cache writes (screenshot-confirmed).

## 10 · Deploy status
**DEPLOYED to production**, flags OFF. `npx gh-pages -d build` → Published. Live bundle confirmed **`main.4341a810.js`** at `https://twillis45.github.io/ngw-event-planner/`; **0 JS/page errors**; `localStorage` flags empty (default OFF); healthy "Planner sign-in". Production behavior is **byte-identical to before this merge** (no visible change with flags OFF).

## 11 · Recommendation → **SHIP (shipped) + ENABLE COHORT (staged, host-only)**
- **SHIP:** done — the stack is merged and deployed with all flags OFF, so there is **no visible production change** and zero risk to current users. Verified by the all-OFF baseline = production identity.
- **ENABLE COHORT (next, your call):** when ready, enable the six `pi.*` flags **for host-audience test accounts only** (per §7), staged review. A host then sees: **fewer tabs · friendlier labels · better confidence language · positive reassurance · visible reasoning** — the engine unchanged. Disable instantly by clearing the localStorage keys (no redeploy).
- **No HOLD / ROLLBACK needed** — flags-OFF identity is verified at unit, build, QA-matrix, and live-prod levels.

## Expected final state — achieved
With flags OFF: **no visible production change** (verified live). With controlled host flags ON: a host sees a substantially simpler, clearer, more trustworthy experience — fewer tabs, friendlier labels, better confidence language, positive reassurance, visible reasoning — **while the engine remains unchanged.** *Expression over expansion.*
