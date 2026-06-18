# Sprint 57F-A — Positive Attention Layer (build)

*Build Phase 4 of the 57F trust layer. Presentation-only / pure reader — no readiness, scoring, engine, playbook, routing, or data-model change. Feature flag `pi.attention`, default OFF = byte-identical to production, host audience only. Date: 2026-06-17. Branch: `sprint-57f-a-positive-attention`.*

## Objective
NGW surfaces risk (what's missing/late) far better than certainty (what's handled). Elite planners do both — they also reduce worry. This adds the **"You're Set On ✓"** layer: a read-only list of the dimensions a first-time host can stop worrying about, derived **only** from existing readiness signals. Reassuring, not less honest.

---

## Deliverable 1 · `PositiveAttention(event)` reader
`src/lib/positiveAttention.js` — a dependency-free pure reader.
```
positiveAttention(event, readiness) → { items: [{ key, label, note }] }
```
`readiness` is the existing `getEventReadiness(event)` 4-axis result (passed in so the lib never imports the CommandCenter module). It reads ONLY existing signals — no new score, no new storage, no new calculation. Plus `attentionOn()` (flag) and `attentionActive(event)` (`attentionOn() && audiencePersona(event)==='host'`).

## Deliverable 2 · Safe category inventory (SURFACED — confirmed-true signals)
| Dimension | Predicate (existing signal) | Source |
|---|---|---|
| **Guests** | `guests.length>0 && yesGuests/guests.length >= 0.7` | Planning-Health Guests ON TRACK |
| **Timeline** | `getEventReadiness().timeline.status==='ON_TRACK'` (≥80% done **and** 0 overdue) | 4-axis (the **strict** signal, not the looser ≥50% panel) |
| **Vendors** | `getEventReadiness().vendor.status==='ON_TRACK'` (all confirmed **and** contracts signed) | 4-axis |
| **Documents** | `getEventReadiness().document.status==='ON_TRACK'` (required signed/approved, 0 draft/pending) | `getDocumentsReadiness` |
| **Seating** | confirmed (RSVP=Yes) guests exist **and** every one has `g.table` | direct read of existing per-guest field |

**Honesty note (verified live):** the reader uses the **strict 4-axis** signal, so on the Solstice seed it shows only **✓ Seating** and correctly **refuses** to claim Timeline "set" even though the Planning-Health rail (looser ≥50% threshold) renders it green at 55%. It reassures only where the strong signal genuinely holds.

## Deliverable 3 · Unsafe / Never-surfaced inventory (blocked by Pattern 014 + AP-005)
| Dimension | Why it must never read "set" |
|---|---|
| **Budget** | health = *under-spend* (<70%), NOT adequacy. "Budget is enough" exceeds knowledge — banned. |
| **Capacity** | always an `ESTIMATE`; no confirmed-true state exists (no real inventory). |
| **Reality Check / Event Day** | **safety** prompts (food safety, fire/grill, child supervision, alcohol & minors) to *confirm*, never a settled claim — AP-005. |
The reader structurally cannot emit these (they're absent from its logic), so no false reassurance is possible.

## Deliverable 4 · Placement recommendation → **directly below the "Needs You" queue (action column), host-only**
An elite planner names the one thing that needs you, then the things you can stop worrying about — in one breath. Placing "You're Set On" immediately under Needs You pairs reassurance with its opposite, keeps it **subordinate to the hero** (Attention System: one hero, evidence whispers), and puts it where the host's eyes already are. **Not** the Planning Health rail (it already lists every dimension's status — duplicating the green ones there is noise) and **not** the hero (that's the one thing needing attention). Renders in both the desktop action column and the mobile stack, after Needs You. *Rejected: standalone card (disconnects it from the risk it balances); planner/operator surfaces (planners keep the rail; operator is a later sprint).*

## Deliverable 5 · Feature flag — `pi.attention`
Default **OFF**. Enable via `?pi=attention`, `localStorage['ngw-pi-attention']='1'`, or `REACT_APP_PI_ATTENTION='true'` (same triad as `pi.voice`/`pi.nav`). OFF ⇒ `attentionActive` false ⇒ `setItems=[]` ⇒ nothing renders ⇒ byte-identical to production. Host audience only this release (planner/operator unchanged).

## Deliverable 6 · Host screenshots (`demo/review-artifacts/`)
- `57fa_flagON_1440.png` — host, natural seed: **✓ Seating** (honest single signal).
- `57fa_flagON_boost_1440.png` — host, fully-handled event: **YOU'RE SET ON · 5 → ✓ Guests · ✓ Timeline · ✓ Vendors · ✓ Documents · ✓ Seating** (the success condition, beside the hero).
- `57fa_flagON_390.png` — mobile 390, block renders below Needs You.
- `57fa_flagOFF_1440.png` / `57fa_flagOFF_390.png` — flag OFF: no block (production identity).

## Deliverable 7 · Planner screenshots
- `57fa_flagON_planner_1440.png` — the **same fully-green event** with `audience='client'`: **no block** (planner persona). The planner keeps the Planning Health rail (already all ON TRACK); the host-only reassurance layer is correctly absent. Presentation differs; logic identical.

## Deliverable 8 · Runtime impact assessment
| Change | Touches | Logic? |
|---|---|---|
| `positiveAttention.js` (new reader) | reads existing `getEventReadiness` + event fields | **No** — read-only, no score/storage |
| `CommandCenter.jsx` | import; `setItems` useMemo (one `getEventReadiness` read); `YoureSetOn` presentation component; one render slot in each of Mobile/Desktop after Needs You | **No** — no predicate/threshold/route change |
| `nextActionRenderer.js` | extracted flag-free `audiencePersona` (behavior-identical to `personaFor`; matches open PR #47/#48 → conflict-free) | **No** |
- `git diff src/lib/playbooks/` = **0 lines**; `deriveCommandCenterData` / `getEventReadiness` predicates unchanged. Prod build compiles (+94 B). All flag-gated default-OFF.

## Deliverable 9 · QA report (puppeteer, dev runtime · system Chrome; screenshot-verified)
| # | Check | Result |
|---|---|---|
| 1 | Flag OFF regression = no block (1440 + 390) | **PASS** |
| 2 | Host mode render — block below Needs You with confirmed ✓ | **PASS** (✓ Seating natural; **5 ✓** fully-set) |
| 3 | Planner identity — `audience=client` ⇒ no block on identical data | **PASS** |
| 4 | Mobile 390 render | **PASS** |
| 5 | Desktop 1440 render | **PASS** |
| 6 | No readiness changes — Planning Health rail unchanged | **PASS** |
| 7 | No score changes — `getEventReadiness`/`deriveCommandCenterData` untouched; playbooks 0-diff | **PASS** |
| 8 | No routing changes | **PASS** |
| 9 | No page errors | **PASS** |
| 10 | No console errors (resource-400 dev noise filtered) | **PASS** |
| — | Unit suite (`positiveAttention.test.js` + full): flag gate, 5-dim surfacing, honest thresholds, never-invents-certainty | **119/119 PASS** |

*Note: dimension counts are screenshot-verified; the text-scrape `dims` parser over-reports because the Planning Health rail labels follow the block in the DOM — the screenshots are the ground truth (natural=1 ✓ Seating, fully-set=5 ✓).*

## Deliverable 10 · Merge recommendation
**APPROVE — merge-ready, hold for review** per phase-sprint protocol. The change is a small, flag-gated (default-OFF, host-only), pure reader that invents no certainty: it surfaces only the strict confirmed-true signals and structurally cannot claim Budget adequacy, Capacity, or safety items (Pattern 014 + AP-005). Engine/readiness/playbook/routing 0-diff; the `audiencePersona` extraction is identical to open PR #47/#48 (conflict-free). It answers, for the first time, the host's "what am I already doing right?" — reassurance beside the one thing that needs them — **without changing a single planning decision.** Recommend merge after review; ship behind `pi.attention` OFF, enable for host-cohort QA. *Guardrail honored: this sprint is Positive Attention only — no Confidence Grammar, Because, Momentum, Decision Confidence, Operator, or Venue work.*

*Confidence: High — every predicate traced to runtime (`getEventReadiness` CommandCenter.jsx:754, `deriveCommandCenterData` thresholds, `getDocumentsReadiness`:455, seating `g.table`) and verified live (natural ✓ Seating, fully-set 5 ✓, planner-audience no-block, flag-OFF identity). Weakest point: localStorage event-injection is clobbered by the session cache once populated — mitigated by driving real seed events and a populated-cache write for the fully-set/planner cases (screenshot-confirmed).*
