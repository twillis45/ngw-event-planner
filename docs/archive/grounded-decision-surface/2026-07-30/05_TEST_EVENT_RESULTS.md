# 05 — Test Event Results (Phase 6)

**Method.** Engine-level probe against the live engines (`playbookDecisionBoard`,
`planHeroCopy`, `eventPlan`, `resolveRoute`) using non-persistent in-memory fixtures built
from existing app patterns. The probe file was created under `src/lib/__tests__/`, executed
via the repo's own jest runner, and **deleted**; `git status src/` confirmed clean afterwards.
Raw output: `evidence/06_engine_probe.txt`.

**Probe limitation, stated up front.** `open.push` at `src/lib/playbooks/index.js:2639`
does **not** copy `dependsOn` or `blocks` onto the emitted decision row. The `dep=-` /
`blocks=-` columns in the raw output are therefore a **probe artifact, not a measurement**.
See finding F5 — the absence itself is the finding.

All five fixtures used a realistic `createdAt` (event created some weeks before "today"),
because that field materially changes status derivation (finding F2).

---

## Per-event summary (verified)

| Event | Date | open | overdue | ready | locked | Hero state |
|---|---|---:|---:|---:|---:|---|
| Wedding | T+72d | 9 | **0** | 9 | 3 | settle_ready |
| Repast | T+4d | 4 | 2 | 2 | 3 | settle_overdue |
| Quinceañera | T+150d | 6 | **0** | 6 | 3 | settle_ready |
| Conference | T+120d | 5 | 4 | 1 | 3 | settle_overdue |
| Backyard BBQ | T+16d | 5 | **0** | 5 | 3 | settle_ready |

## Conference — top ranked (the worst case found)

| Rank | Decision | Why now | Why important | Deps | Blocks | CTA | Route result | Concern |
|---:|---|---|---|---|---|---|---|---|
| 1 | `tracks` | "Was due 28 days ago." | w=high ew=low rev=costly | n/a¹ | n/a¹ | Open what to settle | **none** | Unactionable by route |
| 2 | `ticketing` | "Was due 28 days ago." | w=high ew=low rev=costly | n/a¹ | n/a¹ | — | **none** | Unactionable by route |
| 3 | `sponsor_model` | "Was due 28 days ago." | w=high ew=low rev=costly | n/a¹ | n/a¹ | — | **none** | Unactionable by route |
| 4 | `room_block` | "Was due 28 days ago." | w=med ew=low rev=costly | n/a¹ | n/a¹ | — | **none** | Unactionable by route |
| 5 | `format` | "A good place to start." | w=high | n/a¹ | n/a¹ | — | RESOLVES | — |

¹ not emitted on the row — see probe limitation.

**All four overdue conference decisions resolve to no route.** The four highest-ranked
actions on the surface cannot be navigated to from the decision row.

---

## FINDINGS

### F1 — KNOWN DEFECT · the hero asserts a false causal claim on non-food decisions
Conference hero, verbatim runtime output:

> `4 decisions are past their easy window — this one first. The spread and shopping list size from them.`

The four decisions are `tracks`, `ticketing`, `sponsor_model`, `room_block`. **None of them
sizes a spread or a shopping list.** The clause is hardcoded at
`src/lib/planHeroCopy.js` in the non-solemn `settle_overdue` branch and is emitted for every
event type. This is a causally inaccurate explanation (Phase 4 Q21) presented as fact.
Severity: **High** — it is a confident false statement about why the item leads.

### F2 — KNOWN DEFECT · overdue status collapses on realistically-created events
With a realistic `createdAt`, Wedding (T+72d), Quinceañera (T+150d) and Backyard (T+16d)
each returned **0 overdue** and read `"A good place to start."` on every open decision.
Conference returned 4 overdue because its authored leads exceed its runway-at-creation.
So `wasReachable` (`src/lib/playbooks/index.js:~2581`) does **not** flatten universally — it
flattens whenever runway-at-creation covers the lead. The practical effect is that the
urgency tier is inert for most realistically-created events. Severity: **High**.
*Correction to prior claim:* earlier session notes said this zeroes overdue outright. It does not; it is lead-relative.

### F3 — MANDATORY REPAST TEST · protection is real at the hero, incomplete elsewhere
**Protected (verified).** Hero renders:
> title `Who provides the food.` · line `2 still to sort — this one first, 4 days to go.` · cta `See what's left`

No "Settle:", no "easy window", no "overdue", no shopping-list claim. Origin of that copy:
`src/lib/planHeroCopy.js`, solemn branch, gated by `isSolemnEvent` from `src/lib/solemn.js`.
Bereavement context **does** reach that consumer.

**Not protected (verified, same run).**
1. `because` on both overdue rows is `"Was due 1 day ago."` — produced in
   `src/lib/playbooks/index.js` with no solemn awareness. This is the string the
   Calls-to-make sheet files per row.
2. `assurance` on `place` is `"The plan's been running on our pick — swapping it now costs
   more than it did."` — the `reversibility === 'costly'` variant. On a repast venue this is
   cost-pressure language to a bereaved family.
3. `eventPlan` emits `Resolve "Who provides the food".` as the action title — imperative,
   not solemn-aware.

**Answer to the audit's question:** the protection is **partly structural, partly
copy-specific**. Structural in that a shared classifier (`solemn.js`) is consumed by two
independent consumers. Copy-specific in that only the `planHeroCopy` hero branch and one
hostv2 slips-clause consult it; three other producers of host-visible text do not.
No context can currently *prohibit* overdue language globally — suppression is per-call-site.

### F4 — KNOWN DEFECT · responsibility ownership is not modelled
`repast.js` states as researched cultural fact that the family does not cook — the church or
committee carries the meal — yet the decision `food_source` still ranks as the host's action
with a host-facing CTA. There is no field that assigns a decision to a non-host actor.
Severity: **High** for the repast context specifically.

### F5 — KNOWN DEFECT · `dependsOn` and `blocks` do not reach any consumer
`open.push` (`src/lib/playbooks/index.js:2639`) emits
`{id,label,status,because,assurance,dueDate,daysOut,...priority,...derived,route}`.
Neither `dependsOn` nor `blocks` is included. Any downstream gating, cycle detection, or
"waiting" derivation that depends on reading them from the row is therefore impossible.
`waiting` was **0 across all five fixtures**, consistent with this.

### F6 — VERIFIED FACT · `timingProvenance` is present, contrary to a prior claim
Rows with `timingProvenance` set were observed on wedding `venue` and `music`, quinceañera
`venue` and `dress`, and repast `headcount`. A prior session reported 0/215 coverage; that is
**not reproducible** here. Actual coverage must be measured from source — see Phase 5.

### F7 — VERIFIED FACT · route coverage is partial across all five types
Decisions returning `route=none`: wedding `ceremony`, `vendor_team`, `music`; quinceañera
`vals_song`, `court_size`, `dress`, `theme_colors`; conference all four overdue; repast
`place`, `memory`; backyard `shade_seating`, `music`. Where a route exists it resolved
(`RESOLVES`) in every case tested — so `resolveRoute` is sound; coverage is the gap.

---

## Method and limits
- Engine-level only. No browser interaction in this phase; see Phase 7 for UI.
- Fixtures are synthetic but built from the same shapes as `hostv2/src/eventPool.js` seeds.
- `dependsOn`/`blocks` could not be observed from rows (see F5); source-level measurement is Phase 5.
- Only 5 of 39 playbooks exercised. Findings F1, F2, F5 are structural and type-independent;
  F3/F4 are repast-specific; F6/F7 are per-type observations that may not generalise.
- No application code was modified. The probe file was deleted after execution.
