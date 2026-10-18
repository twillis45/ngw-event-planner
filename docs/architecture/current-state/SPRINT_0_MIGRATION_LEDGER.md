# Sprint 0 — migration ledger

One row per change: **before behaviour → change → invariant → tests → affected
consumers → rollback risk.** Appended as each slice lands.

---

## P0-1 — Destination invariant

| Field | Detail |
|---|---|
| **Before behaviour** | `smartParseEvent` fires `isDestination: true` for any bare resolved city, marking it `destinationBasis: 'place-named'`. The ONLY thing preventing that guess from being persisted was `HostShellV2.jsx:1724-1726`, which downgraded it to `null` before calling `travelFieldsToPersist`. `travelFieldsToPersist` itself persisted any `effIsDestination === true` its caller handed it. |
| **Why it mattered** | `passGate.passVerdictAtCreation` reads `isDestination === true` as Model D door 2 and stamps the verdict **once**; the grandfather rule never recomputes it. A redesigned creation surface passing the parser's finding straight through would permanently and uncorrectably mark local parties as owing $39 — while looking correct. |
| **Change** | `src/lib/travelFieldsToPersist.js`: added `destinationIsGuess = destinationBasis === 'place-named' && manualIsDestination == null`, and `destinationAnswered` now requires `!destinationIsGuess`. The module no longer trusts its caller. |
| **Behaviour change** | **None.** Today's shell already passes `null` for a guess, so the persisted output is byte-identical. Proven by `the CURRENT shell composition (downgraded to null) also persists nothing`, which passed **before** the change. This is a safety net, not a behaviour edit. |
| **Shell left alone, deliberately** | `HostShellV2:1724` keeps its downgrade — the UI needs the tri-state for the chip's "unanswered" state. What moved is the **persistence** invariant, not the display logic. The shell is simply no longer the thing preventing the defect. |
| **Invariant** | #1 — *a guessed destination must not become a permanent destination/paywall fact* (planning package). Also reinforces #13 (*an event that began free stays free*). |
| **Tests** | New: `src/lib/__tests__/aGuessIsNotADestination.test.js` — 15 tests in 5 groups covering the four required properties (guess not confirmable · cannot trigger pass state · grounded evidence still commits · host answer and prior persisted decisions stay valid), plus a premise test that grounded and guessed differ only by basis. **Red first: 6 failed before the change, 9 passed (characterising existing behaviour), all 15 green after.** Existing `absenceIsNotAnAnswer`, `theHalfOfTheDayWasOurs`, `passGate`, `passEntitlement` all still green. |
| **Affected consumers** | `travelFieldsToPersist` has one runtime caller: `HostShellV2.jsx:8187`. `isDestination` itself is read by ~25 modules — none of their behaviour changes, because the persisted value is unchanged. |
| **Rollback risk** | **Very low.** Single pure function, one condition added, no caller signature change. Revert = delete one `&&` clause. The only way this changes live behaviour is if a caller *was* passing a guessed `true` — which the passing characterisation test proves today's caller does not. |
| **Regression suite** | Full jest **608 suites / 8,358 passed**, 1 skipped. |
