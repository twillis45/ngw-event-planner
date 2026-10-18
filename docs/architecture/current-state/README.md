# Redesign architecture & capability-mapping gate — 2026-10-18

Repository-grounded planning package produced **before** redesign
implementation. **No runtime code was modified.** Runtime evidence outranks
documentation throughout; where the two disagree, the code wins and the
disagreement is recorded.

## Verdict

# NOT READY FOR REDESIGN IMPLEMENTATION

Five specific blockers, listed in `REDESIGN_IMPLEMENTATION_PLAN.md`. The
engine layer is in **better** shape than the brief assumed; the blockers are
concentrated in creation wiring, a duplicated guest-count authority, and two
surfaces that were never captured in a browser.

## Documents

| # | Document | What it settles |
|---|---|---|
| 1 | [`CAPABILITY_OWNERSHIP_MATRIX.md`](CAPABILITY_OWNERSHIP_MATRIX.md) | 37 capabilities classified with reader/writer/route/tests. Rows marked ● traced to source, ◐ classified from surface+route+e2e |
| 2 | [`CREATION_TRUTH_AND_INTAKE_AUDIT.md`](CREATION_TRUTH_AND_INTAKE_AUDIT.md) | Runtime parser output for all three fixtures; every dropped clause classified |
| 3 | [`DEPENDENCY_AND_CONSEQUENCE_GAP_ANALYSIS.md`](DEPENDENCY_AND_CONSEQUENCE_GAP_ANALYSIS.md) | The real consequence model; what `surfaceRegistry` actually is; why 4 of 6 proposed verbs already exist |
| 4 | [`VENUE_CROSS_DOMAIN_TRACE.md`](VENUE_CROSS_DOMAIN_TRACE.md) | Venue gap case **plus** a proven positive control, compared row by row |
| 5 | [`NORMALIZED_NEEDS_RECOMMENDATION.md`](NORMALIZED_NEEDS_RECOMMENDATION.md) | The only outright capability gap; tag-shaped model; GOLD-04 blocker |
| 6 | [`MONEY_SEMANTICS_TRACE.md`](MONEY_SEMANTICS_TRACE.md) | Desired / expected / committed / spent, with the rules that keep them apart |
| 7 | [`TRAVEL_PROVIDER_CAPABILITY_MATRIX.md`](TRAVEL_PROVIDER_CAPABILITY_MATRIX.md) | No provider is an integration; the never-build line and Vrbo's production block |
| 8 | [`REDESIGN_SURFACE_PARITY_MANIFEST.md`](REDESIGN_SURFACE_PARITY_MANIFEST.md) | 31 sheets + 4 stages → future doors; what `sections` is protecting |
| 9 | [`GOLD_E2E_ACCEPTANCE_MATRIX.md`](GOLD_E2E_ACCEPTANCE_MATRIX.md) | GOLD-01..10 against 124 existing specs |
| 10 | [`REDESIGN_IMPLEMENTATION_PLAN.md`](REDESIGN_IMPLEMENTATION_PLAN.md) | **INVARIANTS (14)**, P0/P1/P2 sequence, CommandCenter extraction proof, verdict |

## The five findings that changed the plan

1. **A P0 invariant lives only in the shell being replaced.** `HostShellV2:1724`
   is the only thing stopping a guessed destination becoming a permanent
   paywall stamp. `passGate:72` claims the engine never infers; it does.
2. **Two guest-count authorities are live, 38 to 3.** With a documented case of
   an invented count reaching a caterer in the host's name.
3. **"Venue has no raiser" was the wrong question.** Venue has 30 consumers and
   propagates fine. What is missing — repo-wide — is any way for a decision to
   create a *new open question*.
4. **`unusedClauses` is stronger than assumed.** Rendered in host, and
   *differentially measured* against the parser's own behaviour, so it
   structurally cannot claim a false miss. It needs one addition: resolution.
5. **No provider is an integration**, by a standing never-build ruling plus
   Vrbo blocking production reads.

## Method

- Parser findings are **runtime output** from a temporary jest harness run
  against the three fixtures, since deleted. Nothing about creation is read
  off the implementation.
- "PROVEN IN HOST" requires a hostv2 surface **and** a browser e2e.
- Depth is marked per row. Unverified is written as unverified.
