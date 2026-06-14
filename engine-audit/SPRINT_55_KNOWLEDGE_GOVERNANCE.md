# Event OS — Knowledge Governance

*NGW does not invent event expertise. It operationalizes verified event expertise. Every operational recommendation must trace to a source tier and carry an honest confidence + verification status — so the system is a structured **expert system**, not a generated checklist.*

## The integrity rule (read first)
A recommendation may ship only if it is one of:
- **`established-consensus`** — a widely-documented norm of the trade (culinary portioning, food-safety allergen practice, a standard catering rule of thumb). Treatable as consensus; still gets a citation in a verification pass.
- **`cited`** — traced to a specific, named, retrievable source (a professional body's guidance, a named planner's documented practice, a published hospitality standard).
- **`synthesized`** — a reasonable extrapolation NOT yet sourced. **Allowed to exist, but must be labeled, lower-confidence, and queued for verification.** It may never *masquerade* as consensus.

**Honesty mandate:** the current playbooks (incl. Dinner Party) are authored from established hospitality/culinary norms — they are `established-consensus` and `synthesized`, **not yet `cited`.** This framework makes that status explicit per recommendation and defines the path to `cited`. The system must never present synthesized opinion as decades-of-planner-experience until it is actually sourced.

---

## Governance schema (per playbook)

Every Event OS playbook carries a `knowledge` block. Every operational recommendation (decision, task, purchase, quantity, risk, contingency, coaching line) references a `principle`, which references `sources` and carries a tier + confidence + verification status.

```
knowledge {
  governanceVersion
  sourceTiers[]   // the AUTHORITY ladder a principle can rest on (below)
  sources[]       { id, tier, name, authority, verificationStatus, url?, note }
  principles[]    { id, statement, domain, tier:'consensus'|'majority'|'minority'|'contested',
                    confidence:'high'|'medium'|'low', assumption,
                    sourceRefs[], verificationStatus:'established-consensus'|'cited'|'synthesized' }
}

// and each recommendation field gains:
recommendation.provenance { principleId, tier, confidence, verificationStatus }
```

### Source tiers (the authority ladder)
1. **Professional bodies / certification** — event-planning associations, certified-planner curricula, hospitality institutes.
2. **Published hospitality & event-production standards** — catering operations manuals, banquet/BEO standards, venue ops guidance.
3. **Culinary doctrine** — professional kitchen practice (mise en place, portioning, food-safety/allergen handling).
4. **Documented planner practice** — named, attributable practitioner guidance (books, courses, published interviews).
5. **Trade heuristics** — widely-repeated rules of thumb (½ bottle wine/guest); real and consensus, but folk-documented rather than authored.
6. **Synthesized** — NGW's own reasonable extrapolation. Lowest tier; must be labeled and verified before claiming expertise.

### The six required records (per the directive)
For every playbook, the `knowledge` block must capture:
1. **Source experts** — the tiers/authorities behind it (named once `cited`).
2. **Planner principles** — the `principles[]` (the *why* a practice holds).
3. **Consensus recommendations** — `principles` with `tier: consensus`.
4. **Minority recommendations** — `tier: minority|contested`, kept (not discarded) with their rationale.
5. **Assumptions** — each principle's `assumption` (e.g. "3–4h seated dinner, drinking guests").
6. **Confidence level** — `confidence` + `verificationStatus` on every principle and recommendation.

---

## How it integrates with the runtime (no new engine)
- The `knowledge` block is **data on the playbook**, joined by `principleId`. The Playbook reader (Sprint 55C) already produces operational tasks; each task simply carries its `provenance`.
- **Surfacing:** the existing next-action `consequence`/detail line can append a one-clause provenance ("standard catering rule") for high-trust framing; low-confidence/synthesized items render *without* an authority claim. No new UI — it's a field on outputs the runtime already renders.
- **Gate:** the reader may DOWN-RANK or hide a `synthesized` + `low`-confidence recommendation until verified, so the OS never leads with unsourced opinion.

---

## Verification protocol (path from synthesized → cited)
1. For each `synthesized`/`established-consensus` principle, run a **foreground** research pass (per the engine memory: background agents can't WebSearch) to attach 1–2 retrievable sources at tiers 1–4.
2. Promote `verificationStatus` to `cited`; raise/confirm `confidence`; record any `minority`/`contested` counter-practice found.
3. Anything that fails to source moves to `tier: contested` or is removed — never silently kept as consensus.
4. Re-review on a cadence (the engine memory's monthly monitoring) so norms that shift (e.g. dietary/allergen guidance) stay current.

**This sprint delivers the framework + an honest first-pass classification (Dinner Party). It does NOT fabricate citations.** The `cited` promotion is the verification pass, recommended next, run foreground.

---

## Applied: Dinner Party (honest first-pass)
See `engine-audit/playbooks/dinner-party.knowledge.json`. Summary of how its recommendations classify today:

| Recommendation | Principle | Tier | Confidence | Status |
|---|---|---|---|---|
| Collect dietary/allergy **before** menu locks; always a safe veg plate | Allergen disclosure is a safety duty, not a courtesy | consensus | high | established-consensus (food-safety doctrine) |
| Make-ahead-first; "plate, don't cook" once guests arrive; mise en place | Professional kitchens stage to de-risk service | consensus | high | established-consensus (culinary doctrine) |
| ~0.4 lb (6–8 oz cooked) protein main / guest | Standard plated-main portioning | consensus | high | established-consensus (catering portioning) |
| ½ bottle wine / drinking guest (3–4h dinner) | Beverage-planning rule of thumb | consensus | high | trade-heuristic (folk-documented) |
| ~1.5 lb ice / guest | Event beverage-service heuristic | majority | medium | trade-heuristic (varies by weather/drinks) |
| +10% food, +1–2 settings, +20 min buffers | Buffer against variance | consensus | medium-high | planner-practice (synthesized framing) |
| Assigned seating at 8+ | Eases mixing, prevents the shuffle | majority | medium | etiquette-practice (varies by host) |
| Post-party cleaner = highest-ROI spend | Buy back the host's presence | **minority** | low–medium | **synthesized** (an opinion, kept + labeled) |
| Coaching tone / "what's normal at T-N" reassurance | Host confidence reduces error | majority | medium | synthesized (needs sourcing) |

**Take-away:** the *quantities and food-safety/culinary practices* are established-consensus/trade-heuristic and high-confidence — they genuinely encode trade norms. The *coaching, ROI claims, and buffers* are planner-practice/synthesized and are labeled as such (lower confidence, flagged for verification). Nothing is presented as cited expertise until it is.

---

## Why this makes the OS feel like decades of experience (honestly)
A user trusts the system because it shows its work: a recommendation arrives with *why it holds*, *who it comes from* (tier), *what it assumes*, and *how sure we are* — and the rare opinion is flagged as opinion, not dressed as gospel. That transparency is what separates a structured expert system from generated-checklist software. The fastest path to "decades of planner experience": run the foreground verification pass on the Phase-1 playbooks to lift their consensus principles from `established-consensus` to `cited`.
