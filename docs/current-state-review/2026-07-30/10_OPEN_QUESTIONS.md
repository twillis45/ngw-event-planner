# 10 — Open Questions (Phase 11)

Ten items, ordered by user/trust/operational risk. Each is grounded in this audit's evidence.

---
**1. Concern:** The CRA production build fails under `CI=true` and no CI job builds it.
**Why it matters:** Any standard CI/CD host cannot build the app; the shipped artifact is produced on one laptop.
**Verified evidence:** `CI=true npm run build` exit 1, 237 warnings-as-errors; `checks.yml` runs no CRA build; `pages.yml` only publishes `gh-pages`.
**What remains unknown:** Whether production currently matches this commit.
**Decision required:** Add a CI build gate, or formally accept laptop-built releases.
**Recommended disposition:** EXECUTE

---
**2. Concern:** The documented scorer is not on the host path.
**Why it matters:** `DECISION_SCHEMA_SPEC` §4.A/§6 describes `decisionIntelligence.js` as the priority engine; it is imported only by `experienceComposer` (→ admin console) and its own test. Host ranking comes from `playbookDecisionBoard`.
**Verified evidence:** grep this session — zero host-facing importers.
**What remains unknown:** Whether the spec is aspirational or the wiring regressed.
**Decision required:** Wire it, or retire the spec section and document the real engine.
**Recommended disposition:** TEST

---
**3. Concern:** Overdue status collapses on realistically-created events.
**Why it matters:** Urgency is the dominant ranking axis; when it flattens, everything reads "A good place to start."
**Verified evidence:** Wedding/Quinceañera/Backyard each returned **0 overdue** with realistic `createdAt`; Conference returned 4. Lead-relative, not universal.
**What remains unknown:** Real-world distribution of `createdAt` vs authored leads.
**Decision required:** Is `wasReachable` protecting hosts or silencing the engine?
**Recommended disposition:** TEST

---
**4. Concern:** Hero copy makes a false causal claim on non-food events.
**Why it matters:** A conference hero states "The spread and shopping list size from them" about `tracks`/`ticketing`/`sponsor_model`/`room_block`. None of them do.
**Verified evidence:** live runtime string, Phase 6 F1.
**What remains unknown:** Nothing material.
**Decision required:** Derive the consequence clause or remove it.
**Recommended disposition:** EXECUTE

---
**5. Concern:** Solemn protection is per-call-site, not structural.
**Why it matters:** The repast hero is protected, but `because` ("Was due 1 day ago."), the costly-`assurance` variant, and `eventPlan`'s `Resolve "…"` title are not. Four sites still emit overdue language on a repast.
**Verified evidence:** Phase 6 F3; Phase 4 finding 9.
**What remains unknown:** Whether any other context needs the same protection.
**Decision required:** Make tone an authored capability, or accept per-site patching.
**Recommended disposition:** EXECUTE

---
**6. Concern:** `blocks` is a free-text tag, not a graph.
**Why it matters:** 196/380 values (52%, 86 distinct tokens) match no consumer; it gates nothing. It reads as encoded dependency and is not.
**Verified evidence:** `evidence/05_measurements.md` §8.
**What remains unknown:** Whether authors believe it is load-bearing.
**Decision required:** Type and validate it, or delete it.
**Recommended disposition:** EXECUTE

---
**7. Concern:** The renderer re-decides what the engine ranked.
**Why it matters:** `HostShellV2.jsx:1190` filters `venue` out of the board; `eventPlan`, `surfaceRegistry` and `planHeroCopy` do not. Same event, different answers per surface.
**Verified evidence:** verified by direct read this session.
**What remains unknown:** How many other renderer-side filters exist.
**Decision required:** Move suppression into the engine or make it a declared policy.
**Recommended disposition:** EXECUTE

---
**8. Concern:** 35% of decisions can never carry a route.
**Why it matters:** On the conference fixture, **all four** top-ranked overdue decisions resolved to no route — the highest-priority actions are unactionable from the row.
**Verified evidence:** Phase 6 F7; Phase 4 finding 8 (76/215).
**What remains unknown:** Whether inline settle covers them in every surface.
**Decision required:** Route coverage target, or explicit "settle-in-place only" classification.
**Recommended disposition:** TEST

---
**9. Concern:** Grounding coverage is 4% and computed provenance is never rendered.
**Why it matters:** The product's stated north star is showing sources. `grounding:audit` reports 8 cited / 541 priced. `timingProvenance` is resolved for 24/215 and read by no renderer.
**Verified evidence:** `evidence/07_grounding.txt`; `evidence/05_measurements.md` §6.
**What remains unknown:** Which priced numbers are host-visible today.
**Decision required:** Raise coverage, or stop making the claim.
**Recommended disposition:** EXECUTE

---
**10. Concern:** No ranking-order test exists, in either app.
**Why it matters:** 4229 tests pass and none asserts which decision leads for a given event/scenario. Every finding above could regress silently.
**Verified evidence:** jest run this session; Phase 4 Q10/Q11 (cycles and timing-order untested).
**What remains unknown:** Whether assessors would agree on a correct order.
**Decision required:** Adopt judged fixtures as a gate.
**Recommended disposition:** EXECUTE
