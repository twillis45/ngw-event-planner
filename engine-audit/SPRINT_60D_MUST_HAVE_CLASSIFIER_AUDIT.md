# Sprint 60D — Must-Have Classifier Audit

**Date:** 2026-06-18 · **Branch:** `main` @ `138d8b6` · **Mode:** AUDIT ONLY (no build)

**The one question:** Can NGW reliably translate a free-text `must_have_moment` into
existing planning dependencies? If not, Event Identity stays presentation-only.

**Verdict up front:** **No — not today, and not on evidence we actually have.** The honest
blocker isn't classifier design; it's that **there is no real corpus to validate against**
(0 production instances, 1 example string), the field is **compound free-text with no
enumeration**, and the single most-likely real answer ("video tribute") maps to a
dependency category (**AV / projection**) that **does not exist as a structured dependency**.
Recommendation: **PARK the classifier; collect a real corpus first. Coverage before
consumption — and we have no coverage data because we have no corpus.**

---

## Part 1 — Inventory of Real Must-Have Moments

**Empirical result: the corpus is effectively empty.**

| Source audited | Real `must_have_moment` values found |
|---|---|
| Seed events (`src/data/*.js`) | **0** — no seed/demo event sets any meaning field |
| `App.js` sample events | **0** |
| Test fixtures | **1** — `eventIdentity.test.js`: *"A video tribute from her unit at dinner"* |
| Intake placeholder (`ClientIntakeFlow.jsx:689`) | **1 (identical to above)** — example text, not data |
| Onboarding / examples | **0** enumerated; intake is pure free-text |

**Total real instances: 0 in data; 1 illustrative string.** The field shipped in 60B
(one sprint ago) and is FROZEN-adjacent — no beta evidence exists yet. An "inventory of
real moments" cannot be produced because **the data does not exist**. `Unknown` is the
honest Part-1 answer.

**What the intake reveals about the *shape* of real answers** (ClientIntakeFlow.jsx:677–704)
— this is the most important Part-1 evidence. The product captures **two** free-text moment
fields, both with narrative, emotionally-loaded prompts:
- `must_have_moment` — "ONE MUST-HAVE MOMENT OR SURPRISE" → *"a video tribute from her unit at dinner"*
- `meaning_cry_moment` — "THE ONE MOMENT THAT WOULD MAKE {honoree} CRY THE GOOD TEARS → plan everything else around it"

These are engineered to elicit **idiosyncratic, compound, contextual prose**, not tokens.
The placeholder itself bundles medium + relationship + timing. Real answers will be messier,
not cleaner. This is the opposite of classifiable input.

**Representative (SYNTHETIC, clearly-labeled) set used for Parts 2–3** — since no real
corpus exists, the classification below runs against a plausible distribution drawn from the
intake's design and common event types. Every number downstream is therefore an **estimate
with stated assumptions, not a measurement.**

---

## Part 2 — Classification Coverage (against the synthetic set)

Mapping target = a dependency that **already exists in the codebase** (Part 4). "Directly"
requires both a reliable keyword *and* a real target dependency.

| Synthetic must-have | Keyword present? | Real target dependency exists? | Class |
|---|---|---|---|
| "the toast" / "toasts & speeches" | yes (toast/speech) | ROS `Toasts & speeches` segment | **Partial** (segment exists; "done" is unobservable) |
| "cake cutting" | yes (cake) | ROS `Cake…` segment + Cake/Catering vendor | **Partial** |
| "first dance" | yes (dance) | ROS moment segment; DJ | **Partial** |
| "a dedication to her song" | yes (song) | `honoree_song` → ROS "Dedication" segment | **Partial** |
| "a video tribute from her unit at dinner" | yes (video/tribute) | **AV / projection — NOT a structured dependency** | **Not mappable** |
| "recognition ceremony" / "award presentation" | weak | ROS generic segment only; AV absent | **Not mappable** |
| "raise $50,000" | n/a | no donation/fundraising model | **Not mappable** |
| "make everyone feel appreciated" | n/a | emotional outcome — no model | **Not mappable** |
| "strengthen family bonds" / "celebrate her achievement" | n/a | abstract — no model | **Not mappable** |
| "the family reunion photo" | yes (photo) | Photography vendor (type-level) | **Partial** |

**No item is cleanly "Directly Mappable."** Every plausible hit lands in **Partial** (the
target is an *authored ROS segment*, and "the moment happened" is not observable pre-event)
or **Not Mappable** (target dependency doesn't exist, or the moment is emotional/financial).
Critically, the **demo's own canonical example — "video tribute" — is Not Mappable**, because
AV/projection exists only as a *type-level vendor category* (`vendorCategoriesByType.js`),
never as a moment-triggered dependency.

---

## Part 3 — Coverage Score

**On real events: unmeasurable — n = 0.** Any percentage claimed on real data would be
fabricated.

**On the synthetic distribution (estimate, assumptions stated):**
- Directly mappable (keyword + existing dependency + observable): **~0%**
- Partially mappable (segment exists but compound/unobservable): **~30–40%**
- Not mappable: **~60–70%**

**Can Event Identity safely influence planning for…**
- **20% of events?** Borderline — only if we count Partial as usable, which injects
  unobservable/compound mappings. **Not safely.**
- **50%?** **No.**
- **80%?** **No.**

Grounding: the intake elicits narrative/emotional answers (Part 1); the most common
celebration moments (toast/cake/dance) are *partial* at best; and the flagship case (video
tribute) is *unmappable*. There is no honest path to majority coverage today.

---

## Part 4 — Existing Dependency Audit

| Dependency | Modeled today? | Evidence |
|---|---|---|
| **Timeline / milestones** | ✅ | TIMELINE_TEMPLATES; getEventReadiness().timeline |
| **Run of Show (segments + `moment` labels)** | ✅ | buildStarterROS, ROS_STARTER_LABELS (App.js:2241–2294) |
| **Seating** | ✅ | guests[].table; positiveAttention seating |
| **Food / Catering** | ✅ | catererCount; catering vendor; playbook food |
| **Vendor (by category)** | ✅ | vendorCategoriesByType.js (type-level) |
| **Staffing / crew** | ✅ | crew severity reader |
| **Budget** | ✅ | engine-driven categories |
| **AV / projection / microphone (per-moment)** | ❌ | only a *type-level* "AV / Tech" vendor category for some types; no moment trigger, no equipment dep |
| **Donation / fundraising goal** | ❌ | none |
| **Emotional / relational outcome** | ❌ | none (by design — see [[project_event_intelligence_engine]]) |

**Would require new intelligence:** AV/equipment-per-moment, fundraising, emotional outcome
— i.e. exactly the three most common non-celebration must-haves. The dependencies that
exist cover only the *traditional celebration moment set*, and even those only as authored
ROS segments.

---

## Part 5 — Minimal Classifier Design (conditional — NOT recommended to build yet)

If coverage were sufficient (it isn't), the smallest safe shape would be:

```
must_have_moment (string)
  → normalize, scan for HIGH-CONFIDENCE keywords against an AUTHORED table
  → return ONE existing dependency category  { timeline | ros_segment | catering | dj | photography }
  → else return null   // default, and the common case
```

Hard requirements: authored · deterministic · keyword-based · explainable (returns the
matched keyword) · auditable · **no AI / embeddings / LLM / confidence score.** Bias
massively toward `null`.

**But:** the table's safe output space today is nearly empty — it could only target
timeline/ROS/catering/DJ/photography, none of which covers the dominant real answer (video
tribute → AV, which has no target). A classifier whose honest output is "null" for most
inputs and "a ROS segment that may already exist" for the rest **earns nothing while adding
a misfire surface.** Design is trivial; *value* is the missing ingredient.

---

## Part 6 — False-Positive Risk

The cost structure is **asymmetric**, and that asymmetry decides the sprint:

- **A missed mapping costs ~0** — identity stays display-only (60B), which is already an
  acceptable, honest state.
- **A wrong/overreaching mapping costs trust** — it injects an unsolicited next-action
  ("Confirm AV for the video tribute") onto a planner who didn't ask for it, on a product
  whose entire positioning is *No Guesswork / no fake intelligence* (CLAUDE.md;
  [[feedback_ngw_design_standard]]). Keyword collisions are real ("toast" in a menu;
  "video" on a casual dinner; "speech" in event_notes). One confidently-wrong identity
  action does more brand damage than a hundred silent nulls.

User risk: low (no destructive action). **Trust risk: high.** Planning risk: medium (a
false action can mis-anchor attention away from real operational risk if mis-tiered).
→ Conclusion: the only safe classifier is one that almost never fires. Which means: not
worth building until a real corpus proves the keywords that *do* fire are reliably right.

---

## Part 7 — Consumer Audit (ranked, assuming a classifier existed)

1. **Next-Action Spine** (tier ~6.6, below all operational risk) — highest value, safest
   architecture (60C). Consume **first** — but only after coverage is proven.
2. **Because Layer** — a rider on an already-mapped spine item. Second.
3. **Positive Attention** — **never assert** a must-have is "set" (no observable signal).
4. **Event Memory** — wait (data too thin; causal claim forbidden).
5. **Decision Confidence** — wait (no honest per-category hook).
6. **Vendor Intelligence** — wait (blocked on classifier + purpose-fit data).
7. **Venue Intelligence** — does not exist; **no.**

**Consume first: none, yet.** The ranking is academic until Part 3 coverage clears a bar.

---

## Part 8 — Recommendation

| Item | Verdict | Rationale |
|---|---|---|
| **Classifier** | **PARK** | Cannot be validated — 0 real instances. The only sanctioned activity is *passive corpus collection* (the field is already captured) until N is large enough to measure real coverage. Building now = confidence theater. |
| Identity prioritization (spine) | **PARK** | Blocked on classifier + coverage. |
| Identity-aware decisions | **KILL** | No honest hook (60C confirmed). |
| Identity-aware memory | **PARK** + **KILL** the causal "delivered the must-have" claim | Data too thin; causation unsupported. |
| Identity-aware vendor recs | **PARK** | Blocked on classifier; net-new. |
| Identity-aware venue recs | **KILL (now)** | No venue intelligence exists to align. |

**The single forward action that *is* safe and cheap:** keep capturing `must_have_moment`
as-is, and revisit this exact audit once ~30–50 real beta events have populated it
(consistent with the FROZEN-until-evidence posture, [[project_comms_frozen]]). Re-run Parts
2–3 against the *real* corpus. Decide then.

---

## Final Question — what % of real-world must-haves can be safely mapped today?

**On real data: 0% — because there is no real data (n=0).** On any realistic distribution:
**~0% directly, ~30–40% partially, ~60–70% not at all** — and the flagship example is in the
*not* bucket. That is unambiguously **low.**

**Therefore: Event Identity remains presentation-only.** The smallest safe next step is *not*
a classifier — it is **collecting a real corpus**, because you cannot build coverage-gated
intelligence without coverage data, and you cannot get coverage data without real events.
Be ruthless: today, the correct amount of identity-driven planning influence is **zero**,
and the correct amount of classifier code to write is **none** until a real corpus says
otherwise. Coverage before consumption.
