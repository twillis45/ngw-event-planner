# Sprint 57G · Part 1 — Confidence Grammar build (Pattern 014 made visible)

*Build. Presentation-only — the predicate that chooses each status token is UNCHANGED; only the rendered WORD + COLOR change, per persona. Feature flag `pi.confidence`, default OFF = byte-identical to production. Date: 2026-06-17. Branch: `sprint-57g-confidence-grammar`.*

## The problem (current runtime)
The Planning Health rail produces one of a few tokens via `deriveCommandCenterData`'s `stat()` (CommandCenter.jsx:309). The SAME `ON TRACK` / `AT RISK` token means four different things — and that destroys trust:
- `AT RISK` fires for **a real overdue** (data present, genuinely bad) **and** for `vendors.length===0` / `No budget set` (just **no data yet**).
- `ON TRACK` is confirmed-good, but the muted no-budget path elsewhere reads green too.
A grandmother can't tell "you're behind" from "you haven't started." 57G splits them.

## Build — `src/lib/confidenceGrammar.js` (new, pure)
- `confidenceOn()` — `pi.confidence` flag (`?pi=confidence` / `localStorage ngw-pi-confidence` / `REACT_APP_PI_CONFIDENCE`), default OFF.
- `confidencePersona(event)` — `audiencePersona(event)` when on, else `null` (⇒ raw token renders ⇒ identity).
- `classifyLevel(row)` — derives the certainty LEVEL from the **existing** `statusLabel + note` (no new calc).
- `confidenceFor(row, persona)` → `{ word, tier, level }` or `null`.

### Confidence vocabulary map (Deliverable: vocabulary + host/planner/operator)
| Level | Fires when (from existing token+note) | Host | Planner | Operator | Tier |
|---|---|---|---|---|---|
| **KNOWN** | `ON TRACK` (data present, healthy) | You're set | Confirmed | On track | green |
| **ATTENTION** | `ATTENTION` (partial/threshold) | Worth a look | Attention | Review | amber |
| **AT_RISK** | `AT RISK` **with data** (overdue, over-budget, unsigned contract) | Needs you | At risk | Action needed | red |
| **ESTIMATED** | `ESTIMATE`, or `… estimated · no RSVPs` | About | Estimate | Estimate | steel |
| **NEEDS_VERIFICATION** | `REVIEW` (safety / AP-005) | Confirm | Needs verification | Verify | steel |
| **UNKNOWN** | note begins "No …" (`No vendors/tasks/budget/guests yet`) | **Not set yet** | No data | Not started | steel |

### Badge conversion map (Deliverable) — what each old token becomes
| Old token + context | New level | Color change |
|---|---|---|
| `ON TRACK` (healthy) | KNOWN | green → green (word only) |
| `AT RISK` **"No vendors/budget/tasks yet"** | **UNKNOWN** | **red → steel** ← the false-alarm fix |
| `AT RISK` (real overdue / unsigned contract) | AT_RISK | red → red (word only) |
| `ATTENTION` | ATTENTION | amber → amber |
| `ESTIMATE` (Capacity) | ESTIMATED | steel → steel |
| `REVIEW` (Reality Check) | NEEDS_VERIFICATION | steel → steel |

**The split is the win:** "Vendors — No vendors yet" stops shouting red `AT RISK` and reads a calm steel **"Not set yet"**; a genuinely overdue item still reads red **"Needs you."** Same engine, honest color.

## Wiring — `src/CommandCenter.jsx`
- `HealthRow` takes a `grammar` prop (persona|null). When set, `confidenceFor(h, grammar)` remaps the status **word** and the dot+label **color** (`CONF_TIER_COLOR`: green/amber/red/**steel**). When null, the raw `h.statusLabel` + `h.color` render unchanged (identity).
- The panel map passes `grammar={confidencePersona(event)}`. No predicate, threshold, score, route, or playbook change (`git diff src/lib/playbooks` = 0).

## Host vs Planner vs Operator / Mobile vs Desktop (Deliverables)
- **Host:** "You're set · Not set yet · Worth a look · Needs you · About · Confirm" (plain, reassuring).
- **Planner:** "Confirmed · No data · Attention · At risk · Estimate · Needs verification" (terse, professional).
- **Operator:** "On track · Not started · Review · Action needed · Estimate · Verify" (vocabulary authored & unit-tested; goes live when the operator persona is wired in Part 3 — `audiencePersona` currently resolves only host/planner).
- **Desktop:** the Planning Health rail (the only surface where the four-meaning token lives) — fully remapped.
- **Mobile:** the rail is desktop-only (mobile Overview uses Vendors/Documents sections, no health rail), so there is no mobile rail to remap; the same `HealthRow` is responsive and viewport-agnostic where shown.

## QA (puppeteer, dev runtime · screenshot-verified)
| # | Check | Result |
|---|---|---|
| 1 | Flag OFF = raw `ON TRACK`/`AT RISK`/`ESTIMATE`/`REVIEW`, no grammar words (identity) | **PASS** |
| 2 | Flag ON host = grammar words replace raw rail tokens | **PASS** |
| 3 | **Key fix**: "No vendors yet" = "Not set yet" (steel) ON / absent OFF | **PASS** |
| 4 | Flag ON planner = planner vocabulary (Confirmed/No data/Estimate/Needs verification) | **PASS** |
| 5 | Mobile 390 opens (rail desktop-only) | **PASS** |
| 6 | No JS/console errors (resource-400 filtered) | **PASS** |
| — | Unit suite (`confidenceGrammar.test.js` + full): flag gate, data-presence split, per-persona words, identity | **128/128 PASS** |
| — | Prod build compiles (+482 B); CommandCenter predicates + playbooks 0-diff | **PASS** |

Screenshots: `review-artifacts/57g_flagOFF_1440.png` (raw tokens), `57g_flagON_host_1440.png` (You're set / **Not set yet** / About / Confirm), `57g_flagON_planner_1440.png` (Confirmed / No data / Estimate / Needs verification).

## Merge recommendation
**APPROVE — merge-ready, hold for review.** Small, flag-gated (default-OFF) presentation remap that resolves the exact "one token, four meanings" trust failure. It changes no predicate (engine/playbooks 0-diff), splits the false `AT RISK`-on-no-data into a calm `UNKNOWN`, and renders the same truth in host/planner/operator words. Ship behind `pi.confidence` OFF; enable with the other PI flags for cohort QA. *Operator words are authored & tested here; operator goes live when Part 3 wires the persona.*
