# Sprint 56G — UI Intelligence Audit

*Audit only. No build, no redesign, no CSS, no components. Studio Matte unchanged. This audits **cognition, guidance, trust, interpretation, adaptation** — not visuals. Every finding traced to runtime. Date: 2026-06-17.*

> **Label note:** "56G" collides with the prior Intelligence-Architecture-&-Moat-Foundation doc. Filed under a distinct filename to avoid overwrite; treat as **56G-UI**.

## Core question — answered brutally
**A grandmother planning a graduation party would feel B: "I am looking at planner software."**
Traced to runtime: the screens she'd read say **"PLANNING HEALTH," "Reality Check," "Capacity," "Run of Show," "Readiness" (65 uses), "Operational" (26), "Compression" (39)** — operator vocabulary, shown verbatim. The mechanism built to fix exactly this — the **55M persona renderer seam — is inert (`VOICE = {}`)**, and there is **no host-vs-planner language switch anywhere in the UI**. The intelligence is real; the interface speaks system, not human, **to everyone identically.**

**The one-line thesis:** *NGW has planner-grade intelligence wearing a planner-grade interface. The intelligence is built; the translation layer is not turned on.*

---

## Section 1 — UI Intelligence Scorecard
| Dimension | Grade | Evidence | Problem | Recommendation |
|---|---|---|---|---|
| **Audience Intelligence** | **F** | 55M `VOICE={}`; no language/complexity switch; `recordKind` varies *sections* not *language* | every audience sees the same operator app | **activate the inert seam** (presentation, not build) |
| **Cognitive Load** | **D** | system labels everywhere; ~95-question intake (56A) | user must translate planner terms to intent | relabel for host persona via Pattern 011 |
| **Progressive Disclosure** | **B** | on-track collapse, `dayMode` auto-engage, runway, single-hero spine | strong by *state*, weak by *user* + *lifecycle stage* | extend disclosure to stage (120/30/7/day) |
| **Decision Rendering** | **C** | decision-first gating ships (resolve before buy); spine shows consequence | gates exist; the UI *asks* more than it *explains* why/tradeoff/consequence | surface decision-consequence (existing edges) |
| **Confidence Rendering** | **C** | Pattern 014 in pockets (budget ranges, prompts) | not universal, not at-a-glance; estimates look like facts | universalize Pattern 014 |
| **Trust Rendering** | **B-** | spine = "what + why" (consequence line) | reasoning/inputs/source/assumptions often absent | show inputs + confidence on recommendations |
| **Attention Rendering** | **B** | Attention System doctrine, single hero, "Nothing needs you — you're clear," on-track collapse | actually a strength; under-used for "stop worrying" | compose explicit "you're clear on X" |
| **Emotional Intelligence** | **C** | warm meaning intake + empty-state reward | overwhelmed/behind states are functional, not reassuring | reassurance in the host voice (dark `mindset` exists) |
| **Adaptive Language** | **F** | inert seam; system labels | zero adaptation; grandmother reads "Compression" | the marquee gap — activate Pattern 011 |
| **No-Guesswork Guidance** | **C** | spine answers what/why well | "how sure" + "what if ignored" partial; dashboards add overhead | tag confidence + consequence on the spine |
**Overall UI Intelligence grade: C− / D+.** *Intelligence present (B/A in the engine); presentation in system language, undifferentiated by audience (D/F).* The gap is **almost entirely presentation, not intelligence.**

---

## Section 2 — Audience Intelligence (graded brutally: **F**)
Does the UI speak / prioritize / disclose differently for First-Time Host vs Experienced Host vs Planner vs Corporate vs Venue user? **No.** `recordKind` (home_hosted vs client) varies which **sections** appear (56A) — but **language, complexity, and confidence depth are identical for everyone.** The 55M seam *can* render per persona but ships empty. **Everyone sees the same planner application.** This is the single largest UI-intelligence failure and a direct under-use of Pattern 011.

---

## Section 3 — Cognitive Load (system language vs user language)
| UI says (system) | User wants (intent) | Verdict |
|---|---|---|
| Planning Health | "Am I on track?" | system |
| Capacity | "Do I have enough chairs/food?" | system |
| Reality Check | "What usually trips people up?" | system |
| Run of Show | "What's the plan for the day?" | system |
| Readiness | "Am I ready?" | system |
| Operational | "What to buy/do" | system |
| Vendor Risk | "Is my caterer reliable?" | system |
| Compression | "Am I running out of time?" | system |
Every flagged label is **system language**. The user must translate each into intent before acting — pure cognitive tax, violating **Pattern 004 (One Meaning One Label)** for the host audience and **AP-004** (jargon without guidance).

---

## Section 4 — Progressive Disclosure (**B**, adapts by state, not lifecycle)
The UI **does** adapt: on-track rows collapse, the spine shows one hero, `dayMode` auto-engages on event day, the runway counts down. **But** it adapts by *current state*, not by *lifecycle stage* — a 120-days-out idea and a 7-days-out scramble surface largely the same scaffolding. **Partial compliance.** Violation: no stage-aware disclosure (procurement vs coordination vs execution shows the same chrome). Not a regression — an unrealized opportunity (reuse dates + phase data, no engine).

---

## Section 5 — Trust Intelligence (**B-**)
Recommendations are **not** magical — the next-action spine carries a **consequence line** ("why this matters"), which is genuinely good (Pattern 002). But the user usually **cannot see**: the *inputs* (why this number?), the *confidence* (estimate vs fact), the *source*, or the *assumptions*. Budget shows ranges (trust-positive); most other recommendations appear as single values. **Reasoning is partial; confidence/source/assumptions are mostly invisible.**

---

## Section 6 — Confidence Intelligence (Pattern 014 compliance: **partial / C**)
Can the user distinguish Known / Likely / Estimated / Unknown **at a glance**? **No.** Confidence lives in pockets (budget *ranges*, Reality-Check *prompts*, capacity-as-*requirements*) but there is **no consistent visual grammar** — a venue inference, a budget estimate, and a hard fact all render with equal visual certainty. **Pattern 014 is doctrine, not yet a UI convention.** This is also the AP-005 (False Precision) exposure surface.

---

## Section 7 — Attention Intelligence (**B** — a genuine strength)
NGW *does* reduce attention load: single hero (Pattern 002), on-track collapse, "Nothing needs you right now — you're clear" empty-state reward, the Attention-System doctrine. What's missing is the **explicit positive** — "centerpieces are fine; parking is the real risk." It tells you what to *do*; it rarely tells you what to *stop worrying about*. **Derivable from existing readiness+risk (56E) — composition, not build.**

---

## Section 8 — Decision Intelligence
Decision-first gating **ships** (the engine surfaces "confirm guest count" before "buy protein" — Pattern 001). But for the major decisions (venue/budget/guests/food/entertainment) the UI **collects information** more than it **explains**: it rarely shows *why this matters*, the *tradeoffs*, the *consequences* ("choosing outdoor → rain plan now matters"), or the *future impact*. **The decision *gate* is intelligent; the decision *explanation* is thin** — and the explanation is exactly the dark Outcome/Tradeoff/Consequence data (56E/56G-moat).

---

## Section 9 — Emotional Intelligence (**C**)
Product behavior, not therapy: the **meaning intake** is warm ("what would make them cry the good tears"), and the **empty-state reward** is emotionally smart ("you're clear"). But the **overwhelmed / behind / event-day-stress** states are handled *functionally* — more red rows, not more reassurance. The reassurance content **already exists** (dark `mindset.reassurance`, 56D) and isn't surfaced. **Functional, not yet supportive.**

---

## Section 10 — Adaptive Language (the jargon translation table)
| System (today) | Grandmother | Planner |
|---|---|---|
| Planning Health | "How's it coming?" | Planning Health |
| Capacity | "Enough seats & food?" | Capacity |
| Reality Check | "Don't-forget list" | Reality Check |
| Run of Show | "The day's plan" | Run of Show |
| Readiness | "Are you ready?" | Readiness |
| Operational | "To-do / to-buy" | Operational |
| Vendor Risk | "Is your caterer solid?" | Vendor Risk |
| Compression | "Running short on time" | Compression |
**Should Pattern 011 be expanded? — Yes, and *activated*.** The seam exists (55M) and is empty. This table is the host-voice `VOICE` map waiting to be authored. **Pure presentation; no new architecture.**

---

## Section 11 — No-Guesswork Test (per screen)
The **next-step spine** answers *What should I do?* and *Why?* well. It **partially** answers *How sure are we?* (budget yes, else no) and *What if I ignore this?* (consequence line, sometimes). **The spine contributes ~the answers; much of the surrounding dashboard (health rows, metrics) is informational overhead** a host must interpret. **The spine is the No-Guesswork win; the rest of each screen dilutes it.**

---

## Section 12 — World-Class Comparison (cognitive, not feature)
- **TurboTax** = the model NGW is **not**: a guided *interview* that hides the engine, asks one plain question at a time, and never shows you "tax code." **NGW shows the grandmother the dashboard, not the interview.**
- **Linear / Notion** = power-operator surfaces NGW **resembles** — dense, labelled, capable, for people who already know the domain.
- **Apple / Uber** = radical reduction; one obvious action.
**Cognitive verdict:** NGW currently feels like **Linear for events** (operator-grade) when a first-time host needs **TurboTax for events** (guided, plain, one-thing-at-a-time). The engine could power the TurboTax experience; the UI presents the Linear one.

---

## Section 13 — Missing UI Intelligence
| Layer | UI state |
|---|---|
| Outcome / Stakeholder | **dark** (captured in intake, never surfaced) |
| Assumption / Consequence / Tradeoff | **missing** (data exists in risks/deps; not surfaced) |
| Pattern (success/coaching) | **dark** (eos.json unbundled, 56D) |
| Persona language | **dark** (seam inert) |
| Confidence grammar | **partial** (pockets) |
Most "missing UI intelligence" is **dark, not absent** — surfaced nowhere despite existing in data. This is a **Pattern 007 violation at the UI layer** (surface existing intelligence before building more).

---

## Section 14 — New Doctrine Recommendations (recommend only — no Notion write)
| Candidate | Recommendation | Evidence |
|---|---|---|
| **Pattern 017 — Intelligence Is Not The Interface** | **Needs Review → strongest** | the thesis of this audit: the engine is B/A, the UI is D/F; intelligence existing ≠ the UI expressing it (inert seam + system labels). Genuinely new, strongly evidenced. |
| **Pattern 018 — Reduce Interpretation** | **Needs Review** | overlaps Pattern 004 + cognitive-load; may be a 004 refinement, not standalone |
| **Pattern 019 — Show The User What Matters Now** | **Reject as new → = Pattern 002 + Attention** | restates the Next-Action Spine + Attention System |

---

## Final Output
**1. Overall UI Intelligence grade: C− / D+** (engine B/A, presentation D/F; the gap is presentation, not intelligence).

**2. Top 10 UI Intelligence Gaps:** ① no audience adaptation (inert 55M seam) · ② system-language labels to hosts · ③ confidence not at-a-glance (Pattern 014 not a UI grammar) · ④ Outcome/Stakeholder dark · ⑤ decisions collected not explained (no tradeoff/consequence) · ⑥ reassurance content dark (`mindset`) · ⑦ no stage-aware disclosure · ⑧ "stop worrying" not surfaced · ⑨ dashboards add interpretation overhead · ⑩ inputs/source behind recommendations hidden.

**3. Top 10 Highest-Leverage Improvements (with class):**
| # | Improvement | Class |
|---|---|---|
| 1 | **Activate the 55M seam** + author host-voice `VOICE` for the spine | **Presentation** |
| 2 | Relabel system terms for host persona (Pattern 011 table) | **Presentation** |
| 3 | Universalize Pattern 014 confidence grammar | **Presentation** |
| 4 | Surface dark `mindset.reassurance` in stress states | **Routing** (dark→surface) |
| 5 | Surface decision-consequence (existing dependency edges) | **Routing** |
| 6 | Surface dark Outcome/Stakeholder from intake | **Routing** |
| 7 | "You're clear on X" explicit attention positive | **Presentation** |
| 8 | Stage-aware disclosure (reuse dates/phase) | **Routing** |
| 9 | Show inputs/source on recommendations | **Presentation** |
| 10 | Wire dark eos.json patterns (56D) to Reality Check | **Data** (port) + Routing |
**8 of 10 are Presentation or Routing. 1 is Data (eos.json port). 0 are Architecture.** The UI-intelligence gap is **not an engine problem.**

**4. Classification summary:** Routing 4 · Presentation 5 · Data 1 · Architecture 0.

**5. What prevents NGW from feeling built *specifically for* each persona:** one cause — **the persona presentation layer is built but empty.** Grandmother: sees operator jargon. Bride: sees the same generic flow, not her emotional arc (dark `meaning_*`). Fundraiser chair: no outcome/sponsor framing (dark Outcome). Planner: actually well-served — the operator language *is* her language. **NGW is, today, built for the planner — and shows everyone the planner's screen.**

**6. The honest answer:** **A first-time host would feel they are operating planner software, not being guided by a planner.** The guidance *logic* (decision-first spine) is planner-like; the *language, confidence, and emotional framing* are operator-like and unadapted. **The fix is overwhelmingly presentation — turn on the translation layer NGW already shipped (55M) and surface the intelligence it already has (dark eos.json/Outcome/mindset).** Almost none of it is new architecture.

*Confidence: High — every finding traces to runtime strings + the inert seam. Weakest assumption: grades reflect the unauthenticated/default render; a future authored `VOICE` would move Audience/Language from F toward A with no engine change — which is precisely the point.*
