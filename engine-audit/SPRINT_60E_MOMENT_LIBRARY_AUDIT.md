# Sprint 60E — Moment Library Audit

**Date:** 2026-06-18 · **Branch:** `main` @ `855a3ff` · **Mode:** AUDIT ONLY (no build)

**Challenge:** 60D killed *free-text → classify*. Does *event-type → enumerated moments →
known dependencies* (authored knowledge, not inference) open a safer path?

**Verdict up front:** **Yes — but a narrow bridge, and author-first.** The reframe is
correct and genuinely escapes 60D's fatal block: a Moment Library is **authored, so it needs
no corpus** — it is valid on event #1, where the classifier was un-validatable forever. It is
**selection, not NLP, so it cannot misfire.** A primitive version **already exists**
(`ROS_STARTER_LABELS` + `buildStarterROS`). **But** its *planning value is bounded by the
dependency model, which 60E does not change*: only ~6 moments map to dependencies that
actually exist. So the honest win is small and specific — **guarantee the moment that matters
is on the Run of Show with an owner** — not moment-aware recommendations (that's the
invented-confidence trap again). Smallest safe form: **a Playbook-system data file with ONE
consumer (Run of Show)**; intake chips additive + deferred behind activation (61A).

---

## Part 1 — Event-Type Audit

NGW supports **~33 event types** (eventTaxonomy.mjs; vendorCategoriesByType.js has 33 keys).
**Authored "moment" knowledge already exists**, unevenly:
- **`ROS_STARTER_LABELS`** (App.js:2241) names ONE signature moment for **7 types**
  (Wedding "Cake & first dance", Retirement "Tribute & recognition", Anniversary "Tributes &
  toast", Birthday "Cake & celebration", Corporate "Keynote", Board Meeting "Main agenda",
  Other "Key moment"). All other types fall through to `Other`.
- **`buildStarterROS`** (App.js:2259) seeds, for **celebration types only**, universal
  `Toasts & speeches` + the type moment + a `Dedication — "{song}"` segment when
  `honoree_song` is set.
- **Deep playbooks exist for only 5 types** (babyShower, backyardBbq, birthday, dinnerParty,
  graduation). The other ~28 use generic structure.

So the hypothesis isn't net-new — **it's expanding an existing, shallow, 7-type pattern to
all types and to multiple moments per type.** Grounded common-moment inventory (from ROS
labels + playbook tasks + standard structure):

| Type | Common moments |
|---|---|
| Wedding | Ceremony · First dance · Toasts · Cake cutting · Bouquet toss · Send-off |
| Retirement | Recognition speech · Toast · Video tribute · Award presentation · Cake · Group photo |
| Birthday | Cake cutting · Toast · Gifts · Group photo |
| Graduation | Recognition speech · Award/diploma · Group photo · Family celebration |
| Anniversary | Tributes · Toast · First dance · Cake |
| Corporate/Award | Keynote · Award presentation · Recognition · Networking |
| Fundraiser/Gala | Appeal/ask · Recognition · Auction · Keynote |

---

## Part 2 — Moment Inventory (candidate library — NOT optimized)

| Moment | Description | Common to |
|---|---|---|
| Recognition speech | A person formally honored aloud | Retirement, Graduation, Award, Anniversary |
| Toast | Raised-glass tribute | almost all celebrations |
| Video tribute | Played montage/film | Retirement, Anniversary, Memorial |
| Award presentation | Physical award handed over | Award, Corporate, Graduation |
| Cake cutting | Cake cut + served | Wedding, Birthday, Anniversary, Retirement |
| First dance | Couple/honoree dance | Wedding, Anniversary, Quinceañera |
| Group photo | Whole-party photograph | nearly all |
| Gift opening | Gifts presented/opened | Birthday, Baby/Bridal Shower |
| Dedication (song) | A song cued for someone | Wedding, Retirement, Anniversary |
| Fundraiser appeal | The "ask" / donation moment | Fundraiser, Gala |
| Family recognition | Family acknowledged | Graduation, Retirement, Reunion |

---

## Part 3 — Dependency Audit (against dependencies that ACTUALLY exist)

Existing dependency model (from 60C/61A): **Timeline · Run-of-Show segments · Food/Catering ·
Vendor-by-category · Staffing · Budget.** **Not modeled:** AV/projector/microphone *per
moment*, file/asset handling, donation tracking.

| Moment | Maps to existing dep? | Class |
|---|---|---|
| Toast | ROS segment (`Toasts & speeches` exists) + owner | **Directly** (ROS) |
| Cake cutting | ROS segment + Cake/Catering vendor | **Directly** |
| First dance | ROS segment + DJ | **Directly** |
| Dedication (song) | ROS "Dedication" segment + DJ (via `honoree_song`) | **Directly** |
| Group photo | ROS segment + Photography vendor | **Directly** |
| Gift opening | ROS segment (timing) | **Directly (ROS-only)** |
| Recognition speech | ROS segment ✓; **microphone/AV ✗** | **Partial** |
| Award presentation | ROS segment ✓; AV/podium ✗ | **Partial** |
| Family recognition | ROS segment ✓ | **Partial (ROS-only)** |
| **Video tribute** | ROS segment ✓; **AV/projector/files ✗** | **Partial → effectively Unsupported for its real need** |
| Fundraiser appeal | **donation model ✗** | **Unsupported** |

**The dependency wall from 60C is unchanged.** The Library lets you *select* "video tribute,"
but the AV/projector/files it actually needs still aren't modeled — so selecting it can only
put a *segment on the Run of Show*, not provision the equipment.

---

## Part 4 — Coverage Analysis: Classifier vs Moment Library

| | Free-text classifier (60D) | Moment Library (60E) |
|---|---|---|
| **Capture coverage** | low (free-text unmappable) | **~100%** — any listed moment is selectable |
| **Misfire risk** | high (keyword collisions) | **~0** — selection, not inference |
| **Corpus required?** | **yes** (un-validatable → killed) | **no** — authored, valid at n=1 |
| **Drives an EXISTING dependency** | ~0% direct | **~6 moments fully; rest ROS-segment only** |
| **"Moment is on the Run of Show with an owner"** | n/a | **~90%+** (every moment can get a segment) |
| **Drives a vendor/AV/files dependency** | ~0% | **~6 moments (vendor); 0% AV/files** |

**The reframe wins decisively on capture + safety + corpus-independence, and wins a real-but-
narrow slice of planning value: ROS presence.** It does **not** widen the deeper
dependency coverage — that's still gated by what's modeled.

---

## Part 5 — Intake Audit

Today the intake has **two** free-text moment fields doing **emotional** capture
(`must_have_moment` "one must-have moment or surprise"; `meaning_cry_moment` "the moment that
would make {honoree} cry the good tears" — Rafanelli board, the 60B humanity).

Evolving to optional **chips** ("Which moments matter? ☐ Recognition speech ☐ Toast ☐ Video
tribute ☐ Cake cutting ☐ Group photo ☐ Other"):
- **Improves capture?** Yes — structured, selectable, unambiguous.
- **Improves planning?** Yes, narrowly — enables the Part-7 ROS consumer.
- **Improves future intelligence?** Yes — structured `moments[]` is queryable where free-text
  isn't (corpus-free).
- **Reduces ambiguity?** Yes — eliminates the 60D interpretation problem entirely.

**Risks (real):** (1) **Form bloat / dead field** — the intake is already deep; a checkbox
grid that drives nothing is noise. (2) **Flattening the humanity** — chips do *planning*
capture; the free-text does *emotional* capture. **Replacing** the free-text with chips would
gut the 60B win. → **Additive, optional, free-text retained ("Other / in their words").
Never replace.**

---

## Part 6 — Product Value

| Persona | Value | Honest read |
|---|---|---|
| **Host** | Medium-high | "The moment I care about is guaranteed on the schedule" is reassuring and concrete. |
| **Operator** | High | Operators run *programs*; an explicit moment list with owners maps directly to their job. |
| **Planner** | Medium | Pros already track these; value is the auto-seeded ROS + a client-confirmed record, not novelty. |

**Becomes "another form field nobody cares about" IF** it's a mandatory grid that doesn't
visibly do anything. **Earns its place ONLY if** selecting a moment **immediately** puts it on
the Run of Show with an owner. The consumer is what makes the field real — not the field.

---

## Part 7 — Planning Alignment (where a Moment Library may influence)

| Surface | Verdict | Why |
|---|---|---|
| **Run of Show** | **SAFE — the one v1 consumer** | "You said the video tribute matters — it's on the schedule at 7:45, owner: MC. [confirm]". Deterministic, corpus-free, extends `buildStarterROS`. |
| Next Actions (spine) | **Safe, later** | "Schedule the recognition speech" — but only after ROS consumer proves out (tier ~6.6, below operational risk, per 60C). |
| Because Layer | **Safe, narrow** | Rider on a ROS/next-action item: "because the toast is a must-have moment." |
| Vendor Intelligence | **Unsafe now** | Needs moment→category mapping + real data (61A). Defer. |
| Decision Confidence | **No** | No honest per-moment decision exists (60C). |
| Positive Attention | **No (assert)** | "Moment is set ✓" is unobservable pre-event. |
| Venue / Experience Intelligence | **No** | Don't exist (60C). |

---

## Part 8 — Architecture

**C. The Playbook System.** A Moment Library is *authored planning knowledge keyed by event
type* — exactly what playbooks already are (and `ROS_STARTER_LABELS` already is a primitive
one). It is **not** Event Identity (identity = the emotional *why*; moments = planning
*structure* — keep them distinct), **not** the Planning Engine (it's data, not logic), and
**emphatically not a new engine.** Add `moments` to the playbook data shape; read it with a
small pure reader; consume it in Run of Show.

---

## Part 9 — Roadmap (EXECUTE / TEST / PARK / KILL)

| Initiative | Verdict | Why |
|---|---|---|
| **Moment Library (authored playbook data + reader)** | **TEST** | The first idea since 60B that is honest **and corpus-free** — so it *can* be validated now (author the type→moments→existing-dep table; prove ROS coverage on paper). |
| **Moment-aware planning — Run of Show only** | **TEST** | The single safe consumer; extends `buildStarterROS`. |
| Intake moment chips (additive, optional) | **PARK behind activation** | Real value, but it's an intake change and 61A says don't add friction with ~0 users. Author the library first; wire intake when activation justifies it. |
| Free-text classifier | **KILL** | Superseded. Keep free-text as optional "in their words" capture; never classify it. |
| Moment-aware **recommendations** | **KILL** | Recommendation = invented confidence (61A). |
| Moment-aware **Vendor Intelligence** | **PARK** | Needs mapping + real data. |

---

## Final Question

**Is a structured Moment Library the missing bridge between Event Identity and Planning —
or attractive complexity?**

**It is a real bridge — but a short one, and it must be built as authored data, not as a
feature.** It legitimately escapes 60D (no corpus needed, no misfire) and delivers one honest,
concrete win: **the moment a host says matters is guaranteed onto the Run of Show with an
owner** — corpus-free, using only the ROS model that already exists. That is genuine value and
it is *not* a second planning engine.

**But be ruthless about its limits:** the Library does **not** widen the deeper dependency
coverage (video tribute still has no AV/files model), so it must **never** be inflated into
moment-aware *recommendations, scoring, or vendor fit* — that re-enters every trap 60C/60D/61A
already closed. And it is still downstream of 61A: authoring the library needs no users, but
**wiring it to intake/UI should wait behind activation.**

**Smallest implementation capable of real value:** a `moments` array in the **Playbook data
shape** (per type: `{ id, label, eventTypes, dependsOn: [existing ROS segment | vendor
category] }`), a tiny pure reader, and **one consumer — Run of Show** ("is the must-have
moment scheduled? add it, assign an owner"). Author it; validate dependency coverage on paper
(it can be, today); ship the ROS consumer behind a flag; defer intake chips until there are
real events to capture. **Author-first, ROS-only, no engine. Everything beyond that stays
parked.**
