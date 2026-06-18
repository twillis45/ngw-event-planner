# Sprint 60C — Planning Alignment Audit

**Date:** 2026-06-18 · **Branch audited:** `main` @ `c0de284` · **Mode:** AUDIT ONLY (no build)

NGW now *knows* event identity (`meaning_why` · `honoree` · `honoree_story` ·
`must_have_moment` · `feeling_words`, + `event.outcomes.mustHave`). It does not yet
*use* that identity to prioritize, explain, or align recommendations. This audit maps
where identity **should** influence existing intelligence — and, ruthlessly, where it
**cannot safely** yet.

**One-line finding:** Identity may influence *ordering and explanation* only where a
**real, observable dependency already exists**; it must never assert readiness/fit it
cannot observe, and must **never outrank operational risk**. Today the prerequisite for
almost everything below — a safe `must_have_moment` → existing-dependency classifier —
**does not exist**, and `must_have_moment` is free-text with no enumeration.

---

## Part 1 — Current Influence Audit

**Where Event Identity is surfaced today:** exactly one place — the `EventIdentityBlock`
in the CommandCenter Overview (60B, `pi.identity`), plus the day-of RunOfShow reading
`honoree`/`honoree_song`. It is **100% presentation**. **No engine reads any identity
field.** Verified across the spine, readers, and memory.

| Subsystem | Reads identity today? | Current behavior | Should identity influence? | How (if yes) | Risk |
|---|---|---|---|---|---|
| **Next-action spine** (`_selectEventNextActionInner`, CommandCenter.jsx:1204–1457) | **No** | 8-tier **positional** ladder, first-match wins. Operational risk = tiers 1–5 (caterer drift, urgent/overdue decision, overdue payment, **COI-critical load-in gate**, unconfirmed vendor, compression, timeline-at-risk). Generic = tiers 6.5 playbook task / 7 next milestone / 8 fallback. | **Yes — narrowly** | Insert ONE new tier at ~**6.6** (above generic milestone/fallback, **below every operational-risk tier**) that surfaces a must-have *dependency* action — only when the moment is classifier-mapped to an existing dependency. | Burying urgent risk if placed too high. Mitigated by the fixed sub-operational position. |
| **Needs You** (CommandCenter.jsx:2215, `deriveCommandCenterData`) | No | Count of decisions+approvals+requests+questions; these are real obligations. | **No** | — | Identity has no obligation semantics here; injecting it would fabricate a "need." |
| **Decision Confidence** (decisionConfidence.js) | No | 5 decisions (guestCount/seating/vendors/timeline/staffing), positional, reuses existing resolvers. `vendors` is **whole-event**, not per-category. | **Partial — defer** | Only `timeline` has an honest hook (a toast/tribute is a schedule concern). Per-category AV priority is **inexpressible** without per-category vendor decisions (new data). | Implying AV/video priority we can't compute → false confidence. |
| **Positive Attention** (positiveAttention.js) | No | 5 dimensions (Guests/Timeline/Vendors/Documents/Seating), hard-coded order, each gated on an **observable** readiness signal. | **No (reorder) / Never (assert)** | Could reorder, but there is **no observable signal that a must-have is "set"** → cannot add a "Must-have ready ✓". | A green "must-have ✓" we can't verify is the worst false reassurance in the app. |
| **Because Layer** (strings built in playbooks/index.js:435–492) | No | Cites guest count, rental factors, event type, authored safety basics ("why this quantity/check"). | **Yes — narrowly** | Append intent **only** on a row that has a *real* identity dependency (e.g. a timeline/ROS item the moment maps to). | "Because this matters" on unrelated rows = fluff; erodes the layer's earned trust. |
| **Event Memory** (eventMemory.js) | No (lessons are manual) | Aggregates vendor execution by `vendorKey(name)`: on_time/late/no_show/great/poor + manual lessons. `event.outcomes.mustHave` is **co-stored but unread**. | **Partial — defer** | A join "vendor X was on an event whose must-have *happened*" is *possible* with existing data. | `n` is tiny (mustHave only captured post-event). A causal claim ("helped deliver it") is **unsupported** — correlation ≠ contribution. |
| **Vendor Intelligence** (vendorIntelligence.js) | No | 9 execution challenge categories; keys vendor.id/name; zero event-purpose concept. | **Future only** | Needs the moment→category classifier first (Part 7). | "Right for this purpose" with no purpose-fit data = invented intelligence. |
| **Venue logic** | No | **No venue intelligence exists.** `event.venue` is free-text + COI category rules. | **No (now)** | Identity-aware venue fit = building venue intelligence first. | Authoring "ballroom = formal recognition" claims with zero data = pure fabrication. |
| **Timeline / ROS** (buildStarterROS, App.js:2241–2294) | `honoree`/`honoree_song` only | Seeds a `moment` segment per type + a "Dedication — {song}" segment when `honoree_song` set. **This is the one place structured moment-adjacency already exists.** | **Yes — narrowly** | The classifier's safest targets are ROS segments that already exist. | Low — these are authored segments, not invented. |
| **Budget** | No | Engine-driven typical-setup categories; never altered by identity. | **No** | — | Readiness/money math is out of scope per guardrail. |
| **Experience Intelligence (future)** | n/a | Does not exist. | **No (now)** | Dependency note only. | This is the second-engine trap; building it = exactly what this sprint forbids. |

---

## Part 2 — Must-Have Moment Dependency Audit

`must_have_moment` is **free-text only** (intake placeholder: "e.g. a video tribute from
her unit at dinner"). No enumeration, dropdown, or canonical type exists anywhere. The
only structured adjacency that already exists:
- **ROS_STARTER_LABELS** `moment` per type (Wedding "Cake & first dance"; Retirement
  "Tribute & recognition") + seeded `Toasts & speeches` / `Dedication — {song}` segments.
- **vendorAccountability/playbooks.js** mentions moments **only as risk/why language**
  (Photography "must-capture moments / cake / send-off"; DJ "song_list", "toasts, first
  dance, cake last call") — **not** as structured dependencies.
- **workflowCompression POLISH_HINTS** regexes (`/tribute/`, `/slideshow/`, `/playlist/`)
  — keyword matching exists, but to mark items *skippable in a rush*, not to route.

**No function maps a moment keyword → vendor category / timeline item.** Classification:

| Moment | Mappable? | To what existing dependency | Evidence |
|---|---|---|---|
| Toast / speeches | **Partial** | ROS `Toasts & speeches` segment; DJ timing | App.js:2280; vendorAccountability DJ |
| Cake cutting | **Partial** | ROS `Cake…` segment; Cake vendor; playbook "Cake + candles" task | App.js:2242–2245; birthday playbook |
| Dedication / song | **Partial** | `honoree_song` → ROS "Dedication" segment; DJ song_list | App.js:2285 |
| Video tribute | **Not mappable** | No AV/projector/videography structured dep | — |
| Projection / mic / AV | **Not mappable** | "AV/Tech" is a *type-level* vendor category, not moment-triggered | vendorCategoriesByType.js |
| Fundraiser goal | **Not mappable** | No donation/sponsor structured dep | — |

**Do not invent mappings.** ~Half of realistic must-haves (notably the video tribute in
our own demo) are **not mappable** to anything that exists. Any influence must degrade to
**no-op** on unmappable moments.

---

## Part 3 — Next-Action Alignment

**Question: should must-have dependencies rise above generic readiness?** Yes — but the
spine is a **positional ladder, not a score**, so "boost" = **inserting one tier at a
fixed safe position**, not nudging a weight.

- **Safe case:** moment classifier-maps to an existing dependency that is *not yet
  satisfied* (e.g. must-have "toast" + no `Toasts & speeches` segment / unconfirmed DJ) →
  surface it at **tier ~6.6**: above tier-7 "next milestone" and tier-8 fallback, **below**
  caterer/decision/payment/COI/vendor/compression/timeline (tiers 1–5).
- **Unsafe case:** placing it above any operational-risk tier; or firing on an unmappable
  free-text moment; or surfacing it when the dependency is already satisfied.
- **Needed mapping table:** a conservative, authored `must_have → {existingDependency}`
  classifier with **high-confidence keywords only** and explicit `unmappable → null`.
  *This is the single prerequisite for Parts 3/4/5.*
- **Fallback:** no match → spine behaves exactly as today (byte-identical).

---

## Part 4 — Decision Confidence Alignment

- **Can be weighted today:** `timeline` only (a moment is a schedule concern). Weak.
- **Requires new data:** per-category vendor priority (AV/video). The `vendors` decision is
  whole-event; "AV deserves sign-off first" is **inexpressible** without per-category
  decisions — new data, out of scope.
- **Must remain neutral:** guestCount, seating, staffing — no honest identity hook.
- **Verdict:** the highest-risk surface for false confidence. **Defer.** No new readiness math.

---

## Part 5 — Because Layer Alignment

- **Increases trust:** appending intent to a row that *already* has a real identity
  dependency — "Confirm the DJ — **the toast is the must-have moment**" (only when the
  classifier mapped toast→DJ/timeline).
- **Becomes fluff/overreach:** "because this event matters" on unrelated operational rows;
  citing `meaning_why` on a COI gate. Kill on sight.
- **Verdict:** safe **only** as a rider on a Part-3 mapped item. Never standalone.

---

## Part 6 — Event Memory Alignment

- **Safe to say:** factual co-occurrence already computable — "Used 3×, all on-time."
- **Needs more events:** any must-have linkage; `outcomes.mustHave` is captured only
  post-event and is rare. `n` is far too small.
- **Must not claim:** "This vendor helped deliver the must-have" — **causal, unsupported.**
  Correlation between a confirmed vendor and a `mustHave:'happened'` event is not
  contribution. **Defer; explicitly forbid the causal claim.**

---

## Part 7 — Vendor Intelligence Dependency

Vendor Intelligence needs, from Event Identity, **one thing**: the moment→category
classifier (Part 3), so "this event needs a *videographer who can project*" is grounded in
a real mapped dependency rather than vendor-execution stats. Until that classifier exists
and is proven, purpose-fit scoring would be invented. **Park behind the classifier.**

---

## Part 8 — Venue Foundation Dependency

There is **no venue intelligence** — `venue` is free-text + COI rules. Identity-aware venue
fit ("ballroom = formal recognition; backyard = intimacy") would require **building venue
intelligence from scratch**, and the fit-claims are inherently subjective. **Confirm-only
today; KILL any authored venue-fit claims now.** Revisit only if/when a venue foundation is
a deliberately-scoped sprint of its own.

---

## Part 9 — Experience Intelligence Dependency

Food / beverage / comfort / decor / service / tipping / games / memory-moments: **none
exist as intelligence today.** Letting identity "influence" them means building them — the
textbook second-engine. **Dependency note only:** *if* Experience Intelligence is ever
built, `feeling_words` + `must_have_moment` would be its inputs. Not now.

---

## Part 10 — Weighting Model Recommendation

| Option | Verdict |
|---|---|
| 1 · No weighting (display only) | That's 60B today. Insufficient — identity stays inert. |
| 2 · **Light boost** | **RECOMMENDED.** Realized as a *single inserted spine tier (~6.6)* below all operational risk, gated on the classifier, no-op when unmapped. |
| 3 · Hard priority (override) | **Reject.** Would let a sentimental toast bury an expired COI / overdue payment. Violates the guardrail. |
| 4 · Separate identity checklist | **Reject.** Fragments attention; breaks the one-hero doctrine; re-creates the cockpit overwhelm pros already killed. |

**Guardrail honored by construction:** because the boost is a *fixed sub-operational tier*,
identity **cannot** hide urgent risk — the ladder reaches tier 6.6 only after tiers 1–5
find nothing. "Light boost, never hard override" isn't a policy we have to enforce; it's
the position in the ladder.

---

## Part 11 — Roadmap (EXECUTE / TEST / PARK / KILL)

| Initiative | Verdict | Why |
|---|---|---|
| **Moment→dependency classifier** (authored lookup, high-confidence keywords, `unmappable→null`) | **TEST first** | The single prerequisite. Smallest safe unit. Build *only* this, behind a flag, and measure mapping coverage on real events before anything consumes it. |
| Next-action identity alignment (tier 6.6) | **TEST** | Clear win, architecturally safe, but gated on the classifier proving coverage. |
| Because identity alignment | **TEST** | Safe only as a rider on a mapped Part-3 item. |
| Decision Confidence alignment | **PARK** | Only `timeline` is honest; real value needs per-category decisions (new data). |
| Event Memory alignment | **PARK** (and **KILL** the "vendor delivered the must-have" causal claim) | Data too thin; causal claim unsafe. |
| Vendor Intelligence (purpose-fit) | **PARK** | Blocked on the classifier; net-new. |
| Venue Foundation | **KILL (now)** | No venue intelligence exists; fit-claims would be fabricated. |
| Experience Intelligence | **KILL (now)** | Pure expansion; the second-engine trap. |

---

## Final Question — the smallest safe way for identity to influence planning

**Build exactly one thing: a conservative `must_have_moment` → existing-dependency
classifier (authored keyword lookup, `unmappable → null`).** Then let it feed exactly one
consumer to start: a **single next-action spine tier inserted below every operational-risk
tier** (~6.6), which surfaces the mapped must-have dependency *only when it's both mappable
and unsatisfied*, with an optional Because rider on that same item. Everything else
(Decision Confidence, Event Memory, Vendor, Venue, Experience) **waits** — parked or killed.

This keeps purpose from becoming a second planning engine: it adds no schema, no readiness
math, no new store; it reuses dependencies that already exist; and it is *structurally
incapable* of burying urgent risk because it lives beneath it in the ladder. If a moment
can't be safely mapped, **identity influences nothing** and stays display-only — which is
the honest default. Be ruthless: until the classifier exists and demonstrates real coverage
on actual events, **the correct amount of identity-driven prioritization is zero.**
